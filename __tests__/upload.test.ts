import { PermissionsAndroid, Platform } from 'react-native';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import { pickImage, uploadImage } from '../src/services/uploadService';
jest.mock('react-native-image-picker', () => ({
  launchCamera: jest.fn(),
  launchImageLibrary: jest.fn(),
}));
const originalFetch = globalThis.fetch;
afterEach(() => {
  jest.restoreAllMocks();
  globalThis.fetch = originalFetch;
});
test('photo picker returns resized asset and requests a maximum 1024px before any upload', async () => {
  const asset = {
    uri: 'file:///selected.jpg',
    width: 768,
    height: 1024,
    type: 'image/jpeg',
  };
  jest.mocked(launchImageLibrary).mockResolvedValueOnce({ assets: [asset] });
  expect(await pickImage(false)).toEqual(asset);
  expect(launchImageLibrary).toHaveBeenCalledWith(
    expect.objectContaining({
      maxWidth: 1024,
      maxHeight: 1024,
      selectionLimit: 1,
    }),
  );
});
test('oversized picker result is rejected instead of uploading original', async () => {
  jest
    .mocked(launchImageLibrary)
    .mockResolvedValueOnce({
      assets: [{ uri: 'file:///too-large.jpg', width: 3000, height: 2000 }],
    });
  await expect(pickImage(false)).rejects.toThrow('1024px');
});
test('cancel is silent; picker error is actionable', async () => {
  jest.mocked(launchImageLibrary).mockResolvedValueOnce({ didCancel: true });
  expect(await pickImage(false)).toBeUndefined();
  jest
    .mocked(launchImageLibrary)
    .mockResolvedValueOnce({
      errorCode: 'permission',
      errorMessage: 'Quyền thư viện bị từ chối',
    });
  await expect(pickImage(false)).rejects.toThrow('Quyền thư viện bị từ chối');
});
test('camera denial prevents opening the camera', async () => {
  const descriptor = Object.getOwnPropertyDescriptor(Platform, 'OS')!;
  Object.defineProperty(Platform, 'OS', {
    value: 'android',
    configurable: true,
  });
  jest
    .spyOn(PermissionsAndroid, 'request')
    .mockResolvedValueOnce(PermissionsAndroid.RESULTS.DENIED);
  try {
    await expect(pickImage(true)).rejects.toThrow('từ chối quyền camera');
    expect(launchCamera).not.toHaveBeenCalled();
  } finally {
    Object.defineProperty(Platform, 'OS', descriptor);
  }
});
test('unsigned upload accepts only Cloudinary HTTPS URLs and exposes server failures for retry', async () => {
  const asset = { uri: 'file:///selected.jpg', type: 'image/jpeg' };
  globalThis.fetch = jest
    .fn()
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        secure_url: 'https://res.cloudinary.com/nqa9lzjb/image/upload/test.jpg',
      }),
    })
    .mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: { message: 'Upload preset not found' } }),
    })
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({ secure_url: 'http://untrusted.example/image.jpg' }),
    });
  expect(await uploadImage(asset)).toBe(
    'https://res.cloudinary.com/nqa9lzjb/image/upload/test.jpg',
  );
  await expect(uploadImage(asset)).rejects.toThrow('Upload preset not found');
  await expect(uploadImage(asset)).rejects.toThrow('Tải ảnh thất bại');
});
