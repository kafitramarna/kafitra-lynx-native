import * as path from "node:path";
import * as fs from "node:fs";
import * as log from "../utils/logger.js";
import { runLink } from "./link.js";
import { ensureGradleWrapperJar } from "../utils/gradle.js";

export interface PrebuildOptions {
  projectRoot?: string;
  androidDir?: string;
  /** Java package / applicationId, e.g. "com.example.myapp" */
  packageId: string;
  /** Overwrite existing android dir */
  force?: boolean;
}

// ── File templates ────────────────────────────────────────────────────────────

function tplRootSettingsGradle(appName: string): string {
  return `pluginManagement {
    repositories {
        google()
        mavenCentral()
        gradlePluginPortal()
    }
}
dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()
        mavenCentral()
        maven { url = uri("https://artifact.bytedance.com/repository/lynx/") }
    }
}
rootProject.name = "${appName}"
include ':app'
// lynx-autolink-start
// lynx-autolink-end
`;
}

function tplRootBuildGradle(): string {
  return `plugins {
    id 'com.android.application' version '8.1.0' apply false
    id 'com.android.library' version '8.1.0' apply false
}
`;
}

function tplAppBuildGradle(packageId: string): string {
  return `plugins {
    id 'com.android.application'
}

android {
    namespace '${packageId}'
    compileSdk 34

    defaultConfig {
        applicationId "${packageId}"
        minSdk 24
        targetSdk 34
        versionCode 1
        versionName "1.0"
    }

    buildTypes {
        release {
            minifyEnabled false
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }
    }
    compileOptions {
        sourceCompatibility JavaVersion.VERSION_1_8
        targetCompatibility JavaVersion.VERSION_1_8
    }
    buildFeatures {
        buildConfig true
    }
    packaging {
        resources {
            excludes += '/META-INF/{AL2.0,LGPL2.1}'
        }
    }
}

dependencies {
    // lynx-autolink-start
    // lynx-autolink-end

    // Lynx core
    implementation "org.lynxsdk.lynx:lynx:3.6.0"
    implementation "org.lynxsdk.lynx:lynx-jssdk:3.6.0"
    implementation "org.lynxsdk.lynx:lynx-trace:3.6.0"
    implementation "org.lynxsdk.lynx:primjs:3.6.1"

    // Lynx services
    implementation "org.lynxsdk.lynx:lynx-service-image:3.6.0"
    implementation "org.lynxsdk.lynx:lynx-service-log:3.6.0"

    // Image service dependencies
    implementation "com.facebook.fresco:fresco:2.3.0"
    implementation "com.facebook.fresco:animated-gif:2.3.0"
    implementation "com.facebook.fresco:animated-webp:2.3.0"
    implementation "com.facebook.fresco:webpsupport:2.3.0"
    implementation "com.facebook.fresco:animated-base:2.3.0"
    implementation "com.squareup.okhttp3:okhttp:4.9.0"

    // XElement
    implementation "org.lynxsdk.lynx:xelement:3.6.0"
    implementation "org.lynxsdk.lynx:xelement-input:3.6.0"
}
`;
}

function tplGradleWrapperProperties(): string {
  return `distributionBase=GRADLE_USER_HOME
distributionPath=wrapper/dists
distributionUrl=https\\://services.gradle.org/distributions/gradle-8.2-bin.zip
zipStoreBase=GRADLE_USER_HOME
zipStorePath=wrapper/dists
`;
}

function tplGradlew(): string {
  return `#!/bin/sh
##############################################################################
# Gradle start up script for UN*X
##############################################################################
APP_NAME="Gradle"
APP_BASE_NAME=\`basename "$0"\`
APP_HOME="\`pwd -P\`"
CLASSPATH=\$APP_HOME/gradle/wrapper/gradle-wrapper.jar
DEFAULT_JVM_OPTS="-Xmx64m" "-Xms64m"
if [ "$1" = "" ]; then TASK="tasks"; else TASK="$@"; fi
exec java \$DEFAULT_JVM_OPTS -classpath "\$CLASSPATH" \\
  org.gradle.wrapper.GradleWrapperMain "\$@"
`;
}

