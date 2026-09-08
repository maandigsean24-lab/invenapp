import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';

// A reusable button used for Login, Register, and Log Out actions.
// "label" controls the button text, "onPress" controls what happens when tapped.
export default function AppButton({ label, onPress }) {
  return (
    <TouchableOpacity style={styles.button} onPress={onPress}>
      <Text style={styles.buttonText}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#2f6fed',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});