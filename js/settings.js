/* ==========================================================================
   FITE — settings.js
   ========================================================================== */

const THEMES = [
  { id:'oneui-blue', label:'Blue', color:'#1463F3' },
  { id:'oneui-blue-dark', label:'Blue Dark', color:'#0E0F13' },
  { id:'mint', label:'Mint', color:'#12B886' },
  { id:'mint-dark', label:'Mint Dark', color:'#0B1412' },
  { id:'coral', label:'Coral', color:'#FF5D5D' },
  { id:'coral-dark', label:'Coral Dark', color:'#160D0D' },
  { id:'violet', label:'Violet', color:'#7C5CFC' },
  { id:'violet-dark', label:'Violet Dark', color:'#100E1A' },
  { id:'sunshine', label:'Sunshine', color:'#F5A623' },
  { id:'sunshine-dark', label:'Sun Dark', color:'#14100A' },
  { id:'rose', label:'Rose', color:'#F0508E' },
  { id:'rose-dark', label:'Rose Dark', color:'#160B10' },
  { id:'slate', label:'Slate', color:'#0C0D10' },
  { id:'graphite-light', label:'Graphite', color:'#EDEDEF' },
];

const FONTS = [
  { id:'rounded', label:'Rounded', sample:'Aa' },
  { id:'modern', label:'Modern', sample:'Aa' },
  { id:'classic', label:'Classic', sample:'Aa' },
  { id:'mono', label:'Mono', sample:'Aa' },
  { id:'friendly', label:'Friendly', sample:'Aa' },
  { id:'elegant', label:'Elegant', sample:'Aa' },
];

function renderThemeGrid(){
  const s = FiteApp.getSettings();
  const grid = document.getElementById('themeGrid');
  grid.innerHTML = THEMES.map(t => `
    <div class="theme-swatch ${s.theme===t.id?'active':''}" data-id="${t.id}">
      <div class="swatch-circle" style="background:${t.color};"></div>
      <div class="swatch-label">${t.label}</div>
    </div>`).join('');
  grid.querySelectorAll('.theme-swatch').forEach(el => {
    el.addEventListener('click', async () => {
      await FiteApp.saveSettings({ theme: el.dataset.id });
      renderThemeGrid();
      FiteApp.applyPageBackground('settings', document.getElementById('pageBg'));
    });
  });
}

function renderFontGrid(){
  const s = FiteApp.getSettings();
  const grid = document.getElementById('fontGrid');
  grid.innerHTML = FONTS.map(f => `
    <div class="font-option ${s.font===f.id?'active':''}" data-id="${f.id}" data-font="${f.id}">
      <div class="fo-name" data-font="${f.id}">${f.label}</div>
      <div class="fo-check"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="m5 13 4 4L19 7"/></svg></div>
    </div>`).join('');
  // Apply preview font-family inline per option
  const map = { rounded:'ui-rounded, "Segoe UI", system-ui, sans-serif', modern:'-apple-system,"Segoe UI",Roboto,sans-serif',
    classic:'Georgia,serif', mono:'Consolas,monospace', friendly:'"Trebuchet MS",sans-serif', elegant:'Palatino,serif' };
  grid.querySelectorAll('.fo-name').forEach(el => el.style.fontFamily = map[el.dataset.font]);

  grid.querySelectorAll('.font-option').forEach(el => {
    el.addEventListener('click', async () => {
      await FiteApp.saveSettings({ font: el.dataset.id });
      renderFontGrid();
    });
  });
}

/* ---------------- Home wallpaper rotation ---------------- */
function initWallpapers(){
  renderCustomWallpaperList();
  document.getElementById('homeWallpaperInput').addEventListener('change', async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const cur = FiteApp.getSettings();
    const added = [];
    for (const file of files) {
      const b64 = await new Promise(res=>{ const r=new FileReader(); r.onload=()=>res(r.result); r.readAsDataURL(file); });
      added.push(b64);
    }
    await FiteApp.saveSettings({ homeWallpapers: [...(cur.homeWallpapers||[]), ...added] });
    e.target.value = '';
    FiteApp.toast(`Added ${added.length} wallpaper(s) to the rotation`);
    renderCustomWallpaperList();
  });
}

