#import "LynxStorageModule.h"

// NSUserDefaults suite name – isolates keys from app defaults
static NSString *const kSuiteName = @"com.kafitra.lynxstorage";

@implementation LynxStorageModule

// ---------------------------------------------------------------------------
// Lynx module identity
// ---------------------------------------------------------------------------

+ (NSString *)name {
    return @"LynxStorage";
}

// ---------------------------------------------------------------------------
// Method lookup — maps JS method names to Objective-C selectors
// ---------------------------------------------------------------------------

+ (NSDictionary<NSString *, NSString *> *)methodLookup {
    return @{
        @"getString":  NSStringFromSelector(@selector(getString:)),
        @"setString":  NSStringFromSelector(@selector(setString:value:)),
        @"remove":     NSStringFromSelector(@selector(remove:)),
        @"clear":      NSStringFromSelector(@selector(clear)),
        @"getAllKeys": NSStringFromSelector(@selector(getAllKeys)),
    };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

- (NSUserDefaults *)defaults {
    NSUserDefaults *d = [[NSUserDefaults alloc] initWithSuiteName:kSuiteName];
    return d ?: [NSUserDefaults standardUserDefaults];
}

// ---------------------------------------------------------------------------
// Method implementations
// ---------------------------------------------------------------------------

/**
 * Returns the stored string for @p key, or nil when absent.
 */
- (nullable NSString *)getString:(NSString *)key {
    @try {
        return [[self defaults] stringForKey:key];
    } @catch (NSException *e) {
        return nil;
    }
}

/**
 * Persists @p value under @p key.
 */
- (void)setString:(NSString *)key value:(NSString *)value {
    @try {
        [[self defaults] setObject:value forKey:key];
        [[self defaults] synchronize];
    } @catch (NSException *e) { }
}

/**
 * Removes the entry for @p key.
 */
- (void)remove:(NSString *)key {
    @try {
        [[self defaults] removeObjectForKey:key];
        [[self defaults] synchronize];
    } @catch (NSException *e) { }
}

/**
 * Clears all keys in the kafitra.lynxstorage suite.
 */
- (void)clear {
    @try {
        NSDictionary *dict = [[self defaults] dictionaryRepresentation];
        for (NSString *key in dict.allKeys) {
            [[self defaults] removeObjectForKey:key];
        }
        [[self defaults] synchronize];
    } @catch (NSException *e) { }
}

/**
 * Returns a JSON-encoded array of all stored keys.
 * e.g.  ["session","theme","lang"]
 */
- (NSString *)getAllKeys {
    @try {
        NSDictionary *dict = [[self defaults] dictionaryRepresentation];
        NSArray *keys = dict.allKeys;
        NSData *data = [NSJSONSerialization dataWithJSONObject:keys options:0 error:nil];
        return data ? [[NSString alloc] initWithData:data encoding:NSUTF8StringEncoding] : @"[]";
    } @catch (NSException *e) {
        return @"[]";
    }
}

@end
