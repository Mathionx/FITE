/* ==========================================================================
   FITE — foods.js
   ========================================================================== */

const DAY_NAMES = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
let currentDayIdx = 0;
let editingId = null;

function todayISO(){ return new Date().toISOString().slice(0,10); }
function todayDayIndex(){ const js = new Date().getDay(); return js===0?6:js-1; }

function uid(){ return 'f' + Date.now().toString(36) + Math.random().toString(36).slice(2,6); }

/* ---------------- Seeding ---------------- */
async function seedFoodsIfNeeded(){
  const existing = await FiteDB.getAll('foods');
  if (existing.length) return;
  for (let d = 0; d < PlanData.foodWeek.length; d++) {
    const dayPlan = PlanData.foodWeek[d];
    const items = [
      ...dayPlan.breakfast.map(name => ({ name, meal:'breakfast' })),
      ...PlanData.snackItems.map(name => ({ name, meal:'snack' })),
      ...dayPlan.dinner.map(name => ({ name, meal:'dinner' })),
    ];
    for (const it of items) {
      const macro = PlanData.macroDB[it.name] || { cal:0, protein:0, carbs:0, fat:0 };
      const id = uid();
      await FiteDB.put('foods', id, { id, day: DAY_NAMES[d], meal: it.meal, name: it.name, ...macro });
    }
  }
}

/* ---------------- Log (checked items for today) ---------------- */
async function getLog(){
  const row = await FiteDB.get('meta', 'foodlog:' + todayISO());
  return row || { ids: [] };
}
async function toggleLog(itemId){
  const log = await getLog();
  const i = log.ids.indexOf(itemId);
  if (i > -1) log.ids.splice(i,1); else log.ids.push(itemId);
  await FiteDB.put('meta', 'foodlog:' + todayISO(), log);
  await renderTotals();
}

/* ---------------- Rendering ---------------- */
function renderDayChips(){
  const holder = document.getElementById('foodDayChips');
  const todayIdx = todayDayIndex();
  holder.innerHTML = DAY_NAMES.map((name,i) => `
    <div class="day-chip ${i===currentDayIdx?'active':''}" data-i="${i}">${name.slice(0,3)}${i===todayIdx?' •':''}</div>
  `).join('');
  holder.querySelectorAll('.day-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      currentDayIdx = parseInt(chip.dataset.i,10);
      renderDayChips();
      renderMeals();
    });
  });
}

async function renderMeals(){
  const all = await FiteDB.getAll('foods');
  const dayItems = all.map(r=>r.value).filter(it => it.day === DAY_NAMES[currentDayIdx]);
  const log = await getLog();
  const meals = [
    { key:'breakfast', title:'Breakfast', time: FiteApp.getSettings().checklistTimes.meal1 },
    { key:'snack', title:'Snack', time: FiteApp.getSettings().checklistTimes.snack },
    { key:'dinner', title:'Dinner', time: FiteApp.getSettings().checklistTimes.dinner },
  ];
  const holder = document.getElementById('mealSections');
  holder.innerHTML = meals.map(m => {
    const items = dayItems.filter(it => it.meal === m.key);
    return `
      <div class="meal-block">
        <div class="meal-head"><div class="mh-title">${m.title}</div><div class="mh-time">${m.time}</div></div>
        ${items.map(it => foodItemHTML(it, log.ids.includes(it.id))).join('')}
        <div class="add-food-btn" data-meal="${m.key}">${FiteApp.icon('plus',15)} Add food</div>
      </div>`;
  }).join('');

  holder.querySelectorAll('.chk').forEach(chk => {
    chk.addEventListener('click', () => toggleLog(chk.dataset.id));
  });
  holder.querySelectorAll('.fi-edit').forEach(btn => {
    btn.addEventListener('click', () => openEdit(btn.dataset.id, all));
  });
  holder.querySelectorAll('.add-food-btn').forEach(btn => {
    btn.addEventListener('click', () => openAdd(btn.dataset.meal));
  });

  document.getElementById('mealRuleCard').textContent = PlanData.mealRule;
  renderTotals(log);
}

function foodItemHTML(it, checked){
  return `
    <div class="food-item">
      <div class="chk ${checked?'checked':''}" data-id="${it.id}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="m5 13 4 4L19 7"/></svg></div>
      <div class="fi-info">
        <div class="fi-name">${FiteApp.clean(it.name)}</div>
        <div class="fi-macro">${it.cal} kcal · P${it.protein} · C${it.carbs} · F${it.fat}</div>
      </div>
      <div class="fi-edit" data-id="${it.id}">${FiteApp.icon('gear',15)}</div>
    </div>`;
}

