import { Alert, Platform } from 'react-native';

let activeDialog = null;
const queuedDialogs = [];
const subscribers = new Set();

function publishDialog() {
  subscribers.forEach((subscriber) => subscriber(activeDialog));
}

function enqueueDialog(dialog) {
  if (activeDialog) queuedDialogs.push(dialog);
  else {
    activeDialog = dialog;
    publishDialog();
  }
}

export function subscribeToDialogs(subscriber) {
  subscribers.add(subscriber);
  subscriber(activeDialog);
  return () => subscribers.delete(subscriber);
}

export function dismissDialog(confirmed = false) {
  if (!activeDialog) return;
  const dismissed = activeDialog;
  activeDialog = queuedDialogs.shift() || null;
  if (dismissed.resolve) dismissed.resolve(confirmed);
  publishDialog();
}

export function notify(title, message) {
  if (Platform.OS === 'web') {
    enqueueDialog({ type: 'alert', title, message });
    return;
  }
  Alert.alert(title, message);
}

export function confirm(title, message, confirmLabel = 'Delete') {
  return new Promise((resolve) => {
    if (Platform.OS === 'web') {
      enqueueDialog({ type: 'confirm', title, message, confirmLabel, resolve });
      return;
    }
    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
      { text: confirmLabel, style: 'destructive', onPress: () => resolve(true) },
    ]);
  });
}
