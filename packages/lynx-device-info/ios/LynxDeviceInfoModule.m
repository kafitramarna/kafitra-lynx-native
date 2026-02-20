#import "LynxDeviceInfoModule.h"
#import <UIKit/UIKit.h>

@implementation LynxDeviceInfoModule

// ---------------------------------------------------------------------------
// Lynx module identity — must match the key used in NativeModules on the JS side
// ---------------------------------------------------------------------------

+ (NSString *)name {
    return @"LynxDeviceInfo";
}

// ---------------------------------------------------------------------------
// Method lookup — maps JS method names to Objective-C selectors
// ---------------------------------------------------------------------------

+ (NSDictionary<NSString *, NSString *> *)methodLookup {
    return @{
        @"getBrand":        NSStringFromSelector(@selector(getBrand)),
        @"getModel":        NSStringFromSelector(@selector(getModel)),
        @"getSDKVersion":   NSStringFromSelector(@selector(getSDKVersion)),
        @"getManufacturer": NSStringFromSelector(@selector(getManufacturer)),
        @"getDeviceId":     NSStringFromSelector(@selector(getDeviceId)),
        @"getSystemName":   NSStringFromSelector(@selector(getSystemName)),
        @"getSystemVersion":NSStringFromSelector(@selector(getSystemVersion)),
    };
}

// ---------------------------------------------------------------------------
// Method implementations
// ---------------------------------------------------------------------------

/**
 * Returns the device brand.
 * Apple devices always belong to the "Apple" brand.
 */
- (NSString *)getBrand {
    return @"Apple";
}

/**
 * Returns the device model description (e.g., "iPhone", "iPad").
 */
- (NSString *)getModel {
    NSString *model = [UIDevice currentDevice].model;
    return (model.length > 0) ? model : @"unknown";
}

/**
 * iOS has no concept of an Android SDK version.
 * Returns 0 to satisfy the shared numeric type contract.
 */
- (double)getSDKVersion {
    return 0;
}

/**
 * Returns the device manufacturer.
 * All Apple devices are manufactured by Apple.
 */
- (NSString *)getManufacturer {
    return @"Apple";
}

/**
 * Returns a stable device identifier using identifierForVendor.
 * This UUID is stable across app launches but may change after
 * the app is uninstalled and reinstalled.
 * Falls back to an empty string if unavailable.
 */
- (NSString *)getDeviceId {
    NSUUID *uuid = [UIDevice currentDevice].identifierForVendor;
    if (uuid != nil) {
        return uuid.UUIDString;
    }
    return @"";
}

/**
 * Returns the operating system name (e.g., "iOS", "iPadOS").
 */
- (NSString *)getSystemName {
    NSString *name = [UIDevice currentDevice].systemName;
    return (name.length > 0) ? name : @"iOS";
}

/**
 * Returns the operating system version string (e.g., "17.0").
 */
- (NSString *)getSystemVersion {
    NSString *version = [UIDevice currentDevice].systemVersion;
    return (version.length > 0) ? version : @"unknown";
}

@end
