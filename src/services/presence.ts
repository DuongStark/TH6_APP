import { AppState } from 'react-native';
import {
  onDisconnect,
  onValue,
  push,
  ref,
  remove,
  set,
  serverTimestamp,
} from 'firebase/database';
import { database } from './firebase';

export function startPresence(
  uid: string,
  onError: (error: Error) => void,
  initialVisible = true,
) {
  const connection = push(ref(database, `presence/${uid}/connections`));
  let connected = false;
  let visible = initialVisible;
  let stopped = false;
  let queue = Promise.resolve();

  // Tuần tự hóa để bấm ẩn/hiện, vào nền và reconnect không ghi đè lẫn nhau.
  function refresh() {
    queue = queue
      .then(async () => {
        if (stopped || !connected) {
          return;
        }
        if (visible && AppState.currentState === 'active') {
          await onDisconnect(connection).remove();
          await onDisconnect(ref(database, `presence/${uid}/lastSeen`)).set(
            serverTimestamp(),
          );
          if (
            !stopped &&
            connected &&
            visible &&
            AppState.currentState === 'active'
          ) {
            await set(connection, true);
          }
        } else {
          await remove(connection);
          await set(
            ref(database, `presence/${uid}/lastSeen`),
            serverTimestamp(),
          );
        }
      })
      .catch(onError);
  }

  const stopConnection = onValue(
    ref(database, '.info/connected'),
    snapshot => {
      connected = snapshot.val() === true;
      refresh();
    },
    onError,
  );
  const appState = AppState.addEventListener('change', refresh);

  return {
    setVisible(value: boolean) {
      visible = value;
      refresh();
    },
    async stop() {
      if (stopped) {
        return;
      }
      stopped = true;
      stopConnection();
      appState.remove();
      // Khi mất mạng, onDisconnect ở server sẽ xóa kết nối này.
      if (connected) {
        await queue;
        await remove(connection);
        await set(ref(database, `presence/${uid}/lastSeen`), serverTimestamp());
        await onDisconnect(connection).cancel();
      }
    },
  };
}
