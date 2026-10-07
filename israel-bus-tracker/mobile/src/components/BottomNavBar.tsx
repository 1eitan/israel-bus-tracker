import { Ionicons } from '@expo/vector-icons';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { haptics } from '../lib/haptics';
import type { TabParamList } from '../navigation/types';
import { colors, fonts, NAV_BAR_HEIGHT, radius, space } from '../theme/tokens';
import AppText from './AppText';
import PressableScale from './PressableScale';

type IconName = keyof typeof Ionicons.glyphMap;

const TABS: Record<keyof TabParamList, { label: string; icon: IconName; iconActive: IconName }> = {
  Plan: { label: 'תכנון מסלול', icon: 'navigate-outline', iconActive: 'navigate' },
  Payment: { label: 'תשלום', icon: 'card-outline', iconActive: 'card' },
  RavKav: { label: 'רב-קו', icon: 'radio-outline', iconActive: 'radio' },
  Profile: { label: 'אזור אישי', icon: 'person-outline', iconActive: 'person' }
};

/**
 * סרגל תחתון כהה וקבוע. הלשונית הפעילה ברורה מאוד: pill כחול מאחורי האייקון,
 * אייקון/תווית בצבע primary-בהיר-על-רקע (לבן) ותווית מודגשת. סדר הלשוניות נקבע ע"י RTL.
 */
export default function BottomNavBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  return (
    <View
      accessibilityRole="tablist"
      style={[styles.bar, { height: NAV_BAR_HEIGHT + insets.bottom, paddingBottom: insets.bottom }]}
    >
      {state.routes.map((route, index) => {
        const tab = TABS[route.name as keyof TabParamList];
        const focused = state.index === index;
        const onPress = () => {
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!focused && !event.defaultPrevented) {
            haptics.select();
            navigation.navigate(route.name);
          }
        };
        return (
          <PressableScale
            key={route.key}
            accessibilityRole="tab"
            accessibilityLabel={tab.label}
            accessibilityState={{ selected: focused }}
            onPress={onPress}
            scaleTo={0.94}
            style={styles.item}
          >
            <View style={[styles.pill, focused && styles.pillActive]}>
              <Ionicons
                name={focused ? tab.iconActive : tab.icon}
                size={22}
                color={focused ? colors.onPrimary : colors.textSecondary}
              />
            </View>
            <AppText variant="navigation" numberOfLines={1} maxFontSizeMultiplier={1.2} style={focused ? styles.labelActive : undefined}>
              {tab.label}
            </AppText>
          </PressableScale>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border
  },
  item: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space(1), minHeight: 44 },
  pill: {
    width: space(14),
    height: space(8),
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center'
  },
  pillActive: { backgroundColor: colors.primary },
  labelActive: { fontFamily: fonts.bold, color: colors.text }
});
