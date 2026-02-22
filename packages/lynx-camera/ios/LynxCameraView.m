#import "LynxCameraView.h"

#import <AVFoundation/AVFoundation.h>
#import <UIKit/UIKit.h>

// ---------------------------------------------------------------------------
// Internal camera preview UIView
// ---------------------------------------------------------------------------

/**
 * A bare UIView that hosts an @c AVCaptureVideoPreviewLayer as its backing layer.
 * Resizes automatically on layout changes (e.g. orientation).
 */
@interface LynxCameraPreviewView : UIView

/** The capture session to display. Set before @c layoutSubviews is called. */
@property (nonatomic, strong, nullable) AVCaptureSession *captureSession;

@end

@implementation LynxCameraPreviewView

+ (Class)layerClass {
    return [AVCaptureVideoPreviewLayer class];
}

- (AVCaptureVideoPreviewLayer *)videoPreviewLayer {
    return (AVCaptureVideoPreviewLayer *)self.layer;
}

- (void)setSession:(AVCaptureSession *)session {
    self.videoPreviewLayer.session = session;
    self.videoPreviewLayer.videoGravity = AVLayerVideoGravityResizeAspectFill;
}

- (void)layoutSubviews {
    [super layoutSubviews];
    self.videoPreviewLayer.frame = self.bounds;
}

@end

// ---------------------------------------------------------------------------
// LynxCameraView implementation
// ---------------------------------------------------------------------------

@interface LynxCameraView () <AVCapturePhotoCaptureDelegate>

// AVFoundation
@property (nonatomic, strong, nullable) AVCaptureSession       *captureSession;
@property (nonatomic, strong, nullable) AVCapturePhotoOutput   *photoOutput;
@property (nonatomic, strong, nullable) AVCaptureDeviceInput   *currentVideoInput;
@property (nonatomic, strong, nullable) LynxCameraPreviewView  *previewView;

// State
@property (nonatomic, copy)   NSString *device;       // "front" | "back"
@property (nonatomic, copy)   NSString *flashMode;    // "auto" | "on" | "off" | "torch"
@property (nonatomic, copy)   NSString *focusMode;    // "auto" | "tap" | "continuous"
@property (nonatomic, assign) CGFloat   zoomLevel;    // ≥ 1.0
@property (nonatomic, assign) BOOL      enableTorch;

// Pending photo callback (strong reference until the delegate fires)
@property (nonatomic, copy, nullable) void (^pendingPhotoCallback)(NSDictionary * _Nullable result,
                                                                    NSString * _Nullable errorCode,
                                                                    NSString * _Nullable errorMessage);

// Dispatch queue for all session mutations
@property (nonatomic, strong) dispatch_queue_t sessionQueue;

// Pinch gesture for zoom
@property (nonatomic, strong) UIPinchGestureRecognizer *pinchGestureRecognizer;

// Background/foreground observer tokens
@property (nonatomic, strong) id<NSObject>  backgroundObserver;
@property (nonatomic, strong) id<NSObject>  foregroundObserver;

@end

@implementation LynxCameraView

// ---------------------------------------------------------------------------
// LynxUI registration
// ---------------------------------------------------------------------------

/**
 * The tag name used in JSX: @c <camera />.
 * Must match the @c componentTag in @c lynx.module.json.
 */
+ (NSString *)name {
    return @"camera";
}

/**
 * Map JS attribute names → Objective-C property setters.
 * Key = attribute name as it appears on the element in JSX.
 * Value = Objective-C selector string.
 */
+ (NSDictionary<NSString *, NSString *> *)propSetterLookup {
    return @{
        @"device":       NSStringFromSelector(@selector(setDeviceProp:)),
        @"flash-mode":   NSStringFromSelector(@selector(setFlashModeProp:)),
        @"focus-mode":   NSStringFromSelector(@selector(setFocusModeProp:)),
        @"zoom":         NSStringFromSelector(@selector(setZoomProp:)),
        @"enable-torch": NSStringFromSelector(@selector(setEnableTorchProp:)),
    };
}

