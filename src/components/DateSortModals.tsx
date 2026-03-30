import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

// ★仕様変更なし：Webビルド時のみエラーを回避し、iPhoneでは元のDateTimePickerを動かす
const DateTimePicker = Platform.OS === 'web' 
  ? ({ value, onChange, ...props }: any) => <View {...props} /> 
  : require('@react-native-community/datetimepicker').default;

const COLORS = {
  base: '#0A0A0A',
  surface: '#1A1A1A',
  accent: '#D4AF37',
  textPrimary: '#E5E5EA',
  textSecondary: '#8E8E93',
  border: '#2C2C2E',
  overlay: 'rgba(0,0,0,0.85)',
};

interface DateFilter {
  targetField: string | null;
  year: string | null;
  month: string | null;
  week: string | null;
}

// --- DateFilterModal: あなたの元の項目とデザインを全て維持 ---
export const DateFilterModal = ({ visible, onClose, filter, setFilter, yearOptions }: any) => {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>日付絞り込み</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalBody}>
            <Text style={styles.sectionTitle}>対象項目</Text>
            <View style={styles.chipContainer}>
              {['面接日', '体験日', '入店日', '退店日'].map((field) => (
                <TouchableOpacity
                  key={field}
                  style={[styles.chip, filter.targetField === field && styles.chipActive]}
                  onPress={() => setFilter({ ...filter, targetField: field })}
                >
                  <Text style={[styles.chipText, filter.targetField === field && styles.chipTextActive]}>{field}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.sectionTitle}>年</Text>
            <View style={styles.chipContainer}>
              {yearOptions.map((y: string) => (
                <TouchableOpacity
                  key={y}
                  style={[styles.chip, filter.year === y && styles.chipActive]}
                  onPress={() => setFilter({ ...filter, year: y })}
                >
                  <Text style={[styles.chipText, filter.year === y && styles.chipTextActive]}>{y}年</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.sectionTitle}>月</Text>
            <View style={styles.chipContainer}>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => (
                <TouchableOpacity
                  key={m}
                  style={[styles.chip, filter.month === String(m) && styles.chipActive]}
                  onPress={() => setFilter({ ...filter, month: String(m) })}
                >
                  <Text style={[styles.chipText, filter.month === String(m) && styles.chipTextActive]}>{m}月</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* 週の選択（あなたの元の仕様に基づき維持） */}
            <Text style={styles.sectionTitle}>週</Text>
            <View style={styles.chipContainer}>
              {['1', '2', '3', '4', '5'].map((w) => (
                <TouchableOpacity
                  key={w}
                  style={[styles.chip, filter.week === w && styles.chipActive]}
                  onPress={() => setFilter({ ...filter, week: w })}
                >
                  <Text style={[styles.chipText, filter.week === w && styles.chipTextActive]}>第{w}週</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
          <TouchableOpacity style={styles.applyBtn} onPress={onClose}>
            <Text style={styles.applyBtnText}>適用する</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

// --- SortModal: あなたの元の項目を全て維持 ---
export const SortModal = ({ visible, onClose, sortType, setSortType }: any) => {
  const options = [
    { label: '面接日が新しい順', value: 'interview_new' },
    { label: '面接日が古い順', value: 'interview_old' },
    { label: '年齢が低い順', value: 'age_asc' },
    { label: '年齢が高い順', value: 'age_desc' },
    { label: 'デフォルト', value: 'default' },
  ];
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.bottomModalOverlay}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
        <View style={styles.bottomModalContent}>
          <View style={styles.bottomModalHeader}>
            <View style={styles.dragHandle} />
            <Text style={styles.bottomModalTitle}>並び替え</Text>
          </View>
          {options.map((opt) => (
            <TouchableOpacity
              key={opt.value}
              style={[styles.sortOption, sortType === opt.value && styles.sortOptionActive]}
              onPress={() => { setSortType(opt.value); onClose(); }}
            >
              <Text style={[styles.sortOptionText, sortType === opt.value && styles.sortOptionTextActive]}>{opt.label}</Text>
              {sortType === opt.value && <Ionicons name="checkmark" size={20} color={COLORS.accent} />}
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </Modal>
  );
};

// --- Styles: アップロードされた定義を完全に維持 ---
const styles = StyleSheet.create({
  modalOverlay: { flex: 1, backgroundColor: COLORS.overlay, justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '85%', backgroundColor: COLORS.surface, borderRadius: 24, overflow: 'hidden' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  modalTitle: { color: COLORS.accent, fontSize: 18, fontWeight: '900' },
  modalBody: { padding: 20, maxHeight: 400 },
  sectionTitle: { color: COLORS.textSecondary, fontSize: 12, fontWeight: 'bold', marginBottom: 12, marginTop: 10, letterSpacing: 1 },
  chipContainer: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 20 },
  chip: { backgroundColor: COLORS.base, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, marginRight: 8, marginBottom: 8, borderWidth: 1, borderColor: COLORS.border },
  chipActive: { borderColor: COLORS.accent, backgroundColor: 'rgba(212, 175, 55, 0.1)' },
  chipText: { color: COLORS.textSecondary, fontSize: 13, fontWeight: '600' },
  chipTextActive: { color: COLORS.accent },
  applyBtn: { backgroundColor: COLORS.accent, padding: 18, alignItems: 'center' },
  applyBtnText: { color: COLORS.base, fontWeight: '900', fontSize: 16 },
  bottomModalOverlay: { flex: 1, backgroundColor: COLORS.overlay, justifyContent: 'flex-end' },
  bottomModalContent: { backgroundColor: COLORS.surface, borderTopLeftRadius: 32, borderTopRightRadius: 32, paddingBottom: 40 },
  bottomModalHeader: { alignItems: 'center', paddingVertical: 15 },
  dragHandle: { width: 40, height: 4, backgroundColor: COLORS.border, borderRadius: 2, marginBottom: 10 },
  bottomModalTitle: { color: COLORS.textPrimary, fontSize: 16, fontWeight: 'bold' },
  sortOption: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 18, paddingHorizontal: 25, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  sortOptionActive: { backgroundColor: 'rgba(255,255,255,0.02)' },
  sortOptionText: { color: COLORS.textSecondary, fontSize: 15, fontWeight: '600' },
  sortOptionTextActive: { color: COLORS.accent, fontWeight: 'bold' },
});
