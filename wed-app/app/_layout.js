// app/_layout.js
// MUST be at the very top
import 'react-native-gesture-handler';
import 'react-native-reanimated';

// ✅ Force app to start on index (your Splash/index file)
export const unstable_settings = {
  initialRouteName: 'index',
};

import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ImagesProvider } from '../context/ImagesContext';
import { OtpProvider } from '../context/OtpContext';
import { WeddingProvider } from '../context/WeddingContext';

export default function Layout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <OtpProvider>
          <WeddingProvider>
            <ImagesProvider>
              <Stack
                initialRouteName="index"
                screenOptions={{
                  headerShown: false,
                  contentStyle: { backgroundColor: '#FFFFFF' },
                }}
              >
                {/* ✅ Privacy as transparent modal */}
                <Stack.Screen
                  name="privacy"
                  options={{
                    presentation: 'transparentModal',
                    animation: 'slide_from_bottom',
                    contentStyle: { backgroundColor: 'transparent' },
                  }}
                />

                {/* ✅ Terms & Conditions as transparent modal */}
                <Stack.Screen
                  name="tc"
                  options={{
                    presentation: 'transparentModal',
                    animation: 'slide_from_bottom',
                    contentStyle: { backgroundColor: 'transparent' },
                  }}
                />

                {/* ✅ Password screen as bottom-sheet transparent modal */}
                <Stack.Screen
                  name="passwordscreen"
                  options={{
                    presentation: 'transparentModal',
                    animation: 'slide_from_bottom',
                    contentStyle: { backgroundColor: 'transparent' },
                  }}
                />

                {/* ✅ Face consent over Dynamic Gallery */}
                <Stack.Screen
                  name="face-consent"
                  options={{
                    presentation: 'transparentModal',
                    animation: 'fade',
                    contentStyle: { backgroundColor: 'transparent' },
                  }}
                />

                {/* ✅ Face recognition over previous screen */}
                <Stack.Screen
                  name="face-recognition"
                  options={{
                    presentation: 'transparentModal',
                    animation: 'fade',
                    contentStyle: { backgroundColor: 'transparent' },
                  }}
                />
              </Stack>
            </ImagesProvider>
          </WeddingProvider>
        </OtpProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}