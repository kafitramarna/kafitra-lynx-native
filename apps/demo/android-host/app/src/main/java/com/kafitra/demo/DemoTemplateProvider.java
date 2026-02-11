package com.kafitra.demo;

import android.content.Context;

import com.lynx.tasm.provider.AbsTemplateProvider;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;

/**
 * Template provider that loads Lynx bundles.
 *
 * Supports two modes:
 * - Network URL: Loads bundle from dev server (http://...)
 * - Asset file: Loads bundle from app's assets folder
 */
public class DemoTemplateProvider extends AbsTemplateProvider {

    private final Context mContext;

    DemoTemplateProvider(Context context) {
        this.mContext = context.getApplicationContext();
    }

    @Override
    public void loadTemplate(String uri, Callback callback) {
        new Thread(() -> {
            try {
                byte[] data;
                if (uri.startsWith("http://") || uri.startsWith("https://")) {
                    data = loadFromNetwork(uri);
                } else {
                    data = loadFromAssets(uri);
                }
                callback.onSuccess(data);
            } catch (Exception e) {
                callback.onFailed(e.getMessage());
            }
        }).start();
    }

    /**
     * Load bundle from the network (dev server).
     */
    private byte[] loadFromNetwork(String urlString) throws IOException {
        URL url = new URL(urlString);
        HttpURLConnection connection = (HttpURLConnection) url.openConnection();
        connection.setConnectTimeout(10000);
        connection.setReadTimeout(15000);

        try (InputStream inputStream = connection.getInputStream();
             ByteArrayOutputStream outputStream = new ByteArrayOutputStream()) {
            byte[] buffer = new byte[4096];
            int length;
            while ((length = inputStream.read(buffer)) != -1) {
                outputStream.write(buffer, 0, length);
            }
            return outputStream.toByteArray();
        } finally {
            connection.disconnect();
        }
    }

    /**
     * Load bundle from app's assets folder (production).
     */
    private byte[] loadFromAssets(String uri) throws IOException {
        try (InputStream inputStream = mContext.getAssets().open(uri);
             ByteArrayOutputStream outputStream = new ByteArrayOutputStream()) {
            byte[] buffer = new byte[4096];
            int length;
            while ((length = inputStream.read(buffer)) != -1) {
                outputStream.write(buffer, 0, length);
            }
            return outputStream.toByteArray();
        }
    }
}
