import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ScrollView, StyleSheet, View } from 'react-native';

import AppText from '../components/AppText';
import NotImplementedCard from '../components/NotImplementedCard';
import ScreenHeader from '../components/ScreenHeader';
import SectionHeader from '../components/SectionHeader';
import type { RootStackParamList } from '../navigation/types';
import { colors, radius, space } from '../theme/tokens';

type Props = NativeStackScreenProps<RootStackParamList, 'Help'>;

/** תשובות על מה שהאפליקציה עושה ולא עושה היום. כל פריט כאן תואם את מצב הקוד בפועל. */
const FAQ: { q: string; a: string }[] = [
  { q: 'למה אין יתרה של הרב-קו?', a: 'האפליקציה מזהה שכרטיס הוצמד וקוראת את המזהה שלו, אך פענוח היתרה דורש מפרט רשמי מאומת של הכרטיס שעדיין לא הוטמע. לכן לא מוצג שום ערך מנוחש.' },
  { q: 'האם האפליקציה כותבת לכרטיס הרב-קו?', a: 'לא. הקריאה היא לקריאה בלבד. טעינה מתבצעת רק במערכות הטעינה הרשמיות.' },
  { q: 'האם אפשר לשלם דרך האפליקציה?', a: 'עדיין לא. ספק הסליקה לא מחובר. כשיחובר, פרטי הכרטיס יוזנו רק אצל הספק ולא יישמרו באפליקציה.' },
  { q: 'האם האפליקציה מחשבת מסלול מנקודה לנקודה?', a: 'עדיין לא. אפשר לאתר יעד על המפה ולראות תחנות וזמני הגעה בזמן אמת בסביבתו.' },
  { q: 'איך מוחקים את החיפושים וההעדפות?', a: 'באזור האישי > פרטיות אפשר לכבות שמירת היסטוריה, למחוק חיפושים, או למחוק את כל הנתונים במכשיר.' },
  { q: 'זמני ההגעה לא מתעדכנים', a: 'בדוק חיבור לאינטרנט. בלי חיבור מוצגים הנתונים האחרונים שנשמרו, והם מתרעננים אוטומטית כשהחיבור חוזר.' }
];

export default function HelpScreen({ navigation }: Props) {
  return (
    <View style={styles.screen}>
      <ScreenHeader title="עזרה" subtitle="שאלות נפוצות" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.stack}>
          {FAQ.map((item) => (
            <View key={item.q} style={styles.card} accessible accessibilityLabel={`${item.q}. ${item.a}`}>
              <AppText variant="bodyStrong">{item.q}</AppText>
              <AppText variant="caption">{item.a}</AppText>
            </View>
          ))}
        </View>
        <SectionHeader title="יצירת קשר" />
        <NotImplementedCard
          title="ערוץ תמיכה"
          message="עדיין לא הוגדר ערוץ תמיכה (אימייל / טלפון / צ׳אט)."
          icon="chatbubbles-outline"
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: space(4), paddingBottom: space(8) },
  stack: { gap: space(2) },
  card: { gap: space(1), padding: space(4), borderRadius: radius.md, backgroundColor: colors.surface }
});
