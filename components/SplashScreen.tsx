import React, { useEffect, useRef } from 'react';
import { View, Image, StyleSheet, Animated, Dimensions } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';

const { width, height } = Dimensions.get('window');

const SplashScreen: React.FC = () => {
  // Valores de animación
  const fadeAnim = useRef(new Animated.Value(0)).current; // Opacidad inicial en 0
  const scaleAnim = useRef(new Animated.Value(0.5)).current; // Escala inicial en 0.5

  useEffect(() => {
    // Inicia las animaciones
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1, // Opacidad final
        duration: 1500,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1, // Escala final
        duration: 1000,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      {/* Fondo superior con onda */}
      <Svg height="20%" width="100%" viewBox="0 0 1440 320" style={styles.topWave}>
        <Path
          fill="#A5D6A7" // Verde claro
          d="M0,224L80,218.7C160,213,320,203,480,192C640,181,800,171,960,170.7C1120,171,1280,181,1360,186.7L1440,192L1440,0L1360,0C1280,0,1120,0,960,0C800,0,640,0,480,0C320,0,160,0,80,0L0,0Z"
        />
      </Svg>

      {/* Círculos degradados centrados */}
      <Animated.View style={[styles.circleContainer, { transform: [{ scale: scaleAnim }] }]}>
        <Svg height={300} width={300}>
          <Circle cx="150" cy="150" r="120" fill="#A5D6A7" opacity="0.2" />
          <Circle cx="150" cy="150" r="90" fill="#A5D6A7" opacity="0.5" />
          <Circle cx="150" cy="150" r="60" fill="#4CAF50" opacity="0.8" />
        </Svg>
      </Animated.View>

      {/* Logo centrado */}
      <Animated.Image
        source={require('../assets/images/logo.png')} // Cambia con la ruta de tu logo
        style={[styles.logo, { transform: [{ scale: scaleAnim }] }]}
      />

      {/* Fondo inferior con onda */}
      <Svg height="20%" width="100%" viewBox="0 0 1440 320" style={styles.bottomWave}>
        <Path
          fill="#A5D6A7" // Verde claro
          d="M0,160L80,165.3C160,171,320,181,480,192C640,203,800,213,960,213.3C1120,213,1280,203,1360,197.3L1440,192L1440,320L1360,320C1280,320,1120,320,960,320C800,320,640,320,480,320C320,320,160,320,80,320L0,320Z"
        />
      </Svg>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF', // Fondo blanco
    justifyContent: 'center',
    alignItems: 'center',
  },
  topWave: {
    position: 'absolute',
    top: 0,
  },
  bottomWave: {
    position: 'absolute',
    bottom: 0,
  },
  circleContainer: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: -1, // Envía los círculos detrás del logo
  },
  logo: {
    width: 250, // Tamaño del logo
    height: 150,
    resizeMode: 'contain',
  },
});

export default SplashScreen;