async function renderTotals(logParam){
  const log = logParam || await getLog();
  const all = await FiteDB.getAll('foods');
  const checkedItems = all.map(r=>r.value).filter(it => log.ids.includes(it.id));
  const totals = checkedItems.reduce((acc,it) => {
    acc.cal += Number(it.cal)||0; acc.protein += Number(it.protein)||0;
    acc.carbs += Number(it.carbs)||0; acc.fat += Number(it.fat)||0;
    return acc;
  }, { cal:0, protein:0, carbs:0, fat:0 });
  const goals = FiteApp.getSettings().macroGoals;
  const boxes = [
    { l:'Calories', v: totals.cal, g: goals.cal, unit:'' },
    { l:'Protein', v: totals.protein, g: goals.protein, unit:'g' },
    { l:'Carbs', v: totals.carbs, g: goals.carbs, unit:'g' },
    { l:'Fat', v: totals.fat, g: goals.fat, unit:'g' },
  ];
  document.getElementById('macroTotals').innerHTML = boxes.map(b => {
    const pct = Math.min(100, Math.round((b.v / (b.g||1)) * 100));
    return `<div class="macro-box">
      <div class="v">${b.v}${b.unit}</div>
      <div class="l">${b.l}</div>
      <div class="bar"><i style="width:${pct}%"></i></div>
    </div>`;
  }).join('');
}

/* ---------------- Edit / Add sheets ---------------- */
function openEdit(id, all){
  const item = (all || []).map(r=>r.value).find ? all.map(r=>r.value).find(x=>x.id===id) : null;
  editingId = id;
  FiteDB.get('foods', id).then(it => {
    document.getElementById('editTitle').textContent = 'Edit — ' + FiteApp.clean(it.name);
    document.getElementById('editName').value = it.name;
    document.getElementById('editCal').value = it.cal;
    document.getElementById('editProtein').value = it.protein;
    document.getElementById('editCarbs').value = it.carbs;
    document.getElementById('editFat').value = it.fat;
    document.getElementById('editSheet').classList.add('open');
  });
}
function initEditSheet(){
  document.getElementById('editSaveBtn').addEventListener('click', async () => {
    const it = await FiteDB.get('foods', editingId);
    it.name = document.getElementById('editName').value.trim() || it.name;
    it.cal = Number(document.getElementById('editCal').value)||0;
    it.protein = Number(document.getElementById('editProtein').value)||0;
    it.carbs = Number(document.getElementById('editCarbs').value)||0;
    it.fat = Number(document.getElementById('editFat').value)||0;
    await FiteDB.put('foods', it.id, it);
    document.getElementById('editSheet').classList.remove('open');
    FiteApp.toast('Food updated');
    renderMeals();
  });
  document.getElementById('editDeleteBtn').addEventListener('click', async () => {
    await FiteDB.del('foods', editingId);
    document.getElementById('editSheet').classList.remove('open');
    FiteApp.toast('Food removed');
    renderMeals();
  });
}

let addingMeal = 'breakfast';
function openAdd(meal){
  addingMeal = meal;
  document.getElementById('addMeal').value = meal;
  ['addName','addCal','addProtein','addCarbs','addFat'].forEach(id => document.getElementById(id).value = id==='addName' ? '' : 0);
  document.getElementById('addSheet').classList.add('open');
}
function initAddSheet(){
  document.getElementById('addSaveBtn').addEventListener('click', async () => {
    const name = document.getElementById('addName').value.trim();
    if (!name) { FiteApp.toast('Enter a food name'); return; }
    const id = uid();
    await FiteDB.put('foods', id, {
      id, day: DAY_NAMES[currentDayIdx], meal: document.getElementById('addMeal').value,
      name, cal:Number(document.getElementById('addCal').value)||0,
      protein:Number(document.getElementById('addProtein').value)||0,
      carbs:Number(document.getElementById('addCarbs').value)||0,
      fat:Number(document.getElementById('addFat').value)||0,
    });
    document.getElementById('addSheet').classList.remove('open');
    FiteApp.toast('Food added');
    renderMeals();
  });
}

