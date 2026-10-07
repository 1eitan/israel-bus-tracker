import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { DarkTheme, NavigationContainer, type Theme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import BottomNavBar from '../components/BottomNavBar';
import FavoritesScreen from '../screens/FavoritesScreen';
import HelpScreen from '../screens/HelpScreen';
import HistoryScreen from '../screens/HistoryScreen';
import MapScreen from '../screens/MapScreen';
import NfcScreen from '../screens/NfcScreen';
import PaymentMethodsScreen from '../screens/PaymentMethodsScreen';
import PrefsScreen from '../screens/PrefsScreen';
import ProfileScreen from '../screens/ProfileScreen';
import RoutePlanningScreen from '../screens/RoutePlanningScreen';
import ServicesScreen from '../screens/ServicesScreen';
import { colors } from '../theme/tokens';
import type { RootStackParamList, TabParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

const theme: Theme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colors.background,
    card: colors.surface,
    primary: colors.primary,
    text: colors.text,
    border: colors.border
  }
};

/** סדר הלשוניות בקוד = מימין לשמאל ב-RTL: תכנון מסלול, תשלום, רב-קו, אזור אישי */
function Tabs() {
  return (
    <Tab.Navigator
      tabBar={(props) => <BottomNavBar {...props} />}
      screenOptions={{ headerShown: false }}
      sceneContainerStyle={{ backgroundColor: colors.background }}
    >
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
        <Stack.Screen name="Map" component={MapScreen} options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="Services" component={ServicesScreen} />
        <Stack.Screen name="Favorites" component={FavoritesScreen} />
        <Stack.Screen name="History" component={HistoryScreen} />
        <Stack.Screen name="Prefs" component={PrefsScreen} />
        <Stack.Screen name="Help" component={HelpScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
