// Minimal Web Push (RFC 8291 / VAPID RFC 8292) sender for Deno Edge.
// No external deps. Uses Deno's WebCrypto.

type PushSubscription = {
  endpoint: string;
  p256dh: string; // base64url
  auth: string; // base64url
};

const enc = new TextEncoder();

function b64urlToBytes(s: string): Uint8Array {
  s = s.replace(/-/g, "+").replace(/_/g, "/");
  const pad = s.length % 4;
  if (pad) s += "=".repeat(4 - pad);
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function bytesToB64url(b: Uint8Array): string {
  let s = "";
  for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i]);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function concat(...arrs: Uint8Array[]): Uint8Array {
  const len = arrs.reduce((a, b) => a + b.length, 0);
  const out = new Uint8Array(len);
  let off = 0;
  for (const a of arrs) {
    out.set(a, off);
    off += a.length;
  }
  return out;
}

// Decode uncompressed P-256 public key (0x04 || X || Y) into JWK
function uncompressedPubToJwk(raw: Uint8Array): JsonWebKey {
  if (raw.length !== 65 || raw[0] !== 0x04) throw new Error("Bad P-256 pubkey");
  return {
    kty: "EC",
    crv: "P-256",
    x: bytesToB64url(raw.slice(1, 33)),
    y: bytesToB64url(raw.slice(33, 65)),
    ext: true,
  };
}

async function importVapidPrivateKey(privB64u: string, pubB64u: string) {
  const d = bytesToB64url(b64urlToBytes(privB64u));
  const pub = b64urlToBytes(pubB64u);
  const jwk: JsonWebKey = {
    ...uncompressedPubToJwk(pub),
    d,
    key_ops: ["sign"],
  };
  return await crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"],
  );
}

async function signVapidJwt(audience: string, subject: string, privB64u: string, pubB64u: string) {
  const header = { typ: "JWT", alg: "ES256" };
  const exp = Math.floor(Date.now() / 1000) + 60 * 60 * 11; // 11h
  const payload = { aud: audience, exp, sub: subject };
  const headerB = bytesToB64url(enc.encode(JSON.stringify(header)));
  const payloadB = bytesToB64url(enc.encode(JSON.stringify(payload)));
  const signingInput = `${headerB}.${payloadB}`;
  const key = await importVapidPrivateKey(privB64u, pubB64u);
  const sig = new Uint8Array(
    await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, enc.encode(signingInput)),
  );
  return `${signingInput}.${bytesToB64url(sig)}`;
}

// HKDF helper
async function hkdf(salt: Uint8Array, ikm: Uint8Array, info: Uint8Array, length: number) {
  const baseKey = await crypto.subtle.importKey("raw", ikm, "HKDF", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "HKDF", hash: "SHA-256", salt, info },
    baseKey,
    length * 8,
  );
  return new Uint8Array(bits);
}

// aes128gcm content encoding (RFC 8188) for Web Push (RFC 8291)
async function encryptAes128Gcm(payload: Uint8Array, p256dhB64u: string, authB64u: string) {
  // 1. Generate ephemeral ECDH P-256 keypair
  const ephemeral = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveBits"],
  ) as CryptoKeyPair;

  const ephemeralPubJwk = await crypto.subtle.exportKey("jwk", ephemeral.publicKey);
  const asPublicKey = concat(
    new Uint8Array([0x04]),
    b64urlToBytes(ephemeralPubJwk.x!),
    b64urlToBytes(ephemeralPubJwk.y!),
  );

  // 2. Import client's public key
  const clientRaw = b64urlToBytes(p256dhB64u);
  const clientJwk = uncompressedPubToJwk(clientRaw);
  const clientPub = await crypto.subtle.importKey(
    "jwk",
    clientJwk,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    [],
  );

  // 3. ECDH shared secret
  const sharedBits = await crypto.subtle.deriveBits(
    { name: "ECDH", public: clientPub },
    ephemeral.privateKey,
    256,
  );
  const sharedSecret = new Uint8Array(sharedBits);

  const auth = b64urlToBytes(authB64u);
  const salt = crypto.getRandomValues(new Uint8Array(16));

  // 4. PRK_key = HKDF-Extract(auth, sharedSecret), key_info, then PRK
  const keyInfo = concat(
    enc.encode("WebPush: info\0"),
    clientRaw,
    asPublicKey,
  );
  const ikm = await hkdf(auth, sharedSecret, keyInfo, 32);

  // 5. Derive CEK and nonce from ikm with content-encoding info
  const cek = await hkdf(salt, ikm, enc.encode("Content-Encoding: aes128gcm\0"), 16);
  const nonce = await hkdf(salt, ikm, enc.encode("Content-Encoding: nonce\0"), 12);

  // 6. Build plaintext: payload || 0x02 (last record delimiter), pad none
  const plaintext = concat(payload, new Uint8Array([0x02]));

  const cekKey = await crypto.subtle.importKey("raw", cek, { name: "AES-GCM" }, false, ["encrypt"]);
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, cekKey, plaintext),
  );

  // 7. Build aes128gcm header: salt(16) || rs(4 BE = 4096) || idlen(1) || keyid (asPublicKey 65)
  const rs = new Uint8Array(4);
  new DataView(rs.buffer).setUint32(0, 4096, false);
  const header = concat(salt, rs, new Uint8Array([asPublicKey.length]), asPublicKey);

  return concat(header, ciphertext);
}

export async function sendWebPush(
  subscription: PushSubscription,
  payload: unknown,
  opts: {
    vapidPublicKey: string;
    vapidPrivateKey: string;
    vapidSubject: string;
    ttl?: number;
    urgency?: "very-low" | "low" | "normal" | "high";
  },
): Promise<{ ok: boolean; status: number; statusText: string; body?: string }> {
  const url = new URL(subscription.endpoint);
  const audience = `${url.protocol}//${url.host}`;
  const jwt = await signVapidJwt(
    audience,
    opts.vapidSubject,
    opts.vapidPrivateKey,
    opts.vapidPublicKey,
  );

  const bodyBytes = enc.encode(typeof payload === "string" ? payload : JSON.stringify(payload));
  const encrypted = await encryptAes128Gcm(bodyBytes, subscription.p256dh, subscription.auth);

  const res = await fetch(subscription.endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Encoding": "aes128gcm",
      "Content-Length": String(encrypted.length),
      "TTL": String(opts.ttl ?? 60 * 60 * 24),
      "Urgency": opts.urgency ?? "normal",
      "Authorization": `vapid t=${jwt}, k=${opts.vapidPublicKey}`,
    },
    body: encrypted,
  });

  let bodyText: string | undefined;
  if (!res.ok) {
    try {
      bodyText = await res.text();
    } catch { /* ignore */ }
  } else {
    await res.body?.cancel().catch(() => {});
  }

  return { ok: res.ok, status: res.status, statusText: res.statusText, body: bodyText };
}
