import React, { useCallback, useEffect, useState } from 'react';
import { SafeAreaView, ScrollView, View, Text, TextInput, TouchableOpacity, Alert, StatusBar, RefreshControl, StyleSheet, Platform } from 'react-native';
import { api, rp, today, exportPdf } from './src/api';
import { PieChart, BarChart, CATS, COLORS } from './src/charts';

const BG = '#EFF0F4', BLUE = '#6192FC', LIME = '#C7EF66', INK = '#1E2A47', RED = '#E5484D';
const Card = ({ title, children, style }) => <View style={[s.card, style]}>{title && <Text style={s.h2}>{title}</Text>}{children}</View>;
const Btn = ({ label, onPress, color = BLUE, dark }) => <TouchableOpacity onPress={onPress} style={[s.btn, { backgroundColor: color }]}><Text style={[s.btnT, dark && { color: INK }]}>{label}</Text></TouchableOpacity>;
const TxRow = ({ t, onDelete }) => (
  <View style={s.row}>
    <View style={{ flex: 1 }}>
      <Text style={{ fontWeight: '600', color: INK }}>{t.description || (t.type === 'income' ? 'Pemasukan' : t.category)}</Text>
      <Text style={s.sub}>{t.date} • {t.type === 'income' ? 'Pemasukan' : t.category}</Text>
    </View>
    <Text style={{ color: t.type === 'income' ? BLUE : RED, fontWeight: '700' }}>{t.type === 'income' ? '+' : '-'} {rp(t.amount)}</Text>
    {onDelete && <TouchableOpacity onPress={onDelete}><Text style={{ marginLeft: 10, color: '#999' }}>✕</Text></TouchableOpacity>}
  </View>
);

function Dashboard({ d, reload }) {
  const [month, setMonth] = useState(today().slice(0, 7));
  const [bill, setBill] = useState({ name: '', amount: '', dueDate: today() });
  const [name, setName] = useState('');
  useEffect(() => { if (d) setName(d.name); }, [d && d.name]);
  if (!d) return <Text style={{ padding: 20 }}>Memuat… (pastikan apiUrl di app.json benar & server aktif, lalu tarik layar ke bawah)</Text>;
  const addBill = async () => {
    if (!bill.name) return Alert.alert('Isi nama tagihan');
    await api.addBill(bill); setBill({ name: '', amount: '', dueDate: today() }); reload();
  };
  const doExport = async () => { try { await exportPdf(month); } catch (e) { Alert.alert('Error', e.message); } };
  return (
    <>
      <Card style={{ backgroundColor: BLUE }}>
        <TextInput value={name} onChangeText={setName} onEndEditing={() => api.setName(name).then(reload)} style={{ color: '#EAF0FF', padding: 0 }} />
        <Text style={{ color: '#fff', marginTop: 4 }}>Saldo</Text>
        <Text style={{ color: LIME, fontSize: 28, fontWeight: '800' }}>{rp(d.balance)}</Text>
      </Card>
      <Card title={`Alokasi Pengeluaran (${d.month})`}><PieChart data={d.monthTotals.byCat} /></Card>
      <Card title="Tren Bulanan"><BarChart data={d.trend} /></Card>
      <Card title="Transaksi Terakhir">{d.recent.length ? d.recent.map((t) => <TxRow key={t.id} t={t} />) : <Text style={s.sub}>Belum ada transaksi.</Text>}</Card>
      <Card title="Pengingat Tagihan">
        {d.bills.map((b) => (
          <View key={b.id} style={s.row}>
            <View style={{ flex: 1 }}><Text style={{ fontWeight: '600', color: INK }}>{b.name}</Text><Text style={s.sub}>Jatuh tempo {b.dueDate} • {rp(b.amount)}</Text></View>
            <TouchableOpacity onPress={() => api.toggleBill(b.id).then(reload)}><Text style={{ color: BLUE, fontWeight: '700' }}>Lunas</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => api.delBill(b.id).then(reload)}><Text style={{ marginLeft: 12, color: '#999' }}>✕</Text></TouchableOpacity>
          </View>))}
        <TextInput style={s.in} placeholder="Nama tagihan (mis. Listrik)" value={bill.name} onChangeText={(v) => setBill({ ...bill, name: v })} />
        <TextInput style={s.in} placeholder="Nominal" keyboardType="numeric" value={bill.amount} onChangeText={(v) => setBill({ ...bill, amount: v })} />
        <TextInput style={s.in} placeholder="Jatuh tempo (YYYY-MM-DD)" value={bill.dueDate} onChangeText={(v) => setBill({ ...bill, dueDate: v })} />
        <Btn label="+ Tambah Tagihan" onPress={addBill} />
      </Card>
      <Card title="Export PDF Bulanan">
        <TextInput style={s.in} value={month} onChangeText={setMonth} placeholder="YYYY-MM" />
        <Btn label="Export & Bagikan PDF" onPress={doExport} color={LIME} dark />
      </Card>
    </>
  );
}

