import { Ionicons } from '@expo/vector-icons';
import { memo, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Marker } from 'react-native-maps';

import { colors, radius } from '../theme/tokens';

interface Props {
  latitude: number;
  longitude: number;
  title: string;
  selected?: boolean;
  onPress?: () => void;
}

/** סמן תחנה על המפה. נבחר = גדול יותר ובצבע primary. */
function MapMarker({ latitude, longitude, title, selected, onPress }: Props) {
  const size = selected ? 30 : 22;
  // tracksViewChanges=false חוסך ביצועים, אבל אז שינוי מראה (נבחר/לא נבחר) לא מתעדכן באנדרואיד.
  // מפעילים רגעית בכל שינוי ואז מכבים.
  const [tracking, setTracking] = useState(true);
  useEffect(() => {
    setTracking(true);
    const id = setTimeout(() => setTracking(false), 400);
    return () => clearTimeout(id);
  }, [selected, title]);
  return (
    <Marker
      coordinate={{ latitude, longitude }}
      title={title}
      anchor={{ x: 0.5, y: 0.5 }}
      tracksViewChanges={tracking}
      onPress={onPress}
      accessibilityLabel={`תחנה ${title}`}
      zIndex={selected ? 2 : 1}
    >
      <View
        style={[
          styles.marker,
          { width: size, height: size },
          selected ? styles.selected : styles.idle
        ]}
      >
        <Ionicons name="bus" size={selected ? 16 : 12} color={selected ? colors.onPrimary : colors.primaryText} />
      </View>
    </Marker>
  );
}

export default memo(MapMarker);

const styles = StyleSheet.create({
  marker: { borderRadius: radius.full, alignItems: 'center', justifyContent: 'center', borderWidth: 2 },
  idle: { backgroundColor: colors.surface, borderColor: colors.primary },
  selected: { backgroundColor: colors.primary, borderColor: colors.onPrimary }
});
