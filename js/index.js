/* ==========================================================================
   FITE — index.js  (Home dashboard)
   ========================================================================== */

const BUILTIN_WALLPAPERS = [
  'assets/wallpapers/wall-1.jpg', 'assets/wallpapers/wall-2.jpg', 'assets/wallpapers/wall-3.jpg',
  'assets/wallpapers/wall-4.jpg', 'assets/wallpapers/wall-5.jpg', 'assets/wallpapers/wall-6.jpg',
  'assets/wallpapers/wall-7.jpg', 'assets/wallpapers/wall-8.jpg',
];

let iconTargetApp = null;

function todayISO(){ return new Date().toISOString().slice(0,10); }

function dayOfYear(d){
  const start = new Date(d.getFullYear(), 0, 0);
  return Math.floor((d - start) / 86400000);
}

/* ---------------- Splash: first-ever load only ---------------- */
function isFirstLaunch(){ return !localStorage.getItem('fite_first_launch_done'); }
function markLaunched(){ localStorage.setItem('fite_first_launch_done', '1'); }

function runSplash(){
  const splash = document.getElementById('splash');
  if (isFirstLaunch()) {
    splash.classList.remove('hidden');
    splash.classList.add('show');
    markLaunched();
    setTimeout(() => splash.remove(), 2100);
  } else {
    splash.remove();
  }
}

/* ---------------- Static wallpaper rotation (per app launch, not per visit) ---------------- */
async function applyHomeWallpaper(){
  const s = FiteApp.getSettings();
  const pool = [...BUILTIN_WALLPAPERS, ...(s.homeWallpapers || [])];
  let chosen = sessionStorage.getItem('fite_home_wallpaper');
  if (!chosen || !pool.includes(chosen)) {
    chosen = pool[Math.floor(Math.random() * pool.length)];
    sessionStorage.setItem('fite_home_wallpaper', chosen);
  }
  document.getElementById('homeBg').style.backgroundImage = `url(${chosen})`;
}

/* ---------------- Daily motivation card ---------------- */
function fetchWithTimeout(url, ms = 6000, opts = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  return fetch(url, { ...opts, signal: ctrl.signal }).finally(() => clearTimeout(t));
}

function blobToDataURL(blob){
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(blob);
  });
}

async function tryFetchQuote(){
  try {
    const res = await fetchWithTimeout('https://api.quotable.io/random?tags=motivational|inspirational|success');
    if (res.ok) {
      const data = await res.json();
      if (data && data.content) return { quote: data.content, author: data.author || '' };
    }
  } catch (e) { /* offline or blocked — fall through */ }
  try {
    const res = await fetchWithTimeout('https://zenquotes.io/api/random');
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data[0] && data[0].q) return { quote: data[0].q, author: data[0].a || '' };
    }
  } catch (e) { /* offline or blocked */ }
  return null;
}

async function tryFetchImage(){
  try {
    const res = await fetchWithTimeout(`https://picsum.photos/seed/${todayISO()}/900/1300`, 8000);
    if (res.ok) {
      const blob = await res.blob();
      return await blobToDataURL(blob);
    }
  } catch (e) { /* offline or blocked */ }
  return null;
}

function localFallbackCard(){
  const doy = dayOfYear(new Date());
  const q = PlanData.quotes[doy % PlanData.quotes.length];
  const wallIdx = (doy % BUILTIN_WALLPAPERS.length);
  return { quote: q.text, author: 'Your FITE plan', image: BUILTIN_WALLPAPERS[wallIdx], date: todayISO(), source: 'local' };
}

async function tryFetchDailyContent(){
  const [quoteRes, imageRes] = await Promise.all([tryFetchQuote(), tryFetchImage()]);
  if (!quoteRes && !imageRes) return null;
  const local = localFallbackCard();
  return {
    quote: quoteRes ? quoteRes.quote : local.quote,
    author: quoteRes ? quoteRes.author : local.author,
    image: imageRes || local.image,
    date: todayISO(),
    source: 'api'
  };
}

async function findMostRecentCachedCard(){
  const rows = await FiteDB.getAll('meta');
  const cards = rows
    .filter(r => r.key.startsWith('dailyCard:'))
    .map(r => r.value)
    .sort((a,b) => b.date.localeCompare(a.date));
  return cards.length ? cards[0] : null;
}

function renderCard(card){
  const el = document.getElementById('dailyCard');
  el.classList.remove('shimmer');
  el.style.backgroundImage = `url(${card.image})`;
  document.getElementById('dcQuote').textContent = FiteApp.clean(card.quote);
  document.getElementById('dcAuthor').textContent = card.author ? `— ${FiteApp.clean(card.author)}` : '';
}

async function loadDailyCard(){
  const today = todayISO();
  const cached = await FiteDB.get('meta', 'dailyCard:' + today);
  if (cached) { renderCard(cached); return; }

  if (navigator.onLine) {
    const fetched = await tryFetchDailyContent();
    if (fetched) {
      await FiteDB.put('meta', 'dailyCard:' + today, fetched);
      renderCard(fetched);
      return;
    }
  }

  const recent = await findMostRecentCachedCard();
  renderCard(recent || localFallbackCard());
}

