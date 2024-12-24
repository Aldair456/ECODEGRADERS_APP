import React, { useState } from 'react';
import { View, TextInput, StyleSheet, Button, Modal, Image, TouchableOpacity, Text, ScrollView, Linking } from 'react-native';
import { WebView } from 'react-native-webview';

export default function CentrosAcopioComponent() {
  // URL para la ubicación en Google Maps
  const googleMapsUrl = 'https://www.google.com/maps/dir/?api=1&destination=-12.046374,-77.042793'; // Cambia las coordenadas a la ubicación deseada

  // URLs de las imágenes (cámbialas por las que necesites)
  const mainImageUrl = 'https://www.amb.gov.co/images/fotos/noticias/centro%20acopia01.jpg';
  const galleryImages = [
    'https://i.ytimg.com/vi/eZvGXXBXBdI/hq720.jpg?sqp=-oaymwEhCK4FEIIDSFryq4qpAxMIARUAAAAAGAElAADIQj0AgKJD&rs=AOn4CLCxoUOImdzXmDWZjPmbGMNyfRSAww',
    'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTj648nEWaYw5dpdbZg0asr-7YQBsx7ch553A&s',
    'https://ambientalnews.mx/wp-content/uploads/2023/09/WhatsApp-Image-2023-09-28-at-12.37.00-990x655.webp',
  ];

  // Función para abrir Google Maps
  const openGoogleMaps = () => {
    Linking.openURL(googleMapsUrl);
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Centro de Acopio</Text>
      <Text style={styles.subtitle}>Nos encuentras en:</Text>

      {/* Imagen principal */}
      <Image source={{ uri: mainImageUrl }} style={styles.mainImage} />

      {/* Galería de imágenes */}
      <Text style={styles.galleryTitle}>Galería de Imágenes</Text>
      <View style={styles.gallery}>
        {galleryImages.map((url, index) => (
          <Image key={index} source={{ uri: url }} style={styles.galleryImage} />
        ))}
      </View>

      {/* Botón para abrir Google Maps */}
      <TouchableOpacity style={styles.mapButton} onPress={openGoogleMaps}>
        <Image source={{ uri: 'https://img.icons8.com/color/48/google-maps.png' }} style={styles.mapButtonIcon} />
        <Text style={styles.mapButtonText}>Abrir Google Maps</Text>
      </TouchableOpacity>

      {/* Nueva sección para la misión de reciclaje */}
      <View style={styles.recycleMissionContainer}>
        <Text style={styles.sectionTitle}>PRECIO DE BOTELLAS</Text>
        {[{
          title: 'Botella de plástico PET',
          mission: '0.60 centimos cada kilo',
          image: 'https://cdn.discordapp.com/attachments/1240772639409176604/1306837925920509952/B1.png?ex=67381f29&is=6736cda9&hm=80fa0b6eb9e48e02adaff2b805561fc63988ad3f5569129c17eff02e922f4a06&'
        }].map((item, index) => (
          <View key={index} style={styles.recycleItem}>
            <Image source={{ uri: item.image }} style={styles.recycleImage} />
            <View style={styles.recycleTextContainer}>
              <Text style={styles.recycleTitle}>{item.title}</Text>
              <Text style={styles.recycleMission}>{item.mission}</Text>
              <View style={styles.progressContainer}>
                <Text style={styles.progressText}>{item.progress}</Text>
              </View>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    alignItems: 'center',
    backgroundColor: '#EAF7F8',
    paddingVertical: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#00796b',
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  subtitle: {
    fontSize: 18,
    color: '#333',
    marginBottom: 20,
  },
  mainImage: {
    width: '95%',
    height: 220,
    borderRadius: 15,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#00796b',
  },
  galleryTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#00796b',
    marginVertical: 15,
  },
  gallery: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    width: '90%',
    marginBottom: 30,
  },
  galleryImage: {
    width: 100,
    height: 100,
    borderRadius: 12,
    margin: 5,
    borderWidth: 1,
    borderColor: '#70B7C7',
  },
  mapButton: {
    backgroundColor: '#00796b',
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 12,
    alignItems: 'center',
    flexDirection: 'row',
    marginTop: 20,
  },
  mapButtonIcon: {
    width: 24,
    height: 24,
    marginRight: 10,
  },
  mapButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  recycleMissionContainer: {
    padding: 20,
    backgroundColor: '#fff',
    marginVertical: 20,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#00796b',
    marginBottom: 15,
  },
  recycleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EAF7F8',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
  },
  recycleImage: {
    width: 60,
    height: 100,
    marginRight: 20,
  },
  recycleTextContainer: {
    flex: 1,
  },
  recycleTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#00796b',
  },
  recycleMission: {
    fontSize: 16,
    color: '#333',
    marginVertical: 5,
  },
  progressContainer: {
    alignItems: 'flex-start',
    marginTop: 5,
  },
  progressText: {
    fontSize: 16,
    color: '#FF9800',
    fontWeight: 'bold',
  },
});
