/**
 * @kafitra/lynx-storage
 *
 * iOS native module — persists key-value pairs in NSUserDefaults.
 *
 * Registration (in your LynxInitProcessor or app delegate):
 *
 *   #import "LynxStorageModule.h"
 *   [globalConfig registerModule:LynxStorageModule.class];
 */

#import <Foundation/Foundation.h>
#import <Lynx/LynxModule.h>

NS_ASSUME_NONNULL_BEGIN

@interface LynxStorageModule : NSObject <LynxModule>
@end

NS_ASSUME_NONNULL_END
