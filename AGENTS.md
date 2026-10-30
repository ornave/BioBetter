# BioBetter project context

Read `README.md`, `extension/manifest.json`, and the files for the affected page type before changing behavior. This file records project decisions so future work does not depend on earlier chat history. Treat the current source and live site as authoritative; update this guidance when decisions change.

## Purpose and user preferences

BioBetter is a reversible Chrome Manifest V3 extension for the authenticated Hebrew biology learning site `bioplus.co.il`. It improves the existing site through DOM and CSS changes, preserving its learning content and functionality.

- Design primarily for desktop. Responsive layouts support smaller windows, but should not constrain desktop pages to mobile widths.
- Use `'Assistant',sans-serif` throughout enhanced pages and extension controls. `extension/typography.css` applies the shared page-wide rule under the existing enabled attributes; preserve icon fonts, typeset mathematics, and the ink-layout fallback. BioPlus already loads Assistant.
- Use the established blue/navy palette, not the site's green: background `#f1f5fb`, white cards, headings `#173b68`, accents `#3975cd`, borders `#d9e3f0`.
- Understand the Hebrew content and its purpose before designing. Preserve RTL reading order and use Hebrew labels for site-facing controls.
- New page designs should apply to the whole requested route family, not just example topic URLs. Inspect more than one example when available.
- Prioritize readable text, generous navigation width, proportional images, and one main page scrollbar. Notes, dialogs, and wide tables may still need their own scrolling.
- Personal notes are a utility, not a course or subject. Keep their shortcut visually distinct from academic subject cards.

## Code map

| Route / concern | Files | Existing structure / behavior |
| --- | --- | --- |
| `/notebook/*` | `extension/content.js`, `reader.css`, `math.js` | `.main.notebook` with `.description` and/or `.brief` lesson sections; shared reading controls, chapters, math, notes and ink protection |
| `/course/*` | `extension/course.js`, `course.css` | `body.single-course .main > .courseSubjects`; subject cards, native progress, separate personal-notes shortcut |
| `/subsubject/*` | `extension/subsubject.js`, `subsubject.css` | `body.single-subsubject .whole > .main`; `.checkList` overview, `.box.items` resources, expandable `#bp-resource-completion` |
| Extension scope | `extension/manifest.json` | Explicit HTTPS matches, including `www`; separate scripts and styles per page family |
| Settings | `extension/popup.*` and page scripts | `chrome.storage.local` key `biobetter`: `{ enabled, fontSize }`; synchronize via storage change events |
| Build / tests | `scripts/build.mjs`, `tests/*.test.cjs` | Plain JS/CSS, Node test runner and jsdom; locally bundled KaTeX |

Page CSS is gated by root attributes (`data-biobetter`, `data-biobetter-course-page`, `data-biobetter-subsubject`). The toolbar lives in a shadow root on `#biobetter-ui`. Guard against duplicate injection and leave unfamiliar page structures alone.

## Preservation requirements and known pitfalls

- Keep original content nodes, links, URLs/query parameters, targets, IDs, form controls, and event handlers. Avoid recreating site content with `innerHTML`. Generated extension UI can use it.
- If moving original nodes, keep position markers and restore them on disable. Never resurrect nodes removed by the site or discard replacements inserted by the site.
- A disable/enable cycle should restore original HTML when the site has not changed it. Preserve native changes made while enabled rather than rolling back progress or user input.
- Native progress values and completion controls are authoritative. Do not infer completion from opening resources, calculate a competing total, or add quiz-completion controls. Observe late DOM/progress updates without creating mutation loops.
- Notebook annotations depend on original text-node offsets. Math previews use shadow DOM; do not rewrite lesson text or render highlighted equations. Never guess missing fraction bars or exponents in ambiguous source equations.
- Freehand notes depend on geometry. Retain the existing fallback to the original layout when ink is present or drawing mode is active.
- Notebook font controls must override native paragraph/list and inline-span font rules. Verify computed sizes in Chrome, not only jsdom. The contents panel is intentionally wider (360px on desktop).
- Native styles can include floats, fixed heights, nested overflow, and `nth-child` grid placement. Check computed layout; reset these only within the enhanced page scope.
- Preserve the personal-files dialog, study tools, status messages, and notes. Hide only the identified promotional footer, not arbitrary footers.
- Keep executable code local. Current permission is only `storage`; do not add remote scripts or transmit learning/note content.

## Validation and delivery

Use Node.js 24+. Run `npm ci` if dependencies are missing. For code changes, run `npm run check`, `npm test`, and `npm run build`. Add meaningful regression coverage for new preservation/interaction behavior. Documentation-only edits need no application tests.

For layout changes, inspect the authenticated live page when browser tools are available. Verify desktop first, then a narrow window; restore the user's desktop view afterward. Check overflow, original node/link preservation, toggling, and affected controls. Do not change real completion data just to test a redesign. Use synthetic fixtures for tests; do not commit authenticated page dumps, personal notes, screenshots, or credentials.

`tests/browser-font-check.js` checks actual notebook font controls. A script/style injected into a live tab is a preview, not an installed extension update. The user must reload the unpacked extension at `chrome://extensions` and refresh the page for persistent changes. Browser-tool and shell filesystems may differ; do not assume local paths are accessible to browser tools.

Keep release versions consistent in `extension/manifest.json`, `package.json`, and both version fields in `package-lock.json`. Update README scope and behavior for new page families. ZIPs and `artifacts/` are ignored generated outputs; the checked-in `extension/` folder is installable without a build. Do not edit vendored KaTeX directly.

Starting with v1.2.1, published releases use semantic versions, annotated `vMAJOR.MINOR.PATCH` Git tags, a dated `CHANGELOG.md` entry, and matching GitHub release notes. Attach a versioned ZIP containing `extension/`. Follow the release checklist in README when the user requests a release; do not publish automatically for ordinary local edits.

The repository is `https://github.com/ornave/BioBetter`, normally on `main`. Check current Git state before committing or pushing, preserve unrelated work, and accurately distinguish local edits from published changes. Do not assume authentication or tool availability carries over between sessions.
