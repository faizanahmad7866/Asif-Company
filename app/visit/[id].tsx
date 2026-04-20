import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TextInput, ScrollView,
  TouchableOpacity, Alert, Platform
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Calendar, CheckSquare, Package, ChevronDown } from 'lucide-react-native';
import { addVisit, getShops, Shop } from '../../services/database';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import * as Haptics from 'expo-haptics';
import { useAppThemeAndText } from '../../hooks/useAppThemeAndText';

export default function VisitScreen() {
  const { id } = useLocalSearchParams<{id: string}>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [shop, setShop] = useState<Shop | null>(null);

  const { Theme, text } = useAppThemeAndText();
  const styles = getStyles(Theme);

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [selectedTime, setSelectedTime] = useState<Date>(new Date());
  const [showTimePicker, setShowTimePicker] = useState(false);

  const [purpose, setPurpose] = useState('Restock');
  const [notes, setNotes] = useState('');
  const canSave = !!purpose && !!selectedDate && !!selectedTime;

  useEffect(() => {
    getShops().then(shops => {
      const s = shops.find(s => s.id === id);
      if (s) setShop(s);
    });
  }, [id]);

  const onDateChange = (_event: DateTimePickerEvent, date?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (date) setSelectedDate(date);
  };

  const onTimeChange = (_event: DateTimePickerEvent, time?: Date) => {
    setShowTimePicker(Platform.OS === 'ios');
    if (time) setSelectedTime(time);
  };

  const formattedDate = selectedDate.toLocaleDateString('en-PK', {
    weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
  });

  const formattedTime = selectedTime.toLocaleTimeString('en-PK', {
    hour: '2-digit', minute: '2-digit',
  });

  const handleSave = async () => {
    if (!id) return;
    if (!canSave) return;
    try {
      const visitTs = new Date(
        selectedDate.getFullYear(),
        selectedDate.getMonth(),
        selectedDate.getDate(),
        selectedTime.getHours(),
        selectedTime.getMinutes(),
      ).getTime();

      await addVisit({
        shopId: id,
        visitDate: selectedDate.toLocaleDateString(),
        visitTimestamp: visitTs,
        arrivalTime: formattedTime,
        purpose: purpose,
        notes: notes,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(text.visitSaved, '');
      router.back();
    } catch {
      Alert.alert('Error', 'Failed to save visit.');
    }
  };

  if (!shop) return <View style={styles.container} />;

  return (
    <View style={{ flex: 1, backgroundColor: Theme.colors.background }}>
      <KeyboardAwareScrollView 
        style={[styles.container, { paddingTop: insets.top }]}
        enableOnAndroid={true}
        extraScrollHeight={80}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.shopCard}>
        <Text style={styles.badge}>ORIGIN: {shop.id}</Text>
        <Text style={styles.shopName}>{shop.name}</Text>
        <Text style={styles.shopId}>SHOP ID: #{shop.id}</Text>
      </View>

      <View style={styles.formContainer}>
        <View style={styles.formHeader}>
          <Calendar size={18} color={Theme.colors.primary} />
          <Text style={styles.formTitle}>{text.visitDetails}</Text>
        </View>

        <Text style={styles.label}>{text.visitDate}</Text>
        <TouchableOpacity
          style={styles.pickerBtn}
          onPress={() => setShowDatePicker(true)}
          activeOpacity={0.7}
        >
          <Calendar size={16} color={Theme.colors.primary} />
          <Text style={styles.pickerBtnText}>{formattedDate}</Text>
          <ChevronDown size={16} color={Theme.colors.textSecondary} />
        </TouchableOpacity>

        {showDatePicker && (
          <DateTimePicker
            value={selectedDate}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'calendar'}
            maximumDate={new Date()}
            onChange={onDateChange}
          />
        )}

        {showDatePicker && Platform.OS === 'android' && (
          <TouchableOpacity onPress={() => setShowDatePicker(false)} style={styles.dismissBtn}>
            <Text style={styles.dismissText}>{text.doneBtn}</Text>
          </TouchableOpacity>
        )}

        <Text style={[styles.label, { marginTop: 8 }]}>{text.arrivalTime}</Text>
        <TouchableOpacity
          style={styles.pickerBtn}
          onPress={() => setShowTimePicker(true)}
          activeOpacity={0.7}
        >
          <Calendar size={16} color={Theme.colors.primary} />
          <Text style={styles.pickerBtnText}>{formattedTime}</Text>
          <ChevronDown size={16} color={Theme.colors.textSecondary} />
        </TouchableOpacity>

        {showTimePicker && (
          <DateTimePicker
            value={selectedTime}
            mode="time"
            is24Hour={false}
            display={Platform.OS === 'ios' ? 'spinner' : 'clock'}
            onChange={onTimeChange}
          />
        )}

        {showTimePicker && Platform.OS === 'android' && (
          <TouchableOpacity onPress={() => setShowTimePicker(false)} style={styles.dismissBtn}>
            <Text style={styles.dismissText}>{text.doneBtn}</Text>
          </TouchableOpacity>
        )}

        <Text style={[styles.label, { marginTop: 8 }]}>{text.purposeOfVisit}</Text>
        <View style={styles.row}>
          <TouchableOpacity
            style={[styles.chipBtn, purpose === 'Restock' && styles.chipActive]}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setPurpose('Restock'); }}
          >
            <Package size={14} color={purpose === 'Restock' ? '#fff' : Theme.colors.textSecondary} />
            <Text style={[styles.chipText, purpose === 'Restock' && styles.chipTextActive]}>{text.restock}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.chipBtn, purpose === 'Collection' && styles.chipActive]}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setPurpose('Collection'); }}
          >
            <CheckSquare size={14} color={purpose === 'Collection' ? '#fff' : Theme.colors.textSecondary} />
            <Text style={[styles.chipText, purpose === 'Collection' && styles.chipTextActive]}>{text.collection}</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.label}>{text.additionalNotes}</Text>
        <TextInput
          style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
          multiline
          placeholder={text.addContext}
          placeholderTextColor={Theme.colors.textSecondary}
          value={notes}
          onChangeText={setNotes}
        />

        <TouchableOpacity 
          style={[styles.saveBtn, !canSave && { opacity: 0.6 }]} 
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); handleSave(); }} 
          disabled={!canSave}
        >
          <Text style={styles.saveBtnText}>{text.saveVisit}</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.discardBtn} 
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.back(); }}
        >
          <Text style={styles.discardBtnText}>{text.discardEntry}</Text>
        </TouchableOpacity>
      </View>
        <View style={{height: 100}} />
      </KeyboardAwareScrollView>
    </View>
  );
}

