final result: passed

Reference material:
- C:\Users\Cem\Desktop\mindeer\görsller
- Telegram-noted APK screens for portfolio card, tab/search/header language, hidden-balance behavior, profile/reference/install flows, and Eminevim branding.

Verified:
- Landing page now follows the same light APK/e-branch UI language: white surface, soft blue portfolio card, search field, horizontal tabs, compact action pills, Inter/system typography, and Eminevim Yatırım branding.
- Mobile live page has no horizontal overflow at 393px viewport.
- Live page and login screen show no visible legacy Paribu, Minder, Ottoman, Zenith, Aura, biometric, or 2FA wording.
- Render health endpoint responds successfully after deploy.
- Logo is placed as an app-style mark plus Eminevim/Yatırım wordmark and fits the header/login contexts.

Checks run:
- python -m py_compile tools/backend_server.py
- node --check dist/fullstack.js
- Playwright mobile and desktop screenshots for local landing
- Playwright mobile screenshot for live landing
- Playwright login screen screenshot

Remaining note:
- Authenticated e-branch deep screens require a seeded or approved account to visually walk every logged-in route on live. The APK-specific overrides remain in reference-flow.js and were not replaced by the landing redesign.
