// InsertarCoordenadasComponent.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  ScrollView,
  Image,
  Text,
  Alert,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  GestureResponderEvent,
} from 'react-native';
import AdvertenciaModal from './AdvertenciaModal'; // Asegúrate de ajustar la ruta según tu estructura de carpetas

import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Picker } from '@react-native-picker/picker';
import { Ionicons } from '@expo/vector-icons';

const STORAGE_KEY = '@saved_images';
const MODAL_FLAG_KEY = '@has_seen_advertencia';

const InsertarCoordenadasComponent: React.FC = () => {
  const [lat, setLat] = useState<string>('');
  const [lng, setLng] = useState<string>('');
  const [contaminationLevel, setContaminationLevel] = useState<string>('');
  const [plasticLevel, setPlasticLevel] = useState<string>('');
  const [status, setStatus] = useState<string>('');
  const [images, setImages] = useState<string[]>([]);
  const [isModalVisible, setIsModalVisible] = useState<boolean>(false); // Estado para el modal

  useEffect(() => {
    const checkModalStatus = async () => {
      try {
        const hasSeenModal = await AsyncStorage.getItem(MODAL_FLAG_KEY);
        if (hasSeenModal !== 'true') {
          setIsModalVisible(true);
        }
      } catch (error) {
        console.log('Error al verificar el estado del modal:', error);
        setIsModalVisible(true);
      }
    };
    checkModalStatus();

    const loadImages = async () => {
      try {
        const storedImages = await AsyncStorage.getItem(STORAGE_KEY);
        if (storedImages) {
          setImages(JSON.parse(storedImages));
        }
      } catch (error) {
        console.log('Error cargando imágenes del almacenamiento local:', error);
      }
    };
    loadImages();
  }, []);

  const saveImagesToLocalStorage = async (newImages: string[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newImages));
    } catch (error) {
      console.log('Error guardando imágenes en almacenamiento local:', error);
    }
  };

  const handleTakePhoto = async () => {
    const { status: cameraPerm } = await ImagePicker.requestCameraPermissionsAsync();
    if (cameraPerm !== 'granted') {
      alert('Se requieren permisos de cámara para tomar fotos.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      quality: 0.8,
      allowsEditing: false,
      base64: false,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const uri = result.assets[0].uri;
      const updatedImages = [...images, uri];
      setImages(updatedImages);
      await saveImagesToLocalStorage(updatedImages);
    }
  };

  const handlePickImage = async () => {
    const { status: galleryPerm } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (galleryPerm !== 'granted') {
      alert('Se requieren permisos para acceder a la galería.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      quality: 0.8,
      allowsEditing: false,
      base64: false,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const uri = result.assets[0].uri;
      const updatedImages = [...images, uri];
      setImages(updatedImages);
      await saveImagesToLocalStorage(updatedImages);
    }
  };

  const handleUseCurrentLocation = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso denegado', 'Se necesitan permisos de ubicación para usar esta función.');
      return;
    }

    const location = await Location.getCurrentPositionAsync({});
    setLat(location.coords.latitude.toString());
    setLng(location.coords.longitude.toString());
    Alert.alert('Coordenadas obtenidas', 'Se completaron las coordenadas actuales.');
  };

  const handleInsert = async () => {
    const parsedLat = parseFloat(lat);
    const parsedLng = parseFloat(lng);

    if (isNaN(parsedLat) || isNaN(parsedLng)) {
      alert('Por favor, ingresa coordenadas válidas.');
      return;
    }

    if (!contaminationLevel || !plasticLevel || !status) {
      alert('Por favor, selecciona todas las opciones.');
      return;
    }

    const payload = {
      latitude: parsedLat,
      longitude: parsedLng,
      pollution_level: contaminationLevel,
      plastic_level: plasticLevel,
      status,
    };

    try {
      const response = await fetch('https://mzl6xsrh26.execute-api.us-east-1.amazonaws.com/dev/place/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        Alert.alert('Éxito', 'Coordenadas enviadas correctamente.');
        // Opcional: Resetear formulario después de un envío exitoso
        resetForm();
      } else {
        Alert.alert('Error', 'No se pudieron enviar las coordenadas.');
      }
    } catch (error) {
      console.error('Error al enviar los datos:', error);
      Alert.alert('Error', 'Hubo un problema al enviar los datos.');
    }
  };

  const handleRemoveImage = (index: number) => {
    const updatedImages = images.filter((_, i) => i !== index);
    setImages(updatedImages);
    saveImagesToLocalStorage(updatedImages);
  };

  const handleAcknowledge = async (event: GestureResponderEvent) => {
    setIsModalVisible(false);
    try {
      await AsyncStorage.setItem(MODAL_FLAG_KEY, 'true');
    } catch (error) {
      console.log('Error al guardar el estado del modal:', error);
    }
  };

  const resetForm = () => {
    setLat('');
    setLng('');
    setContaminationLevel('');
    setPlasticLevel('');
    setStatus('');
    setImages([]);
    AsyncStorage.removeItem(STORAGE_KEY).catch(error => console.log('Error al resetear imágenes:', error));
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Renderizar el modal de advertencia */}
      <AdvertenciaModal
        visible={isModalVisible}
        onAcknowledge={handleAcknowledge}
      />

      {/* Solo mostrar el formulario si el modal no está visible */}
      {!isModalVisible && (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.header}>Registrar Coordenadas</Text>

          <TextInput
            style={styles.input}
            placeholder="Latitud"
            value={lat}
            onChangeText={setLat}
            keyboardType="numeric"
            placeholderTextColor="#B0C4DE"
          />
          <TextInput
            style={styles.input}
            placeholder="Longitud"
            value={lng}
            onChangeText={setLng}
            keyboardType="numeric"
            placeholderTextColor="#B0C4DE"
          />

          <TouchableOpacity style={styles.primaryButton} onPress={handleUseCurrentLocation}>
            <Ionicons name="location" size={20} color="#fff" style={styles.icon} />
            <Text style={styles.primaryButtonText}>Usar Coordenadas Actuales</Text>
          </TouchableOpacity>

          <Text style={styles.label}>Nivel de Contaminación</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={contaminationLevel}
              onValueChange={(itemValue) => setContaminationLevel(itemValue)}
            >
              <Picker.Item label="Selecciona una opción" value="" />
              <Picker.Item label="Bajo" value="Bajo" />
              <Picker.Item label="Medio" value="medio" />
              <Picker.Item label="Alto" value="Alto" />
            </Picker>
          </View>

          <Text style={styles.label}>Nivel de Plástico</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={plasticLevel}
              onValueChange={(itemValue) => setPlasticLevel(itemValue)}
            >
              <Picker.Item label="Selecciona una opción" value="" />
              <Picker.Item label="Bajo" value="Bajo" />
              <Picker.Item label="Moderado" value="medio" />
              <Picker.Item label="Alto" value="Alto" />
            </Picker>
          </View>

          <Text style={styles.label}>Estado</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={status}
              onValueChange={(itemValue) => setStatus(itemValue)}
            >
              <Picker.Item label="Selecciona una opción" value="" />
              <Picker.Item label="Activo" value="Activo" />
              <Picker.Item label="Inactivo" value="Inactivo" />
            </Picker>
          </View>

          <View style={styles.buttonGroup}>
            <TouchableOpacity style={styles.secondaryButton} onPress={handleTakePhoto}>
              <Ionicons name="camera" size={20} color="#fff" style={styles.icon} />
              <Text style={styles.secondaryButtonText}>Tomar Foto</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryButton} onPress={handlePickImage}>
              <Ionicons name="image" size={20} color="#fff" style={styles.icon} />
              <Text style={styles.secondaryButtonText}>Seleccionar Imagen</Text>
            </TouchableOpacity>
          </View>

          {images.length > 0 && (
            <View style={styles.imagesSection}>
              <Text style={styles.imagesTitle}>Imágenes Seleccionadas</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {images.map((imgUri, index) => (
                  <View key={index} style={styles.imageWrapper}>
                    <Image source={{ uri: imgUri }} style={styles.image} />
                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={() => handleRemoveImage(index)}
                    >
                      <Ionicons name="close-circle" size={24} color="#FF6347" />
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            </View>
          )}

          <TouchableOpacity style={styles.insertButton} onPress={handleInsert}>
            <Ionicons name="checkmark-done" size={20} color="#fff" style={styles.icon} />
            <Text style={styles.insertButtonText}>Insertar</Text>
          </TouchableOpacity>
        </ScrollView>
      )}
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: '#f0f8ff',
  },
  scrollContent: {
    padding: 20,
  },
  header: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1E90FF',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#1E90FF',
    borderRadius: 10,
    padding: 10,
    marginBottom: 15,
    fontSize: 16,
    backgroundColor: '#fff',
    color: '#1E90FF',
  },
  label: {
    fontSize: 16,
    marginVertical: 5,
    fontWeight: '600',
    color: '#1E90FF',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#1E90FF',
    borderRadius: 10,
    marginBottom: 15,
    backgroundColor: '#fff',
  },
  buttonGroup: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  primaryButton: {
    backgroundColor: '#1E90FF',
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
    flexDirection: 'row',
    marginBottom: 20,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  secondaryButton: {
    backgroundColor: '#4682B4',
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
    flexDirection: 'row',
    flex: 1,
    marginHorizontal: 5,
  },
  secondaryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  imagesSection: {
    marginVertical: 15,
    padding: 10,
    backgroundColor: '#fff',
    borderRadius: 10,
    elevation: 2,
  },
  imagesTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#1E90FF',
  },
  imageWrapper: {
    marginRight: 10,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#eee',
    elevation: 2,
    position: 'relative',
  },
  image: {
    width: 100,
    height: 100,
    resizeMode: 'cover',
  },
  deleteButton: {
    position: 'absolute',
    top: 5,
    left: 5,
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderRadius: 12,
  },
  insertButton: {
    backgroundColor: '#1E90FF',
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
    flexDirection: 'row',
    marginTop: 20,
  },
  insertButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  icon: {
    marginRight: 5,
  },
});

export default InsertarCoordenadasComponent;
