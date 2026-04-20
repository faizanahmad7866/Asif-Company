import * as ImagePicker from 'expo-image-picker';
import * as Print from 'expo-print';
import { useRouter } from 'expo-router';
import * as Sharing from 'expo-sharing';
import {
  Check,
  DownloadCloud,
  FileText,
  ImageUp,
  KeyRound, Languages,
  Lock,
  Pencil,
  Trash2,
  UploadCloud,
  User,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Image, Modal, Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppThemeAndText } from '../../hooks/useAppThemeAndText';
import {
  exportLocalBackup,
  importLocalBackup,
} from '../../services/backup';
import { clearAllData, getShops, importRestoredData } from '../../services/database';
import { getAppLock, getOwnerProfile, setAppLock, setOwnerProfile } from '../../services/settings';

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [ownerName, setOwnerName] = useState('Asif & Company');
  const [ownerPhoto, setOwnerPhoto] = useState<string | undefined>(undefined);
  const [phoneNumber, setPhoneNumber] = useState('+91 0000000000');
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [lockEnabled, setLockEnabled] = useState(false);
  const [eraseModalVisible, setEraseModalVisible] = useState(false);
  const [eraseConfirmText, setEraseConfirmText] = useState('');

  const { Theme, text, language, setLanguage, theme, setTheme } = useAppThemeAndText();
  const styles = getStyles(Theme);

  useEffect(() => {
    (async () => {
      const profile = await getOwnerProfile();
      setOwnerName(profile.ownerName || 'Asif & Company');
      setOwnerPhoto(profile.photoUri);
      if (profile.phoneNumber) setPhoneNumber(profile.phoneNumber);
      const lock = await getAppLock();
      setLockEnabled(!!lock.enabled);
    })();
  }, []);

  const pickPhoto = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (perm.status !== 'granted') {
      Alert.alert('Permission', 'Media library permission is required.');
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8 });
    if (!res.canceled && res.assets && res.assets.length > 0) {
      setOwnerPhoto(res.assets[0].uri);
    }
  };

  const saveProfile = async () => {
    await setOwnerProfile({ ownerName, photoUri: ownerPhoto, phoneNumber });
    setIsEditingProfile(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert('Saved', 'Profile updated.');
  };

  const toggleLock = async (val: boolean) => {
    Haptics.selectionAsync();
    setLockEnabled(val);
    if (val) {
      const lock = await getAppLock();
      if (!lock.passcodeHash) {
        Alert.alert('Passcode Required', 'Please set a 4-digit passcode first.');
        setLockEnabled(false);
        await setAppLock({ enabled: false });
        return;
      }
      await setAppLock({ enabled: true, passcodeHash: lock.passcodeHash });
    } else {
      await setAppLock({ enabled: false });
    }
  };

  const handleBackup = async () => {
    try {
      await exportLocalBackup();
      Alert.alert(text.backupComplete, text.backupSuccess);
    } catch (err: any) {
      if (err.message === 'User did not share') return;
      console.error(err);
      Alert.alert('Backup Failed', String(err.message || err));
    }
  };

  const handleRestore = async () => {
    Alert.alert(text.restoreWarningTitle, text.restoreWarningText, [
      { text: text.cancel, style: 'cancel' },
      {
        text: text.yes, style: 'destructive', onPress: async () => {
          try {
            const restoredData = await importLocalBackup();
            if (restoredData) {
              await importRestoredData(restoredData);
              Alert.alert(text.restoreComplete, text.restoreSuccess);
            }
          } catch (err) {
            console.error(err);
            Alert.alert(text.restoreFailed, text.restoreIssue);
          }
        }
      }
    ]);
  };

  const handleEraseAllData = async () => {
    await clearAllData();
    setEraseModalVisible(false);
    setEraseConfirmText('');
    Alert.alert('Done', 'All app data has been permanently erased.');
  };

  const exportPDF = async () => {
    try {
      const shops = await getShops();
      const htmlRows = shops.map(s => `
        <tr>
          <td>${s.id}</td><td>${s.name}</td><td>${s.ownerName}</td>
          <td>${s.contactNumber}</td><td>${s.address}</td>
          <td>${s.lastVisitedTimestamp ? new Date(s.lastVisitedTimestamp).toLocaleDateString() : 'Never'}</td>
        </tr>
      `).join('');
      const html = `
        <html><head><style>
          body{font-family:sans-serif;padding:20px}
          h1{color:#1b3d2b}
          table{width:100%;border-collapse:collapse;margin-top:20px}
          th,td{border:1px solid #ddd;padding:8px;text-align:left}
          th{background:#f3f4ed;color:#1b3d2b}
        </style></head><body>
          <h1>Asif & Company - Master Shop Database</h1>
          <p>Generated on: ${new Date().toLocaleString()}</p>
          <table>
            <tr><th>ID</th><th>Shop Name</th><th>Proprietor</th><th>Contact</th><th>Address</th><th>Last Visit</th></tr>
            ${htmlRows}
          </table>
        </body></html>`;
      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
    } catch {
      Alert.alert('Export Error', 'Failed to generate PDF report.');
    }
  };

  return (
    <ScrollView style={[styles.container, { paddingTop: insets.top }]} showsVerticalScrollIndicator={false}>

      {/* ── Profile Header Card ─────────────────── */}
      <View style={styles.profileCard}>
        <View style={styles.profileCardTop}>
          <Text style={styles.profileBrand}>ASIF & COMPANY</Text>
          <Image source={require('../../assets/images/coconut.png')} style={styles.profileLogo} resizeMode="contain" />
        </View>

        <View style={styles.profileRow}>
          <TouchableOpacity activeOpacity={0.7} onPress={pickPhoto} style={styles.avatarWrap}>
            {ownerPhoto
              ? <Image source={{ uri: ownerPhoto }} style={styles.avatar} resizeMode="cover" />
              : <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <User size={36} color="rgba(255,255,255,0.7)" />
              </View>
            }
            <View style={styles.avatarEdit}>
              <ImageUp size={10} color="#fff" />
            </View>
          </TouchableOpacity>

          <View style={styles.profileMeta}>
            {isEditingProfile ? (
              <>
                <TextInput
                  style={styles.profileInput}
                  value={ownerName}
                  onChangeText={setOwnerName}
                  placeholder="Owner Name"
                  placeholderTextColor="rgba(255,255,255,0.5)"
                />
                <TextInput
                  style={[styles.profileInput, { marginTop: 8 }]}
                  value={phoneNumber}
                  onChangeText={setPhoneNumber}
                  placeholder="Phone Number"
                  keyboardType="phone-pad"
                  placeholderTextColor="rgba(255,255,255,0.5)"
                />
              </>
            ) : (
              <>
                <Text style={styles.profileName} numberOfLines={1}>{ownerName}</Text>
                <Text style={styles.profilePhone}>{phoneNumber}</Text>
              </>
            )}
          </View>

          <TouchableOpacity activeOpacity={0.7}
            style={styles.editToggleBtn}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); if (isEditingProfile) saveProfile(); else setIsEditingProfile(true); }}
          >
            {isEditingProfile
              ? <Check size={16} color="#fff" />
              : <Pencil size={14} color="#fff" />
            }
            <Text style={styles.editToggleBtnText}>{isEditingProfile ? 'Save' : 'Edit'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Page Title */}
      <Text style={styles.pageTitle}>{text.settingsTitle}</Text>
      <Text style={styles.pageSubtitle}>{text.settingsSubtitle}</Text>

      {/* ── Display & Language ─────────────────── */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Languages size={18} color={Theme.colors.primary} />
          <Text style={styles.sectionTitle}>{text.displayLanguage}</Text>
        </View>

        <View style={styles.prefRow}>
          <View>
            <Text style={styles.prefTitle}>{text.darkModeTitle}</Text>
            <Text style={styles.prefSub}>{text.darkModeSub}</Text>
          </View>
          <Switch
            value={theme === 'dark'}
            onValueChange={(val) => { Haptics.selectionAsync(); setTheme(val ? 'dark' : 'light'); }}
            trackColor={{ false: Theme.colors.border, true: Theme.colors.primary }}
            thumbColor="#fff"
          />
        </View>

        <View style={[styles.prefRow, { marginBottom: 0 }]}>
          <View>
            <Text style={styles.prefTitle}>{text.hindiLanguage}</Text>
            <Text style={styles.prefSub}>{text.hindiLanguageSub}</Text>
          </View>
          <Switch
            value={language === 'hi'}
            onValueChange={(val) => { Haptics.selectionAsync(); setLanguage(val ? 'hi' : 'en'); }}
            trackColor={{ false: Theme.colors.border, true: Theme.colors.primary }}
            thumbColor="#fff"
          />
        </View>
      </View>

      {/* ── Export ─────────────────────────────── */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <DownloadCloud size={18} color={Theme.colors.primary} />
          <Text style={styles.sectionTitle}>{text.manualExport}</Text>
        </View>
        <Text style={styles.sectionDesc}>{text.manualExportSub}</Text>
        <TouchableOpacity activeOpacity={0.7} style={styles.actionRow} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); exportPDF(); }}>
          <Text style={styles.actionLabel}>{text.downloadPdf}</Text>
          <FileText size={18} color={Theme.colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* ── App Lock ──────────────────────────── */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Lock size={18} color={Theme.colors.primary} />
          <Text style={styles.sectionTitle}>{text.appLock}</Text>
        </View>
        <Text style={styles.sectionDesc}>{text.appLockSub}</Text>
        <View style={styles.prefRow}>
          <View>
            <Text style={styles.prefTitle}>{text.enableAppLock}</Text>
            <Text style={styles.prefSub}>{text.requirePasscode}</Text>
          </View>
          <Switch
            value={lockEnabled}
            onValueChange={toggleLock}
            trackColor={{ false: Theme.colors.border, true: Theme.colors.primary }}
            thumbColor="#fff"
          />
        </View>
        <TouchableOpacity activeOpacity={0.7} style={styles.actionRow} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/lock?setup=true'); }}>
          <Text style={styles.actionLabel}>{text.setPasscode}</Text>
          <KeyRound size={18} color={Theme.colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* ── Backup & Restore ──────────────────── */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <UploadCloud size={18} color={Theme.colors.primary} />
          <Text style={styles.sectionTitle}>{text.backupRestore}</Text>
        </View>
        <Text style={styles.sectionDesc}>
          {text.backupInfoMsg || 'Save all data locally or restore from a previous JSON file.'}
        </Text>
        <TouchableOpacity activeOpacity={0.7} style={styles.actionRow} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); handleBackup(); }}>
          <Text style={styles.actionLabel}>{text.backupToDrive}</Text>
          <UploadCloud size={18} color={Theme.colors.textSecondary} />
        </TouchableOpacity>
        <TouchableOpacity activeOpacity={0.7} style={[styles.actionRow, { marginBottom: 0 }]} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); handleRestore(); }}>
          <Text style={styles.actionLabel}>{text.restoreFromDrive}</Text>
          <DownloadCloud size={18} color={Theme.colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* ── Erase All Data ──────────────────── */}
      <View style={styles.eraseCard}>
        <View style={styles.sectionHeader}>
          <Trash2 size={18} color={Theme.colors.accent} />
          <Text style={[styles.sectionTitle, { color: Theme.colors.accent }]}>{text.dangerZone}</Text>
        </View>
        <Text style={styles.sectionDesc}>{text.eraseAllDataDesc}</Text>
        <TouchableOpacity activeOpacity={0.7} style={styles.eraseBtn} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); setEraseModalVisible(true); }}>
          <Trash2 size={16} color="#fff" />
          <Text style={styles.eraseBtnText}>{text.eraseAllData}</Text>
        </TouchableOpacity>
      </View>

      {/* ── Erase Confirmation Modal ─────────── */}
      <Modal visible={eraseModalVisible} transparent animationType="fade" onRequestClose={() => setEraseModalVisible(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setEraseModalVisible(false)}>
          <Pressable style={styles.modalBox} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalIconWrap}>
              <Trash2 size={28} color={Theme.colors.accent} />
            </View>
            <Text style={styles.modalTitle}>{text.eraseConfirmTitle}</Text>
            <Text style={styles.modalDesc}>{text.eraseConfirmDesc} <Text style={{ fontWeight: '800', color: Theme.colors.accent }}>{text.eraseConfirmWord}</Text> below to confirm.</Text>
            <TextInput
              style={styles.modalInput}
              value={eraseConfirmText}
              onChangeText={setEraseConfirmText}
              placeholder={text.eraseConfirmPlaceholder}
              placeholderTextColor={Theme.colors.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity activeOpacity={0.7} style={styles.modalCancelBtn} onPress={() => { setEraseModalVisible(false); setEraseConfirmText(''); }}>
                <Text style={styles.modalCancelText}>{text.cancel}</Text>
              </TouchableOpacity>
              <TouchableOpacity activeOpacity={0.7}
                style={[styles.modalEraseBtn, eraseConfirmText.toLowerCase() !== 'delete' && styles.modalEraseBtnDisabled]}
                onPress={handleEraseAllData}
                disabled={eraseConfirmText.toLowerCase() !== 'delete'}
              >
                <Text style={styles.modalEraseBtnText}>{text.eraseBtn}</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

const getStyles = (Theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
    paddingHorizontal: Theme.spacing.m,
  },

  /* Profile Header */
  profileCard: {
    backgroundColor: Theme.isDark ? '#1B3A2A' : '#1B3D2B',
    borderRadius: Theme.borderRadius.xl,
    padding: Theme.spacing.m,
    marginBottom: Theme.spacing.l,
    marginTop: Theme.spacing.s,
    ...Theme.shadow.lg,
  },
  profileCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  profileBrand: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  profileLogo: {
    width: 22,
    height: 22,
    opacity: 0.85,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarWrap: {
    position: 'relative',
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2.5,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  avatarPlaceholder: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarEdit: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#27AE60',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#1B3D2B',
  },
  profileMeta: {
    flex: 1,
  },
  profileName: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
    letterSpacing: -0.2,
  },
  profilePhone: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    fontWeight: '500',
  },
  profileInput: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    color: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    fontSize: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  editToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Theme.borderRadius.round,
    alignSelf: 'flex-start',
  },
  editToggleBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },

  /* Page Labels */
  pageTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: Theme.colors.text,
    letterSpacing: -0.3,
    marginBottom: 2,
  },
  pageSubtitle: {
    fontSize: 13,
    color: Theme.colors.textSecondary,
    marginBottom: Theme.spacing.l,
  },

  /* Section Card */
  sectionCard: {
    backgroundColor: Theme.colors.card,
    borderRadius: Theme.borderRadius.l,
    padding: Theme.spacing.m,
    marginBottom: Theme.spacing.m,
    ...Theme.shadow.sm,
    borderWidth: Theme.isDark ? 1 : 0,
    borderColor: Theme.colors.border,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Theme.colors.text,
    letterSpacing: -0.1,
  },
  sectionDesc: {
    fontSize: 12,
    color: Theme.colors.textSecondary,
    marginBottom: 14,
    lineHeight: 17,
  },

  /* Pref Row */
  prefRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  prefTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Theme.colors.text,
    marginBottom: 2,
  },
  prefSub: {
    fontSize: 11,
    color: Theme.colors.textSecondary,
  },

  /* Action Row */
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Theme.colors.background,
    padding: 14,
    borderRadius: Theme.borderRadius.m,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  actionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Theme.colors.text,
  },

  /* Erase Section */
  eraseCard: {
    backgroundColor: Theme.isDark ? '#2A0F0F' : '#FEF2F2',
    borderRadius: Theme.borderRadius.l,
    padding: Theme.spacing.m,
    marginBottom: Theme.spacing.m,
    borderWidth: 1,
    borderColor: Theme.isDark ? '#5A1D1D' : '#FECACA',
  },
  eraseBtn: {
    backgroundColor: '#DC2626',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: Theme.borderRadius.m,
    marginTop: 4,
  },
  eraseBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
    letterSpacing: 0.3,
  },

  /* Modal */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Theme.spacing.m,
  },
  modalBox: {
    backgroundColor: Theme.colors.card,
    borderRadius: Theme.borderRadius.xl,
    padding: Theme.spacing.l,
    width: '100%',
    maxWidth: 360,
    ...Theme.shadow.lg,
  },
  modalIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Theme.isDark ? '#2A0F0F' : '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Theme.spacing.m,
    alignSelf: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Theme.colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  modalDesc: {
    fontSize: 13,
    color: Theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: Theme.spacing.m,
  },
  modalInput: {
    backgroundColor: Theme.colors.inputBackground,
    borderWidth: 1.5,
    borderColor: Theme.colors.inputBorder,
    borderRadius: Theme.borderRadius.m,
    padding: 13,
    fontSize: 15,
    color: Theme.colors.text,
    marginBottom: Theme.spacing.m,
    textAlign: 'center',
    letterSpacing: 1,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: Theme.borderRadius.m,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    alignItems: 'center',
  },
  modalCancelText: {
    fontWeight: '600',
    color: Theme.colors.textSecondary,
    fontSize: 14,
  },
  modalEraseBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: Theme.borderRadius.m,
    backgroundColor: '#DC2626',
    alignItems: 'center',
  },
  modalEraseBtnDisabled: {
    backgroundColor: '#DC2626',
    opacity: 0.35,
  },
  modalEraseBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
});

