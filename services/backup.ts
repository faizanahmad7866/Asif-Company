import * as FileSystem from 'expo-file-system/legacy';
import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';
import { getAllData } from './database';

export const exportLocalBackup = async () => {
  try {
    const allData = await getAllData();
    // Strip out image paths since images aren't backed up anyway
    const shopsWithoutImages = allData.shops.map(({ photoUri, ...shopData }) => shopData);

    const backupPayload = JSON.stringify({
      version: 1,
      createdAt: new Date().toISOString(),
      shops: shopsWithoutImages,
      visits: allData.visits
    });

    const dateStr = new Date().toLocaleDateString('en-GB').replace(/\//g, '-');
    const fileName = `AsifAppBackup_${dateStr}.json`;

    // Use Storage Access Framework for direct download (Android)
    if (Platform.OS === 'android') {
      const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
      if (permissions.granted) {
        const newUri = await FileSystem.StorageAccessFramework.createFileAsync(
          permissions.directoryUri,
          fileName,
          'application/json'
        );
        await FileSystem.writeAsStringAsync(newUri, backupPayload);
        return true;
      } else {
        throw new Error('Storage permission denied.');
      }
    } else {
      // Fallback for iOS
      const fileUri = FileSystem.documentDirectory + fileName;
      await FileSystem.writeAsStringAsync(fileUri, backupPayload);

      const isSharingAvailable = await Sharing.isAvailableAsync();
      if (!isSharingAvailable) {
        throw new Error("Sharing is not available on this device.");
      }

      await Sharing.shareAsync(fileUri, {
        mimeType: 'application/json',
        dialogTitle: 'Save Backup File'
      });
    }

    return true;
  } catch (err: any) {
    console.error('Local Export Error:', err);
    throw err;
  }
};

export const importLocalBackup = async () => {
  try {
    const result = await DocumentPicker.getDocumentAsync({
      type: 'application/json',
      copyToCacheDirectory: true,
    });

    if (result.canceled || !result.assets || result.assets.length === 0) {
      return null;
    }

    const fileUri = result.assets[0].uri;
    const fileContent = await FileSystem.readAsStringAsync(fileUri);
    
    const parsedData = JSON.parse(fileContent);

    if (!parsedData.shops || !parsedData.visits) {
      throw new Error("Invalid backup file format.");
    }

    return parsedData;
  } catch (err: any) {
    console.error('Local Import Error:', err);
    throw err;
  }
};
