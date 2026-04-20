import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  Alert, ActivityIndicator, Image,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LocateFixed, ImagePlus, Camera, CheckCircle, RotateCcw } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { addShop, getShops } from '../../services/database';
import { useRouter } from 'expo-router';
import { useAppThemeAndText } from '../../hooks/useAppThemeAndText';

export default function AddScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const { Theme, text } = useAppThemeAndText();
  const styles = getStyles(Theme);

  const [shopName, setShopName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [address, setAddress] = useState<string>(text.autoFetchLoc);
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [photoUri, setPhotoUri] = useState<string>('');

  const fetchLocation = async (showToastOnError: boolean = false) => {
    setIsLocating(true);
    setLocationError(null);
    setAddress(text.fetchingLoc);

    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') {
        const error = 'Location permission denied. Please enable it in device settings.';
        setLocationError(error);
        if (showToastOnError) Alert.alert('Location Permission', error);
        setIsLocating(false);
        return;
      }

      const MAX_ATTEMPTS = 5;
      const DESIRED_ACCURACY_METERS = 20;
      let bestLocation: Location.LocationObject | null = null;

      for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        setAddress(`${text.fetchingLoc} ${attempt}/${MAX_ATTEMPTS}`);
        try {
          const loc = await Promise.race<Location.LocationObject | null>([
            Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.BestForNavigation, mayShowUserSettingsDialog: true }),
            new Promise<null>((resolve) => setTimeout(() => resolve(null), 10000)),
          ]);
          if (!loc) continue;
          if (!bestLocation || loc.coords.accuracy == null || (loc.coords.accuracy < (bestLocation.coords.accuracy ?? Infinity))) {
            bestLocation = loc;
          }
          if (loc.coords.accuracy != null && loc.coords.accuracy <= DESIRED_ACCURACY_METERS) break;
        } catch {
          continue;
        }
      }

      if (!bestLocation) throw new Error('Could not obtain GPS fix. Check GPS/Internet and tap Retry.');

      const { latitude, longitude, accuracy } = bestLocation.coords;
      setCoords({ lat: latitude, lon: longitude });

      let detailedAddress = '';
      try {
        const reverseGeo = await Location.reverseGeocodeAsync({ latitude, longitude });
        if (reverseGeo && reverseGeo.length > 0) {
          const loc = reverseGeo[0];
          const parts = [loc.streetNumber, loc.street, loc.name !== loc.street ? loc.name : null, loc.district || loc.subregion, loc.city, loc.region, loc.postalCode, loc.country].filter(Boolean);
          detailedAddress = parts.join(', ');
        }
      } catch {
        console.warn('reverseGeocode failed, trying Nominatim...');
      }

      if (!detailedAddress || detailedAddress.trim().length < 5) {
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1&zoom=18`,
            { headers: { 'User-Agent': 'AsifCompanySalesApp/1.0' } }
          );
          const data = await response.json();
          if (data?.address) {
            const a = data.address;
            const parts = [a.house_number, a.road || a.pedestrian || a.footway || a.path, a.neighbourhood || a.suburb || a.village || a.hamlet, a.city || a.town || a.municipality || a.county, a.state_district || a.state, a.postcode, a.country].filter(Boolean);
            detailedAddress = parts.join(', ');
          }
        } catch {
          console.warn('Nominatim geocode also failed');
        }
      }

      const accuracyNote = accuracy != null ? ` (±${Math.round(accuracy)}m)` : '';
      setAddress((detailedAddress || text.addressUnavailable) + accuracyNote);
    } catch (err: any) {
      const error = err?.message || 'Auto fetch failed. Check GPS/Internet and tap Retry Location.';
      setLocationError(error);
      if (showToastOnError) Alert.alert('Location Error', error);
    }
    setIsLocating(false);
  };

  useEffect(() => {
    fetchLocation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pickPhoto = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert(text.shopPhoto, text.chooseSource, [
      {
        text: text.camera, onPress: async () => {
          const p = await ImagePicker.requestCameraPermissionsAsync();
          if (p.status !== 'granted') return;
          const r = await ImagePicker.launchCameraAsync({ quality: 0.7, allowsEditing: true, aspect: [4, 3] });
          if (!r.canceled) setPhotoUri(r.assets[0].uri);
        }
      },
      {
        text: text.gallery, onPress: async () => {
          const p = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (p.status !== 'granted') return;
          const r = await ImagePicker.launchImageLibraryAsync({ quality: 0.7, allowsEditing: true, aspect: [4, 3] });
          if (!r.canceled) setPhotoUri(r.assets[0].uri);
        }
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const canSave = !!shopName && !!ownerName && !!coords && (contactNumber || '').length === 10 && !isLocating;

  const handleReset = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setShopName('');
    setOwnerName('');
    setContactNumber('');
    setPhoneError(null);
    setLocationError(null);
    setAddress(text.autoFetchLoc);
    setCoords(null);
    setPhotoUri('');
    fetchLocation(false);
  };

  const handleSave = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (!shopName || !ownerName || !coords) {
      Alert.alert('Required Fields', 'Please fill name, owner and wait for location to load.');
      return;
    }
    if ((contactNumber || '').replace(/\D/g, '').length !== 10) {
      Alert.alert('Invalid Phone', 'Please enter a valid 10-digit mobile number.');
      return;
    }

    try {
      // Duplicate Number Check
      const allShops = await getShops();
      const duplicateShop = allShops.find(s => s.contactNumber === contactNumber);
      if (duplicateShop) {
        Alert.alert(
          'Duplicate Number',
          `A shop named "${duplicateShop.name}" is already registered with this phone number. Please use a unique number.`
        );
        return;
      }

      await addShop({ name: shopName, ownerName, contactNumber, address, latitude: coords.lat, longitude: coords.lon, photoUri });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Success', 'Shop added successfully!');
      router.push('/(tabs)');
      setShopName('');
      setOwnerName('');
      setContactNumber('');
    } catch {
      Alert.alert('Error', 'Could not save shop');
    }
  };

  const locationReady = !isLocating && !!coords && !locationError;

  return (
    <View style={{ flex: 1, backgroundColor: Theme.colors.background }}>
      <KeyboardAwareScrollView
        style={[styles.container, { paddingTop: insets.top }]}
        enableOnAndroid={true}
        extraScrollHeight={80}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerLabel}>NEW SHOP</Text>
            <Text style={styles.headerTitle}>{text.addShopHeader}</Text>
            <Text style={styles.subtitle}>{text.addShopSub}</Text>
          </View>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={handleReset}
            style={styles.resetBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <RotateCcw size={18} color={Theme.colors.primary} />
          </TouchableOpacity>
        </View>

        {/* GPS Card */}
        <View style={styles.card}>
          <View style={styles.gpsHeader}>
            <View style={styles.gpsStatusRow}>
              {(() => {
            const dotColor = locationReady ? Theme.colors.secondary : (isLocating ? '#F59E0B' : Theme.colors.accent);
            return <View style={[styles.gpsStatusDot, { backgroundColor: dotColor }]} />;
          })()}
              <Text style={styles.gpsStatusLabel}>
                {isLocating ? text.fetchingLoc : locationReady ? text.locReady : text.locUnavailable}
              </Text>
            </View>
            <TouchableOpacity activeOpacity={0.7} style={styles.retryBtn} onPress={() => fetchLocation(true)}>
              {isLocating
                ? <ActivityIndicator size="small" color={Theme.colors.primary} />
                : <><LocateFixed size={13} color={Theme.colors.primary} /><Text style={styles.retryBtnText}>{text.retryLoc}</Text></>
              }
            </TouchableOpacity>
          </View>

          {!!locationError && <Text style={styles.errorText}>{locationError}</Text>}

          <View style={styles.coordRow}>
            <View style={styles.coordChip}>
              <Text style={styles.coordLabel}>{text.latLabel}</Text>
              <Text style={styles.coordValue}>{coords ? coords.lat.toFixed(6) : '—'}</Text>
            </View>
            <View style={styles.coordChip}>
              <Text style={styles.coordLabel}>{text.lonLabel}</Text>
              <Text style={styles.coordValue}>{coords ? coords.lon.toFixed(6) : '—'}</Text>
            </View>
          </View>

          <Text style={styles.fieldLabel}>{text.addressEditable}</Text>
          <TextInput
            style={styles.addressInput}
            value={address}
            onChangeText={setAddress}
            multiline
            placeholderTextColor={Theme.colors.textMuted}
          />
        </View>

        <TouchableOpacity activeOpacity={0.7} onPress={pickPhoto} style={styles.photoBox}>
          {photoUri ? (
            <>
              <Image source={{ uri: photoUri }} style={styles.photoPreview} resizeMode="cover" />
              <View style={styles.photoOverlay}>
                <Camera size={14} color="#fff" />
                <Text style={styles.photoOverlayText}>{text.tapToChangePhoto}</Text>
              </View>
            </>
          ) : (
            <>
              <ImagePlus size={18} color={Theme.colors.primary} />
              <Text style={styles.photoBoxText}>{text.addShopPhoto}</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Form */}
        <View style={styles.card}>
          <Text style={styles.fieldLabel}>{text.shopNameLabel}</Text>
          <TextInput
            style={styles.input}
            placeholder={text.shopNamePlaceholder}
            placeholderTextColor={Theme.colors.textMuted}
            value={shopName}
            onChangeText={setShopName}
          />

          <Text style={styles.fieldLabel}>{text.ownerNameFormLabel}</Text>
          <TextInput
            style={styles.input}
            placeholder={text.ownerNamePlaceholder}
            placeholderTextColor={Theme.colors.textMuted}
            value={ownerName}
            onChangeText={setOwnerName}
          />

          <Text style={styles.fieldLabel}>{text.contactNumberLabel}</Text>
          <TextInput
            style={[styles.input, !!phoneError && styles.inputError]}
            placeholder={text.contactPlaceholder}
            placeholderTextColor={Theme.colors.textMuted}
            keyboardType="number-pad"
            maxLength={10}
            value={contactNumber}
            onChangeText={(t) => {
              const digitsOnly = t.replaceAll(/\D/g, '');
              setContactNumber(digitsOnly);
              setPhoneError(digitsOnly.length > 0 && digitsOnly.length < 10 ? text.error10Digit : null);
            }}
          />
          {!!phoneError && <Text style={styles.errorText}>{phoneError}</Text>}

          <TouchableOpacity activeOpacity={0.7} style={[styles.saveBtn, !canSave && styles.saveBtnDisabled]} onPress={handleSave} disabled={!canSave}>
            {canSave && <CheckCircle size={18} color="#fff" />}
            <Text style={styles.saveBtnText}>{text.saveShopBtn}</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 100 }} />
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
  header: {
    paddingTop: Theme.spacing.m,
    paddingBottom: Theme.spacing.m,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  resetBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Theme.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  headerLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.5,
    color: Theme.colors.textMuted,
    marginBottom: 2,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: Theme.colors.primary,
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: Theme.colors.textSecondary,
    lineHeight: 18,
  },
  card: {
    backgroundColor: Theme.colors.card,
    borderRadius: Theme.borderRadius.l,
    padding: Theme.spacing.m,
    marginBottom: Theme.spacing.m,
    ...Theme.shadow.sm,
    borderWidth: Theme.isDark ? 1 : 0,
    borderColor: Theme.colors.border,
  },
  gpsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  gpsStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  gpsStatusDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
  },
  gpsStatusLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Theme.colors.text,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Theme.colors.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: Theme.borderRadius.round,
    borderWidth: 1,
    borderColor: Theme.isDark ? Theme.colors.border : '#C6E8D4',
    minWidth: 80,
    justifyContent: 'center',
  },
  retryBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: Theme.colors.primary,
  },
  coordRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: Theme.spacing.m,
  },
  coordChip: {
    flex: 1,
    backgroundColor: Theme.colors.background,
    borderRadius: Theme.borderRadius.m,
    padding: Theme.spacing.s + 2,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  coordLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: Theme.colors.textMuted,
    letterSpacing: 1,
  },
  coordValue: {
    fontSize: 13,
    fontWeight: '700',
    color: Theme.colors.text,
    marginTop: 2,
  },
  fieldLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: Theme.colors.textSecondary,
    letterSpacing: 0.8,
    marginBottom: 6,
    marginTop: 2,
  },
  input: {
    backgroundColor: Theme.colors.inputBackground,
    borderWidth: 1,
    borderColor: Theme.colors.inputBorder,
    borderRadius: Theme.borderRadius.m,
    padding: 13,
    marginBottom: Theme.spacing.m,
    color: Theme.colors.text,
    fontSize: 15,
  },
  inputError: {
    borderColor: Theme.colors.accent,
  },
  addressInput: {
    backgroundColor: Theme.colors.inputBackground,
    borderWidth: 1,
    borderColor: Theme.colors.inputBorder,
    borderRadius: Theme.borderRadius.m,
    padding: 13,
    color: Theme.colors.text,
    fontSize: 13,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  errorText: {
    color: Theme.colors.accent,
    fontSize: 11,
    fontWeight: '500',
    marginTop: -10,
    marginBottom: 10,
  },
  photoBox: {
    backgroundColor: Theme.colors.card,
    borderRadius: Theme.borderRadius.l,
    height: 72,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Theme.spacing.m,
    flexDirection: 'row',
    gap: 10,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: Theme.isDark ? Theme.colors.border : '#A7D7B6',
    overflow: 'hidden',
    position: 'relative',
  },
  photoBoxText: {
    fontWeight: '600',
    color: Theme.colors.primary,
    fontSize: 14,
  },
  photoPreview: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  photoOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    gap: 6,
  },
  photoOverlayText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 12,
  },
  saveBtn: {
    backgroundColor: Theme.colors.primary,
    padding: 15,
    borderRadius: Theme.borderRadius.m,
    alignItems: 'center',
    marginTop: 4,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  saveBtnDisabled: {
    opacity: 0.45,
  },
  saveBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
    letterSpacing: 0.3,
  },
});