/**
 * Map JS method names (passed to @c invoke) → Objective-C selectors.
 */
+ (NSDictionary<NSString *, NSString *> *)methodLookup {
    return @{
        @"takePhoto":    NSStringFromSelector(@selector(takePhoto:callback:)),
        @"switchCamera": NSStringFromSelector(@selector(switchCamera:callback:)),
        @"setZoom":      NSStringFromSelector(@selector(setZoomMethod:callback:)),
        @"setFlash":     NSStringFromSelector(@selector(setFlashMethod:callback:)),
        @"focus":        NSStringFromSelector(@selector(focusMethod:callback:)),
    };
}

// ---------------------------------------------------------------------------
// Init / dealloc
// ---------------------------------------------------------------------------

- (instancetype)init {
    self = [super init];
    if (self) {
        _device = @"back";
        _flashMode = @"auto";
        _focusMode = @"continuous";
        _zoomLevel = 1.0f;
        _enableTorch = NO;
        _sessionQueue = dispatch_queue_create("com.kafitra.lynxcamera.session",
                                              DISPATCH_QUEUE_SERIAL);
    }
    return self;
}

// ---------------------------------------------------------------------------
// View creation (LynxUI hook)
// ---------------------------------------------------------------------------

- (UIView *)createView {
    self.previewView = [[LynxCameraPreviewView alloc] init];
    self.previewView.backgroundColor = [UIColor blackColor];
    self.previewView.clipsToBounds = YES;

    // Pinch-to-zoom
    self.pinchGestureRecognizer = [[UIPinchGestureRecognizer alloc]
                                    initWithTarget:self
                                            action:@selector(handlePinch:)];
    [self.previewView addGestureRecognizer:self.pinchGestureRecognizer];

    // Tap-to-focus
    UITapGestureRecognizer *tapRecognizer = [[UITapGestureRecognizer alloc]
                                              initWithTarget:self
                                                      action:@selector(handleTap:)];
    [self.previewView addGestureRecognizer:tapRecognizer];

    return self.previewView;
}

// ---------------------------------------------------------------------------
// Lifecycle — window attachment (LynxUI hooks)
// ---------------------------------------------------------------------------

- (void)didMoveToWindow {
    [super didMoveToWindow];
    if (self.view.window) {
        [self requestPermissionAndStartSession];
        [self registerLifecycleObservers];
    }
}

- (void)willMoveToWindow:(nullable UIWindow *)newWindow {
    [super willMoveToWindow:newWindow];
    if (!newWindow) {
        [self stopSession];
        [self unregisterLifecycleObservers];
    }
}

// ---------------------------------------------------------------------------
// Permission & session management
// ---------------------------------------------------------------------------

- (void)requestPermissionAndStartSession {
    AVAuthorizationStatus status =
        [AVCaptureDevice authorizationStatusForMediaType:AVMediaTypeVideo];

    switch (status) {
        case AVAuthorizationStatusAuthorized:
            [self startSession];
            break;

        case AVAuthorizationStatusNotDetermined:
            [AVCaptureDevice requestAccessForMediaType:AVMediaTypeVideo
                                     completionHandler:^(BOOL granted) {
                dispatch_async(dispatch_get_main_queue(), ^{
                    if (granted) {
                        [self startSession];
                    } else {
                        [self emitError:@"PERMISSION_DENIED"
                                message:@"Camera access was denied. Add NSCameraUsageDescription to Info.plist."];
                    }
                });
            }];
            break;

        case AVAuthorizationStatusDenied:
        case AVAuthorizationStatusRestricted:
        default:
            [self emitError:@"PERMISSION_DENIED"
                    message:@"Camera access denied. Go to Settings to allow camera access."];
            break;
    }
}

