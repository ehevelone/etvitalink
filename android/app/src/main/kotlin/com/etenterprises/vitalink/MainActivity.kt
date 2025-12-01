package com.etenterprises.vitalink

import android.content.Intent
import android.os.Bundle
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel

class MainActivity : FlutterActivity() {

    private val NAV_CHANNEL = "vitalink/navigation"

    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)
        handleEmergencyIntent(intent)
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        handleEmergencyIntent(intent)
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        handleEmergencyIntent(intent)
    }

    override fun onResume() {
        super.onResume()
        handleEmergencyIntent(intent)
    }

    private fun handleEmergencyIntent(intent: Intent?) {
        if (intent == null) return
        val navTarget = intent.getStringExtra("navigate_to") ?: return
        if (navTarget != "emergency") return

        // Tell Flutter to open Emergency screen
        MethodChannel(
            flutterEngine!!.dartExecutor.binaryMessenger,
            NAV_CHANNEL
        ).invokeMethod("openEmergency", null)
    }
}
