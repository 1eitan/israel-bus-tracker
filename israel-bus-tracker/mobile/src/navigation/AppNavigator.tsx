import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { DarkTheme, NavigationContainer, type Theme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import BottomNavBar from '../components/BottomNavBar';
import MapScreen from '../screens/MapScreen';
import NfcScreen from '../screens/NfcScreen';
import PaymentMethodsScreen from '../screens/PaymentMethodsScreen';
import ProfileScreen from '../screens/ProfileScreen';
import RoutePlanningScreen from '../screens/RoutePlanningScreen';
import { colors } from '../theme/tokens';
import type { RootStackParamList, TabParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

const theme: Theme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colors.background,
    card: colors.card,
    primary: colors.primary,
    text: colors.text,
    border: colors.border
  }
};

/** סדר הלשוניות בקוד = מימין לשמאל ב-RTL: תכנון מסלול, תשלום, רב-קו, אזור אישי */
function Tabs() {
  return (
    <Tab.Navigator tabBar={(props) => <BottomNavBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tab.Screen name="Plan" component={RoutePlanningScreen} />
      <Tab.Screen name="Payment" component={PaymentMethodsScreen} />
      <Tab.Screen name="RavKav" component={NfcScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  return (
    <NavigationContainer theme={theme}>
      <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
        <Stack.Screen name="Tabs" component={Tabs} />
        <Stack.Screen name="Map" component={MapScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
