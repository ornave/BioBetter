const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { JSDOM } = require('jsdom');

const script = readFileSync('extension/subsubject.js', 'utf8');
const tick = () => new Promise(resolve => setTimeout(resolve, 15));
const card = (type, title) => `<div class="${type} box items"><h3>${title}</h3><a href="/${type}/sample/?courseId=240" target="_blank">חומר לימוד</a></div>`;
const tracker = `<section id="bp-resource-completion"><h2>ההתקדמות שלי בחומרי הלמידה</h2><p>שאלון מושלם באמצעות כפתור הסיום בשאלון.</p><ul><li data-item-id="1"><a href="/notebook/sample/">מחברת</a><span class="bp-resource-state">טרם הושלם</span><button data-done="0">סיימתי ללמוד</button></li><li data-item-id="2"><a href="/system-quiz/sample/">שאלון</a><span class="bp-resource-state">טרם הושלם</span></li></ul><p role="status"></p></section>`;
function fixture(withTracker) {
  return `<html dir="rtl"><body class="single-subsubject"><div class="whole"><h3 id="title"><a href="/subject/sample/">נושא</a></h3><h1>תת-נושא</h1>${withTracker ? tracker : ''}<p id="description">תיאור עם <img src="diagram.png" alt="תרשים"></p><div class="main"><div class="bpsf-entry"><button>הקבצים שלי</button></div><div class="checkList box item"><div class="related"><select class="notebook items"><option value="" disabled>מחברות</option><option value="/notebook/sample/">מחברת</option></select><div class="progress-container" role="progressbar" aria-valuenow="70" data-progress="70" style="position: relative;"><svg></svg><strong>70%</strong></div></div></div>${card('notebook', 'מחברות למידה')}${card('system-quiz', 'שאלונים')}${card('flashcard', 'כרטיסיות')}</div></div></body></html>`;
}
async function setup({ enabled = true, withTracker = true } = {}) {
  const dom = new JSDOM(fixture(withTracker), { url: 'https://bioplus.co.il/subsubject/arbitrary-topic/', runScripts: 'outside-only' });
  const w = dom.window, d = w.document, whole = d.querySelector('.whole');
  const html = whole.innerHTML, nodes = [...whole.querySelectorAll('*')];
  const settings = { biobetter: { enabled, fontSize: 23 } }, listeners = [];
  w.chrome = { storage: { local: { get: async () => settings, set: async value => Object.assign(settings, value) }, onChanged: { addListener: fn => listeners.push(fn) } } };
  w.HTMLElement.prototype.scrollIntoView = function () {};
  w.eval(script);
  await tick();
  return { dom, w, d, whole, html, nodes, settings, listeners, ui: d.querySelector('#biobetter-ui').shadowRoot };
}

test('study hubs preserve original content, links, selects, and exact HTML across repeated toggles', async () => {
  const s = await setup();
  try {
    assert.ok(s.nodes.every(node => node.isConnected));
    assert.equal(s.d.querySelector('.bb-completion').open, false);
    assert.equal(s.d.querySelector('.main').nextElementSibling.className, 'bb-completion');
    assert.equal(s.d.querySelector('.notebook.box a').getAttribute('target'), '_blank');
    assert.equal(s.d.querySelector('.notebook.box a').getAttribute('href'), '/notebook/sample/?courseId=240');
    assert.equal(s.d.querySelector('#description img').getAttribute('src'), 'diagram.png');
    let changes = 0;
    const select = s.d.querySelector('select');
    select.addEventListener('change', () => changes++);
    for (let i = 0; i < 3; i++) {
      s.ui.querySelector('button').click();
      assert.equal(s.whole.innerHTML, s.html);
      s.ui.querySelector('button').click();
      select.dispatchEvent(new s.w.Event('change', { bubbles: true }));
    }
    assert.equal(changes, 3);
  } finally { s.w.close(); }
});

test('completion disclosure preserves delegated site controls and quiz completion rules', async () => {
  const s = await setup();
  try {
    const panel = s.d.querySelector('#bp-resource-completion');
    let calls = 0;
    panel.addEventListener('click', event => {
      if (event.target.matches('button[data-done]')) {
        calls++;
        event.target.setAttribute('data-done', '1');
        event.target.textContent = 'ביטול השלמה';
      }
    });
    s.d.querySelector('.bb-library-heading button').click();
    assert.equal(s.d.querySelector('.bb-completion').open, true);
    assert.equal(s.d.activeElement.tagName, 'SUMMARY');
    panel.querySelector('button').click();
    await tick();
    assert.equal(calls, 1);
    assert.equal(panel.querySelector('[data-item-id="2"] button'), null);
    s.ui.querySelector('button').click();
    assert.equal(panel.parentElement, s.whole);
    assert.equal(panel.querySelector('button').getAttribute('data-done'), '1');
    assert.equal(panel.querySelector('button').textContent, 'ביטול השלמה');
  } finally { s.w.close(); }
});