const getStyles = (Theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
    paddingHorizontal: Theme.spacing.m,
  },
  shopCard: {
    backgroundColor: Theme.colors.card,
    borderRadius: Theme.borderRadius.m,
    padding: Theme.spacing.m,
    marginBottom: Theme.spacing.m,
  },
  badge: {
    backgroundColor: Theme.isDark ? '#5a1d1d' : '#F3DFD6',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    fontSize: 10,
    fontWeight: 'bold',
    color: Theme.colors.accent,
    marginBottom: 8,
  },
  shopName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Theme.colors.primary,
  },
  shopId: {
    fontSize: 12,
    color: Theme.colors.textSecondary,
    fontWeight: 'bold',
    letterSpacing: 1,
    marginTop: 4,
  },
  formContainer: {
    backgroundColor: Theme.colors.card,
    borderRadius: Theme.borderRadius.l,
    padding: Theme.spacing.m,
  },
  formHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Theme.spacing.l,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Theme.colors.primary,
    marginLeft: 8,
  },
  label: {
    fontSize: 10,
    fontWeight: 'bold',
    color: Theme.colors.textSecondary,
    letterSpacing: 1,
    marginBottom: 6,
  },
  pickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.inputBackground,
    borderRadius: Theme.borderRadius.s,
    padding: 12,
    marginBottom: Theme.spacing.m,
    gap: 8,
  },
  pickerBtnText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: Theme.colors.text,
  },
  dismissBtn: {
    alignSelf: 'flex-end',
    backgroundColor: Theme.colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: Theme.spacing.m,
    marginTop: -8,
  },
  dismissText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
  },
  input: {
    backgroundColor: Theme.colors.inputBackground,
    borderRadius: Theme.borderRadius.s,
    padding: 12,
    marginBottom: Theme.spacing.m,
    color: Theme.colors.text,
  },
  row: {
    flexDirection: 'row',
    marginBottom: Theme.spacing.m,
  },
  chipBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Theme.colors.inputBackground,
    paddingVertical: 12,
    borderRadius: Theme.borderRadius.s,
    marginRight: 8,
  },
  chipActive: {
    backgroundColor: Theme.colors.primary,
  },
  chipText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: Theme.colors.textSecondary,
    marginLeft: 8,
  },
  chipTextActive: {
    color: '#fff',
  },
  saveBtn: {
    backgroundColor: Theme.colors.primary,
    paddingVertical: 16,
    borderRadius: Theme.borderRadius.m,
    alignItems: 'center',
    marginTop: Theme.spacing.m,
  },
  saveBtnText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  discardBtn: {
    alignItems: 'center',
    marginTop: 16,
  },
  discardBtnText: {
    color: Theme.colors.textSecondary,
    fontWeight: 'bold',
    fontSize: 12,
    letterSpacing: 1,
  },
});
