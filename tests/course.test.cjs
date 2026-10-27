const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { JSDOM } = require('jsdom');

const card = (name, value) => `<div class="subject item" style="height:auto;"><a class="subjectTitle" href="/subject/${name}/"><h3>${name}</h3></a><a href="/subsubject/${name}/">Lesson link</a><br><div class="progress-container" role="progressbar" aria-valuenow="${value}" data-progress="${value}" style="position: relative;"><svg><path/></svg><div class="progressbar-text">${value}%</div></div></div>`;
const notes = '<div class="subject item" data-bppn-course-card="1"><a class="subjectTitle" href="/my-study-notebook/?course=240"><h3>המחברת האישית שלי</h3></a><p>My saved notes</p><a class="bp-bppn-open" href="/my-study-notebook/?course=240">פתיחת המחברת</a></div>';
const fixture = `<html dir="rtl"><body class="single-course"><div class="whole"><div class="main"><div class="bpsf-entry"><button>Files</button></div><h1 class="courseTitle">Course</h1><p></p><div class="courseSubjects">${notes}${card('Biochemistry',35)}${card('Physiology',0)}</div></div></div></body></html>`;
const tick = () => new Promise(resolve => setTimeout(resolve, 15));
async function setup({ enabled = true } = {}) {
  const dom = new JSDOM(fixture, { url: 'https://bioplus.co.il/course/test/', runScripts: 'outside-only' });
  const w = dom.window, d = w.document;
  const settings = { biobetter: { enabled, fontSize: 23 } };
  const listeners = [];
  w.chrome = { storage: { local: { get: async () => settings, set: async value => Object.assign(settings, value) }, onChanged: { addListener: fn => listeners.push(fn) } } };
  const main = d.querySelector('.main');
  const html = main.innerHTML;
  const nodes = [...main.querySelectorAll('*')];
  w.eval(readFileSync('extension/course.js', 'utf8'));
  await tick();
  return { dom, w, d, main, html, nodes, settings, listeners, ui: d.querySelector('#biobetter-ui').shadowRoot };
}

test('separates the actual notes link and preserves source nodes, URLs, values, and click handlers', async () => {
  const s = await setup();
  try {
    const note = s.d.querySelector('[data-bppn-course-card]');
    assert.equal(note.parentElement, s.main);
    assert.equal(s.d.querySelectorAll('.courseSubjects > .subject').length, 2);
    assert.equal(s.d.querySelector('.bb-course-heading span').textContent, '2 נושאי לימוד');
    assert.ok(s.nodes.every(node => node.isConnected));
    assert.equal(note.querySelector('a').getAttribute('href'), '/my-study-notebook/?course=240');
    assert.equal(s.d.querySelector('.progress-container').getAttribute('aria-valuenow'), '35');
    assert.equal(s.d.querySelector('.progress-container').style.getPropertyValue('--bb-course-progress'), '35%');
    let calls = 0;
    const link = note.querySelector('a');
    link.addEventListener('click', e => { e.preventDefault(); calls++; });
    for (let i = 0; i < 3; i++) {
      s.ui.querySelector('button').click();
      assert.equal(s.main.innerHTML, s.html);
      link.click();
      s.ui.querySelector('button').click();
      link.click();
    }
    assert.equal(calls, 6);
  } finally { s.dom.window.close(); }
});

test('tracks native progress changes and preserves them when disabled', async () => {
  const s = await setup();
  try {
    const bar = s.d.querySelector('.progress-container');
    bar.setAttribute('aria-valuenow', '62');
    bar.setAttribute('data-progress', '62');
    bar.querySelector('.progressbar-text').textContent = '62%';
    await tick();
    assert.equal(bar.style.getPropertyValue('--bb-course-progress'), '62%');
    s.ui.querySelector('button').click();
    assert.equal(bar.getAttribute('aria-valuenow'), '62');
    assert.equal(bar.querySelector('.progressbar-text').textContent, '62%');
    assert.equal(bar.hasAttribute('data-bb-progress'), false);
    assert.equal(bar.getAttribute('style'), 'position: relative;');
  } finally { s.dom.window.close(); }
});

test('handles late cards and unknown progress without inventing completion values', async () => {
  const s = await setup();
  try {
    const grid = s.d.querySelector('.courseSubjects');
    grid.insertAdjacentHTML('beforeend', card('New subject', 'unknown'));
    await tick();
    assert.equal(s.d.querySelector('.bb-course-heading span').textContent, '3 נושאי לימוד');
    const bar = grid.lastElementChild.querySelector('.progress-container');
    assert.equal(bar.hasAttribute('data-bb-progress'), false);
    bar.setAttribute('aria-valuenow', '100');
    await tick();
    assert.equal(bar.style.getPropertyValue('--bb-course-progress'), '100%');
    bar.setAttribute('aria-valuenow', '-1');
    await tick();
    assert.equal(bar.hasAttribute('data-bb-progress'), false);
    grid.insertAdjacentHTML('beforeend', notes);
    await tick();
    assert.equal(s.main.querySelectorAll(':scope > [data-bb-personal-notes]').length, 2);
    assert.equal(s.d.querySelector('.bb-course-heading span').textContent, '3 נושאי לימוד');
    s.ui.querySelector('button').click();
    assert.equal(grid.querySelectorAll('[data-bppn-course-card]').length, 2);
  } finally { s.dom.window.close(); }
});

test('shares the enable preference without resetting lesson text size', async () => {
  const s = await setup({ enabled: false });
  try {
    assert.equal(s.main.innerHTML, s.html);
    s.ui.querySelector('button').click();
    await tick();
    assert.equal(s.settings.biobetter.enabled, true);
    assert.equal(s.settings.biobetter.fontSize, 23);
    s.listeners[0]({ biobetter: { newValue: { enabled: false, fontSize: 20 } } }, 'local');
    assert.equal(s.main.innerHTML, s.html);
    s.w.eval(readFileSync('extension/course.js', 'utf8'));
    assert.equal(s.d.querySelectorAll('#biobetter-ui').length, 1);
  } finally { s.dom.window.close(); }
});
