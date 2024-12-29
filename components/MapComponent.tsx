// MapComponent.tsx
import React, { useCallback, useEffect, useState, useMemo } from 'react';
import {
  StyleSheet,
  View,
  TextInput,
  Button,
  ActivityIndicator,
  Alert,
  Modal,
  Text,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import * as Location from 'expo-location'; // Geolocalización con Expo
import Pins, { MarkerData } from './Pins'; // Asegúrate de que la ruta sea correcta

/****************************
 * COMPONENTE PRINCIPAL
 ****************************/
const MapComponent: React.FC = () => {
  /****************************
   * ESTADOS
   ****************************/

  // *** Ubicación utilizada para centrar el mapa inicialmente (ej. Lima)
  const [location, setLocation] = useState<MarkerData>({
    id: 'default-location',
    lat: -12.0464, // Lima
    lng: -77.0428,
  });

  // *** Ubicación actual del usuario (esta es la que se usará para encontrar el más cercano, etc.)
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  // *** Estados auxiliares
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isNavigating, setIsNavigating] = useState<boolean>(false);
  // Podrías usar esto si quisieras mostrar instrucciones de navegación, etc.
  const [showInstructions, setShowInstructions] = useState<boolean>(false);

  /****************************
   * EFECTOS Y HOOKS
   ****************************/

  // *** Efecto para solicitar permisos de ubicación y obtener la ubicación inicial del usuario
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permisos denegados', 'No se concedieron permisos de ubicación.');
          return;
        }

        const currentLocation = await Location.getCurrentPositionAsync({});
        setUserLocation({
          lat: currentLocation.coords.latitude,
          lng: currentLocation.coords.longitude,
        });
      } catch (error) {
        console.error('Error al obtener la ubicación del usuario:', error);
      }
    })();
  }, []);

  /**
   * Búsqueda de una dirección vía Mapbox Geocoding.
   */
  const searchLocation = useCallback(async () => {
    if (!searchQuery) {
      Alert.alert('Error', 'Por favor ingresa una dirección para buscar.');
      return;
    }
    try {
      setIsLoading(true);
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
          searchQuery
        )}.json?access_token=pk.eyJ1IjoiYWxkYWlyMjMiLCJhIjoiY20zZzAycXhrMDFkODJscTJmMDF1cThpdyJ9.ov7ycdJg0xlYWpI6DykSdg`
      );
      const data = await response.json();
      if (data.features.length > 0) {
        const [lng, lat] = data.features[0].center;
        // Actualiza la ubicación en React (solo a modo de mover el mapa, no es la ubicación personal)
        setLocation({
          id: 'searched-location',
          lat,
          lng,
        });
        // Aquí podrías comunicarte con el componente Pins para mover el mapa
        // Por simplicidad, este ejemplo no implementa esta comunicación
      } else {
        Alert.alert('No encontrado', 'No se pudo encontrar la dirección ingresada.');
      }
    } catch (error) {
      console.error('Error:', error);
      Alert.alert('Error', 'Ocurrió un error al buscar la dirección.');
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery]);

  /**
   * Encontrar el marcador más cercano
   */
  const getDistance = useCallback(
    (lat1: number, lng1: number, lat2: number, lng2: number): number => {
      const R = 6371; // Radio de la Tierra en km
      const dLat = toRad(lat2 - lat1);
      const dLon = toRad(lng2 - lng1);
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) *
          Math.cos(toRad(lat2)) *
          Math.sin(dLon / 2) * Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c;
    },
    []
  );

  const toRad = (value: number) => (value * Math.PI) / 180;

  const handleFindNearest = useCallback(() => {
    if (!userLocation) {
      Alert.alert('Ubicación desconocida', 'No se pudo obtener tu ubicación actual.');
      return;
    }

    // Aquí deberías obtener los marcadores del componente Pins
    // Para este ejemplo, asumiremos que tienes acceso a ellos
    // Podrías usar un callback o contexto para obtenerlos

    // Suponiendo que tienes una referencia a los marcadores
    // Este es un placeholder, deberías implementar la comunicación adecuada
    Alert.alert('Funcionalidad pendiente', 'Implementar la búsqueda del marcador más cercano.');
  }, [userLocation, getDistance]);

  return (
    <View style={styles.container}>
      {/* Barra de búsqueda */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.input}
          placeholder="Buscar dirección..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={searchLocation}
        />
        <Button title="Buscar" onPress={searchLocation} />
        <View style={{ marginLeft: 5 }}>
          <Button title="Cercano" onPress={handleFindNearest} />
        </View>
      </View>

      {/* Indicador de carga */}
      {isLoading && <ActivityIndicator size="large" color="#007AFF" />}

      {/* Componente Pins que maneja los marcadores */}
      <Pins userLocation={userLocation} />

      {/* Panel flotante para terminar la navegación */}
      {isNavigating && (
        <View style={styles.navigationPanel}>
          <TouchableOpacity style={styles.endNavButton} onPress={() => setIsNavigating(false)}>
            <Text style={{ color: '#fff' }}>Detener Navegación</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Modal para mostrar instrucciones de navegación (si es necesario) */}
      {showInstructions && (
        <Modal
          animationType="slide"
          transparent
          visible={showInstructions}
          onRequestClose={() => setShowInstructions(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <ScrollView>
                <Text style={styles.modalTitle}>Instrucciones de Navegación</Text>
                {/* Aquí podrías agregar instrucciones detalladas */}
                <Text style={styles.infoText}>Instrucciones de navegación aquí...</Text>

                {/* Botón para cerrar modal */}
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => setShowInstructions(false)}
                >
                  <Text style={styles.closeButtonText}>Cerrar</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
};

export default MapComponent;

/****************************
 * ESTILOS
 ****************************/
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    padding: 10,
    backgroundColor: 'white',
    elevation: 2,
  },
  input: {
    flex: 1,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 5,
    paddingHorizontal: 10,
    height: 40,
    marginRight: 10,
  },
  webview: {
    flex: 1,
  },
  navigationPanel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(255,255,255,0.95)',
    padding: 10,
    alignItems: 'center',
  },
  endNavButton: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 5,
  },
  icon: {
    marginRight: 10,
  },
  infoText: {
    fontSize: 16,
    color: '#333',
  },
  closeButton: {
    backgroundColor: '#007AFF',
    borderRadius: 5,
    paddingVertical: 10,
    paddingHorizontal: 20,
    alignSelf: 'center',
    marginTop: 10,
  },
  closeButtonText: {
    color: 'white',
    fontSize: 16,
  },
});
