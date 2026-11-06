{
  "targets": [
    {
      "target_name": "mac_security",
      "conditions": [
        ["OS=='mac'", {
          "sources": ["src/auth.mm"],
          "include_dirs": ["<!(node -p \"require('node-addon-api').include_dir\")"],
          "defines": ["NAPI_VERSION=8", "NAPI_DISABLE_CPP_EXCEPTIONS"],
          "cflags_cc": ["-std=c++17"],
          "xcode_settings": {
            "CLANG_CXX_LANGUAGE_STANDARD": "c++17",
            "CLANG_ENABLE_OBJC_ARC": "YES",
            "GCC_ENABLE_CPP_EXCEPTIONS": "NO",
            "MACOSX_DEPLOYMENT_TARGET": "12.0",
            "OTHER_LDFLAGS": ["-framework LocalAuthentication", "-framework Foundation"]
          }
        }]
      ]
    }
  ]
}
