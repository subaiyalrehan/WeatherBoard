# WeatherBoard — Prompts

## Prompting Strategy

- Started with planning before implementation
- Broke tasks into small, controlled steps
- Focused on UX, error handling, and real-world behavior
- Iteratively refined outputs instead of accepting defaults

---

## 1. Project Planning

**Prompt** <br/>
```
I am building a production-quality weather dashboard called "WeatherBoard".
Before generating any UI or code, help me plan the architecture and structure of the app.

Requirements:
    Single-page app (client-side only)
    Uses OpenWeatherMap (primary) and Open-Meteo (fallback)
    City autocomplete using GeoDB Cities API
    Save up to 5 favourite cities (localStorage)
    PWA support with offline mode (last viewed city cached)
    Push notifications for daily weather reminder (user preferred timings)
    Fully responsive (mobile, tablet, desktop)

I want you to:
    Suggest a clean component structure
    Suggest state management approach
    Suggest folder structure
    Identify potential edge cases and error states
    Recommend libraries/tools if needed (keep minimal)

Do not generate full code yet. Focus on planning first.
```

**Purpose** <br/>
Define architecture, structure, and technical decisions.

---

## 2. Initial UI Scaffold

**Prompt** <br/>
```
The plan looks solid and well-structured.

Before proceeding, I want to slightly simplify the push notification system:

    Keep Web Push functionality
    But simplify scheduling logic if possible (avoid overly complex cron logic)
    Focus on a reliable single daily notification per user

Everything else looks good to proceed.

Please confirm and continue with implementation in small steps.
```

**Purpose** <br/>
Generate base layout (search, weather sections, favorites).

---

## 3. UI/UX Debugging

**Prompt (a)** <br/>
```
Good progress — the foundation looks solid. Before moving to PWA + Web Push, I want to refine UX and fix a few important issues:

    Geolocation UX

    When user selects "Use my location", also display the resolved city + country clearly (not just coordinates or generic label)

    If location permission is denied:

        Show a clear toast or inline message explaining that location access was blocked

        Guide the user on how to enable it again

    If previously denied, provide a visible retry mechanism (button or hint), not a silent failure

    Dark Mode Readability

    Weather UI (hero) have poor text contrast due to dark gradients

    Improve contrast to ensure all text is clearly readable in dark mode

    Search UX Improvements

    Show suggestions immediately when input is focused (even before typing)
        Use recent searches or popular cities as initial suggestions

    Do not require 2 characters — start showing results from the first character

    Ensure autocomplete feels responsive (<300–400ms perceived delay)

    Layout & Visual Hierarchy

    Refine layout to feel more like a clean dashboard (inspired by Linear or Mercury)

    Add subtle hover effects for interactive feel

    Error/Empty States

    Ensure every interaction gives feedback:

        No silent failures anywhere

        Always inform the user what happened and what they can do next

Focus only on refining UX and UI polish for now — do not proceed to PWA or backend yet.
```

**Prompt (b)** <br/>
```
Good improvements so far. I want to fix a few UX issues before moving to PWA and push notifications:

    Location Error UX Stability

    Currently, when "my location" fails, the error disappears and reappears on retry, causing layout shift (content jumps up/down)

    Avoid any layout shifting during retry or while denying process

    Location Label Clarity

    Replace generic "My Location" with a resolved human-readable label (on currentWeather and favourite cities)

    Example: "My Location (Nazimabad, Karachi)"

    Use reverse geocoding if needed to get area/city name

    Keep it short and readable (area + city, not full address)

    Favorites Consistency

    When saving current location as a favorite, persist the same readable label

    Example: "My Location (Nazimabad)"

    Do not save it as just "My Location"

    Autocomplete Dropdown Layering Issue

    The suggestions dropdown is rendering behind other content

    Fix stacking context using proper z-index and positioning

    Ensure the dropdown always appears above all surrounding UI elements

    Verify it works correctly across all breakpoints

Once these UX issues are resolved, we can proceed to PWA + push notifications.
```

**Prompt (c)** <br/>
```

    Location Error UX

    Reserved space approach looks visually awkward
    Instead, use a toast or overlay-style message (with try again button) to avoid layout distortion
    Ensure retry/loading states don’t change container height (no jumping at all)

    Location Label

    When using "My Location", always show resolved area/city Example: "My Location (Nazimabad, Karachi)"
    Keep it short and clean
    Use area name in favourite cities too instead of only 'My location'.

    Search Suggestions

    Include a mix of recent searches + popular cities
    Ensure smooth, instant feedback

Focus on clean, stable UX - no layout shifts.
```

**Purpose** <br/>
Let the correct UI/UX continue instead of with inappropriate UX.

---

## 4. PWA & Push Notifications

**Prompt (a)** <br/>
```
UI/UX is good for now, let’s move to implementing PWA + web push notifications.

Before that, please ask when removing a favourite city, show a confirmation popup before deleting. And add the highest z-index to the header.
```

**AI planned phases. Approving the phases: (b)** <br/>
```
Okay, Proceed with Phase 1.

But make sure that the notification must fire even when the tab is closed. Ask for notification permission gracefully, If the browser does not support it, show a clear fallback message. Denied permission must not break any other part of the app.
```

**Prompt (c)**
```
Go with Phase 2 then Phase 3.

In the end, add Made with love by Subaiyal Rehan and link the name to 'subaiyalrehan.vercel.app' and remove the Credits.
```

**Purpose** <br/>
Implement installable PWA and daily push notifications.

---

## 5. UI Polish & Stability

**Prompt (a)** <br/>
```
Give he highest z index to the sidebar (settings) second header. The settings sidebar is stacked beneath the header
```

**Prompt (b)** <br/>
```
Use actual logo from public in the header instead of icon.
Show animated weather condition using lottie.
```

**Purpose** <br/>
Implement installable PWA and daily push notifications.

---

## 6. Logical Debugging

**Prompt (a)** <br/>
```
Getting this error when clicking the test push notification: 'Edge function returned a non-2xx status code' And cannot even set the Daily forecast time. And the app didn't even asked me to install/download.

These are the bugs i noticed on live published link.
```

**Prompt (b)** <br/>
```
The notifications should show my current location's weather. And show the area name, this is a must!

And check if push notifications are using the logo or not. When test sending the notification, the logo displays correctly. But when normal routine notifications trigger, it doesn't show the actual icon, instead the first letter or the app url.
```

**Purpose** <br/>
To deliver the correct logics. So the app won't break.

---

## 7. Generation of README.md

**Prompt** <br/>
```
Generate a proper industry-level README.md file that should include: tech used, setup instructions, architecture decisions, APIs used, and any known limitations.
```

**Purpose** <br/>
AI knows every feature of the app, and could generate proper README so used it. But adjusted it after generation.
