# BioBetter

A Chrome extension that makes BioPlus notebooks, course pages, and study hubs calmer to use. Designed primarily for desktop, with a responsive layout for narrow windows.

## Install

1. Download this repository using **Code → Download ZIP** and extract it, or clone it with `git clone https://github.com/ornave/BioBetter.git`.
2. Open `chrome://extensions` in Chrome and enable **Developer mode**.
3. Click **Load unpacked** and select the `extension` folder inside your downloaded or cloned project.
4. Refresh your BioPlus notebook, course, or subsubject page. BioBetter starts enabled.

The **מצב קריאה** switch on notebooks, or **תצוגה משופרת** on course and subsubject pages, restores the original view instantly. Pin BioBetter in Chrome's extensions menu to access the popup. Settings are saved locally and shared between your open BioPlus tabs. The text-size preference applies to notebook lessons.

No build is needed to install the checked-in extension. If you edit its files, click **Reload** on the extension card in `chrome://extensions`, then refresh your BioPlus page.

## What changes

- A centered, readable Hebrew lesson with clearer headings, comfortable line spacing, and a navy/blue palette.
- A single page scrollbar for reading, replacing the nested lesson and course scroll containers. Notes, dialogs, and wide tables can still scroll when necessary.
- Centered, proportionally scaled images, capped at the available width and 540 px height; original sources, links, and captions remain intact.
- A chapter selector, reading progress indicator, and text size controls (16–24 px).
- Course navigation available through **תוכן הקורס**, with existing links and expand/collapse behavior preserved.
- The promotional site footer is hidden. Search, videos, study tools, notes, progress controls, and next-lesson navigation remain available.
- Locally bundled KaTeX produces accessible native MathML for supported standalone equations. **הצגת המקור** reveals the original notation.
- Course overview pages use a three-column desktop subject grid with clear blue progress bars and all original lesson links. Progress values come directly from the site's accessible progress widgets and continue to update normally.
- **המחברת האישית שלי** has a dedicated full-width notes shortcut above the course subjects. The original card and its links are moved intact, and return to their original position when BioBetter is disabled. The shortcut is recognized by its same-site `/my-study-notebook/` destination and is excluded from the subject count.

### Subsubject study hubs

All `/subsubject/*` pages with the site's resource-library structure receive the same desktop-first makeover; no topic names or IDs are hardcoded.

- A compact progress overview retains the native resource selectors and uses the site's current progress values, including the lesson total. It does not calculate a different average or mark anything complete.
- A three-column material library keeps the original links, titles, completion checkmarks, link targets, and order. Hebrew captions distinguish presentations, recordings, notebook reading, videos, quizzes, and flashcard practice. Quizzes and flashcards receive a practice treatment; flashcards retain their original app destination.
- The original completion panel sits below the library in an expandable **מעקב והשלמת חומרי הלמידה** section. **ניהול השלמות** opens it directly. All original completion/undo buttons, quiz rules, status messages, and delegated handlers stay intact.
- The personal-files button and dialog remain available. Descriptions, images, and unfamiliar resource categories are retained.
- Disabling restores original DOM positions and removes BioBetter's captions, counts, and progress styling. Native progress updates made while enabled remain intact.

## Content protection and limitations

BioBetter styles the existing page; it does not recreate the lesson. Original paragraphs, text nodes, images, IDs, event handlers, and note inputs remain in place. Math previews use shadow DOM so the site's text-offset annotation system sees the same original text. Highlighted equations stay in their original form. Turning the extension off removes its math previews and page overrides.

Some source equations on the oxygen-binding proteins page have already lost their fraction bars or exponents. BioBetter flags these nine known strings as source notation rather than silently guessing missing mathematics. It renders explicit standalone `\\(...\\)`, `\\[...\\]`, and `$$...$$` TeX, plus a conservative subset of plain equations with existing subscript/superscript markup. It does not rewrite inline equations in prose or perform OCR on images.

Freehand drawings can depend on the original page geometry. If saved ink strokes are present, or drawing mode is active, BioBetter automatically keeps the original layout and explains this in its toolbar. It never deletes or rewrites the drawing data.

This version targets `https://bioplus.co.il/notebook/*`, `https://bioplus.co.il/course/*`, `https://bioplus.co.il/subsubject/*`, and their `www` equivalents. Pages without the recognized notebook, course, or subsubject structure are left alone. Future BioPlus markup changes may require selector updates. The extension's light reading theme controls the lesson appearance while enabled; switch it off to use the site's original theme.

## Privacy

The only Chrome permission is `storage`, used for the enable switch and font size. There is no analytics, remote executable code, external font service, or transmission of lesson or note content. BioBetter does not access accounts or change server-side data.

## Development and checks

Requires Node.js 24 or later.

```sh
npm ci
npm run build
npm run check
npm test
```

The build copies KaTeX and its MIT license into `extension/vendor`. Native MathML means no separately loaded KaTeX fonts or stylesheet is required.

Automated regression tests cover original text and node preservation, exact lesson HTML restoration, equation rendering and ambiguity handling, dynamic content/highlights, ink protection, preference persistence/synchronization, repeat injection, and restricted extension scope.

Course regression tests also cover moving and restoring the notes shortcut, retaining link listeners, late-arriving subjects, invalid/updated progress values, exact HTML restoration, and shared settings. The authenticated knowledge-exam course page was checked live: all 39 links and six progress widgets were preserved, including the site's 35% biochemistry value, and disabling the makeover restored the exact original main HTML.

Subsubject regression tests cover exact HTML restoration, native select handlers, completion-panel event delegation, quiz controls, live and invalid progress values, replacement DOM, late resources, unknown categories, disabled startup, and shared preferences. Both supplied pages were checked in the authenticated browser: all 55 cell-biology links and 49 protein-topic links were retained, along with all original elements. The protein page retained its native 70% total and 100% completed categories. Desktop and narrow-window checks found no horizontal overflow or nested resource scroll containers; the completion disclosure and personal-files dialog opened successfully. These checks did not change any server-side completion data.

`tests/browser-font-check.js` contains an additional browser-run regression check: run its function on an open notebook with the current extension CSS loaded. It clicks the actual size controls and verifies computed paragraph, span, and list-item sizes at 16, 20, and 24 px, checks that lesson text is unchanged, and restores the previous size and enabled state. This catches CSS cascade conflicts that DOM-only tests cannot verify.

The authenticated live page was also checked using the browser: all 21 lesson image nodes and the notes panel were preserved; disabling restored the exact original lesson HTML; enhanced reading removed the two nested scroll containers; the 390 px viewport had no horizontal overflow; and the site's notes panel opened successfully. Live checks use an injected preview of the same files. Unpacked installation still needs the manual Chrome steps above.

Implementation references: [Chrome content scripts](https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts), [KaTeX security options](https://katex.org/docs/security).
