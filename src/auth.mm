// Native half of mac-security. It returns raw LAError codes only; the kind mapping lives in index.js.
#import <Foundation/Foundation.h>
#import <LocalAuthentication/LocalAuthentication.h>

#include <atomic>
#include <memory>
#include <napi.h>

namespace {

// Code handed to JS when the reply carries neither success nor an error (should not happen).
constexpr int kNoErrorCode = -10;  // LAErrorInvalidContext -> "failed"

// Owns the promise until the reply block hands the result back to the JS thread.
struct Pending {
  explicit Pending(Napi::Env env) : deferred(Napi::Promise::Deferred::New(env)) {}
  Napi::Promise::Deferred deferred;
  int code = 0;
};

// canAuthenticate(): { available, biometry }. Never throws.
Napi::Value CanAuthenticate(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  bool available = false;
  const char* biometry = "none";
  @autoreleasepool {
    LAContext* context = [[LAContext alloc] init];
    NSError* error = nil;
    available = [context canEvaluatePolicy:LAPolicyDeviceOwnerAuthentication error:&error] == YES;
    // biometryType is only filled in after canEvaluatePolicy ran.
    if (context.biometryType == LABiometryTypeTouchID) {
      biometry = "touchid";
    } else if (context.biometryType == LABiometryTypeFaceID) {
      biometry = "faceid";
    }
  }
  Napi::Object result = Napi::Object::New(env);
  result.Set("available", Napi::Boolean::New(env, available));
  result.Set("biometry", Napi::String::New(env, biometry));
  return result;
}

// authenticate(reason): Promise<number>. Resolves 0 on success, otherwise the LAError code.
Napi::Value Authenticate(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (info.Length() < 1 || !info[0].IsString()) {
    Napi::TypeError::New(env, "reason must be a string").ThrowAsJavaScriptException();
    return env.Undefined();
  }
  std::string reasonUtf8 = info[0].As<Napi::String>().Utf8Value();

  auto* pending = new Pending(env);
  Napi::Promise promise = pending->deferred.Promise();

  Napi::ThreadSafeFunction tsfn = Napi::ThreadSafeFunction::New(
      env, Napi::Function::New(env, [](const Napi::CallbackInfo&) {}), "mac-security-authenticate", 0, 1);

  NSString* reason = [NSString stringWithUTF8String:reasonUtf8.c_str()];
  if (reason == nil) {
    reason = @"";
  }
  // The window is shown by evaluatePolicy; canEvaluatePolicy is deliberately not called first.
  // The context stays alive (the block retains it) until the reply, then is invalidated.
  LAContext* context = [[LAContext alloc] init];
  auto answered = std::make_shared<std::atomic<bool>>(false);
  [context evaluatePolicy:LAPolicyDeviceOwnerAuthentication
          localizedReason:reason
                    reply:^(BOOL success, NSError* _Nullable error) {
                      // The reply is delivered once; guard anyway.
                      if (answered->exchange(true)) {
                        return;
                      }
                      if (success) {
                        pending->code = 0;
                      } else if (error != nil && error.code != 0) {
                        pending->code = static_cast<int>(error.code);
                      } else {
                        pending->code = kNoErrorCode;
                      }
                      [context invalidate];
                      // The reply runs on a LocalAuthentication background queue; finish on the JS thread.
                      napi_status status = tsfn.BlockingCall(
                          pending, [](Napi::Env env, Napi::Function, Pending* done) {
                            done->deferred.Resolve(Napi::Number::New(env, done->code));
                            delete done;
                          });
                      if (status != napi_ok) {
                        // Environment is shutting down; deleting off the JS thread would touch N-API handles, so leak it.
                      }
                      tsfn.Release();
                    }];
  return promise;
}

Napi::Object Init(Napi::Env env, Napi::Object exports) {
  exports.Set("canAuthenticate", Napi::Function::New(env, CanAuthenticate));
  exports.Set("authenticate", Napi::Function::New(env, Authenticate));
  return exports;
}

}  // namespace

NODE_API_MODULE(mac_security, Init)
