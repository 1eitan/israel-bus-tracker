import { Ionicons } from '@expo/vector-icons';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import AppText from '../components/AppText';
import PrimaryButton from '../components/PrimaryButton';
import ScreenHeader from '../components/ScreenHeader';
import type { TabParamList } from '../navigation/types';
import { colors, radius, space } from '../theme/tokens';

/**
 * הוספת כרטיס אשראי חייבת לעבור דרך ספק סליקה מאושר PCI (SDK של הספק, עם טוקניזציה),
 * ולא דרך טופס שמקבל מספר כרטיס באפליקציה. עד שמחברים ספק - הכפתור מסביר זאת.
 */
const PAYMENT_PROVIDER_CONFIGURED = false;

export default function PaymentMethodsScreen({ navigation }: BottomTabScreenProps<TabParamList, 'Payment'>) {
  const addCard = () => {
    if (!PAYMENT_PROVIDER_CONFIGURED) {
      Alert.alert('הוספת כרטיס אשראי', 'ספק הסליקה עדיין לא מחובר לאפליקציה, ולכן לא ניתן להוסיף כרטיס כרגע.');
      return;
    }
  };

  return (
    <View style={styles.screen}>
      <ScreenHeader title="אמצעי תשלום" onBack={() => navigation.navigate('Profile')} />
      <View style={styles.content}>
        <View style={styles.card}>
          <View style={styles.icon}>
            <Ionicons name="card" size={24} color={colors.text} />
          </View>
          <View style={styles.cardText}>
            <AppText variant="heading">כרטיס אשראי</AppText>
            <AppText variant="caption">הכרטיס הראשי שלך חיוב עבור הנסיעות שלך</AppText>
          </View>
        </View>
        <Pressable
          accessibilityRole="link"
          onPress={() => Alert.alert('עריכת פרטי חשבונית', 'עריכת פרטי החשבונית תחובר לשירותי החשבון.')}
        >
          <AppText style={styles.link}>עריכת פרטי חשבונית</AppText>
        </Pressable>
      </View>
      <View style={styles.footer}>
        <PrimaryButton title="הוספת כרטיס אשראי" onPress={addCard} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1, padding: space(4), gap: space(4) },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space(3),
    padding: space(4),
    borderRadius: radius.md,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border
  },
  icon: {
    width: space(12),
    height: space(12),
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center'
  },
  cardText: { flex: 1, gap: 2 },
  link: { color: colors.primary, fontSize: 15 },
  footer: { paddingHorizontal: space(4), paddingBottom: space(4) }
});
