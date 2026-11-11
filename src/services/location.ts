import { Linking, PermissionsAndroid, Platform } from 'react-native';
import Geolocation from '@react-native-community/geolocation';

export async function currentLocation(): Promise<{
  latitude: number;
  longitude: number;
}> {
  let highAccuracy = true;
  if (Platform.OS === 'android') {
    // Android 12+ cần xin coarse và fine cùng lúc; vẫn nhận vị trí gần đúng.
    const permissions = await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
    ]);
    const fine =
      permissions[PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION];
    const coarse =
      permissions[PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION];
    highAccuracy = fine === PermissionsAndroid.RESULTS.GRANTED;
    if (
      fine !== PermissionsAndroid.RESULTS.GRANTED &&
      coarse !== PermissionsAndroid.RESULTS.GRANTED
    ) {
      throw new Error(
        'Bạn đã từ chối quyền vị trí. Hãy bật quyền trong Cài đặt để gửi vị trí.',
      );
    }
  } else {
    Geolocation.setRNConfiguration({
      skipPermissionRequests: false,
      authorizationLevel: 'whenInUse',
    });
    await new Promise<void>((resolve, reject) =>
      Geolocation.requestAuthorization(resolve, () =>
        reject(
          new Error(
            'Bạn đã từ chối quyền vị trí. Hãy bật quyền trong Cài đặt.',
          ),
        ),
      ),
    );
  }
  return new Promise((resolve, reject) => {
    Geolocation.getCurrentPosition(
      ({ coords }) =>
        resolve({ latitude: coords.latitude, longitude: coords.longitude }),
      error =>
        reject(
          new Error(
            error.code === 1
              ? 'Bạn đã từ chối quyền vị trí.'
              : 'Không lấy được vị trí. Hãy bật GPS và thử lại.',
          ),
        ),
      { enableHighAccuracy: highAccuracy, timeout: 20000, maximumAge: 0 },
    );
  });
}

export async function openLocation(latitude: number, longitude: number) {
  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    Math.abs(latitude) > 90 ||
    Math.abs(longitude) > 180
  ) {
    throw new Error('Tọa độ vị trí không hợp lệ.');
  }
  await Linking.openURL(
    `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`,
  );
}
