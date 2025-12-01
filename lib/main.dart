// lib/main.dart
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

// Firebase
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';

// Local services
import 'services/api_service.dart';
import 'services/secure_store.dart';

// Core screens
import 'screens/landing_screen.dart';
import 'screens/splash_screen.dart';
import 'screens/registration_screen.dart';
import 'screens/login_screen.dart';
import 'screens/menu_screen.dart';
import 'screens/agent_menu.dart';
import 'screens/agent_registration_screen.dart';
import 'screens/agent_login_screen.dart';
import 'screens/terms_user_screen.dart';
import 'screens/terms_agent_screen.dart';
import 'screens/logo_screen.dart';
import 'screens/welcome_screen.dart';
import 'screens/my_agent_user.dart';
import 'screens/my_agent_agent.dart';
import 'screens/emergency_screen.dart';
import 'screens/emergency_view.dart';
import 'screens/my_profile_screen.dart';

// Medical / Insurance
import 'screens/meds_screen.dart';
import 'screens/doctors_screen.dart';
import 'screens/doctors_view.dart';
import 'screens/insurance_policies.dart';
import 'screens/insurance_policy_view.dart';
import 'screens/insurance_policy_form.dart';
import 'screens/insurance_cards.dart';
import 'screens/insurance_cards_menu.dart';
import 'screens/insurance_card_detail.dart';

// HIPAA + SOA
import 'screens/hipaa_form_screen.dart';

// Utilities
import 'screens/scan_card.dart';

// Password reset
import 'screens/request_reset_screen.dart';
import 'screens/reset_password_screen.dart';
import 'screens/agent_request_reset_screen.dart';
import 'screens/agent_reset_password_screen.dart';

// Household / Family profiles
import 'screens/new_profile_screen.dart';
import 'screens/profile_picker.dart';
import 'screens/profile_manager.dart';

import 'models.dart';

/// 🔥 REQUIRED for Android Lock-Screen shortcut
final GlobalKey<NavigatorState> navigatorKey = GlobalKey<NavigatorState>();
const MethodChannel _navChannel = MethodChannel("vitalink/navigation");

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  await SystemChrome.setPreferredOrientations([DeviceOrientation.portraitUp]);

  await Firebase.initializeApp();
  FirebaseMessaging.onBackgroundMessage(_firebaseMessagingBackgroundHandler);
  await _setupFirebaseTokenListener();

  runApp(const VitaLinkApp());

  /// 🔥 Listen for quick-access "openEmergency" Android lock-screen shortcut
  _navChannel.setMethodCallHandler((call) async {
    if (call.method == "openEmergency") {
      navigatorKey.currentState?.pushNamedAndRemoveUntil(
        '/emergency',
        (route) => false,
      );
    }
    return null;
  });
}

@pragma('vm:entry-point')
Future<void> _firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  await Firebase.initializeApp();
  debugPrint('📩 Background message: ${message.messageId}');
}

Future<void> _setupFirebaseTokenListener() async {
  final fcm = FirebaseMessaging.instance;
  final store = SecureStore();

  await fcm.requestPermission();
  final token = await fcm.getToken();

  if (token != null) {
    final email = await store.getString('lastEmail');
    final role = await store.getString('lastRole');

    if (email != null && role != null) {
      await ApiService.registerDeviceToken(
        email: email,
        fcmToken: token,
        role: role,
      );
    }
  }

  fcm.onTokenRefresh.listen((newToken) async {
    final email = await store.getString('lastEmail');
    final role = await store.getString('lastRole');

    if (email != null && role != null) {
      await ApiService.registerDeviceToken(
        email: email,
        fcmToken: newToken,
        role: role,
      );
    }
  });
}

class VitaLinkApp extends StatelessWidget {
  const VitaLinkApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'VitaLink',
      debugShowCheckedModeBanner: false,

      navigatorKey: navigatorKey,

      theme: ThemeData(
        primarySwatch: Colors.blue,
        scaffoldBackgroundColor: Colors.white,
        appBarTheme: const AppBarTheme(
          backgroundColor: Colors.blue,
          foregroundColor: Colors.white,
        ),
      ),

      initialRoute: '/splash',

      routes: {
        '/landing': (context) => const LandingScreen(),
        '/splash': (context) => const SplashScreen(),
        '/login': (context) => const LoginScreen(),
        '/agent_login': (context) => const AgentLoginScreen(),
        '/menu': (context) => const MenuScreen(),
        '/agent_menu': (context) => AgentMenuScreen(),
        '/terms_user': (context) => const TermsUserScreen(),
        '/terms_agent': (context) => const TermsAgentScreen(),
        '/registration': (context) => const RegistrationScreen(),
        '/agent_registration': (context) => const AgentRegistrationScreen(),
        '/welcome': (context) => const WelcomeScreen(),
        '/my_profile': (context) => const MyProfileScreen(),
        '/logo': (context) => const LogoScreen(),
        '/my_agent_user': (context) => MyAgentUser(),
        '/my_agent_agent': (context) => MyAgentAgent(),
        '/emergency': (context) => EmergencyScreen(),
        '/emergency_view': (context) => EmergencyView(),
        '/meds': (context) => MedsScreen(),
        '/doctors': (context) => DoctorsScreen(),
        '/doctors_view': (context) => DoctorsView(),
        '/insurance_policies': (context) => InsurancePoliciesScreen(),
        '/insurance_cards_menu': (context) => InsuranceCardsMenuScreen(),
        '/authorization_form': (context) => const HipaaFormScreen(),
        '/new_profile': (context) => const NewProfileScreen(),
        '/profile_picker': (context) => const ProfilePickerScreen(),
        '/profile_manager': (context) => const ProfileManagerScreen(),
        '/scan_card': (context) => ScanCard(),
        '/request_reset': (context) => const RequestResetScreen(),
        '/reset_password': (context) => const ResetPasswordScreen(),
        '/agent_request_reset': (context) => const AgentRequestResetScreen(),
        '/agent_reset_password': (context) => const AgentResetPasswordScreen(),
      },

      onGenerateRoute: (settings) {
        switch (settings.name) {
          case '/insurance_policy_view':
            final index = settings.arguments as int;
            return MaterialPageRoute(
              builder: (_) => InsurancePolicyView(index: index),
            );

          case '/insurance_policy_form':
            final args = settings.arguments as Map<String, dynamic>;
            return MaterialPageRoute(
              builder: (_) => InsurancePolicyForm(
                policy: args['policy'] as Insurance,
                allPolicies: args['allPolicies'] as List<Insurance>,
              ),
            );

          case '/insurance_cards':
            final index = settings.arguments as int;
            return MaterialPageRoute(
              builder: (_) => InsuranceCardsScreen(index: index),
            );

          case '/insurance_card_detail':
            final card = settings.arguments as InsuranceCard;
            return MaterialPageRoute(
              builder: (_) => InsuranceCardDetail(card: card),
            );

          case '/reset_password':
            final emailOrPhone = settings.arguments as String?;
            return MaterialPageRoute(
              builder: (_) => ResetPasswordScreen(emailOrPhone: emailOrPhone),
            );

          case '/agent_reset_password':
            final emailOrPhone = settings.arguments as String?;
            return MaterialPageRoute(
              builder: (_) => AgentResetPasswordScreen(emailOrPhone: emailOrPhone),
            );
        }
        return null;
      },
    );
  }
}
