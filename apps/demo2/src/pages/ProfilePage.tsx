/**
 * ProfilePage
 *
 * Protected page – displays session info read from AsyncStorage.
 * Redirects to / if session is missing.
 */
import { useEffect, useState } from '@lynx-js/react';
import { useNavigate } from 'react-router';

import AsyncStorage from '@kafitra/lynx-async-storage';

interface Session {
  username: string;
  loggedInAt: number;
}

export function ProfilePage() {
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

  if (!session) {
    return (
      <view className="Page Page--center">
        <view className="Background" />
        <text className="LoadingText">Memuat...</text>
      </view>
    );
  }

  const initial = session.username.charAt(0).toUpperCase();
  const loginDate = new Date(session.loggedInAt).toLocaleString('id-ID');

  return (
    <view className="Page">
      <view className="Background" />

      <view className="PageContent">
        {/* Back nav */}
        <view className="BackButton" bindtap={() => navigate(-1)}>
          <text className="BackButtonText">‹ Kembali</text>
        </view>

        {/* Avatar */}
        <view className="AvatarWrap">
          <view className="Avatar">
            <text className="AvatarInitial">{initial}</text>
          </view>
          <text className="ProfileName">{session.username}</text>
          <view className="StatusBadge">
            <text className="StatusText">● Aktif</text>
          </view>
        </view>

        {/* Info rows */}
        <view className="InfoCard">
          <view className="InfoRow">
            <text className="InfoLabel">Username</text>
            <text className="InfoValue">{session.username}</text>
          </view>
          <view className="InfoRowDivider" />
          <view className="InfoRow">
            <text className="InfoLabel">Status</text>
            <text className="InfoValue InfoValue--green">Aktif</text>
          </view>
          <view className="InfoRowDivider" />
          <view className="InfoRow">
            <text className="InfoLabel">Sesi dimulai</text>
            <text className="InfoValue">{loginDate}</text>
          </view>
        </view>
      </view>
    </view>
  );
}
