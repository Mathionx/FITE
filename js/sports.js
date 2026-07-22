/* ==========================================================================
   FITE — sports.js
   ========================================================================== */

let currentDayIdx = 0;
let sessionState = {}; // exerciseName -> {checked, reps}
let restInterval = null;
let restSeconds = 90;
let restRunning = false;
let videoUrls = {}; // exerciseName -> url

function icon(name, size){ return FiteApp.icon(name, size); }

function todayDayIndex(){
  // JS: 0=Sun..6=Sat -> map to plan order Mon..Sun (0..6)
  const js = new Date().getDay();
  return js === 0 ? 6 : js - 1;
}

async function loadVideoUrls(){
  const row = await FiteDB.get('settings', 'videoUrls');
  videoUrls = row || {};
}
async function saveVideoUrls(){ await FiteDB.put('settings', 'videoUrls', videoUrls); }

/* ---------------- Tabs ---------------- */
function initTabs(){
  document.querySelectorAll('#mainTabs .tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('#mainTabs .tab').forEach(t=>t.classList.remove('active'));
      tab.classList.add('active');
      document.querySelectorAll('.tab-panel').forEach(p=>p.classList.add('hidden'));
      document.getElementById('tab-'+tab.dataset.tab).classList.remove('hidden');
    });
  });
}

/* ---------------- Gym tab ---------------- */
function renderDayChips(){
  const holder = document.getElementById('dayChips');
  const todayIdx = todayDayIndex();
  holder.innerHTML = PlanData.gymWeek.map((d,i) => `
    <div class="day-chip ${i===currentDayIdx?'active':''}" data-i="${i}">
      ${d.day.slice(0,3)}${i===todayIdx?'<span class="today-dot"></span>':''}
    </div>`).join('');
  holder.querySelectorAll('.day-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      currentDayIdx = parseInt(chip.dataset.i,10);
      sessionState = {};
      renderDayChips();
      renderExercises();
    });
  });
}

function renderExercises(){
  const day = PlanData.gymWeek[currentDayIdx];
  const noteEl = document.getElementById('dayNote');
  const list = document.getElementById('exerciseList');
  const finishBtn = document.getElementById('finishBtn');

  document.querySelector('.container .card-title')?.remove();

  if (day.type === 'rest') {
    noteEl.style.display = 'block';
    noteEl.innerHTML = `<div class="card-title">Complete Rest</div><div class="card-sub">Sunday is for full recovery. No training today.</div>`;
    list.innerHTML = '';
    finishBtn.style.display = 'none';
    return;
  }
  finishBtn.style.display = 'block';

  if (day.note) {
    noteEl.style.display = 'block';
    noteEl.innerHTML = `<div class="card-title">${day.title}</div><div class="card-sub">${day.note}</div>`;
  } else {
    noteEl.style.display = 'block';
    noteEl.innerHTML = `<div class="card-title">${day.title}</div>`;
  }

  const showVideo = day.type === 'gym';
  list.innerHTML = day.exercises.map((ex, i) => exCardHTML(ex, i, showVideo)).join('') +
    (day.finish ? `<div class="card-flat mt12"><b>Finish with:</b><br>${day.finish.join('<br>')}</div>` : '');

  list.querySelectorAll('.ex-card').forEach(card => {
    const idx = parseInt(card.dataset.idx, 10);
    const ex = day.exercises[idx];
    if (!sessionState[ex.name]) sessionState[ex.name] = { checked:false, reps: parseInt(ex.reps)||0 };

    card.querySelector('.chk').addEventListener('click', () => {
      sessionState[ex.name].checked = !sessionState[ex.name].checked;
      card.querySelector('.chk').classList.toggle('checked');
    });
    const repMinus = card.querySelector('.rep-minus');
    const repPlus = card.querySelector('.rep-plus');
    const repVal = card.querySelector('.rep-val');
    if (repMinus) repMinus.addEventListener('click', () => {
      sessionState[ex.name].reps = Math.max(0, sessionState[ex.name].reps - 1);
      repVal.textContent = sessionState[ex.name].reps;
    });
    if (repPlus) repPlus.addEventListener('click', () => {
      sessionState[ex.name].reps += 1;
      repVal.textContent = sessionState[ex.name].reps;
    });
    const timerBtn = card.querySelector('.timer-btn');
    if (timerBtn) timerBtn.addEventListener('click', () => startRestTimer());
    const videoBtn = card.querySelector('.video-btn');
    if (videoBtn) videoBtn.addEventListener('click', () => openVideoSheet(ex.name));
  });
}

