import React, { useEffect, useState } from 'react';
import { Image, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { dismissDialog, subscribeToDialogs } from '../utils/dialog';
import theme from '../theme';

export default function DialogHost() {
  const [dialog, setDialog] = useState(null);
  const isConfirm = dialog && dialog.type === 'confirm';

  useEffect(() => subscribeToDialogs(setDialog), []);

  return (
    <Modal
      visible={!!dialog}
      transparent
      animationType="fade"
      onRequestClose={() => dismissDialog(false)}
    >
      {dialog ? (
        <View style={styles.overlay}>
          <View style={styles.card} accessibilityRole="alert">
            <View style={styles.brandRow}>
              <Image source={require('../assets/logo-mark.png')} style={styles.brandMark} resizeMode="contain" />
              <Text style={styles.brandName}>InvenApp</Text>
            </View>
            <Text style={styles.title}>{dialog.title}</Text>
            {dialog.message ? <Text style={styles.message}>{dialog.message}</Text> : null}
            <View style={styles.actions}>
              {isConfirm ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => dismissDialog(false)}
                  style={({ pressed }) => [styles.button, styles.cancelButton, pressed && styles.pressed]}
                >
                  <Text style={styles.cancelText}>Cancel</Text>
                </Pressable>
              ) : null}
              <Pressable
                accessibilityRole="button"
                onPress={() => dismissDialog(isConfirm)}
                style={({ pressed }) => [
                  styles.button,
                  isConfirm && dialog.confirmLabel === 'Delete' && styles.destructiveButton,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.buttonText}>{isConfirm ? dialog.confirmLabel : 'OK'}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      ) : null}
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
    backgroundColor: 'rgba(18, 33, 31, 0.38)',
  },
  card: {
    width: '100%',
    maxWidth: 420,
    padding: theme.spacing.xl,
    borderRadius: theme.borderRadius.xl,
    backgroundColor: theme.colors.surface,
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
  },
  brandRow: { flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.lg },
  brandMark: { width: 30, height: 30, marginRight: theme.spacing.sm },
  brandName: { color: theme.colors.primary, fontSize: theme.fontSizes.md, fontWeight: '700' },
  title: { color: theme.colors.text, fontSize: theme.fontSizes.xl, fontWeight: '700', marginBottom: theme.spacing.sm },
  message: { color: theme.colors.muted, fontSize: theme.fontSizes.body, lineHeight: 22 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: theme.spacing.xl },
  button: {
    minWidth: 88,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.primary,
    marginLeft: theme.spacing.sm,
  },
  cancelButton: { backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border },
  destructiveButton: { backgroundColor: theme.colors.danger },
  pressed: { opacity: 0.82 },
  buttonText: { color: '#fff', fontSize: theme.fontSizes.body, fontWeight: '700' },
  cancelText: { color: theme.colors.text, fontSize: theme.fontSizes.body, fontWeight: '600' },
});
