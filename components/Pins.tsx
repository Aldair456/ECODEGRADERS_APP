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
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Picker } from '@react-native-picker/picker';

/****************************
 * TIPOS
 ****************************/
export type MarkerData = {
  id: string;
  lat: number;
  lng: number;
  contaminationLevel?: string; // Ej. "alto", "medio", "bajo"
  plasticLevel?: string;       // Ej. "alto", "medio", "bajo"
  status?: string;             // Ej. "active", "inactive"
  place?: string;              // Para almacenar place_id
};

/**
 * Función que mapea la respuesta de la API a nuestro tipo MarkerData
 */
const mapAPIToMarkers = (data: any[]): MarkerData[] => {
  return data.map((item: any) => ({
    id: String(item.place_id || `${item.latitude}-${item.longitude}-${Math.random()}`),
    lat: item.latitude,
    lng: item.longitude,
    contaminationLevel: item.pollution_level,
    plasticLevel: item.plastic_level,
    status: item.status,
    place: item.place_id,
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
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [editData, setEditData] = useState<Partial<MarkerData>>({});
  const [mapCenter, setMapCenter] = useState<MarkerData>({
    id: 'default-location',
    lat: -12.0464,
    lng: -77.0428,
  });

  // Referencias
  const webViewRef = useRef<WebView | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  /****************************
   * FUNCIONES PARA WEBSOCKET
   ****************************/
  const connectWebSocket = useCallback(() => {
    if (wsRef.current) return;
    wsRef.current = new WebSocket(
      'wss://3otpakshrd.execute-api.us-east-1.amazonaws.com/dev'
    );

    wsRef.current.onopen = () => {
      console.log('[WebSocket] Conectado');
    };
    wsRef.current.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.action === 'added' && data.place) {
          const place = data.place;
          const newMarker: MarkerData = {
            id: String(place.place_id || `${place.latitude}-${place.longitude}-${Math.random()}`),
            lat: place.latitude,
            lng: place.longitude,
            contaminationLevel: place.pollution_level,
            plasticLevel: place.plastic_level,
            status: place.status,
            place: place.place_id,
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
        } else if (data.action === 'deleted' && data.place && data.place.place_id) {
          const deletedMarkerId = data.place.place_id;
          // Eliminar localmente
          setMarkers((prevMarkers) =>
            prevMarkers.filter((m) => m.place !== deletedMarkerId)
          );
          // Sincronizar en el mapa
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
   * EFECTOS
   ****************************/
  useEffect(() => {
    connectWebSocket();
    return () => {
      disconnectWebSocket();
    };
  }, [connectWebSocket, disconnectWebSocket]);

  // Establecer el centro del mapa basado en la ubicación del usuario
  useEffect(() => {
    if (userLocation) {
      setMapCenter({
        id: 'user-location',
        lat: userLocation.lat,
        lng: userLocation.lng,
      });
    }
  }, [userLocation]);

  /**
   * HTML base del mapa (sin marcadores).
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

            // Añadir un marcador al mapa
            function addMarker(markerString) {
              const markerData = JSON.parse(markerString);
              const { id, lat, lng, status } = markerData;
              if (markersMap[id]) return;

              const marker = new mapboxgl.Marker({ color: status === 'active' ? 'green' : 'green' })
                .setLngLat([lng, lat])
                .addTo(map);

              marker.getElement().addEventListener('click', () => {
                window.ReactNativeWebView.postMessage(JSON.stringify(markerData));
              });

              markersMap[id] = marker;
            }

            // Eliminar un marcador por ID
            function removeMarker(id) {
              const marker = markersMap[id];
              if (marker) {
                marker.remove();
                delete markersMap[id];
              }
            }

            // Actualizar un marcador
            function updateMarker(markerString) {
              const markerData = JSON.parse(markerString);
              const { id, lat, lng, status } = markerData;
              const existingMarker = markersMap[id];
              if (existingMarker) {
                existingMarker.setLngLat([lng, lat]);
                // Cambiar el color del marcador
                existingMarker.getElement().style.backgroundColor =
                  status === 'active' ? 'green' : 'green';
              } else {
                addMarker(markerString);
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
                } else if (parsed.type === 'UPDATE_MARKER') {
                  updateMarker(JSON.stringify(parsed.payload));
                } else if (parsed.type === 'FLY_TO') {
                  const { lng, lat } = parsed.payload;
                  map.flyTo({ center: [lng, lat], zoom: 14 });
                } else if (parsed.type === 'SHOW_ROUTE') {
                  const { origin, destination } = parsed.payload;
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
   * Cargar marcadores de la API una sola vez al montar el componente.
   */
  useEffect(() => {
    const fetchMarkers = async () => {
      try {
        const response = await fetch(
          'https://mzl6xsrh26.execute-api.us-east-1.amazonaws.com/dev/place/all'
        );
        const data = await response.json();
        const newMarkers = mapAPIToMarkers(data);

        syncMarkersWithMap([], newMarkers);
        setMarkers(newMarkers);
      } catch (error) {
        console.error('Error fetching markers:', error);
      }
    };

    fetchMarkers();
    // Eliminamos el setInterval para evitar llamadas periódicas
  }, [syncMarkersWithMap]);

  /**
   * Sincronizar marcadores antiguos con nuevos, sin redibujar el mapa.
   */
  const syncMarkersWithMap = useCallback(
    (oldMarkers: MarkerData[], newMarkers: MarkerData[]) => {
      const newSet = new Set(newMarkers.map((m) => m.id));
      const oldSet = new Set(oldMarkers.map((m) => m.id));

      const addedMarkers = newMarkers.filter((m) => !oldSet.has(m.id));
      const removedMarkers = oldMarkers.filter((m) => !newSet.has(m.id));

      // Agregar
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

      // Eliminar
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
   * Handle Mensaje desde WebView (clic en el marcador, etc).
   */
  const handleMessage = useCallback((event: WebViewMessageEvent) => {
    try {
      const markerData: MarkerData = JSON.parse(event.nativeEvent.data);
      //console.log('place_id (si está disponible):', markerData.place);

      setSelectedMarker(markerData);
      setModalVisible(true);
    } catch (error) {
      console.error('Error parsing marker data:', error);
      Alert.alert('Error', 'Ocurrió un error al procesar la información del marcador.');
    }
  }, []);

  /**
   * Mostrar ruta entre userLocation y pin seleccionado
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
   * Manejar la actualización de un marcador (snake_case).
   */
  const handleUpdateMarker = useCallback(async () => {
    if (!selectedMarker || !selectedMarker.place) {
      Alert.alert('Error', 'No se cuenta con place_id para este pin.');
      return;
    }

    const payload: any = {};

    // Latitud
    if (
      editData.lat !== undefined &&
      editData.lat !== '' &&
      editData.lat !== selectedMarker.lat.toString()
    ) {
      payload.latitude = parseFloat(editData.lat);
    }

    // Longitud
    if (
      editData.lng !== undefined &&
      editData.lng !== '' &&
      editData.lng !== selectedMarker.lng.toString()
    ) {
      payload.longitude = parseFloat(editData.lng);
    }

    // Nivel de Contaminación
    if (
      editData.contaminationLevel !== undefined &&
      editData.contaminationLevel !== 'Seleccionar...' &&
      editData.contaminationLevel !== selectedMarker.contaminationLevel
    ) {
      // "Alto", "Medio", "Bajo" => snake_case "pollution_level"
      payload.pollution_level = editData.contaminationLevel;
    }

    // Nivel de Plástico
    if (
      editData.plasticLevel !== undefined &&
      editData.plasticLevel !== 'Seleccionar...' &&
      editData.plasticLevel !== selectedMarker.plasticLevel
    ) {
      payload.plastic_level = editData.plasticLevel;
    }

    // Estado
    if (
      editData.status !== undefined &&
      editData.status !== 'Seleccionar...' &&
      editData.status !== selectedMarker.status
    ) {
      // "Activo" => "active", "Inactivo" => "inactive"
      payload.status = editData.status;
    }

    // Si no hay cambios
    if (Object.keys(payload).length === 0) {
      Alert.alert('Sin cambios', 'No has realizado ningún cambio en el pin.');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(
        `https://mzl6xsrh26.execute-api.us-east-1.amazonaws.com/dev/place/${selectedMarker.place}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        }
      );
      const result = await response.json();

      if (response.ok) {
        Alert.alert('Éxito', result.message || 'Pin actualizado exitosamente.');

        // Actualizar local
        const updatedMarker: MarkerData = {
          ...selectedMarker,
          lat: payload.latitude ?? selectedMarker.lat,
          lng: payload.longitude ?? selectedMarker.lng,
          contaminationLevel:
            payload.pollution_level ?? selectedMarker.contaminationLevel,
          plasticLevel:
            payload.plastic_level ?? selectedMarker.plasticLevel,
          status: payload.status ?? selectedMarker.status,
        };

        setMarkers((prev) =>
          prev.map((m) => (m.id === updatedMarker.id ? updatedMarker : m))
        );

        // Sincronizar con mapa
        const updateScript = `
          (function() {
            var message = {
              type: 'UPDATE_MARKER',
              payload: ${JSON.stringify(updatedMarker)}
            };
            document.dispatchEvent(new MessageEvent('message', { data: JSON.stringify(message) }));
          })();
        `;
        webViewRef.current?.injectJavaScript(updateScript);

        setIsEditing(false);
      } else {
        Alert.alert('Error', result.message || 'Ocurrió un error al actualizar el pin.');
      }
    } catch (error) {
      console.error('Error al actualizar el pin:', error);
      Alert.alert('Error', 'Ocurrió un error al actualizar el pin.');
    } finally {
      setIsLoading(false);
    }
  }, [selectedMarker, editData]);

  /**
   * Manejar cambios en la edición
   */
  const handleEditChange = useCallback((field: keyof MarkerData, value: string) => {
    setEditData((prev) => ({
      ...prev,
      [field]: value,
    }));
  }, []);

  /**
   * Manejar la eliminación de un marcador
   */
  const handleDeleteMarker = useCallback(() => {
    if (!selectedMarker || !selectedMarker.place) {
      Alert.alert('Error', 'No se cuenta con place_id para este pin.');
      return;
    }

    Alert.alert(
      'Confirmar Eliminación',
      '¿Estás seguro de que deseas eliminar este pin?',
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await fetch(
                `https://mzl6xsrh26.execute-api.us-east-1.amazonaws.com/dev/place/${selectedMarker.place}`,
                {
                  method: 'DELETE',
                }
              );

              if (response.ok) {
                Alert.alert('Éxito', 'Pin eliminado correctamente.');
                // WebSocket manejará la eliminación en tiempo real
                setModalVisible(false);
                setSelectedMarker(null);
              } else {
                const result = await response.json();
                Alert.alert('Error', result.message || 'No se pudo eliminar el pin.');
              }
            } catch (error) {
              console.error('Error al eliminar el pin:', error);
              Alert.alert('Error', 'Ocurrió un error al eliminar el pin.');
            }
          },
        },
      ],
      { cancelable: true }
    );
  }, [selectedMarker]);

  return (
    <View style={styles.pinsContainer}>
      <WebView
        ref={webViewRef}
        originWhitelist={['*']}
        source={{
          html: useMemo(
            () =>
              generateBaseHTML(
                mapCenter
              ),
            [generateBaseHTML, mapCenter]
          ),
        }}
        style={styles.webview}
        onMessage={handleMessage}
      />

      {/* Modal con la info y edición del marcador */}
      <Modal
        animationType="slide"
        transparent
        visible={!!selectedMarker && modalVisible}
        onRequestClose={() => {
          setModalVisible(false);
          setIsEditing(false);
        }}
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

              {/* Botones */}
              {!isEditing ? (
                <>
                  {/* Botón Editar Pin */}
                  <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: '#FFD700' }]}
                    onPress={() => {
                      setIsEditing(true);
                      // Rellenar editData con valores actuales
                      setEditData({
                        lat: selectedMarker?.lat.toString(),
                        lng: selectedMarker?.lng.toString(),
                        contaminationLevel: selectedMarker?.contaminationLevel
                          ? selectedMarker.contaminationLevel
                          : 'Seleccionar...',
                        plasticLevel: selectedMarker?.plasticLevel
                          ? selectedMarker.plasticLevel
                          : 'Seleccionar...',
                        status: selectedMarker?.status
                          ? selectedMarker.status
                          : 'Seleccionar...',
                      });
                    }}
                  >
                    <Icon name="edit" size={20} color="white" style={{ marginRight: 5 }} />
                    <Text style={styles.actionButtonText}>Editar Pin</Text>
                  </TouchableOpacity>

                  {/* Botón Iniciar Navegación */}
                  <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: '#34C759' }]}
                    onPress={() => {
                      if (!userLocation || !selectedMarker) {
                        Alert.alert('Ubicación desconocida', 'No se pudo obtener tu ubicación.');
                        return;
                      }
                      showRoute(userLocation, {
                        lat: selectedMarker.lat,
                        lng: selectedMarker.lng,
                      });
                      setModalVisible(false);
                    }}
                  >
                    <Icon name="navigation" size={20} color="white" style={{ marginRight: 5 }} />
                    <Text style={styles.actionButtonText}>Iniciar Navegación</Text>
                  </TouchableOpacity>

                  {/* Botón Eliminar Pin */}
                  <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: '#FF3B30' }]}
                    onPress={handleDeleteMarker}
                  >
                    <Icon name="delete" size={20} color="white" style={{ marginRight: 5 }} />
                    <Text style={styles.actionButtonText}>Eliminar Pin</Text>
                  </TouchableOpacity>

                  {/* Botón Cerrar */}
                  <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: '#8E8E93' }]}
                    onPress={() => {
                      setModalVisible(false);
                      setIsEditing(false);
                    }}
                  >
                    <Icon name="close" size={20} color="white" style={{ marginRight: 5 }} />
                    <Text style={styles.actionButtonText}>Cerrar</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <Text style={styles.editTitle}>Editar Pin</Text>

                  {/* Lat */}
                  <TextInput
                    style={styles.input}
                    placeholder="Latitud"
                    keyboardType="numeric"
                    value={editData.lat}
                    onChangeText={(txt) => handleEditChange('lat', txt)}
                  />

                  {/* Lng */}
                  <TextInput
                    style={styles.input}
                    placeholder="Longitud"
                    keyboardType="numeric"
                    value={editData.lng}
                    onChangeText={(txt) => handleEditChange('lng', txt)}
                  />

                  {/* Picker para Nivel de Contaminación */}
                  <Text style={{ marginTop: 10, fontWeight: 'bold' }}>Nivel de Contaminación</Text>
                  <View style={styles.pickerContainer}>
                    <Picker
                      selectedValue={editData.contaminationLevel}
                      onValueChange={(val) => handleEditChange('contaminationLevel', val as string)}
                    >
                      <Picker.Item label="Seleccionar..." value="Seleccionar..." />
                      <Picker.Item label="Alto" value="alto" />
                      <Picker.Item label="Medio" value="medio" />
                      <Picker.Item label="Bajo" value="bajo" />
                    </Picker>
                  </View>

                  {/* Picker para Nivel de Plástico */}
                  <Text style={{ marginTop: 10, fontWeight: 'bold' }}>Nivel de Plástico</Text>
                  <View style={styles.pickerContainer}>
                    <Picker
                      selectedValue={editData.plasticLevel}
                      onValueChange={(val) => handleEditChange('plasticLevel', val as string)}
                    >
                      <Picker.Item label="Seleccionar..." value="Seleccionar..." />
                      <Picker.Item label="Alto" value="alto" />
                      <Picker.Item label="Medio" value="medio" />
                      <Picker.Item label="Bajo" value="bajo" />
                    </Picker>
                  </View>

                  {/* Picker para Estado */}
                  <Text style={{ marginTop: 10, fontWeight: 'bold' }}>Estado</Text>
                  <View style={styles.pickerContainer}>
                    <Picker
                      selectedValue={editData.status}
                      onValueChange={(val) => handleEditChange('status', val as string)}
                    >
                      <Picker.Item label="Seleccionar..." value="Seleccionar..." />
                      <Picker.Item label="Activo" value="active" />
                      <Picker.Item label="Inactivo" value="inactive" />
                    </Picker>
                  </View>

                  {/* Botón Guardar Cambios */}
                  <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: '#007AFF' }]}
                    onPress={handleUpdateMarker}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <>
                        <Icon name="save" size={20} color="white" style={{ marginRight: 5 }} />
                        <Text style={styles.actionButtonText}>Guardar Cambios</Text>
                      </>
                    )}
                  </TouchableOpacity>

                  {/* Botón Cancelar */}
                  <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: '#FF3B30' }]}
                    onPress={() => {
                      setIsEditing(false);
                      setEditData({});
                    }}
                    disabled={isLoading}
                  >
                    <Icon name="close" size={20} color="white" style={{ marginRight: 5 }} />
                    <Text style={styles.actionButtonText}>Cancelar</Text>
                  </TouchableOpacity>
                </>
              )}
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
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 5,
    marginTop: 10,
  },
  actionButtonText: {
    color: 'white',
    fontSize: 16,
  },
  editTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginVertical: 10,
    textAlign: 'center',
  },
  input: {
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 5,
    height: 40,
    marginBottom: 10,
    paddingHorizontal: 10,
    justifyContent: 'center',
  },
  pickerContainer: {
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 5,
    marginBottom: 10,
    overflow: 'hidden',
  },
});
