import Constants from 'expo-constants';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
export const API = (Constants.expoConfig?.extra?.apiUrl || '').replace(/\/$/, '') + '/api';
const req = async (path, method = 'GET', body) => {
  const r = await fetch(API + path, { method, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  const j = await r.json(); if (!r.ok) throw new Error(j.error || 'Gagal'); return j;
};
export const api = {
  dashboard: (m) => req('/dashboard' + (m ? `?month=${m}` : '')),
  transactions: () => req('/transactions'),
  addTx: (b) => req('/transactions', 'POST', b), delTx: (id) => req('/transactions/' + id, 'DELETE'),
  addBill: (b) => req('/bills', 'POST', b), toggleBill: (id) => req('/bills/' + id + '/toggle', 'PATCH'), delBill: (id) => req('/bills/' + id, 'DELETE'),
  setName: (name) => req('/profile', 'PUT', { name }),
};
export const rp = (n) => 'Rp ' + Math.round(n || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
export const today = () => new Date().toISOString().slice(0, 10);
export async function exportPdf(month) {
  const uri = FileSystem.documentDirectory + `laporan-${month}.pdf`;
  const r = await FileSystem.downloadAsync(`${API}/report/${month}`, uri);
  if (r.status !== 200) throw new Error('Gagal membuat PDF');
  await Sharing.shareAsync(r.uri, { mimeType: 'application/pdf', dialogTitle: 'Laporan Keuangan' });
}
