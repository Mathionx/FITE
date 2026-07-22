/* ==========================================================================
   FITE — notes.js
   ========================================================================== */

let currentDate = new Date().toISOString().slice(0,10);
let saveTimer = null;

function fmtHeading(dateStr){
  const today = new Date().toISOString().slice(0,10);
  const d = new Date(dateStr+'T00:00:00');
  const label = d.toLocaleDateString(undefined,{weekday:'long', month:'long', day:'numeric'});
  return dateStr === today ? `Today · ${label}` : label;
}

async function loadNote(date){
  const row = await FiteDB.get('notes', date);
  const editor = document.getElementById('noteEditor');
  editor.innerHTML = row ? row.html : '';
  document.getElementById('noteDateHeading').textContent = fmtHeading(date);
  document.getElementById('saveIndicator').textContent = 'Saved';
}

function scheduleSave(){
  document.getElementById('saveIndicator').textContent = 'Saving…';
  clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    const html = document.getElementById('noteEditor').innerHTML;
    await FiteDB.put('notes', currentDate, { date: currentDate, html });
    document.getElementById('saveIndicator').textContent = 'Saved';
  }, 500);
}

function initEditor(){
  const editor = document.getElementById('noteEditor');
  editor.addEventListener('input', scheduleSave);
  document.getElementById('boldBtn').addEventListener('click', () => { document.execCommand('bold'); editor.focus(); scheduleSave(); });
  document.getElementById('italicBtn').addEventListener('click', () => { document.execCommand('italic'); editor.focus(); scheduleSave(); });
  document.getElementById('listBtn').addEventListener('click', () => { document.execCommand('insertUnorderedList'); editor.focus(); scheduleSave(); });
}

async function initCalendar(){
  document.getElementById('calendarBtn').addEventListener('click', async () => {
    document.getElementById('dateInput').value = currentDate;
    const rows = await FiteDB.getAll('notes');
    const withContent = rows.filter(r => r.value.html && r.value.html.replace(/<[^>]+>/g,'').trim().length)
      .sort((a,b)=> b.key.localeCompare(a.key)).slice(0,10);
    const holder = document.getElementById('notesWithContent');
    holder.innerHTML = withContent.length
      ? '<div class="card-sub mt8">Recent entries</div>' + withContent.map(r => {
          const d = new Date(r.key+'T00:00:00');
          return `<div class="notes-with-item" data-date="${r.key}"><span>${d.toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'})}</span><span>›</span></div>`;
        }).join('')
      : '';
    holder.querySelectorAll('.notes-with-item').forEach(item => {
      item.addEventListener('click', () => {
        document.getElementById('dateInput').value = item.dataset.date;
      });
    });
    document.getElementById('calendarSheet').classList.add('open');
  });
  document.getElementById('goDateBtn').addEventListener('click', async () => {
    const date = document.getElementById('dateInput').value;
    if (!date) return;
    currentDate = date;
    await loadNote(currentDate);
    document.getElementById('calendarSheet').classList.remove('open');
  });
}

function initSettings(){
  document.getElementById('settingsBtn').addEventListener('click', () => {
    document.getElementById('settingsSheet').classList.add('open');
  });
  document.getElementById('bgUploadInput').addEventListener('change', async (e) => {
    const file = e.target.files[0]; if (!file) return;
    const b64 = await new Promise(res=>{ const r=new FileReader(); r.onload=()=>res(r.result); r.readAsDataURL(file); });
    const s = FiteApp.getSettings();
    await FiteApp.saveSettings({ wallpapers: { ...s.wallpapers, notes: b64 } });
    FiteApp.applyPageBackground('notes', document.getElementById('pageBg'));
    FiteApp.toast('Background updated');
  });
  document.getElementById('bgResetBtn').addEventListener('click', async () => {
    const s = FiteApp.getSettings();
    const wallpapers = { ...s.wallpapers }; delete wallpapers.notes;
    await FiteApp.saveSettings({ wallpapers });
    document.getElementById('pageBg').style.backgroundImage = '';
    FiteApp.toast('Background reset');
  });
}

function initSheetCloses(){
  document.querySelectorAll('.overlay').forEach(sheet => {
    sheet.addEventListener('click', (e) => { if (e.target === sheet) sheet.classList.remove('open'); });
  });
}

(async function start(){
  document.getElementById('calendarBtn').innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>`;
  document.getElementById('settingsBtn').innerHTML = FiteApp.icon('gear', 20);
  await FiteApp.init('notes');
  FiteApp.applyPageBackground('notes', document.getElementById('pageBg'));
  initEditor();
  await initCalendar();
  initSettings();
  initSheetCloses();
  await loadNote(currentDate);
})();
