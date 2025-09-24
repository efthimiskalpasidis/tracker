import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Button, Input, Text } from '@rneui/themed';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Modal, Platform, StyleSheet, TouchableOpacity, View } from 'react-native';

const categories = [
  { key: 'food', label: 'Food', emoji: '🍴', color: '#4CAF50' },
  { key: 'transport', label: 'Transport', emoji: '🚌', color: '#2196F3' },
  { key: 'grocery', label: 'Grocery', emoji: '🛒', color: '#FF9800' },
  { key: 'bills', label: 'Bills', emoji: '🏠', color: '#E91E63' },
  { key: 'entertainment', label: 'Entertainment', emoji: '🍿', color: '#9C27B0' },
];

export default function AddTransactionModal() {
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleAddTransaction() {
    try {
      setLoading(true);
      const parsedAmount = parseFloat(amount);
      if (isNaN(parsedAmount)) throw new Error('Amount must be a number');
      if (!category) throw new Error('Please select a category');

      const { error } = await supabase.from('transactions').insert({
        amount: parsedAmount,
        category,
        transaction_date: date.toISOString().split('T')[0],
        note,
        user_id: (await supabase.auth.getUser()).data.user?.id,
      });

      if (error) throw error;

      Alert.alert('Success', 'Transaction added!');
      router.back();
    } catch (err) {
      if (err instanceof Error) Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text h4 style={styles.header}>
        Add Payment
      </Text>

      <Input
        placeholder="Enter amount"
        keyboardType="numeric"
        value={amount}
        onChangeText={setAmount}
        inputStyle={styles.amountInput}
        containerStyle={styles.amountContainer}
      />

      <Text style={styles.label}>Select Category</Text>
      <View style={styles.chipRow}>
        {categories.map(cat => {
          const isSelected = category === cat.key;
          return (
            <TouchableOpacity
              key={cat.key}
              style={[
                styles.chip,
                {
                  backgroundColor: isSelected ? cat.color : `${cat.color}1A`,
                  borderColor: cat.color,
                },
              ]}
              onPress={() => setCategory(cat.key)}>
              <Text style={[styles.chipEmoji, isSelected && styles.chipEmojiSelected]}>
                {cat.emoji}
              </Text>
              <Text style={[styles.chipLabel, { color: isSelected ? '#fff' : cat.color }]}>
                {cat.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={styles.label}>Note</Text>
      <Input
        placeholder="Enter a note (optional)"
        multiline
        value={note}
        onChangeText={setNote}
        inputStyle={styles.noteInput}
        containerStyle={styles.noteContainer}
      />

      <Text style={styles.label}>Set Date</Text>
      <TouchableOpacity style={styles.dateRow} onPress={() => setShowDatePicker(true)}>
        <Text style={styles.dateText}>{date.toDateString()}</Text>
        <Ionicons name="calendar" size={20} color="#555" />
      </TouchableOpacity>

      <Modal visible={showDatePicker} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <DateTimePicker
              value={date}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'calendar'}
              onChange={(_, selectedDate) => {
                if (Platform.OS === 'android') {
                  setShowDatePicker(false);
                }
                if (selectedDate) setDate(selectedDate);
              }}
            />
            <View style={styles.datePickerActions}>
              <Button title="Cancel" type="outline" onPress={() => setShowDatePicker(false)} />
              <Button title="OK" onPress={() => setShowDatePicker(false)} />
            </View>
          </View>
        </View>
      </Modal>

      <View style={styles.footer}>
        <Button
          title={loading ? 'Saving...' : 'Save'}
          onPress={handleAddTransaction}
          disabled={loading}
          buttonStyle={styles.saveButton}
          containerStyle={styles.saveContainer}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  header: { textAlign: 'center', marginBottom: 20 },
  amountContainer: { marginBottom: 16 },
  amountInput: { fontSize: 22, fontWeight: '600' },
  label: { fontSize: 14, fontWeight: '500', marginBottom: 6, marginTop: 12 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginRight: 8,
    marginBottom: 8,
  },
  chipEmoji: { fontSize: 16, marginRight: 6 },
  chipEmojiSelected: { color: '#fff' },
  chipLabel: { fontSize: 14, fontWeight: '600' },
  noteContainer: { marginBottom: 12 },
  noteInput: { fontSize: 14 },
  dateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#f2f2f2',
    alignItems: 'center',
  },
  dateText: { fontSize: 16 },
  saveContainer: { marginTop: 24, alignSelf: 'center', width: '90%' },
  saveButton: { paddingVertical: 12 },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  modalContent: {
    backgroundColor: '#fff',
    padding: 16,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  datePickerActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingHorizontal: 12,
  },
  footer: {
    marginTop: 'auto',
  },
});
