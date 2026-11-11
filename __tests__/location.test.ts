import { PermissionsAndroid, Platform, Linking } from 'react-native';
import Geolocation from '@react-native-community/geolocation';
import { currentLocation, openLocation } from '../src/services/location';

jest.mock('@react-native-community/geolocation', () => ({
  getCurrentPosition: jest.fn(success =>
    success({ coords: { latitude: 21, longitude: 105 } }),
  ),
}));
beforeEach(() => {
  jest.clearAllMocks();
  jest.replaceProperty(Platform, 'OS', 'android');
});
afterEach(() => jest.restoreAllMocks());

test('requests fine and coarse together and accepts approximate location', async () => {
  const request = jest
    .spyOn(PermissionsAndroid, 'requestMultiple')
    .mockResolvedValue({
      'android.permission.ACCESS_FINE_LOCATION': 'denied',
      'android.permission.ACCESS_COARSE_LOCATION': 'granted',
    } as Awaited<ReturnType<typeof PermissionsAndroid.requestMultiple>>);
  await expect(currentLocation()).resolves.toEqual({
    latitude: 21,
    longitude: 105,
  });
  expect(request).toHaveBeenCalledWith([
    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
    PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
  ]);
  expect(Geolocation.getCurrentPosition).toHaveBeenCalledWith(
    expect.any(Function),
    expect.any(Function),
    expect.objectContaining({ enableHighAccuracy: false }),
  );
});

test('refusing both permissions does not read GPS', async () => {
  jest.spyOn(PermissionsAndroid, 'requestMultiple').mockResolvedValue({
    'android.permission.ACCESS_FINE_LOCATION': 'denied',
    'android.permission.ACCESS_COARSE_LOCATION': 'denied',
  } as Awaited<ReturnType<typeof PermissionsAndroid.requestMultiple>>);
  await expect(currentLocation()).rejects.toThrow(/từ chối/);
  expect(Geolocation.getCurrentPosition).not.toHaveBeenCalled();
});

test('Maps URL includes exact coordinates and rejects invalid coordinates', async () => {
  const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
  await openLocation(21.02851, 105.804817);
  expect(open).toHaveBeenCalledWith(
    'https://www.google.com/maps/search/?api=1&query=21.02851,105.804817',
  );
  await expect(openLocation(91, 105)).rejects.toThrow(/không hợp lệ/);
  expect(open).toHaveBeenCalledTimes(1);
});