/* ---------------- Fasting timer ---------------- */
function parseTimeToday(hhmm){
  const [h,m] = hhmm.split(':').map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d;
}
function tickFasting(){
  const s = FiteApp.getSettings();
  const start = parseTimeToday(s.fastingWindow.start);
  const end = parseTimeToday(s.fastingWindow.end);
  const now = new Date();
  document.getElementById('fastingWindowLabel').textContent = `Eating window: ${s.fastingWindow.start} – ${s.fastingWindow.end}`;
  let target, label, inWindow;
  if (now >= start && now < end) {
    target = end; label = 'Eating window closes in'; inWindow = true;
  } else {
    target = now < start ? start : new Date(start.getTime() + 24*60*60*1000);
    label = 'Fasting — eating opens in'; inWindow = false;
  }
  const diff = Math.max(0, target - now);
  const h = Math.floor(diff/3600000).toString().padStart(2,'0');
  const m = Math.floor((diff%3600000)/60000).toString().padStart(2,'0');
  const sec = Math.floor((diff%60000)/1000).toString().padStart(2,'0');
  document.getElementById('fastingState').textContent = label;
  document.getElementById('fastingCountdown').textContent = `${h}:${m}:${sec}`;

  const totalWindow = inWindow ? (end-start) : ( (now<start? start-parseTimeToday('00:00') : 0) || (24*3600000 - (end-start)) );
  const c = 2*Math.PI*29;
  const elapsedFrac = inWindow ? 1 - (diff / (end-start)) : 0;
  document.getElementById('fastRing').setAttribute('stroke-dasharray', c.toFixed(1));
  document.getElementById('fastRing').setAttribute('stroke-dashoffset', (c - Math.max(0,Math.min(1,elapsedFrac))*c).toFixed(1));
}

function scheduleFastingAlerts(){
  const s = FiteApp.getSettings();
  if (!s.fastAlertsEnabled) return;
  const start = parseTimeToday(s.fastingWindow.start);
  const end = parseTimeToday(s.fastingWindow.end);
  const now = new Date();
  if (start > now) FiteApp.scheduleNotification('Fasting window open', 'You can eat now — enjoy Meal 1.', start);
  if (end > now) FiteApp.scheduleNotification('Fasting window closed', 'Eating window is closed until tomorrow.', end);
}

/* ---------------- Settings ---------------- */
function initSettings(){
  document.getElementById('settingsBtn').addEventListener('click', () => {
    const s = FiteApp.getSettings();
    document.getElementById('fastStartInput').value = s.fastingWindow.start;
    document.getElementById('fastEndInput').value = s.fastingWindow.end;
    document.getElementById('fastAlertToggle').checked = !!s.fastAlertsEnabled;
    document.getElementById('goalCal').value = s.macroGoals.cal;
    document.getElementById('goalProtein').value = s.macroGoals.protein;
    document.getElementById('goalCarbs').value = s.macroGoals.carbs;
    document.getElementById('goalFat').value = s.macroGoals.fat;
    document.getElementById('settingsSheet').classList.add('open');
  });
  document.getElementById('settingsSaveBtn').addEventListener('click', async () => {
    await FiteApp.saveSettings({
      fastingWindow: { start: document.getElementById('fastStartInput').value, end: document.getElementById('fastEndInput').value },
      fastAlertsEnabled: document.getElementById('fastAlertToggle').checked,
      macroGoals: {
        cal: Number(document.getElementById('goalCal').value)||0,
        protein: Number(document.getElementById('goalProtein').value)||0,
        carbs: Number(document.getElementById('goalCarbs').value)||0,
        fat: Number(document.getElementById('goalFat').value)||0,
      }
    });
    document.getElementById('settingsSheet').classList.remove('open');
    FiteApp.toast('Settings saved');
    scheduleFastingAlerts();
    renderMeals();
  });
  document.getElementById('bgUploadInput').addEventListener('change', async (e) => {
    const file = e.target.files[0]; if (!file) return;
    const b64 = await new Promise(res=>{ const r=new FileReader(); r.onload=()=>res(r.result); r.readAsDataURL(file); });
    const s = FiteApp.getSettings();
    await FiteApp.saveSettings({ wallpapers: { ...s.wallpapers, foods: b64 } });
    FiteApp.applyPageBackground('foods', document.getElementById('pageBg'));
    FiteApp.toast('Background updated');
  });
  document.getElementById('bgResetBtn').addEventListener('click', async () => {
    const s = FiteApp.getSettings();
    const wallpapers = { ...s.wallpapers }; delete wallpapers.foods;
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
  document.getElementById('settingsBtn').innerHTML = FiteApp.icon('gear', 20);
  await FiteApp.init('foods');
  FiteApp.applyPageBackground('foods', document.getElementById('pageBg'));
  await seedFoodsIfNeeded();
  currentDayIdx = todayDayIndex();
  renderDayChips();
  await renderMeals();
  initEditSheet();
  initAddSheet();
  initSettings();
  initSheetCloses();
  tickFasting();
  setInterval(tickFasting, 1000);
  scheduleFastingAlerts();
})();
