/**
 * @kafitra/lynx-device-info
 *
 * iOS native module — provides device information through the Lynx Module system.
 *
 * Registration (in your LynxInitProcessor or app delegate):
 *
 *   #import "LynxDeviceInfoModule.h"
 *   [globalConfig registerModule:LynxDeviceInfoModule.class];
 */

#import <Foundation/Foundation.h>
#import <Lynx/LynxModule.h>

NS_ASSUME_NONNULL_BEGIN

@interface LynxDeviceInfoModule : NSObject <LynxModule>
@end

NS_ASSUME_NONNULL_END
