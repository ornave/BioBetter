/* Only explicit notation is converted. Missing fractions are not reconstructed. */
(() => {
  const ambiguous = new Set([
    'Ka=[PL]P[L]=kakd', 'KaL=[PL][P]', 'Y=[PL]PL+[P]',
    'Y=KaLPKaL+P/:[P]', 'Y=KaLKaL+1/:Ka', 'Y=[L]L+1Ka',
    'Y=[L]L+Kd', 'Y=pO2pO2+P50', 'Kd=[L]0.5n'
  ]);
  function explicitTex(text) {
    for (const [open, close] of [['$$', '$$'], ['\\[', '\\]'], ['\\(', '\\)']]) {
      if (text.startsWith(open) && text.endsWith(close)) return text.slice(open.length, -close.length);
    }
    return null;
  }
  function classify(element) {
    const text = element.textContent.trim();
    if (!text || text.length > 1000 || element.querySelector('img, a, button, input, textarea, math, .katex, [contenteditable], mark, [class*="highlight"], [class*="annotation"]')) return null;
    const tex = explicitTex(text);
    if (tex !== null) return { tex };
    if (ambiguous.has(text.replace(/\s/g, ''))) return { ambiguous: true };
    // A conservative alphabet and explicit operators; never parse prose or invent division.
    if (text.length > 180 || !/[=⇄⇌↔]/.test(text) || !/^[A-Za-z0-9\s+−–\-=⇄⇌↔()[\].,]+$/.test(text)) return null;
    if ([...element.querySelectorAll('*')].some(e => !['SPAN', 'B', 'I', 'STRONG', 'EM', 'SUB', 'SUP'].includes(e.tagName))) return null;
    function visit(node) {
      if (node.nodeType === Node.TEXT_NODE) return node.data.replace(/⇄|⇌/g, '\\rightleftharpoons ').replace(/↔/g, '\\leftrightarrow ').replace(/[−–]/g, '-');
      const value = [...node.childNodes].map(visit).join('');
      return node.nodeName === 'SUB' ? `_{${value}}` : node.nodeName === 'SUP' ? `^{${value}}` : value;
    }
    return { tex: visit(element) };
  }
  globalThis.BioBetterMath = { classify };
})();