function exCardHTML(ex, i, showVideo){
  const hasReps = /\d/.test(ex.reps || '');
  return `
  <div class="ex-card" data-idx="${i}">
    <div class="ex-top">
      <div class="chk" role="checkbox"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="m5 13 4 4L19 7"/></svg></div>
      <div class="ex-info">
        <div class="ex-name">${ex.name}</div>
        ${ex.sets ? `<div class="ex-meta">${ex.sets} sets × ${ex.reps}</div>` : ''}
      </div>
      ${showVideo ? `<div class="mini-btn video-btn" title="Watch demo">${videoGlyph()}</div>` : ''}
    </div>
    <div class="ex-actions">
      ${ex.sets ? `<div class="rep-counter">
        <button class="rep-minus">−</button>
        <span class="rep-val">${parseInt(ex.reps)||0}</span>
        <button class="rep-plus">+</button>
      </div>` : ''}
      ${ex.sets ? `<div class="mini-btn timer-btn" title="Rest timer">${timerGlyph()}</div>` : ''}
    </div>
  </div>`;
}

function videoGlyph(){ return `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="5" width="14" height="14" rx="3"/><path d="m17 9 4-2v10l-4-2"/></svg>`; }
function timerGlyph(){ return `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l3 2M9 2h6"/></svg>`; }

async function finishWorkout(){
  const day = PlanData.gymWeek[currentDayIdx];
  const doneExercises = Object.entries(sessionState).map(([name, st]) => ({ name, ...st }));
  if (!doneExercises.some(e=>e.checked)) {
    FiteApp.toast('Check off at least one exercise first');
    return;
  }
  const key = new Date().toISOString();
  await FiteDB.put('workoutLogs', key, {
    date: new Date().toISOString().slice(0,10),
    day: day.day,
    title: day.title,
    exercises: doneExercises,
  });
  FiteApp.toast('Workout saved');
  sessionState = {};
  renderExercises();
}

/* ---------------- Flexibility tab ---------------- */
function renderFlex(){
  document.getElementById('flexDuration').textContent = PlanData.flexibilityNightly.duration + ' — hold each 20–30 sec';
  document.getElementById('flexNote').textContent = PlanData.flexibilityNightly.note;
  const list = document.getElementById('flexList');
  list.innerHTML = PlanData.flexibilityNightly.items.map((name,i) => simpleCheckCard(name, 'flex'+i)).join('');
  bindSimpleChecks(list);
}

/* ---------------- Posture tab ---------------- */
function renderPosture(){
  document.getElementById('postureNote').textContent = PlanData.postureExercises.note;
  const list = document.getElementById('postureList');
  list.innerHTML = PlanData.postureExercises.items.map((name,i) => simpleCheckCard(name, 'post'+i, true)).join('');
  bindSimpleChecks(list);
  list.querySelectorAll('.video-btn').forEach(btn => {
    btn.addEventListener('click', () => openVideoSheet(btn.closest('.ex-card').dataset.name));
  });
}

