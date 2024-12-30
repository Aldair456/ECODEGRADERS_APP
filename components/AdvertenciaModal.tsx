import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  GestureResponderEvent,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Obtener dimensiones de la pantalla para adaptar el tamaño del modal
const { width, height } = Dimensions.get('window');

// Definir los tipos de las props que recibirá el componente
interface AdvertenciaModalProps {
  visible: boolean;
  onAcknowledge: (event: GestureResponderEvent) => void;
}

const AdvertenciaModal: React.FC<AdvertenciaModalProps> = ({
  visible,
  onAcknowledge,
}) => {
  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={() => {
        // Opcional: manejar el cierre del modal con el botón de retroceso en Android
      }}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <Ionicons name="warning" size={50} color="#FFA500" style={styles.icon} />
          <Text style={styles.title}>¡Advertencia!</Text>
          <Text style={styles.message}>
            Las coordenadas insertadas se mostrarán a los Usuarios. Por favor, colócalas adecuadamente y verifica las imágenes antes de proceder.
          </Text>
          <TouchableOpacity style={styles.button} onPress={onAcknowledge}>
            <Text style={styles.buttonText}>Entendido</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)', // Fondo semi-transparente
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: width * 0.85, // 85% del ancho de la pantalla
    backgroundColor: '#fff8dc', // Color de fondo del modal
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    elevation: 5, // Sombra para Android
    shadowColor: '#000', // Sombra para iOS
    shadowOffset: { width: 0, height: 2 }, // Sombra para iOS
    shadowOpacity: 0.25, // Sombra para iOS
    shadowRadius: 3.84, // Sombra para iOS
  },
  icon: {
    marginBottom: 10,
  },
  title: {
    fontSize: 24, // Tamaño de fuente corregido
    fontWeight: 'bold',
    color: '#FF8C00',
    marginBottom: 15,
    textAlign: 'center',
  },
  message: {
    fontSize: 16, // Tamaño de fuente corregido
    color: '#333',
    textAlign: 'center',
    marginBottom: 25,
  },
  button: {
    backgroundColor: '#FF8C00',
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16, // Tamaño de fuente corregido
    fontWeight: 'bold',
  },
});

export default AdvertenciaModal;
