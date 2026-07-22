/* ==========================================================================
   FITE — moneytracker.js
   Includes a small hand-rolled SVG pie chart so the page needs zero
   external charting library (guarantees full offline function).
   ========================================================================== */

let currentRange = 'week';
let entryType = 'expense';
const PALETTE = ['#1463F3','#12B886','#F5A623','#FF5D5D','#7C5CFC','#F0508E','#2CB67D','#5B8DF6'];

function uid(){ return 'm' + Date.now().toString(36) + Math.random().toString(36).slice(2,6); }

function categoryColor(cat){
  let h = 0;
  for (let i=0;i<cat.length;i++) h = (h*31 + cat.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

function inRange(dateStr, range){
  const d = new Date(dateStr+'T00:00:00');
  const now = new Date();
  if (range === 'all') return true;
  if (range === 'week') {
    const start = new Date(now); start.setDate(now.getDate() - now.getDay());
    start.setHours(0,0,0,0);
    return d >= start;
  }
  if (range === 'month') {
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }
  return true;
}

async function getEntries(){
  const rows = await FiteDB.getAll('moneyEntries');
  return rows.map(r=>r.value).sort((a,b)=> b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
}

async function render(){
  const all = await getEntries();
  const filtered = all.filter(e => inRange(e.date, currentRange));
  const s = FiteApp.getSettings();
  const cur = s.currencySymbol || '$';

  const income = filtered.filter(e=>e.type==='income').reduce((a,e)=>a+Number(e.amount),0);
  const expense = filtered.filter(e=>e.type==='expense').reduce((a,e)=>a+Number(e.amount),0);
  document.getElementById('totalIncome').textContent = cur + income.toFixed(2);
  document.getElementById('totalExpense').textContent = cur + expense.toFixed(2);
  document.getElementById('totalNet').textContent = cur + (income-expense).toFixed(2);

  renderChart(filtered.filter(e=>e.type==='expense'), cur);
  renderEntries(filtered, cur);
}

function renderChart(expenseEntries, cur){
  const holder = document.getElementById('chartHolder');
  if (!expenseEntries.length) {
    holder.innerHTML = `<div class="empty" style="padding:12px 0;"><div class="s">No expenses in this range yet.</div></div>`;
    return;
  }
  const byCat = {};
  expenseEntries.forEach(e => byCat[e.category||'Other'] = (byCat[e.category||'Other']||0) + Number(e.amount));
  const total = Object.values(byCat).reduce((a,b)=>a+b,0);
  const cats = Object.entries(byCat).sort((a,b)=>b[1]-a[1]);

  const R = 46, CX = 54, CY = 54;
  let angleStart = -90;
  const slices = cats.map(([cat,val]) => {
    const frac = val/total;
    const angleEnd = angleStart + frac*360;
    const path = describeArc(CX,CY,R,angleStart,angleEnd);
    angleStart = angleEnd;
    return `<path d="${path}" fill="${categoryColor(cat)}"></path>`;
  }).join('');

  const legend = cats.map(([cat,val]) => `
    <div class="legend-row">
      <div class="legend-dot" style="background:${categoryColor(cat)}"></div>
      <div class="legend-label">${cat}</div>
      <div class="legend-val">${cur}${val.toFixed(0)}</div>
    </div>`).join('');

  holder.innerHTML = `
    <svg width="108" height="108" viewBox="0 0 108 108">${slices}<circle cx="54" cy="54" r="24" fill="var(--surface)"/></svg>
    <div class="legend">${legend}</div>`;
}

function polarToCartesian(cx,cy,r,angleDeg){
  const a = (angleDeg-0) * Math.PI/180;
  return { x: cx + r*Math.cos(a), y: cy + r*Math.sin(a) };
}
function describeArc(cx,cy,r,startAngle,endAngle){
  if (endAngle - startAngle >= 359.999) endAngle = startAngle + 359.999; // avoid degenerate full circle
  const start = polarToCartesian(cx,cy,r,startAngle);
  const end = polarToCartesian(cx,cy,r,endAngle);
  const largeArc = endAngle-startAngle <= 180 ? 0 : 1;
  return `M ${cx} ${cy} L ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y} Z`;
}

function renderEntries(entries, cur){
  const holder = document.getElementById('entriesList');
  if (!entries.length) {
    holder.innerHTML = `<div class="empty"><div class="t">No entries in this range</div><div class="s">Tap + to add an income or expense.</div></div>`;
    return;
  }
  holder.innerHTML = entries.map(e => {
    const cat = e.category || 'Other';
    return `<div class="entry-item" data-id="${e.id}">
      <div class="entry-cat-dot" style="background:${categoryColor(cat)}">${cat.slice(0,1).toUpperCase()}</div>
      <div class="entry-info">
        <div class="entry-cat">${cat}</div>
        <div class="entry-note">${e.note ? e.note+' · ' : ''}${new Date(e.date+'T00:00:00').toLocaleDateString(undefined,{month:'short',day:'numeric'})}</div>
      </div>
      <div class="entry-amt ${e.type}">${e.type==='income'?'+':'-'}${cur}${Number(e.amount).toFixed(2)}</div>
      <div class="entry-del" data-del="${e.id}">${FiteApp.icon('close',15)}</div>
    </div>`;
  }).join('');
  holder.querySelectorAll('[data-del]').forEach(btn => {
    btn.addEventListener('click', async () => {
      await FiteDB.del('moneyEntries', btn.dataset.del);
      FiteApp.toast('Entry deleted');
      render();
    });
  });
}

/* ---------------- Range tabs ---------------- */
function initRangeTabs(){
  document.querySelectorAll('#rangeTabs .tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('#rangeTabs .tab').forEach(t=>t.classList.remove('active'));
      tab.classList.add('active');
      currentRange = tab.dataset.range;
      render();
    });
  });
}

