import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApps, initializeApp } from 'firebase/app';
import {
  connectAuthEmulator,
  getAuth,
  getReactNativePersistence,
  initializeAuth,
} from 'firebase/auth';
import { connectDatabaseEmulator, getDatabase } from 'firebase/database';
import config from './firebase.config.json';

// Named per project, so a config change cannot reuse another project's app.
const app =
  getApps().find(item => item.name === config.projectId) ??
  initializeApp(config, config.projectId);
function persistentAuth() {
  try {
    return initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  } catch (error) {
    if ((error as { code?: string }).code === 'auth/already-initialized') {
      return getAuth(app);
    }
    throw error;
  }
}
export const auth = persistentAuth();
export const database = getDatabase(app);
export const usingEmulators = config.useEmulators;
if (usingEmulators && !auth.emulatorConfig) {
  const host =
    config.emulatorHost ||
    (Platform.OS === 'android' ? '10.0.2.2' : '127.0.0.1');
  connectAuthEmulator(auth, `http://${host}:9099`, { disableWarnings: true });
  connectDatabaseEmulator(database, host, 9000);
}
