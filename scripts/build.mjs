import { cp, mkdir, readFile } from 'node:fs/promises';
await mkdir('extension/vendor', { recursive: true });
await cp('node_modules/katex/dist/katex.min.js', 'extension/vendor/katex.min.js');
await cp('node_modules/katex/LICENSE', 'extension/vendor/KATEX-LICENSE.txt');
const manifest = JSON.parse(await readFile('extension/manifest.json', 'utf8'));
for (const file of [...manifest.content_scripts.flatMap(script => [...script.js, ...script.css]), manifest.action.default_popup]) {
  await readFile(`extension/${file}`);
}
console.log('BioBetter is ready. Load the extension/ folder in chrome://extensions.');
