import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { useFonts } from 'expo-font';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold
} from '@expo-google-fonts/inter';
import * as SplashScreen from 'expo-splash-screen';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  useFrameworkReady();

  const [fontsLoaded, fontError] = useFonts({
    'Inter-Regular': Inter_400Regular,
    'Inter-Medium': Inter_500Medium,
    'Inter-SemiBold': Inter_600SemiBold,
    'Inter-Bold': Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="login" />
        <Stack.Screen name="reset-password" />
        <Stack.Screen name="profile-setup" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style="auto" />
    </SafeAreaProvider>
  );
}
// import { useEffect } from 'react';
// import { Stack } from 'expo-router';
// import { StatusBar } from 'expo-status-bar';
// import { SafeAreaProvider } from 'react-native-safe-area-context';
// import { useFrameworkReady } from '@/hooks/useFrameworkReady';
// import { useFonts } from 'expo-font';
// import {
//   Inter_400Regular,
//   Inter_500Medium,
//   Inter_600SemiBold,
//   Inter_700Bold
// } from '@expo-google-fonts/inter';
// import * as SplashScreen from 'expo-splash-screen';
// import * as Linking from 'expo-linking';

// SplashScreen.preventAutoHideAsync();

// const linking = {
//   prefixes: [
//     'grocygenie://', // Your app scheme
//   ],
//   config: {
//     screens: {
//       'reset-password': {
//         path: '/reset-password',
//         parse: {
//           token: (token: string) => token,
//           type: (type: string) => type,
//         },
//       },
//       login: '/login',
//       onboarding: '/onboarding',
//     },
//   },
// };

// export default function RootLayout() {
//   useFrameworkReady();

//   const [fontsLoaded, fontError] = useFonts({
//     'Inter-Regular': Inter_400Regular,
//     'Inter-Medium': Inter_500Medium,
//     'Inter-SemiBold': Inter_600SemiBold,
//     'Inter-Bold': Inter_700Bold,
//   });

//   // Always call useEffect hooks in the same order - move all useEffect calls here
//   useEffect(() => {
//     if (fontsLoaded || fontError) {
//       SplashScreen.hideAsync();
//     }
//   }, [fontsLoaded, fontError]);

//   useEffect(() => {
//     // Handle deep links when app is already open
//     const handleDeepLink = ({ url }: { url: string }) => {
//       console.log('Deep link received:', url);
//       // Expo Router will automatically handle the navigation
//     };

//     const subscription = Linking.addEventListener('url', handleDeepLink);
    
//     return () => subscription?.remove();
//   }, []);

//   // Early return after all hooks have been called
//   if (!fontsLoaded && !fontError) {
//     return null;
//   }

//   return (
//     <SafeAreaProvider>
//       <Stack 
//         screenOptions={{ headerShown: false }}
//         // Add the linking configuration here
//       >
//         <Stack.Screen name="onboarding" />
//         <Stack.Screen name="login" />
//         <Stack.Screen name="reset-password" />
//         <Stack.Screen name="profile-setup" />
//         <Stack.Screen name="(tabs)" />
//         <Stack.Screen name="+not-found" />
//       </Stack>
//       <StatusBar style="auto" />
//     </SafeAreaProvider>
//   );
// }