/* =============================================
   STUDENT SAVINGS SYSTEM — app.js
   โรงเรียนบ้านใหม่
   ============================================= */

// -------- STATE --------
let GAS_URL = localStorage.getItem('gas_url') || 'https://script.google.com/macros/s/AKfycbwySJbG6rm6BP5fq4QhTC3R9XVlIfTIxTxE_Ckvh6MAzfTOTKl-t664wcVwm0mIDS4/exec';
let students = JSON.parse(localStorage.getItem('students') || '[]');
let transactions = JSON.parse(localStorage.getItem('transactions') || '[]');
let chartBar = null;
let chartLine = null;

// -------- INIT --------
window.addEventListener('DOMContentLoaded', () => {
  setTodayDate();
  populateClassFilters();
  renderDashboard();
  renderTransactions();
  renderStudentsTable();
  renderReport();
  populateReportMonths();
  document.getElementById('gasUrl').value = GAS_URL;
  document.getElementById('reportMonth').addEventListener('change', renderReport);
  if (GAS_URL) syncData();
});

function setTodayDate() {
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('txDate').value = today;
}

// -------- NAVIGATION --------
function showPage(name) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById('page-' + name).classList.add('active');
  document.querySelector(`[data-page="${name}"]`).classList.add('active');
  const titles = { dashboard: 'หน้าหลัก', deposit: 'ฝาก / ถอนเงิน', students: 'จัดการนักเรียน', report: 'รายงาน' };
  document.getElementById('pageTitle').textContent = titles[name] || name;
  if (name === 'dashboard') renderDashboard();
  if (name === 'deposit') renderTransactions();
  if (name === 'students') renderStudentsTable();
  if (name === 'report') renderReport();
  // close sidebar on mobile
  if (window.innerWidth <= 700) document.getElementById('sidebar').classList.remove('open');
}

function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
}

// -------- CLASS FILTERS --------
function getClasses() {
  return [...new Set(students.map(s => s.class))].sort();
}

function populateClassFilters() {
  const classes = getClasses();
  const selectors = ['dashFilterClass','txClass','studentFilterClass','reportClass'];
  selectors.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    const val = el.value;
    const first = el.options[0].outerHTML;
    el.innerHTML = first;
    classes.forEach(c => {
      const o = document.createElement('option');
      o.value = c; o.textContent = c;
      el.appendChild(o);
    });
    if (val) el.value = val;
  });
}

function filterStudentDropdown() {
  const cls = document.getElementById('txClass').value;
  const sel = document.getElementById('txStudent');
  sel.innerHTML = '<option value="">— เลือกนักเรียน —</option>';
  const list = cls ? students.filter(s => s.class === cls) : students;
  list.sort((a,b) => a.id.localeCompare(b.id, undefined, {numeric:true}))
    .forEach(s => {
      const o = document.createElement('option');
      o.value = s.rowIndex;
      o.textContent = `${s.id} — ${s.firstName} ${s.lastName}`;
      sel.appendChild(o);
    });
}

// -------- BALANCE CALC --------
function getBalance(rowIndex) {
  return transactions
    .filter(t => String(t.studentRowIndex) === String(rowIndex))
    .reduce((acc, t) => acc + (t.type === 'deposit' ? t.amount : -t.amount), 0);
}

function getDepositCount(rowIndex, month) {
  // month = 'YYYY-MM' or undefined (all)
  return transactions.filter(t => {
    if (String(t.studentRowIndex) !== String(rowIndex)) return false;
    if (t.type !== 'deposit') return false;
    if (month && !t.date.startsWith(month)) return false;
    return true;
  }).length;
}