- (void)startSession {
    dispatch_async(self.sessionQueue, ^{
        if (self.captureSession && self.captureSession.isRunning) return;

        self.captureSession = [[AVCaptureSession alloc] init];
        [self.captureSession beginConfiguration];

        self.captureSession.sessionPreset = AVCaptureSessionPresetPhoto;

        // Add video input
        if (![self addVideoInputForDevice:self.device]) {
            [self.captureSession commitConfiguration];
            return;
        }

        // Add photo output
        self.photoOutput = [[AVCapturePhotoOutput alloc] init];
        if ([self.captureSession canAddOutput:self.photoOutput]) {
            [self.captureSession addOutput:self.photoOutput];
        }

        [self.captureSession commitConfiguration];

        dispatch_async(dispatch_get_main_queue(), ^{
            if (self.previewView) {
                [self.previewView setSession:self.captureSession];
            }
        });

        [self.captureSession startRunning];

        dispatch_async(dispatch_get_main_queue(), ^{
            [self applyZoomTo:self.zoomLevel];
            [self applyTorch:self.enableTorch];
            [self emitCameraReady];
        });
    });
}

- (void)stopSession {
    dispatch_async(self.sessionQueue, ^{
        if (self.captureSession.isRunning) {
            [self.captureSession stopRunning];
        }
        self.captureSession = nil;
        self.photoOutput = nil;
        self.currentVideoInput = nil;
    });
}

/**
 * Adds the AVCaptureDeviceInput for the given camera position.
 * Must be called inside @c sessionQueue while the session is in configuration.
 */
- (BOOL)addVideoInputForDevice:(NSString *)devicePosition {
    AVCaptureDevicePosition position = [devicePosition isEqualToString:@"front"]
        ? AVCaptureDevicePositionFront
        : AVCaptureDevicePositionBack;

    AVCaptureDevice *device =
        [AVCaptureDevice defaultDeviceWithDeviceType:AVCaptureDeviceTypeBuiltInWideAngleCamera
                                           mediaType:AVMediaTypeVideo
                                            position:position];

    if (!device) {
        dispatch_async(dispatch_get_main_queue(), ^{
            [self emitError:@"CAMERA_UNAVAILABLE"
                    message:[NSString stringWithFormat:@"No %@ camera found.", devicePosition]];
        });
        return NO;
    }

    NSError *error = nil;
    AVCaptureDeviceInput *input = [AVCaptureDeviceInput deviceInputWithDevice:device
                                                                        error:&error];
    if (!input || error) {
        dispatch_async(dispatch_get_main_queue(), ^{
            [self emitError:@"SESSION_ERROR"
                    message:error.localizedDescription ?: @"Failed to create camera input."];
        });
        return NO;
    }

    if (self.currentVideoInput) {
        [self.captureSession removeInput:self.currentVideoInput];
    }

    if ([self.captureSession canAddInput:input]) {
        [self.captureSession addInput:input];
        self.currentVideoInput = input;
        return YES;
    } else {
        dispatch_async(dispatch_get_main_queue(), ^{
            [self emitError:@"SESSION_ERROR" message:@"Cannot add camera input to session."];
        });
        return NO;
    }
}

// ---------------------------------------------------------------------------
// App lifecycle observers
// ---------------------------------------------------------------------------

- (void)registerLifecycleObservers {
    NSNotificationCenter *nc = [NSNotificationCenter defaultCenter];

    __weak typeof(self) weakSelf = self;
    self.backgroundObserver = [nc addObserverForName:UIApplicationDidEnterBackgroundNotification
                                              object:nil
                                               queue:[NSOperationQueue mainQueue]
                                          usingBlock:^(NSNotification * _Nonnull note) {
        dispatch_async(weakSelf.sessionQueue, ^{
            if (weakSelf.captureSession.isRunning) {
                [weakSelf.captureSession stopRunning];
            }
        });
    }];

    self.foregroundObserver = [nc addObserverForName:UIApplicationWillEnterForegroundNotification
                                              object:nil
                                               queue:[NSOperationQueue mainQueue]
                                          usingBlock:^(NSNotification * _Nonnull note) {
        dispatch_async(weakSelf.sessionQueue, ^{
            if (weakSelf.captureSession && !weakSelf.captureSession.isRunning) {
                [weakSelf.captureSession startRunning];
            }
        });
    }];
}