function renderCustomWallpaperList(){
  const s = FiteApp.getSettings();
  const holder = document.getElementById('customWallpaperList');
  const custom = s.homeWallpapers || [];
  if (!custom.length) {
    holder.innerHTML = `<div class="card-sub">No custom wallpapers added yet — the 8 built-in ones are used.</div>`;
    return;
  }
  holder.innerHTML = `<div class="grid-2">${custom.map((img, i) => `
    <div style="position:relative;">
      <img src="${img}" style="width:100%;height:90px;object-fit:cover;border-radius:14px;">
      <div class="mini-remove" data-i="${i}" style="position:absolute;top:6px;right:6px;width:26px;height:26px;border-radius:50%;background:rgba(0,0,0,.55);color:#fff;display:flex;align-items:center;justify-content:center;cursor:pointer;">${FiteApp.icon('close',13)}</div>
    </div>`).join('')}</div>`;
  holder.querySelectorAll('.mini-remove').forEach(btn => {
    btn.addEventListener('click', async () => {
      const cur = FiteApp.getSettings();
      const list = [...cur.homeWallpapers];
      list.splice(parseInt(btn.dataset.i,10), 1);
      await FiteApp.saveSettings({ homeWallpapers: list });
      renderCustomWallpaperList();
      FiteApp.toast('Wallpaper removed');
    });
  });
}

/* ---------------- Top bar ---------------- */
function initTopBar(){
  const s = FiteApp.getSettings();
  const tb = s.topBar;
  const opacitySlider = document.getElementById('topOpacitySlider');
  const opacityVal = document.getElementById('topOpacityVal');
  opacitySlider.value = tb.opacity;
  opacityVal.textContent = tb.opacity + '%';
  document.getElementById('topBlurToggle').checked = tb.blur;
  document.getElementById('topShowTitleToggle').checked = tb.showTitle;
  document.getElementById('topIconColorSelect').value = tb.iconColor;

  opacitySlider.addEventListener('input', () => { opacityVal.textContent = opacitySlider.value + '%'; });
  opacitySlider.addEventListener('change', commitTopBar);
  document.getElementById('topBlurToggle').addEventListener('change', commitTopBar);
  document.getElementById('topShowTitleToggle').addEventListener('change', commitTopBar);
  document.getElementById('topIconColorSelect').addEventListener('change', commitTopBar);

  async function commitTopBar(){
    await FiteApp.saveSettings({
      topBar: {
        opacity: parseInt(opacitySlider.value, 10),
        blur: document.getElementById('topBlurToggle').checked,
        showTitle: document.getElementById('topShowTitleToggle').checked,
        iconColor: document.getElementById('topIconColorSelect').value,
      }
    });
  }
}

/* ---------------- Bottom dock ---------------- */
function initNav(){
  const s = FiteApp.getSettings();
  const navToggle = document.getElementById('navToggle');
  const navOptions = document.getElementById('navOptions');
  const opacitySlider = document.getElementById('navOpacitySlider');
  const opacityVal = document.getElementById('navOpacityVal');
  const blurToggle = document.getElementById('navBlurToggle');

  navToggle.checked = s.bottomNav.enabled;
  navOptions.classList.toggle('hidden', !s.bottomNav.enabled);
  opacitySlider.value = s.bottomNav.opacity;
  opacityVal.textContent = s.bottomNav.opacity + '%';
  blurToggle.checked = s.bottomNav.blur;
  renderDockManageList();

  navToggle.addEventListener('change', async () => {
    navOptions.classList.toggle('hidden', !navToggle.checked);
    const cur = FiteApp.getSettings();
    await FiteApp.saveSettings({ bottomNav: { ...cur.bottomNav, enabled: navToggle.checked } });
    FiteApp.toast(navToggle.checked ? 'Bottom dock enabled' : 'Bottom dock hidden');
    FiteApp.renderNav('settings');
  });
  opacitySlider.addEventListener('input', () => { opacityVal.textContent = opacitySlider.value + '%'; });
  opacitySlider.addEventListener('change', commitNavStyle);
  blurToggle.addEventListener('change', commitNavStyle);

  async function commitNavStyle(){
    const cur = FiteApp.getSettings();
    await FiteApp.saveSettings({ bottomNav: { ...cur.bottomNav, opacity: parseInt(opacitySlider.value,10), blur: blurToggle.checked } });
    FiteApp.renderNav('settings');
  }

  document.getElementById('dockAddMoreBtn').addEventListener('click', openAddShortcutSheet);
}

