'use strict';
const toggle = document.getElementById('enabled');
const size = document.getElementById('size');
const status = document.getElementById('status');
async function load() {
  try {
    const { biobetter } = await chrome.storage.local.get('biobetter');
    toggle.checked = biobetter?.enabled !== false;
    size.value = String(Math.max(16, Math.min(24, Number(biobetter?.fontSize) || 18)));
  } catch { status.textContent = 'Unable to read settings. Reopen BioBetter to retry.'; }
}
async function save() {
  try {
    await chrome.storage.local.set({ biobetter: { enabled: toggle.checked, fontSize: Number(size.value) } });
    status.textContent = 'Settings saved.';
  } catch { status.textContent = 'Could not save settings. Please retry.'; }
}
toggle.addEventListener('change', save);
size.addEventListener('change', save);
load();
