import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

type PinProps = {
  lat: number;
  lng: number;
  index: number;
};

const PinComponent: React.FC<PinProps> = ({ lat, lng, index }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>📍 Pin {index + 1}</Text>
      <Text style={styles.coordinates}>
        Lat: {lat}, Lng: {lng}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f2f2f2',
    padding: 10,
    marginVertical: 5,
    borderRadius: 5,
    elevation: 3,
  },
  text: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  coordinates: {
    fontSize: 14,
    color: '#555',
  },
});

export default PinComponent;
