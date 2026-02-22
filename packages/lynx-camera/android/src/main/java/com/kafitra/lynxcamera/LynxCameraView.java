package com.kafitra.lynxcamera;

import android.app.Activity;
import android.content.Context;
import android.content.ContextWrapper;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Paint;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;
import android.view.MotionEvent;
import android.view.View;
import android.view.ViewTreeObserver;
import android.widget.FrameLayout;

import androidx.annotation.NonNull;
import androidx.camera.core.Camera;
import androidx.camera.core.CameraSelector;
import androidx.camera.core.FocusMeteringAction;
import androidx.camera.core.ImageCapture;
import androidx.camera.core.ImageCaptureException;
import androidx.camera.core.MeteringPoint;
import androidx.camera.core.MeteringPointFactory;
import androidx.camera.core.Preview;
import androidx.camera.core.SurfaceOrientedMeteringPointFactory;
import androidx.camera.core.ZoomState;
import androidx.camera.lifecycle.ProcessCameraProvider;
import androidx.camera.view.PreviewView;
import androidx.core.content.ContextCompat;
import androidx.lifecycle.LifecycleOwner;

import com.google.common.util.concurrent.ListenableFuture;

import com.lynx.react.bridge.Callback;
import com.lynx.react.bridge.JavaOnlyMap;
import com.lynx.react.bridge.ReadableMap;
import com.lynx.tasm.behavior.LynxContext;
import com.lynx.tasm.behavior.LynxProp;
import com.lynx.tasm.behavior.LynxUIMethod;
import com.lynx.tasm.behavior.ui.LynxUI;
import com.lynx.tasm.event.LynxCustomEvent;

import java.io.File;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.Executor;
import java.util.concurrent.Executors;

/**
 * LynxCameraView — Native UI custom element for camera preview and capture.
 *
 * <p>Uses CameraX for lifecycle-aware, stable camera access on Android 5.0+ (API 21+).
 *
 * <p>Registered as the {@code <camera>} custom element in Lynx:
 * <pre>
 *   LynxEnv.inst().registerUI("camera", LynxCameraView.class);
 * </pre>
 *
 * <p>Props (set via element attributes):
 * <ul>
 *   <li>{@code device}       — "front" | "back" (default: "back")</li>
 *   <li>{@code flash-mode}   — "auto" | "on" | "off" | "torch" (default: "auto")</li>
 *   <li>{@code focus-mode}   — "auto" | "tap" | "continuous" (default: "continuous")</li>
 *   <li>{@code zoom}         — float ≥ 1.0 (default: 1.0)</li>
 *   <li>{@code enable-torch} — "true" | "false" (default: "false")</li>
 * </ul>
 *
 * <p>Invokable methods ({@code NodesRef.invoke}):
 * <ul>
 *   <li>{@code takePhoto}     → {@code { code, data: { uri, width, height } }}</li>
 *   <li>{@code switchCamera}  → {@code { code }}</li>
 *   <li>{@code setZoom}       → {@code { code }}  params: {@code { level: float }}</li>
 *   <li>{@code setFlash}      → {@code { code }}  params: {@code { mode: string }}</li>
 *   <li>{@code focus}         → {@code { code }}  params: {@code { x: float, y: float }}</li>
 * </ul>
 */
public class LynxCameraView extends LynxUI<FrameLayout> {

    private static final String TAG = "LynxCameraView";

    // -----------------------------------------------------------------------
    // State
    // -----------------------------------------------------------------------

    private String mDevice = "back";
    private String mFlashMode = "auto";
    private String mFocusMode = "continuous";
    private float mZoom = 1.0f;
    private boolean mEnableTorch = false;

    private PreviewView mPreviewView;
    private FocusRingView mFocusRingView;

    private Camera mCamera;
    private ImageCapture mImageCapture;
    private ProcessCameraProvider mCameraProvider;
    // Pre-warmed future — started as early as createView() so hardware init
    // overlaps with Lynx layout/JS setup rather than waiting until onAttach().
    private ListenableFuture<ProcessCameraProvider> mProviderFuture;

    private final Executor mCaptureExecutor = Executors.newSingleThreadExecutor();
    private final Handler mMainHandler = new Handler(Looper.getMainLooper());

    /** Set to {@code true} while a runtime CAMERA permission request is in flight. */
    private boolean mPermissionPending = false;

    // -----------------------------------------------------------------------
    // Constructor
    // -----------------------------------------------------------------------

    public LynxCameraView(LynxContext context) {
        super(context);
        Log.i(TAG, "LynxCameraView constructed");
    }

