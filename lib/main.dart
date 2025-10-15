import 'package:flutter/material.dart';
import 'package:flutter/services.dart'; // ✅ lock orientation

// Core screens
import 'screens/landing_screen.dart';
import 'screens/splash_screen.dart';
import 'screens/registration_screen.dart';
import 'screens/login_screen.dart';
import 'screens/account_setup_screen.dart';
import 'screens/menu_screen.dart';
import 'screens/agent_menu.dart';
import 'screens/agent_registration_screen.dart';
import 'screens/agent_login_screen.dart';
import 'screens/agent_setup_screen.dart';
import 'screens/terms_user_screen.dart';
import 'screens/terms_agent_screen.dart';
import 'screens/logo_screen.dart';
import 'screens/welcome_screen.dart';
import 'screens/my_agent_user.dart';
import 'screens/my_agent_agent.dart';
import 'screens/emergency_screen.dart';
import 'screens/emergency_view.dart';

// Medical / insurance data
import 'screens/meds_screen.dart';
import 'screens/doctors_screen.dart';
import 'screens/doctors_view.dart';
import 'screens/insurance_policies.dart';
import 'screens/insurance_policy_view.dart';
import 'screens/insurance_policy_form.dart';
import 'screens/insurance_cards.dart';
import 'screens/insurance_cards_menu.dart';
import 'screens/insurance_card_detail.dart';

// ✅ Unified HIPAA + SOA authorization form
import 'screens/hipaa_form_screen.dart';

// Utilities / scanning
import 'screens/scan_card.dart';

// Password reset flow (user + agent)
import 'screens/request_reset_screen.dart';
import 'screens/reset_password_screen.dart';
import 'screens/agent_request_reset_screen.dart';
import 'screens/agent_reset_password_screen.dart';

import 'models.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // ✅ Lock orientation to portrait
  await SystemChrome.setPreferredOrientations([
    DeviceOrientation.portraitUp,
  ]);

  runApp(const VitaLinkApp());
}

class VitaLinkApp extends StatelessWidget {
  const VitaLinkApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'VitaLink',
      theme: ThemeData(
        primarySwatch: Colors.blue,
        scaffoldBackgroundColor: Colors.white,
        appBarTheme: const AppBarTheme(
          backgroundColor: Colors.blue,
          foregroundColor: Colors.white,
        ),
      ),
      debugShowCheckedModeBanner: false,

      // 🚀 Start here
      initialRoute: '/splash',

      routes: {
        // Entry
        '/landing': (context) => const LandingScreen(),
        '/splash': (context) => const SplashScreen(),

        // User flow
        '/terms_user': (context) => const TermsUserScreen(),
        '/registration': (context) => const RegistrationScreen(),
        '/login': (context) => const LoginScreen(),
        '/account_setup': (context) => const AccountSetupScreen(),
        '/welcome': (context) => const WelcomeScreen(),
        '/menu': (context) => MenuScreen(), // 🔥 removed const
        '/my_agent_user': (context) => MyAgentUser(), // 🔥 removed const

        // Agent flow
        '/terms_agent': (context) => const TermsAgentScreen(),
        '/agent_registration': (context) => const AgentRegistrationScreen(),
        '/agent_login': (context) => const AgentLoginScreen(),
        '/agent_setup': (context) => const AgentSetupScreen(),
        '/agent_menu': (context) => AgentMenuScreen(), // 🔥 removed const
        '/my_agent_agent': (context) => MyAgentAgent(), // 🔥 removed const

        // Shared
        '/logo': (context) => const LogoScreen(),
        '/emergency': (context) => EmergencyScreen(), // 🔥 removed const
        '/emergency_view': (context) => EmergencyView(), // 🔥 removed const

        // Medical / insurance
        '/meds': (context) => MedsScreen(), // 🔥 removed const
        '/doctors': (context) => DoctorsScreen(), // 🔥 removed const
        '/doctors_view': (context) => DoctorsView(), // 🔥 removed const
        '/insurance_policies': (context) => InsurancePoliciesScreen(), // 🔥 removed const
        '/insurance_cards_menu': (context) => InsuranceCardsMenuScreen(), // 🔥 removed const

        // ✅ Unified authorization form
        '/authorization_form': (context) => const HipaaFormScreen(),

        // Scanning
        '/scan_card': (context) => ScanCard(), // 🔥 removed const

        // Password reset (user)
        '/request_reset': (context) => const RequestResetScreen(),
        '/reset_password': (context) => const ResetPasswordScreen(),

        // Password reset (agent)
        '/agent_request_reset': (context) => const AgentRequestResetScreen(),
        '/agent_reset_password': (context) => const AgentResetPasswordScreen(),
      },

      // Dynamic argument-based routes
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

          // User reset flow
          case '/reset_password':
            final emailOrPhone = settings.arguments as String?;
            return MaterialPageRoute(
              builder: (_) =>
                  ResetPasswordScreen(emailOrPhone: emailOrPhone),
            );

          // Agent reset flow
          case '/agent_reset_password':
            final emailOrPhone = settings.arguments as String?;
            return MaterialPageRoute(
              builder: (_) =>
                  AgentResetPasswordScreen(emailOrPhone: emailOrPhone),
            );
        }
        return null;
      },
    );
  }
}
