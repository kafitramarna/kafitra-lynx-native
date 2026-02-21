/**
 * LoginPage
 *
 * - Accepts username + password.
 * - Demo credentials: demo / demo123
 * - Stores session JSON via @kafitra/lynx-async-storage on success.
 * - Initial route guard (session check) is handled by App.tsx.
 */
import { useState } from '@lynx-js/react';
import { useNavigate } from 'react-router';

import AsyncStorage from '@kafitra/lynx-async-storage';

type InputEvent = { detail: { value: string } };

export function LoginPage() {
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  function handleLogin() {
    if (!username.trim() || !password.trim()) {
      setError('Username dan password wajib diisi');
      return;
    }
    if (username !== 'demo' || password !== 'demo123') {
      setError('Credentials salah. Gunakan: demo / demo123');
      return;
    }
    setError('');
    const session = JSON.stringify({ username, loggedInAt: Date.now() });
    AsyncStorage.setItem('session', session).then(() => {
      navigate('/home', { replace: true });
    });
  }

  return (
    <view className="Page">
      <view className="Background" />

      <view className="LoginCard">
        {/* Header */}
        <view className="LoginHeader">
          <text className="LoginTitle">Selamat Datang</text>
          <text className="LoginSubtitle">Masuk ke akun Anda</text>
        </view>

        {/* Username field */}
        <view className="InputGroup">
          <text className="InputLabel">Username</text>
          <input
            className="TextInput"
            bindinput={(e: InputEvent) => setUsername(e.detail.value)}
            placeholder="Masukkan username"
          />
        </view>

        {/* Password field */}
        <view className="InputGroup">
          <text className="InputLabel">Password</text>
          <input
            className="TextInput"
            bindinput={(e: InputEvent) => setPassword(e.detail.value)}
            placeholder="Masukkan password"
            type="password"
          />
        </view>

        {/* Error message */}
        {error ? <text className="ErrorText">{error}</text> : null}

        {/* Login button */}
        <view className="PrimaryButton" bindtap={handleLogin}>
          <text className="PrimaryButtonText">Masuk</text>
        </view>

        <text className="HintText">Demo credentials: demo / demo123</text>
      </view>
    </view>
  );
}
