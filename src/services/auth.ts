import {
  createUserWithEmailAndPassword,
  deleteUser,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from 'firebase/auth';
import type { User } from 'firebase/auth';
import { get, ref, set } from 'firebase/database';
import { auth, database } from './firebase';
import { validateRegistration } from '../utils/chat';

export function errorMessage(error: unknown) {
  const code = (error as { code?: string })?.code;
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/user-not-found':
    case 'auth/wrong-password':
      return 'Email hoặc mật khẩu không đúng.';
    case 'auth/email-already-in-use':
      return 'Email này đã được đăng ký.';
    case 'auth/invalid-email':
      return 'Email không hợp lệ.';
    case 'auth/weak-password':
      return 'Mật khẩu phải có ít nhất 6 ký tự.';
    case 'auth/too-many-requests':
      return 'Thao tác quá nhiều lần. Vui lòng thử lại sau.';
    case 'auth/network-request-failed':
      return 'Không thể kết nối. Kiểm tra mạng và cấu hình Firebase.';
    case 'auth/operation-not-allowed':
      return 'Hãy bật Email/Password trong Firebase Authentication.';
    case 'PERMISSION_DENIED':
    case 'permission-denied':
      return 'Không có quyền truy cập. Kiểm tra luật Realtime Database.';
    default:
      return error instanceof Error && !code
        ? error.message
        : 'Thao tác thất bại. Vui lòng thử lại.';
  }
}

// Nếu việc tạo hồ sơ thất bại, xóa tài khoản vừa tạo để có thể đăng ký lại.
export async function register(
  name: string,
  email: string,
  password: string,
  confirmation: string,
) {
  const validation = validateRegistration(name, email, password, confirmation);
  if (validation) {
    throw new Error(validation);
  }
  const { user } = await createUserWithEmailAndPassword(
    auth,
    email.trim(),
    password,
  );
  try {
    await updateProfile(user, { displayName: name.trim() });
    await set(ref(database, `users/${user.uid}`), { name: name.trim() });
  } catch (error) {
    await deleteUser(user).catch(() => signOut(auth));
    throw error;
  }
}

export async function login(email: string, password: string) {
  if (!email.trim() || !password) {
    throw new Error('Vui lòng nhập email và mật khẩu.');
  }
  await signInWithEmailAndPassword(auth, email.trim(), password);
}

export async function ensureProfile(user: User) {
  const profile = ref(database, `users/${user.uid}`);
  if (!(await get(profile)).exists()) {
    await set(profile, {
      name: user.displayName || user.email?.split('@')[0] || 'Người dùng',
    });
  }
}

export const watchSession = (callback: (user: User | null) => void) =>
  onAuthStateChanged(auth, callback);
export const logout = () => signOut(auth);
