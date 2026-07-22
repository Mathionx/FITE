/* ==========================================================================
   FITE — gallery.js
   ========================================================================== */

let selecting = false;
let selectedIds = new Set();
let currentViewerId = null;
let pendingFiles = [];

function uid(){ return Date.now().toString(36) + Math.random().toString(36).slice(2,8); }

function fileToDataURL(file){
  return new Promise((resolve,reject)=>{
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

function fmtDayHeader(dateStr){
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString(undefined, { weekday:'long', year:'numeric', month:'long', day:'numeric' });
}

/* ---------------- Load & render ---------------- */
async function getAllMedia(){
  const rows = await FiteDB.getAll('gallery');
  return rows.map(r => r.value).sort((a,b) => b.date.localeCompare(a.date));
}

async function render(){
  const settings = FiteApp.getSettings();
  const items = await getAllMedia();
  const holder = document.getElementById('galleryContent');

  if (!items.length) {
    holder.innerHTML = `<div class="empty">
      <div class="t">No photos yet</div>
      <div class="s">Tap the + button to add your first progress photo.</div>
    </div>`;
    updateStorageLabel();
    return;
  }

  if (settings.galleryGrouped) {
    const groups = {};
    items.forEach(it => {
      const key = it.folderDate || it.date.slice(0,10);
      groups[key] = groups[key] || [];
      groups[key].push(it);
    });
    const keys = Object.keys(groups).sort().reverse();
    holder.innerHTML = keys.map(key => `
      <div class="day-group">
        <div class="day-header">${fmtDayHeader(key)}</div>
        <div class="media-grid">${keys.length ? groups[key].map(tileHTML).join('') : ''}</div>
      </div>`).join('');
  } else {
    holder.innerHTML = `<div class="media-grid">${items.map(tileHTML).join('')}</div>`;
  }

  bindTiles();
  updateStorageLabel();
}

function tileHTML(item){
  const media = item.type === 'video'
    ? `<video src="${item.data}" muted></video><div class="vid-badge">VIDEO</div>`
    : `<img src="${item.data}" alt="${item.name}">`;
  return `
    <div class="media-tile ${selecting?'selecting':''} ${selectedIds.has(item.id)?'selected':''}" data-id="${item.id}">
      ${media}
      <div class="sel-mark"><svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3"><path d="m5 13 4 4L19 7"/></svg></div>
    </div>`;
}

function bindTiles(){
  document.querySelectorAll('.media-tile').forEach(tile => {
    const id = tile.dataset.id;
    let pressTimer;
    let longPressed = false;
    tile.addEventListener('pointerdown', () => {
      longPressed = false;
      pressTimer = setTimeout(() => {
        longPressed = true;
        enterSelectMode(id);
      }, 500);
    });
    ['pointerup','pointerleave','pointercancel'].forEach(ev => tile.addEventListener(ev, () => clearTimeout(pressTimer)));
    tile.addEventListener('click', () => {
      if (longPressed) return;
      if (selecting) toggleSelect(id);
      else openViewer(id);
    });
  });
}

function enterSelectMode(id){
  selecting = true;
  selectedIds = new Set([id]);
  document.getElementById('selectBar').classList.remove('hidden');
  updateSelectBar();
  render();
}
function toggleSelect(id){
  if (selectedIds.has(id)) selectedIds.delete(id); else selectedIds.add(id);
  if (selectedIds.size === 0) exitSelectMode();
  else { updateSelectBar(); render(); }
}
function exitSelectMode(){
  selecting = false;
  selectedIds = new Set();
  document.getElementById('selectBar').classList.add('hidden');
  render();
}
function updateSelectBar(){
  document.getElementById('selectCount').textContent = `${selectedIds.size} selected`;
  document.getElementById('compareBtn').style.display = selectedIds.size === 2 ? 'inline-flex' : 'none';
}

async function updateStorageLabel(){
  if (navigator.storage && navigator.storage.estimate) {
    try {
      const { usage, quota } = await navigator.storage.estimate();
      const usedMB = (usage/1024/1024).toFixed(1);
      const quotaMB = (quota/1024/1024/1024).toFixed(1);
      document.getElementById('storageSub').textContent = `${usedMB} MB used`;
      if (quota && usage/quota > 0.85) {
        FiteApp.toast('Storage almost full — consider clearing old media');
      }
    } catch(e){}
  }
}

/* ---------------- Upload ---------------- */
function initUpload(){
  document.getElementById('uploadFab').innerHTML = FiteApp.icon('plus', 26);
  document.getElementById('uploadFab').addEventListener('click', () => document.getElementById('fileInput').click());
  document.getElementById('fileInput').addEventListener('change', async (e) => {
    pendingFiles = Array.from(e.target.files || []);
    if (!pendingFiles.length) return;
    const preview = document.getElementById('uploadPreview');
    const first = pendingFiles[0];
    const dataUrl = await fileToDataURL(first);
    preview.innerHTML = first.type.startsWith('video') ? `<video src="${dataUrl}" controls></video>` : `<img src="${dataUrl}">`;
    document.getElementById('uploadNote').value = '';
    document.getElementById('uploadSheet').classList.add('open');
  });
  document.getElementById('uploadSaveBtn').addEventListener('click', async () => {
    const note = document.getElementById('uploadNote').value.trim();
    const now = new Date();
    for (const file of pendingFiles) {
      const dataUrl = await fileToDataURL(file);
      const id = uid();
      await FiteDB.put('gallery', id, {
        id, type: file.type.startsWith('video') ? 'video' : 'image',
        data: dataUrl, name: file.name, note,
        date: now.toISOString(), folderDate: now.toISOString().slice(0,10)
      });
    }
    document.getElementById('uploadSheet').classList.remove('open');
    document.getElementById('fileInput').value = '';
    FiteApp.toast(`Added ${pendingFiles.length} item(s)`);
    pendingFiles = [];
    render();
  });
}

/* ---------------- Viewer ---------------- */
async function openViewer(id){
  const row = await FiteDB.get('gallery', id);
  if (!row) return;
  currentViewerId = id;
  const media = document.getElementById('viewerMedia');
  media.innerHTML = row.type === 'video' ? `<video src="${row.data}" controls></video>` : `<img src="${row.data}">`;
  document.getElementById('viewerNote').textContent = row.note || 'No note added.';
  document.getElementById('viewerSheet').classList.add('open');
}
function initViewer(){
  document.getElementById('viewerCloseBtn').addEventListener('click', () => document.getElementById('viewerSheet').classList.remove('open'));
  document.getElementById('viewerDeleteBtn').addEventListener('click', async () => {
    await trashItem(currentViewerId);
    document.getElementById('viewerSheet').classList.remove('open');
    render();
  });
  document.getElementById('viewerInfoBtn').addEventListener('click', async () => {
    const row = await FiteDB.get('gallery', currentViewerId);
    document.getElementById('infoName').value = row.name || '';
    document.getElementById('infoNote').value = row.note || '';
    document.getElementById('infoMeta').textContent = `Added ${new Date(row.date).toLocaleString()}`;
    document.getElementById('infoSheet').classList.add('open');
  });
}

/* ---------------- Info ---------------- */
function initInfo(){
  document.getElementById('infoSaveBtn').addEventListener('click', async () => {
    const row = await FiteDB.get('gallery', currentViewerId);
    if (!row) return;
    row.name = document.getElementById('infoName').value.trim() || row.name;
    row.note = document.getElementById('infoNote').value.trim();
    await FiteDB.put('gallery', row.id, row);
    document.getElementById('infoSheet').classList.remove('open');
    document.getElementById('viewerNote').textContent = row.note || 'No note added.';
    FiteApp.toast('Saved');
    render();
  });
}

/* ---------------- Trash ---------------- */
async function trashItem(id){
  const row = await FiteDB.get('gallery', id);
  if (!row) return;
  row.deletedAt = new Date().toISOString();
  await FiteDB.put('galleryTrash', id, row);
  await FiteDB.del('gallery', id);
  FiteApp.toast('Moved to trash');
}

async function openTrash(){
  await purgeOldTrash();
  const rows = await FiteDB.getAll('galleryTrash');
  const list = document.getElementById('trashList');
  const s = FiteApp.getSettings();
  document.getElementById('trashNote').textContent = `Items are permanently removed after ${s.galleryTrashDays} days.`;
  if (!rows.length) {
    list.innerHTML = `<div class="empty"><div class="t">Trash is empty</div></div>`;
  } else {
    list.innerHTML = rows.map(r => {
      const it = r.value;
      const media = it.type === 'video' ? `<video src="${it.data}" muted></video>` : `<img src="${it.data}">`;
      return `<div class="trash-item" data-id="${it.id}">
        ${media}
        <div class="ti-name">${it.name}<div class="ti-date">Deleted ${new Date(it.deletedAt).toLocaleDateString()}</div></div>
        <button class="btn btn-secondary btn-sm restore-btn">Restore</button>
      </div>`;
    }).join('');
    list.querySelectorAll('.restore-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.closest('.trash-item').dataset.id;
        const row = await FiteDB.get('galleryTrash', id);
        delete row.deletedAt;
        await FiteDB.put('gallery', id, row);
        await FiteDB.del('galleryTrash', id);
        FiteApp.toast('Restored');
        openTrash();
        render();
      });
    });
  }
  document.getElementById('trashSheet').classList.add('open');
}

