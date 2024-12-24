import React, { useState, useEffect } from 'react';
import {
  View,
  TextInput,
  Button,
  StyleSheet,
  ScrollView,
  Image,
  Text,
  Alert,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Picker } from '@react-native-picker/picker';
import { Ionicons } from '@expo/vector-icons';

const STORAGE_KEY = '@saved_images';

const InsertarCoordenadasComponent = ({ onInsert }) => {
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [contaminationLevel, setContaminationLevel] = useState('');
  const [plasticLevel, setPlasticLevel] = useState('');
  const [status, setStatus] = useState('');
  const [images, setImages] = useState<string[]>([]);

  useEffect(() => {
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

  const handleInsert = () => {
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

    onInsert({
      lat: parsedLat,
      lng: parsedLng,
      contaminationLevel,
      plasticLevel,
      status,
      images,
    });

    Alert.alert('Ubicación marcada', 'Se marcó la ubicación con éxito.', [{ text: 'OK' }]);
  };

  const handleRemoveImage = (index: number) => {
    const updatedImages = images.filter((_, i) => i !== index);
    setImages(updatedImages);
    saveImagesToLocalStorage(updatedImages);
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
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

        <TouchableOpacity style={styles.locationButton} onPress={handleUseCurrentLocation}>
          <Text style={styles.locationButtonText}>Usar Coordenadas Actuales</Text>
        </TouchableOpacity>

        <Text style={styles.label}>Nivel de Contaminación</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={contaminationLevel}
            onValueChange={(itemValue) => setContaminationLevel(itemValue)}
          >
            <Picker.Item label="Selecciona una opción" value="" />
            <Picker.Item label="Bajo" value="Bajo" />
            <Picker.Item label="Medio" value="Medio" />
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
            <Picker.Item label="Moderado" value="Moderado" />
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
            <Picker.Item label="En Progreso" value="En Progreso" />
            <Picker.Item label="Pendiente" value="Pendiente" />
            <Picker.Item label="Completo" value="Completo" />
          </Picker>
        </View>

        <TouchableOpacity style={styles.photoButton} onPress={handleTakePhoto}>
          <Text style={styles.photoButtonText}>Tomar Foto</Text>
        </TouchableOpacity>

        {images.length > 0 && (
          <View style={styles.imagesSection}>
            <Text style={styles.imagesTitle}>Imágenes tomadas</Text>
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
          <Text style={styles.insertButtonText}>Insertar</Text>
        </TouchableOpacity>
      </ScrollView>
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
  locationButton: {
    backgroundColor: '#1E90FF',
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 20,
  },
  locationButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
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
  photoButton: {
    backgroundColor: '#1E90FF',
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 20,
  },
  photoButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
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
    marginTop: 20,
  },
  insertButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default InsertarCoordenadasComponent;
