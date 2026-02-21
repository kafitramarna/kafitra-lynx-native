package com.kafitra.lynxstorage;

import android.content.Context;
import android.content.SharedPreferences;

import com.lynx.jsbridge.LynxModule;
import com.lynx.jsbridge.LynxMethod;

import org.json.JSONArray;

import java.util.Map;

/**
 * LynxStorageModule — persistent key-value storage backed by SharedPreferences.
 *
 * Provides synchronous access to Android SharedPreferences through the
 * Lynx Native Module system.
 *
 * <h3>Registration (in your host app):</h3>
 * <pre>
 * LynxEnv.inst().registerModule("LynxStorage", LynxStorageModule.class);
 * </pre>
 *
 * <p>All values are stored as Strings under the shared preferences file
 * {@code kafitra_lynx_storage}.</p>
 */
public class LynxStorageModule extends LynxModule {

    private static final String PREFS_NAME = "kafitra_lynx_storage";
    private final Context mContext;

    public LynxStorageModule(Context context) {
        super(context);
        this.mContext = context;
    }

    private SharedPreferences prefs() {
        return mContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
    }

    /**
     * Returns the string stored under {@code key}, or {@code null} when absent.
     *
     * @param key Storage key
     * @return Stored value or null
     */
    @LynxMethod
    public String getString(String key) {
        try {
            SharedPreferences sp = prefs();
            if (!sp.contains(key)) return null;
            return sp.getString(key, null);
        } catch (Exception e) {
            return null;
        }
    }

    /**
     * Stores {@code value} under {@code key}.
     *
     * @param key   Storage key
     * @param value String value to persist
     */
    @LynxMethod
    public void setString(String key, String value) {
        try {
            prefs().edit().putString(key, value).apply();
        } catch (Exception ignored) {
        }
    }

    /**
     * Removes the entry for {@code key}. No-op when the key is absent.
     *
     * @param key Storage key to remove
     */
    @LynxMethod
    public void remove(String key) {
        try {
            prefs().edit().remove(key).apply();
        } catch (Exception ignored) {
        }
    }

    /**
     * Removes all entries from the storage namespace.
     */
    @LynxMethod
    public void clear() {
        try {
            prefs().edit().clear().apply();
        } catch (Exception ignored) {
        }
    }

    /**
     * Returns a JSON array string of all stored keys, e.g. {@code ["a","b","c"]}.
     * Returns {@code "[]"} when storage is empty.
     *
     * @return JSON-encoded string array
     */
    @LynxMethod
    public String getAllKeys() {
        try {
            Map<String, ?> all = prefs().getAll();
            JSONArray arr = new JSONArray();
            for (String key : all.keySet()) {
                arr.put(key);
            }
            return arr.toString();
        } catch (Exception e) {
            return "[]";
        }
    }
}