    // -----------------------------------------------------------------------
    // LynxUI lifecycle
    // -----------------------------------------------------------------------

    @Override
    protected FrameLayout createView(Context context) {
        Log.i(TAG, "createView() called — context=" + context.getClass().getName());
        // Kick off CameraProvider init immediately so hardware is ready.
        if (PermissionHelper.hasCameraPermission(context)) {
            mProviderFuture = ProcessCameraProvider.getInstance(context);
            Log.i(TAG, "createView() — CameraProvider future pre-warmed");
        }

        // Root container: FrameLayout so FocusRingView can overlay PreviewView
        FrameLayout container = new FrameLayout(context);

        // Camera preview
        mPreviewView = new PreviewView(context);
        mPreviewView.setScaleType(PreviewView.ScaleType.FILL_CENTER);
        container.addView(mPreviewView,
            new FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.MATCH_PARENT));

        // Native focus ring overlay — sits on top of PreviewView
        mFocusRingView = new FocusRingView(context);
        container.addView(mFocusRingView,
            new FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.MATCH_PARENT));

        // Tap-to-focus: when focusMode is "tap", trigger focus at touch point.
        mPreviewView.setOnTouchListener((v, event) -> {
            if (event.getAction() == MotionEvent.ACTION_DOWN && "tap".equals(mFocusMode)) {
                triggerFocus(event.getX(), event.getY());
                emitTapFocus(event.getX(), event.getY());
                mFocusRingView.showRing(event.getX(), event.getY());
            }
            return false;
        });

        // Use Android native attach listener — guaranteed to fire when the view
        // is actually added to the window, regardless of Lynx lifecycle quirks.
        container.addOnAttachStateChangeListener(new View.OnAttachStateChangeListener() {
            @Override
            public void onViewAttachedToWindow(View v) {
                Log.i(TAG, "onViewAttachedToWindow() — starting camera");
                startCamera();
            }
            @Override
            public void onViewDetachedFromWindow(View v) {
                Log.i(TAG, "onViewDetachedFromWindow() — stopping camera");
                stopCamera();
            }
        });

        // When the permission dialog closes, the window regains focus.
        // Use that signal to retry startCamera() after the user responds.
        container.getViewTreeObserver().addOnWindowFocusChangeListener(
                new ViewTreeObserver.OnWindowFocusChangeListener() {
                    @Override
                    public void onWindowFocusChanged(boolean hasFocus) {
                        if (hasFocus && mPermissionPending) {
                            Log.i(TAG, "Window focus regained — retrying startCamera() after permission dialog");
                            mMainHandler.post(LynxCameraView.this::startCamera);
                        }
                    }
                });

        return container;
    }

    @Override
    public void onAttach() {
        Log.i(TAG, "onAttach() called");
        super.onAttach();
        // Camera is started via OnAttachStateChangeListener above.
    }

    @Override
    public void onDetach() {
        super.onDetach();
        stopCamera();
    }

    // -----------------------------------------------------------------------
    // Props
    // -----------------------------------------------------------------------

    @LynxProp(name = "device")
    public void setDevice(String device) {
        if (device == null) return;
        if (!device.equals(mDevice)) {
            mDevice = device;
            if (mCameraProvider != null) {
                restartCamera();
            }
        }
    }

    @LynxProp(name = "flash-mode")
    public void setFlashMode(String mode) {
        if (mode == null) return;
        mFlashMode = mode;
        applyFlashMode();
    }

    @LynxProp(name = "focus-mode")
    public void setFocusMode(String mode) {
        if (mode == null) return;
        mFocusMode = mode;
    }

    @LynxProp(name = "zoom")
    public void setZoomProp(double zoom) {
        mZoom = (float) zoom;
        applyZoom();
    }

    @LynxProp(name = "enable-torch")
    public void setEnableTorch(String value) {
        mEnableTorch = "true".equalsIgnoreCase(value);
        applyTorch();
    }

    // -----------------------------------------------------------------------
    // Invokable methods
    // -----------------------------------------------------------------------

    /**
     * Capture a still image and return its local file URI.
     *
     * <p>Callback payload: {@code { code: 0, data: { uri, width, height } }}
     * or {@code { code: -1, error: "..." }}.
     */
    @LynxUIMethod
    public void takePhoto(Callback callback) {
        if (!PermissionHelper.hasCameraPermission(mContext.getContext())) {
            invokeError(callback, "PERMISSION_DENIED", "Camera permission not granted");
            return;
        }
        if (mImageCapture == null) {
            invokeError(callback, "CAMERA_NOT_READY", "Camera is not initialised yet");
            return;
        }

        File outputFile = createOutputFile();
        ImageCapture.OutputFileOptions options =
                new ImageCapture.OutputFileOptions.Builder(outputFile).build();

        mImageCapture.takePicture(
                options,
                mCaptureExecutor,
                new ImageCapture.OnImageSavedCallback() {
                    @Override
                    public void onImageSaved(
                            @NonNull ImageCapture.OutputFileResults results) {
                        String uri = "file://" + outputFile.getAbsolutePath();
                        mMainHandler.post(() -> {
                            JavaOnlyMap data = new JavaOnlyMap();
                            data.putString("uri", uri);
                            data.putInt("width", 0);
                            data.putInt("height", 0);
                            // Lynx callback format: invoke(code, data)
                            // NativeFacade wraps as { code, data } → routed to success/fail
                            callback.invoke(0, data);
                            emitPhotoCaptured(uri);
                        });
                    }

                    @Override
                    public void onError(@NonNull ImageCaptureException exception) {
                        mMainHandler.post(() ->
                                invokeError(callback, "CAPTURE_FAILED", exception.getMessage()));
                    }
                }
        );
    }

    /**
     * Toggle between front and back camera.
     */
    @LynxUIMethod
    public void switchCamera(Callback callback) {
        mDevice = "back".equals(mDevice) ? "front" : "back";
        restartCamera();
        invokeSuccess(callback);
    }

    /**
     * Set zoom level programmatically.
     * Params: {@code { level: float }}
     */
    @LynxUIMethod
    public void setZoom(ReadableMap params, Callback callback) {
        float level = (float) (params != null ? params.getDouble("level", 1.0) : 1.0);
        mZoom = level;
        applyZoom();
        invokeSuccess(callback);
    }

    /**
     * Set flash mode programmatically.
     * Params: {@code { mode: "auto" | "on" | "off" | "torch" }}
     */
    @LynxUIMethod
    public void setFlash(ReadableMap params, Callback callback) {
        String mode = params != null ? params.getString("mode", "auto") : "auto";
        mFlashMode = mode;
        applyFlashMode();
        invokeSuccess(callback);
    }

    /**
     * Trigger tap-to-focus at the given coordinates.
     * Params: {@code { x: float, y: float }}
     */
    @LynxUIMethod
    public void focus(ReadableMap params, Callback callback) {
        float x = (float) (params != null ? params.getDouble("x", 0.0) : 0.0);
        float y = (float) (params != null ? params.getDouble("y", 0.0) : 0.0);
        triggerFocus(x, y);
        invokeSuccess(callback);
    }

    // -----------------------------------------------------------------------
    // CameraX internals
    // -----------------------------------------------------------------------

    private void startCamera() {
        Context context = mContext.getContext();
        Log.i(TAG, "startCamera() — context=" + context.getClass().getName());
        boolean hasPermission = PermissionHelper.hasCameraPermission(context);
        Log.i(TAG, "startCamera() — hasPermission=" + hasPermission);
        if (!hasPermission) {
            android.app.Activity activity = PermissionHelper.getActivity(context);
            if (activity != null) {
                if (mPermissionPending) {
                    // User already responded to our dialog (granted=false or permanently denied).
                    mPermissionPending = false;
                    Log.w(TAG, "startCamera() — CAMERA permission denied by user");
                    emitError("PERMISSION_DENIED",
                            "Camera permission was denied. Enable it in App Settings.");
                } else {
                    Log.i(TAG, "startCamera() — requesting CAMERA runtime permission");
                    mPermissionPending = true;
                    PermissionHelper.requestCameraPermission(activity);
                }
            } else {
                Log.w(TAG, "startCamera() — PERMISSION_DENIED, no Activity context");
                emitError("PERMISSION_DENIED", "Camera permission not granted. " +
                        "Request android.permission.CAMERA before rendering <camera />");
            }
            return;
        }
        mPermissionPending = false; // cleared — permission is now granted

        // Reuse the future pre-warmed in createView(); if permission was granted
        // after createView() (runtime dialog), create a fresh one.
        if (mProviderFuture == null) {
            mProviderFuture = ProcessCameraProvider.getInstance(context);
            Log.i(TAG, "startCamera() — CameraProvider future created (late)");
        }

        mProviderFuture.addListener(() -> {
            try {
                mCameraProvider = mProviderFuture.get();
                Log.i(TAG, "CameraProvider obtained: " + mCameraProvider);
                bindCameraUseCases();
            } catch (ExecutionException | InterruptedException e) {
                Log.e(TAG, "CameraX provider error", e);
                emitError("SESSION_ERROR",
                        "Failed to obtain CameraProvider: " + e.getMessage());
            }
        }, ContextCompat.getMainExecutor(context));
    }

    private void stopCamera() {
        if (mCameraProvider != null) {
            mCameraProvider.unbindAll();
            mCameraProvider = null;
        }
        mCamera = null;
        mImageCapture = null;
    }

    private void restartCamera() {
        if (mCameraProvider != null) {
            mCameraProvider.unbindAll();
            bindCameraUseCases();
        }
    }

    private void bindCameraUseCases() {
        if (mCameraProvider == null) return;
        Log.i(TAG, "bindCameraUseCases() — mDevice=" + mDevice);

        LifecycleOwner lifecycleOwner = findLifecycleOwner(mContext.getContext());
        Log.i(TAG, "bindCameraUseCases() — lifecycleOwner=" + lifecycleOwner);
        if (lifecycleOwner == null) {
            Log.w(TAG, "Cannot find LifecycleOwner in context chain. "
                    + "Use AppCompatActivity as the host Activity.");
            emitError("SESSION_ERROR", "Host Activity must extend AppCompatActivity.");
            return;
        }

        CameraSelector cameraSelector = "front".equals(mDevice)
                ? CameraSelector.DEFAULT_FRONT_CAMERA
                : CameraSelector.DEFAULT_BACK_CAMERA;

        Preview preview = new Preview.Builder().build();
        preview.setSurfaceProvider(mPreviewView.getSurfaceProvider());

        mImageCapture = new ImageCapture.Builder()
                .setCaptureMode(ImageCapture.CAPTURE_MODE_MINIMIZE_LATENCY)
                .build();

        try {
            mCameraProvider.unbindAll();
            mCamera = mCameraProvider.bindToLifecycle(
                    lifecycleOwner,
                    cameraSelector,
                    preview,
                    mImageCapture
            );

            // Apply initial zoom and flash (torch is handled inside applyFlashMode)
            applyZoom();
            applyFlashMode();

            emitCameraReady();

        } catch (Exception e) {
            Log.e(TAG, "Use case binding failed", e);
            emitError("SESSION_ERROR", "CameraX binding failed: " + e.getMessage());
        }
    }

    // -----------------------------------------------------------------------
    // Camera controls
    // -----------------------------------------------------------------------

    private void applyZoom() {
        if (mCamera == null) return;
        ZoomState zoomState = mCamera.getCameraInfo().getZoomState().getValue();
        if (zoomState != null) {
            float min = zoomState.getMinZoomRatio();
            float max = zoomState.getMaxZoomRatio();
            float clamped = Math.max(min, Math.min(max, mZoom));
            mCamera.getCameraControl().setZoomRatio(clamped);
            emitZoomChanged(clamped, min, max);
        }
    }

    private void applyFlashMode() {
        // "torch" = continuous light on; also respect the enable-torch prop
        if (mCamera != null) {
            boolean torchOn = "torch".equals(mFlashMode) || mEnableTorch;
            mCamera.getCameraControl().enableTorch(torchOn);
        }
        if (mImageCapture == null) return;
        switch (mFlashMode) {
            case "on":
                mImageCapture.setFlashMode(ImageCapture.FLASH_MODE_ON);
                break;
            case "torch":
            case "off":
                mImageCapture.setFlashMode(ImageCapture.FLASH_MODE_OFF);
                break;
            case "auto":
            default:
                mImageCapture.setFlashMode(ImageCapture.FLASH_MODE_AUTO);
                break;
        }
    }

    private void applyTorch() {
        // Delegated to applyFlashMode to avoid double enableTorch calls
        applyFlashMode();
    }

    private void triggerFocus(float x, float y) {
        if (mCamera == null || mPreviewView == null) return;
        MeteringPointFactory factory = new SurfaceOrientedMeteringPointFactory(
                mPreviewView.getWidth(), mPreviewView.getHeight());
        MeteringPoint point = factory.createPoint(x, y);
        FocusMeteringAction action = new FocusMeteringAction.Builder(point).build();
        mCamera.getCameraControl().startFocusAndMetering(action);
    }

    // -----------------------------------------------------------------------
    // Event emitters
    // -----------------------------------------------------------------------

    private void emitCameraReady() {
        Log.i(TAG, "emitCameraReady() — sign=" + getSign());
        LynxCustomEvent event = new LynxCustomEvent(getSign(), "cameraready");
        mContext.getEventEmitter().sendCustomEvent(event);
    }

    private void emitPhotoCaptured(String uri) {
        LynxCustomEvent event = new LynxCustomEvent(getSign(), "photocaptured");
        event.addDetail("uri", uri);
        event.addDetail("width", 0);
        event.addDetail("height", 0);
        mContext.getEventEmitter().sendCustomEvent(event);
    }

    private void emitZoomChanged(float zoom, float minZoom, float maxZoom) {
        LynxCustomEvent event = new LynxCustomEvent(getSign(), "zoomchanged");
        event.addDetail("zoom", zoom);
        event.addDetail("minZoom", minZoom);
        event.addDetail("maxZoom", maxZoom);
        mContext.getEventEmitter().sendCustomEvent(event);
    }

    private void emitTapFocus(float x, float y) {
        LynxCustomEvent event = new LynxCustomEvent(getSign(), "tapfocus");
        event.addDetail("x", x);
        event.addDetail("y", y);
        mContext.getEventEmitter().sendCustomEvent(event);
    }

    private void emitError(String code, String message) {
        LynxCustomEvent event = new LynxCustomEvent(getSign(), "error");
        event.addDetail("code", code);
        event.addDetail("message", message);
        mContext.getEventEmitter().sendCustomEvent(event);
    }

    // -----------------------------------------------------------------------
    // Callback helpers
    // -----------------------------------------------------------------------

    private static void invokeSuccess(Callback callback) {
        if (callback == null) return;
        // Lynx NativeFacade: invoke(code, data?) → { code, data } → success/fail
        callback.invoke(0);
    }

    private static void invokeError(Callback callback, String code, String message) {
        if (callback == null) return;
        JavaOnlyMap result = new JavaOnlyMap();
        result.putString("message", message);
        result.putString("code", code);
        callback.invoke(1, result);
    }

    // -----------------------------------------------------------------------
    // Utilities
    // -----------------------------------------------------------------------

    // -----------------------------------------------------------------------
    // Helpers
    // -----------------------------------------------------------------------

    /**
     * Walk up the ContextWrapper chain to find the nearest LifecycleOwner
     * (typically an AppCompatActivity / FragmentActivity).
     */
    private static LifecycleOwner findLifecycleOwner(Context context) {
        while (context != null) {
            if (context instanceof LifecycleOwner) return (LifecycleOwner) context;
            if (context instanceof ContextWrapper) {
                context = ((ContextWrapper) context).getBaseContext();
            } else {
                break;
            }
        }
        return null;
    }

    private File createOutputFile() {
        String timestamp = new SimpleDateFormat("yyyyMMdd_HHmmss_SSS", Locale.US)
                .format(new Date());
        File cacheDir = mContext.getContext().getCacheDir();
        return new File(cacheDir, "lynx_camera_" + timestamp + ".jpg");
    }

    // -----------------------------------------------------------------------
    // Focus Ring Overlay
    // -----------------------------------------------------------------------

    /**
     * Transparent View that draws a white focus ring at a given point.
     * Shown for ~900 ms then fades out automatically.
     */
    private static class FocusRingView extends View {
        private final Paint mPaint;
        private float mCx = -1;
        private float mCy = -1;
        private float mAlpha = 0f;
        private boolean mVisible = false;
        private final Handler mHandler = new Handler(Looper.getMainLooper());
        private static final float RADIUS_DP = 44f;
        private static final int STROKE_DP = 3;
        private static final int SHOW_MS = 900;

        FocusRingView(Context context) {
            super(context);
            mPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
            mPaint.setStyle(Paint.Style.STROKE);
            mPaint.setColor(Color.WHITE);
            float density = context.getResources().getDisplayMetrics().density;
            mPaint.setStrokeWidth(STROKE_DP * density);
            setWillNotDraw(false);
        }

        /** Show the ring at (x, y) in the view's local pixel coordinates. */
        void showRing(float x, float y) {
            mCx = x;
            mCy = y;
            mAlpha = 1f;
            mVisible = true;
            invalidate();
            mHandler.removeCallbacksAndMessages(null);
            mHandler.postDelayed(() -> {
                mVisible = false;
                invalidate();
            }, SHOW_MS);
        }

        @Override
        protected void onDraw(Canvas canvas) {
            if (!mVisible || mCx < 0) return;
            float density = getResources().getDisplayMetrics().density;
            float radius = RADIUS_DP * density;
            mPaint.setAlpha((int)(mAlpha * 255));
            canvas.drawCircle(mCx, mCy, radius, mPaint);
        }
    }
}
