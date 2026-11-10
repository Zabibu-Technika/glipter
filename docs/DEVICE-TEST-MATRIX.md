# Device & Browser Test Matrix

This is the execution plan for the audit recommendation “real Android/tablet/camera/mic/thermal testing.” The automated Playwright sweep covers layout and accessibility; this matrix covers the physical-device risks that automation cannot.

## Target matrix

| Tier | Device / browser | Why it matters | Status |
|---|---|---|---|
| Small phone | 320×568 Android, Chrome / Samsung Internet | Lowest-width layout, touch targets, bottom nav | Automated layout only |
| Modern phone | 390×844 iPhone, Safari | iOS MediaPipe/WASM, SpeechRecognition gaps, safe-area insets | Manual |
| Modern Android | 390×844 Pixel, Chrome | Camera, ASR, TTS, install, low-power | Manual |
| Budget Android | 2 GB RAM, Android 10/11, Chrome | Model load, memory, 15 fps low-power, thermal | Manual |
| Tablet portrait | 768×1024 iPad, Safari | Icon rail, stacked studio, status bar fit | Automated layout only |
| Tablet landscape | 1024×768 iPad / Android | Split studio, inspector width, camera framing | Automated layout only |
| Old laptop | 1366×768, integrated GPU, Chrome/Edge | MediaPipe WebGL, 30 fps, fan/thermal | Manual |
| Desktop | 1440×900, Chrome/Edge | Primary design target | Automated + manual |
| Wide desktop | 1920×1080, Chrome | Capped studio width, inspector balance | Automated layout only |
| Kiosk | mini-PC / Raspberry Pi-class, Chromium kiosk | Full-screen mode, offline boot, camera mount | Manual |
| Screen reader | NVDA + Chrome, VoiceOver + Safari, TalkBack + Chrome | Announcements, focus order, dialogs | Manual — see `SCREEN-READER-TEST.md` |

## Scenarios

For every device/browser pair:

1. Cold load from a cleared profile.
2. Offline: load once, go offline, reload, run the demo, export.
3. Camera permission: allow, deny, revoke, retry.
4. Live recognition: one hand, two hands, no hand, low light, hand near edge.
5. Language switching: KSL, ASL, KSL words, BSL.
6. Practice mode: target letter, correct sign, wrong sign, exit.
7. Voice: embedded eSpeak voice, speech language, ASR start/stop, permission deny, offline warning, system voice, stop.
8. History: search, confidence filter, export TXT/CSV/JSON.
9. Settings: theme, text size, contrast, motion, haptics, low-power, kiosk, language picker.
10. Install/PWA: install prompt, standalone launch, offline launch.
11. Kiosk: enter, full-screen, exit, Escape.
12. 10-minute continuous session: memory, FPS, thermal, crash-free.

## Acceptance criteria

- No horizontal overflow at 320, 390, 768, 1024, 1440, 1920.
- WCAG 2.2 AA 24×24 targets everywhere; 44×44 for primary touch actions.
- Cold load: ≤1.5 MB critical transfer, DCL ≤1.5 s on localhost, ≤5 s on a mid-range phone over Wi-Fi.
- Inference: ≥15 fps low-power / ≥25 fps normal on a 2 GB Android; p95 latency <100 ms.
- 10-minute session: no crash, no thermal drop below 15 fps, memory growth <50 MB.
- Offline reload: shell, model, demo, export all work.
- Camera/mic errors are announced, dismissible, and retryable.
- Screen-reader script passes (see `SCREEN-READER-TEST.md`).

## Results template

| Date | Device | OS | Browser | Build | Scenario | Result | Notes |
|---|---|---|---|---|---|---|---|
| | | | | | | | |

## Current automated coverage

- Playwright at 390×844, 768×1024, 1024×768, 1440×900, 1920×1080.
- axe-core WCAG 2.2 AA.
- Service-worker offline reload.
- Demo without camera.
- Cold-load resource/timing snapshot.
- Not covered: real camera/mic, WebGL/MediaPipe on device, thermal, 320×568, Safari/Firefox, screen reader.
