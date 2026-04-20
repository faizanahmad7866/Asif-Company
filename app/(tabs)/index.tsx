import { useFocusEffect } from 'expo-router';
import { Clock, History, MapPin, MessageCircle, Navigation, Phone, Share2, TrendingUp } from 'lucide-react-native';
import React, { useCallback, useState } from 'react';
import { Alert, Image, Linking, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppThemeAndText } from '../../hooks/useAppThemeAndText';
import { Shop, getShops } from '../../services/database';
import * as Haptics from 'expo-haptics';

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const [shops, setShops] = useState<Shop[]>([]);
  const { Theme, text } = useAppThemeAndText();
  const styles = getStyles(Theme);

  useFocusEffect(
    useCallback(() => {
      getShops().then(setShops);
    }, [])
  );

  const getFilteredShops = () => {
    const fifteenDaysAgo = Date.now() - (15 * 24 * 60 * 60 * 1000);
    return shops.filter(s => {
      if (!s.lastVisitedTimestamp) return true;
      if (s.lastVisitedTimestamp < fifteenDaysAgo) return true;
      return false;
    }).sort((a, b) => {
      const aIsUnv = !a.lastVisitedTimestamp;
      const bIsUnv = !b.lastVisitedTimestamp;
      
      // If one is unvisited and the other is overdue, overdue comes first
      if (aIsUnv && !bIsUnv) return 1;
      if (!aIsUnv && bIsUnv) return -1;
      
      const aTime = a.lastVisitedTimestamp || 0;
      const bTime = b.lastVisitedTimestamp || 0;
      return aTime - bTime;
    });
  };

  const filteredShops = getFilteredShops();
  const unvisited = shops.filter(s => !s.lastVisitedTimestamp).length;
  const overdue = filteredShops.length - unvisited;

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
    Linking.openURL(`whatsapp://send?text=${encodeURIComponent(msg)}`);
  };

  const handleNavigation = (shop: Shop) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${shop.latitude},${shop.longitude}`;
    Linking.openURL(url).catch(() => Alert.alert('Error', 'Could not open Google Maps.'));
  };

  const handleWhatsAppDirect = (shop: Shop) => {
    const number = shop.contactNumber?.replace(/\D/g, '');
    if (!number) {
      alert('This shop has no phone number saved.');
      return;
    }
    const intlNumber = number.length === 10 ? `91${number}` : number;
    Linking.openURL(`https://wa.me/${intlNumber}`).catch(() => {
      alert('Make sure WhatsApp is installed on your device');
    });
  };

  const handleCall = (shop: Shop) => {
    const phoneNumber = Platform.OS !== 'android' ? `telprompt:${shop.contactNumber}` : `tel:${shop.contactNumber}`;
    Linking.openURL(phoneNumber);
  };

  const renderCard = (shop: Shop) => {
    const isUnvisited = !shop.lastVisitedTimestamp;
    const visitText = shop.lastVisitedTimestamp
      ? new Date(shop.lastVisitedTimestamp).toLocaleDateString()
      : text.noVisitsYet;

    return (
      <View key={shop.id} style={styles.card}>
        {/* Badge row */}
        <View style={styles.cardTop}>
          <View style={[styles.badge, isUnvisited ? styles.badgeNew : styles.badgeOverdue]}>
            <Text style={[styles.badgeText, isUnvisited ? styles.badgeNewText : styles.badgeOverdueText]}>
              {isUnvisited ? text.unvisitedBadge : text.delayedBadge}
            </Text>
          </View>
          <Text style={styles.shopId}>#{shop.id}</Text>
        </View>

        <Text style={styles.shopName}>{shop.name}</Text>

        <View style={styles.infoRow}>
          <MapPin size={13} color={Theme.colors.textSecondary} />
          <Text style={styles.infoText} numberOfLines={1}>{shop.address}</Text>
        </View>

        <View style={styles.infoRow}>
          <History size={13} color={Theme.colors.textSecondary} />
          <Text style={styles.infoText}>{text.lastVisited}: <Text style={styles.infoTextBold}>{visitText}</Text></Text>
        </View>

        <View style={styles.divider} />

        {/* Elegant Action Grid */}
        <View style={styles.actionGrid}>
          <TouchableOpacity activeOpacity={0.7} style={styles.actionIconButton} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); handleCall(shop); }}>
            <View style={[styles.iconCircle, { backgroundColor: Theme.colors.primaryLight }]}>
              <Phone size={18} color={Theme.colors.primary} />
            </View>
            <Text style={styles.actionIconLabel}>{text.callBtn}</Text>
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
            <Text style={styles.actionIconLabel}>{text.whatsappBtn}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <ScrollView style={[styles.container, { paddingTop: insets.top }]} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.companyLabel}>ASIF & COMPANY</Text>
          <Text style={styles.headerTitle}>{text.dashboard}</Text>
        </View>
        <Image source={require('../../assets/images/coconut.png')} style={styles.headerIcon} />
      </View>

      {/* Stats Row */}
      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: Theme.colors.primaryLight }]}>
          <TrendingUp size={18} color={Theme.colors.primary} />
          <Text style={[styles.statNumber, { color: Theme.colors.primary }]}>{shops.length}</Text>
          <Text style={[styles.statLabel, { color: Theme.colors.primary }]}>{text.totalShops}</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: Theme.isDark ? '#4C0519' : '#FFF1F2' }]}>
          <Clock size={18} color="#E11D48" />
          <Text style={[styles.statNumber, { color: "#E11D48" }]}>{overdue}</Text>
          <Text style={[styles.statLabel, { color: "#E11D48" }]}>{text.overdue}</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: Theme.isDark ? '#422006' : '#FEF3C7' }]}>
          <MapPin size={18} color="#D97706" />
          <Text style={[styles.statNumber, { color: "#D97706" }]}>{unvisited}</Text>
          <Text style={[styles.statLabel, { color: "#D97706" }]}>{text.unvisited}</Text>
        </View>
      </View>

      {/* Section Header */}
      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleRow}>
          <Clock size={16} color={Theme.colors.accent} />
          <Text style={styles.sectionTitle}>{text.overdueVisits}</Text>
        </View>
        <View style={styles.countPill}>
          <Text style={styles.countPillText}>{filteredShops.length}</Text>
        </View>
      </View>

      {filteredShops.map(s => renderCard(s))}
      {filteredShops.length === 0 && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>🎉</Text>
          <Text style={styles.emptyTitle}>{text.allCaughtUp}</Text>
          <Text style={styles.emptyText}>{text.noVisitsYet}</Text>
        </View>
      )}

      <View style={{ height: 100 }} />
    </ScrollView>
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
  companyLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.5,
    color: Theme.colors.textMuted,
    marginBottom: 2,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: Theme.colors.primary,
    letterSpacing: -0.5,
  },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: Theme.colors.border,
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: Theme.spacing.m,
    gap: 10,
    marginBottom: Theme.spacing.m,
    marginTop: Theme.spacing.s,
  },
  statCard: {
    flex: 1,
    borderRadius: Theme.borderRadius.l,
    padding: Theme.spacing.s + 4,
    alignItems: 'center',
    gap: 4,
  },
  statNumber: {
    fontSize: 22,
    fontWeight: '800',
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Theme.spacing.m,
    marginBottom: Theme.spacing.m,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Theme.colors.text,
    letterSpacing: 0.1,
  },
  countPill: {
    backgroundColor: Theme.colors.accent,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: Theme.borderRadius.round,
  },
  countPillText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 12,
  },
  card: {
    backgroundColor: Theme.colors.card,
    borderRadius: Theme.borderRadius.l,
    padding: Theme.spacing.m,
    marginHorizontal: Theme.spacing.m,
    marginBottom: Theme.spacing.m,
    ...Theme.shadow.sm,
    borderWidth: Theme.isDark ? 1 : 0,
    borderColor: Theme.colors.border,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: Theme.borderRadius.round,
  },
  badgeNew: {
    backgroundColor: Theme.isDark ? '#422006' : '#FEF3C7',
  },
  badgeOverdue: {
    backgroundColor: Theme.isDark ? '#4C0519' : '#FFF1F2',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  badgeNewText: {
    color: '#D97706',
  },
  badgeOverdueText: {
    color: '#E11D48',
  },
  shopId: {
    fontSize: 11,
    fontWeight: '600',
    color: Theme.colors.textMuted,
    letterSpacing: 0.5,
  },
  shopName: {
    fontSize: 20,
    fontWeight: '700',
    color: Theme.colors.text,
    marginBottom: 8,
    letterSpacing: -0.2,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 5,
  },
  infoText: {
    fontSize: 12,
    color: Theme.colors.textSecondary,
    flex: 1,
  },
  infoTextBold: {
    fontWeight: '600',
    color: Theme.colors.text,
  },
  divider: {
    height: 1,
    backgroundColor: Theme.colors.border,
    marginVertical: 12,
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
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 32,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Theme.colors.text,
    marginBottom: 6,
  },
  emptyText: {
    textAlign: 'center',
    color: Theme.colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
});
