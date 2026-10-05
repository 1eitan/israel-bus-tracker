import { Heebo_400Regular, Heebo_500Medium, Heebo_700Bold, useFonts } from '@expo-google-fonts/heebo';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ensureRtl } from './src/lib/rtl';
import AppNavigator from './src/navigation/AppNavigator';
import { colors } from './src/theme/tokens';

void SplashScreen.preventAutoHideAsync();

// RTL גלובלי - חייב לפני הרינדור הראשון. בהרצה הראשונה נטענים מחדש פעם אחת.
const reloading = ensureRtl();

export default function App() {
  const [fontsLoaded] = useFonts({ Heebo_400Regular, Heebo_500Medium, Heebo_700Bold });

  useEffect(() => {
    if (fontsLoaded) void SplashScreen.hideAsync();
  }, [fontsLoaded]);

  if (!fontsLoaded || reloading) return <View style={styles.blank} />;

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <AppNavigator />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  blank: { flex: 1, backgroundColor: colors.background }
});
