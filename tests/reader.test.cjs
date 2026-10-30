const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { JSDOM } = require('jsdom');

const fixture = `<!doctype html><html dir="rtl"><body>
<div class="dynamicHeader"><a href="/course/">Course</a></div>
<div class="whole"><div class="sidebar">Course navigation</div><div class="main notebook">
<h1>Test notebook</h1><section class="description notebookSection"><div class="nb-annotatable nb-ink-root">
<h2>פרק ראשון</h2><p id="prose">תוכן מקורי עם <mark id="saved-note">הערה שמורה</mark> ו־O<sub>2</sub>.</p>
<p id="reaction"><span>P+L⇄PL</span></p><p id="chemical">CO<sub>2</sub>+H<sub>2</sub>O⇄H<sup>+</sup>+HCO<sub>3</sub><sup>–</sup></p>
<p id="ambiguous">Y=[L]L+Kd</p><p id="tex">\\[\\frac{a}{b} = c\\]</p><p id="invalid">\\[\\notARealCommand{a}\\]</p>
<p><img id="figure" src="figure.png" width="500" height="800"></p>
</div></section><section class="videos"><iframe title="Lesson video"></iframe></section></div></div>
<aside id="nb-notes-panel"><textarea>Unsaved note</textarea></aside><footer class="elementor-location-footer">Footer</footer>
</body></html>`;
const tick = (ms = 30) => new Promise(resolve => setTimeout(resolve, ms));
async function setup(options = {}) {
  const html = options.brief ? fixture.replace('class="description notebookSection"', 'class="brief notebookSection"') : fixture;
  const dom = new JSDOM(html, { url: 'https://bioplus.co.il/notebook/test/', runScripts: 'outside-only', pretendToBeVisual: true });
  const w = dom.window;
  w.scrollBy = () => {};
  w.eval(readFileSync('extension/vendor/katex.min.js', 'utf8'));
  const state = { biobetter: options.settings || { enabled: true, fontSize: 18 } };
  const listeners = [];
  w.chrome = { storage: {
    local: { get: async () => state, set: async value => { Object.assign(state, value); } },
    onChanged: { addListener: fn => listeners.push(fn) }
  } };
  if (options.ink) w.document.querySelector('.nb-ink-root').insertAdjacentHTML('beforeend', '<svg class="nb-ink-surface"><path d="M0 0 L30 50"/></svg>');
  const original = w.document.querySelector('.nb-annotatable');
  const baseline = { html: original.innerHTML, text: original.textContent, nodes: [...original.querySelectorAll('*')], note: w.document.querySelector('#nb-notes-panel'), input: w.document.querySelector('textarea') };
  if (options.noLesson) original.closest('section').remove();
  if (options.mixed) {
    w.document.querySelector('.videos').insertAdjacentHTML('beforebegin', '<section class="brief notebookSection"><h2>תקציר נוסף</h2><p id="brief-equation">A+B=C</p><a href="/notebook/next/?from=brief" target="_blank">המשך</a><svg class="nb-ink-surface"></svg></section>');
  }
  w.eval(readFileSync('extension/math.js', 'utf8'));
  w.eval(readFileSync('extension/content.js', 'utf8'));
  await tick();
  const ui = w.document.getElementById('biobetter-ui')?.shadowRoot;
  return { dom, w, d: w.document, ui, state, listeners, baseline, original };
}

for (const brief of [false, true]) {
test(`preserves text offsets, original nodes, note inputs and exact HTML across repeated toggles (${brief ? 'brief' : 'description'})`, async () => {
  const s = await setup({ brief });
  try {
    const walker = s.d.createTreeWalker(s.original, s.w.NodeFilter.SHOW_TEXT);
    let text = '', node;
    while ((node = walker.nextNode())) text += node.data;
    assert.equal(text, s.baseline.text);
    assert.equal(s.original.textContent, s.baseline.text);
    assert.ok(s.baseline.nodes.every(n => n.isConnected));
    s.baseline.input.value = 'A note edited while BioBetter is active';
    for (let i = 0; i < 3; i++) {
      s.ui.querySelector('.toggle').click();
      assert.equal(s.original.innerHTML, s.baseline.html);
      assert.equal(s.d.documentElement.hasAttribute('data-biobetter'), false);
      assert.equal(s.d.querySelectorAll('.bb-math-host').length, 0);
      s.ui.querySelector('.toggle').click();
      assert.equal(s.d.documentElement.getAttribute('data-biobetter'), 'on');
    }
    assert.equal(s.d.querySelector('#nb-notes-panel'), s.baseline.note);
    assert.equal(s.baseline.input.value, 'A note edited while BioBetter is active');
  } finally { s.dom.window.close(); }
});
}

test('typesets explicit math without guessing lost fractions or changing source characters', async () => {
  const s = await setup();
  try {
    assert.equal(s.d.querySelectorAll('.bb-math-host').length, 3);
    assert.equal(s.d.querySelector('#ambiguous').classList.contains('bb-equation-ambiguous'), true);
    assert.equal(s.d.querySelector('#ambiguous').textContent, 'Y=[L]L+Kd');
    assert.equal(s.d.querySelector('#invalid').className, '');
    const tex = s.d.querySelector('#tex').nextElementSibling.shadowRoot;
    assert.ok(tex.querySelector('mfrac'));
    tex.querySelector('button').click();
    assert.ok(s.d.querySelector('#tex').classList.contains('bb-show-source'));
    assert.equal(tex.querySelector('button').getAttribute('aria-expanded'), 'true');
    assert.equal(s.original.textContent, s.baseline.text);
  } finally { s.dom.window.close(); }
});

