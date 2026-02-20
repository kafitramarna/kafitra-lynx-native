package com.kafitra.lynxdeviceinfo;

import android.content.Context;
import android.os.Build;

import com.lynx.jsbridge.LynxModule;
import com.lynx.jsbridge.LynxMethod;

/**
 * LynxDeviceInfoModule — Lynx Native Module for Android device information.
 *
 * Provides synchronous access to device brand, model, and SDK version
 * through the Lynx Native Module system.
 *
 * <h3>Registration:</h3>
 * <pre>
 * LynxEnv.inst().registerModule("LynxDeviceInfo", LynxDeviceInfoModule.class);
 * </pre>
 */
public class LynxDeviceInfoModule extends LynxModule {

    public LynxDeviceInfoModule(Context context) {
        super(context);
    }

    /**
     * Returns the device brand (manufacturer brand name).
     * Falls back to "unknown" if the value is null.
     *
     * @return Device brand string, e.g., "Samsung", "Google", "Xiaomi"
     */
    @LynxMethod
    public String getBrand() {
        try {
            return Build.BRAND != null ? Build.BRAND : "unknown";
        } catch (Exception e) {
            return "unknown";
        }
    }

    /**
     * Returns the device model name.
     * Falls back to "unknown" if the value is null.
     *
     * @return Device model string, e.g., "Galaxy S24", "Pixel 8"
     */
    @LynxMethod
    public String getModel() {
        try {
            return Build.MODEL != null ? Build.MODEL : "unknown";
        } catch (Exception e) {
            return "unknown";
        }
    }

    /**
     * Returns the Android SDK version number.
     *
     * @return SDK version integer, e.g., 34 for Android 14
     */
    @LynxMethod
    public int getSDKVersion() {
        try {
            return Build.VERSION.SDK_INT;
        } catch (Exception e) {
            return -1;
        }
    }

    /**
     * Returns the device manufacturer name.
     *
     * @return Manufacturer string, e.g., "Samsung", "Google", "Xiaomi"
     */
    @LynxMethod
    public String getManufacturer() {
        try {
            return Build.MANUFACTURER != null ? Build.MANUFACTURER : "unknown";
        } catch (Exception e) {
            return "unknown";
        }
    }

    /**
     * Returns the stable device identifier (hardware codename).
     * Uses Build.DEVICE, e.g., "generic_x86", "walleye".
     *
     * @return Device identifier string
     */
    @LynxMethod
    public String getDeviceId() {
        try {
            return Build.DEVICE != null ? Build.DEVICE : "unknown";
        } catch (Exception e) {
            return "unknown";
        }
    }

    /**
     * Returns the operating system name.
     *
     * @return Always "Android" on this platform
     */
    @LynxMethod
    public String getSystemName() {
        return "Android";
    }

    /**
     * Returns the OS version string (e.g., "14", "13").
     *
     * @return OS version from Build.VERSION.RELEASE
     */
    @LynxMethod
    public String getSystemVersion() {
        try {
            return Build.VERSION.RELEASE != null ? Build.VERSION.RELEASE : "unknown";
        } catch (Exception e) {
            return "unknown";
        }
    }
}
