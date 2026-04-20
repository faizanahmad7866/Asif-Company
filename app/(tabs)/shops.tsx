import { useFocusEffect, useRouter } from 'expo-router';
import { MapPin, MessageCircle, Pencil, Phone, Search, Share2, Trash2, X, Navigation, Clock, PlusCircle } from 'lucide-react-native';
import React, { useCallback, useState } from 'react';
import { Image, KeyboardAvoidingView, Linking, Modal, Platform, FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Shop, getShops, deleteShop } from '../../services/database';
import { useAppThemeAndText } from '../../hooks/useAppThemeAndText';

export default function ShopsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [shops, setShops] = useState<Shop[]>([]);
  const [search, setSearch] = useState('');
  const [sortMode, setSortMode] = useState<'alpha' | 'lastVisited' | 'newToday'>('lastVisited');
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [shopToDelete, setShopToDelete] = useState<string | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  const { Theme, text } = useAppThemeAndText();
  const styles = getStyles(Theme);

  const loadShops = async () => {
    const data = await getShops();
    setShops(data);
  };

  useFocusEffect(
    useCallback(() => {
      loadShops();
    }, [])
  );

  const handleWhatsApp = (shop: Shop) => {
    const mapUrl = `https://www.google.com/maps/search/?api=1&query=${shop.latitude},${shop.longitude}`;
    const msg = [
      `📍 Open in Maps: ${mapUrl}`,
      `🧾 Asif & Company — Visit Card`,
      ``,
      `🏠 Shop: *${(shop.name || 'N/A').toUpperCase()}*`,
      `🆔 ID: #${shop.id}`,
      `📞 Phone: *${shop.contactNumber || 'N/A'}*`,
      ``,
      `📍 Address: ${shop.address || 'N/A'}`,
    ].join('\n');
    Linking.openURL(`whatsapp://send?text=${encodeURIComponent(msg)}`).catch(() => {
      alert('Make sure WhatsApp is installed on your device');
    });
  };

  const handleNavigation = (shop: Shop) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${shop.latitude},${shop.longitude}`;
    Linking.openURL(url).catch(() => alert('Could not open Google Maps.'));
  };

  const handleWhatsAppDirect = (shop: Shop) => {
    const number = shop.contactNumber?.replace(/\D/g, '');
    if (!number) {
      alert('This shop has no phone number saved.');
      return;
    }
    // Use international format — prepend 91 (India) if number is 10 digits
    const intlNumber = number.length === 10 ? `91${number}` : number;
    Linking.openURL(`https://wa.me/${intlNumber}`).catch(() => {
      alert('Make sure WhatsApp is installed on your device');
    });
  };

  const handleCall = (shop: Shop) => {
    let phoneNumber = shop.contactNumber;
    if (Platform.OS !== 'android') {
      phoneNumber = `telprompt:${shop.contactNumber}`;
    } else {
      phoneNumber = `tel:${shop.contactNumber}`;
    }
    Linking.openURL(phoneNumber);
  };

  const confirmDeleteShop = (id: string) => {
    setShopToDelete(id);
    setDeleteConfirmText('');
    setDeleteModalVisible(true);
  };

  const executeDeleteShop = async () => {
    if (!shopToDelete) return;
    await deleteShop(shopToDelete);
    setShops(prev => prev.filter(s => s.id !== shopToDelete));
    setDeleteModalVisible(false);
    setShopToDelete(null);
  };

  const getSortedShops = () => {
    const filtered = shops.filter(s =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      (s.address || '').toLowerCase().includes(search.toLowerCase())
    );

    if (sortMode === 'alpha') {
      return filtered.sort((a, b) => a.name.localeCompare(b.name));
    }

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

    if (sortMode === 'newToday') {
      return filtered
        .filter(s => s.createdAt >= startOfToday)
        .sort((a, b) => b.createdAt - a.createdAt);
    }

    return filtered.sort((a, b) => {
      const aVisit = a.lastVisitedTimestamp || 0;
      const bVisit = b.lastVisitedTimestamp || 0;
      const aIsToday = aVisit >= startOfToday;
      const bIsToday = bVisit >= startOfToday;
      if (aIsToday && !bIsToday) return -1;
      if (!aIsToday && bIsToday) return 1;
      if (aVisit > 0 && bVisit === 0) return -1;
      if (aVisit === 0 && bVisit > 0) return 1;
      return bVisit - aVisit;
    });
  };

  const displayList = getSortedShops();

  const sortOptions: { key: 'alpha' | 'lastVisited' | 'newToday'; label: string }[] = [
    { key: 'lastVisited', label: text.sortLastVisited },
    { key: 'alpha', label: text.sortAz },
    { key: 'newToday', label: text.sortNewlyAdded },
  ];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerLabel}>{text.shopDirectoryLabel}</Text>
          <Text style={styles.headerTitle}>{text.shopsHeader}</Text>
        </View>
        <View style={styles.countBadge}>
          <Text style={styles.countBadgeText}>{shops.length}</Text>
        </View>
      </View>

      <View style={styles.searchContainer}>
        <Search size={18} color={Theme.colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder={text.searchPlaceholder}
          placeholderTextColor={Theme.colors.textMuted}
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity activeOpacity={0.7} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setSearch(''); }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <X size={16} color={Theme.colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.chipRow}>
        {sortOptions.map((opt) => (
          <TouchableOpacity activeOpacity={0.7}
            key={opt.key}
            style={[styles.chip, sortMode === opt.key && styles.chipActive]}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setSortMode(opt.key); }}
          >
            <Text style={[styles.chipText, sortMode === opt.key && styles.chipTextActive]}>{opt.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.resultsMeta}>{displayList.length} {displayList.length === 1 ? text.resultsTitle : text.resultsTitlePlural}</Text>

      <FlatList
        data={displayList}
        keyExtractor={(item: Shop) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        renderItem={({ item: shop }: { item: Shop }) => {
          const hasHistory = !!shop.lastVisitedTimestamp;
          const isPending = !hasHistory;
          let visitText = text.noHistory;
          if (hasHistory) {
            const d = new Date(shop.lastVisitedTimestamp!);
            visitText = d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          }

          return (
            <View style={styles.card}>
              {isPending && <View style={styles.pendingIndicator} />}
              {shop.photoUri ? (
                <Image source={{ uri: shop.photoUri }} style={styles.shopPhoto} resizeMode="cover" />
              ) : null}

              {/* ── Shop Identity ── */}
              <View style={styles.cardTop}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.shopIdText}>ID #{shop.id}</Text>
                  <Text style={styles.shopName} numberOfLines={2}>{shop.name}</Text>
                  <View style={styles.infoRow}>
                    <MapPin size={13} color={Theme.colors.textMuted} />
                    <Text style={styles.addressText} numberOfLines={2}>{shop.address}</Text>
                  </View>
                </View>
                <TouchableOpacity activeOpacity={0.7} style={styles.editIconBtn} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push(`/shop/edit/${shop.id}` as any); }}>
                  <Pencil size={20} color={Theme.colors.textMuted} />
                </TouchableOpacity>
              </View>

              {/* ── Elegant Action Grid ── */}
              <View style={styles.actionGrid}>
                <TouchableOpacity activeOpacity={0.7} style={styles.actionIconButton} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); handleCall(shop); }}>
                  <View style={[styles.iconCircle, { backgroundColor: Theme.colors.primaryLight }]}>
                    <Phone size={18} color={Theme.colors.primary} />
                  </View>
                  <Text style={styles.actionIconLabel}>Call</Text>
                </TouchableOpacity>

                <TouchableOpacity activeOpacity={0.7} style={styles.actionIconButton} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); handleWhatsAppDirect(shop); }}>
                  <View style={[styles.iconCircle, { backgroundColor: '#E8F9EE' }]}>
                    <MessageCircle size={18} color="#25D366" />
                  </View>
                  <Text style={styles.actionIconLabel}>WhatsApp</Text>
                </TouchableOpacity>

                <TouchableOpacity activeOpacity={0.7} style={styles.actionIconButton} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); handleNavigation(shop); }}>
                  <View style={[styles.iconCircle, { backgroundColor: '#EEF0FF' }]}>
                    <Navigation size={18} color="#5B6CF8" />
                  </View>
                  <Text style={styles.actionIconLabel}>Navigate</Text>
                </TouchableOpacity>

                <TouchableOpacity activeOpacity={0.7} style={styles.actionIconButton} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); handleWhatsApp(shop); }}>
                  <View style={[styles.iconCircle, { backgroundColor: Theme.isDark ? '#2A2D40' : '#F3F4F6' }]}>
                    <Share2 size={18} color={Theme.colors.textSecondary} />
                  </View>
                  <Text style={styles.actionIconLabel}>Share</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.divider} />

              <View style={styles.cardFooter}>
                <View>
                  <Text style={styles.visitLabel}>{text.lastVisited.toUpperCase()}</Text>
                  <Text style={[styles.visitValue, isPending && { color: Theme.colors.accent }]}>
                    {visitText}
                  </Text>
                </View>
                <TouchableOpacity activeOpacity={0.7}
                  style={[styles.visitBtn, isPending && styles.visitBtnNew]}
                  onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push(`/visit/${shop.id}` as any); }}
                >
                  {isPending ? <MapPin size={14} color="#fff" /> : <Clock size={14} color="#fff" />}
                  <Text style={styles.visitBtnText}>{isPending ? text.initialVisit : text.enterNewVisit}</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          displayList.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>🔍</Text>
              <Text style={styles.emptyText}>{text.noShopsFound}</Text>
            </View>
          ) : null
        }
      />

      <Modal visible={deleteModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'position'}>
            <View style={styles.modalBox}>
              <View style={styles.modalHeader}>
                <Trash2 size={24} color={Theme.colors.error} />
                <Text style={styles.modalTitle}>{text.deleteShopTitle}</Text>
              </View>
              <Text style={styles.modalDesc}>{text.deleteShopDesc}</Text>
              <Text style={styles.modalVerifyLabel}>{text.typeDeleteToConfirm}</Text>
              <TextInput
                style={styles.modalInput}
                value={deleteConfirmText}
                onChangeText={setDeleteConfirmText}
                placeholder="delete"
                placeholderTextColor={Theme.colors.textMuted}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <View style={styles.modalActions}>
                <TouchableOpacity activeOpacity={0.7} style={styles.modalCancelBtn} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setDeleteModalVisible(false); setShopToDelete(null); }}>
                  <Text style={styles.modalCancelText}>{text.cancel}</Text>
                </TouchableOpacity>
                <TouchableOpacity activeOpacity={0.7}
                  style={[styles.modalEraseBtn, deleteConfirmText.toLowerCase() !== 'delete' && styles.modalEraseBtnDisabled]}
                  onPress={executeDeleteShop}
                  disabled={deleteConfirmText.toLowerCase() !== 'delete'}
                >
                  <Text style={styles.modalEraseText}>{text.deleteShopTitle}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
}

