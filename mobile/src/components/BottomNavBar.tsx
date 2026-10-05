import { Ionicons } from '@expo/vector-icons';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { TabParamList } from '../navigation/types';
import { colors, NAV_BAR_HEIGHT } from '../theme/tokens';
import AppText from './AppText';

const TABS: Record<
  keyof TabParamList,
  { label: string; icon: keyof typeof Ionicons.glyphMap; iconActive: keyof typeof Ionicons.glyphMap }
> = {
  Plan: { label: 'תכנון מסלול', icon: 'navigate-outline', iconActive: 'navigate' },
  Payment: { label: 'תשלום', icon: 'card-outline', iconActive: 'card' },
  RavKav: { label: 'רב-קו', icon: 'radio-outline', iconActive: 'radio' },
  Profile: { label: 'אזור אישי', icon: 'person-outline', iconActive: 'person' }
};

/** סרגל תחתון קבוע: רקע לבן, אייקונים כהים, לשונית פעילה בכחול #2B4ACB */
export default function BottomNavBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.bar, { height: NAV_BAR_HEIGHT + insets.bottom, paddingBottom: insets.bottom }]}>
      {state.routes.map((route, index) => {
        const tab = TABS[route.name as keyof TabParamList];
        const focused = state.index === index;
        const tint = focused ? colors.primary : colors.navIcon;
        const onPress = () => {
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
        };
        return (
          <Pressable
            key={route.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: focused }}
            onPress={onPress}
            style={styles.item}
          >
            <Ionicons name={focused ? tab.iconActive : tab.icon} size={24} color={tint} />
            <AppText style={[styles.label, { color: tint }]}>{tab.label}</AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: colors.navBackground,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border
  },
  item: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 2 },
  label: { fontSize: 11 }
});
