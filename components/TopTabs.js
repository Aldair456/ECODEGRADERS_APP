import React, { useState, useEffect } from 'react';
import { createDrawerNavigator } from '@react-navigation/drawer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { decode as atob } from 'base-64';

import ComoLlegarComponent from './ComoLlegar';
import CentrosAcopioComponent from './CentrosAcopioComponent';
import MapComponent from './MapComponent';
import InsertarCoordenadasComponent from './InsertarCoordenadasComponent';
import PerfilComponent from './PerfilComponent'; // Importa el componente de Perfil

const Drawer = createDrawerNavigator();

export default function DrawerNavigator({ onLogout }) {
  // Estado para almacenar coordenadas
  const [markerCoordinates, setMarkerCoordinates] = useState([]);
  // Estado para almacenar el rol decodificado del JWT
  const [role, setRole] = useState(null);

  // Función para decodificar el JWT manualmente
  const decodeJWT = (token) => {
    try {
      const payload = token.split('.')[1];
      const decodedPayload = JSON.parse(atob(payload));
      return decodedPayload;
    } catch (error) {
      console.error('Error al decodificar el token:', error);
      return null;
    }
  };

  useEffect(() => {
    const fetchRole = async () => {
      try {
        const token = await AsyncStorage.getItem('userToken');
        if (token) {
          const decodedToken = decodeJWT(token);
          if (decodedToken && decodedToken.role) {
            setRole(decodedToken.role);
          } else {
            setRole('USER'); // Si no se encuentra el rol, asumir 'USER'
          }
        } else {
          setRole('USER'); // Si no hay token, asumir 'USER'
        }
      } catch (error) {
        console.error('Error al obtener el token desde AsyncStorage:', error);
        setRole('USER');
      }
    };

    fetchRole();
  }, []);

  const handleInsertCoordinates = (newCoordinate) => {
    setMarkerCoordinates((prevCoordinates) => [...prevCoordinates, newCoordinate]);
  };

  // Si aún no se ha determinado el rol, no renderizamos nada
  if (role === null) {
    return null;
  }

  return (
    <Drawer.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: '#70B7C7',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
        drawerStyle: {
          backgroundColor: '#f9f9f9',
          width: 240,
        },
        drawerActiveTintColor: '#70B7C7',
        drawerInactiveTintColor: 'gray',
      }}
    >
      <Drawer.Screen name="Perfil">
        {() => <PerfilComponent onLogout={onLogout} />}
      </Drawer.Screen>
      <Drawer.Screen name="Conócenos" component={ComoLlegarComponent} />
      <Drawer.Screen name="Centros de Acopio" component={CentrosAcopioComponent} />
      <Drawer.Screen name="Lugares Afectados">
        {() => <MapComponent markerCoordinates={markerCoordinates} />}
      </Drawer.Screen>

      {/* Mostrar Insertar Coordenadas solo si el rol es administrador */}
      {role === 'administrador' && (
        <Drawer.Screen name="Insertar Coordenadas">
          {() => (
            <InsertarCoordenadasComponent
              onInsert={(newCoordinate) => {
                handleInsertCoordinates(newCoordinate);
                console.log('Nueva coordenada:', newCoordinate);
              }}
            />
          )}
        </Drawer.Screen>
      )}
    </Drawer.Navigator>
  );
}