async function purgeOldTrash(){
  const s = FiteApp.getSettings();
  const rows = await FiteDB.getAll('galleryTrash');
  const cutoff = Date.now() - (s.galleryTrashDays||30)*24*60*60*1000;
  for (const r of rows) {
    if (new Date(r.value.deletedAt).getTime() < cutoff) {
      await FiteDB.del('galleryTrash', r.key);
    }
  }
}

/* ---------------- Compare ---------------- */
function initCompare(){
  document.getElementById('compareBtn').addEventListener('click', async () => {
    const ids = [...selectedIds];
    const grid = document.getElementById('compareGrid');
    const items = await Promise.all(ids.map(id => FiteDB.get('gallery', id)));
    grid.innerHTML = items.map(it => it.type === 'video' ? `<video src="${it.data}" controls></video>` : `<img src="${it.data}">`).join('');
    document.getElementById('compareSheet').classList.add('open');
  });
  document.getElementById('compareCloseBtn').addEventListener('click', () => document.getElementById('compareSheet').classList.remove('open'));
}

/* ---------------- Select bar actions ---------------- */
function initSelectBar(){
  document.getElementById('cancelSelBtn').addEventListener('click', exitSelectMode);
  document.getElementById('deleteSelBtn').addEventListener('click', async () => {
    for (const id of selectedIds) await trashItem(id);
    exitSelectMode();
  });
}

