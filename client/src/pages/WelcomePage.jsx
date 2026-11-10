import React from 'react';
import { useNavigate } from 'react-router-dom';
import SplashScreen from '../components/auth/SplashScreen';

export default function WelcomePage() {
  const navigate = useNavigate();

  return (
    <SplashScreen
      onNavigateLogin={() => navigate('/login')}
      onNavigateRegister={() => navigate('/register')}
    />
  );
}

