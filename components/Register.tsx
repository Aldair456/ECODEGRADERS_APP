import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons'; // Aregissegúrate de tener instalado @expo/vector-icons
import axios from 'axios';

interface RegisterProps {
  onNavigate: () => void; // Prop para manejar la navegación a otra pantalla
}

const Register: React.FC<RegisterProps> = ({ onNavigate }) => {
  const [name, setName] = useState<string>(''); // Agregando el tipo explícito <string>
  const [lastName, setLastName] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [district, setDistrict] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false); // Estado para mostrar/ocultar contraseña

  // Función para manejar el registro
  const handleRegister = async (): Promise<void> => {
    try {
      const requestBody = {
        data: {
          name,
          last_name: lastName,
          phone,
          district,
        },
        email,
        password,
      };

      const response = await axios.post(
        'https://plaqmrxx8g.execute-api.us-east-1.amazonaws.com/dev/user/register',
        requestBody,
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      Alert.alert('Registro Exitoso', 'Usuario registrado correctamente');
      console.log(response.data);
    } catch (error) {
      console.error('Error al registrar usuario:', error);
      Alert.alert('Error', 'No se pudo registrar el usuario. Inténtalo de nuevo.');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.circleLarge} />

      <Image
        source={require('../assets/images/register_imagen.png')}
        style={styles.image}
      />

      <Text style={styles.title}>Registrarse</Text>

      {/* Inputs */}
      <TextInput
        placeholder="Nombre Completo"
        style={styles.input}
        value={name}
        onChangeText={setName}
        placeholderTextColor="#999"
      />
      <TextInput
        placeholder="Apellido"
        style={styles.input}
        value={lastName}
        onChangeText={setLastName}
        placeholderTextColor="#999"
      />
      <TextInput
        placeholder="Teléfono"
        style={styles.input}
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
        placeholderTextColor="#999"
      />
      <TextInput
        placeholder="Distrito"
        style={styles.input}
        value={district}
        onChangeText={setDistrict}
        placeholderTextColor="#999"
      />
      <TextInput
        placeholder="Correo Electrónico"
        style={styles.input}
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        placeholderTextColor="#999"
      />

      {/* Input de contraseña con funcionalidad de mostrar/ocultar */}
      <View style={styles.passwordContainer}>
        <TextInput
          placeholder="Contraseña"
          style={styles.inputPassword}
          secureTextEntry={!showPassword}
          value={password}
          onChangeText={setPassword}
          placeholderTextColor="#999"
        />
        <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
          <Ionicons
            name={showPassword ? 'eye-off' : 'eye'}
            size={24}
            color="#999"
          />
        </TouchableOpacity>
      </View>

      {/* Botón para registrarse */}
      <TouchableOpacity style={styles.button} onPress={handleRegister}>
        <Text style={styles.buttonText}>Crear Cuenta</Text>
      </TouchableOpacity>

      {/* Texto para navegar al inicio de sesión */}
      <TouchableOpacity onPress={onNavigate}>
        <Text style={styles.text}>
          ¿Ya tienes cuenta?{' '}
          <Text style={styles.textHighlight}>Inicia Sesión</Text>
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleLarge: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: '#4CAF50',
    top: -100,
    right: -100,
  },
  image: {
    width: 120,
    height: 120,
    marginBottom: 20,
  },
  title: {
    fontSize: 30,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
  },
  input: {
    width: 300,
    padding: 12,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#CCC',
    borderRadius: 10,
    backgroundColor: '#F9F9F9',
  },
  passwordContainer: {
    width: 300,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#CCC',
    borderRadius: 10,
    backgroundColor: '#F9F9F9',
    paddingHorizontal: 10, // Ajustado para reducir el ancho visual
    paddingVertical: 8, // Ajustado para reducir la altura visual
    marginBottom: 15,
  },
  inputPassword: {
    flex: 1,
    fontSize: 16,
    padding: 0, // Elimina padding adicional del TextInput
  },
  button: {
    backgroundColor: '#4CAF50',
    padding: 12,
    borderRadius: 10,
    width: 300,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  text: {
    marginTop: 15,
    color: '#555',
    fontSize: 14,
  },
  textHighlight: {
    color: '#4CAF50',
    fontWeight: 'bold',
  },
});

export default Register;