/* ---------------- Settings ---------------- */
function initSettings(){
  document.getElementById('settingsBtn').addEventListener('click', () => {
    const s = FiteApp.getSettings();
    document.getElementById('groupToggle').checked = s.galleryGrouped;
    document.getElementById('trashDaysInput').value = s.galleryTrashDays;
    document.getElementById('settingsSheet').classList.add('open');
  });
  document.getElementById('settingsSaveBtn').addEventListener('click', async () => {
    await FiteApp.saveSettings({
      galleryGrouped: document.getElementById('groupToggle').checked,
      galleryTrashDays: parseInt(document.getElementById('trashDaysInput').value,10) || 30
    });
    document.getElementById('settingsSheet').classList.remove('open');
    FiteApp.toast('Settings saved');
    render();
  });
  document.getElementById('bgUploadInput').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const b64 = await fileToDataURL(file);
    const s = FiteApp.getSettings();
    await FiteApp.saveSettings({ wallpapers: { ...s.wallpapers, gallery: b64 } });
    FiteApp.applyPageBackground('gallery', document.getElementById('pageBg'));
    FiteApp.toast('Background updated');
  });
  document.getElementById('bgResetBtn').addEventListener('click', async () => {
    const s = FiteApp.getSettings();
    const wallpapers = { ...s.wallpapers }; delete wallpapers.gallery;
    await FiteApp.saveSettings({ wallpapers });
    document.getElementById('pageBg').style.backgroundImage = '';
    FiteApp.toast('Background reset');
  });
  document.getElementById('emptyTrashBtn').addEventListener('click', async () => {
    await FiteDB.clearStore('galleryTrash');
    FiteApp.toast('Trash emptied');
    openTrash();
  });
}

function initSheetCloses(){
  document.querySelectorAll('.overlay').forEach(sheet => {
    sheet.addEventListener('click', (e) => { if (e.target === sheet) sheet.classList.remove('open'); });
  });
  document.getElementById('trashBtn').addEventListener('click', openTrash);
}

(async function start(){
  document.getElementById('trashBtn').innerHTML = FiteApp.icon('trash', 20);
  document.getElementById('settingsBtn').innerHTML = FiteApp.icon('gear', 20);
  await FiteApp.init('gallery');
  FiteApp.applyPageBackground('gallery', document.getElementById('pageBg'));
  await purgeOldTrash();
  initUpload();
  initViewer();
  initInfo();
  initCompare();
  initSelectBar();
  initSettings();
  initSheetCloses();
  render();
})();
