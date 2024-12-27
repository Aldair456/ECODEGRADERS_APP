import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import SplashScreen from './components/SplashScreen'; // Importa SplashScreen
import AuthScreen from './components/AuthScreen'; // Importa AuthScreen
import DrawerNavigator from './components/TopTabs'; // Importa el DrawerNavigator
import { NavigationContainer } from '@react-navigation/native'; // Asegura un solo NavigationContainer

export default function HomeScreen() {
  const [isLoading, setIsLoading] = useState(true); // Estado para controlar el Splash Screen
  const [isAuthenticated, setIsAuthenticated] = useState(false); // Estado para autenticación
  const [isVisitor, setIsVisitor] = useState(false); // Estado para la opción de visitante

  useEffect(() => {
    // Simula una carga inicial de 3 segundos
    const loadApp = async () => {
      await new Promise((resolve) => setTimeout(resolve, 3000)); // Tiempo de carga
      setIsLoading(false); // Oculta el Splash Screen
    };

    loadApp();
  }, []);

  // 1. Mostrar el Splash Screen mientras carga la app
  if (isLoading) {
    return <SplashScreen />;
  }

  // 2. Mostrar la pantalla de autenticación si el usuario no está autenticado ni es visitante
  if (!isAuthenticated && !isVisitor) {
    return (
      <AuthScreen
        onLogin={() => setIsAuthenticated(true)} // Manejar autenticación exitosa
        onRegister={() => setIsAuthenticated(true)} // Manejar registro exitoso
        onVisitor={() => setIsVisitor(true)} // Manejar acceso como visitante
      />
    );
  }

  return (
    <NavigationContainer>
      <DrawerNavigator onLogout={() => setIsAuthenticated(false)} />
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