// -------- DASHBOARD --------
function renderDashboard() {
  const cls = document.getElementById('dashFilterClass')?.value || '';
  const filtered = cls ? students.filter(s => s.class === cls) : students;

  const total = filtered.reduce((a, s) => a + getBalance(s.rowIndex), 0);
  const now = new Date();
  const mon = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
  const monthTx = transactions.filter(t => t.date && t.date.startsWith(mon)).length;

  const balances = filtered.map(s => ({ s, b: getBalance(s.rowIndex) })).sort((a,b) => b.b - a.b);
  const top = balances[0];

  document.getElementById('statTotal').textContent = '฿' + fmt(total);
  document.getElementById('statStudents').textContent = filtered.length + ' คน';
  document.getElementById('statMonthTx').textContent = monthTx + ' ครั้ง';
  document.getElementById('statTopSaver').textContent = top ? `${top.s.firstName} ฿${fmt(top.b)}` : '—';

  renderBarChart(balances.slice(0, 30));
  renderLineChart(cls);
  renderRecentTable(cls);
}

function renderBarChart(balances) {
  const labels = balances.map(b => b.s.firstName);
  const data   = balances.map(b => b.b);
  const ctx    = document.getElementById('chartBar').getContext('2d');
  const minW   = Math.max(labels.length * 36, 400);
  document.getElementById('chartBar').style.width = minW + 'px';
  document.getElementById('chartBar').width = minW;

  if (chartBar) chartBar.destroy();
  chartBar = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'ยอดเงิน (บาท)',
        data,
        backgroundColor: data.map((v,i) => i === 0 ? '#00d68f' : 'rgba(79,156,249,0.55)'),
        borderRadius: 5,
      }]
    },
    options: {
      responsive: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { color: '#7c849a', font: { family: 'Sarabun', size: 11 } }, grid: { color: 'rgba(255,255,255,0.04)' } },
        y: { ticks: { color: '#7c849a', font: { family: 'IBM Plex Mono', size: 11 } }, grid: { color: 'rgba(255,255,255,0.07)' } }
      }
    }
  });
}