/* ---------------- App grid ---------------- */
async function buildAppGrid(){
  const grid = document.getElementById('appGrid');
  const apps = FiteApp.APPS.filter(a => a.id !== 'home');
  const iconRows = await FiteDB.getAll('icons');
  const customIcons = {};
  iconRows.forEach(r => customIcons[r.key] = r.value);

  const defaultIconMap = {
    sports:'assets/icons/app-sports.png', gallery:'assets/icons/app-gallery.png',
    foods:'assets/icons/app-foods.png', checklist:'assets/icons/app-checklist.png',
    notes:'assets/icons/app-notes.png', money:'assets/icons/app-money.png',
    settings:'assets/icons/app-settings.png'
  };

  grid.innerHTML = apps.map(app => `
    <div class="app-tile" data-app="${app.id}" data-href="${app.href}">
      <div class="tile-icon">
        <img src="${customIcons[app.id] || defaultIconMap[app.id]}" alt="${app.label}">
      </div>
      <div class="tile-label">${app.label}</div>
    </div>`).join('');

  grid.querySelectorAll('.app-tile').forEach(tile => {
    const href = tile.dataset.href;
    const appId = tile.dataset.app;
    let pressTimer;
    let longPressTriggered = false;
    tile.addEventListener('click', () => { if (!longPressTriggered) window.location.href = href; });
    tile.addEventListener('pointerdown', () => {
      longPressTriggered = false;
      pressTimer = setTimeout(() => { longPressTriggered = true; openIconSheet(appId); }, 550);
    });
    ['pointerup','pointerleave','pointercancel'].forEach(ev =>
      tile.addEventListener(ev, () => clearTimeout(pressTimer)));
  });
}

function openIconSheet(appId){
  iconTargetApp = appId;
  const app = FiteApp.APPS.find(a => a.id === appId);
  document.getElementById('iconSheetTitle').textContent = `Change icon — ${app.label}`;
  document.getElementById('iconSheet').classList.add('open');
}

function initIconSheet(){
  const sheet = document.getElementById('iconSheet');
  document.getElementById('iconCancelBtn').addEventListener('click', () => sheet.classList.remove('open'));
  sheet.addEventListener('click', (e) => { if (e.target === sheet) sheet.classList.remove('open'); });

  document.getElementById('iconUploadBtn').addEventListener('click', () => {
    document.getElementById('iconFileInput').click();
  });
  document.getElementById('iconFileInput').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file || !iconTargetApp) return;
    const b64 = await fileToDataURL(file);
    await FiteDB.put('icons', iconTargetApp, b64);
    sheet.classList.remove('open');
    FiteApp.toast('Icon updated');
    buildAppGrid();
    FiteApp.renderNav('home');
  });
  document.getElementById('iconResetBtn').addEventListener('click', async () => {
    if (!iconTargetApp) return;
    await FiteDB.del('icons', iconTargetApp);
    sheet.classList.remove('open');
    FiteApp.toast('Reverted to default icon');
    buildAppGrid();
    FiteApp.renderNav('home');
  });
}

function fileToDataURL(file){
  return new Promise((resolve,reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

/* ---------------- Glance card ---------------- */
async function buildGlance(){
  const day = await FiteDB.get('checklistDays', todayISO());
  const items = day?.items || [];
  const total = items.length || PlanData.dailySchedule.length;
  const done = items.filter(i=>i.done).length;
  const pct = total ? Math.round((done/total)*100) : 0;

  document.getElementById('glanceTitle').textContent = pct === 100 ? 'All done today' : `${done}/${total} tasks done`;
  document.getElementById('glanceSub').textContent = pct === 100 ? 'Amazing consistency — keep it up.' : 'Open Checklist to keep going.';
  document.getElementById('glancePct').textContent = pct + '%';
  const ring = document.getElementById('glanceRing');
  const c = 2*Math.PI*26;
  ring.setAttribute('stroke-dasharray', c.toFixed(1));
  ring.setAttribute('stroke-dashoffset', (c - (pct/100)*c).toFixed(1));

  document.getElementById('glanceCard').onclick = () => window.location.href = 'checklist.html';
}

function setDateLabel(){
  const d = new Date();
  document.getElementById('dateLabel').textContent = d.toLocaleDateString(undefined, { weekday:'long', month:'long', day:'numeric' });
}

/* ---------------- Quick lock button ---------------- */
function initQuickLock(){
  const s = FiteApp.getSettings();
  const btn = document.getElementById('quickLockBtn');
  if (s.lock && s.lock.enabled && s.lock.pin) {
    btn.classList.remove('hidden');
    btn.innerHTML = FiteApp.icon('lock', 18);
    btn.addEventListener('click', () => FiteApp.lockNow());
  } else {
    btn.classList.add('hidden');
  }
}

(async function start(){
  await FiteApp.init('home');
  runSplash();
  await applyHomeWallpaper();
  document.getElementById('settingsLink').innerHTML = FiteApp.icon('gear', 20);

  setDateLabel();
  await loadDailyCard();
  await buildAppGrid();
  initIconSheet();
  await buildGlance();
  initQuickLock();
})();
