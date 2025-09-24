import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

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

type Transaction = {
  id: string | number;
  amount: number | string | null;
  category: string;
  transaction_date: string | null;
  note: string | null;
};

export default function TransactionsScreen() {
  const router = useRouter();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [sortOption, setSortOption] = useState<'date-desc' | 'amount-desc' | 'amount-asc'>(
    'date-desc'
  );

  const fetchTransactions = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user?.id) {
        setTransactions([]);
        return;
      }

      const { data, error } = await supabase
        .from('transactions')
        .select('id, amount, category, transaction_date, note')
        .eq('user_id', user.id)
        .order('transaction_date', { ascending: false });

      if (error) throw error;

      setTransactions(data ?? []);
    } catch (err) {
      if (err instanceof Error) Alert.alert('Error', err.message);
    } finally {
      if (isRefresh) setRefreshing(false);
      else setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchTransactions();
    }, [fetchTransactions])
  );

  const categoryOptions = useMemo(() => {
    const categories = new Set<string>();
    transactions.forEach(item => {
      if (item.category) categories.add(item.category);
    });
    return Array.from(categories).sort((a, b) => a.localeCompare(b));
  }, [transactions]);

  const sortOptionsConfig = useMemo(
    () => [
      { value: 'date-desc' as const, label: 'Date ↓' },
      { value: 'amount-desc' as const, label: 'Amount ↓' },
      { value: 'amount-asc' as const, label: 'Amount ↑' },
    ],
    []
  );

  const toggleCategory = useCallback((category: string) => {
    setSelectedCategories(prev =>
      prev.includes(category) ? prev.filter(item => item !== category) : [...prev, category]
    );
  }, []);

  const filteredTransactions = useMemo(() => {
    const base = selectedCategories.length
      ? transactions.filter(item => selectedCategories.includes(item.category))
      : [...transactions];

    const sorted = [...base];
    const toTimestamp = (value: string | null) => {
      if (!value) return Number.MIN_SAFE_INTEGER;
      const parsed = Date.parse(value);
      return Number.isFinite(parsed) ? parsed : Number.MIN_SAFE_INTEGER;
    };

    switch (sortOption) {
      case 'amount-desc':
        sorted.sort((a, b) => Number(b.amount ?? 0) - Number(a.amount ?? 0));
        break;
      case 'amount-asc':
        sorted.sort((a, b) => Number(a.amount ?? 0) - Number(b.amount ?? 0));
        break;
      default:
        sorted.sort((a, b) => toTimestamp(b.transaction_date) - toTimestamp(a.transaction_date));
    }

    return sorted;
  }, [transactions, selectedCategories, sortOption]);

  const clearFilters = useCallback(() => {
    setSelectedCategories([]);
    setSortOption('date-desc');
  }, []);

  const renderItem = useCallback(({ item }: { item: Transaction }) => {
    const amountValue = Number(item.amount ?? 0);
    const formattedAmount = Number.isFinite(amountValue) ? `€${amountValue.toFixed(2)}` : '€0.00';
    const formattedDate = item.transaction_date
      ? new Date(item.transaction_date).toLocaleDateString()
      : 'Unknown date';

    const categoryLabel = item.category?.trim() || 'Uncategorized';
    const normalizedCategory = categoryLabel.toLowerCase();
    const categoryEmoji = categoryIcons[normalizedCategory] || '❓';
    const categoryColor = categoryColors[normalizedCategory] || '#4a90e2';

    return (
      <Pressable
        onLongPress={() => {
          setSelectedTransaction(item);
          setShowDeleteModal(true);
        }}
        style={({ pressed }) => [
          styles.card,
          {
            transform: [{ scale: pressed ? 1.04 : 1 }],
            backgroundColor: pressed ? '#f0f0f0' : '#fff',
          },
        ]}>
        <View style={styles.cardContent}>
          <View style={styles.cardLeft}>
            <View style={styles.categoryRow}>
              <Text style={styles.categoryEmoji}>{categoryEmoji}</Text>
              <View style={[styles.categoryChip, { backgroundColor: categoryColor }]}>
                <Text style={styles.categoryChipText}>{categoryLabel}</Text>
              </View>
            </View>
            {item.note ? <Text style={styles.note}>{item.note}</Text> : null}
          </View>
          <View style={styles.cardRight}>
            <Text style={styles.amount}>{formattedAmount}</Text>
            <Text style={styles.date}>{formattedDate}</Text>
          </View>
        </View>
      </Pressable>
    );
  }, []);

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.filterButton}
        activeOpacity={0.7}
        onPress={() => setShowFilterModal(true)}>
        <Ionicons name="funnel-outline" size={22} color="#4a90e2" />
      </TouchableOpacity>

      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color="#4a90e2" />
        </View>
      ) : (
        <FlatList
          data={filteredTransactions}
          keyExtractor={item => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={
            filteredTransactions.length ? styles.listContent : styles.emptyContainer
          }
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => fetchTransactions(true)} />
          }
          ListEmptyComponent={<Text style={styles.emptyText}>No transactions yet.</Text>}
        />
      )}

      <TouchableOpacity
        style={styles.fab}
        activeOpacity={0.8}
        onPress={() => router.push('/add-transaction')}>
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
      <Modal
        visible={showFilterModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowFilterModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.filterModalBox}>
            <View style={styles.filterHeader}>
              <Text style={styles.filterTitle}>Filter & Sort</Text>
              <TouchableOpacity onPress={() => setShowFilterModal(false)}>
                <Ionicons name="close" size={20} color="#333" />
              </TouchableOpacity>
            </View>

            <Text style={styles.sectionLabel}>Categories</Text>
            {categoryOptions.length ? (
              <View style={styles.chipContainer}>
                {categoryOptions.map(category => {
                  const isActive = selectedCategories.includes(category);
                  return (
                    <TouchableOpacity
                      key={category}
                      style={[styles.chip, isActive && styles.chipActive]}
                      onPress={() => toggleCategory(category)}>
                      <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
                        {category}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ) : (
              <Text style={styles.emptyFiltersText}>No categories yet.</Text>
            )}

            <Text style={styles.sectionLabel}>Sort By</Text>
            <View style={styles.sortOptionsRow}>
              {sortOptionsConfig.map((option, index) => {
                const isActive = sortOption === option.value;
                return (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.sortOption,
                      index !== sortOptionsConfig.length - 1 && styles.sortOptionSpacing,
                      isActive && styles.sortOptionActive,
                    ]}
                    onPress={() => setSortOption(option.value)}>
                    <Text style={[styles.sortOptionText, isActive && styles.sortOptionTextActive]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.filterActions}>
              <TouchableOpacity style={styles.clearButton} onPress={clearFilters}>
                <Text style={styles.clearButtonText}>Clear</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.applyButton}
                onPress={() => setShowFilterModal(false)}>
                <Text style={styles.applyButtonText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      <Modal
        visible={showDeleteModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDeleteModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Transaction Options</Text>

            <TouchableOpacity
              style={styles.modalButtonDelete}
              onPress={async () => {
                if (!selectedTransaction) return;
                try {
                  const { error } = await supabase
                    .from('transactions')
                    .delete()
                    .eq('id', selectedTransaction.id);

                  if (error) throw error;
                  setTransactions(prev => prev.filter(t => t.id !== selectedTransaction.id));
                } catch (err) {
                  if (err instanceof Error) Alert.alert('Error', err.message);
                } finally {
                  setShowDeleteModal(false);
                }
              }}>
              <Ionicons name="trash" size={20} color="#fff" />
              <Text style={styles.modalButtonText}>Delete</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalButtonCancel}
              onPress={() => setShowDeleteModal(false)}>
              <Ionicons name="close" size={20} color="#333" />
              <Text style={styles.modalButtonTextCancel}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f7f7f7', marginTop: 60 },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { padding: 16, paddingBottom: 100 },
  emptyContainer: { flexGrow: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { fontSize: 16, color: '#666' },
  card: {
    backgroundColor: '#fff',
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'stretch',
  },
  cardLeft: { flex: 1, paddingRight: 12 },
  cardRight: { justifyContent: 'space-between', alignItems: 'flex-end', minWidth: 90 },
  amount: { fontSize: 20, fontWeight: '700', color: '#111', marginBottom: 8 },
  date: { fontSize: 14, color: '#777' },
  categoryRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  categoryEmoji: { fontSize: 18, marginRight: 8 },
  categoryChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  categoryChipText: { fontSize: 14, fontWeight: '600', color: '#fff', textTransform: 'capitalize' },
  note: { fontSize: 14, color: '#555', marginTop: 4 },
  separator: { height: 12 },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#4a90e2',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  filterButton: {
    position: 'absolute',
    top: 12,
    right: 20,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
    zIndex: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBox: {
    width: 250,
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  modalButtonDelete: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ff3b30',
    padding: 12,
    borderRadius: 8,
    width: '100%',
    justifyContent: 'center',
    marginBottom: 12,
  },
  modalButtonCancel: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eee',
    padding: 12,
    borderRadius: 8,
    width: '100%',
    justifyContent: 'center',
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  modalButtonTextCancel: {
    color: '#333',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  filterModalBox: {
    width: '85%',
    maxWidth: 360,
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 16,
  },
  filterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  filterTitle: { fontSize: 20, fontWeight: '700', color: '#222' },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#555',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 20,
  },
  chip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#d0d0d0',
    backgroundColor: '#f5f5f5',
    marginRight: 8,
    marginBottom: 8,
  },
  chipActive: {
    borderColor: '#4a90e2',
    backgroundColor: 'rgba(74,144,226,0.15)',
  },
  chipText: { color: '#444', fontSize: 13, fontWeight: '500' },
  chipTextActive: { color: '#1f73c3' },
  emptyFiltersText: { color: '#777', fontSize: 14, marginBottom: 20 },
  sortOptionsRow: {
    flexDirection: 'row',
    marginBottom: 24,
  },
  sortOption: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#d0d0d0',
    backgroundColor: '#fafafa',
    alignItems: 'center',
  },
  sortOptionActive: {
    borderColor: '#4a90e2',
    backgroundColor: 'rgba(74,144,226,0.2)',
  },
  sortOptionSpacing: { marginRight: 8 },
  sortOptionText: { fontSize: 14, fontWeight: '500', color: '#444' },
  sortOptionTextActive: { color: '#1f73c3' },
  filterActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  clearButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#f0f0f0',
    marginRight: 12,
  },
  clearButtonText: { fontSize: 14, fontWeight: '600', color: '#444' },
  applyButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: '#4a90e2',
  },
  applyButtonText: { fontSize: 14, fontWeight: '600', color: '#fff' },
});
