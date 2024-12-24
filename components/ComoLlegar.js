import React from 'react';
import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity, ImageBackground,Linking } from 'react-native';
import { useNavigation } from '@react-navigation/native';

export default function ComoLlegarComponent() {
  const navigation = useNavigation();

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#e0f7fa' }}>
      {/* Header Section */}
      <View style={styles.profileHeaderContainer}>
        <ImageBackground
          source={{ uri: 'https://cdn.discordapp.com/attachments/1240772639409176604/1306826442176335924/LOGO-removebg-preview.png?ex=67604a37&is=675ef8b7&hm=e7a36d412e3bfa4d03799df45928bac1e9b87bb805f0e05cc5e382631aa5f3c8&' }}
          style={styles.profileHeaderImage}
          imageStyle={{ resizeMode: 'cover' }}
        >
          <View style={styles.profileHeaderTop}>
            <TouchableOpacity onPress={() => {}}>
              <Image source={{ uri: 'https://example.com/back_icon.png' }} style={styles.icon} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => {}}>
              <Image source={{ uri: 'htt0ps://example.com/user_icon.png' }} style={styles.icon} />
            </TouchableOpacity>
          </View>
        </ImageBackground>
        <TouchableOpacity style={styles.contactButton} onPress={() => {
            const phoneNumber = '51953584373';
            const url = `https://wa.me/${phoneNumber}`;
             Linking.openURL(url);
            Linking.openURL(url);
          }}>
          <Image source={{ uri: 'https://img.icons8.com/ios-filled/50/00796b/whatsapp.png' }} style={styles.contactIcon} />
        </TouchableOpacity>
      </View>

      {/* Info Section */}
      <View style={styles.infoSectionContainer}>
        <View style={styles.infoIconsRow}>
          <TouchableOpacity style={styles.infoIconWrapper} onPress={() => {}}>
            <Image source={{ uri: 'https://img.icons8.com/ios-filled/50/00796b/info.png' }} style={styles.infoIcon} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.infoIconWrapper} onPress={() => {}}>
            <Image source={{ uri: 'https://img.icons8.com/ios-filled/50/00796b/share.png' }} style={styles.infoIcon} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.infoIconWrapper} onPress={() => {}}>
            <Image source={{ uri: 'https://img.icons8.com/ios-filled/50/00796b/star--v1.png' }} style={styles.infoIcon} />
          </TouchableOpacity>
        </View>
      </View>

      {/* About Section */}
      <View style={styles.aboutContainer}>
        <Text style={styles.aboutTitle}>Sobre Nosotros</Text>
        <Text style={styles.aboutDescription}>
        "Hola, somos Ecodegraders, y con esta aplicación buscamos agilizar el proceso de recolección de botellas
         de plástico que se encuentran en toda la 
        cuenca del río Chillón y la playa Cavero, por un entorno más limpio."
        </Text>
        <View style={styles.aboutImagesRow}>
          <Image source={{ uri: 'https://example.com/about_image1.png' }} style={styles.aboutImage} />
          <Image source={{ uri: 'https://example.com/about_image2.png' }} style={styles.aboutImage} />
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  profileHeaderContainer: {
    backgroundColor: '#fff',
    alignItems: 'center',
    paddingBottom: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  profileHeaderTop: {
    flexDirection: 'row',
    width: '100%',
    paddingHorizontal: 20,
    paddingTop: 40,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  profileHeaderTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#00796b',
  },
  icon: {
    width: 30,
    height: 30,
  },
  profileHeaderImage: {
    width: '100%',
    height: 250,
    justifyContent: 'flex-end',
  },
  contactButton: {
    backgroundColor: '#25D366',
    padding: 15,
    borderRadius: 30,
    position: 'absolute',
    bottom: -25,
    right: 20,
  },
  contactIcon: {
    width: 30,
    height: 30,
  },
  infoSectionContainer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  infoIconsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '60%',
  },
  infoIconWrapper: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 50,
  },
  infoIcon: {
    width: 24,
    height: 24,
  },
  aboutContainer: {
    paddingHorizontal: 20,
    paddingVertical: 30,
  },
  aboutTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#00796b',
    marginBottom: 10,
  },
  aboutDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
  },
  aboutImagesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  aboutImage: {
    width: '48%',
    height: 100,
    borderRadius: 10,
  },
});
