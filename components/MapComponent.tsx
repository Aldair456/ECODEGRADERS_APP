import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
  useMemo,
} from 'react';
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
  AppState,
  AppStateStatus,
} from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import Icon from 'react-native-vector-icons/MaterialIcons';
import * as Location from 'expo-location'; // Geolocalización con Expo

/****************************
 * TIPOS
 ****************************/
export type MarkerData = {
  id: string;
  lat: number;
  lng: number;
  contaminationLevel?: string;
  plasticLevel?: string;
  status?: string;
};

/**
 * Función que mapea la respuesta de la API a nuestro tipo MarkerData
 */
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
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [selectedMarker, setSelectedMarker] = useState<MarkerData | null>(null);
  const [markers, setMarkers] = useState<MarkerData[]>([]);
  const [isNavigating, setIsNavigating] = useState<boolean>(false);
  // Podrías usar esto si quisieras mostrar instrucciones de navegación, etc.
  const [showInstructions, setShowInstructions] = useState<boolean>(false);

  // Referencias
  const webViewRef = useRef<WebView | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const appState = useRef<AppStateStatus>(AppState.currentState);

  /****************************
   * FUNCIONES PARA WEBSOCKET
   ****************************/
  const connectWebSocket = useCallback(() => {
    if (wsRef.current) {
      // Ya hay una conexión abierta
      return;
    }

    wsRef.current = new WebSocket('wss://3otpakshrd.execute-api.us-east-1.amazonaws.com/dev');

    wsRef.current.onopen = () => {
      console.log('[WebSocket] Conectado');
    };

    wsRef.current.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
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

          // Actualizar y sincronizar marcadores
          setMarkers((prev) => {
            const exists = prev.some((m) => m.id === newMarker.id);
            if (!exists) {
              syncMarkersWithMap(prev, [...prev, newMarker]);
              return [...prev, newMarker];
            }
            return prev;
          });
        }
      } catch (error) {
        console.error('[WebSocket] Error al procesar mensaje:', error);
      }
    };

    wsRef.current.onerror = (error) => {
      console.error('[WebSocket] Error:', error);
    };

    wsRef.current.onclose = () => {
      console.log('[WebSocket] Cerrado');
      wsRef.current = null;
    };
  }, []);

  const disconnectWebSocket = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

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

  // Manejo de AppState (primer plano / segundo plano)
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        console.log('[AppState] La app ha vuelto a estar activa');
        connectWebSocket();
      } else if (
        appState.current === 'active' &&
        nextAppState.match(/inactive|background/)
      ) {
        console.log('[AppState] La app ha pasado a background o inactiva');
        disconnectWebSocket();
      }
      appState.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
      disconnectWebSocket(); // Asegura que el WebSocket se cierre al desmontar el componente
    };
  }, [connectWebSocket, disconnectWebSocket]);

  // useEffect para conectar el WebSocket al montar el componente si la app está activa
  useEffect(() => {
    if (appState.current === 'active') {
      connectWebSocket();
    }

    return () => {
      disconnectWebSocket();
    };
  }, [connectWebSocket, disconnectWebSocket]);

  /**
   * HTML base del mapa (sin marcadores).
   * Dentro, definimos funciones para añadir/eliminar marcadores sin recargar.
   */
  const generateBaseHTML = useCallback((center: MarkerData) => {
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
                } else if (parsed.type === 'SHOW_ROUTE') {
                  // Aquí podrías dibujar una ruta con algún plugin, dibujar polilíneas, etc.
                  // Por simplicidad, solo haremos flyTo al destino:
                  const { origin, destination } = parsed.payload;
                  // Centrar en un punto medio, por ejemplo:
                  const midLng = (origin.lng + destination.lng) / 2;
                  const midLat = (origin.lat + destination.lat) / 2;
                  map.flyTo({ center: [midLng, midLat], zoom: 13 });
                }
              } catch (error) {
                console.error('Error parsing message from React Native:', error);
              }
            });
          </script>
        </body>
      </html>
    `;
  }, []);

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
      }
    };

    // Primera carga
    fetchMarkers();

    // Intervalo de 5 segundos para refrescar automáticamente
    const intervalId = setInterval(fetchMarkers, 5000);
    return () => clearInterval(intervalId);
  }, [markers, syncMarkersWithMap]);

  /**
   * Sincroniza los marcadores antiguos con los nuevos, sin redibujar todo el mapa.
   * - Agrega los que no estaban
   * - Elimina los que ya no están
   */
  const syncMarkersWithMap = useCallback(
    (oldMarkers: MarkerData[], newMarkers: MarkerData[]) => {
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
    },
    []
  );

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
  }, [searchQuery]);

  /**
   * Manejar los mensajes que llegan desde la WebView (clic en el marcador, etc.)
   */
  const handleMessage = useCallback((event: WebViewMessageEvent) => {
    try {
      const markerData: MarkerData = JSON.parse(event.nativeEvent.data);
      // Abrimos el modal con la información
      setSelectedMarker(markerData);
      setModalVisible(true);
    } catch (error) {
      console.error('Error parsing marker data:', error);
      Alert.alert('Error', 'Ocurrió un error al procesar la información del marcador.');
    }
  }, []);

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
    if (markers.length === 0) {
      Alert.alert('Sin marcadores', 'No hay marcadores para comparar.');
      return;
    }

    let nearest: MarkerData = markers[0];
    let minDistance = getDistance(userLocation.lat, userLocation.lng, nearest.lat, nearest.lng);

    markers.forEach((m) => {
      const dist = getDistance(userLocation.lat, userLocation.lng, m.lat, m.lng);
      if (dist < minDistance) {
        minDistance = dist;
        nearest = m;
      }
    });

    // Iniciar navegación directamente al más cercano
    startNavigation(nearest.lat, nearest.lng);
  }, [markers, userLocation, getDistance, startNavigation]);

  /**
   * Iniciar navegación (actualizar ruta en tiempo real)
   */
  const startNavigation = useCallback(
    async (destLat: number, destLng: number) => {
      if (!userLocation) {
        Alert.alert('Ubicación desconocida', 'No se pudo obtener tu ubicación.');
        return;
      }

      // 1) Mostrar ruta inicialmente
      showRoute(userLocation, { lat: destLat, lng: destLng });
      setIsNavigating(true);
      setShowInstructions(true);

      // 2) Iniciar watch para actualizar la ruta en tiempo real
      //    (se podría guardar la suscripción en una ref para poder cancelarla luego)
      await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          distanceInterval: 10, // Notificar cada 10 metros
        },
        (pos) => {
          const { latitude, longitude } = pos.coords;
          setUserLocation({ lat: latitude, lng: longitude });
          showRoute({ lat: latitude, lng: longitude }, { lat: destLat, lng: destLng });
        }
      );
    },
    [userLocation, showRoute]
  );

  /**
   * Detener navegación
   */
  const stopNavigation = useCallback(() => {
    // Aquí deberías tener una referencia a la suscripción de watchPosition para poder eliminarla
    // Por simplicidad, no la estamos guardando en este ejemplo
    setIsNavigating(false);
    setShowInstructions(false);
  }, []);

  /**
   * Mostrar ruta en el mapa (WebView)
   */
  const showRoute = useCallback(
    (origin: { lat: number; lng: number }, destination: { lat: number; lng: number }) => {
      const script = `
        (function() {
          var message = {
            type: 'SHOW_ROUTE',
            payload: {
              origin: { lng: ${origin.lng}, lat: ${origin.lat} },
              destination: { lng: ${destination.lng}, lat: ${destination.lat} }
            }
          };
          document.dispatchEvent(new MessageEvent('message', { data: JSON.stringify(message) }));
        })();
      `;
      webViewRef.current?.injectJavaScript(script);
    },
    []
  );

  /**
   * Memoización del HTML base para optimizar renders
   */
  const memoizedHTML = useMemo(() => generateBaseHTML(location), [generateBaseHTML, location]);

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

      {/* WebView con el HTML base.
          Se monta solo una vez. Luego modificamos el mapa inyectando scripts (addMarker, removeMarker, flyTo). */}
      <WebView
        ref={webViewRef}
        originWhitelist={['*']}
        source={{ html: memoizedHTML }}
        style={styles.webview}
        onMessage={handleMessage}
      />

      {/* Panel flotante para terminar la navegación */}
      {isNavigating && (
        <View style={styles.navigationPanel}>
          <TouchableOpacity style={styles.endNavButton} onPress={stopNavigation}>
            <Text style={{ color: '#fff' }}>Detener Navegación</Text>
          </TouchableOpacity>
        </View>
      )}

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

              {/* Botón para iniciar la navegación en tiempo real */}
              <TouchableOpacity
                style={[styles.closeButton, { backgroundColor: '#34C759' }]}
                onPress={() => {
                  if (!userLocation || !selectedMarker) {
                    Alert.alert('Ubicación desconocida', 'No se pudo obtener tu ubicación.');
                    return;
                  }
                  // Empezamos la navegación
                  startNavigation(selectedMarker.lat, selectedMarker.lng);
                  setModalVisible(false);
                }}
              >
                <Text style={styles.closeButtonText}>Iniciar Navegación</Text>
              </TouchableOpacity>

              {/* Botón para cerrar modal */}
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