function renderLineChart(cls) {
  // Monthly deposit counts for last 8 months
  const months = [];
  const now = new Date();
  for (let i = 7; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`);
  }
  const filterSt = cls ? students.filter(s => s.class === cls).map(s => String(s.rowIndex)) : null;
  const counts = months.map(m =>
    transactions.filter(t => t.date && t.date.startsWith(m) && t.type === 'deposit' &&
      (!filterSt || filterSt.includes(String(t.studentRowIndex)))).length
  );
  const labels = months.map(m => {
    const [y, mo] = m.split('-');
    const thMonths = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
    return thMonths[parseInt(mo)-1] + ' ' + (parseInt(y)+543).toString().slice(-2);
  });

  const ctx = document.getElementById('chartLine').getContext('2d');
  if (chartLine) chartLine.destroy();
  chartLine = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'ครั้งที่ฝาก',
        data: counts,
        borderColor: '#f5c842',
        backgroundColor: 'rgba(245,200,66,0.1)',
        tension: 0.35, fill: true,
        pointBackgroundColor: '#f5c842',
        pointRadius: 4,
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { labels: { color: '#7c849a', font: { family: 'Sarabun', size: 11 } } } },
      scales: {
        x: { ticks: { color: '#7c849a', font: { family: 'Sarabun', size: 10 } }, grid: { color: 'rgba(255,255,255,0.04)' } },
        y: { ticks: { color: '#7c849a', font: { family: 'IBM Plex Mono', size: 11 }, stepSize: 1 }, grid: { color: 'rgba(255,255,255,0.07)' } }
      }
    }
  });
}

function renderRecentTable(cls) {
  const tbody = document.getElementById('recentTbody');
  let tx = [...transactions].sort((a,b) => new Date(b.date) - new Date(a.date)).slice(0, 20);
  if (cls) tx = tx.filter(t => {
    const s = students.find(s => String(s.rowIndex) === String(t.studentRowIndex));
    return s && s.class === cls;
  });
  tbody.innerHTML = tx.map(t => {
    const s = students.find(s => String(s.rowIndex) === String(t.studentRowIndex));
    const bal = s ? getBalance(s.rowIndex) : 0;
    return `<tr>
      <td>${formatDateTH(t.date)}</td>
      <td>${s?.class||'—'}</td>
      <td>${s?.id||'—'}</td>
      <td>${s ? s.firstName+' '+s.lastName : '—'}</td>
      <td><span class="badge badge-${t.type}">${t.type==='deposit'?'ฝาก':'ถอน'}</span></td>
      <td class="${t.type==='deposit'?'amount-pos':'amount-neg'}">${t.type==='deposit'?'+':'-'}${fmt(t.amount)}</td>
      <td class="amount-neutral">฿${fmt(bal)}</td>
    </tr>`;
  }).join('') || '<tr><td colspan="7" class="empty-state">ยังไม่มีรายการ</td></tr>';
}

// -------- DEPOSIT / WITHDRAW --------
function submitTransaction() {
  const studentRowIndex = document.getElementById('txStudent').value;
  const type = document.querySelector('input[name="txType"]:checked').value;
  const amount = parseFloat(document.getElementById('txAmount').value);
  const date = document.getElementById('txDate').value;
  const note = document.getElementById('txNote').value;

  if (!studentRowIndex) return showToast('กรุณาเลือกนักเรียน', 'error');
  if (!amount || amount <= 0) return showToast('กรุณาระบุจำนวนเงิน', 'error');
  if (!date) return showToast('กรุณาระบุวันที่', 'error');

  const bal = getBalance(studentRowIndex);
  if (type === 'withdraw' && amount > bal) return showToast('ยอดเงินไม่เพียงพอ', 'error');

  const tx = {
    id: Date.now().toString(),
    studentRowIndex,
    type, amount, date, note,
    createdAt: new Date().toISOString()
  };
  transactions.unshift(tx);
  saveLocal();
  renderTransactions();
  renderDashboard();

  document.getElementById('txAmount').value = '';
  document.getElementById('txNote').value = '';
  showToast(type === 'deposit' ? `ฝากเงิน ฿${fmt(amount)} สำเร็จ` : `ถอนเงิน ฿${fmt(amount)} สำเร็จ`, 'success');

  if (GAS_URL) pushTransaction(tx);
}

function renderTransactions() {
  const query = document.getElementById('txSearch')?.value.toLowerCase() || '';
  const tbody = document.getElementById('txTbody');
  let tx = [...transactions].sort((a,b) => new Date(b.date) - new Date(a.date));
  if (query) {
    tx = tx.filter(t => {
      const s = students.find(s => String(s.rowIndex) === String(t.studentRowIndex));
      return s && (s.firstName+' '+s.lastName).toLowerCase().includes(query);
    });
  }
  tbody.innerHTML = tx.slice(0, 100).map(t => {
    const s = students.find(s => String(s.rowIndex) === String(t.studentRowIndex));
    const bal = s ? getBalance(s.rowIndex) : 0;
    return `<tr>
      <td>${formatDateTH(t.date)}</td>
      <td>${s?.class||'—'}</td>
      <td>${s ? s.firstName+' '+s.lastName : '—'}</td>
      <td><span class="badge badge-${t.type}">${t.type==='deposit'?'ฝาก':'ถอน'}</span></td>
      <td class="${t.type==='deposit'?'amount-pos':'amount-neg'}">${t.type==='deposit'?'+':'-'}${fmt(t.amount)}</td>
      <td class="amount-neutral">฿${fmt(bal)}</td>
      <td><button class="btn-del btn-sm" onclick="deleteTransaction('${t.id}')">ลบ</button></td>
    </tr>`;
  }).join('') || '<tr><td colspan="7" class="empty-state">ยังไม่มีรายการ</td></tr>';
}

function deleteTransaction(id) {
  if (!confirm('ยืนยันลบรายการนี้?')) return;
  transactions = transactions.filter(t => t.id !== id);
  saveLocal();
  renderTransactions();
  renderDashboard();
  showToast('ลบรายการแล้ว', 'info');
}

// -------- STUDENTS --------
let editingStudentRowIndex = null;

function openStudentModal(rowIndex) {
  editingStudentRowIndex = rowIndex || null;
  document.getElementById('studentModalTitle').textContent = rowIndex ? 'แก้ไขนักเรียน' : 'เพิ่มนักเรียน';
  if (rowIndex) {
    const s = students.find(s => String(s.rowIndex) === String(rowIndex));
    document.getElementById('sClass').value = s.class;
    document.getElementById('sId').value = s.id;
    document.getElementById('sFirstName').value = s.firstName;
    document.getElementById('sLastName').value = s.lastName;
  } else {
    document.getElementById('sClass').value = '';
    document.getElementById('sId').value = '';
    document.getElementById('sFirstName').value = '';
    document.getElementById('sLastName').value = '';
  }
  document.getElementById('studentModal').classList.add('open');
}
function closeStudentModal() { document.getElementById('studentModal').classList.remove('open'); }

function saveStudent() {
  const cls       = document.getElementById('sClass').value.trim();
  const id        = document.getElementById('sId').value.trim();
  const firstName = document.getElementById('sFirstName').value.trim();
  const lastName  = document.getElementById('sLastName').value.trim();
  if (!cls || !id || !firstName || !lastName) return showToast('กรุณากรอกข้อมูลให้ครบ', 'error');

  if (editingStudentRowIndex) {
    const idx = students.findIndex(s => String(s.rowIndex) === String(editingStudentRowIndex));
    if (idx >= 0) students[idx] = { ...students[idx], class: cls, id, firstName, lastName };
    showToast('แก้ไขข้อมูลนักเรียนแล้ว', 'success');
  } else {
    const rowIndex = Date.now().toString();
    students.push({ rowIndex, class: cls, id, firstName, lastName });
    showToast('เพิ่มนักเรียนแล้ว', 'success');
  }
  saveLocal();
  populateClassFilters();
  filterStudentDropdown();
  renderStudentsTable();
  closeStudentModal();
  if (GAS_URL) pushStudents();
}

function deleteStudent(rowIndex) {
  const s = students.find(s => String(s.rowIndex) === String(rowIndex));
  if (!confirm(`ลบ ${s?.firstName} ${s?.lastName} ?\n(ประวัติการฝากเงินจะถูกลบด้วย)`)) return;
  students = students.filter(s => String(s.rowIndex) !== String(rowIndex));
  transactions = transactions.filter(t => String(t.studentRowIndex) !== String(rowIndex));
  saveLocal();
  populateClassFilters();
  renderStudentsTable();
  renderDashboard();
  showToast('ลบนักเรียนแล้ว', 'info');
  if (GAS_URL) pushStudents();
}

function renderStudentsTable() {
  const cls = document.getElementById('studentFilterClass')?.value || '';
  const q   = (document.getElementById('studentSearch')?.value || '').toLowerCase();
  const tbody = document.getElementById('studentTbody');

  let list = cls ? students.filter(s => s.class === cls) : [...students];
  if (q) list = list.filter(s => (s.firstName+' '+s.lastName+' '+s.id).toLowerCase().includes(q));
  list.sort((a,b) => a.class.localeCompare(b.class) || a.id.localeCompare(b.id, undefined, {numeric:true}));

  const now = new Date();
  const thisMon = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;

  tbody.innerHTML = list.map(s => {
    const bal   = getBalance(s.rowIndex);
    const cnt   = transactions.filter(t => String(t.studentRowIndex) === String(s.rowIndex) && t.type === 'deposit').length;
    const last  = transactions.filter(t => String(t.studentRowIndex) === String(s.rowIndex))
                    .sort((a,b) => new Date(b.date) - new Date(a.date))[0];
    return `<tr>
      <td>${s.class}</td>
      <td>${s.id}</td>
      <td>${s.firstName} ${s.lastName}</td>
      <td class="${bal>=0?'amount-pos':'amount-neg'}">฿${fmt(bal)}</td>
      <td class="amount-neutral">${cnt} ครั้ง</td>
      <td>${last ? formatDateTH(last.date) : '—'}</td>
      <td style="display:flex;gap:5px;flex-wrap:wrap">
        <button class="btn-tx btn-sm" onclick="quickDeposit('${s.rowIndex}')">฿ ฝาก</button>
        <button class="btn-edit" onclick="openStudentModal('${s.rowIndex}')">แก้ไข</button>
        <button class="btn-del"  onclick="deleteStudent('${s.rowIndex}')">ลบ</button>
      </td>
    </tr>`;
  }).join('') || '<tr><td colspan="7" class="empty-state">ไม่พบข้อมูลนักเรียน</td></tr>';
}

function quickDeposit(rowIndex) {
  const s = students.find(s => String(s.rowIndex) === String(rowIndex));
  showPage('deposit');
  const clsEl = document.getElementById('txClass');
  clsEl.value = s.class;
  filterStudentDropdown();
  document.getElementById('txStudent').value = rowIndex;
  document.querySelector('input[name="txType"][value="deposit"]').checked = true;
  document.getElementById('txAmount').focus();
}

// -------- REPORT --------
function populateReportMonths() {
  const months = [...new Set(transactions.map(t => t.date?.slice(0,7)))].filter(Boolean).sort().reverse();
  const sel = document.getElementById('reportMonth');
  months.forEach(m => {
    const o = document.createElement('option');
    o.value = m;
    const [y,mo] = m.split('-');
    const thMonths = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];
    o.textContent = thMonths[parseInt(mo)-1] + ' ' + (parseInt(y)+543);
    sel.appendChild(o);
  });
}

function filterReportStudents() {
  const cls = document.getElementById('reportClass').value;
  const sel = document.getElementById('reportStudent');
  sel.innerHTML = '<option value="">— รายชั้น —</option>';
  const list = cls ? students.filter(s => s.class === cls) : students;
  list.sort((a,b) => a.id.localeCompare(b.id, undefined, {numeric:true}))
    .forEach(s => {
      const o = document.createElement('option');
      o.value = s.rowIndex;
      o.textContent = `${s.id} — ${s.firstName} ${s.lastName}`;
      sel.appendChild(o);
    });
}

document.addEventListener('change', e => {
  if (e.target.id === 'reportClass') { filterReportStudents(); renderReport(); }
  if (e.target.id === 'reportStudent') renderReport();
});

function renderReport() {
  const cls      = document.getElementById('reportClass')?.value || '';
  const stuRI    = document.getElementById('reportStudent')?.value || '';
  const month    = document.getElementById('reportMonth')?.value || '';
  const content  = document.getElementById('reportContent');
  if (!content) return;

  let html = '';
  const printDate = `พิมพ์วันที่ ${formatDateTH(new Date().toISOString().split('T')[0])}`;

  if (stuRI) {
    // Individual report
    const s = students.find(s => String(s.rowIndex) === String(stuRI));
    if (!s) return;
    let txList = transactions.filter(t => String(t.studentRowIndex) === String(stuRI));
    if (month) txList = txList.filter(t => t.date?.startsWith(month));
    txList.sort((a,b) => new Date(a.date) - new Date(b.date));
    const bal = getBalance(s.rowIndex);

    html += `<div class="report-section card">
      <div style="padding:18px">
      <div class="report-title">รายงานส่วนบุคคล — ${s.firstName} ${s.lastName}</div>
      <div class="report-meta">ชั้น: ${s.class} | เลขประจำตัว: ${s.id} | ${printDate}</div>
      <div class="stats-grid" style="margin-bottom:16px">
        <div class="stat-card accent-green">
          <div class="stat-label">ยอดคงเหลือ</div>
          <div class="stat-value">฿${fmt(bal)}</div>
        </div>
        <div class="stat-card accent-blue">
          <div class="stat-label">ครั้งที่ฝากรวม</div>
          <div class="stat-value">${txList.filter(t=>t.type==='deposit').length} ครั้ง</div>
        </div>
        <div class="stat-card accent-yellow">
          <div class="stat-label">ยอดฝากรวม</div>
          <div class="stat-value">฿${fmt(txList.filter(t=>t.type==='deposit').reduce((a,t)=>a+t.amount,0))}</div>
        </div>
        <div class="stat-card accent-purple">
          <div class="stat-label">ยอดถอนรวม</div>
          <div class="stat-value">฿${fmt(txList.filter(t=>t.type==='withdraw').reduce((a,t)=>a+t.amount,0))}</div>
        </div>
      </div>
      <table class="data-table">
        <thead><tr><th>วันที่</th><th>ประเภท</th><th>จำนวน</th><th>หมายเหตุ</th></tr></thead>
        <tbody>
          ${txList.map(t => `<tr>
            <td>${formatDateTH(t.date)}</td>
            <td><span class="badge badge-${t.type}">${t.type==='deposit'?'ฝาก':'ถอน'}</span></td>
            <td class="${t.type==='deposit'?'amount-pos':'amount-neg'}">${t.type==='deposit'?'+':'-'}฿${fmt(t.amount)}</td>
            <td>${t.note||'—'}</td>
          </tr>`).join('')}
        </tbody>
      </table>
      </div>
    </div>`;
  } else {
    // Class / all report
    const clsList = cls ? [cls] : getClasses();
    if (clsList.length === 0) {
      html = '<div class="card"><div style="padding:20px" class="empty-state">ยังไม่มีข้อมูลนักเรียน</div></div>';
    }

    clsList.forEach(c => {
      const stuList = students.filter(s => s.class === c)
        .sort((a,b) => a.id.localeCompare(b.id, undefined, {numeric:true}));

      // Monthly deposit counts
      const allMonths = [...new Set(transactions.map(t => t.date?.slice(0,7)))].filter(Boolean).sort();
      const thMonths = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];

      // Summary per student
      html += `<div class="report-section card">
        <div style="padding:18px">
        <div class="report-title">ชั้น ${c}</div>
        <div class="report-meta">${printDate} | นักเรียน ${stuList.length} คน</div>
        <table class="data-table">
          <thead>
            <tr>
              <th>เลขที่</th><th>เลขประจำตัว</th><th>ชื่อ-นามสกุล</th>
              <th>ยอดคงเหลือ</th><th>ครั้งที่ฝาก</th>
              ${allMonths.map(m => {
                const [y,mo] = m.split('-');
                return `<th>${thMonths[parseInt(mo)-1]}</th>`;
              }).join('')}
            </tr>
          </thead>
          <tbody>
            ${stuList.map((s,i) => {
              const bal = getBalance(s.rowIndex);
              const total = transactions.filter(t => String(t.studentRowIndex)===String(s.rowIndex) && t.type==='deposit').length;
              const monthlyCols = allMonths.map(m => {
                const cnt = getDepositCount(s.rowIndex, m);
                return `<td style="text-align:center">${cnt||'—'}</td>`;
              }).join('');
              return `<tr>
                <td>${i+1}</td>
                <td>${s.id}</td>
                <td>${s.firstName} ${s.lastName}</td>
                <td class="${bal>=0?'amount-pos':'amount-neg'}">฿${fmt(bal)}</td>
                <td style="text-align:center">${total}</td>
                ${monthlyCols}
              </tr>`;
            }).join('')}
          </tbody>
          <tfoot>
            <tr style="font-weight:700">
              <td colspan="3">รวมชั้น ${c}</td>
              <td class="amount-pos">฿${fmt(stuList.reduce((a,s)=>a+getBalance(s.rowIndex),0))}</td>
              <td style="text-align:center">${stuList.reduce((a,s)=>a+transactions.filter(t=>String(t.studentRowIndex)===String(s.rowIndex)&&t.type==='deposit').length,0)}</td>
              ${allMonths.map(m => {
                const cnt = stuList.reduce((a,s)=>a+getDepositCount(s.rowIndex,m),0);
                return `<td style="text-align:center;color:var(--yellow)">${cnt||'—'}</td>`;
              }).join('')}
            </tr>
          </tfoot>
        </table>
        </div>
      </div>`;
    });
  }

  content.innerHTML = html;
}

// -------- SETTINGS --------
function showSettings() { document.getElementById('settingsModal').classList.add('open'); }
function closeSettings() { document.getElementById('settingsModal').classList.remove('open'); }

function saveSettings() {
  const url = document.getElementById('gasUrl').value.trim();
  if (!url) return showToast('กรุณากรอก URL', 'error');
  GAS_URL = url;
  localStorage.setItem('gas_url', url);
  closeSettings();
  showToast('บันทึก URL แล้ว กำลังซิงค์...', 'info');
  syncData();
}

// -------- SYNC / GAS API --------
function setSyncStatus(status) {
  const el = document.getElementById('syncStatus');
  const icons = { ok: 'dot-green', loading: 'dot-yellow', error: 'dot-red', idle: 'dot-gray' };
  const labels = { ok: 'ซิงค์แล้ว', loading: 'กำลังซิงค์...', error: 'เชื่อมต่อไม่ได้', idle: 'ยังไม่เชื่อมต่อ' };
  el.innerHTML = `<span class="dot ${icons[status]}"></span> ${labels[status]}`;
}

async function syncData() {
  if (!GAS_URL) return;
  setSyncStatus('loading');
  try {
    const res = await fetch(GAS_URL + '?action=getAll');
    const data = await res.json();
    if (data.students)     { students = data.students; }
    if (data.transactions) { transactions = data.transactions; }
    saveLocal();
    populateClassFilters();
    filterStudentDropdown();
    populateReportMonths();
    renderDashboard();
    renderTransactions();
    renderStudentsTable();
    renderReport();
    setSyncStatus('ok');
    showToast('ซิงค์ข้อมูลสำเร็จ', 'success');
  } catch(e) {
    setSyncStatus('error');
    showToast('เชื่อมต่อ Google Sheets ไม่ได้', 'error');
  }
}

async function pushTransaction(tx) {
  if (!GAS_URL) return;
  try {
    await fetch(GAS_URL, {
      method: 'POST',
      body: JSON.stringify({ action: 'addTransaction', data: tx })
    });
  } catch(e) { console.warn('Push TX failed', e); }
}

async function pushStudents() {
  if (!GAS_URL) return;
  try {
    await fetch(GAS_URL, {
      method: 'POST',
      body: JSON.stringify({ action: 'updateStudents', data: students })
    });
  } catch(e) { console.warn('Push students failed', e); }
}

// -------- UTILS --------
function fmt(n) {
  return Number(n||0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDateTH(dateStr) {
  if (!dateStr) return '—';
  const [y,m,d] = dateStr.split('T')[0].split('-');
  const thMonths = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
  return `${parseInt(d)} ${thMonths[parseInt(m)-1]} ${parseInt(y)+543}`;
}

function saveLocal() {
  localStorage.setItem('students', JSON.stringify(students));
  localStorage.setItem('transactions', JSON.stringify(transactions));
}

let toastTimer;
function showToast(msg, type = 'info') {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = 'toast show ' + type;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 3000);
}

// -------- DEMO DATA (remove in production) --------
if (!localStorage.getItem('students')) {
  const demo = [
    { rowIndex:'1', class:'ป.2/1', id:'001', firstName:'สมชาย', lastName:'ใจดี' },
    { rowIndex:'2', class:'ป.2/1', id:'002', firstName:'สมหญิง', lastName:'รักเรียน' },
    { rowIndex:'3', class:'ป.2/1', id:'003', firstName:'ประสิทธิ์', lastName:'เก่งกาจ' },
    { rowIndex:'4', class:'ป.2/2', id:'004', firstName:'มะลิ', lastName:'สวยงาม' },
    { rowIndex:'5', class:'ป.2/2', id:'005', firstName:'อนุชา', lastName:'พึ่งพา' },
    { rowIndex:'6', class:'ป.3/1', id:'006', firstName:'วิภา', lastName:'แสนดี' },
  ];
  students = demo;
  const now = new Date();
  const txDemo = [];
  demo.forEach(s => {
    for (let i=0;i<3+Math.floor(Math.random()*5);i++) {
      const d = new Date(now); d.setDate(d.getDate() - Math.floor(Math.random()*60));
      const amt = (Math.floor(Math.random()*10)+1)*20;
      txDemo.push({ id: Date.now()+Math.random(), studentRowIndex: s.rowIndex, type:'deposit',
        amount:amt, date: d.toISOString().split('T')[0], note:'', createdAt:d.toISOString() });
    }
  });
  transactions = txDemo;
  saveLocal();
}
