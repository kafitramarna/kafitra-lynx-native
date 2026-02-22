import { useRef, useState } from '@lynx-js/react';
import { useNavigate } from 'react-router';

import {
  CameraView,
  type CameraErrorEvent,
  type CameraRef,
  type FlashMode,
  type PhotoCapturedEvent,
  type PhotoResult,
  type ZoomChangedEvent,
} from '@kafitra/lynx-camera';

import '../App.css';

const FLASH_CYCLE: FlashMode[] = ['auto', 'on', 'off', 'torch'];
const FLASH_LABELS: Record<FlashMode, string> = {
  auto: 'Flash:A',
  on: 'Flash:ON',
  off: 'Flash:OFF',
  torch: 'Torch',
};

export function CameraPage() {
  const navigate = useNavigate();
  const cameraRef = useRef<CameraRef>(null);

  const [isReady, setIsReady] = useState(false);
  const [isTaking, setIsTaking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastPhoto, setLastPhoto] = useState<PhotoResult | null>(null);

  const [facing, setFacing] = useState<'front' | 'back'>('back');
  const [currentFlash, setCurrentFlash] = useState<FlashMode>('auto');
  const [focusMode, setFocusMode] = useState<'continuous' | 'tap'>(
    'continuous',
  );

  const [zoomLevel, setZoomLevel] = useState(1.0);
  const [minZoom, setMinZoom] = useState(1.0);
  const [maxZoom, setMaxZoom] = useState(10.0);

  function handleCameraReady() {
    setIsReady(true);
    setError(null);
  }
  function handleError(e: CameraErrorEvent) {
    setError(e.detail?.message ?? 'Camera error');
  }
  function handleFlipCamera() {
    setFacing((prev) => (prev === 'back' ? 'front' : 'back'));
  }
  function handleCycleFlash() {
    setCurrentFlash(
      (prev) =>
        FLASH_CYCLE[(FLASH_CYCLE.indexOf(prev) + 1) % FLASH_CYCLE.length],
    );
  }
  function handleToggleFocus() {
    setFocusMode((prev) => (prev === 'continuous' ? 'tap' : 'continuous'));
  }
  function handleZoomIn() {
    setZoomLevel((prev) =>
      parseFloat(Math.min(prev + 0.5, maxZoom).toFixed(1)),
    );
  }
  function handleZoomOut() {
    setZoomLevel((prev) =>
      parseFloat(Math.max(prev - 0.5, minZoom).toFixed(1)),
    );
  }
  function handleZoomChanged(e: ZoomChangedEvent) {
    setZoomLevel(e.detail.zoom);
    if (e.detail.minZoom !== undefined) setMinZoom(e.detail.minZoom);
    if (e.detail.maxZoom !== undefined) setMaxZoom(e.detail.maxZoom);
  }
  function handlePhotoCaptured(e: PhotoCapturedEvent) {
    if (e.detail) setLastPhoto(e.detail);
  }
  async function handleTakePhoto() {
    if (!cameraRef.current || !isReady || isTaking) return;
    setIsTaking(true);
    try {
      const photo = await cameraRef.current.takePhoto();
      setLastPhoto(photo);
    } catch (err: unknown) {
      setError(`Gagal: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsTaking(false);
    }
  }

  return (
    <view className="CameraPage">
      {/* TOP BAR */}
      <view className="CameraTopBar">
        <view className="CameraBtn" bindtap={() => navigate(-1)}>
          <text className="CameraBtn__text">Back</text>
        </view>

        <view className="CameraTopBar__spacer" />

        <view
          className={`CameraBtn${currentFlash === 'torch' ? ' CameraBtn--active' : ''}`}
          bindtap={handleCycleFlash}
        >
          <text className="CameraBtn__text">{FLASH_LABELS[currentFlash]}</text>
        </view>

        <view className="CameraBtn" bindtap={handleFlipCamera}>
          <text className="CameraBtn__text">Flip</text>
        </view>

        <view
          className={`CameraBtn${focusMode === 'tap' ? ' CameraBtn--active' : ''}`}
          bindtap={handleToggleFocus}
        >
          <text className="CameraBtn__text">
            {focusMode === 'tap' ? 'Tap' : 'AF'}
          </text>
        </view>
      </view>

      {/* CAMERA VIEWPORT */}
      <view className="CameraViewport">
        {error ? (
          <view className="CameraViewport__error">
            <text className="CameraViewport__errorText">{error}</text>
          </view>
        ) : (
          <CameraView
            ref={cameraRef}
            className="CameraViewport__inner"
            device={facing}
            flashMode={currentFlash}
            focusMode={focusMode}
            zoom={zoomLevel}
            onCameraReady={handleCameraReady}
            onError={handleError}
            onPhotoCaptured={handlePhotoCaptured}
            onZoomChanged={handleZoomChanged}
          />
        )}
      </view>

      {/* ZOOM BAR */}
      <view className="CameraZoomBar">
        <view className="CameraZoomBtn" bindtap={handleZoomOut}>
          <text className="CameraZoomBtn__text">-</text>
        </view>

        <view className="CameraZoomLabel">
          <text className="CameraZoomLabel__text">{zoomLevel.toFixed(1)}x</text>
          <text className="CameraZoomRange">
            {minZoom.toFixed(1)}–{maxZoom.toFixed(1)}x
          </text>
        </view>

        <view className="CameraZoomBtn" bindtap={handleZoomIn}>
          <text className="CameraZoomBtn__text">+</text>
        </view>
      </view>

      {/* BOTTOM BAR */}
      <view className="CameraBottomBar">
        <view className="CameraThumb">
          {lastPhoto ? (
            <view className="CameraThumb__image">
              <image
                src={lastPhoto.uri}
                style={{ width: '100%', height: '100%' }}
                mode="aspectFill"
              />
            </view>
          ) : (
            <view className="CameraThumb__placeholder" />
          )}
        </view>

        <view
          className={`CameraShutter${isTaking ? ' CameraShutter--busy' : ''}`}
          bindtap={handleTakePhoto}
        >
          <text className="CameraShutter__text">
            {isTaking ? '...' : 'FOTO'}
          </text>
        </view>

        <view className="CameraStatus">
          <text
            className={`CameraStatus__text${isReady ? ' CameraStatus__text--ready' : ''}`}
          >
            {isReady ? 'Ready' : 'Init...'}
          </text>
        </view>
      </view>
    </view>
  );
}
