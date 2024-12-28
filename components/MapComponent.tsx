import React, { useEffect, useRef, useState } from 'react';
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
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import Icon from 'react-native-vector-icons/MaterialIcons';

// Estructura del marcador
export type MarkerData = {
  id: string;
  lat: number;
  lng: number;
  contaminationLevel?: string;
  plasticLevel?: string;
  status?: string;
};

// Función que mapea la respuesta de la API a nuestro tipo MarkerData
const mapAPIToMarkers = (data: any[]): MarkerData[] => {
  return data.map((item: any) => ({
    // Ajusta este 'id' según el campo que devuelva tu API
    // si no hay id en la API, puedes generar uno con un random
    id: String(item.id || `${item.latitude}-${item.longitude}-${Math.random()}`),
    lat: item.latitude,
    lng: item.longitude,
    contaminationLevel: item.pollution_level,
    plasticLevel: item.plastic_level,
    status: item.status,
  }));
};

const MapComponent: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [location, setLocation] = useState<MarkerData>({
    id: 'default-location',
    lat: -12.0464,  // Lima
    lng: -77.0428,
  });
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Estados para el modal
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [selectedMarker, setSelectedMarker] = useState<MarkerData | null>(null);

  // Marcadores actuales en nuestro state
  const [markers, setMarkers] = useState<MarkerData[]>([]);

  // Referencia a la WebView para inyectar código JS
  const webViewRef = useRef<WebView | null>(null);

  /**
   * HTML base del mapa (sin marcadores).
   * Dentro, definimos funciones para añadir/eliminar marcadores sin recargar.
   */
  const generateBaseHTML = (center: MarkerData) => {
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
            mapboxgl.accessToken = 'pk.eyJ1IjoiYWxkYWlyMjMiLCJhIjoiY20zZzAycXhrMDFkODJscTJmMDF1cThpdyJ9.ov7ycdJg0xlYWpI6DykSdg';
            const map = new mapboxgl.Map({
              container: 'map',
              style: 'mapbox://styles/mapbox/streets-v11',
              center: [${center.lng}, ${center.lat}],
              zoom: 12
            });

            // Objeto para guardar la referencia de cada marcador con su ID
            const markersMap = {};

            // Función para añadir un marcador.
            function addMarker(markerString) {
              const markerData = JSON.parse(markerString);
              const { id, lat, lng } = markerData;
              if (markersMap[id]) return; // Si ya existe, no lo agregamos de nuevo

              const marker = new mapboxgl.Marker({ color: 'green' })
                .setLngLat([lng, lat])
                .addTo(map);

              // Al hacer click en el marcador, enviamos la información a React Native
              marker.getElement().addEventListener('click', () => {
                window.ReactNativeWebView.postMessage(JSON.stringify(markerData));
              });

              markersMap[id] = marker;
            }

            // Función para eliminar un marcador por ID
            function removeMarker(id) {
              const marker = markersMap[id];
              if (marker) {
                marker.remove();
                delete markersMap[id];
              }
            }

            // Escuchar mensajes que vienen desde React Native
            document.addEventListener('message', (event) => {
              try {
                const parsed = JSON.parse(event.data);
                if (parsed.type === 'ADD_MARKER') {
                  addMarker(JSON.stringify(parsed.payload));
                } else if (parsed.type === 'REMOVE_MARKER') {
                  removeMarker(parsed.payload.id);
                } else if (parsed.type === 'FLY_TO') {
                  // Mover la vista a una nueva posición
                  const { lng, lat } = parsed.payload;
                  map.flyTo({ center: [lng, lat], zoom: 14 });
                }
              } catch (error) {
                console.error('Error parsing message from React Native:', error);
              }
            });
          </script>
        </body>
      </html>
    `;
  };

  /**
   * Cargar marcadores de la API y configuramos un intervalo para refrescar.
   */
  useEffect(() => {
    const fetchMarkers = async () => {
      try {
        const response = await fetch(
          'https://mzl6xsrh26.execute-api.us-east-1.amazonaws.com/dev/place/all'
        );
        const data = await response.json();
        const newMarkers = mapAPIToMarkers(data);

        // Sincronizar marcadores del mapa (estado anterior vs nuevos)
        syncMarkersWithMap(markers, newMarkers);

        // Actualizar el estado con la nueva lista
        setMarkers(newMarkers);
      } catch (error) {
        console.error('Error fetching markers:', error);
        Alert.alert('Error', 'No se pudieron cargar los marcadores.');
      }
    };

    // Primera carga
    fetchMarkers();

    // Intervalo de 5 segundos para refrescar automáticamente
    const intervalId = setInterval(fetchMarkers, 5000);
    return () => clearInterval(intervalId);
  }, []);

  /**
   * Sincroniza los marcadores antiguos con los nuevos, sin redibujar todo el mapa.
   * - Agrega los que no estaban
   * - Elimina los que ya no están
   */
  const syncMarkersWithMap = (oldMarkers: MarkerData[], newMarkers: MarkerData[]) => {
    // IDs de los nuevos
    const newSet = new Set(newMarkers.map((m) => m.id));
    // IDs de los antiguos
    const oldSet = new Set(oldMarkers.map((m) => m.id));

    // Marcadores agregados = en newMarkers y no en oldSet
    const addedMarkers = newMarkers.filter((m) => !oldSet.has(m.id));
    // Marcadores eliminados = en oldMarkers y no en newSet
    const removedMarkers = oldMarkers.filter((m) => !newSet.has(m.id));

    // Agregar nuevos
    addedMarkers.forEach((marker) => {
      const script = `
        (function() {
          var message = {
            type: 'ADD_MARKER',
            payload: ${JSON.stringify(marker)}
          };
          document.dispatchEvent(new MessageEvent('message', { data: JSON.stringify(message) }));
        })();
      `;
      webViewRef.current?.injectJavaScript(script);
    });

    // Eliminar los que ya no están
    removedMarkers.forEach((marker) => {
      const script = `
        (function() {
          var message = {
            type: 'REMOVE_MARKER',
            payload: { id: '${marker.id}' }
          };
          document.dispatchEvent(new MessageEvent('message', { data: JSON.stringify(message) }));
        })();
      `;
      webViewRef.current?.injectJavaScript(script);
    });
  };

  /**
   * Búsqueda de una dirección vía Mapbox Geocoding.
   */
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
        )}.json?access_token=pk.eyJ1IjoiYWxkYWlyMjMiLCJhIjoiY20zZzAycXhrMDFkODJscTJmMDF1cThpdyJ9.ov7ycdJg0xlYWpI6DykSdg`
      );
      const data = await response.json();
      if (data.features.length > 0) {
        const [lng, lat] = data.features[0].center;
        // Actualiza la ubicación en React
        setLocation({
          id: 'searched-location',
          lat,
          lng,
        });

        // Manda un mensaje a la WebView para hacer 'flyTo' en el mapa
        const flyToScript = `
          (function() {
            var message = {
              type: 'FLY_TO',
              payload: { lng: ${lng}, lat: ${lat} }
            };
            document.dispatchEvent(new MessageEvent('message', { data: JSON.stringify(message) }));
          })();
        `;
        webViewRef.current?.injectJavaScript(flyToScript);
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

  /**
   * Manejar los mensajes que llegan desde la WebView (clic en el marcador, etc.)
   */
  const handleMessage = (event: WebViewMessageEvent) => {
    try {
      const markerData: MarkerData = JSON.parse(event.nativeEvent.data);
      // Abrimos el modal con la información
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
          onChangeText={(text) => setSearchQuery(text)}
          onSubmitEditing={searchLocation}
        />
        <Button title="Buscar" onPress={searchLocation} />
      </View>

      {/* Indicador de carga */}
      {isLoading && <ActivityIndicator size="large" color="#007AFF" />}

      {/* WebView con el HTML base.
          Se monta solo una vez. Luego modificamos el mapa inyectando scripts (addMarker, removeMarker, flyTo). */}
      <WebView
        ref={webViewRef}
        originWhitelist={['*']}
        source={{ html: generateBaseHTML(location) }}
        style={styles.webview}
        onMessage={handleMessage}
      />

      {/* Modal para mostrar información del marcador */}
      <Modal
        animationType="slide"
        transparent
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView>
              <Text style={styles.modalTitle}>Información del Lugar</Text>

              {/* Nivel de Contaminación */}
              <View style={styles.infoRow}>
                <Icon name="warning" size={24} color="#FF3B30" style={styles.icon} />
                <Text style={styles.infoText}>
                  Nivel de Contaminación: {selectedMarker?.contaminationLevel ?? 'Desconocido'}
                </Text>
              </View>
              {/* Nivel de Plástico */}
              <View style={styles.infoRow}>
                <Icon name="recycling" size={24} color="#34C759" style={styles.icon} />
                <Text style={styles.infoText}>
                  Nivel de Plástico: {selectedMarker?.plasticLevel ?? 'Desconocido'}
                </Text>
              </View>
              {/* Estado */}
              <View style={styles.infoRow}>
                <Icon name="info" size={24} color="#007AFF" style={styles.icon} />
                <Text style={styles.infoText}>
                  Estado: {selectedMarker?.status ?? 'Desconocido'}
                </Text>
              </View>

              {/* Botón para cerrar */}
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.closeButtonText}>Cerrar</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default MapComponent;

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
