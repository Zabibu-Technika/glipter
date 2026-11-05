# Screen-reader test script

This is the manual accessibility pass recommended by the design audit. Automated axe checks are necessary but not sufficient; a screen-reader user must be able to complete the core tasks.

## Environments

| Combination | Why |
|---|---|
| NVDA + Chrome (Windows) | Desktop primary |
| VoiceOver + Safari (macOS) | Desktop/Apple |
| VoiceOver + Safari (iOS) | Mobile primary |
| TalkBack + Chrome (Android) | Mobile secondary |

## Script

### 1. First load and onboarding

1. Open the app with a cleared localStorage.
2. Confirm the onboarding dialog is announced, focus is inside it, and the three steps are readable.
3. Tab through Back / Next / Skip / Start camera / Play demo; confirm focus is visible and does not escape the dialog.
4. Close with Escape; confirm focus returns to the page.
5. Replay from Settings → Onboarding and confirm it opens again.

**Expected:** dialog name and step text announced; no keyboard trap; Escape closes.

### 2. Navigation

1. Tab to “Skip to content” and press Enter; focus moves to main.
2. Tab through app bar: brand, language select, command palette, settings.
3. Tab through the rail: Live, Transcript, Learn, Voice, About, Settings.
4. Confirm each button announces its name, not just an icon.

### 3. Live recognition

1. Start the demo (or camera).
2. Confirm the current sign is **not** announced every frame.
3. When a sign commits, confirm the hidden live region announces “Signed …”.
4. Check the gloss/English streams do not continuously interrupt.
5. Stop; confirm the camera status and stop action are announced.

### 4. Command palette

1. Press Ctrl/Cmd K.
2. Confirm “Search commands” combobox is announced and the list is associated.
3. Arrow down/up; confirm the active option is announced via `aria-activedescendant`.
4. Enter to run; Escape to close; confirm focus returns to the command button.

### 5. Settings

1. Open Settings.
2. Tab through every control; confirm labels and values are announced.
3. Change theme, text size, contrast, haptics, low-power; confirm state.
4. Close with Escape; confirm focus returns to Settings.

### 6. Voice

1. Open Voice.
2. Confirm ASR support and network caveat are announced.
3. Start/stop ASR; confirm status changes are announced and permission denial is explained.
4. Confirm TTS voice selector, rate, Speak/Stop, quick phrases have names.
5. Use “Use text instead” and confirm focus moves to the text area.

### 7. Learn and practice

1. Open Learn; choose ASL and KSL.
2. Confirm each card has a letter name; the selected detail announces the letter, hint, source, confidence.
3. Start practice; confirm the target letter and feedback are announced.
4. Exit practice.

### 8. Transcript and export

1. Add several signs via the demo.
2. Open Transcript; confirm rows are readable and search/filter controls are labelled.
3. Apply a confidence filter; confirm the “Showing X of Y” status updates.
4. Export TXT/CSV/JSON; confirm a download or an accessible error.

### 9. Errors

1. Deny camera permission; confirm the error banner is an alert, the message is announced, and Retry/Dismiss are reachable.
2. Dismiss; confirm focus is not lost.
3. Retry with permission allowed.

## Pass criteria

- No unlabelled controls.
- No focus traps outside native dialogs.
- No per-frame live-region spam.
- All errors are announced and actionable.
- Focus returns to the triggering control after dialogs close.
- 200% zoom and large text hold without clipping.

## Results

| Combination | Tester | Date | Pass/Fail | Issues |
|---|---|---|---|---|
| | | | | |

> This script has **not** been executed yet. It is a release gate, not a claim.
