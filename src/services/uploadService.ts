import { PermissionsAndroid, Platform } from 'react-native';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import type { Asset } from 'react-native-image-picker';
import config from './cloudinary.config.json';
export async function pickImage(camera: boolean): Promise<Asset | undefined> {
  if (camera && Platform.OS === 'android') {
    const permission = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.CAMERA,
    );
    if (permission !== PermissionsAndroid.RESULTS.GRANTED) {
      throw new Error(
        'Bạn đã từ chối quyền camera. Hãy bật quyền trong Cài đặt để chụp ảnh.',
      );
    }
  }
  const response = await (camera ? launchCamera : launchImageLibrary)({
    mediaType: 'photo',
    maxWidth: 1024,
    maxHeight: 1024,
    quality: 0.8,
    selectionLimit: 1,
    assetRepresentationMode: 'compatible',
  });
  if (response.didCancel) {
    return;
  }
  if (response.errorCode) {
    throw new Error(
      response.errorMessage ||
        'Không mở được ảnh. Kiểm tra quyền camera/thư viện.',
    );
  }
  const asset = response.assets?.[0];
  if (!asset?.uri) {
    throw new Error('Không đọc được ảnh.');
  }
  if (
    !asset.width ||
    !asset.height ||
    Math.max(asset.width, asset.height) > 1024
  ) {
    throw new Error(
      'Không thể thu nhỏ ảnh xuống 1024px. Vui lòng chọn ảnh khác.',
    );
  }
  return asset;
}
export async function uploadImage(asset: Asset): Promise<string> {
  if (!config.cloudName || !config.unsignedPreset) {
    throw new Error(
      'Chưa cấu hình Cloudinary. Điền cloudName và unsignedPreset trong src/services/cloudinary.config.json.',
    );
  }
  if (!asset.uri) {
    throw new Error('Ảnh tạm không còn tồn tại. Vui lòng chọn lại.');
  }
  const form = new FormData();
  form.append('upload_preset', config.unsignedPreset);
  form.append('file', {
    uri: asset.uri,
    type: asset.type || 'image/jpeg',
    name: asset.fileName || 'chat.jpg',
  } as unknown as Blob);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60000);
  try {
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${encodeURIComponent(
        config.cloudName,
      )}/image/upload`,
      { method: 'POST', body: form, signal: controller.signal },
    );
    const result = await response.json();
    if (
      !response.ok ||
      !/^https:\/\/res\.cloudinary\.com\//.test(result.secure_url ?? '')
    ) {
      throw new Error(
        result.error?.message || 'Tải ảnh thất bại. Vui lòng thử lại.',
      );
    }
    return result.secure_url;
  } finally {
    clearTimeout(timeout);
  }
}
