// Pins.tsx
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
    Alert,
    Modal,
    Text,
    ScrollView,
    TouchableOpacity,
  } from 'react-native';
  import { WebView, WebViewMessageEvent } from 'react-native-webview';
  import Icon from 'react-native-vector-icons/MaterialIcons';
  
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
   * COMPONENTE PINS
   ****************************/
  const Pins: React.FC<{ userLocation: { lat: number; lng: number } | null }> = ({
    userLocation,
  }) => {
    /****************************
     * ESTADOS
     ****************************/
    const [markers, setMarkers] = useState<MarkerData[]>([]);
    const [modalVisible, setModalVisible] = useState<boolean>(false);
    const [selectedMarker, setSelectedMarker] = useState<MarkerData | null>(null);
    const [isNavigating, setIsNavigating] = useState<boolean>(false);
  
    // Referencias
    const webViewRef = useRef<WebView | null>(null);
    const wsRef = useRef<WebSocket | null>(null);
  
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
          } else if (data.action === 'deleted' && data.id) {
            const deletedMarkerId = data.id;
  
            // Actualiza el estado local para eliminar el marcador
            setMarkers((prevMarkers) => prevMarkers.filter((m) => m.id !== deletedMarkerId));
  
            // Sincroniza la eliminación con el mapa (WebView)
            const removeScript = `
              (function() {
                var message = {
                  type: 'REMOVE_MARKER',
                  payload: { id: '${deletedMarkerId}' }
                };
                document.dispatchEvent(new MessageEvent('message', { data: JSON.stringify(message) }));
              })();
            `;
            webViewRef.current?.injectJavaScript(removeScript);
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
  
    // useEffect para conectar el WebSocket al montar el componente
    useEffect(() => {
      connectWebSocket();
  
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
  
    return (
      <View style={styles.pinsContainer}>
        {/* WebView con el HTML base.
            Se monta solo una vez. Luego modificamos el mapa inyectando scripts (addMarker, removeMarker, flyTo). */}
        <WebView
          ref={webViewRef}
          originWhitelist={['*']}
          source={{ html: useMemo(() => generateBaseHTML(markers[0] || {
            id: 'default-location',
            lat: -12.0464,
            lng: -77.0428,
          }), [generateBaseHTML, markers]) }}
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
  
                {/* Botón para iniciar la navegación en tiempo real */}
                <TouchableOpacity
                  style={[styles.closeButton, { backgroundColor: '#34C759' }]}
                  onPress={() => {
                    if (!userLocation || !selectedMarker) {
                      Alert.alert('Ubicación desconocida', 'No se pudo obtener tu ubicación.');
                      return;
                    }
                    // Empezamos la navegación
                    showRoute(userLocation, { lat: selectedMarker.lat, lng: selectedMarker.lng });
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
  
  export default Pins;
  
  /****************************
   * ESTILOS
   ****************************/
  const styles = StyleSheet.create({
    pinsContainer: {
      flex: 1,
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
  