import { useEffect, useState } from '@lynx-js/react'
import { DeviceInfo } from '@kafitra/lynx-device-info'

import './App.css'

interface DeviceState {
  brand: string
  model: string
  sdkVersion: number | null
}

export function App() {
  const [device, setDevice] = useState<DeviceState>({
    brand: '...',
    model: '...',
    sdkVersion: null,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadDeviceInfo() {
      try {
        const [brand, model, sdkVersion] = await Promise.all([
          DeviceInfo.getBrand(),
          DeviceInfo.getModel(),
          DeviceInfo.getSDKVersion(),
        ])
        setDevice({ brand, model, sdkVersion })
        setLoading(false)
      } catch (e) {
        const message =
          e instanceof Error ? e.message : 'Unknown error occurred'
        setError(message)
        setLoading(false)
      }
    }
    loadDeviceInfo()
  }, [])

  return (
    <view>
      <view className="Background" />
      <view className="App">
        {/* Header */}
        <view className="Header">
          <text className="HeaderIcon">📱</text>
          <text className="HeaderTitle">Device Info</text>
          <text className="HeaderSubtitle">@kafitra/lynx-device-info</text>
        </view>

        {/* Content */}
        <view className="Card">
          {error ? (
            <view className="ErrorContainer">
              <text className="ErrorIcon">⚠</text>
              <text className="ErrorTitle">Native Module Error</text>
              <text className="ErrorMessage">{error}</text>
              <text className="ErrorHint">
                Make sure to register LynxDeviceInfoModule in your Android host.
              </text>
            </view>
          ) : loading ? (
            <view className="LoadingContainer">
              <text className="LoadingText">Loading device info...</text>
            </view>
          ) : (
            <view className="InfoContainer">
              <view className="InfoRow">
                <text className="InfoLabel">Brand</text>
                <text className="InfoValue">{device.brand}</text>
              </view>
              <view className="Divider" />
              <view className="InfoRow">
                <text className="InfoLabel">Model</text>
                <text className="InfoValue">{device.model}</text>
              </view>
              <view className="Divider" />
              <view className="InfoRow">
                <text className="InfoLabel">SDK Version</text>
                <text className="InfoValue">
                  {device.sdkVersion !== null
                    ? String(device.sdkVersion)
                    : 'N/A'}
                </text>
              </view>
            </view>
          )}
        </view>

        {/* Footer */}
        <view className="Footer">
          <text className="FooterText">
            Powered by Lynx Native Modules
          </text>
        </view>
      </view>
    </view>
  )
}
