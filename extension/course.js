(() => {
  'use strict';
  const grid = document.querySelector('body.single-course .main > .courseSubjects');
  if (!grid || !grid.querySelector('.subject.item') || document.getElementById('biobetter-ui')) return;
  const main = grid.parentElement;
  const root = document.documentElement;
  const storage = globalThis.chrome?.storage?.local;
  let settings = { enabled: true, fontSize: 18 };
  let active = false;
  const notes = new Map();
  const progress = new Map();
  const heading = document.createElement('div');
  heading.className = 'bb-course-heading';
  heading.innerHTML = '<h2>נושאי הקורס</h2><span></span>';
  const host = document.createElement('div');
  host.id = 'biobetter-ui';
  const ui = host.attachShadow({ mode: 'open' });
  ui.innerHTML = `<style>
    :host{all:initial;position:fixed;inset:0 0 auto;z-index:90000;font-family:"Assistant",sans-serif;color:#1d3d66;direction:ltr}
    *{box-sizing:border-box}.bar{height:64px;display:flex;align-items:center;gap:20px;padding:0 30px;background:#fcfdff;border-bottom:1px solid #d9e3f0}
    .brand{display:flex;align-items:center;gap:10px;font-size:20px;font-weight:700;letter-spacing:-.7px}.brand svg{width:28px;height:28px}.brand span{font-weight:400;color:#6b82a1}
    .hint{font-size:11px;letter-spacing:1.4px;color:#6b82a1;border-left:1px solid #d9e3f0;padding-left:20px}
    button{margin-left:auto;display:flex;align-items:center;gap:10px;border:0;border-radius:8px;padding:10px 14px;background:#e7f0ff;color:#21528e;font:600 13px "Assistant",sans-serif;cursor:pointer}
    button:focus-visible{outline:3px solid #78a9f2;outline-offset:3px}.track{width:29px;height:17px;border-radius:12px;background:#3975cd;padding:3px}.track:after{content:'';display:block;width:11px;height:11px;border-radius:50%;background:white;margin-left:12px}
    button[aria-checked=false] .track{background:#8695aa}button[aria-checked=false] .track:after{margin-left:0}
    .bar.off{position:fixed;top:12px;left:16px;right:auto;height:48px;padding:6px 10px;border:1px solid #d9e3f0;border-radius:12px}.off .hint{display:none}.off .brand{font-size:16px}
    @media(max-width:700px){.bar{padding:0 16px;gap:10px}.hint{display:none}.brand{font-size:18px}}
    @media print{:host{display:none}}
  </style><div class="bar" role="region" aria-label="BioBetter course controls">
    <div class="brand"><svg viewBox="0 0 32 32" fill="none" aria-hidden="true"><rect width="32" height="32" rx="10" fill="#e2edff"/><path d="M9 23C9 12 16 7 24 8c1 9-4 16-15 15Z" stroke="#356ab3" stroke-width="1.7"/><path d="m8 25 12-13M13 19v-5m0 5h5" stroke="#356ab3" stroke-width="1.7" stroke-linecap="round"/></svg><div>Bio<span>Better</span></div></div>
    <span class="hint">ROOM TO LEARN</span><button type="button" role="switch" aria-label="BioBetter" aria-checked="true"><span>תצוגה משופרת</span><span class="track" aria-hidden="true"></span></button>
  </div>`;
  document.body.append(host);

  function isNotes(card) {
    return [...card.querySelectorAll('a[href]')].some(link => {
      try {
        const url = new URL(link.href, location.href);
        return url.origin === location.origin && /^\/my-study-notebook\/?$/.test(url.pathname);
      } catch { return false; }
    });
  }
  function sync() {
    if (!active) return;
    for (const card of grid.querySelectorAll(':scope > .subject.item')) {
      if (!isNotes(card)) continue;
      if (!notes.has(card)) {
        const marker = document.createComment('BioBetter personal notebook original position');
        notes.set(card, { marker, attribute: card.getAttribute('data-bb-personal-notes') });
        card.before(marker);
      }
      card.setAttribute('data-bb-personal-notes', '');
      grid.before(card);
    }
    if (heading.nextSibling !== grid) grid.before(heading);
    const count = grid.querySelectorAll(':scope > .subject.item').length;
    const label = `${count} נושאי לימוד`;
    if (heading.querySelector('span').textContent !== label) heading.querySelector('span').textContent = label;
    for (const bar of grid.querySelectorAll('.progress-container')) {
      const raw = bar.getAttribute('aria-valuenow') ?? bar.getAttribute('data-progress');
      const value = raw === null || raw.trim() === '' ? NaN : Number(raw);
      if (!Number.isFinite(value) || value < 0 || value > 100) {
        restoreProgress(bar);
        continue;
      }
      if (!progress.has(bar)) progress.set(bar, {
        value: bar.style.getPropertyValue('--bb-course-progress'),
        priority: bar.style.getPropertyPriority('--bb-course-progress'),
        hadStyle: bar.hasAttribute('style'), attribute: bar.getAttribute('data-bb-progress')
      });
      bar.setAttribute('data-bb-progress', '');
      bar.style.setProperty('--bb-course-progress', `${value}%`);
    }
  }
  function restoreProgress(bar) {
    const original = progress.get(bar);
    if (!original) return;
    if (original.value) bar.style.setProperty('--bb-course-progress', original.value, original.priority);
    else bar.style.removeProperty('--bb-course-progress');
    if (!original.hadStyle && !bar.getAttribute('style')) bar.removeAttribute('style');
    if (original.attribute === null) bar.removeAttribute('data-bb-progress');
    else bar.setAttribute('data-bb-progress', original.attribute);
    progress.delete(bar);
  }
  function restore() {
    heading.remove();
    for (const [card, original] of notes) {
      // Do not resurrect content if the site itself removed the card.
      if (card.isConnected && original.marker.isConnected) original.marker.replaceWith(card);
      else original.marker.remove();
      if (original.attribute === null) card.removeAttribute('data-bb-personal-notes');
      else card.setAttribute('data-bb-personal-notes', original.attribute);
    }
    notes.clear();
    for (const bar of progress.keys()) restoreProgress(bar);
  }
  function apply() {
    active = settings.enabled !== false;
    if (active) { root.setAttribute('data-biobetter-course-page', 'on'); sync(); }
    else { root.removeAttribute('data-biobetter-course-page'); restore(); }
    ui.querySelector('button').setAttribute('aria-checked', String(active));
    ui.querySelector('.bar').classList.toggle('off', !active);
  }
  ui.querySelector('button').addEventListener('click', async () => {
    settings = { ...settings, enabled: !active };
    apply();
    try { await storage?.set({ biobetter: settings }); } catch { /* Toggle still works in the current page. */ }
  });
  globalThis.chrome?.storage?.onChanged?.addListener((changes, area) => {
    if (area !== 'local' || !changes.biobetter) return;
    settings = { enabled: true, fontSize: 18, ...changes.biobetter.newValue };
    apply();
  });
  // Native progress scripts remain authoritative, including late loads/updates.
  const observer = new MutationObserver(sync);
  observer.observe(main, { childList: true, subtree: true, attributes: true, attributeFilter: ['aria-valuenow', 'data-progress'] });
  (async () => {
    try { settings = { ...settings, ...(await storage?.get('biobetter'))?.biobetter }; } catch { /* Use defaults. */ }
    apply();
  })();
})();
