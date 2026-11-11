// Firebase công bố hàm này ở bản React Native nhưng thiếu trong types của firebase/auth.
import 'firebase/auth';
import type { Persistence } from 'firebase/auth';
import type AsyncStorage from '@react-native-async-storage/async-storage';
declare module 'firebase/auth' {
  export function getReactNativePersistence(
    storage: typeof AsyncStorage,
  ): Persistence;
}
