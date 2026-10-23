const express = require('express'), cors = require('cors'), fs = require('fs'), path = require('path');
const PDFDocument = require('pdfkit');
const app = express(); app.use(cors()); app.use(express.json());

const FILE = process.env.DATA_FILE || path.join(__dirname, 'data.json');
const CATS = ['Primer', 'Utilitas', 'Sekunder', 'Tabungan'];
const COLORS = { Primer: '#6192FC', Utilitas: '#C7EF66', Sekunder: '#1E2A47', Tabungan: '#A9C3FD' };
const load = () => fs.existsSync(FILE) ? JSON.parse(fs.readFileSync(FILE)) : { profile: { name: 'Pengguna' }, transactions: [], bills: [] };
const save = (d) => fs.writeFileSync(FILE, JSON.stringify(d, null, 2));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const rp = (n) => 'Rp ' + Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
const MONTHS = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
const monthLabel = (m) => `${MONTHS[+m.slice(5) - 1]} ${m.slice(0, 4)}`;

function totals(list) {
  const byCat = Object.fromEntries(CATS.map(c => [c, 0])); let income = 0, expense = 0;
  list.forEach(t => { if (t.type === 'income') income += t.amount; else { expense += t.amount; byCat[t.category] += t.amount; } });
  return { income, expense, byCat };
}
const sortDesc = (l) => [...l].sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));

// Profile
app.get('/api/profile', (req, res) => res.json(load().profile));
app.put('/api/profile', (req, res) => { const d = load(); d.profile.name = req.body.name || 'Pengguna'; save(d); res.json(d.profile); });

// Transactions
app.get('/api/transactions', (req, res) => res.json(sortDesc(load().transactions)));
app.post('/api/transactions', (req, res) => {
  const { type, category, description, amount, date } = req.body;
  const t = { id: uid(), type: type === 'income' ? 'income' : 'expense', category: type === 'income' ? null : category,
    description: description || '', amount: Number(amount), date };
  if (!(t.amount > 0) || !/^\d{4}-\d{2}-\d{2}$/.test(date || '')) return res.status(400).json({ error: 'Nominal/tanggal tidak valid' });
  if (t.type === 'expense' && !CATS.includes(t.category)) return res.status(400).json({ error: 'Kategori tidak valid' });
  const d = load(); d.transactions.push(t); save(d); res.json(t);
});
app.delete('/api/transactions/:id', (req, res) => { const d = load(); d.transactions = d.transactions.filter(t => t.id !== req.params.id); save(d); res.json({ ok: true }); });

// Bills
app.get('/api/bills', (req, res) => res.json(load().bills.sort((a, b) => a.dueDate.localeCompare(b.dueDate))));
app.post('/api/bills', (req, res) => {
  const d = load(); const b = { id: uid(), name: req.body.name, amount: Number(req.body.amount) || 0, dueDate: req.body.dueDate, paid: false };
  d.bills.push(b); save(d); res.json(b);
});
app.patch('/api/bills/:id/toggle', (req, res) => { const d = load(); const b = d.bills.find(x => x.id === req.params.id); if (b) b.paid = !b.paid; save(d); res.json(b); });
app.delete('/api/bills/:id', (req, res) => { const d = load(); d.bills = d.bills.filter(b => b.id !== req.params.id); save(d); res.json({ ok: true }); });

// Dashboard
app.get('/api/dashboard', (req, res) => {
  const d = load(); const month = req.query.month || new Date().toISOString().slice(0, 7);
  const all = totals(d.transactions); const cur = totals(d.transactions.filter(t => t.date.startsWith(month)));
  const trend = []; const [y, m] = month.split('-').map(Number);
  for (let i = 5; i >= 0; i--) {
    const dt = new Date(y, m - 1 - i, 1); const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
    const t = totals(d.transactions.filter(x => x.date.startsWith(key)));
    trend.push({ month: key, label: MONTHS[dt.getMonth()].slice(0, 3), income: t.income, expense: t.expense });
  }
  res.json({ name: d.profile.name, balance: all.income - all.expense, month, monthTotals: cur, trend,
    recent: sortDesc(d.transactions).slice(0, 5), bills: d.bills.filter(b => !b.paid).sort((a, b) => a.dueDate.localeCompare(b.dueDate)).slice(0, 5) });
});