function renderDockManageList(){
  const s = FiteApp.getSettings();
  const list = document.getElementById('dockManageList');
  const items = s.bottomNav.items.map(id => FiteApp.APPS.find(a => a.id === id)).filter(Boolean);
  if (!items.length) {
    list.innerHTML = `<div class="empty"><div class="s">No shortcuts yet — tap "Add a shortcut" below.</div></div>`;
    return;
  }
  list.innerHTML = items.map(a => `
    <div class="drag-row" data-id="${a.id}">
      <span class="drag-handle">${FiteApp.icon('drag', 18)}</span>
      <span class="nav-icon" style="width:26px;height:26px;">${FiteApp.icon(a.icon, 20)}</span>
      <div class="dr-label">${a.label}</div>
      <div class="item-del" data-remove="${a.id}">${FiteApp.icon('close', 15)}</div>
    </div>`).join('');

  list.querySelectorAll('[data-remove]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const cur = FiteApp.getSettings();
      const newItems = cur.bottomNav.items.filter(id => id !== btn.dataset.remove);
      await FiteApp.saveSettings({ bottomNav: { ...cur.bottomNav, items: newItems } });
      renderDockManageList();
      FiteApp.renderNav('settings');
      FiteApp.toast('Removed from dock');
    });
  });

  bindDockManageDrag(list);
}

function bindDockManageDrag(list){
  list.querySelectorAll('.drag-row').forEach(row => {
    const handle = row.querySelector('.drag-handle');
    handle.addEventListener('pointerdown', (e) => {
      let dragEl = row;
      row.classList.add('dragging');
      row.setPointerCapture(e.pointerId);
      const onMove = (ev) => {
        const y = ev.clientY;
        list.querySelectorAll('.drag-row').forEach(sib => {
          if (sib === dragEl) return;
          const rect = sib.getBoundingClientRect();
          const mid = rect.top + rect.height/2;
          const dragIsBefore = !!(dragEl.compareDocumentPosition(sib) & Node.DOCUMENT_POSITION_FOLLOWING);
          if (y > mid && dragIsBefore) list.insertBefore(dragEl, sib.nextSibling);
          else if (y < mid && !dragIsBefore) list.insertBefore(dragEl, sib);
        });
      };
      const onUp = async () => {
        document.removeEventListener('pointermove', onMove);
        document.removeEventListener('pointerup', onUp);
        dragEl.classList.remove('dragging');
        const newOrder = [...list.querySelectorAll('.drag-row')].map(r => r.dataset.id);
        const cur = FiteApp.getSettings();
        await FiteApp.saveSettings({ bottomNav: { ...cur.bottomNav, items: newOrder } });
        FiteApp.renderNav('settings');
      };
      document.addEventListener('pointermove', onMove);
      document.addEventListener('pointerup', onUp);
    });
  });
}

function openAddShortcutSheet(){
  let sheet = document.getElementById('settingsDockAddSheet');
  if (!sheet) {
    sheet = document.createElement('div');
    sheet.id = 'settingsDockAddSheet';
    sheet.className = 'overlay';
    sheet.innerHTML = `<div class="sheet"><div class="sheet-handle"></div><div class="sheet-title">Add a shortcut</div><div id="settingsDockAddList"></div></div>`;
    document.body.appendChild(sheet);
    sheet.addEventListener('click', (e) => { if (e.target === sheet) sheet.classList.remove('open'); });
  }
  const s = FiteApp.getSettings();
  const missing = FiteApp.APPS.filter(a => !s.bottomNav.items.includes(a.id));
  const list = sheet.querySelector('#settingsDockAddList');
  if (!missing.length) {
    list.innerHTML = `<div class="empty"><div class="t">All shortcuts added</div></div>`;
  } else {
    list.innerHTML = missing.map(a => `
      <div class="checkbox-row" data-id="${a.id}" style="cursor:pointer;">
        <span class="nav-icon" style="width:32px;height:32px;">${FiteApp.icon(a.icon, 19)}</span>
        <div class="label">${a.label}</div>
      </div>`).join('');
    list.querySelectorAll('.checkbox-row').forEach(row => {
      row.addEventListener('click', async () => {
        const cur = FiteApp.getSettings();
        const items = [...cur.bottomNav.items, row.dataset.id];
        await FiteApp.saveSettings({ bottomNav: { ...cur.bottomNav, items } });
        sheet.classList.remove('open');
        renderDockManageList();
        FiteApp.renderNav('settings');
      });
    });
  }
  sheet.classList.add('open');
}

