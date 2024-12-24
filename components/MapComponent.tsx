import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  TextInput,
  Button,
  ActivityIndicator,
  Alert,
  Modal,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { WebView } from 'react-native-webview';
import Icon from 'react-native-vector-icons/MaterialIcons'; // Importar íconos

const MAPBOX_ACCESS_TOKEN = 'pk.eyJ1IjoiYWxkYWlyMjMiLCJhIjoiY20zZzAycXhrMDFkODJscTJmMDF1cThpdyJ9.ov7ycdJg0xlYWpI6DykSdg';

type MarkerData = {
  lat: number;
  lng: number;
  contaminationLevel?: string;
  plasticLevel?: string;
  status?: string;
  images?: string[];
};

type MapComponentProps = {
  markerCoordinates?: MarkerData[];
};

const MapComponent: React.FC<MapComponentProps> = ({ markerCoordinates = [] }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [location, setLocation] = useState<MarkerData>({ lat: -12.0464, lng: -77.0428 });
  const [isLoading, setIsLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedMarker, setSelectedMarker] = useState<MarkerData | null>(null);

  const safeMarkers = Array.isArray(markerCoordinates) ? markerCoordinates : [];

  useEffect(() => {
    if (safeMarkers.length > 0) {
      setLocation(safeMarkers[safeMarkers.length - 1]);
    }
  }, [markerCoordinates]);

  const searchLocation = async () => {
    if (!searchQuery) {
      Alert.alert('Error', 'Por favor ingresa una dirección para buscar.');
      return;
    }
    try {
      setIsLoading(true);
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
          searchQuery
        )}.json?access_token=${MAPBOX_ACCESS_TOKEN}`
      );
      const data = await response.json();
      if (data.features.length > 0) {
        const [lng, lat] = data.features[0].center;
        setLocation({ lat, lng });
      } else {
        Alert.alert('No encontrado', 'No se pudo encontrar la dirección ingresada.');
      }
    } catch (error) {
      console.error('Error:', error);
      Alert.alert('Error', 'Ocurrió un error al buscar la dirección.');
    } finally {
      setIsLoading(false);
    }
  };

  const generateHTML = (location: MarkerData, markers: MarkerData[]) => {
    const markersJS = markers
      .map((marker, index) => {
        const markerData = JSON.stringify(marker)
          .replace(/\\/g, '\\\\') // Escapar barras invertidas
          .replace(/'/g, "\\'")    // Escapar comillas simples
          .replace(/"/g, '\\"');   // Escapar comillas dobles

        return `
          const marker${index} = new mapboxgl.Marker({ color: 'green' })
            .setLngLat([${marker.lng}, ${marker.lat}])
            .addTo(map);
          marker${index}.getElement().addEventListener('click', () => {
            window.ReactNativeWebView.postMessage('${markerData}');
          });
        `;
      })
      .join('');

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8"/>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Mapbox Map</title>
          <script src="https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.js"></script>
          <link href="https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.css" rel="stylesheet" />
          <style>
            body, html { margin:0; padding:0; height:100%; }
            #map { position:absolute; top:0; bottom:0; width:100%; }
          </style>
        </head>
        <body>
          <div id="map"></div>
          <script>
            mapboxgl.accessToken = '${MAPBOX_ACCESS_TOKEN}';
            const map = new mapboxgl.Map({
              container: 'map',
              style: 'mapbox://styles/mapbox/streets-v11',
              center: [${location.lng}, ${location.lat}],
              zoom: 12
            });

            ${markersJS}
          </script>
        </body>
      </html>
    `;
  };

  const handleMessage = (event: any) => {
    try {
      const markerData: MarkerData = JSON.parse(event.nativeEvent.data);
      setSelectedMarker(markerData);
      setModalVisible(true);
    } catch (error) {
      console.error('Error parsing marker data:', error);
      Alert.alert('Error', 'Ocurrió un error al procesar la información del marcador.');
    }
  };

  return (
    <View style={styles.container}>
      {/* Barra de búsqueda */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.input}
          placeholder="Buscar dirección..."
          value={searchQuery}
          onChangeText={(text) => {
            setSearchQuery(text);
          }}
          onSubmitEditing={searchLocation}
        />
        <Button title="Buscar" onPress={searchLocation} />
      </View>

      {/* Indicador de carga */}
      {isLoading && <ActivityIndicator size="large" color="#007AFF" />}

      {/* Mapa WebView */}
      <WebView
        originWhitelist={['*']}
        source={{ html: generateHTML(location, safeMarkers) }}
        style={styles.webview}
        onMessage={handleMessage}
      />

      {/* Modal para mostrar información del marcador */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => {
          setModalVisible(false);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView>
              <Text style={styles.modalTitle}>Información del Lugar</Text>
              {/* Imágenes */}
              {selectedMarker?.images && selectedMarker.images.length > 0 && (
                <View style={styles.imageStack}>
                  {selectedMarker.images.map((img, idx) => (
                    <Image key={idx} source={{ uri: img }} style={styles.stackedImage} />
                  ))}
                </View>
              )}
              {/* Información */}
              <View style={styles.infoRow}>
                <Icon name="warning" size={24} color="#FF3B30" style={styles.icon} />
                <Text style={styles.infoText}>Nivel de Contaminación: {selectedMarker?.contaminationLevel || 'Desconocido'}</Text>
              </View>
              <View style={styles.infoRow}>
                <Icon name="recycling" size={24} color="#34C759" style={styles.icon} />
                <Text style={styles.infoText}>Nivel de Plástico: {selectedMarker?.plasticLevel || 'Desconocido'}</Text>
              </View>
              <View style={styles.infoRow}>
                <Icon name="info" size={24} color="#007AFF" style={styles.icon} />
                <Text style={styles.infoText}>Estado: {selectedMarker?.status || 'Desconocido'}</Text>
              </View>
              {/* Botón */}
              <TouchableOpacity style={styles.closeButton} onPress={() => setModalVisible(false)}>
                <Text style={styles.closeButtonText}>Cerrar</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
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
  webview: { flex: 1 },
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
  imageStack: {
    alignItems: 'center',
    marginBottom: 10,
  },
  stackedImage: {
    width: '90%',
    height: 150,
    borderRadius: 10,
    marginBottom: 10,
    resizeMode: 'cover',
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

export default MapComponent;
