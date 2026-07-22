/* ==========================================================================
   FITE — checklist.js
   ========================================================================== */

function todayISO(){ return new Date().toISOString().slice(0,10); }
function uid(){ return 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2,6); }

function buildTemplateItems(times){
  return PlanData.dailySchedule.map(base => ({
    id: base.id,
    label: base.label,
    time: (times && times[base.id]) || base.time,
    done: false,
    custom: false
  }));
}

async function getOrCreateToday(){
  const key = todayISO();
  let day = await FiteDB.get('checklistDays', key);
  if (!day) {
    const times = FiteApp.getSettings().checklistTimes;
    day = { date: key, items: buildTemplateItems(times) };
    await FiteDB.put('checklistDays', key, day);
  }
  return day;
}

async function saveToday(day){
  await FiteDB.put('checklistDays', todayISO(), day);
}

function sortItems(items){
  return [...items].sort((a,b) => (a.time||'99:99').localeCompare(b.time||'99:99'));
}

async function render(){
  const day = await getOrCreateToday();
  const items = sortItems(day.items);
  const total = items.length;
  const done = items.filter(i=>i.done).length;
  const pct = total ? Math.round((done/total)*100) : 0;

  document.getElementById('progressTitle').textContent = pct===100 ? 'Perfect day' : `${done}/${total} completed`;
  document.getElementById('progressSub').textContent = pct===100 ? 'Every task done — great consistency.' : 'Stay consistent, one task at a time.';
  document.getElementById('progressPct').textContent = pct+'%';
  const c = 2*Math.PI*40;
  const ring = document.getElementById('progressRing');
  ring.setAttribute('stroke-dasharray', c.toFixed(1));
  ring.setAttribute('stroke-dashoffset', (c-(pct/100)*c).toFixed(1));

  const holder = document.getElementById('checklistItems');
  holder.innerHTML = items.map(it => `
    <div class="checkbox-row ${it.done?'done':''}" data-id="${it.id}">
      <div class="chk ${it.done?'checked':''}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="m5 13 4 4L19 7"/></svg></div>
      <div class="label">${FiteApp.clean(it.label)}${it.custom?'<span class="custom-tag">custom</span>':''}</div>
      <div class="row" style="gap:8px;">
        <div class="time">${it.time||''}</div>
        ${it.custom ? `<div class="item-del" data-del="${it.id}">${FiteApp.icon('close',14)}</div>` : ''}
      </div>
    </div>`).join('');

  holder.querySelectorAll('.chk').forEach(chk => {
    chk.addEventListener('click', async () => {
      const id = chk.closest('.checkbox-row').dataset.id;
      const item = day.items.find(i=>i.id===id);
      item.done = !item.done;
      await saveToday(day);
      render();
    });
  });
  holder.querySelectorAll('[data-del]').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = btn.dataset.del;
      day.items = day.items.filter(i=>i.id!==id);
      await saveToday(day);
      render();
    });
  });
}

function initAdd(){
  document.getElementById('addItemBtn').addEventListener('click', () => {
    document.getElementById('addLabel').value = '';
    document.getElementById('addTime').value = '';
    document.getElementById('addSheet').classList.add('open');
  });
  document.getElementById('addSaveBtn').addEventListener('click', async () => {
    const label = document.getElementById('addLabel').value.trim();
    if (!label) { FiteApp.toast('Enter a task name'); return; }
    const time = document.getElementById('addTime').value;
    const day = await getOrCreateToday();
    day.items.push({ id: uid(), label, time, done:false, custom:true });
    await saveToday(day);
    document.getElementById('addSheet').classList.remove('open');
    FiteApp.toast('Task added');
    render();
  });
}

