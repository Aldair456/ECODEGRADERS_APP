import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage'; // Importa AsyncStorage
import SplashScreen from './components/SplashScreen'; // Importa SplashScreen
import AuthScreen from './components/AuthScreen'; // Importa AuthScreen
import DrawerNavigator from './components/TopTabs'; // Importa el DrawerNavigator
import { NavigationContainer } from '@react-navigation/native'; // Asegura un solo NavigationContainer

export default function HomeScreen() {
  const [isLoading, setIsLoading] = useState(true); // Estado para controlar el Splash Screen
  const [isAuthenticated, setIsAuthenticated] = useState(false); // Estado para autenticación
  const [isVisitor, setIsVisitor] = useState(false); // Estado para la opción de visitante

  useEffect(() => {
    const loadApp = async () => {
      try {
        // Recuperar estados persistidos de AsyncStorage
        const authState = await AsyncStorage.getItem('isAuthenticated');
        const visitorState = await AsyncStorage.getItem('isVisitor');

        // Configurar estados según los valores almacenados
        if (authState === 'true') {
          setIsAuthenticated(true);
        } else if (visitorState === 'true') {
          setIsVisitor(true);
        }
      } catch (error) {
        console.error('Error al recuperar estados persistidos:', error);
      } finally {
        // Ocultar el Splash Screen después de cargar
        setTimeout(() => setIsLoading(false), 3000);
      }
    };

    loadApp();
  }, []);

  // Función para manejar el inicio de sesión
  const handleLogin = async () => {
    setIsAuthenticated(true);
    await AsyncStorage.setItem('isAuthenticated', 'true'); // Guardar estado en AsyncStorage
  };

  // Función para manejar el registro
  const handleRegister = async () => {
    setIsAuthenticated(true);
    await AsyncStorage.setItem('isAuthenticated', 'true'); // Guardar estado en AsyncStorage
  };

  // Función para manejar el acceso como visitante
  const handleVisitor = async () => {
    setIsVisitor(true);
    await AsyncStorage.setItem('isVisitor', 'true'); // Guardar estado en AsyncStorage
  };

  // Función para manejar el cierre de sesión
  const handleLogout = async () => {
    setIsAuthenticated(false);
    setIsVisitor(false);
    await AsyncStorage.removeItem('isAuthenticated'); // Eliminar estado persistido
    await AsyncStorage.removeItem('isVisitor'); // Eliminar estado persistido
  };

  // 1. Mostrar el Splash Screen mientras carga la app
  if (isLoading) {
    return <SplashScreen />;
  }

  // 2. Mostrar la pantalla de autenticación si el usuario no está autenticado ni es visitante
  if (!isAuthenticated && !isVisitor) {
    return (
      <AuthScreen
        onLogin={handleLogin} // Manejar autenticación exitosa
        onRegister={handleRegister} // Manejar registro exitoso
        onVisitor={handleVisitor} // Manejar acceso como visitante
      />
    );
  }

  // 3. Mostrar la interfaz principal si el usuario está autenticado o es visitante
  return (
    <NavigationContainer>
      <DrawerNavigator onLogout={handleLogout} />
    </NavigationContainer>
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
});
