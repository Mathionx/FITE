/* ==========================================================================
   FITE — app-shared.js
   Loaded on every page. Handles: settings load/apply, theming, the
   configurable top bar, the editable/draggable bottom dock, the lock
   screen (PIN + optional WebAuthn) + quick-lock, toasts, lightweight
   in-app notification scheduling, and small shared helpers (icons, emoji
   stripping for display-only text).
   ========================================================================== */

const FiteApp = (() => {

  /* ---------------- Canonical app registry (used by Home grid + Dock) ---------------- */
  const APPS = [
    { id:'home', label:'Home', href:'index.html', icon:'home' },
    { id:'sports', label:'Sports', href:'sports.html', icon:'sports' },
    { id:'gallery', label:'Gallery', href:'gallery.html', icon:'gallery' },
    { id:'foods', label:'Foods', href:'foods.html', icon:'foods' },
    { id:'checklist', label:'Checklist', href:'checklist.html', icon:'checklist' },
    { id:'notes', label:'Notes', href:'notes.html', icon:'notes' },
    { id:'money', label:'Money', href:'moneytracker.html', icon:'money' },
    { id:'settings', label:'Settings', href:'settings.html', icon:'settings' },
  ];

  const DEFAULT_SETTINGS = {
    theme: 'oneui-blue',
    font: 'rounded',
    lock: { enabled:false, pin:'', timeout:'1min', useFingerprint:false },
    notifications: { enabled:false, meals:true, workouts:true, flexibility:true },
    wallpapers: {}, // pageId -> base64 (per mini-app page background override)
    homeWallpapers: [], // custom uploaded home wallpapers (base64[]), joins built-in rotation pool
    galleryGrouped: true,
    galleryTrashDays: 30,
    fastingWindow: { start: '12:00', end: '20:00' },
    macroGoals: { cal: 2600, protein: 160, carbs: 300, fat: 80 },
    checklistTimes: {
      wake:'05:30', water:'05:35', walk:'06:00', study1:'07:00',
      meal1:'12:00', snack:'15:30', gym:'17:00', dinner:'18:30',
      milk:'20:30', flex:'21:00', sleep:'21:30'
    },
    restTimerDefault: 90,
    topBar: { opacity: 92, blur: true, showTitle: true, iconColor: 'auto' },
    bottomNav: { enabled: false, opacity: 92, blur: true, items: ['home','sports','foods','gallery','checklist'] },
  };

  let settings = null;

  async function loadSettings() {
    const rows = await FiteDB.getAll('settings');
    const map = {};
    rows.forEach(r => map[r.key] = r.value);
    settings = deepMerge(DEFAULT_SETTINGS, map.settings || {});
    return settings;
  }

  function deepMerge(base, override) {
    const out = Array.isArray(base) ? [...base] : { ...base };
    for (const k in override) {
      if (override[k] && typeof override[k] === 'object' && !Array.isArray(override[k]) && base[k] && typeof base[k] === 'object') {
        out[k] = deepMerge(base[k], override[k]);
      } else {
        out[k] = override[k];
      }
    }
    return out;
  }

  async function saveSettings(patch) {
    settings = deepMerge(settings || DEFAULT_SETTINGS, patch);
    await FiteDB.put('settings', 'settings', settings);
    applyTheme();
    applyTopBar();
    return settings;
  }

  function getSettings() { return settings || DEFAULT_SETTINGS; }

  function applyTheme() {
    const s = getSettings();
    document.documentElement.setAttribute('data-theme', s.theme);
    document.documentElement.setAttribute('data-font', s.font);
  }

  /* ---------------- Emoji stripping (display-only helper) ----------------
     Plan data text (js/plan-data.js) is never modified — it's the source of
     truth for export/import and stays byte-for-byte as provided. This
     helper is applied only where we RENDER that text in the UI, per the
     "no emojis in the interface" requirement. */
  const EMOJI_RE = /[\u{1F1E6}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}\u{200D}]/gu;
  function clean(str) {
    if (!str) return str;
    return str.replace(EMOJI_RE, '').replace(/\s{2,}/g, ' ').trim();
  }

  /* ---------------- Icons ---------------- */
  const ICONS = {
    home: '<path d="M3 11.5 12 4l9 7.5"/><path d="M5 10v9a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1v-9"/>',
    sports: '<circle cx="12" cy="12" r="9"/><path d="M12 3v18M3 12h18M6 6l12 12M18 6 6 18"/>',
    foods: '<path d="M6 3v7a3 3 0 0 0 3 3v8"/><path d="M6 3v7M9 3v7"/><path d="M17 3c-2 0-3 2-3 5s1 3 3 3v10"/>',
    gallery: '<rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="9" cy="10" r="2"/><path d="m21 16-5-5-4 4-2-2-5 5"/>',
    checklist: '<rect x="4" y="4" width="16" height="16" rx="4"/><path d="m8 12 2.5 2.5L16 9"/>',
    notes: '<path d="M6 3h9l5 5v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z"/><path d="M14 3v5h5"/><path d="M8 13h8M8 17h5"/>',
    money: '<circle cx="12" cy="12" r="9"/><path d="M12 7v10M9.5 9.5a2.5 2.5 0 0 1 2.5-1.5c1.7 0 2.8 1 2.8 2.2 0 2.8-5.3 1.6-5.3 4.4 0 1.3 1.2 2.2 3 2.2a2.7 2.7 0 0 0 2.8-1.8"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.9 2.9l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6V21a2 2 0 1 1-4 0v-.2a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.9-2.9l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.6-1H3a2 2 0 1 1 0-4h.2a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.9-2.9l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.6V3a2 2 0 1 1 4 0v.2a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.9 2.9l-.1.1a1.7 1.7 0 0 0-.3 1.9V9a1.7 1.7 0 0 0 1.6 1H21a2 2 0 1 1 0 4h-.2a1.7 1.7 0 0 0-1.6 1Z"/>',
    trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-13"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    close: '<path d="M18 6 6 18M6 6l18 18"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.9 2.9l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6V21a2 2 0 1 1-4 0v-.2a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.9-2.9l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.6-1H3a2 2 0 1 1 0-4h.2a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.9-2.9l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.6V3a2 2 0 1 1 4 0v.2a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.9 2.9l-.1.1a1.7 1.7 0 0 0-.3 1.9V9a1.7 1.7 0 0 0 1.6 1H21a2 2 0 1 1 0 4h-.2a1.7 1.7 0 0 0-1.6 1Z"/>',
    lock: '<rect x="5" y="11" width="14" height="10" rx="3"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
    check: '<path d="m5 13 4 4L19 7"/>',
    drag: '<circle cx="9" cy="6" r="1.3"/><circle cx="15" cy="6" r="1.3"/><circle cx="9" cy="12" r="1.3"/><circle cx="15" cy="12" r="1.3"/><circle cx="9" cy="18" r="1.3"/><circle cx="15" cy="18" r="1.3"/>',
    history: '<path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 5v5h5"/><path d="M12 7v5l4 2"/>',
  };

  function icon(name, size=20) {
    return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICONS[name]||''}</svg>`;
  }

  /* ---------------- Top bar (configurable, no gradient) ---------------- */
  function applyTopBar() {
    const s = getSettings();
    const tb = s.topBar;
    const root = document.documentElement;
    root.style.setProperty('--topbar-opacity', (tb.opacity/100).toString());
    root.style.setProperty('--topbar-blur', tb.blur ? '18px' : '0px');
    root.style.setProperty('--icon-color', tb.iconColor === 'auto' ? 'var(--text)' : tb.iconColor);
    document.body.classList.toggle('hide-topbar-title', !tb.showTitle);
  }

  /* ---------------- Bottom dock (editable + drag reorder) ---------------- */
  function appById(id) { return APPS.find(a => a.id === id); }

  async function getCustomIcon(appId) {
    const row = await FiteDB.get('icons', appId);
    return row || null;
  }

  async function renderNav(activeId) {
    const s = getSettings();
    const holder = document.getElementById('bottomNav');
    if (!holder) return;
    const nav = s.bottomNav;
    if (!nav || !nav.enabled) {
      holder.classList.add('hidden');
      document.body.classList.remove('has-nav');
      return;
    }
    document.body.classList.add('has-nav');
    holder.classList.remove('hidden');
    holder.style.setProperty('--nav-opacity', (nav.opacity/100).toString());
    holder.style.setProperty('--nav-blur', nav.blur ? '18px' : '0px');

    const items = (nav.items && nav.items.length ? nav.items : DEFAULT_SETTINGS.bottomNav.items)
      .map(appById).filter(Boolean);

    const customIcons = {};
    for (const it of items) {
      const c = await getCustomIcon(it.id);
      if (c) customIcons[it.id] = c;
    }

    holder.innerHTML = items.map(item => `
      <div class="nav-item ${item.id===activeId?'active':''}" data-id="${item.id}" data-href="${item.href}">
        <span class="nav-remove hidden">${icon('close', 11)}</span>
        <span class="nav-icon">${customIcons[item.id] ? `<img src="${customIcons[item.id]}" alt="${item.label}">` : icon(item.icon, 22)}</span>
        <span class="nav-label">${item.label}</span>
      </div>`).join('') + `<div class="nav-item nav-add" id="navAddBtn">${icon('plus', 20)}<span class="nav-label">Add</span></div>`;

    bindDockInteractions(holder, activeId);
  }

  let dockEditMode = false;

  function bindDockInteractions(holder, activeId) {
    let pressTimer = null;

    holder.querySelectorAll('.nav-item:not(.nav-add)').forEach(el => {
      el.addEventListener('pointerdown', () => {
        pressTimer = setTimeout(() => enterEditMode(holder), 480);
      });
      ['pointerup','pointerleave','pointercancel'].forEach(ev =>
        el.addEventListener(ev, () => clearTimeout(pressTimer)));

      el.addEventListener('click', () => {
        if (dockEditMode) return; // ignore navigation while editing
        window.location.href = el.dataset.href;
      });

      el.querySelector('.nav-remove').addEventListener('click', async (e) => {
        e.stopPropagation();
        const s = getSettings();
        const items = s.bottomNav.items.filter(id => id !== el.dataset.id);
        await saveSettings({ bottomNav: { ...s.bottomNav, items } });
        exitEditMode(holder);
        renderNav(activeId);
      });
    });

    const addBtn = holder.querySelector('#navAddBtn');
    if (addBtn) addBtn.addEventListener('click', () => openAddDockSheet(holder, activeId));

    function enterEditMode(container) {
      if (dockEditMode) return;
      dockEditMode = true;
      container.classList.add('reorder-mode');
      container.querySelectorAll('.nav-remove').forEach(b => b.classList.remove('hidden'));
      if (navigator.vibrate) navigator.vibrate(12);
      const outsideHandler = (e) => {
        if (!container.contains(e.target)) {
          exitEditMode(container);
          document.removeEventListener('pointerdown', outsideHandler, true);
        }
      };
      setTimeout(() => document.addEventListener('pointerdown', outsideHandler, true), 50);
      initDragReorder(container, activeId);
    }
  }

  function exitEditMode(container) {
    dockEditMode = false;
    container.classList.remove('reorder-mode');
    container.querySelectorAll('.nav-remove').forEach(b => b.classList.add('hidden'));
  }

  function initDragReorder(container) {
    let dragEl = null;

    container.querySelectorAll('.nav-item:not(.nav-add)').forEach(item => {
      item.addEventListener('pointerdown', (e) => {
        if (!dockEditMode) return;
        dragEl = item;
        item.setPointerCapture(e.pointerId);
        item.classList.add('dragging');
        const onMove = (ev) => {
          if (!dragEl) return;
          const x = ev.clientX;
          const siblings = [...container.querySelectorAll('.nav-item:not(.nav-add)')];
          siblings.forEach((sib) => {
            if (sib === dragEl) return;
            const rect = sib.getBoundingClientRect();
            const mid = rect.left + rect.width/2;
            const dragIsBefore = !!(dragEl.compareDocumentPosition(sib) & Node.DOCUMENT_POSITION_FOLLOWING);
            if (x > mid && dragIsBefore) {
              container.insertBefore(dragEl, sib.nextSibling);
            } else if (x < mid && !dragIsBefore) {
              container.insertBefore(dragEl, sib);
            }
          });
        };
        const onUp = async () => {
          document.removeEventListener('pointermove', onMove);
          document.removeEventListener('pointerup', onUp);
          if (dragEl) dragEl.classList.remove('dragging');
          const newOrder = [...container.querySelectorAll('.nav-item:not(.nav-add)')].map(el => el.dataset.id);
          dragEl = null;
          const s = getSettings();
          await saveSettings({ bottomNav: { ...s.bottomNav, items: newOrder } });
        };
        document.addEventListener('pointermove', onMove);
        document.addEventListener('pointerup', onUp);
      });
    });
  }

  function openAddDockSheet(holder, activeId) {
    let sheet = document.getElementById('dockAddSheet');
    if (!sheet) {
      sheet = document.createElement('div');
      sheet.id = 'dockAddSheet';
      sheet.className = 'overlay';
      sheet.innerHTML = `<div class="sheet"><div class="sheet-handle"></div><div class="sheet-title">Add to dock</div><div id="dockAddList"></div></div>`;
      document.body.appendChild(sheet);
      sheet.addEventListener('click', (e) => { if (e.target === sheet) sheet.classList.remove('open'); });
    }
    const s = getSettings();
    const missing = APPS.filter(a => !s.bottomNav.items.includes(a.id));
    const list = sheet.querySelector('#dockAddList');
    if (!missing.length) {
      list.innerHTML = `<div class="empty"><div class="t">All shortcuts added</div><div class="s">Every mini-app is already in your dock.</div></div>`;
    } else {
      list.innerHTML = missing.map(a => `
        <div class="checkbox-row dock-add-row" data-id="${a.id}" style="cursor:pointer;">
          <span class="nav-icon" style="width:34px;height:34px;">${icon(a.icon, 20)}</span>
          <div class="label">${a.label}</div>
        </div>`).join('');
      list.querySelectorAll('.dock-add-row').forEach(row => {
        row.addEventListener('click', async () => {
          const cur = getSettings();
          const items = [...cur.bottomNav.items, row.dataset.id];
          await saveSettings({ bottomNav: { ...cur.bottomNav, items } });
          sheet.classList.remove('open');
          renderNav(activeId);
        });
      });
    }
    sheet.classList.add('open');
  }

  /* ---------------- Toast ---------------- */
  function toast(msg, ms=2200) {
    let el = document.getElementById('fiteToast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'fiteToast';
      el.className = 'toast';
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(el._t);
    el._t = setTimeout(() => el.classList.remove('show'), ms);
  }

  /* ---------------- Lock screen ---------------- */
  function lastActiveKey(){ return 'fite_last_active'; }

  function markActive() {
    localStorage.setItem(lastActiveKey(), Date.now().toString());
  }

  function timeoutMs(label) {
    switch(label){
      case '1s': return 1000;
      case '1min': return 60*1000;
      case '30min': return 30*60*1000;
      case '1hr': return 60*60*1000;
      default: return 60*1000;
    }
  }

  async function maybeShowLock() {
    const s = getSettings();
    if (!s.lock || !s.lock.enabled || !s.lock.pin) { markActive(); return; }
    const last = parseInt(localStorage.getItem(lastActiveKey()) || '0', 10);
    const elapsed = Date.now() - last;
    if (elapsed > timeoutMs(s.lock.timeout)) {
      showLockScreen();
    } else {
      markActive();
    }
  }

  function lockNow() {
    const s = getSettings();
    if (!s.lock || !s.lock.enabled || !s.lock.pin) { toast('App lock is not enabled'); return; }
    showLockScreen();
  }

  function showLockScreen() {
    if (document.getElementById('lockScreen')) return;
    const s = getSettings();
    const wrap = document.createElement('div');
    wrap.id = 'lockScreen';
    wrap.innerHTML = `
      <img class="lock-logo" src="assets/icons/icon-192.png" alt="FITE">
      <div style="font-weight:800;font-size:18px;">Enter PIN</div>
      <div class="lock-dots" id="lockDots"></div>
      <div class="lock-error" id="lockError"></div>
      <div class="lock-keypad" id="lockKeypad"></div>
      ${s.lock.useFingerprint ? '<button class="btn btn-secondary btn-sm" id="fpBtn">Use fingerprint</button>' : ''}
    `;
    document.body.appendChild(wrap);
    const dotsEl = wrap.querySelector('#lockDots');
    const pinLen = (s.lock.pin || '0000').length;
    dotsEl.innerHTML = Array.from({length:pinLen}).map(()=>'<div class="lock-dot"></div>').join('');
    let entered = '';
    const keypad = wrap.querySelector('#lockKeypad');
    const keys = ['1','2','3','4','5','6','7','8','9','','0','del'];
    keypad.innerHTML = keys.map(k => {
      if (k === '') return '<div></div>';
      if (k === 'del') return `<div class="lock-key" data-k="del">⌫</div>`;
      return `<div class="lock-key" data-k="${k}">${k}</div>`;
    }).join('');
    keypad.addEventListener('click', (e) => {
      const el = e.target.closest('.lock-key');
      if (!el) return;
      const k = el.dataset.k;
      if (k === 'del') { entered = entered.slice(0,-1); }
      else if (entered.length < pinLen) { entered += k; }
      updateDots();
      if (entered.length === pinLen) checkPin();
    });
    function updateDots(){
      [...dotsEl.children].forEach((d,i)=> d.classList.toggle('filled', i < entered.length));
    }
    function checkPin(){
      if (entered === s.lock.pin) {
        wrap.remove();
        markActive();
      } else {
        wrap.querySelector('#lockError').textContent = 'Incorrect PIN, try again';
        entered = '';
        updateDots();
      }
    }
    if (s.lock.useFingerprint) {
      wrap.querySelector('#fpBtn').addEventListener('click', tryFingerprint);
    }
  }

  async function tryFingerprint() {
    try {
      if (!window.PublicKeyCredential) throw new Error('unsupported');
      const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      if (!available) throw new Error('unsupported');
      await navigator.credentials.get({
        publicKey: {
          challenge: crypto.getRandomValues(new Uint8Array(32)),
          timeout: 30000,
          userVerification: 'required'
        }
      }).catch(()=>{ throw new Error('failed'); });
      document.getElementById('lockScreen')?.remove();
      markActive();
    } catch (e) {
      toast('Fingerprint unavailable — use PIN');
    }
  }

  /* ---------------- Wallpaper (per mini-app page override) ---------------- */
  function applyPageBackground(pageId, targetEl) {
    const s = getSettings();
    const wp = s.wallpapers && s.wallpapers[pageId];
    if (wp && targetEl) {
      targetEl.style.backgroundImage = `url(${wp})`;
      targetEl.style.backgroundSize = 'cover';
      targetEl.style.backgroundPosition = 'center';
    }
  }

  /* ---------------- Notifications (in-app, timer based) ---------------- */
  function scheduleNotification(title, body, atDate) {
    const s = getSettings();
    if (!s.notifications || !s.notifications.enabled) return;
    const ms = atDate.getTime() - Date.now();
    if (ms <= 0 || ms > 24*60*60*1000) return;
    setTimeout(() => { fireNotification(title, body); }, ms);
  }

  function fireNotification(title, body) {
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        navigator.serviceWorker?.getRegistration().then(reg => {
          if (reg) reg.showNotification(title, { body, icon: 'assets/icons/icon-192.png' });
          else new Notification(title, { body });
        });
      } catch (e) { toast(title + ': ' + body); }
    } else {
      toast(title + ': ' + body);
    }
  }

  async function requestNotifPermission() {
    if (!('Notification' in window)) return 'unsupported';
    return Notification.requestPermission();
  }

  /* ---------------- Init helper for every page ---------------- */
  async function init(pageId) {
    await loadSettings();
    applyTheme();
    applyTopBar();
    await renderNav(pageId);
    await maybeShowLock();
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') maybeShowLock();
      else markActive();
    });
    window.addEventListener('pagehide', markActive);
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('service-worker.js').catch(()=>{});
    }
    return getSettings();
  }

  return {
    init, getSettings, saveSettings, loadSettings, renderNav, icon, toast, clean,
    applyPageBackground, applyTopBar, scheduleNotification, requestNotifPermission,
    fireNotification, lockNow, showLockScreen, DEFAULT_SETTINGS, APPS
  };
})();