/* ---------------- History ---------------- */
async function openHistory(){
  const rows = await FiteDB.getAll('checklistDays');
  rows.sort((a,b) => b.key.localeCompare(a.key));
  const list = document.getElementById('historyList');
  if (!rows.length) {
    list.innerHTML = `<div class="empty"><div class="t">No history yet</div></div>`;
  } else {
    list.innerHTML = rows.map(r => {
      const items = r.value.items;
      const pct = items.length ? Math.round((items.filter(i=>i.done).length/items.length)*100) : 0;
      const d = new Date(r.key+'T00:00:00');
      return `<div class="hist-day-row" data-date="${r.key}">
        <div class="hist-day-date">${d.toLocaleDateString(undefined,{weekday:'short', month:'short', day:'numeric'})}</div>
        <div class="hist-day-pct">${pct}%</div>
      </div>`;
    }).join('');
    list.querySelectorAll('.hist-day-row').forEach(row => {
      row.addEventListener('click', () => openHistoryDay(row.dataset.date));
    });
  }
  document.getElementById('historySheet').classList.add('open');
}
async function openHistoryDay(date){
  const day = await FiteDB.get('checklistDays', date);
  const d = new Date(date+'T00:00:00');
  document.getElementById('historyDayTitle').textContent = d.toLocaleDateString(undefined,{weekday:'long', month:'long', day:'numeric'});
  document.getElementById('historyDayItems').innerHTML = sortItems(day.items).map(it => `
    <div class="checkbox-row ${it.done?'done':''}">
      <div class="chk ${it.done?'checked':''}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="m5 13 4 4L19 7"/></svg></div>
      <div class="label">${FiteApp.clean(it.label)}</div>
      <div class="time">${it.time||''}</div>
    </div>`).join('');
  document.getElementById('historyDaySheet').classList.add('open');
}

/* ---------------- Settings ---------------- */
const TIME_LABELS = { wake:'Wake up', water:'Drink water', walk:'Morning walk', study1:'Study block',
  meal1:'Meal 1', snack:'Snack', gym:'Gym', dinner:'Dinner', milk:'Milk / yogurt', flex:'Flexibility', sleep:'Sleep' };

function initSettings(){
  document.getElementById('settingsBtn').addEventListener('click', () => {
    const times = FiteApp.getSettings().checklistTimes;
    document.getElementById('timeInputs').innerHTML = Object.keys(TIME_LABELS).map(key => `
      <div class="time-input-row">
        <label>${TIME_LABELS[key]}</label>
        <input type="time" data-key="${key}" value="${times[key]||''}">
      </div>`).join('');
    document.getElementById('settingsSheet').classList.add('open');
  });
  document.getElementById('settingsSaveBtn').addEventListener('click', async () => {
    const times = {};
    document.querySelectorAll('#timeInputs input').forEach(inp => times[inp.dataset.key] = inp.value);
    await FiteApp.saveSettings({ checklistTimes: times });
    // rebuild today's non-custom item times
    const day = await getOrCreateToday();
    day.items.forEach(it => { if (!it.custom && times[it.id]) it.time = times[it.id]; });
    await saveToday(day);
    document.getElementById('settingsSheet').classList.remove('open');
    FiteApp.toast('Checklist updated');
    render();
  });
  document.getElementById('bgUploadInput').addEventListener('change', async (e) => {
    const file = e.target.files[0]; if (!file) return;
    const b64 = await new Promise(res=>{ const r=new FileReader(); r.onload=()=>res(r.result); r.readAsDataURL(file); });
    const s = FiteApp.getSettings();
    await FiteApp.saveSettings({ wallpapers: { ...s.wallpapers, checklist: b64 } });
    FiteApp.applyPageBackground('checklist', document.getElementById('pageBg'));
    FiteApp.toast('Background updated');
  });
  document.getElementById('bgResetBtn').addEventListener('click', async () => {
    const s = FiteApp.getSettings();
    const wallpapers = { ...s.wallpapers }; delete wallpapers.checklist;
    await FiteApp.saveSettings({ wallpapers });
    document.getElementById('pageBg').style.backgroundImage = '';
    FiteApp.toast('Background reset');
  });
}

function initSheetCloses(){
  document.querySelectorAll('.overlay').forEach(sheet => {
    sheet.addEventListener('click', (e) => { if (e.target === sheet) sheet.classList.remove('open'); });
  });
  document.getElementById('historyBtn').addEventListener('click', openHistory);
}

function setDateLabel(){
  document.getElementById('dateLabel').textContent = new Date().toLocaleDateString(undefined,{weekday:'long', month:'long', day:'numeric'});
}

(async function start(){
  document.getElementById('historyBtn').innerHTML = historyGlyph();
  document.getElementById('settingsBtn').innerHTML = FiteApp.icon('gear', 20);
  await FiteApp.init('checklist');
  FiteApp.applyPageBackground('checklist', document.getElementById('pageBg'));
  setDateLabel();
  initAdd();
  initSettings();
  initSheetCloses();
  await render();
})();

function historyGlyph(){
  return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 5v5h5"/><path d="M12 7v5l4 2"/></svg>`;
}