test('progress follows native updates and replacement children, without inventing invalid values', async () => {
  const s = await setup();
  try {
    const bar = s.d.querySelector('[role="progressbar"]');
    assert.equal(bar.querySelector('.bb-progress-value').textContent, '70%');
    bar.setAttribute('aria-valuenow', '100');
    bar.innerHTML = '<div class="bp-notebook-resource-progress"><strong>100%</strong></div>';
    await tick();
    assert.equal(bar.querySelector('.bb-progress-value').textContent, '100%');
    assert.equal(bar.querySelectorAll('.bb-progress-value').length, 1);
    bar.setAttribute('aria-valuenow', 'unknown');
    await tick();
    assert.equal(bar.hasAttribute('data-bb-progress'), false);
    assert.equal(bar.querySelector('.bb-progress-value'), null);
    assert.equal(bar.style.getPropertyValue('--bb-progress'), '');
    bar.setAttribute('aria-valuenow', '42');
    await tick();
    s.ui.querySelector('button').click();
    assert.equal(bar.getAttribute('aria-valuenow'), '42');
    assert.equal(bar.innerHTML, '<div class="bp-notebook-resource-progress"><strong>100%</strong></div>');
    assert.equal(bar.getAttribute('style'), 'position: relative;');
  } finally { s.w.close(); }
});

test('handles missing trackers, unknown resource types, and late material updates', async () => {
  const s = await setup({ withTracker: false });
  try {
    assert.equal(s.d.querySelector('.bb-completion'), null);
    const main = s.d.querySelector('.main');
    main.insertAdjacentHTML('beforeend', card('audio', 'הקלטות נוספות'));
    const notebook = s.d.querySelector('.notebook.box');
    notebook.insertAdjacentHTML('beforeend', '<a href="/notebook/second/">עוד מחברת</a>');
    await tick();
    assert.equal(notebook.querySelector('.bb-resource-count').textContent, '2 פריטים');
    assert.equal(s.d.querySelector('.audio .bb-resource-count').textContent, 'פריט אחד');
    assert.equal(s.d.querySelector('.audio .bb-resource-caption'), null);
    main.insertAdjacentHTML('beforebegin', tracker);
    await tick();
    assert.ok(s.d.querySelector('.bb-completion #bp-resource-completion'));
    s.ui.querySelector('button').click();
    assert.equal(s.d.querySelectorAll('.bb-resource-count').length, 0);
    assert.ok(s.d.querySelector('.audio a'));
    assert.equal(s.d.querySelector('#bp-resource-completion').nextElementSibling, main);
  } finally { s.w.close(); }
});

test('shares preferences, respects disabled startup and prevents duplicate injection', async () => {
  const s = await setup({ enabled: false });
  try {
    assert.equal(s.whole.innerHTML, s.html);
    s.ui.querySelector('button').click();
    await tick();
    assert.equal(s.settings.biobetter.fontSize, 23);
    assert.equal(s.settings.biobetter.enabled, true);
    s.w.eval(script);
    assert.equal(s.d.querySelectorAll('#biobetter-ui').length, 1);
    s.listeners[0]({ biobetter: { newValue: { enabled: false } } }, 'local');
    assert.equal(s.whole.innerHTML, s.html);
  } finally { s.w.close(); }
});

test('keeps a site-replaced completion panel and never resurrects a removed panel', async () => {
  const s = await setup();
  try {
    s.d.querySelector('#bp-resource-completion').outerHTML = tracker.replace('טרם הושלם', 'הושלם');
    await tick();
    const replacement = s.d.querySelector('#bp-resource-completion');
    s.ui.querySelector('button').click();
    assert.equal(replacement.parentElement, s.whole);
    assert.equal(replacement.querySelector('.bp-resource-state').textContent, 'הושלם');
    s.ui.querySelector('button').click();
    replacement.remove();
    await tick();
    assert.equal(s.d.querySelector('.bb-completion'), null);
    s.ui.querySelector('button').click();
    assert.equal(s.d.querySelector('#bp-resource-completion'), null);
  } finally { s.w.close(); }
});

test('does not modify unfamiliar or unauthenticated page structures', () => {
  const dom = new JSDOM('<body class="single-subsubject"><h1>Login</h1></body>', { runScripts: 'outside-only' });
  try {
    const before = dom.window.document.documentElement.outerHTML;
    dom.window.eval(script);
    assert.equal(dom.window.document.documentElement.outerHTML, before);
  } finally { dom.window.close(); }
});
