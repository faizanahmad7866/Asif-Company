import AsyncStorage from '@react-native-async-storage/async-storage';

export interface Shop {
  id: string; // e.g. '10245'
  name: string;
  ownerName: string;
  contactNumber: string;
  address: string;
  latitude: number;
  longitude: number;
  photoUri?: string;
  lastVisitedTimestamp?: number;
  createdAt: number;
}

export interface Visit {
  id: string;
  shopId: string;
  visitDate: string; // e.g. '11/15/2023'
  visitTimestamp: number; // numeric timestamp of the selected visit date
  arrivalTime: string; // e.g. '09:00 AM'
  purpose: string; // Restock, Collection, etc.
  notes?: string;
}

const SHOPS_KEY = '@asif_shops';
const VISITS_KEY = '@asif_visits';

export const getShops = async (): Promise<Shop[]> => {
  try {
    const data = await AsyncStorage.getItem(SHOPS_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error('Failed to parse shops from async storage', e);
    return [];
  }
};

export const addShop = async (shop: Omit<Shop, 'id' | 'createdAt'>): Promise<Shop> => {
  const shops = await getShops();
  // Generate a random 5 digit ID per UI specification (e.g. #10245)
  const newShopId = Math.floor(10000 + Math.random() * 90000).toString();

  const newShop: Shop = {
    ...shop,
    id: newShopId,
    createdAt: Date.now(),
  };

  shops.push(newShop);
  await AsyncStorage.setItem(SHOPS_KEY, JSON.stringify(shops));
  return newShop;
};

export const updateShop = async (updatedShop: Shop): Promise<void> => {
  const shops = await getShops();
  const index = shops.findIndex((s) => s.id === updatedShop.id);
  if (index !== -1) {
    shops[index] = { ...shops[index], ...updatedShop };
    await AsyncStorage.setItem(SHOPS_KEY, JSON.stringify(shops));
  }
};

export const deleteShop = async (shopId: string): Promise<void> => {
  let shops = await getShops();
  shops = shops.filter((s) => s.id !== shopId);
  await AsyncStorage.setItem(SHOPS_KEY, JSON.stringify(shops));

  // Optionally delete all visits associated with the shop
  let visits = await getVisits();
  visits = visits.filter((v) => v.shopId !== shopId);
  await AsyncStorage.setItem(VISITS_KEY, JSON.stringify(visits));
};

export const getVisits = async (shopId?: string): Promise<Visit[]> => {
  try {
    const data = await AsyncStorage.getItem(VISITS_KEY);
    const allVisits: Visit[] = data ? JSON.parse(data) : [];
    if (shopId) {
      return allVisits.filter((v) => v.shopId === shopId);
    }
    return allVisits;
  } catch (e) {
    console.error('Failed to parse visits', e);
    return [];
  }
};

export const addVisit = async (visit: Omit<Visit, 'id'>): Promise<Visit> => {
  const visits = await getVisits();
  const newVisit: Visit = {
    ...visit,
    id: Date.now().toString(),
  };
  visits.push(newVisit);
  await AsyncStorage.setItem(VISITS_KEY, JSON.stringify(visits));

  const shops = await getShops();
  const shopIndex = shops.findIndex((s) => s.id === visit.shopId);
  if (shopIndex !== -1) {
    // Use the ACTUAL visit date selected by the user (not recording time)
    shops[shopIndex] = {
      ...shops[shopIndex],
      lastVisitedTimestamp: visit.visitTimestamp,
    };
    await AsyncStorage.setItem(SHOPS_KEY, JSON.stringify(shops));
  }

  return newVisit;
};

export const clearAllData = async (): Promise<void> => {
  await AsyncStorage.multiRemove([SHOPS_KEY, VISITS_KEY]);
};

export const getAllData = async (): Promise<{ shops: Shop[], visits: Visit[] }> => {
  const shops = await getShops();
  const visits = await getVisits();
  return { shops, visits };
};

export const importRestoredData = async (data: { shops: Shop[], visits: Visit[] }): Promise<void> => {
  const currentShops = await getShops();
  const currentVisits = await getVisits();

  // Merge shops using Map to prevent duplicates (backup takes precedence if conflict)
  const shopMap = new Map(currentShops.map(s => [s.id, s]));
  (data.shops || []).forEach(s => shopMap.set(s.id, s));

  // Merge visits using Map to prevent duplicates
  const visitMap = new Map(currentVisits.map(v => [v.id, v]));
  (data.visits || []).forEach(v => visitMap.set(v.id, v));

  await AsyncStorage.setItem(SHOPS_KEY, JSON.stringify(Array.from(shopMap.values())));
  await AsyncStorage.setItem(VISITS_KEY, JSON.stringify(Array.from(visitMap.values())));
};