/* ---------------- Add entry ---------------- */
function initAdd(){
  document.getElementById('addFab').innerHTML = FiteApp.icon('plus', 26);
  document.getElementById('addFab').addEventListener('click', () => {
    document.getElementById('entryAmount').value = '';
    document.getElementById('entryCategory').value = '';
    document.getElementById('entryNote').value = '';
    document.getElementById('entryDate').value = new Date().toISOString().slice(0,10);
    entryType = 'expense';
    document.querySelectorAll('#addSheet .tab').forEach(t=>t.classList.toggle('active', t.dataset.type==='expense'));
    document.getElementById('addSheet').classList.add('open');
  });
  document.querySelectorAll('#addSheet .tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('#addSheet .tab').forEach(t=>t.classList.remove('active'));
      tab.classList.add('active');
      entryType = tab.dataset.type;
    });
  });
  document.getElementById('entrySaveBtn').addEventListener('click', async () => {
    const amount = parseFloat(document.getElementById('entryAmount').value);
    if (!amount || amount <= 0) { FiteApp.toast('Enter a valid amount'); return; }
    const category = document.getElementById('entryCategory').value.trim() || 'Other';
    const note = document.getElementById('entryNote').value.trim();
    const date = document.getElementById('entryDate').value || new Date().toISOString().slice(0,10);
    const id = uid();
    await FiteDB.put('moneyEntries', id, { id, date, type: entryType, amount, category, note });
    document.getElementById('addSheet').classList.remove('open');
    FiteApp.toast('Entry saved');
    render();
  });
}

/* ---------------- Settings ---------------- */
function initSettings(){
  document.getElementById('settingsBtn').addEventListener('click', () => {
    const s = FiteApp.getSettings();
    document.getElementById('currencyInput').value = s.currencySymbol || '$';
    document.getElementById('settingsSheet').classList.add('open');
  });
  document.getElementById('settingsSaveBtn').addEventListener('click', async () => {
    const sym = document.getElementById('currencyInput').value.trim() || '$';
    await FiteApp.saveSettings({ currencySymbol: sym });
    document.getElementById('settingsSheet').classList.remove('open');
    FiteApp.toast('Settings saved');
    render();
  });
  document.getElementById('bgUploadInput').addEventListener('change', async (e) => {
    const file = e.target.files[0]; if (!file) return;
    const b64 = await new Promise(res=>{ const r=new FileReader(); r.onload=()=>res(r.result); r.readAsDataURL(file); });
    const s = FiteApp.getSettings();
    await FiteApp.saveSettings({ wallpapers: { ...s.wallpapers, money: b64 } });
    FiteApp.applyPageBackground('money', document.getElementById('pageBg'));
    FiteApp.toast('Background updated');
  });
  document.getElementById('bgResetBtn').addEventListener('click', async () => {
    const s = FiteApp.getSettings();
    const wallpapers = { ...s.wallpapers }; delete wallpapers.money;
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
  await FiteApp.init('money');
  FiteApp.applyPageBackground('money', document.getElementById('pageBg'));
  initRangeTabs();
  initAdd();
  initSettings();
  initSheetCloses();
  await render();
})();