function AddTx({ onDone }) {
  const [type, setType] = useState('expense'), [category, setCategory] = useState('Primer');
  const [description, setDesc] = useState(''), [amount, setAmount] = useState(''), [date, setDate] = useState(today());
  const submit = async () => {
    try { await api.addTx({ type, category, description, amount, date }); setDesc(''); setAmount(''); Alert.alert('Tersimpan'); onDone(); }
    catch (e) { Alert.alert('Error', e.message); }
  };
  return (
    <Card title="Tambah Transaksi">
      <View style={{ flexDirection: 'row', marginBottom: 10 }}>
        {[['income', 'Pemasukan'], ['expense', 'Pengeluaran']].map(([k, l]) => (
          <TouchableOpacity key={k} onPress={() => setType(k)} style={[s.chip, type === k && { backgroundColor: k === 'income' ? BLUE : INK }]}><Text style={type === k ? { color: '#fff' } : { color: INK }}>{l}</Text></TouchableOpacity>))}
      </View>
      {type === 'expense' && <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 6 }}>
        {CATS.map((c) => <TouchableOpacity key={c} onPress={() => setCategory(c)} style={[s.chip, category === c && { backgroundColor: COLORS[c] }]}><Text style={category === c ? { color: c === 'Utilitas' || c === 'Tabungan' ? INK : '#fff' } : { color: INK }}>{c}</Text></TouchableOpacity>)}
      </View>}
      <TextInput style={s.in} placeholder="Keterangan" value={description} onChangeText={setDesc} />
      <TextInput style={s.in} placeholder="Nominal" keyboardType="numeric" value={amount} onChangeText={setAmount} />
      <TextInput style={s.in} placeholder="Tanggal (YYYY-MM-DD)" value={date} onChangeText={setDate} />
      <Btn label="Simpan" onPress={submit} />
    </Card>
  );
}

function History({ list, reload }) {
  const del = (id) => Alert.alert('Hapus transaksi?', '', [{ text: 'Batal' }, { text: 'Hapus', style: 'destructive', onPress: () => api.delTx(id).then(reload) }]);
  return <Card title="Riwayat Transaksi">{list.length ? list.map((t) => <TxRow key={t.id} t={t} onDelete={() => del(t.id)} />) : <Text style={s.sub}>Belum ada data.</Text>}</Card>;
}

export default function App() {
  const [tab, setTab] = useState('dash'), [d, setD] = useState(null), [list, setList] = useState([]), [ref, setRef] = useState(false);
  const reload = useCallback(async () => {
    setRef(true);
    try { const [a, b] = await Promise.all([api.dashboard(), api.transactions()]); setD(a); setList(b); }
    catch (e) { Alert.alert('Gagal terhubung ke server', e.message); }
    setRef(false);
  }, []);
  useEffect(() => { reload(); }, [reload]);
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: BG, paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 }}>
      <ScrollView contentContainerStyle={{ padding: 12 }} keyboardShouldPersistTaps="handled" refreshControl={<RefreshControl refreshing={ref} onRefresh={reload} />}>
        {tab === 'dash' && <Dashboard d={d} reload={reload} />}
        {tab === 'add' && <AddTx onDone={() => { reload(); setTab('dash'); }} />}
        {tab === 'hist' && <History list={list} reload={reload} />}
      </ScrollView>
      <View style={s.tabs}>
        {[['dash', '🏠', 'Dashboard'], ['add', '➕', 'Tambah'], ['hist', '📋', 'Riwayat']].map(([k, ic, l]) => (
          <TouchableOpacity key={k} style={[s.tab, tab === k && { backgroundColor: LIME }]} onPress={() => setTab(k)}>
            <Text style={{ fontSize: 18 }}>{ic}</Text>
            <Text style={{ fontSize: 12, fontWeight: '700', color: tab === k ? INK : '#fff' }}>{l}</Text>
          </TouchableOpacity>))}
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  card: { backgroundColor: '#fff', borderRadius: 18, padding: 14, marginBottom: 12 },
  h2: { fontSize: 16, fontWeight: '700', marginBottom: 10, color: INK }, sub: { color: '#5B6785', fontSize: 12 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 0.5, borderColor: BG },
  in: { borderWidth: 1, borderColor: '#D5DAE6', backgroundColor: BG, borderRadius: 10, padding: 10, marginVertical: 4, color: INK },
  btn: { padding: 12, borderRadius: 10, alignItems: 'center', marginTop: 8 }, btnT: { color: '#fff', fontWeight: '700' },
  chip: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, backgroundColor: BG, marginRight: 8, marginBottom: 6 },
  tabs: { flexDirection: 'row', backgroundColor: BLUE, paddingHorizontal: 12, paddingVertical: 8, borderTopLeftRadius: 22, borderTopRightRadius: 22 },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 8, marginHorizontal: 4, borderRadius: 16 },
});