/* ---------------- Lock ---------------- */
async function initLock(){
  const s = FiteApp.getSettings();
  const lockToggle = document.getElementById('lockToggle');
  const lockOptions = document.getElementById('lockOptions');
  lockToggle.checked = s.lock.enabled;
  lockOptions.classList.toggle('hidden', !s.lock.enabled);
  document.getElementById('pinInput').value = s.lock.pin || '';
  document.getElementById('timeoutSelect').value = s.lock.timeout || '1min';
  document.getElementById('fingerprintToggle').checked = s.lock.useFingerprint;

  let fpAvailable = false;
  if (window.PublicKeyCredential && PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable) {
    fpAvailable = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable().catch(()=>false);
  }
  document.getElementById('fingerprintSupport').textContent = fpAvailable
    ? 'Fingerprint/Face unlock is available on this device.'
    : 'Fingerprint unlock is not available on this device/browser — PIN will be used.';
  if (!fpAvailable) document.getElementById('fingerprintToggle').disabled = true;

  lockToggle.addEventListener('change', async (e) => {
    lockOptions.classList.toggle('hidden', !e.target.checked);
    await commitLock();
  });
  document.getElementById('pinInput').addEventListener('input', (e) => {
    e.target.value = e.target.value.replace(/\D/g,'').slice(0,4);
  });
  ['pinInput','timeoutSelect','fingerprintToggle'].forEach(id => {
    document.getElementById(id).addEventListener('change', commitLock);
  });

  async function commitLock(){
    const enabled = lockToggle.checked;
    const pin = document.getElementById('pinInput').value;
    if (enabled && pin.length !== 4) {
      FiteApp.toast('Enter a 4-digit PIN to enable lock');
      return;
    }
    await FiteApp.saveSettings({
      lock: {
        enabled,
        pin,
        timeout: document.getElementById('timeoutSelect').value,
        useFingerprint: document.getElementById('fingerprintToggle').checked
      }
    });
    FiteApp.toast('Lock settings saved');
  }
}

/* ---------------- Notifications ---------------- */
function initNotifications(){
  const s = FiteApp.getSettings();
  document.getElementById('notifToggle').checked = s.notifications.enabled;
  document.getElementById('notifOptions').classList.toggle('hidden', !s.notifications.enabled);
  document.getElementById('notifMeals').checked = s.notifications.meals;
  document.getElementById('notifWorkouts').checked = s.notifications.workouts;
  document.getElementById('notifFlex').checked = s.notifications.flexibility;
  updatePermLabel();

  document.getElementById('notifToggle').addEventListener('change', async (e) => {
    document.getElementById('notifOptions').classList.toggle('hidden', !e.target.checked);
    if (e.target.checked) {
      const perm = await FiteApp.requestNotifPermission();
      updatePermLabel();
      if (perm !== 'granted') FiteApp.toast('Notifications will show as in-app alerts only');
    }
    await commitNotif();
  });
  ['notifMeals','notifWorkouts','notifFlex'].forEach(id => {
    document.getElementById(id).addEventListener('change', commitNotif);
  });

  function updatePermLabel(){
    const el = document.getElementById('notifPermState');
    if (!('Notification' in window)) { el.textContent = 'Browser notifications not supported — in-app alerts will be used.'; return; }
    el.textContent = 'Browser permission: ' + Notification.permission;
  }
  async function commitNotif(){
    await FiteApp.saveSettings({
      notifications: {
        enabled: document.getElementById('notifToggle').checked,
        meals: document.getElementById('notifMeals').checked,
        workouts: document.getElementById('notifWorkouts').checked,
        flexibility: document.getElementById('notifFlex').checked,
      }
    });
    FiteApp.toast('Notification settings saved');
  }
}

/* ---------------- Data management ---------------- */
function initData(){
  document.getElementById('exportBtn').addEventListener('click', async () => {
    const data = await FiteDB.exportAll();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type:'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `fite-backup-${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
    FiteApp.toast('Backup downloaded');
  });

  document.getElementById('importBtn').addEventListener('click', () => document.getElementById('importInput').click());
  document.getElementById('importInput').addEventListener('change', async (e) => {
    const file = e.target.files[0]; if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      await FiteDB.importAll(data);
      FiteApp.toast('Data imported — reloading…');
      setTimeout(()=> location.reload(), 900);
    } catch (err) {
      FiteApp.toast('Import failed — invalid file');
    }
  });

  document.getElementById('clearBtn').addEventListener('click', async () => {
    if (!confirm('This will permanently delete all your FITE data on this device. Continue?')) return;
    await FiteDB.clearAll();
    FiteApp.toast('All data cleared — reloading…');
    setTimeout(()=> location.reload(), 900);
  });
}

async function initStorageInfo(){
  if (navigator.storage && navigator.storage.estimate) {
    try {
      const { usage, quota } = await navigator.storage.estimate();
      document.getElementById('storageInfo').textContent =
        `Using ${(usage/1024/1024).toFixed(1)} MB of ~${(quota/1024/1024/1024).toFixed(1)} GB available on this device.`;
    } catch(e){}
  }
}

(async function start(){
  await FiteApp.init('settings');
  FiteApp.applyPageBackground('settings', document.getElementById('pageBg'));
  renderThemeGrid();
  renderFontGrid();
  initWallpapers();
  initTopBar();
  initNav();
  await initLock();
  initNotifications();
  initData();
  initStorageInfo();
})();