function tplGradlewBat(): string {
  return `@rem ##########################################################################
@rem  Gradle startup script for Windows
@rem ##########################################################################
@if "%DEBUG%"=="" @echo off
@rem Set local scope for the variables with windows NT shell
if "%OS%"=="Windows_NT" setlocal
set DIRNAME=%~dp0
if "%DIRNAME%"=="" set DIRNAME=.
set APP_BASE_NAME=%~n0
set APP_HOME=%DIRNAME%
set CLASSPATH=%APP_HOME%\\gradle\\wrapper\\gradle-wrapper.jar
@rem Default JVM options
set DEFAULT_JVM_OPTS="-Xmx64m" "-Xms64m"
java %DEFAULT_JVM_OPTS% -classpath "%CLASSPATH%" org.gradle.wrapper.GradleWrapperMain %*
if "%ERRORLEVEL%"=="0" goto mainEnd
:fail
exit /b 1
:mainEnd
if "%OS%"=="Windows_NT" endlocal
`;
}

function tplAndroidManifest(packageId: string): string {
  return `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
    <uses-permission android:name="android.permission.INTERNET" />

    <application
        android:name=".LynxApplication"
        android:allowBackup="true"
        android:label="Lynx App"
        android:supportsRtl="true"
        android:networkSecurityConfig="@xml/network_security_config"
        android:theme="@style/Theme.AppCompat.Light.NoActionBar">
        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:configChanges="keyboard|keyboardHidden|orientation|screenLayout|screenSize">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>
</manifest>
`;
}

function tplNetworkSecurityConfig(): string {
  return `<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
    <!-- Allow cleartext HTTP/WS to localhost for dev server (debug only) -->
    <domain-config cleartextTrafficPermitted="true">
        <domain includeSubdomains="false">localhost</domain>
        <domain includeSubdomains="false">10.0.2.2</domain>
        <domain includeSubdomains="false">127.0.0.1</domain>
    </domain-config>
</network-security-config>
`;
}

function tplLynxApplication(packageId: string): string {
  return `package ${packageId};

import android.app.Application;
import com.facebook.drawee.backends.pipeline.Fresco;
import com.facebook.imagepipeline.core.ImagePipelineConfig;
import com.facebook.imagepipeline.memory.PoolConfig;
import com.facebook.imagepipeline.memory.PoolFactory;
import com.lynx.tasm.LynxEnv;
import com.lynx.tasm.service.LynxServiceCenter;
import com.lynx.service.image.LynxImageService;
import com.lynx.service.log.LynxLogService;

public class LynxApplication extends Application {

    @Override
    public void onCreate() {
        super.onCreate();
        initLynxService();
        initLynxEnv();
    }

    private void initLynxService() {
        final PoolFactory factory = new PoolFactory(PoolConfig.newBuilder().build());
        ImagePipelineConfig.Builder config = ImagePipelineConfig
                .newBuilder(getApplicationContext())
                .setPoolFactory(factory);
        Fresco.initialize(getApplicationContext(), config.build());

        LynxServiceCenter.inst().registerService(LynxImageService.getInstance());
        LynxServiceCenter.inst().registerService(LynxLogService.INSTANCE);
    }

    private void initLynxEnv() {
        LynxEnv.inst().init(this, null, null, null);
        LynxAutolinkRegistry.registerAll();
    }
}
`;
}

function tplMainActivity(packageId: string): string {
  return `package ${packageId};

import android.app.Activity;
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

public class MainActivity extends Activity {

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
`;
}

function tplLynxTemplateProvider(packageId: string): string {
  return `package ${packageId};

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
`;
}

function tplLynxAutolinkRegistry(packageId: string): string {
  return `package ${packageId};

// This file is auto-generated by @kafitra/lynx-cli.
// Do not edit manually — run: npx @kafitra/lynx-cli link
public class LynxAutolinkRegistry {
    public static void registerAll() {
        // modules will be registered here after running: lynx link
    }
}
`;
}

// ── Main command ──────────────────────────────────────────────────────────────

