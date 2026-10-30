# Changelog

Release versions use `vMAJOR.MINOR.PATCH` tags. Each release has matching extension/package versions and GitHub release notes.

## 1.2.2 — 2026-10-30

### Fixed

- Fixed notebooks such as **עיכוב אנזימטי** being skipped because their lesson uses a `brief` section instead of `description`.
- Applied the shared notebook design, text sizing, chapter navigation, and math handling to both section formats, including notebooks containing both. Coverage remains across `/notebook/*` URLs rather than individual topics.
- Preserved original content, links, event handlers, and the freehand-ink layout safeguard in both formats.

### Validation

- All 21 automated regression tests, JavaScript syntax checks, and the extension build pass.
- Live Chrome previews confirmed preserved lesson text and original elements, working toggles and course navigation, and no horizontal overflow at desktop and 390 px widths on the affected notebook.
- Font controls were checked at 16, 20, and 24 px on both notebook formats.

### Install or update

Extract `BioBetter-v1.2.2.zip` and load its `extension` folder using **Load unpacked** at `chrome://extensions`. Existing users updating the same extension folder should click **Reload**, then refresh BioPlus.

## 1.2.1 — 2026-10-30

### Fixed

- Standardized text on `'Assistant',sans-serif` throughout enhanced notebook, course, and subsubject pages, including navigation, dialogs, notes, and dynamically added controls.
- Replaced hardcoded Arial in BioBetter toolbars, captions, source-equation controls, and popup styles with the same font stack.
- Kept icon fonts and typeset mathematics intact. Disabling BioBetter restores native page fonts; the existing ink-protection fallback remains in place.

### Validation

- All 18 automated regression tests, JavaScript syntax checks, and the extension build pass.
- Chrome checks confirmed page/control fonts, inline-font restoration, and notebook sizes of 16, 20, and 24 px without changing lesson text.

### Install or update

Extract `BioBetter-v1.2.1.zip` and load its `extension` folder using **Load unpacked** at `chrome://extensions`. Existing users updating the same extension folder should click **Reload**, then refresh BioPlus.
