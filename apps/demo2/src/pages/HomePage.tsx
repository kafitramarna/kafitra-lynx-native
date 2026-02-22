/**
 * HomePage
 *
 * Protected page – reads session from AsyncStorage on mount.
 * Redirects to / if no session found (handles back-button logout edge case).
 * Allows navigation to /profile and logout.
 */
import { useEffect, useState } from '@lynx-js/react';
import { useNavigate } from 'react-router';

import AsyncStorage from '@kafitra/lynx-async-storage';

interface Session {
  username: string;
  loggedInAt: number;
}

export function HomePage() {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    AsyncStorage.getItem('session').then((raw) => {
      if (!raw) {
        navigate('/', { replace: true });
        return;
      }
      setSession(JSON.parse(raw) as Session);
    });
  }, []);

  function handleLogout() {
    AsyncStorage.removeItem('session').then(() => {
      navigate('/', { replace: true });
    });
  }

  if (!session) {
    return (
      <view className="Page Page--center">
        <view className="Background" />
        <text className="LoadingText">Memuat...</text>
      </view>
    );
  }

  const loginDate = new Date(session.loggedInAt).toLocaleString('id-ID');

  return (
    <view className="Page">
      <view className="Background" />

      <view className="PageContent">
        {/* Welcome card */}
        <view className="Card">
          <text className="CardLabel">Beranda</text>
          <text className="WelcomeText">Halo, {session.username}! 👋</text>
          <text className="SubText">Login sejak {loginDate}</text>
        </view>

        {/* Menu */}
        <view className="MenuList">
          <view className="MenuItem" bindtap={() => navigate('/profile')}>
            <text className="MenuItemText">👤 Profil Saya</text>
            <text className="MenuArrow">›</text>
          </view>
          <view className="MenuItemDivider" />
          <view className="MenuItem" bindtap={() => navigate('/device-info')}>
            <text className="MenuItemText">📱 Info Perangkat</text>
            <text className="MenuArrow">›</text>
          </view>
        </view>

        <view style={{ flex: 1 }} />

        {/* Logout */}
        <view className="DangerButton" bindtap={handleLogout}>
          <text className="DangerButtonText">Keluar</text>
        </view>
      </view>
    </view>
  );
}
