android {
    namespace "com.etenterprises.vitalink"
    compileSdk 36

    defaultConfig {
        applicationId "com.etenterprises.vitalink"
        minSdkVersion flutter.minSdkVersion
        targetSdk 36
        versionCode 1
        versionName "1.0.0"
        multiDexEnabled true
    }

    buildTypes {
        release {
            minifyEnabled false
            shrinkResources false
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
            signingConfig signingConfigs.debug
        }
    }

    compileOptions {
        sourceCompatibility JavaVersion.VERSION_17
        targetCompatibility JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = '17'
    }

    // ✅ Fix duplicate Firebase IID conflict
    configurations.all {
        exclude group: "com.google.firebase", module: "firebase-iid"
    }
}
