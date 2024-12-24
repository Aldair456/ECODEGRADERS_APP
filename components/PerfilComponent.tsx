import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import * as ImagePicker from 'expo-image-picker'; // Importar expo-image-picker
import { Ionicons } from '@expo/vector-icons';

// Define la interfaz de los datos del usuario
interface UserData {
  email?: string;
  data?: {
    name?: string;
    last_name?: string;
    phone?: string;
    district?: string;
  };
}

const PerfilComponent: React.FC = () => {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [profileImage, setProfileImage] = useState<string | null>(null); // Estado para la imagen de perfil

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const token = await AsyncStorage.getItem('userToken');
        if (!token) {
          Alert.alert('Error', 'No se encontró el token. Por favor, inicia sesión nuevamente.');
          return;
        }

        const response = await axios.get(
          'https://plaqmrxx8g.execute-api.us-east-1.amazonaws.com/dev/user/me',
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        setUserData(response.data);
      } catch (error) {
        Alert.alert('Error', 'No se pudieron obtener los datos del usuario.');
      }
    };

    fetchUserData();
  }, []);

  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem('userToken');
      Alert.alert('Sesión cerrada', 'Has cerrado sesión exitosamente.');
      console.log('Sesión cerrada');
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  };

  const pickImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert('Permiso denegado', 'Necesitamos permiso para acceder a la galería.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1], // Relación de aspecto 1:1
        quality: 1,
      });

      if (!result.canceled) {
        setProfileImage(result.assets[0].uri); // Guardar la URI de la imagen seleccionada
      }
    } catch (error) {
      console.error('Error al seleccionar la imagen:', error);
    }
  };

  const takePhoto = async () => {
    try {
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert('Permiso denegado', 'Necesitamos permiso para acceder a la cámara.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1], // Relación de aspecto 1:1
        quality: 1,
      });

      if (!result.canceled) {
        setProfileImage(result.assets[0].uri); // Guardar la URI de la foto tomada
      }
    } catch (error) {
      console.error('Error al tomar la foto:', error);
    }
  };

  const showImageOptions = () => {
    Alert.alert(
      'Seleccionar imagen',
      'Elige una opción',
      [
        { text: 'Tomar foto', onPress: takePhoto },
        { text: 'Seleccionar de la galería', onPress: pickImage },
        { text: 'Cancelar', style: 'cancel' },
      ],
      { cancelable: true }
    );
  };

  if (!userData) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Cargando datos del usuario...</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Encabezado del perfil */}
      <View style={styles.header}>
        <TouchableOpacity onPress={showImageOptions}>
          <Image
            source={{
              uri: profileImage || 'https://via.placeholder.com/150',
            }}
            style={styles.profileImage}
          />
          <View style={styles.cameraIconContainer}>
            <Ionicons name="camera" size={24} color="#fff" />
          </View>
        </TouchableOpacity>
        <Text style={styles.userName}>{`${userData.data?.name || ''} ${
          userData.data?.last_name || ''
        }`}</Text>
      </View>

      {/* Detalles del perfil */}
      <View style={styles.detailsContainer}>
        <View style={styles.detailRow}>
          <Ionicons name="mail-outline" size={24} color="#70B7C7" />
          <Text style={styles.detailText}>{userData.email || 'Correo no disponible'}</Text>
        </View>

        <View style={styles.detailRow}>
          <Ionicons name="call-outline" size={24} color="#70B7C7" />
          <Text style={styles.detailText}>{userData.data?.phone || 'Teléfono no disponible'}</Text>
        </View>

        <View style={styles.detailRow}>
          <Ionicons name="location-outline" size={24} color="#70B7C7" />
          <Text style={styles.detailText}>{userData.data?.district || 'Distrito no disponible'}</Text>
        </View>
      </View>

      {/* Botón de cerrar sesión */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={20} color="#fff" />
        <Text style={styles.logoutText}>Cerrar sesión</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    alignItems: 'center',
    paddingVertical: 20,
    backgroundColor: '#F5F5F5',
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
    backgroundColor: '#70B7C7',
    width: '100%',
    paddingVertical: 30,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: '#fff',
  },
  cameraIconContainer: {
    position: 'absolute',
    bottom: 0,
    right: 10,
    backgroundColor: '#70B7C7',
    borderRadius: 20,
    padding: 5,
  },
  userName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
  },
  detailsContainer: {
    width: '90%',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    elevation: 5,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  detailText: {
    marginLeft: 10,
    fontSize: 16,
    color: '#333',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 30,
    backgroundColor: '#FF3D00',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  logoutText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  loadingText: {
    fontSize: 18,
    color: 'gray',
  },
});

export default PerfilComponent;
