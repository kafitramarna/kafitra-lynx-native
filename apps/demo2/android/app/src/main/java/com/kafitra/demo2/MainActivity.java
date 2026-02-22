package com.kafitra.demo2;

import androidx.appcompat.app.AppCompatActivity;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.View;
import com.lynx.tasm.LynxView;
import com.lynx.tasm.LynxViewBuilder;
import com.lynx.xelement.XElementBehaviors;
import java.io.IOException;
import java.net.HttpURLConnection;
import java.net.URL;

public class MainActivity extends AppCompatActivity {

    private LynxView mLynxView;
    private final Handler mMainHandler = new Handler(Looper.getMainLooper());
    private String mLastEtag = null;
    private boolean mInitialEtagSet = false;
    private Runnable mPollRunnable;
    private static final int POLL_INTERVAL_MS = 1500;

    private static final String BUNDLE_URL = BuildConfig.DEBUG
            ? "http://localhost:3000/main.lynx.bundle"
            : "main.lynx.bundle";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().getDecorView().setSystemUiVisibility(
                View.SYSTEM_UI_FLAG_FULLSCREEN | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN);
        mLynxView = buildLynxView();
        setContentView(mLynxView);
        mLynxView.renderTemplateUrl(BUNDLE_URL, "");

        if (BuildConfig.DEBUG) {
            startPolling();
        }
    }

    private LynxView buildLynxView() {
        LynxViewBuilder viewBuilder = new LynxViewBuilder();
        viewBuilder.setTemplateProvider(new LynxTemplateProvider(this));
        viewBuilder.addBehaviors(new XElementBehaviors().create());
        LynxAutolinkRegistry.addUIBehaviorsTo(viewBuilder);
        return viewBuilder.build(this);
    }

    /** Poll bundle URL via HEAD request; reload when ETag changes. */
    private void startPolling() {
        mPollRunnable = new Runnable() {
            @Override
            public void run() {
                checkForUpdate();
                mMainHandler.postDelayed(this, POLL_INTERVAL_MS);
            }
        };
        mMainHandler.postDelayed(mPollRunnable, POLL_INTERVAL_MS);
    }

    private void checkForUpdate() {
        new Thread(() -> {
            try {
                HttpURLConnection conn = (HttpURLConnection) new URL(BUNDLE_URL).openConnection();
                conn.setRequestMethod("HEAD");
                conn.setConnectTimeout(1000);
                conn.setReadTimeout(1000);
                if (mLastEtag != null) {
                    conn.setRequestProperty("If-None-Match", mLastEtag);
                }
                conn.connect();
                int code = conn.getResponseCode();
                String etag = conn.getHeaderField("ETag");
                conn.disconnect();

                if (code == 200 && etag != null && !etag.equals(mLastEtag)) {
                    if (!mInitialEtagSet) {
                        // First poll — just record ETag, don't reload (initial render already done)
                        mInitialEtagSet = true;
                    } else {
                        android.util.Log.d("LynxHMR", "Bundle changed (ETag: " + etag + "), reloading...");
                        mMainHandler.post(() -> {
                            if (mLynxView != null) mLynxView.renderTemplateUrl(BUNDLE_URL, "");
                        });
                    }
                    mLastEtag = etag;
                }
            } catch (IOException ignored) {
                // Dev server not running yet — silently retry next poll
            }
        }).start();
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        if (mPollRunnable != null) {
            mMainHandler.removeCallbacks(mPollRunnable);
            mPollRunnable = null;
        }
        if (mLynxView != null) {
            mLynxView.destroy();
            mLynxView = null;
        }
    }
}
