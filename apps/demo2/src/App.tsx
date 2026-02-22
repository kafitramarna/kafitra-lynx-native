import { useEffect, useState } from '@lynx-js/react';
import { MemoryRouter, Routes, Route } from 'react-router';

import './App.css';

import AsyncStorage from '@kafitra/lynx-async-storage';
import { CameraPage } from './pages/CameraPage';
import { LoginPage } from './pages/LoginPage';
import { HomePage } from './pages/HomePage';
import { ProfilePage } from './pages/ProfilePage';
import { DeviceInfoPage } from './pages/DeviceInfoPage';

export function App() {
  const [initialRoute, setInitialRoute] = useState<string | null>(null);

  useEffect(() => {
    AsyncStorage.getItem('session').then((raw) => {
      setInitialRoute(raw ? '/home' : '/');
    });
  }, []);

  if (!initialRoute) {
    return (
      <view className="Page Page--center">
        <view className="Background" />
        <text className="LoadingText">Memuat...</text>
      </view>
    );
  }

  return (
    <MemoryRouter initialEntries={[initialRoute]} initialIndex={0}>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/home" element={<HomePage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/device-info" element={<DeviceInfoPage />} />
        <Route path="/camera" element={<CameraPage />} />
      </Routes>
    </MemoryRouter>
  );
}