function simpleCheckCard(name, id, withVideo){
  return `
  <div class="ex-card" data-name="${name}">
    <div class="ex-top">
      <div class="chk" data-id="${id}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="m5 13 4 4L19 7"/></svg></div>
      <div class="ex-info"><div class="ex-name">${name}</div></div>
      ${withVideo ? `<div class="mini-btn video-btn">${videoGlyph()}</div>` : ''}
    </div>
  </div>`;
}
function bindSimpleChecks(list){
  list.querySelectorAll('.chk').forEach(chk => {
    chk.addEventListener('click', () => chk.classList.toggle('checked'));
  });
}

/* ---------------- Rest timer ---------------- */
function startRestTimer(){
  restSeconds = FiteApp.getSettings().restTimerDefault || 90;
  updateRestDisplay();
  document.getElementById('restBar').classList.remove('hidden');
  restRunning = true;
  clearInterval(restInterval);
  restInterval = setInterval(() => {
    if (!restRunning) return;
    restSeconds--;
    if (restSeconds <= 0) {
      clearInterval(restInterval);
      restSeconds = 0;
      FiteApp.toast('Rest done — next set');
      restRunning = false;
    }
    updateRestDisplay();
  }, 1000);
}
function updateRestDisplay(){
  const m = Math.floor(restSeconds/60).toString().padStart(2,'0');
  const s = (restSeconds%60).toString().padStart(2,'0');
  document.getElementById('restTime').textContent = `${m}:${s}`;
}
function initRestBar(){
  document.getElementById('restPlay').innerHTML = icon('checklist',18);
  document.getElementById('restPlay').addEventListener('click', () => {
    restRunning = !restRunning;
    FiteApp.toast(restRunning ? 'Resumed' : 'Paused');
  });
  document.getElementById('restMinus').textContent = '-10';
  document.getElementById('restMinus').addEventListener('click', () => { restSeconds = Math.max(0, restSeconds-10); updateRestDisplay(); });
  document.getElementById('restPlus').textContent = '+10';
  document.getElementById('restPlus').addEventListener('click', () => { restSeconds += 10; updateRestDisplay(); });
  document.getElementById('restClose').innerHTML = icon('close',16);
  document.getElementById('restClose').addEventListener('click', () => {
    clearInterval(restInterval);
    document.getElementById('restBar').classList.add('hidden');
  });
}

/* ---------------- Video sheet ---------------- */
function openVideoSheet(exName){
  document.getElementById('videoTitle').textContent = exName;
  document.getElementById('videoUrlInput').value = videoUrls[exName] || '';
  renderVideoBody(exName);
  document.getElementById('videoSheet').classList.add('open');
  document.getElementById('videoSaveBtn').onclick = async () => {
    const url = document.getElementById('videoUrlInput').value.trim();
    videoUrls[exName] = url;
    await saveVideoUrls();
    renderVideoBody(exName);
    FiteApp.toast('Video link saved');
  };
}
function renderVideoBody(exName){
  const body = document.getElementById('videoBody');
  const url = videoUrls[exName];
  if (!navigator.onLine) {
    body.innerHTML = `<div class="video-frame"><div class="video-offline">Connect to the internet to watch video</div></div>`;
    return;
  }
  const embedId = url ? extractYouTubeId(url) : null;
  if (embedId) {
    body.innerHTML = `<div class="video-frame"><iframe src="https://www.youtube.com/embed/${embedId}" allowfullscreen title="${exName}"></iframe></div>`;
  } else {
    body.innerHTML = `<div class="video-frame"><div class="video-offline">No video linked yet — paste a YouTube URL below</div></div>`;
  }
}
function extractYouTubeId(url){
  const m = url.match(/(?:youtu\.be\/|v=|embed\/)([A-Za-z0-9_-]{6,})/);
  return m ? m[1] : null;
}

