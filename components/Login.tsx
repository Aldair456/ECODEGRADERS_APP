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
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage'; // Importar AsyncStorage para guardar el token

interface LoginProps {
  onNavigate: () => void;
  onLogin: () => void; // Se agrega para notificar inicio de sesión exitoso
}

const Login: React.FC<LoginProps> = ({ onNavigate, onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false); // Estado para mostrar/ocultar contraseña
  const [errorMessage, setErrorMessage] = useState<string | null>(null); // Estado para el mensaje de error

  const handleLogin = async () => {
    try {
      const requestBody = {
        email: email,
        password: password,
      };

      const response = await axios.post(
        'https://plaqmrxx8g.execute-api.us-east-1.amazonaws.com/dev/user/login',
        requestBody,
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      console.log('Respuesta del servidor:', response.data);

      if (response.status === 200) {
        const { token } = response.data;

        // Guardar el token en AsyncStorage
        await AsyncStorage.setItem('userToken', token);
        console.log('JWT guardado en AsyncStorage:', token);

        setErrorMessage(null); // Limpiar mensaje de error
        //Alert.alert('Inicio de Sesión Exitoso', 'Bienvenido a la aplicación');
        onLogin(); // Notificar al componente principal que el login fue exitoso
      } else {
        handleErrorMessage('Correo o contraseña incorrecta');
      }
    } catch (error: any) {
      console.error('Error al iniciar sesión:', error.response?.data || error.message);
      handleErrorMessage('Correo o contraseña incorrecta');
    }
  };

  const handleErrorMessage = (message: string) => {
    setErrorMessage(message);
    // Configurar el temporizador para eliminar el mensaje después de 5 segundos
    setTimeout(() => {
      setErrorMessage(null);
    }, 5000);
  };

  return (
    <View style={styles.container}>
      {/* Fondo decorativo con círculo */}
      <View style={styles.circleLarge} />

      {/* Imagen encima del título */}
      <Image
        source={require('../assets/images/logo_login.png')} // Reemplaza con tu imagen
        style={styles.image}
      />

      {/* Título */}
      <Text style={styles.title}>Iniciar Sesión</Text>

      {/* Inputs */}
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

      {/* Mensaje de error */}
      {errorMessage && (
        <Text style={styles.errorText}>{errorMessage}</Text>
      )}

      {/* Botón para iniciar sesión */}
      <TouchableOpacity style={styles.button} onPress={handleLogin}>
        <Text style={styles.buttonText}>Iniciar Sesión</Text>
      </TouchableOpacity>

      {/* Texto para navegar al registro */}
      <TouchableOpacity onPress={onNavigate}>
        <Text style={styles.text}>
          ¿No tienes cuenta? <Text style={styles.textHighlight}>Regístrate</Text>
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
    padding: 3,
    marginBottom: 5,
  },
  inputPassword: {
    flex: 1,
    fontSize: 16,
  },
  errorText: {
    color: 'red',
    fontSize: 14,
    marginBottom: 10,
    textAlign: 'left',
    width: 300,
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

export default Login;
