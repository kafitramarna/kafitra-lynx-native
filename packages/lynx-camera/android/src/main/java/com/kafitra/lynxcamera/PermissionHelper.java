package com.kafitra.lynxcamera;

import android.Manifest;
import android.app.Activity;
import android.content.Context;
import android.content.ContextWrapper;
import android.content.pm.PackageManager;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

/**
 * Utility class for checking and requesting camera permissions at runtime.
 */
public final class PermissionHelper {

    /** Request code used when calling {@link #requestCameraPermission(Activity)}. */
    public static final int CAMERA_REQUEST_CODE = 1001;

    private PermissionHelper() {}

    /**
     * Returns {@code true} if the CAMERA permission has been granted.
     *
     * @param context Application or Activity context.
     */
    public static boolean hasCameraPermission(Context context) {
        return ContextCompat.checkSelfPermission(
                context,
                Manifest.permission.CAMERA
        ) == PackageManager.PERMISSION_GRANTED;
    }

    /**
     * Traverses the {@link ContextWrapper} chain to find the host {@link Activity}.
     * Returns {@code null} if no Activity is found (e.g. Application context).
     */
    public static Activity getActivity(Context context) {
        while (context instanceof ContextWrapper) {
            if (context instanceof Activity) return (Activity) context;
            context = ((ContextWrapper) context).getBaseContext();
        }
        return null;
    }

    /**
     * Requests {@code android.permission.CAMERA} from the given Activity.
     * The result is delivered to {@link Activity#onRequestPermissionsResult}.
     */
    public static void requestCameraPermission(Activity activity) {
        ActivityCompat.requestPermissions(
                activity,
                new String[]{Manifest.permission.CAMERA},
                CAMERA_REQUEST_CODE
        );
    }
}
