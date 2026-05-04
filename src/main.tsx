import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { registerPWA } from "./pwa";

createRoot(document.getElementById("root")!).render(<App />);

// Register service worker (no-op in preview/iframe, no-op without SW support).
registerPWA();