/* ---------------- History ---------------- */
async function openHistory(){
  const rows = await FiteDB.getAll('workoutLogs');
  const list = document.getElementById('historyList');
  if (!rows.length) {
    list.innerHTML = `<div class="empty"><div class="t">No workouts logged yet</div><div class="s">Finish a session to see it here.</div></div>`;
  } else {
    rows.sort((a,b) => b.key.localeCompare(a.key));
    list.innerHTML = rows.map(r => {
      const w = r.value;
      const doneCount = w.exercises.filter(e=>e.checked).length;
      return `<div class="hist-item">
        <div class="hist-date">${w.day} — ${w.title}</div>
        <div class="hist-sub">${new Date(r.key).toLocaleString()} · ${doneCount}/${w.exercises.length} exercises</div>
      </div>`;
    }).join('');
  }
  document.getElementById('historySheet').classList.add('open');
}

/* ---------------- Settings sheet ---------------- */
function initSettingsSheet(){
  document.getElementById('settingsBtn').addEventListener('click', async () => {
    const s = FiteApp.getSettings();
    document.getElementById('restDefaultInput').value = s.restTimerDefault;
    document.getElementById('gymReminderToggle').checked = !!s.sportsGymReminder;
    document.getElementById('settingsSheet').classList.add('open');
  });
  document.getElementById('settingsSaveBtn').addEventListener('click', async () => {
    const restDefault = parseInt(document.getElementById('restDefaultInput').value,10) || 90;
    const reminderOn = document.getElementById('gymReminderToggle').checked;
    await FiteApp.saveSettings({ restTimerDefault: restDefault, sportsGymReminder: reminderOn });
    document.getElementById('settingsSheet').classList.remove('open');
    FiteApp.toast('Settings saved');
    if (reminderOn) scheduleGymReminder();
  });
  document.getElementById('bgUploadInput').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const b64 = await new Promise((res)=>{ const r=new FileReader(); r.onload=()=>res(r.result); r.readAsDataURL(file); });
    const s = FiteApp.getSettings();
    const wallpapers = { ...s.wallpapers, sports: b64 };
    await FiteApp.saveSettings({ wallpapers });
    FiteApp.applyPageBackground('sports', document.getElementById('pageBg'));
    FiteApp.toast('Background updated');
  });
  document.getElementById('bgResetBtn').addEventListener('click', async () => {
    const s = FiteApp.getSettings();
    const wallpapers = { ...s.wallpapers };
    delete wallpapers.sports;
    await FiteApp.saveSettings({ wallpapers });
    document.getElementById('pageBg').style.backgroundImage = '';
    FiteApp.toast('Background reset');
  });
}

function scheduleGymReminder(){
  const [h,m] = ['17','00'];
  const now = new Date();
  const at = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 17, 0, 0);
  if (at < now) at.setDate(at.getDate()+1);
  FiteApp.scheduleNotification('Gym time', "Today's session is ready in Sports.", at);
}

/* ---------------- Sheet close bindings ---------------- */
function initSheetCloses(){
  [['videoSheet','videoCloseBtn'], ['historySheet',null], ['settingsSheet',null]].forEach(([sheetId, btnId]) => {
    const sheet = document.getElementById(sheetId);
    if (btnId) document.getElementById(btnId).addEventListener('click', ()=> sheet.classList.remove('open'));
    sheet.addEventListener('click', (e)=>{ if (e.target === sheet) sheet.classList.remove('open'); });
  });
  document.getElementById('historyBtn').addEventListener('click', openHistory);
}

(async function start(){
  document.getElementById('historyBtn').innerHTML = FiteApp.icon('history', 20);
  document.getElementById('settingsBtn').innerHTML = FiteApp.icon('gear', 20);
  const settings = await FiteApp.init('sports');
  FiteApp.applyPageBackground('sports', document.getElementById('pageBg'));
  await loadVideoUrls();
  currentDayIdx = todayDayIndex();
  initTabs();
  renderDayChips();
  renderExercises();
  renderFlex();
  renderPosture();
  initRestBar();
  initSheetCloses();
  initSettingsSheet();
  document.getElementById('finishBtn').addEventListener('click', finishWorkout);
})();
