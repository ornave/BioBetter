(() => {
  'use strict';
  const main = document.querySelector('body.single-subsubject .whole > .main');
  if (!main || !main.querySelector('.box.items') || document.getElementById('biobetter-ui')) return;
  const whole = main.parentElement;
  const root = document.documentElement;
  const storage = globalThis.chrome?.storage?.local;
  let settings = { enabled: true, fontSize: 18 };
  let active = false;
  const additions = new Set();
  const attributes = new Map();
  const counters = new Map();
  const bars = new Map();
  let disclosure = null;
  let tracker = null;
  let marker = null;
  const types = {
    presentation: ['מצגות', 'לעיון בחומרי השיעור'],
    recording: ['שיעורים מוקלטים', 'לחזרה על השיעור בקצב שלכם'],
    notebook: ['מחברות למידה', 'לקריאה, העמקה וכתיבת הערות'],
    'system-quiz': ['שאלונים', 'לתרגול ולבדיקת ההבנה'],
    video: ['סרטונים', 'להסברים ולהמחשה'],
    flashcard: ['כרטיסיות', 'לחזרה פעילה ולשינון']
  };
  function add(node) { additions.add(node); return node; }
  function attribute(node, name, value) {
    if (!attributes.has(node)) attributes.set(node, new Map());
    const saved = attributes.get(node);
    if (!saved.has(name)) saved.set(name, node.getAttribute(name));
    if (node.getAttribute(name) !== value) node.setAttribute(name, value);
  }
  function text(node, value) { if (node.textContent !== value) node.textContent = value; }
  const host = document.createElement('div');
  host.id = 'biobetter-ui';
  const ui = host.attachShadow({ mode: 'open' });
  ui.innerHTML = `<style>
    :host{all:initial;position:fixed;inset:0 0 auto;z-index:90000;font-family:Arial,sans-serif;color:#1d3d66;direction:ltr}
    *{box-sizing:border-box}.bar{height:64px;display:flex;align-items:center;gap:20px;padding:0 30px;background:#fcfdff;border-bottom:1px solid #d9e3f0}
    .brand{display:flex;align-items:center;gap:10px;font-size:20px;font-weight:700;letter-spacing:-.7px}.brand svg{width:28px;height:28px}.brand span{font-weight:400;color:#6b82a1}
    .hint{font-size:11px;letter-spacing:1.4px;color:#6b82a1;border-left:1px solid #d9e3f0;padding-left:20px}
    button{margin-left:auto;display:flex;align-items:center;gap:10px;border:0;border-radius:8px;padding:10px 14px;background:#e7f0ff;color:#21528e;font:600 13px Arial,sans-serif;cursor:pointer}
    button:focus-visible{outline:3px solid #78a9f2;outline-offset:3px}.track{width:29px;height:17px;border-radius:12px;background:#3975cd;padding:3px}.track:after{content:'';display:block;width:11px;height:11px;border-radius:50%;background:white;margin-left:12px}
    button[aria-checked=false] .track{background:#8695aa}button[aria-checked=false] .track:after{margin-left:0}
    .bar.off{position:fixed;top:12px;left:16px;right:auto;height:48px;padding:6px 10px;border:1px solid #d9e3f0;border-radius:12px}.off .hint{display:none}.off .brand{font-size:16px}
    @media(max-width:700px){.bar{padding:0 16px;gap:10px}.hint{display:none}.brand{font-size:18px}}
    @media print{:host{display:none}}
  </style><div class="bar" role="region" aria-label="BioBetter study controls">
    <div class="brand"><svg viewBox="0 0 32 32" fill="none" aria-hidden="true"><rect width="32" height="32" rx="10" fill="#e2edff"/><path d="M9 23C9 12 16 7 24 8c1 9-4 16-15 15Z" stroke="#356ab3" stroke-width="1.7"/><path d="m8 25 12-13M13 19v-5m0 5h5" stroke="#356ab3" stroke-width="1.7" stroke-linecap="round"/></svg><div>Bio<span>Better</span></div></div>
    <span class="hint">ROOM TO LEARN</span><button type="button" role="switch" aria-label="BioBetter" aria-checked="true"><span>תצוגה משופרת</span><span class="track" aria-hidden="true"></span></button>
  </div>`;
  document.body.append(host);

  function sync() {
    if (!active) return;
    for (const card of main.querySelectorAll(':scope > .box.items')) {
      const type = Object.keys(types).find(type => card.classList.contains(type));
      const title = card.querySelector(':scope > h3');
      if (!title) continue;
      if (!counters.has(card)) {
        const count = add(document.createElement('span'));
        count.className = 'bb-resource-count';
        title.append(count);
        counters.set(card, count);
        if (type) {
          const caption = add(document.createElement('p'));
          caption.className = 'bb-resource-caption';
          caption.textContent = types[type][1];
          title.after(caption);
        }
      }
      const count = card.querySelectorAll(':scope > a[href]').length;
      text(counters.get(card), type === 'flashcard'
        ? (count === 1 ? 'קישור לתרגול' : `${count} קישורי תרגול`)
        : (count === 1 ? 'פריט אחד' : `${count} פריטים`));
    }
    for (const select of main.querySelectorAll('.checkList select')) {
      const type = Object.keys(types).find(type => select.classList.contains(type));
      if (type && !select.hasAttribute('aria-label')) attribute(select, 'aria-label', types[type][0]);
    }
    for (const bar of main.querySelectorAll('.checkList .progress-container')) {
      const raw = bar.getAttribute('aria-valuenow') ?? bar.getAttribute('data-progress');
      const value = raw === null || raw.trim() === '' ? NaN : Number(raw);
      if (!Number.isFinite(value) || value < 0 || value > 100) {
        clearBar(bar);
        continue;
      }
      if (!bars.has(bar)) {
        const label = document.createElement('span');
        label.className = 'bb-progress-value';
        label.setAttribute('aria-hidden', 'true');
        bars.set(bar, {
          label, style: bar.style.getPropertyValue('--bb-progress'),
          priority: bar.style.getPropertyPriority('--bb-progress'), hadStyle: bar.hasAttribute('style'),
          attribute: bar.getAttribute('data-bb-progress')
        });
      }
      const { label } = bars.get(bar);
      if (label.parentNode !== bar) bar.append(label);
      text(label, `${value}%`);
      if (bar.getAttribute('data-bb-progress') !== '') bar.setAttribute('data-bb-progress', '');
      if (bar.style.getPropertyValue('--bb-progress') !== `${value}%`) bar.style.setProperty('--bb-progress', `${value}%`);
    }
    const nextTracker = whole.querySelector('#bp-resource-completion');
    // A site refresh can replace the section inside our disclosure. Keep the
    // original position marker so the replacement is restored, never discarded.
    if (nextTracker && nextTracker !== tracker && disclosure?.contains(nextTracker)) tracker = nextTracker;
    if (!nextTracker && tracker) restoreTracker();
    if (nextTracker && nextTracker !== tracker) {
      restoreTracker();
      tracker = nextTracker;
      marker = document.createComment('BioBetter completion panel original position');
      tracker.before(marker);
      disclosure = document.createElement('details');
      disclosure.className = 'bb-completion';
      const summary = document.createElement('summary');
      summary.textContent = 'מעקב והשלמת חומרי הלמידה';
      disclosure.append(summary);
      main.after(disclosure);
      disclosure.append(tracker);
    }
  }
  function clearBar(bar) {
    const saved = bars.get(bar);
    if (!saved) return;
    saved.label.remove();
    if (saved.style) bar.style.setProperty('--bb-progress', saved.style, saved.priority);
    else bar.style.removeProperty('--bb-progress');
    if (!saved.hadStyle && !bar.getAttribute('style')) bar.removeAttribute('style');
    if (saved.attribute === null) bar.removeAttribute('data-bb-progress');
    else bar.setAttribute('data-bb-progress', saved.attribute);
    bars.delete(bar);
  }
  function restoreTracker() {
    if (tracker?.isConnected && marker?.isConnected) marker.replaceWith(tracker);
    else marker?.remove();
    disclosure?.remove();
    tracker = disclosure = marker = null;
  }
  function restore() {
    restoreTracker();
    for (const node of additions) node.remove();
    additions.clear(); counters.clear();
    for (const [node, saved] of attributes) {
      for (const [name, value] of saved) {
        if (value === null) node.removeAttribute(name);
        else node.setAttribute(name, value);
      }
    }
    attributes.clear();
    for (const bar of bars.keys()) clearBar(bar);
  }
  function enhance() {
    const checklist = main.querySelector('.checkList');
    const heading = add(document.createElement('div'));
    heading.className = 'bb-library-heading';
    heading.innerHTML = '<div><span>מרחב הלמידה</span><h2>חומרי הלמידה שלכם</h2></div>';
    if (checklist) {
      const label = add(document.createElement('h2'));
      label.className = 'bb-progress-heading';
      label.textContent = 'ההתקדמות שלכם';
      checklist.prepend(label);
      checklist.after(heading);
    } else main.prepend(heading);
    if (whole.querySelector('#bp-resource-completion')) {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = 'ניהול השלמות ←';
      button.addEventListener('click', () => {
        if (!disclosure) return;
        disclosure.open = true;
        disclosure.querySelector('summary').focus();
        disclosure.scrollIntoView({ block: 'start', behavior: 'auto' });
      });
      heading.append(button);
    }
  }
  function apply() {
    const enabled = settings.enabled !== false;
    if (enabled && !active) { active = true; root.setAttribute('data-biobetter-subsubject', 'on'); enhance(); sync(); }
    else if (!enabled && active) { active = false; root.removeAttribute('data-biobetter-subsubject'); restore(); }
    ui.querySelector('button').setAttribute('aria-checked', String(enabled));
    ui.querySelector('.bar').classList.toggle('off', !enabled);
  }
  ui.querySelector('button').addEventListener('click', async () => {
    settings = { ...settings, enabled: !active };
    apply();
    try { await storage?.set({ biobetter: settings }); } catch { /* Current-page toggle remains available. */ }
  });
  globalThis.chrome?.storage?.onChanged?.addListener((changes, area) => {
    if (area !== 'local' || !changes.biobetter) return;
    settings = { enabled: true, fontSize: 18, ...changes.biobetter.newValue };
    apply();
  });
  // Observe source updates, not the style/attributes written by BioBetter.
  const observer = new MutationObserver(sync);
  observer.observe(whole, { childList: true, subtree: true, characterData: true, attributes: true,
    attributeFilter: ['aria-valuenow', 'data-progress'] });
  (async () => {
    try { settings = { ...settings, ...(await storage?.get('biobetter'))?.biobetter }; } catch { /* Use defaults. */ }
    apply();
  })();
})();