- (void)unregisterLifecycleObservers {
    NSNotificationCenter *nc = [NSNotificationCenter defaultCenter];
    if (self.backgroundObserver) {
        [nc removeObserver:self.backgroundObserver];
        self.backgroundObserver = nil;
    }
    if (self.foregroundObserver) {
        [nc removeObserver:self.foregroundObserver];
        self.foregroundObserver = nil;
    }
}

// ---------------------------------------------------------------------------
// Prop setters (called by Lynx runtime)
// ---------------------------------------------------------------------------

- (void)setDeviceProp:(NSString *)value {
    if (!value || [value isEqualToString:self.device]) return;
    self.device = value;
    [self switchCameraTo:value];
}

- (void)setFlashModeProp:(NSString *)value {
    if (!value) return;
    self.flashMode = value;
    if ([value isEqualToString:@"torch"]) {
        [self applyTorch:YES];
    } else {
        [self applyTorch:NO];
    }
}

- (void)setFocusModeProp:(NSString *)value {
    if (!value) return;
    self.focusMode = value;
    if ([value isEqualToString:@"continuous"]) {
        [self applyContinuousAutoFocus];
    }
}

- (void)setZoomProp:(NSNumber *)value {
    if (!value) return;
    CGFloat level = [value floatValue];
    self.zoomLevel = level;
    [self applyZoomTo:level];
}

- (void)setEnableTorchProp:(NSString *)value {
    BOOL enable = [value isEqualToString:@"true"];
    self.enableTorch = enable;
    [self applyTorch:enable];
}

// ---------------------------------------------------------------------------
// Method implementations (called via NodesRef.invoke)
// ---------------------------------------------------------------------------

- (void)takePhoto:(nullable NSDictionary *)params
         callback:(void (^)(NSDictionary * _Nullable result))callback {
    if (!PermissionHelper_iOS_hasCameraPermission()) {
        if (callback) callback([self errorDict:@"PERMISSION_DENIED"
                                       message:@"Camera access not authorized."]);
        return;
    }
    if (!self.photoOutput) {
        if (callback) callback([self errorDict:@"CAMERA_NOT_READY"
                                       message:@"Camera session is not started yet."]);
        return;
    }

    self.pendingPhotoCallback = ^(NSDictionary *result,
                                  NSString *errorCode,
                                  NSString *errorMessage) {
        if (callback) {
            if (result) {
                callback(@{ @"code": @(0), @"data": result });
            } else {
                callback(@{
                    @"code": @(-1),
                    @"error": [NSString stringWithFormat:@"%@: %@", errorCode, errorMessage],
                });
            }
        }
    };

    AVCapturePhotoSettings *settings =
        [AVCapturePhotoSettings photoSettingsWithFormat:@{
            AVVideoCodecKey: AVVideoCodecTypeJPEG,
        }];

    // Apply flash
    if ([self.flashMode isEqualToString:@"on"] &&
        self.photoOutput.supportedFlashModes.count > 0) {
        settings.flashMode = AVCaptureFlashModeOn;
    } else if ([self.flashMode isEqualToString:@"off"]) {
        settings.flashMode = AVCaptureFlashModeOff;
    } else {
        settings.flashMode = AVCaptureFlashModeAuto;
    }

    [self.photoOutput capturePhotoWithSettings:settings delegate:self];
}

- (void)switchCamera:(nullable NSDictionary *)params
            callback:(void (^)(NSDictionary * _Nullable result))callback {
    NSString *newDevice = [self.device isEqualToString:@"front"] ? @"back" : @"front";
    self.device = newDevice;
    [self switchCameraTo:newDevice];
    if (callback) callback(@{ @"code": @(0) });
}

- (void)setZoomMethod:(nullable NSDictionary *)params
             callback:(void (^)(NSDictionary * _Nullable result))callback {
    CGFloat level = params ? [params[@"level"] floatValue] : 1.0f;
    self.zoomLevel = level;
    [self applyZoomTo:level];
    if (callback) callback(@{ @"code": @(0) });
}

