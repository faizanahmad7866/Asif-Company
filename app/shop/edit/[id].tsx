import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TextInput,
  TouchableOpacity, Alert, ActivityIndicator, Image
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Camera, LocateFixed, Save, Trash2, ChevronLeft, ImagePlus } from 'lucide-react-native';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { getShops, updateShop, deleteShop, Shop } from '../../../services/database';
import { useAppThemeAndText } from '../../../hooks/useAppThemeAndText';

export default function EditShopScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const { Theme, text } = useAppThemeAndText();
  const styles = getStyles(Theme);

  const [shop, setShop] = useState<Shop | null>(null);

  const [name, setName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [address, setAddress] = useState('');
  const [photoUri, setPhotoUri] = useState<string>('');
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null);

  const [isLocating, setIsLocating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    getShops().then(shops => {
      const s = shops.find(s => s.id === id);
      if (s) {
        setShop(s);
        setName(s.name);
        setOwnerName(s.ownerName);
        setContactNumber(s.contactNumber);
        setAddress(s.address);
        setPhotoUri(s.photoUri || '');
        setCoords({ lat: s.latitude, lon: s.longitude });
      }
    });
  }, [id]);

  const pickImage = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert(
      'Shop Photo',
      'Choose image source',
      [
        { text: 'Camera', onPress: () => launchCamera() },
        { text: 'Gallery', onPress: () => launchGallery() },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const launchCamera = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (perm.status !== 'granted') return;
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      allowsEditing: true,
      aspect: [4, 3],
    });
    if (!result.canceled && result.assets.length > 0) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const launchGallery = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (perm.status !== 'granted') return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      allowsEditing: true,
      aspect: [4, 3],
    });
    if (!result.canceled && result.assets.length > 0) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const refetchLocation = async () => {
    setIsLocating(true);
    setAddress(text.fetchingLoc);
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (perm.status !== 'granted') {
        setIsLocating(false);
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.BestForNavigation });
      const { latitude, longitude, accuracy } = loc.coords;
      setCoords({ lat: latitude, lon: longitude });

      let addr = '';
      try {
        const geo = await Location.reverseGeocodeAsync({ latitude, longitude });
        if (geo.length > 0) {
          const [g] = geo;
          addr = [g.streetNumber, g.street, g.district ?? g.subregion, g.city, g.region, g.country].filter(Boolean).join(', ');
        }
      } catch {}
      const accNote = accuracy != null ? ` (±${Math.round(accuracy)}m)` : '';
      setAddress((addr || text.locUnavailable) + accNote);
    } catch {
      Alert.alert('Error', 'Location fetch failed.');
    }
    setIsLocating(false);
  };

  const handleSave = async () => {
    if (!name.trim() || !ownerName.trim()) return;
    if (!shop || !coords) return;

    setIsSaving(true);
    try {
      await updateShop({
        ...shop,
        name: name.trim(),
        ownerName: ownerName.trim(),
        contactNumber: contactNumber.trim(),
        address: address.trim(),
        latitude: coords.lat,
        longitude: coords.lon,
        photoUri: photoUri,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch {}
    setIsSaving(false);
  };

  const handleDelete = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    Alert.alert(
      text.deleteShopTitle,
      text.deleteShopSub,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive', onPress: async () => {
            if (!shop) return;
            await deleteShop(shop.id);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            router.replace('/(tabs)/shops');
          }
        }
      ]
    );
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
        <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ChevronLeft size={22} color={Theme.colors.primary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.badge}>{text.editShopBadge} · #{shop.id}</Text>
          <Text style={styles.headerTitle}>{text.editShop}</Text>
        </View>
        <TouchableOpacity onPress={handleDelete} style={styles.deleteBtn}>
          <Trash2 size={18} color={Theme.colors.accent} />
        </TouchableOpacity>
      </View>

      <TouchableOpacity onPress={pickImage} activeOpacity={0.85} style={styles.photoBox}>
        {photoUri ? (
          <>
            <Image source={{ uri: photoUri }} style={styles.photoImage} resizeMode="cover" />
            <View style={styles.photoOverlay}>
              <Camera size={20} color="#fff" />
              <Text style={styles.photoOverlayText}>{text.changePhoto}</Text>
            </View>
          </>
        ) : (
          <>
            <ImagePlus size={32} color={Theme.colors.primary} />
            <Text style={styles.photoAddTitle}>{text.addShopPhotoEdit}</Text>
          </>
        )}
      </TouchableOpacity>

      <View style={styles.formContainer}>
        <Text style={styles.label}>{text.shopNameLabel}</Text>
        <TextInput style={styles.input} value={name} onChangeText={setName} />

        <Text style={styles.label}>{text.ownerNameFormLabel}</Text>
        <TextInput style={styles.input} value={ownerName} onChangeText={setOwnerName} />

        <Text style={styles.label}>{text.contactNumberLabel}</Text>
        <TextInput style={styles.input} value={contactNumber} onChangeText={setContactNumber} keyboardType="phone-pad" />

        <Text style={styles.label}>{text.locationLabel}</Text>
        <View style={styles.coordRow}>
          <View style={styles.coordChip}>
            <Text style={styles.coordLabel}>LAT</Text>
            <Text style={styles.coordVal}>{coords ? coords.lat.toFixed(6) : '-'}</Text>
          </View>
          <View style={styles.coordChip}>
            <Text style={styles.coordLabel}>LON</Text>
            <Text style={styles.coordVal}>{coords ? coords.lon.toFixed(6) : '-'}</Text>
          </View>
          <TouchableOpacity style={styles.refetchBtn} onPress={refetchLocation} disabled={isLocating}>
            {isLocating
              ? <ActivityIndicator size="small" color={Theme.colors.primary} />
              : <LocateFixed size={16} color={Theme.colors.primary} />
            }
          </TouchableOpacity>
        </View>

        <Text style={styles.label}>{text.addressEditable}</Text>
        <TextInput
          style={[styles.input, { minHeight: 60, textAlignVertical: 'top' }]}
          value={address}
          onChangeText={setAddress}
          multiline
        />

        {isLocating && (
          <Text style={styles.gpsStatus}>{address}</Text>
        )}

        <TouchableOpacity 
          style={styles.saveBtn} 
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); handleSave(); }} 
          disabled={isSaving}
        >
          {isSaving
            ? <ActivityIndicator color="#fff" />
            : (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Save size={18} color="#fff" />
                <Text style={styles.saveBtnText}>{text.saveChangesLabel}</Text>
              </View>
            )
          }
        </TouchableOpacity>
      </View>

        <View style={{ height: 100 }} />
      </KeyboardAwareScrollView>
    </View>
  );
}

