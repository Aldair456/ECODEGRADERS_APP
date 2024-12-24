import React, { useState } from 'react';
import { View, TextInput, StyleSheet, Button, Modal, Image, TouchableOpacity, Text, ScrollView } from 'react-native';
import { WebView } from 'react-native-webview';
import { FontAwesome5, MaterialIcons } from '@expo/vector-icons';

export default function LugaresAfectadosComponent() {
  const [searchQuery, setSearchQuery] = useState('');
  const [mapCenter, setMapCenter] = useState([-77.0681, -11.9159]);
  const [isModalVisible, setModalVisible] = useState(false);
  const [selectedInfo, setSelectedInfo] = useState({ images: [], contaminationLevel: '', plasticLevel: '', status: '' });

  // Información para cada pin
  const pinData = {
    pin1: {
      images: ['https://cooperaccion.org.pe/wp-content/uploads/2024/04/fa8a7ecb-2a7e-40c5-b7a6-32c522c3c510.webp', 'https://larepublica.cronosmedia.glr.pe/original/2023/07/15/64b2e1bf7049c37fa2267037.jpg'],
      contaminationLevel: 'Alto',
      plasticLevel: 'Elevado',
      status: 'Por Atender',
    },
    pin2: {
      images: ['https://www.actualidadambiental.pe/wp-content/uploads/2020/02/contaminacion-rio-chillon-el-comercio.jpg', 'https://imgmedia.larepublica.pe/640x371/larepublica/original/2022/06/16/62ab4584acce01340a3f82a3.webp'],
      contaminationLevel: 'Medio',
      plasticLevel: 'Moderado',
      status: 'En Progreso',
    },
    pin3: {
      images: ['https://elcomercio.pe/resizer/cEDAsWV7QZDCLhv4Q1dzy0dFZKY=/620x0/smart/filters:format(jpeg):quality(75)/arc-anglerfish-arc2-prod-elcomercio.s3.amazonaws.com/public/XC6OAUF5WNBOZJKVTGSUDGCD4Q.JPG', 'https://images.controlshift.app/rails/active_storage/representations/proxy/eyJfcmFpbHMiOnsiZGF0YSI6MTU5OTksInB1ciI6ImJsb2JfaWQifX0=--58ba8981a7acda941e526588e9165146c311abc9/eyJfcmFpbHMiOnsiZGF0YSI6eyJmb3JtYXQiOiJqcGciLCJzdHJpcCI6dHJ1ZSwicmVzaXplX3RvX2ZpdCI6WzcyNSwzMDBdfSwicHVyIjoidmFyaWF0aW9uIn19--05a588c1e142679bab22bb471238ab7a02053981/Rio_Chillon_3jpg.jpg'],
      contaminationLevel: 'Bajo',
      plasticLevel: 'Mínimo',
      status: 'En Progreso',
    },
    pin4: {
      images: ['https://elcomercio.pe/resizer/U1Yqnd-qhW1nW2VJD2DmCYnNKBk=/620x0/smart/filters:format(jpeg):quality(75)/arc-anglerfish-arc2-prod-elcomercio.s3.amazonaws.com/public/7APSIJGHSBBT5EBOKXIFMYBI6Y.JPG', 'https://puntoseguido.upc.edu.pe/wp-content/uploads/2023/05/FOTO-4-1024x768.jpg'],
      contaminationLevel: 'Medio',
      plasticLevel: 'Alto',
      status: 'Por Atender',
    },
  };

  // Función para abrir el modal con la información seleccionada
  const openModalWithInfo = (pinId) => {
    setSelectedInfo(pinData[pinId]);
    setModalVisible(true);
  };

  const mapHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>MapLibre GL JS</title>
      <meta name="viewport" content="initial-scale=1,maximum-scale=1,user-scalable=no">
      <script src="https://unpkg.com/maplibre-gl@1.15.2/dist/maplibre-gl.js"></script>
      <link href="https://unpkg.com/maplibre-gl@1.15.2/dist/maplibre-gl.css" rel="stylesheet" />
      <style>
        body, html { margin: 0; padding: 0; height: 100%; width: 100%; }
        #map { position: absolute; top: 0; bottom: 0; width: 100%; }
      </style>
    </head>
    <body>
      <div id="map"></div>
      <div id="legend" style="position: absolute; bottom: 10px; left: 10px; background: white; padding: 10px; border-radius: 5px; box-shadow: 0px 0px 5px rgba(0,0,0,0.5);">
        <h4>Historial de Colores</h4>
        <div style="display: flex; align-items: center; margin-bottom: 5px;">
          <div style="width: 15px; height: 15px; background-color: #004d00; margin-right: 5px;"></div>
          <span>Verde Oscuro: Por Atender</span>
        </div>
        <div style="display: flex; align-items: center;">
          <div style="width: 15px; height: 15px; background-color: #66bb6a; margin-right: 5px;"></div>
          <span>Verde Claro: En Progreso</span>
        </div>
      </div>
      <script>
        const map = new maplibregl.Map({
          container: 'map',
          style: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
          center: [${mapCenter[0]}, ${mapCenter[1]}],
          zoom: 14
        });
        const puntosVerdes = [
          { coordinates: [ -77.069256, -11.908821], id: 'pin1', status: 'Por Atender' },
          { coordinates: [-77.071259, -11.912741], id: 'pin2' },
          { coordinates: [ -77.072292,-11.915988], id: 'pin3',status: 'Por Atender' },
          { coordinates: [-77.067722, -11.908178], id: 'pin4' }
        ];

        puntosVerdes.forEach(({ coordinates, id, status }) => {
          const color = status === 'Por Atender' ? '#004d00' : '#66bb6a';
          const marker = new maplibregl.Marker({ color: color })
            .setLngLat(coordinates)
            .addTo(map);

          marker.getElement().addEventListener('click', () => {
            window.ReactNativeWebView.postMessage(id);
          });
        });
      </script>
    </body>
    </html>
  `;

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.inputContainer}>
        <TextInput
          placeholder="Ingrese zona de interés"
          style={styles.textInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        <Button title="Buscar" color="#00796b" onPress={() => setMapCenter([-77.0681, -11.9159])} />
      </View>

      {/* Mapa con WebView */}
      <View style={styles.mapContainer}>
        <WebView
          originWhitelist={['*']}
          source={{ html: mapHtml }}
          style={styles.map}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          startInLoadingState={true}
          onMessage={(event) => openModalWithInfo(event.nativeEvent.data)}
        />
      </View>

      {/* Modal para mostrar las imágenes e información */}
      <Modal
        visible={isModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <Text style={styles.modalTitle}>Información del Lugar</Text>

          {/* Contenedor de Imágenes en Vertical */}
          <ScrollView contentContainerStyle={styles.imagesContainer}>
            {selectedInfo.images.map((imageUri, index) => (
              <Image key={index} source={{ uri: imageUri }} style={styles.modalImage} />
            ))}
          </ScrollView>

          {/* Información de Contaminación y Plástico */}
          <View style={styles.infoContainer}>
            <View style={styles.infoRow}>
              <MaterialIcons name="warning" size={24} color="#FF5722" />
              <Text style={styles.infoText}>Nivel de Contaminación: {selectedInfo.contaminationLevel}</Text>
            </View>
            <View style={styles.infoRow}>
              <FontAwesome5 name="recycle" size={24} color="#4CAF50" />
              <Text style={styles.infoText}>Nivel de Plástico: {selectedInfo.plasticLevel}</Text>
            </View>
            <View style={styles.infoRow}>
              <FontAwesome5 name="clock" size={24} color={selectedInfo.status === 'Por Atender' ? '#004d00' : '#66bb6a'} />
              <Text style={styles.infoText}>Estado: {selectedInfo.status}</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.closeButton} onPress={() => setModalVisible(false)}>
            <Text style={styles.closeButtonText}>Cerrar</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  inputContainer: {
    padding: 20,
    backgroundColor: '#EAF7F8',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#70B7C7',
    borderRadius: 10,
    padding: 10,
    fontSize: 16,
    flex: 1,
    marginRight: 10,
  },
  mapContainer: {
    flex: 1,
    margin: 20,
    borderRadius: 10,
    overflow: 'hidden',
  },
  map: {
    width: '100%',
    height: '100%',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 20,
  },
  imagesContainer: {
    flexDirection: 'column',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalImage: {
    width: 250,
    height: 250,
    marginVertical: 10,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: '#00796b',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  infoContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    padding: 15,
    borderRadius: 10,
    width: '90%',
    alignItems: 'center',
    marginBottom: 20,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  infoText: {
    fontSize: 18,
    color: '#333',
    fontWeight: '500',
    marginLeft: 10,
  },
  closeButton: {
    backgroundColor: '#70B7C7',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  closeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
