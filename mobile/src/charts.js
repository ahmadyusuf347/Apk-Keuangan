import React from 'react';
import { View, Text } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
export const CATS = ['Primer', 'Utilitas', 'Sekunder', 'Tabungan'];
export const COLORS = { Primer: '#6192FC', Utilitas: '#C7EF66', Sekunder: '#1E2A47', Tabungan: '#A9C3FD' };

export function PieChart({ data, size = 160 }) {
  const total = CATS.reduce((s, c) => s + (data[c] || 0), 0), r = size / 2; let a0 = -Math.PI / 2;
  const pt = (a) => `${r + r * Math.cos(a)} ${r + r * Math.sin(a)}`;
  const active = CATS.filter((c) => data[c] > 0);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <Svg width={size} height={size}>
        {total === 0 ? <Circle cx={r} cy={r} r={r} fill="#E5E7EB" /> :
          active.length === 1 ? <Circle cx={r} cy={r} r={r} fill={COLORS[active[0]]} /> :
          active.map((c) => { const f = data[c] / total, a1 = a0 + f * 2 * Math.PI;
            const d = `M ${r} ${r} L ${pt(a0)} A ${r} ${r} 0 ${f > 0.5 ? 1 : 0} 1 ${pt(a1)} Z`; a0 = a1;
            return <Path key={c} d={d} fill={COLORS[c]} />; })}
      </Svg>
      <View style={{ marginLeft: 16 }}>
        {CATS.map((c) => (
          <View key={c} style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 3 }}>
            <View style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: COLORS[c], marginRight: 8 }} />
            <Text style={{ color: '#1E2A47' }}>{c}: {total ? ((data[c] / total) * 100).toFixed(1) : '0.0'}%</Text>
          </View>))}
      </View>
    </View>
  );
}

export function BarChart({ data, height = 140 }) {
  const max = Math.max(1, ...data.flatMap((d) => [d.income, d.expense]));
  return (
    <View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-end', height }}>
        {data.map((d) => (
          <View key={d.month} style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
            <View style={{ width: 12, height: Math.max(2, (d.income / max) * height), backgroundColor: '#6192FC', borderRadius: 3, marginRight: 2 }} />
            <View style={{ width: 12, height: Math.max(2, (d.expense / max) * height), backgroundColor: '#C7EF66', borderRadius: 3 }} />
          </View>))}
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginTop: 4 }}>
        {data.map((d) => <Text key={d.month} style={{ fontSize: 11, color: '#5B6785', width: 30, textAlign: 'center' }}>{d.label}</Text>)}
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 8 }}>
        <Text style={{ color: '#1E2A47', marginRight: 16 }}><Text style={{ color: '#6192FC' }}>■</Text> Pemasukan</Text><Text style={{ color: '#1E2A47' }}><Text style={{ color: '#C7EF66' }}>■</Text> Pengeluaran</Text>
      </View>
    </View>
  );
}
