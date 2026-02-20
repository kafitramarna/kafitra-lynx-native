package com.kafitra.demo2;

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
