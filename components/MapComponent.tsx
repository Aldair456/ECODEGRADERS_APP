import React, { useCallback, useEffect, useRef, useState } from 'react';
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
  AppState,          // <-- Para escuchar si la app va a background/foreground
  AppStateStatus,
} from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useFocusEffect } from '@react-navigation/native'; // <-- Para detectar cuando la pantalla está en foco

/****************************
 * Definiciones y tipos
 ****************************/
export type MarkerData = {
  id: string;
  lat: number;
  lng: number;
  contaminationLevel?: string;
  plasticLevel?: string;
  status?: string;
};

// Convierte la respuesta de la API a la estructura MarkerData
const mapAPIToMarkers = (data: any[]): MarkerData[] => {
  return data.map((item: any) => ({
    id: String(item.id || `${item.latitude}-${item.longitude}-${Math.random()}`),
    lat: item.latitude,
    lng: item.longitude,
    contaminationLevel: item.pollution_level,
    plasticLevel: item.plastic_level,
    status: item.status,
  }));
};

/****************************
 * Componente principal
 ****************************/
const MapComponent: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [location, setLocation] = useState<MarkerData>({
    id: 'default-location',
    lat: -12.0464, // Lima
    lng: -77.0428,
  });
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Modal para info de un marcador
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [selectedMarker, setSelectedMarker] = useState<MarkerData | null>(null);

  // Lista de marcadores actuales
  const [markers, setMarkers] = useState<MarkerData[]>([]);

  // Referencia al WebView para inyectar scripts
  const webViewRef = useRef<WebView | null>(null);

  // Referencia al WebSocket
  const wsRef = useRef<WebSocket | null>(null);

  // Estado de la app (foreground/background/inactive)
  const [appState, setAppState] = useState<AppStateStatus>(AppState.currentState);

  /****************************
   * Manejo del estado de la app
   ****************************/
  useEffect(() => {
    // Listener para cambios en AppState
    const subscription = AppState.addEventListener('change', handleAppStateChange);

    // Limpieza
    return () => {
      subscription.remove();
    };
  }, [appState]);

  // Se llama cada vez que AppState cambie
  const handleAppStateChange = (nextAppState: AppStateStatus) => {
    // Si la app va de active -> background/inactive => cerrar WebSocket
    if (
      appState === 'active' &&
      (nextAppState === 'background' || nextAppState === 'inactive')
    ) {
      console.log('[AppState] -> La app va a segundo plano, cerrando WebSocket...');
      wsRef.current?.close();
    }

    // Si la app vuelve de background/inactive -> active => reabrir WebSocket (opcional)
    if (
      (appState === 'background' || appState === 'inactive') &&
      nextAppState === 'active'
    ) {
      console.log('[AppState] -> La app vuelve a primer plano, reabriendo WebSocket...');
      openWebSocket();
    }

    setAppState(nextAppState);
  };

  /****************************
   * Manejo de la pantalla en foco
   ****************************/
  useFocusEffect(
    useCallback(() => {
      // Cuando la pantalla entra en foco
      console.log('[useFocusEffect] Pantalla en foco -> Hacemos GET y abrimos WSS si app activa');

      // 1) Hacer GET inicial de marcadores
      fetchMarkers();

      // 2) Si la app está activa (foreground), abrimos el WebSocket
      if (appState === 'active') {
        openWebSocket();
      }

      // Cuando la pantalla pierde foco (o el componente se desmonta):
      return () => {
        console.log('[useFocusEffect] Pantalla pierde foco -> Cerrando WebSocket...');
        wsRef.current?.close();
      };
    }, [appState]) // Dependemos de appState, por si cambia mientras estamos en la pantalla
  );

  /****************************
   * Función para abrir/reabrir el WebSocket
   ****************************/
  const openWebSocket = () => {
    console.log('[openWebSocket] Abriendo WebSocket...');
    wsRef.current = new WebSocket('wss://rjg2cih4jh.execute-api.us-east-1.amazonaws.com/dev');

    wsRef.current.onopen = () => {
      console.log('WS onopen -> Conectado al WebSocket');
    };

    wsRef.current.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        // Si es la acción "added"
        if (data.action === 'added' && data.place) {
          const place = data.place;
          const newMarker: MarkerData = {
            id: String(
              place.place_id ||
              `${place.latitude}-${place.longitude}-${Math.random()}`
            ),
            lat: place.latitude,
            lng: place.longitude,
            contaminationLevel: place.pollution_level,
            plasticLevel: place.plastic_level,
            status: place.status,
          };

          // Actualizar marcadores y sincronizar con el mapa
          setMarkers((prevMarkers) => {
            const exists = prevMarkers.some((m) => m.id === newMarker.id);
            if (!exists) {
              syncMarkersWithMap(prevMarkers, [...prevMarkers, newMarker]);
              return [...prevMarkers, newMarker];
            }
            return prevMarkers;
          });
        }
      } catch (error) {
        console.error('Error al procesar el mensaje del WebSocket:', error);
      }
    };

    wsRef.current.onerror = (error) => {
      console.error('Error en WebSocket:', error);
    };

    wsRef.current.onclose = () => {
      console.log('WS onclose -> WebSocket cerrado');
    };
  };

  /****************************
   * Función para hacer el GET de marcadores
   ****************************/
  const fetchMarkers = async () => {
    try {
      console.log('[fetchMarkers] Obteniendo marcadores via GET...');
      const response = await fetch(
        'https://mzl6xsrh26.execute-api.us-east-1.amazonaws.com/dev/place/all'
      );
      const data = await response.json();

      const newMarkers = mapAPIToMarkers(data);
      syncMarkersWithMap(markers, newMarkers);
      setMarkers(newMarkers);
    } catch (error) {
      console.error('Error fetching markers:', error);
      Alert.alert('Error', 'No se pudieron cargar los marcadores.');
    }
  };

  /****************************
   * Sincroniza los marcadores (sin redibujar el mapa completo)
   ****************************/
  const syncMarkersWithMap = (oldMarkers: MarkerData[], newMarkers: MarkerData[]) => {
    // Creamos sets para saber qué IDs agregamos y cuáles quitamos
    const newSet = new Set(newMarkers.map((m) => m.id));
    const oldSet = new Set(oldMarkers.map((m) => m.id));

    // Marcadores que se agregan
    const addedMarkers = newMarkers.filter((m) => !oldSet.has(m.id));
    // Marcadores que se quitan
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

  /****************************
   * Búsqueda de direcciones con Mapbox
   ****************************/
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

        // Actualiza el estado local
        setLocation({
          id: 'searched-location',
          lat,
          lng,
        });

        // Envía un mensaje a la WebView para "volar" a esa ubicación
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

  /****************************
   * Manejo de mensajes desde la WebView (click en marcador)
   ****************************/
  const handleMessage = (event: WebViewMessageEvent) => {
    try {
      const markerData: MarkerData = JSON.parse(event.nativeEvent.data);
      // Mostramos la info del marcador en el modal
      setSelectedMarker(markerData);
      setModalVisible(true);
    } catch (error) {
      console.error('Error parsing marker data:', error);
      Alert.alert('Error', 'Ocurrió un error al procesar la información del marcador.');
    }
  };

  /****************************
   * Generar el HTML base para la WebView
   ****************************/
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

            // Guardar marcadores en un objeto para poder eliminarlos si es necesario
            const markersMap = {};

            function addMarker(markerString) {
              const markerData = JSON.parse(markerString);
              const { id, lat, lng } = markerData;
              if (markersMap[id]) return; // Ya existe, no lo agregamos

              const marker = new mapboxgl.Marker({ color: 'green' })
                .setLngLat([lng, lat])
                .addTo(map);

              // Al hacer click en el marcador, mandamos data a React Native
              marker.getElement().addEventListener('click', () => {
                window.ReactNativeWebView.postMessage(JSON.stringify(markerData));
              });

              markersMap[id] = marker;
            }

            function removeMarker(id) {
              const marker = markersMap[id];
              if (marker) {
                marker.remove();
                delete markersMap[id];
              }
            }

            // Escuchar mensajes desde React Native
            document.addEventListener('message', (event) => {
              try {
                const parsed = JSON.parse(event.data);
                if (parsed.type === 'ADD_MARKER') {
                  addMarker(JSON.stringify(parsed.payload));
                } else if (parsed.type === 'REMOVE_MARKER') {
                  removeMarker(parsed.payload.id);
                } else if (parsed.type === 'FLY_TO') {
                  const { lng, lat } = parsed.payload;
                  map.flyTo({ center: [lng, lat], zoom: 14 });
                }
              } catch (error) {
                console.error('Error parsing message:', error);
              }
            });
          </script>
        </body>
      </html>
    `;
  };

  /****************************
   * Render del componente
   ****************************/
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

      {/* WebView con el mapa de Mapbox */}
      <WebView
        ref={webViewRef}
        originWhitelist={['*']}
        source={{ html: generateBaseHTML(location) }}
        style={styles.webview}
        onMessage={handleMessage}
      />

      {/* Modal para mostrar información detallada del marcador */}
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
              <View style={styles.infoRow}>
                <Icon name="warning" size={24} color="#FF3B30" style={styles.icon} />
                <Text style={styles.infoText}>
                  Nivel de Contaminación: {selectedMarker?.contaminationLevel ?? 'Desconocido'}
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Icon name="recycling" size={24} color="#34C759" style={styles.icon} />
                <Text style={styles.infoText}>
                  Nivel de Plástico: {selectedMarker?.plasticLevel ?? 'Desconocido'}
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Icon name="info" size={24} color="#007AFF" style={styles.icon} />
                <Text style={styles.infoText}>
                  Estado: {selectedMarker?.status ?? 'Desconocido'}
                </Text>
              </View>
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

/****************************
 * Estilos
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

/****************************
 * Exportar el componente
 ****************************/
export default MapComponent;