const getStyles = (Theme: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.colors.background, paddingHorizontal: Theme.spacing.m },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: Theme.spacing.m, marginTop: Theme.spacing.m },
  backBtn: { padding: 4, marginRight: 8 },
  badge: { fontSize: 10, fontWeight: 'bold', color: Theme.colors.textSecondary, letterSpacing: 1 },
  headerTitle: { fontSize: 28, fontWeight: '800', color: Theme.colors.primary },
  deleteBtn: { backgroundColor: Theme.colors.error, padding: 10, borderRadius: 10 },
  photoBox: {
    backgroundColor: Theme.colors.card,
    borderRadius: Theme.borderRadius.m,
    minHeight: 160,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Theme.spacing.m,
    overflow: 'hidden',
    position: 'relative',
  },
  photoImage: { width: '100%', height: 200 },
  photoOverlay: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(0,0,0,0.45)', flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center', paddingVertical: 10, gap: 8,
  },
  photoOverlayText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
  photoAddTitle: { fontWeight: 'bold', color: Theme.colors.primary, marginTop: 10, fontSize: 15 },
  photoAddSub: { fontSize: 12, color: Theme.colors.textSecondary, marginTop: 4 },
  formContainer: { backgroundColor: Theme.colors.card, borderRadius: Theme.borderRadius.m, padding: Theme.spacing.m },
  label: { fontSize: 10, fontWeight: 'bold', color: Theme.colors.textSecondary, letterSpacing: 1, marginBottom: 6, marginTop: 4 },
  input: {
    backgroundColor: Theme.colors.inputBackground, borderRadius: Theme.borderRadius.s,
    padding: 12, marginBottom: Theme.spacing.m, color: Theme.colors.text, fontSize: 14,
  },
  coordRow: { flexDirection: 'row', gap: 8, marginBottom: Theme.spacing.m, alignItems: 'center' },
  coordChip: { flex: 1, backgroundColor: Theme.colors.inputBackground, borderRadius: Theme.borderRadius.s, padding: 10 },
  coordLabel: { fontSize: 9, fontWeight: 'bold', color: Theme.colors.textSecondary, letterSpacing: 1 },
  coordVal: { fontSize: 13, fontWeight: 'bold', color: Theme.colors.text, marginTop: 2 },
  refetchBtn: {
    backgroundColor: Theme.colors.inputBackground, padding: 12, borderRadius: Theme.borderRadius.s,
    justifyContent: 'center', alignItems: 'center', width: 46,
  },
  gpsStatus: { fontSize: 11, color: Theme.colors.textSecondary, marginTop: -12, marginBottom: 8, fontStyle: 'italic' },
  saveBtn: {
    backgroundColor: Theme.colors.primary, padding: 16,
    borderRadius: Theme.borderRadius.m, alignItems: 'center', marginTop: 8,
  },
  saveBtnText: { color: '#fff', fontWeight: 'bold', letterSpacing: 1 },
});
