import { supabase } from '@/lib/supabase';
import { useEffect, useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, View } from 'react-native';

type Totals = Record<string, number>;

export default function HomeScreen() {
  const [loading, setLoading] = useState(true);
  const [totals, setTotals] = useState<Totals>({});
  const [totalSpent, setTotalSpent] = useState(0);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const { data: userData } = await supabase.auth.getUser();
        const userId = userData.user?.id;

        if (!userId) return;

        const { data, error } = await supabase
          .from('transactions')
          .select('amount, category')
          .eq('user_id', userId);

        if (error) throw error;

        const sums: Totals = {};
        let sumAll = 0;

        (data ?? []).forEach(tx => {
          const amt = Number(tx.amount);
          if (!amt) return;
          sumAll += amt;
          const cat = tx.category || 'Uncategorized';
          sums[cat] = (sums[cat] ?? 0) + amt;
        });

        setTotalSpent(sumAll);
        setTotals(sums);
      } catch (err) {
        if (err instanceof Error) Alert.alert('Error', err.message);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Analytics</Text>

      {loading ? (
        <Text>Loading…</Text>
      ) : (
        <>
          <Text style={styles.total}>Total spent: {totalSpent.toFixed(2)}kr</Text>
          <FlatList
            data={Object.entries(totals)}
            keyExtractor={([cat]) => cat}
            renderItem={({ item: [cat, amt] }) => (
              <View style={styles.row}>
                <Text style={styles.cat}>{cat}</Text>
                <Text style={styles.amt}>{amt.toFixed(2)}kr</Text>
              </View>
            )}
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#fff' },
  header: { fontSize: 22, fontWeight: '700', marginBottom: 12, marginTop: 60 },
  total: { fontSize: 18, fontWeight: '600', marginBottom: 20 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ccc',
  },
  cat: { fontSize: 16 },
  amt: { fontSize: 16, fontWeight: '500' },
});
