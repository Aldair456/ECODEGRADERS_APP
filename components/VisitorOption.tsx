import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';

interface VisitorProps {
  onVisit: () => void;
}

const VisitorOption: React.FC<VisitorProps> = ({ onVisit }) => (
  <View style={styles.container}>
    <TouchableOpacity style={styles.button} onPress={onVisit}>
      <Text style={styles.buttonText}>Continuar como Visitante</Text>
    </TouchableOpacity>
  </View>
);

const styles = StyleSheet.create({
  container: { marginTop: 20 },
  button: { backgroundColor: '#4CAF50', padding: 10, borderRadius: 5 },
  buttonText: { color: '#FFF', fontSize: 16 },
});

export default VisitorOption;
