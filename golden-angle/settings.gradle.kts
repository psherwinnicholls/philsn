pluginManagement {
    // Google's Maven is only needed for the Android app module; skipping it when
    // there is no SDK lets the pure-Kotlin modules build on machines without one.
    val androidSdk = System.getenv("ANDROID_HOME") != null ||
        System.getenv("ANDROID_SDK_ROOT") != null ||
        file("local.properties").let { it.exists() && it.readText().contains("sdk.dir") }
    repositories {
        if (androidSdk) google()
        mavenCentral()
        gradlePluginPortal()
    }
    plugins {
        id("com.android.application") version "8.11.1"
        id("org.jetbrains.kotlin.android") version "2.1.21"
        id("org.jetbrains.kotlin.jvm") version "2.1.21"
        id("org.jetbrains.kotlin.plugin.compose") version "2.1.21"
    }
}

val hasAndroidSdk = System.getenv("ANDROID_HOME") != null ||
    System.getenv("ANDROID_SDK_ROOT") != null ||
    file("local.properties").let { it.exists() && it.readText().contains("sdk.dir") }

dependencyResolutionManagement {
    repositories {
        if (hasAndroidSdk) google()
        mavenCentral()
    }
}

rootProject.name = "golden-angle"

include(":core", ":tools")
if (hasAndroidSdk) include(":app")
