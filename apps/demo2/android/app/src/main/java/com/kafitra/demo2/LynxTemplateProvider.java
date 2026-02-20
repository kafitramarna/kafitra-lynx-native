package com.kafitra.demo2;

import android.content.Context;
import com.lynx.tasm.provider.AbsTemplateProvider;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;

public class LynxTemplateProvider extends AbsTemplateProvider {

    private static final String FALLBACK_ASSET = "main.lynx.bundle";
    private final Context mContext;

    public LynxTemplateProvider(Context context) {
        this.mContext = context.getApplicationContext();
    }

    @Override
    public void loadTemplate(String uri, Callback callback) {
        new Thread(() -> {
            try {
                byte[] data;
                if (uri.startsWith("http://") || uri.startsWith("https://")) {
                    try {
                        data = loadFromNetwork(uri);
                    } catch (Exception e) {
                        data = loadFromAssets(FALLBACK_ASSET);
                    }
                } else {
                    data = loadFromAssets(uri);
                }
                callback.onSuccess(data);
            } catch (Exception e) {
                callback.onFailed(e.getMessage());
            }
        }).start();
    }

    private byte[] loadFromNetwork(String urlStr) throws IOException {
        HttpURLConnection conn = (HttpURLConnection) new URL(urlStr).openConnection();
        conn.setConnectTimeout(10000);
        conn.setReadTimeout(15000);
        try (InputStream is = conn.getInputStream();
             ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            byte[] buf = new byte[4096];
            int n;
            while ((n = is.read(buf)) != -1) out.write(buf, 0, n);
            return out.toByteArray();
        } finally {
            conn.disconnect();
        }
    }

    private byte[] loadFromAssets(String name) throws IOException {
        try (InputStream is = mContext.getAssets().open(name);
             ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            byte[] buf = new byte[4096];
            int n;
            while ((n = is.read(buf)) != -1) out.write(buf, 0, n);
            return out.toByteArray();
        }
    }
}