- (void)setFlashMethod:(nullable NSDictionary *)params
              callback:(void (^)(NSDictionary * _Nullable result))callback {
    NSString *mode = params ? params[@"mode"] : @"auto";
    self.flashMode = mode ?: @"auto";
    if (callback) callback(@{ @"code": @(0) });
}

- (void)focusMethod:(nullable NSDictionary *)params
           callback:(void (^)(NSDictionary * _Nullable result))callback {
    CGFloat x = params ? [params[@"x"] floatValue] : 0;
    CGFloat y = params ? [params[@"y"] floatValue] : 0;
    [self triggerFocusAtPoint:CGPointMake(x, y)];
    if (callback) callback(@{ @"code": @(0) });
}

// ---------------------------------------------------------------------------
// AVCapturePhotoCaptureDelegate
// ---------------------------------------------------------------------------

- (void)captureOutput:(AVCapturePhotoOutput *)output
didFinishProcessingPhoto:(AVCapturePhoto *)photo
                error:(nullable NSError *)error {
    if (!self.pendingPhotoCallback) return;
    void (^cb)(NSDictionary *, NSString *, NSString *) = self.pendingPhotoCallback;
    self.pendingPhotoCallback = nil;

    if (error) {
        cb(nil, @"CAPTURE_FAILED", error.localizedDescription);
        dispatch_async(dispatch_get_main_queue(), ^{
            [self emitError:@"CAPTURE_FAILED" message:error.localizedDescription];
        });
        return;
    }

    NSData *imageData = [photo fileDataRepresentation];
    if (!imageData) {
        cb(nil, @"CAPTURE_FAILED", @"Could not get image data from captured photo.");
        return;
    }

    // Save to temporary directory
    NSString *tempDir = NSTemporaryDirectory();
    NSString *timestamp = [NSString stringWithFormat:@"%.0f",
                           [[NSDate date] timeIntervalSince1970] * 1000];
    NSString *fileName = [NSString stringWithFormat:@"lynx_camera_%@.jpg", timestamp];
    NSString *filePath = [tempDir stringByAppendingPathComponent:fileName];

    BOOL saved = [imageData writeToFile:filePath atomically:YES];
    if (!saved) {
        cb(nil, @"CAPTURE_FAILED", @"Failed to write image to temp file.");
        return;
    }

    UIImage *image = [UIImage imageWithData:imageData];
    NSInteger width = image ? (NSInteger)image.size.width : 0;
    NSInteger height = image ? (NSInteger)image.size.height : 0;

    NSString *uri = [NSString stringWithFormat:@"file://%@", filePath];
    NSDictionary *result = @{
        @"uri":    uri,
        @"width":  @(width),
        @"height": @(height),
    };

    cb(result, nil, nil);

    NSDictionary *detail = @{
        @"uri":    uri,
        @"width":  @(width),
        @"height": @(height),
    };
    dispatch_async(dispatch_get_main_queue(), ^{
        [self emitPhotoCaptured:detail];
    });
}

// ---------------------------------------------------------------------------
// Camera controls
// ---------------------------------------------------------------------------

- (void)switchCameraTo:(NSString *)newDevice {
    dispatch_async(self.sessionQueue, ^{
        if (!self.captureSession) return;
        [self.captureSession beginConfiguration];
        [self addVideoInputForDevice:newDevice];
        [self.captureSession commitConfiguration];
    });
}

- (void)applyZoomTo:(CGFloat)level {
    AVCaptureDevice *device = self.currentVideoInput.device;
    if (!device) return;

    NSError *error = nil;
    if ([device lockForConfiguration:&error]) {
        CGFloat min = device.activeFormat.videoMinZoomFactor;
        CGFloat max = MIN(device.activeFormat.videoMaxZoomFactor, 10.0f);
        CGFloat clamped = MAX(min, MIN(max, level));
        device.videoZoomFactor = clamped;
        [device unlockForConfiguration];
    }
}

