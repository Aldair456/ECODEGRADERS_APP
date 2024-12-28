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
  AppState,
  AppStateStatus,
} from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useFocusEffect } from '@react-navigation/native';

// Geolocalización con Expo
import * as Location from 'expo-location';

export type MarkerData = {
  id: string;
  lat: number;
  lng: number;
  contaminationLevel?: string;
  plasticLevel?: string;
  status?: string;
};

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

const MapComponent: React.FC = () => {
  /****************************
   * ESTADOS
   ****************************/
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [location, setLocation] = useState<MarkerData>({
    id: 'default-location',
    lat: -12.0464, // Lima
    lng: -77.0428,
  });
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [selectedMarker, setSelectedMarker] = useState<MarkerData | null>(null);

  const [markers, setMarkers] = useState<MarkerData[]>([]);
  const [appState, setAppState] = useState<AppStateStatus>(AppState.currentState);

  // Ubicación actual del usuario
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  // WebView + WebSocket
  const webViewRef = useRef<WebView | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  // Estado para ver si está navegando (ruta en tiempo real)
  const [isNavigating, setIsNavigating] = useState<boolean>(false);
  // Referencia al subscription de la ubicación en tiempo real
  const watchPositionSubscription = useRef<Location.LocationSubscription | null>(null);

  // Mostrar/Ocultar panel de instrucciones
  const [showInstructions, setShowInstructions] = useState<boolean>(false);

  /****************************
   * HOOKS
   ****************************/
  useEffect(() => {
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => {
      subscription.remove();
    };
  }, [appState]);

  useFocusEffect(
    useCallback(() => {
      // 1) Obtener marcadores
      fetchMarkers();
      // 2) Pedir permisos
      requestLocationPermission();
      // 3) Abrir WebSocket si la app está en primer plano
      if (appState === 'active') {
        openWebSocket();
      }
      // Cleanup
      return () => {
        wsRef.current?.close();
      };
    }, [appState])
  );

  /****************************
   * MANEJO DE ESTADO DE LA APP
   ****************************/
  const handleAppStateChange = (nextAppState: AppStateStatus) => {
    if (
      appState === 'active' &&
      (nextAppState === 'background' || nextAppState === 'inactive')
    ) {
      console.log('[AppState] -> Va a segundo plano, cerrando WebSocket...');
      wsRef.current?.close();
    }
    if (
      (appState === 'background' || appState === 'inactive') &&
      nextAppState === 'active'
    ) {
      console.log('[AppState] -> Vuelve a primer plano, reabriendo WebSocket...');
      openWebSocket();
    }
    setAppState(nextAppState);
  };

  /****************************
   * FUNCIONES DE LOCALIZACIÓN
   ****************************/
  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        await getCurrentLocation();
      } else {
        Alert.alert('Permiso denegado', 'No se pudo obtener tu ubicación.');
      }
    } catch (error) {
      console.error('[Location] Error pidiendo permisos:', error);
    }
  };

  // Obtener la ubicación actual
  const getCurrentLocation = async () => {
    try {
      const currentPos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      const { latitude, longitude } = currentPos.coords;
      setUserLocation({ lat: latitude, lng: longitude });
    } catch (error) {
      console.error('Error al obtener la ubicación:', error);
      Alert.alert('Error', 'No se pudo obtener la ubicación actual.');
    }
  };

  // Iniciar la navegación en tiempo real (simil GMaps)
  const startNavigation = async (destLat: number, destLng: number) => {
    if (!userLocation) {
      Alert.alert('Ubicación desconocida', 'No se pudo obtener tu ubicación.');
      return;
    }
    // 1) Actualizar la ruta inicialmente
    showRoute(userLocation, { lat: destLat, lng: destLng });
    setIsNavigating(true);
    setShowInstructions(true);

    // 2) Iniciar watch para actualizar la ruta cada vez que cambie la posición
    watchPositionSubscription.current = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        distanceInterval: 10, // Mínimo cambio en metros antes de notificar
      },
      (pos) => {
        // Recalcular la ruta ajustando el origen
        const { latitude, longitude } = pos.coords;
        setUserLocation({ lat: latitude, lng: longitude });
        showRoute({ lat: latitude, lng: longitude }, { lat: destLat, lng: destLng });
      }
    );
  };

  // Detener la navegación en tiempo real
  const stopNavigation = () => {
    watchPositionSubscription.current?.remove();
    watchPositionSubscription.current = null;
    setIsNavigating(false);
    setShowInstructions(false);
  };

  /****************************
   * WEBSOCKET
   ****************************/
  const openWebSocket = () => {
    console.log('[openWebSocket] Abriendo WS...');
    wsRef.current = new WebSocket('wss://rjg2cih4jh.execute-api.us-east-1.amazonaws.com/dev');

    wsRef.current.onopen = () => {
      console.log('[WS] -> Conectado');
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
          // Actualizar y sincr. marcadores
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
        console.error('[WS] Error al procesar mensaje:', error);
      }
    };

    wsRef.current.onerror = (error) => {
      console.error('[WS] Error:', error);
    };
    wsRef.current.onclose = () => {
      console.log('[WS] -> Cerrado');
    };
  };

  /****************************
   * GET DE MARCADORES
   ****************************/
  const fetchMarkers = async () => {
    try {
      console.log('[fetchMarkers] GET markers...');
      const response = await fetch(
        'https://mzl6xsrh26.execute-api.us-east-1.amazonaws.com/dev/place/all'
      );
      const data = await response.json();
      const newMarkers = mapAPIToMarkers(data);
      syncMarkersWithMap(markers, newMarkers);
      setMarkers(newMarkers);
    } catch (error) {
      console.error('[fetchMarkers] Error:', error);
      Alert.alert('Error', 'No se pudieron cargar los marcadores.');
    }
  };

  /****************************
   * SINCRONIZAR MARCADORES
   ****************************/
  const syncMarkersWithMap = (oldMarkers: MarkerData[], newMarkers: MarkerData[]) => {
    const newSet = new Set(newMarkers.map((m) => m.id));
    const oldSet = new Set(oldMarkers.map((m) => m.id));

    const added = newMarkers.filter((m) => !oldSet.has(m.id));
    const removed = oldMarkers.filter((m) => !newSet.has(m.id));

    added.forEach((marker) => {
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

    removed.forEach((marker) => {
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
   * BÚSQUEDA DE DIRECCIONES
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
        )}.json?language=es&access_token=pk.eyJ1IjoiYWxkYWlyMjMiLCJhIjoiY20zZzAycXhrMDFkODJscTJmMDF1cThpdyJ9.ov7ycdJg0xlYWpI6DykSdg`
      );
      const data = await response.json();
      if (data.features.length > 0) {
        const [lng, lat] = data.features[0].center;
        setLocation({
          id: 'searched-location',
          lat,
          lng,
        });
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
        Alert.alert('No encontrado', 'No se encontró esa dirección.');
      }
    } catch (error) {
      console.error('[searchLocation] Error:', error);
      Alert.alert('Error', 'Hubo un error buscando la dirección.');
    } finally {
      setIsLoading(false);
    }
  };

  /****************************
   * HANDLE MESSAGE DESDE WEBVIEW
   ****************************/
  const handleMessage = (event: WebViewMessageEvent) => {
    try {
      const markerData: MarkerData = JSON.parse(event.nativeEvent.data);
      setSelectedMarker(markerData);
      setModalVisible(true);
    } catch (error) {
      console.error('[handleMessage] Error parseando:', error);
      Alert.alert('Error', 'Ocurrió un error al procesar la info del marcador.');
    }
  };

  /****************************
   * DISTANCIA (HAVERSINE)
   ****************************/
  const getDistance = (
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number
  ): number => {
    const R = 6371; 
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) *
        Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const toRad = (value: number) => (value * Math.PI) / 180;

  /****************************
   * MARCADOR MÁS CERCANO
   ****************************/
  const handleFindNearest = () => {
    if (!userLocation) {
      Alert.alert('Ubicación desconocida', 'No se pudo obtener tu ubicación actual.');
      return;
    }
    if (markers.length === 0) {
      Alert.alert('Sin marcadores', 'No hay marcadores para comparar.');
      return;
    }

    let nearest: MarkerData = markers[0];
    let minDistance = getDistance(
      userLocation.lat,
      userLocation.lng,
      nearest.lat,
      nearest.lng
    );

    markers.forEach((m) => {
      const dist = getDistance(userLocation.lat, userLocation.lng, m.lat, m.lng);
      if (dist < minDistance) {
        minDistance = dist;
        nearest = m;
      }
    });

    // Iniciar navegación directamente al más cercano
    startNavigation(nearest.lat, nearest.lng);
  };

  /****************************
   * MOSTRAR RUTA
   ****************************/
  const showRoute = (
    origin: { lat: number; lng: number },
    destination: { lat: number; lng: number }
  ) => {
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
  };

  /****************************
   * HTML BASE PARA WEBVIEW
   ****************************/
  const generateBaseHTML = (center: MarkerData) => {
    // Mejoramos el estilo de las indicaciones usando DIVs con borde y un poco de sombra
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8"/>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Mapbox Map</title>
          <script src="https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.js"></script>
          <link href="https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.css" rel="stylesheet" />

          <!-- DIRECTIONS PLUGIN -->
          <script src="https://api.mapbox.com/mapbox-gl-js/plugins/mapbox-gl-directions/v4.1.1/mapbox-gl-directions.js"></script>
          <link
            rel="stylesheet"
            href="https://api.mapbox.com/mapbox-gl-js/plugins/mapbox-gl-directions/v4.1.1/mapbox-gl-directions.css"
            type="text/css"
          />

          <style>
            body, html { margin:0; padding:0; height:100%; }
            #map { position:absolute; top:0; bottom:0; width:100%; }

            .mapboxgl-ctrl-directions {
              display: none !important; /* Oculta la UI nativa de MapboxDirections */
            }

            #instructionsPanel {
              position: absolute;
              bottom: 0;
              left: 0;
              right: 0;
              max-height: 40%;
              background-color: rgba(255,255,255,0.95);
              padding: 10px;
              overflow-y: auto;
              display: none; 
              font-family: Arial, sans-serif;
              border-top-left-radius: 12px;
              border-top-right-radius: 12px;
              box-shadow: 0 -1px 4px rgba(0,0,0,0.2);
            }

            #instructionsHeader {
              display: flex;
              justify-content: space-between;
              align-items: center;
              margin-bottom: 10px;
            }

            #closeInstructions {
              background: #007AFF;
              color: #fff;
              padding: 8px 12px;
              border-radius: 5px;
              cursor: pointer;
              font-size: 14px;
            }

            #stepsContainer > div {
              margin-bottom: 8px;
              padding: 8px;
              border-radius: 5px;
              background-color: #FFF;
              box-shadow: 0 1px 2px rgba(0,0,0,0.15);
            }

            #stepsContainer p {
              margin: 0;
              font-size: 14px;
            }
          </style>
        </head>
        <body>
          <div id="map"></div>
          <div id="instructionsPanel">
            <div id="instructionsHeader">
              <h3 style="margin:0; font-family:Arial;">Indicaciones</h3>
              <div id="closeInstructions">Cerrar</div>
            </div>
            <div id="stepsContainer"></div>
          </div>

          <script>
            mapboxgl.accessToken = 'pk.eyJ1IjoiYWxkYWlyMjMiLCJhIjoiY20zZzAycXhrMDFkODJscTJmMDF1cThpdyJ9.ov7ycdJg0xlYWpI6DykSdg';
            const map = new mapboxgl.Map({
              container: 'map',
              style: 'mapbox://styles/mapbox/streets-v11',
              center: [${center.lng}, ${center.lat}],
              zoom: 12
            });

            // Configuramos language: 'es' para que las instrucciones estén en español
            const directions = new MapboxDirections({
              accessToken: mapboxgl.accessToken,
              unit: 'metric',
              profile: 'mapbox/driving',
              interactive: false,
              controls: { inputs: false, instructions: false },
              language: 'es'
            });
            map.addControl(directions);

            const instructionsPanel = document.getElementById('instructionsPanel');
            const closeBtn = document.getElementById('closeInstructions');
            const stepsContainer = document.getElementById('stepsContainer');

            closeBtn.addEventListener('click', () => {
              instructionsPanel.style.display = 'none';
            });

            // Cuando se calcule la ruta, armamos un diseño más bonito para cada paso
            directions.on('route', (e) => {
              if (e.route && e.route.length > 0) {
                const route = e.route[0];
                const steps = route.legs[0].steps;
                let instructionsHtml = '';

                steps.forEach((step, idx) => {
                  instructionsHtml += \`
                    <div>
                      <p><strong>Paso \${idx+1}:</strong> \${step.maneuver.instruction}</p>
                    </div>
                  \`;
                });

                stepsContainer.innerHTML = instructionsHtml;
                instructionsPanel.style.display = 'block';
              }
            });

            // Marcadores
            const markersMap = {};
            function addMarker(markerString) {
              const markerData = JSON.parse(markerString);
              const { id, lat, lng } = markerData;
              if (markersMap[id]) return;
              const marker = new mapboxgl.Marker({ color: 'green' })
                .setLngLat([lng, lat])
                .addTo(map);
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

            // Escuchar mensajes de RN
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
                } else if (parsed.type === 'SHOW_ROUTE') {
                  const { origin, destination } = parsed.payload;
                  directions.setOrigin([origin.lng, origin.lat]);
                  directions.setDestination([destination.lng, destination.lat]);
                }
              } catch (err) {
                console.error('Error parsing message:', err);
              }
            });
          </script>
        </body>
      </html>
    `;
  };

  /****************************
   * RENDER
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
        <View style={{ marginLeft: 5 }}>
          <Button title="Cercano" onPress={handleFindNearest} />
        </View>
      </View>

      {/* Indicador de carga */}
      {isLoading && <ActivityIndicator size="large" color="#007AFF" />}

      {/* WebView con Mapbox */}
      <WebView
        ref={webViewRef}
        originWhitelist={['*']}
        source={{ html: generateBaseHTML(location) }}
        style={styles.webview}
        onMessage={handleMessage}
      />

      {/* Panel flotante para terminar la navegación cuando se quiera */}
      {isNavigating && (
        <View style={styles.navigationPanel}>
          {/* Quitamos el texto anterior y dejamos solo el botón para detener navegación */}
          <TouchableOpacity
            style={styles.endNavButton}
            onPress={stopNavigation}
          >
            <Text style={{ color: '#fff' }}>Detener Navegación</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Modal para el marcador */}
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
  // Panel para la navegación en tiempo real
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

export default MapComponent;