// PDF report
app.get('/api/report/:month', (req, res) => {
  const month = req.params.month; if (!/^\d{4}-\d{2}$/.test(month)) return res.status(400).json({ error: 'Format bulan: YYYY-MM' });
  const d = load(); const list = d.transactions.filter(t => t.date.startsWith(month)).sort((a, b) => a.date.localeCompare(b.date));
  const { income, expense, byCat } = totals(list); const saldo = income - expense;
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="laporan-${month}.pdf"`);
  const doc = new PDFDocument({ size: 'A4', margin: 40 }); doc.pipe(res);

  // Halaman 1
  doc.fillColor('#111').font('Helvetica-Bold').fontSize(22).text('Laporan Keuangan Bulanan');
  doc.font('Helvetica').fontSize(12).fillColor('#555').text(`Periode: ${monthLabel(month)}`).text(`Pemilik Akun: ${d.profile.name}`);
  const cards = [['Total Pemasukan', rp(income), '#6192FC', '#fff'], ['Total Pengeluaran', rp(expense), '#1E2A47', '#fff'], ['Sisa Saldo', rp(saldo), '#C7EF66', '#1E2A47']];
  cards.forEach((c, i) => {
    const x = 40 + i * 175, y = 140;
    doc.roundedRect(x, y, 165, 70, 8).fill(c[2]);
    doc.fillColor(c[3]).font('Helvetica').fontSize(10).text(c[0], x + 12, y + 14, { width: 140 });
    doc.font('Helvetica-Bold').fontSize(14).text(c[1], x + 12, y + 38, { width: 145 });
  });
  doc.fillColor('#111').font('Helvetica-Bold').fontSize(14).text('Alokasi Pengeluaran', 40, 250);
  const cx = 170, cy = 400, r = 100;
  if (expense === 0) doc.font('Helvetica').fontSize(11).fillColor('#888').text('Belum ada pengeluaran bulan ini.', 40, 280);
  else {
    let a0 = -Math.PI / 2; const active = CATS.filter(c => byCat[c] > 0);
    active.forEach(c => {
      const frac = byCat[c] / expense;
      if (active.length === 1) { doc.circle(cx, cy, r).fill(COLORS[c]); return; }
      const a1 = a0 + frac * 2 * Math.PI;
      const p = (a) => `${cx + r * Math.cos(a)} ${cy + r * Math.sin(a)}`;
      doc.path(`M ${cx} ${cy} L ${p(a0)} A ${r} ${r} 0 ${frac > 0.5 ? 1 : 0} 1 ${p(a1)} Z`).fill(COLORS[c]); a0 = a1;
    });
  }
  CATS.forEach((c, i) => {
    const y = 330 + i * 28; doc.rect(340, y, 14, 14).fill(COLORS[c]);
    doc.fillColor('#111').font('Helvetica').fontSize(12).text(`${c}: ${expense ? ((byCat[c] / expense) * 100).toFixed(1) : '0.0'}%`, 362, y + 1);
  });

  // Halaman 2
  doc.addPage(); doc.fillColor('#111').font('Helvetica-Bold').fontSize(16).text('Analisis Kategori & Rincian Transaksi', 40, 40);
  let y = 75;
  const row = (cols, xs, bold, bg) => {
    if (y > 770) { doc.addPage(); y = 40; }
    if (bg) doc.rect(40, y - 4, 515, 20).fill(bg);
    doc.fillColor(bg ? '#fff' : '#111').font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(10);
    cols.forEach((t, i) => doc.text(String(t), xs[i].x, y, { width: xs[i].w, align: xs[i].a || 'left', lineBreak: false, ellipsis: true }));
    y += 22;
  };
  const cx1 = [{ x: 48, w: 150 }, { x: 210, w: 180, a: 'right' }, { x: 400, w: 150, a: 'right' }];
  row(['Kategori', 'Total Nominal', 'Persentase'], cx1, true, '#6192FC');
  CATS.forEach(c => row([c, rp(byCat[c]), (expense ? (byCat[c] / expense) * 100 : 0).toFixed(1) + '%'], cx1));
  y += 15; doc.fillColor('#111').font('Helvetica-Bold').fontSize(14).text('Riwayat Transaksi', 40, y); y += 25;
  const tx = [{ x: 48, w: 65 }, { x: 118, w: 60 }, { x: 183, w: 65 }, { x: 253, w: 160 }, { x: 418, w: 130, a: 'right' }];
  row(['Tanggal', 'Jenis', 'Kategori', 'Keterangan', 'Nominal'], tx, true, '#6192FC');
  if (!list.length) row(['Tidak ada transaksi.', '', '', '', ''], tx);
  list.forEach(t => row([t.date, t.type === 'income' ? 'Income' : 'Outcome', t.category || '-', t.description, (t.type === 'income' ? '+ ' : '- ') + rp(t.amount)], tx));
  doc.end();
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => console.log('API berjalan di port ' + PORT));