export async function runPrebuild(opts: PrebuildOptions): Promise<void> {
  const projectRoot = path.resolve(opts.projectRoot ?? process.cwd());
  const androidDirName = opts.androidDir ?? "android";
  const androidDir = path.resolve(projectRoot, androidDirName);
  const packageId = opts.packageId;
  const appName = packageId.split(".").pop() ?? "LynxApp";

  log.blank();
  log.header("kafitra/lynx-cli — lynx prebuild");
  log.blank();

  // ── Guard: already exists ─────────────────────────────────────────────────
  if (fs.existsSync(androidDir) && !opts.force) {
    log.error(
      `Android directory already exists: ${androidDir}\n  Use --force to overwrite.`,
    );
    process.exit(1);
  }

  log.info(`Package ID: ${packageId}`);
  log.info(`Output: ${androidDir}`);
  log.blank();

  const javaDir = path.join(
    androidDir,
    "app",
    "src",
    "main",
    "java",
    ...packageId.split("."),
  );
  const resDir = path.join(androidDir, "app", "src", "main", "res");
  const assetsDir = path.join(androidDir, "app", "src", "main", "assets");
  const wrapperDir = path.join(androidDir, "gradle", "wrapper");

  // ── Create directories ────────────────────────────────────────────────────
  for (const dir of [javaDir, resDir, assetsDir, wrapperDir]) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // ── Write files ───────────────────────────────────────────────────────────
  const files: Array<[string, string]> = [
    [path.join(androidDir, "settings.gradle"), tplRootSettingsGradle(appName)],
    [path.join(androidDir, "build.gradle"), tplRootBuildGradle()],
    [
      path.join(androidDir, "app", "build.gradle"),
      tplAppBuildGradle(packageId),
    ],
    [path.join(androidDir, "app", "proguard-rules.pro"), "# Proguard rules\n"],
    [
      path.join(wrapperDir, "gradle-wrapper.properties"),
      tplGradleWrapperProperties(),
    ],
    [path.join(androidDir, "gradlew"), tplGradlew()],
    [path.join(androidDir, "gradlew.bat"), tplGradlewBat()],
    [path.join(androidDir, "gradle.properties"), "android.useAndroidX=true\n"],
    [
      path.join(androidDir, "app", "src", "main", "AndroidManifest.xml"),
      tplAndroidManifest(packageId),
    ],
    [
      path.join(
        androidDir,
        "app",
        "src",
        "main",
        "res",
        "xml",
        "network_security_config.xml",
      ),
      tplNetworkSecurityConfig(),
    ],
    [path.join(javaDir, "LynxApplication.java"), tplLynxApplication(packageId)],
    [path.join(javaDir, "MainActivity.java"), tplMainActivity(packageId)],
    [
      path.join(javaDir, "LynxTemplateProvider.java"),
      tplLynxTemplateProvider(packageId),
    ],
    [
      path.join(javaDir, "LynxAutolinkRegistry.java"),
      tplLynxAutolinkRegistry(packageId),
    ],
  ];

  for (const [filePath, content] of files) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, content, "utf8");
    log.success(`Created: ${path.relative(projectRoot, filePath)}`);
  }

  // Make gradlew executable on Unix
  if (process.platform !== "win32") {
    try {
      fs.chmodSync(path.join(androidDir, "gradlew"), 0o755);
    } catch {
      // ignore
    }
  }

  // ── Download gradle-wrapper.jar ──────────────────────────────────────────
  log.step("Downloading gradle-wrapper.jar…");
  try {
    await ensureGradleWrapperJar(androidDir);
    log.success("Downloaded: gradle/wrapper/gradle-wrapper.jar");
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    log.warn(
      `Could not download gradle-wrapper.jar: ${msg}\n` +
        "  You can add it manually: copy from an existing Android project\n" +
        "  or run: gradle wrapper --gradle-version 8.2",
    );
  }
  log.blank();

  // ── Auto-run lynx link ────────────────────────────────────────────────────
  log.step("Running lynx link to wire up installed modules…");
  try {
    await runLink({
      projectRoot,
      androidDir: androidDirName,
      javaPackage: packageId,
    });
  } catch {
    log.warn("lynx link skipped (no modules found or error).");
  }

  log.blank();
  log.header("✔ Prebuild complete");
  log.blank();

  // ── Copy bundle to assets if already built ────────────────────────────────
  const bundleSrc = path.join(projectRoot, "dist", "main.lynx.bundle");
  const bundleDest = path.join(assetsDir, "main.lynx.bundle");
  let bundleCopied = false;
  if (fs.existsSync(bundleSrc)) {
    try {
      fs.copyFileSync(bundleSrc, bundleDest);
      log.success(
        "Copied: dist/main.lynx.bundle → android/app/src/main/assets/main.lynx.bundle",
      );
      bundleCopied = true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      log.warn(`Could not copy bundle: ${msg}`);
    }
  }

  log.info("Next steps:");
  if (!bundleCopied) {
    log.info("  1. Build your bundle:  pnpm dev  (or rspeedy build)");
    log.info("     Then run prebuild again, or copy dist/main.lynx.bundle");
    log.info("     to android/app/src/main/assets/ manually");
    log.info("  2. Connect a device, then run: lynx run android");
  } else {
    log.info("  1. Connect a device, then run: lynx run android");
  }
  log.blank();
}
