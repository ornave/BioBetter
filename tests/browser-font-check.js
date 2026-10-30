// Run this function in the authenticated notebook with the current reader.css
// and typography.css loaded. It exercises real Chrome cascade/layout, beyond the DOM-only tests.
async () => {
  const ui = document.querySelector('#biobetter-ui').shadowRoot;
  const lesson = document.querySelector('.main.notebook :is(.description, .brief)');
  const paragraph = lesson.querySelector('p:not(.bb-equation-source):not(:has(img))');
  const listItem = lesson.querySelector('li');
  const span = paragraph.querySelector('span');
  const originalText = lesson.textContent;
  const originalSize = Number(ui.querySelector('output').textContent);
  const wasEnabled = ui.querySelector('.toggle').getAttribute('aria-checked') === 'true';
  const wait = () => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  const selectSize = async value => {
    for (let attempts = 0; attempts < 12; attempts++) {
      const current = Number(ui.querySelector('output').textContent);
      if (current === value) { await wait(); return; }
      ui.querySelector(current < value ? '.larger' : '.smaller').click();
      await wait();
    }
    throw new Error('The text-size control did not reach the requested value.');
  };
  const results = [];
  try {
    if (!wasEnabled) { ui.querySelector('.toggle').click(); await wait(); }
    if (document.documentElement.getAttribute('data-biobetter') !== 'on') throw new Error('Reading mode is paused; font sizing cannot be checked.');
    for (const size of [16, 20, 24]) {
      await selectSize(size);
      const actual = [paragraph, span, listItem].filter(Boolean).map(e => getComputedStyle(e).fontSize);
      if (actual.some(value => value !== `${size}px`)) throw new Error(`Requested ${size}px; rendered ${actual.join(', ')}`);
      const families = [paragraph, span, listItem, ...ui.querySelectorAll('button,select,output')]
        .filter(Boolean).map(e => getComputedStyle(e).fontFamily.replace(/["']/g, ''));
      if (families.some(value => value !== 'Assistant, sans-serif')) throw new Error(`Unexpected font family: ${families.join(', ')}`);
      results.push({ requested: size, rendered: actual, paragraphHeight: paragraph.getBoundingClientRect().height });
    }
    if (lesson.textContent !== originalText) throw new Error('Lesson text changed during resizing.');
    return { passed: true, results, textPreserved: true };
  } finally {
    await selectSize(originalSize);
    if (!wasEnabled) ui.querySelector('.toggle').click();
  }
};