- (void)applyTorch:(BOOL)enable {
    AVCaptureDevice *device = self.currentVideoInput.device;
    if (!device || ![device hasTorch]) return;

    NSError *error = nil;
    if ([device lockForConfiguration:&error]) {
        device.torchMode = enable ? AVCaptureTorchModeOn : AVCaptureTorchModeOff;
        [device unlockForConfiguration];
    }
}

- (void)applyContinuousAutoFocus {
    AVCaptureDevice *device = self.currentVideoInput.device;
    if (!device) return;

    NSError *error = nil;
    if ([device lockForConfiguration:&error]) {
        if ([device isFocusModeSupported:AVCaptureFocusModeContinuousAutoFocus]) {
            device.focusMode = AVCaptureFocusModeContinuousAutoFocus;
        }
        if ([device isExposureModeSupported:AVCaptureExposureModeContinuousAutoExposure]) {
            device.exposureMode = AVCaptureExposureModeContinuousAutoExposure;
        }
        [device unlockForConfiguration];
    }
}

- (void)triggerFocusAtPoint:(CGPoint)viewPoint {
    if (!self.previewView || !self.currentVideoInput) return;

    // Convert view coordinates → camera coordinates (0,0)-(1,1)
    CGPoint devicePoint = [self.previewView.videoPreviewLayer
                           captureDevicePointOfInterestForPoint:viewPoint];

    AVCaptureDevice *device = self.currentVideoInput.device;
    NSError *error = nil;
    if ([device lockForConfiguration:&error]) {
        if ([device isFocusPointOfInterestSupported]) {
            device.focusPointOfInterest = devicePoint;
            device.focusMode = AVCaptureFocusModeAutoFocus;
        }
        if ([device isExposurePointOfInterestSupported]) {
            device.exposurePointOfInterest = devicePoint;
            device.exposureMode = AVCaptureExposureModeAutoExpose;
        }
        [device unlockForConfiguration];
    }
}

// ---------------------------------------------------------------------------
// Gesture handlers
// ---------------------------------------------------------------------------

- (void)handlePinch:(UIPinchGestureRecognizer *)gesture {
    if (gesture.state == UIGestureRecognizerStateBegan) {
        gesture.scale = self.zoomLevel;
    }
    CGFloat newLevel = gesture.scale;
    self.zoomLevel = newLevel;
    [self applyZoomTo:newLevel];

    // Emit zoom changed event
    [self emitZoomChanged:newLevel];
}

- (void)handleTap:(UITapGestureRecognizer *)gesture {
    if (![@"tap" isEqualToString:self.focusMode]) return;
    CGPoint point = [gesture locationInView:self.previewView];
    [self triggerFocusAtPoint:point];
}

// ---------------------------------------------------------------------------
// Event emitters
// ---------------------------------------------------------------------------

- (void)emitCameraReady {
    [self emitEvent:@"cameraready" withDetail:@{}];
}

- (void)emitPhotoCaptured:(NSDictionary *)detail {
    [self emitEvent:@"photocaptured" withDetail:detail];
}

- (void)emitError:(NSString *)code message:(NSString *)message {
    [self emitEvent:@"error" withDetail:@{
        @"code":    code,
        @"message": message ?: @"",
    }];
}

- (void)emitZoomChanged:(CGFloat)zoom {
    [self emitEvent:@"zoomchanged" withDetail:@{ @"zoom": @(zoom) }];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Returns an error dictionary in the format expected by the method callback. */
- (NSDictionary *)errorDict:(NSString *)code message:(NSString *)message {
    return @{
        @"code":  @(-1),
        @"error": [NSString stringWithFormat:@"%@: %@", code, message],
    };
}

/** Convenience C function for permission check (avoids ObjC message send in a pure C context). */
static BOOL PermissionHelper_iOS_hasCameraPermission(void) {
    return [AVCaptureDevice authorizationStatusForMediaType:AVMediaTypeVideo]
           == AVAuthorizationStatusAuthorized;
}

@end
