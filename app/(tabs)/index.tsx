import { supabase } from '@/lib/supabase';
import { useIsFocused } from '@react-navigation/native';
import dayjs from 'dayjs';
import React, { useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { VictoryPie } from 'victory-native';

const categoryIcons: Record<string, string> = {
  food: '🍴',
  transport: '🚌',
  grocery: '🛒',
  bills: '🏠',
  entertainment: '🍿',
};

const categoryColors: Record<string, string> = {
  food: '#4CAF50',
  transport: '#2196F3',
  grocery: '#FF9800',
  bills: '#E91E63',
  entertainment: '#9C27B0',
};

function MonthSelector({ current, onChange }: { current: Date; onChange: (date: Date) => void }) {
  const month = dayjs(current);
  return (
    <View style={styles.monthContainer}>
      <TouchableOpacity onPress={() => onChange(month.subtract(1, 'month').toDate())}>
        <Text style={styles.arrow}>◀</Text>
      </TouchableOpacity>
      <Text style={styles.monthText}>{month.format('MMMM YYYY')}</Text>
      <TouchableOpacity onPress={() => onChange(month.add(1, 'month').toDate())}>
        <Text style={styles.arrow}>▶</Text>
      </TouchableOpacity>
    </View>
  );
}

async function fetchTransactionsForMonth(month: Date) {
  const start = dayjs(month).startOf('month').format('YYYY-MM-DD');
  const end = dayjs(month).endOf('month').format('YYYY-MM-DD');

  const { data, error } = await supabase
    .from('transactions')
    .select('id, amount, category, transaction_date')
    .gte('transaction_date', start)
    .lte('transaction_date', end);

  if (error) {
    console.error('Error fetching transactions:', error);
    return [];
  }
  return data || [];
}

function groupByCategory(transactions: any[]) {
  const result: { x: string; y: number; transactions: number; color: string }[] = [];

  transactions.forEach(t => {
    const cat = t.category;
    const existing = result.find(r => r.x === cat);
    if (existing) {
      existing.y += t.amount;
      existing.transactions += 1;
    } else {
      result.push({
        x: cat,
        y: t.amount,
        transactions: 1,
        color: categoryColors[cat] || '#999',
      });
    }
  });

  return result;
}

export default function PieChartScreen() {
  const [month, setMonth] = useState(new Date());
  const [chartData, setChartData] = useState<any[]>([]);
  const isFocused = useIsFocused();

  useEffect(() => {
    if (!isFocused) {
      return;
    }

    let isMounted = true;

    fetchTransactionsForMonth(month).then(txs => {
      if (isMounted) {
        setChartData(groupByCategory(txs));
      }
    });

    return () => {
      isMounted = false;
    };
  }, [month, isFocused]);

  const total = chartData.reduce((sum, d) => sum + d.y, 0);

  return (
    <View style={styles.container}>
      <MonthSelector current={month} onChange={setMonth} />

      <View style={{ width: 300, height: 300, alignItems: 'center', justifyContent: 'center' }}>
        <VictoryPie
          data={chartData}
          width={350}
          height={350}
          innerRadius={60}
          padAngle={5}
          cornerRadius={4}
          padding={{ left: 80, right: 80, top: 40, bottom: 40 }}
          labels={({ datum }) => {
            const percent = total > 0 ? Math.round((datum.y / total) * 100) : 0;
            const icon = categoryIcons[datum.x] || '❓';
            return `${icon} ${percent}%`;
          }}
          style={{
            data: { fill: ({ datum }) => datum.color },
            labels: { fontSize: 14, fontWeight: '600' },
          }}
        />

        <View style={{ position: 'absolute', alignItems: 'center' }}>
          <Text style={{ fontSize: 14, color: '#666' }}>Total</Text>
          <Text style={{ fontSize: 18, fontWeight: '700' }}>€{total.toFixed(2)}</Text>
        </View>
      </View>

      <FlatList
        style={styles.list}
        data={chartData}
        keyExtractor={item => item.x}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Text style={styles.icon}>{categoryIcons[item.x] || '❓'}</Text>
            <View style={styles.textGroup}>
              <Text style={styles.label}>{item.x}</Text>
              <Text style={styles.subLabel}>{item.transactions} transactions</Text>
            </View>
            <Text style={styles.amount}>€{item.y}</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
  },
  monthContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: 220,
    marginBottom: 20,
    marginTop: 60,
  },
  monthText: {
    fontSize: 16,
    fontWeight: '600',
  },
  arrow: {
    fontSize: 18,
    paddingHorizontal: 10,
  },
  list: {
    marginTop: 20,
    width: '100%',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ccc',
  },
  icon: {
    fontSize: 20,
    marginRight: 12,
  },
  textGroup: {
    flex: 1,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
  },
  subLabel: {
    fontSize: 12,
    color: '#666',
  },
  amount: {
    fontSize: 16,
    fontWeight: '600',
  },
});
