✅ Release APK built successfully! (app-release.apk — 52.2MB)

The root cause was two version mismatches:

Gradle 7.3.1 was far too old — Flutter's FlutterPlugin.kt uses filePermissions APIs introduced in Gradle 8.3+, which caused the Unresolved reference: filePermissions errors.
AGP 8.9.1 requires Gradle 8.11.1 minimum — even Gradle 8.9 wasn't enough.
Changes made:

gradle-wrapper.properties — upgraded from gradle-7.3.1-bin.zip → gradle-8.11.1-all.zip
build.gradle.kts — wrapped the compileSdk = 36 override in afterEvaluate to ensure it correctly applies to library subprojects like isar_flutter_libs (fixes the original android:attr/lStar error)
Your APK is at: build\app\outputs\flutter-apk\app-release.apk