test('updates math when content changes and leaves highlighted equations visible', async () => {
  const s = await setup();
  try {
    s.d.querySelector('#reaction').innerHTML = '<mark>P+L⇄PL</mark>';
    const added = s.d.createElement('p');
    added.textContent = 'A+B=C';
    s.original.append(added);
    await tick(250);
    assert.equal(s.d.querySelector('#reaction').className, '');
    assert.equal(s.d.querySelector('#reaction').querySelector('mark').textContent, 'P+L⇄PL');
    assert.ok(added.classList.contains('bb-equation-rendered'));
    assert.equal(s.d.querySelectorAll('.bb-math-host').length, 3);
    added.remove();
    await tick(250);
    assert.equal(s.d.querySelectorAll('.bb-math-host').length, 2);
  } finally { s.dom.window.close(); }
});

for (const brief of [false, true]) {
test(`restores original geometry for saved ink and while drawing is active (${brief ? 'brief' : 'description'})`, async () => {
  const s = await setup({ ink: true, brief });
  try {
    assert.equal(s.d.documentElement.hasAttribute('data-biobetter'), false);
    assert.equal(s.original.innerHTML, s.baseline.html);
    assert.equal(s.ui.querySelector('.status').hidden, false);
    s.d.querySelector('.nb-ink-surface').remove();
    await tick(250);
    assert.equal(s.d.documentElement.getAttribute('data-biobetter'), 'on');
    s.d.body.classList.add('nb-inking');
    await tick();
    assert.equal(s.d.documentElement.hasAttribute('data-biobetter'), false);
    s.d.body.classList.remove('nb-inking');
    await tick();
    assert.equal(s.d.documentElement.getAttribute('data-biobetter'), 'on');
  } finally { s.dom.window.close(); }
});
}

test('enhances both lesson sections together and protects ink in the second section', async () => {
  const s = await setup({ mixed: true });
  try {
    const brief = s.d.querySelector('.brief');
    const link = brief.querySelector('a');
    let clicked = 0;
    link.addEventListener('click', event => { event.preventDefault(); clicked++; });
    assert.equal(s.ui.querySelector('select').options.length, 3);
    assert.ok(s.d.querySelector('#reaction').classList.contains('bb-equation-rendered'));
    assert.ok(s.d.querySelector('#brief-equation').classList.contains('bb-equation-rendered'));
    s.ui.querySelector('.toggle').click();
    const mainHTML = s.d.querySelector('.main.notebook').innerHTML;
    s.ui.querySelector('.toggle').click();
    s.ui.querySelector('.toggle').click();
    assert.equal(s.d.querySelector('.main.notebook').innerHTML, mainHTML);
    assert.equal(brief.querySelector('a'), link);
    assert.equal(link.getAttribute('href'), '/notebook/next/?from=brief');
    assert.equal(link.target, '_blank');
    link.click();
    assert.equal(clicked, 1);
    s.ui.querySelector('.toggle').click();
    const path = s.d.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', 'M0 0 L30 50');
    brief.querySelector('svg').append(path);
    await tick(250);
    assert.equal(s.d.documentElement.hasAttribute('data-biobetter'), false);
    assert.equal(path.isConnected, true);
    path.remove();
    await tick(250);
    assert.equal(s.d.documentElement.getAttribute('data-biobetter'), 'on');
  } finally { s.dom.window.close(); }
});

test('loads, saves, clamps and synchronizes preferences without duplicating UI', async () => {
  const s = await setup({ settings: { enabled: false, fontSize: 22 } });
  try {
    assert.equal(s.d.documentElement.hasAttribute('data-biobetter'), false);
    s.ui.querySelector('.toggle').click();
    await tick();
    assert.equal(s.state.biobetter.enabled, true);
    assert.equal(s.d.documentElement.style.getPropertyValue('--biobetter-font'), '22px');
    s.ui.querySelector('.larger').click();
    await tick();
    assert.equal(s.state.biobetter.fontSize, 23);
    s.listeners[0]({ biobetter: { newValue: { enabled: true, fontSize: 100 } } }, 'local');
    assert.equal(s.ui.querySelector('output').textContent, '24');
    assert.equal(s.ui.querySelector('.larger').disabled, true);
    s.w.eval(readFileSync('extension/content.js', 'utf8'));
    assert.equal(s.d.querySelectorAll('#biobetter-ui').length, 1);
  } finally { s.dom.window.close(); }
});

test('fails closed on pages without the known notebook structure', async () => {
  const s = await setup({ noLesson: true });
  try {
    assert.equal(s.ui, undefined);
    assert.equal(s.d.documentElement.hasAttribute('data-biobetter'), false);
  } finally { s.dom.window.close(); }
});

test('manifest restricts scope and bundles executable code locally', () => {
  const m = JSON.parse(readFileSync('extension/manifest.json', 'utf8'));
  assert.deepEqual(m.permissions, ['storage']);
  assert.equal(m.manifest_version, 3);
  assert.equal(m.content_scripts.length, 3);
  for (const script of m.content_scripts) {
    assert.ok(script.matches.every(match => /^https:\/\/(www\.)?bioplus\.co\.il\/(notebook|course|subsubject)\/\*$/.test(match)));
    for (const file of [...script.js, ...script.css]) assert.ok(readFileSync(`extension/${file}`).length > 0);
  }
});
