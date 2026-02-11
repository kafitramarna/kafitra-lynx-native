package com.kafitra.demo;

import android.app.Activity;
import android.os.Bundle;
import android.view.View;

import com.lynx.tasm.LynxView;
import com.lynx.tasm.LynxViewBuilder;
import com.lynx.xelement.XElementBehaviors;

/**
 * Main activity that renders the Lynx bundle in a full-screen LynxView.
 *
 * The bundle URL can be configured:
 * - For development: loads from dev server via network
 * - For production: loads from assets folder
 */
public class MainActivity extends Activity {

    private LynxView mLynxView;

    // ============================================
    // CONFIGURE YOUR BUNDLE URL HERE
    // ============================================

    // Option 1: Dev server URL (replace with your machine's IP)
    // Make sure your Android device and dev machine are on the same network
    private static final String BUNDLE_URL = "http://10.210.83.154:3000/main.lynx.bundle";

    // Option 2: Local asset bundle (for production)
    // private static final String BUNDLE_URL = "main.lynx.bundle";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Hide status bar for full-screen experience
        getWindow().getDecorView().setSystemUiVisibility(
                View.SYSTEM_UI_FLAG_FULLSCREEN
                        | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
        );

        mLynxView = buildLynxView();
        setContentView(mLynxView);

        // Render the Lynx bundle
        mLynxView.renderTemplateUrl(BUNDLE_URL, "");
    }

    /**
     * Build a LynxView with template provider and XElement support.
     */
    private LynxView buildLynxView() {
        LynxViewBuilder viewBuilder = new LynxViewBuilder();
        viewBuilder.setTemplateProvider(new DemoTemplateProvider(this));
        viewBuilder.addBehaviors(new XElementBehaviors().create());
        return viewBuilder.build(this);
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        if (mLynxView != null) {
            mLynxView.destroy();
            mLynxView = null;
        }
    }
}
