import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import Login from './Login';
import Register from './Register';
import VisitorOption from './VisitorOption';

interface AuthScreenProps {
  onLogin: () => void;
  onRegister: () => void;
  onVisitor: () => void;
}

const AuthScreen: React.FC<AuthScreenProps> = ({ onLogin, onRegister, onVisitor }) => {
  const [isRegister, setIsRegister] = useState(false);

  return (
    <View style={styles.container}>
      {/* Condicional para mostrar Login o Register */}
      {isRegister ? (
        <Register onNavigate={() => setIsRegister(false)} onRegister={onRegister} />
      ) : (
        <Login onNavigate={() => setIsRegister(true)} onLogin={onLogin} />
      )}

      {/* Opción de Visitante */}
      <VisitorOption onVisit={onVisitor} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9F9F9',
    paddingHorizontal: 20,
  },
});

export default AuthScreen;
