(() => {
  'use strict';
  const lesson = document.querySelector('.main.notebook');
  const sections = [...(lesson?.querySelectorAll('.description, .brief') || [])];
  if (document.getElementById('biobetter-ui') || !sections.length) return;
  const lessonNodes = selector => sections.flatMap(section => [...section.querySelectorAll(selector)]);
  const root = document.documentElement;
  const storage = globalThis.chrome?.storage?.local;
  const defaults = { enabled: true, fontSize: 18 };
  let settings = { ...defaults };
  let active = false;
  let inkPaused = false;
  let frame;
  const mathCards = new Map();
  const host = document.createElement('div');
  host.id = 'biobetter-ui';
  const ui = host.attachShadow({ mode: 'open' });
  ui.innerHTML = `<style>
    :host{all:initial;position:fixed;top:0;left:0;right:0;z-index:90000;font-family:"Assistant",sans-serif;color:#1d3d66;direction:ltr}
    *{box-sizing:border-box} .bar{height:64px;display:flex;align-items:center;gap:18px;padding:0 30px;background:#fcfdff;border-bottom:1px solid #d9e3f0;box-shadow:0 2px 12px #173c6b08}
    .brand{display:flex;gap:10px;align-items:center;font-size:20px;letter-spacing:-.7px;font-weight:700;white-space:nowrap}.brand svg{width:28px;height:28px}.brand span{font-weight:400;color:#6b82a1}
    .divider{width:1px;height:24px;background:#d9e3f0}.hint{font-size:11px;letter-spacing:1.4px;color:#6b82a1}.tools{display:flex;align-items:center;gap:9px;margin-left:auto}
    button,select{font:13px "Assistant",sans-serif;border:1px solid #d3e0f1;border-radius:8px;background:#fff;color:#2b527f;padding:9px 12px;cursor:pointer;min-height:36px}
    button:hover,select:hover{background:#edf4ff}button:focus-visible,select:focus-visible,summary:focus-visible{outline:3px solid #78a9f2;outline-offset:3px}
    select{max-width:230px;direction:rtl} .size{display:flex;align-items:center;gap:7px}.size button{padding:8px}.size output{font-size:12px;color:#657d9c;min-width:18px;text-align:center}
    .toggle{display:flex;align-items:center;gap:9px;border:none;background:#e7f0ff;color:#21528e;font-weight:700;white-space:nowrap}.track{display:block;width:29px;height:17px;border-radius:12px;background:#3975cd;padding:3px}.track:after{content:'';display:block;width:11px;height:11px;border-radius:50%;background:#fff;margin-left:12px}.toggle[aria-checked=false] .track{background:#8695aa}.toggle[aria-checked=false] .track:after{margin-left:0}
    [hidden]{display:none!important}.status{font-size:12px;color:#716244;max-width:230px;direction:rtl}.bar.off{position:fixed;top:12px;left:16px;right:auto;width:auto;height:48px;padding:6px 10px;border:1px solid #d9e3f0;border-radius:12px}.off .brand{font-size:16px}.off .brand svg{width:22px;height:22px}.off .hint,.off .divider,.off .reader-tool{display:none}.off .tools{margin:0}
    .progress{position:absolute;bottom:0;left:0;height:2px;background:#5b91df;width:0;transition:width .15s}
    @media(max-width:800px){.bar{padding:0 12px;gap:10px}.hint,.divider,.size{display:none}select{max-width:130px}.brand{font-size:17px}.brand svg{width:23px;height:23px}.tools{gap:5px}button,select{padding:8px}.toggle .label{display:none}.status{max-width:130px;font-size:10px}}
    @media(max-width:440px){select{max-width:100px}.bar{gap:6px}.brand{font-size:15px}}
    @media(prefers-reduced-motion:reduce){.progress{transition:none}}
  </style>
  <div class="bar" role="region" aria-label="BioBetter reading controls">
    <div class="brand"><svg viewBox="0 0 32 32" fill="none" aria-hidden="true"><rect width="32" height="32" rx="10" fill="#e2edff"/><path d="M9 23C9 12 16 7 24 8c1 9-4 16-15 15Z" stroke="#356ab3" stroke-width="1.7"/><path d="m8 25 12-13M13 19v-5m0 5h5" stroke="#356ab3" stroke-width="1.7" stroke-linecap="round"/></svg><div>Bio<span>Better</span></div></div>
    <div class="divider"></div><span class="hint">ROOM TO LEARN</span>
    <div class="tools">
      <span class="status" role="status" hidden></span>
      <select class="reader-tool" aria-label="מעבר לפרק במחברת"><option value="">במחברת הזו</option></select>
      <button class="reader-tool course" aria-pressed="false">תוכן הקורס</button>
      <div class="size reader-tool"><button class="smaller" aria-label="הקטנת טקסט">A−</button><output>18</output><button class="larger" aria-label="הגדלת טקסט">A+</button></div>
      <button class="toggle" role="switch" aria-label="BioBetter" aria-checked="true"><span class="label">מצב קריאה</span><span class="track" aria-hidden="true"></span></button>
    </div><div class="progress" aria-hidden="true"></div>
  </div>`;
  document.body.append(host);
  const $ = selector => ui.querySelector(selector);

  function anchor() {
    const nodes = lessonNodes('p,h1,h2,h3,img');
    const node = nodes.find(e => { const r = e.getBoundingClientRect(); return r.height && r.bottom > 95 && r.top < innerHeight; });
    return node ? { node, top: node.getBoundingClientRect().top } : null;
  }
  function restoreAnchor(saved) {
    if (!saved?.node.isConnected) return;
    const delta = saved.node.getBoundingClientRect().top - saved.top;
    const whole = document.querySelector('.whole');
    if (!active && whole && /auto|scroll/.test(getComputedStyle(whole).overflowY)) whole.scrollTop += delta;
    else window.scrollBy(0, delta);
  }
  function addMath() {
    for (const paragraph of lessonNodes('p')) {
      if (mathCards.has(paragraph)) continue;
      const result = globalThis.BioBetterMath?.classify(paragraph);
      if (!result) continue;
      if (result.ambiguous) {
        paragraph.classList.add('bb-equation-source', 'bb-equation-ambiguous');
        mathCards.set(paragraph, null);
        continue;
      }
      if (!globalThis.katex) continue;
      const card = document.createElement('div');
      card.className = 'bb-math-host';
      // Shadow text is excluded from TreeWalker/textContent used by BioPlus annotations.
      const shadow = card.attachShadow({ mode: 'open' });
      const style = document.createElement('style');
      style.textContent = ':host{display:block;margin:18px 0 24px}section{border:1px solid #d9e3f0;background:#f2f6fd;border-radius:12px;padding:20px 16px;text-align:center;direction:ltr;overflow-x:auto}math{font-size:1.25em}button{display:block;margin:12px auto 0;border:0;background:transparent;color:#5878a0;font:11px "Assistant",sans-serif;cursor:pointer}button:focus-visible{outline:2px solid #3975cd}';
      const section = document.createElement('section');
      const equation = document.createElement('div');
      try {
        katex.render(result.tex, equation, { output: 'mathml', displayMode: true, throwOnError: true, trust: false, maxExpand: 200, maxSize: 15 });
      } catch { continue; } // Unsupported TeX remains verbatim.
      const source = document.createElement('button');
      source.type = 'button';
      source.textContent = 'הצגת המקור';
      source.setAttribute('aria-expanded', 'false');
      source.addEventListener('click', () => {
        const shown = paragraph.classList.toggle('bb-show-source');
        source.setAttribute('aria-expanded', String(shown));
        source.textContent = shown ? 'הסתרת המקור' : 'הצגת המקור';
      });
      section.append(equation, source);
      shadow.append(style, section);
      paragraph.after(card);
      paragraph.classList.add('bb-equation-source', 'bb-equation-rendered');
      mathCards.set(paragraph, card);
    }
  }
  function clearMath() {
    for (const [paragraph, card] of mathCards) {
      card?.remove();
      paragraph.classList.remove('bb-equation-source', 'bb-equation-ambiguous', 'bb-equation-rendered', 'bb-show-source');
      if (!paragraph.className) paragraph.removeAttribute('class');
    }
    mathCards.clear();
  }
  function chapters() {
    const headings = lessonNodes('h1,h2,h3').filter(e => !e.classList.contains('sectionTitle'));
    const select = $('select');
    select.replaceChildren(new Option('במחברת הזו', ''));
    headings.forEach((heading, index) => select.add(new Option(heading.textContent.trim(), String(index))));
    select.onchange = () => {
      if (select.value !== '') headings[Number(select.value)]?.scrollIntoView({ block: 'start', behavior: 'instant' });
    };
  }
  function progress() {
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = null;
      const r = lesson.getBoundingClientRect();
      const value = Math.max(0, Math.min(100, (90 - r.top) / Math.max(1, r.height - innerHeight + 90) * 100));
      $('.progress').style.width = active ? `${value}%` : '0';
    });
  }
  function apply() {
    const saved = anchor();
    // Freehand ink can use absolute page coordinates. Keep the site's original geometry
    // whenever saved strokes exist or drawing is active; never move or rewrite strokes.
    inkPaused = document.body.classList.contains('nb-inking') || lessonNodes('.nb-ink-surface path').length > 0;
    active = settings.enabled && !inkPaused;
    if (active) {
      root.setAttribute('data-biobetter', 'on');
      root.style.setProperty('--biobetter-font', `${settings.fontSize}px`);
      addMath();
    } else {
      root.removeAttribute('data-biobetter');
      root.removeAttribute('data-biobetter-course');
      root.style.removeProperty('--biobetter-font');
      clearMath();
    }
    $('.bar').classList.toggle('off', !active);
    $('.toggle').setAttribute('aria-checked', String(settings.enabled));
    $('.course').setAttribute('aria-pressed', String(root.hasAttribute('data-biobetter-course')));
    $('output').textContent = settings.fontSize;
    $('.smaller').disabled = settings.fontSize <= 16;
    $('.larger').disabled = settings.fontSize >= 24;
    $('.status').hidden = !(settings.enabled && inkPaused);
    $('.status').textContent = 'העיצוב המקורי נשמר כדי להגן על מיקום הכתיבה ביד';
    requestAnimationFrame(() => { restoreAnchor(saved); progress(); });
  }
  async function update(patch) {
    settings = { ...settings, ...patch };
    apply();
    try { await storage?.set({ biobetter: settings }); } catch { /* Current tab still works if storage is unavailable. */ }
  }
  $('.toggle').addEventListener('click', () => update({ enabled: !settings.enabled }));
  $('.smaller').addEventListener('click', () => update({ fontSize: Math.max(16, settings.fontSize - 1) }));
  $('.larger').addEventListener('click', () => update({ fontSize: Math.min(24, settings.fontSize + 1) }));
  $('.course').addEventListener('click', () => {
    const opened = root.toggleAttribute('data-biobetter-course');
    $('.course').setAttribute('aria-pressed', String(opened));
    if (opened) document.querySelector('.sidebar')?.scrollIntoView({ block: 'start', behavior: 'instant' });
  });
  function normalize(value) {
    return { enabled: typeof value?.enabled === 'boolean' ? value.enabled : true, fontSize: Math.max(16, Math.min(24, Number(value?.fontSize) || 18)) };
  }
  globalThis.chrome?.storage?.onChanged?.addListener((changes, area) => {
    if (area === 'local' && changes.biobetter) {
      const next = normalize(changes.biobetter.newValue);
      if (JSON.stringify(next) !== JSON.stringify(settings)) { settings = next; apply(); }
    }
  });
  let mutationTimer;
  const observer = new MutationObserver(records => {
    // Ignore our own cards and class changes; handle new content and annotation/ink updates.
    if (records.every(r => r.type === 'childList' && [...r.addedNodes, ...r.removedNodes].every(n => n.nodeType === 1 && n.classList.contains('bb-math-host')))) return;
    clearTimeout(mutationTimer);
    mutationTimer = setTimeout(() => {
      const paused = document.body.classList.contains('nb-inking') || lessonNodes('.nb-ink-surface path').length > 0;
      if (paused !== inkPaused) apply();
      else if (active) {
        // Rebuild from live source so edits/highlights cannot leave stale hidden equations.
        clearMath(); addMath(); chapters();
      }
    }, 120);
  });
  for (const section of sections) observer.observe(section, { childList: true, subtree: true, characterData: true });
  const bodyObserver = new MutationObserver(() => {
    const paused = document.body.classList.contains('nb-inking') || lessonNodes('.nb-ink-surface path').length > 0;
    if (paused !== inkPaused) apply();
  });
  bodyObserver.observe(document.body, { attributes: true, attributeFilter: ['class'] });
  window.addEventListener('scroll', progress, { passive: true });
  window.addEventListener('resize', progress, { passive: true });
  chapters();
  (async () => {
    try { settings = normalize((await storage?.get('biobetter'))?.biobetter); } catch { /* Use defaults. */ }
    apply();
  })();
})();
