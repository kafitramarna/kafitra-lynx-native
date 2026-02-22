/**
 * DeviceInfoPage
 *
 * Menampilkan informasi perangkat menggunakan @kafitra/lynx-device-info.
 */
import { useEffect, useState } from '@lynx-js/react';
import { useNavigate } from 'react-router';
import { DeviceInfo } from '@kafitra/lynx-device-info';

interface DeviceData {
  brand: string;
  model: string;
  manufacturer: string;
  systemName: string;
  systemVersion: string;
  sdkVersion: string;
  deviceId: string;
}

export function DeviceInfoPage() {
  const navigate = useNavigate();
  const [info, setInfo] = useState<DeviceData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      DeviceInfo.getBrand(),
      DeviceInfo.getModel(),
      DeviceInfo.getManufacturer(),
      DeviceInfo.getSystemName(),
      DeviceInfo.getSystemVersion(),
      DeviceInfo.getSDKVersion(),
      DeviceInfo.getDeviceId(),
    ])
      .then(
        ([
          brand,
          model,
          manufacturer,
          systemName,
          systemVersion,
          sdkVersion,
          deviceId,
        ]) => {
          setInfo({
            brand,
            model,
            manufacturer,
            systemName,
            systemVersion,
            sdkVersion: String(sdkVersion),
            deviceId,
          });
        },
      )
      .catch((err: unknown) => {
        setError(
          err instanceof Error ? err.message : 'Gagal memuat info perangkat',
        );
      });
  }, []);

  if (!info && !error) {
    return (
      <view className="Page Page--center">
        <view className="Background" />
        <text className="LoadingText">Memuat info perangkat...</text>
      </view>
    );
  }

  const rows: Array<{ label: string; value: string }> = info
    ? [
        { label: 'Brand', value: info.brand },
        { label: 'Model', value: info.model },
        { label: 'Manufacturer', value: info.manufacturer },
        { label: 'OS', value: info.systemName },
        { label: 'Versi OS', value: info.systemVersion },
        { label: 'API Level', value: info.sdkVersion },
        { label: 'Device ID', value: info.deviceId },
      ]
    : [];

  return (
    <view className="Page">
      <view className="Background" />

      <view className="PageContent">
        {/* Header */}
        <view className="BackButton" bindtap={() => navigate(-1)}>
          <text className="BackButtonText">‹ Kembali</text>
        </view>

        <view className="Card">
          <text className="CardLabel">INFORMASI PERANGKAT</text>
          <text className="WelcomeText">📱 Device Info</text>
          <text className="SubText">Data dari native layer Android</text>
        </view>

        {/* Error state */}
        {error && (
          <view className="Card">
            <text className="ErrorText">{error}</text>
          </view>
        )}

        {/* Info rows */}
        {info && (
          <view className="InfoCard">
            {rows.map((row, i) => (
              <view key={row.label}>
                <view className="InfoRow">
                  <text className="InfoLabel">{row.label}</text>
                  <text className="InfoValue">{row.value}</text>
                </view>
                {i < rows.length - 1 && <view className="InfoRowDivider" />}
              </view>
            ))}
          </view>
        )}
      </view>
    </view>
  );
}
