import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function PuntosClavesScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Puntos Claves</Text>
      <Text style={styles.content}>Aquí puedes agregar contenido o información relevante sobre los puntos clave.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  content: {
    fontSize: 16,
    textAlign: 'center',
    color: '#333',
  },
});