const getStyles = (Theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Theme.spacing.m,
    paddingTop: Theme.spacing.m,
    paddingBottom: Theme.spacing.s,
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
  },
  countBadge: {
    backgroundColor: Theme.colors.primaryLight,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Theme.borderRadius.round,
    borderWidth: 1,
    borderColor: Theme.isDark ? Theme.colors.border : '#C6E8D4',
  },
  countBadgeText: {
    fontSize: 16,
    fontWeight: '800',
    color: Theme.colors.primary,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.card,
    marginHorizontal: Theme.spacing.m,
    borderRadius: Theme.borderRadius.l,
    paddingHorizontal: Theme.spacing.m,
    height: 48,
    marginBottom: Theme.spacing.s,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    gap: 10,
    ...Theme.shadow.sm,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    color: Theme.colors.text,
    fontSize: 15,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: Theme.spacing.m,
    gap: 8,
    marginBottom: Theme.spacing.s,
  },
  chip: {
    backgroundColor: Theme.colors.card,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: Theme.borderRadius.round,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  chipActive: {
    backgroundColor: Theme.colors.primary,
    borderColor: Theme.colors.primary,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: Theme.colors.textSecondary,
  },
  chipTextActive: {
    color: '#fff',
  },
  resultsMeta: {
    paddingHorizontal: Theme.spacing.m,
    color: Theme.colors.textMuted,
    marginBottom: Theme.spacing.s,
    fontSize: 12,
    fontWeight: '500',
  },
  listContent: {
    paddingHorizontal: Theme.spacing.m,
    paddingBottom: 120,
  },
  card: {
    backgroundColor: Theme.colors.card,
    borderRadius: Theme.borderRadius.l,
    marginBottom: Theme.spacing.m,
    overflow: 'hidden',
    ...Theme.shadow.sm,
    borderWidth: Theme.isDark ? 1 : 0,
    borderColor: Theme.colors.border,
  },
  pendingIndicator: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    backgroundColor: Theme.colors.accent,
    zIndex: 10,
  },
  shopPhoto: {
    width: '100%',
    height: 120,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: Theme.spacing.m,
    paddingBottom: Theme.spacing.s,
  },
  editIconBtn: {
    padding: 8,
    marginRight: -8,
    marginTop: -8,
  },
  shopIdText: {
    fontSize: 11,
    fontWeight: '700',
    color: Theme.colors.textMuted,
    letterSpacing: 1.2,
    marginBottom: 3,
    textTransform: 'uppercase',
  },
  shopName: {
    fontSize: 22,
    fontWeight: '800',
    color: Theme.colors.text,
    letterSpacing: -0.3,
    marginBottom: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginTop: 2,
  },
  addressText: {
    fontSize: 13,
    color: Theme.colors.textSecondary,
    flex: 1,
    lineHeight: 18,
  },
  actionGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: Theme.spacing.s,
    paddingBottom: Theme.spacing.xs,
  },
  actionIconButton: {
    alignItems: 'center',
    gap: 6,
    width: 70,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionIconLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Theme.colors.textSecondary,
    textAlign: 'center',
  },
  divider: {
    height: 0,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Theme.spacing.m,
    paddingTop: 0,
  },
  visitLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: Theme.colors.textMuted,
    letterSpacing: 1,
    marginBottom: 2,
  },
  visitValue: {
    fontSize: 13,
    fontWeight: '600',
    color: Theme.colors.text,
  },
  visitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Theme.colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    ...Theme.shadow.sm,
  },
  visitBtnNew: {
    backgroundColor: Theme.colors.accent,
  },
  visitBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 12,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: 12,
  },
  emptyText: {
    textAlign: 'center',
    color: Theme.colors.textSecondary,
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalBox: {
    backgroundColor: Theme.colors.background,
    borderRadius: Theme.borderRadius.l,
    padding: 24,
    width: '100%',
    ...Theme.shadow.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Theme.colors.text,
  },
  modalDesc: {
    fontSize: 14,
    color: Theme.colors.textSecondary,
    marginBottom: 24,
    lineHeight: 20,
  },
  modalVerifyLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Theme.colors.text,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  modalInput: {
    borderWidth: 1.5,
    borderColor: Theme.colors.inputBorder,
    borderRadius: Theme.borderRadius.m,
    padding: 14,
    fontSize: 16,
    color: Theme.colors.text,
    marginBottom: 24,
    backgroundColor: Theme.colors.inputBackground,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCancelBtn: {
    flex: 1,
    padding: 14,
    borderRadius: Theme.borderRadius.m,
    backgroundColor: Theme.colors.card,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  modalCancelText: {
    color: Theme.colors.text,
    fontWeight: '600',
  },
  modalEraseBtn: {
    flex: 1,
    padding: 14,
    borderRadius: Theme.borderRadius.m,
    backgroundColor: Theme.colors.error,
    alignItems: 'center',
  },
  modalEraseBtnDisabled: {
    opacity: 0.5,
  },
  modalEraseText: {
    color: '#fff',
    fontWeight: '700',
  },
});
