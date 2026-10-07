import { memo, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Marker } from 'react-native-maps';

import { colors, fonts, radius, space } from '../theme/tokens';
import AppText from './AppText';

interface Props {
  latitude: number;
  longitude: number;
  routeNumber: string;
  color?: string;
  textColor?: string;
  selected?: boolean;
  onPress?: () => void;
}

/** סמן אוטובוס: pill עם מספר הקו בצבע הקו. */
function BusMarker({
  latitude,
  longitude,
  routeNumber,
  color = colors.routeFallback,
  textColor = colors.onPrimary,
  selected,
  onPress
}: Props) {
  // ראו MapMarker: רענון רגעי של ה-snapshot הנייטיבי בכל שינוי מראה
  const [tracking, setTracking] = useState(true);
  useEffect(() => {
    setTracking(true);
    const id = setTimeout(() => setTracking(false), 400);
    return () => clearTimeout(id);
  }, [selected, routeNumber, color, textColor]);
  return (
    <Marker
      coordinate={{ latitude, longitude }}
      anchor={{ x: 0.5, y: 0.5 }}
      tracksViewChanges={tracking}
      onPress={onPress}
      accessibilityLabel={`אוטובוס קו ${routeNumber}`}
      zIndex={selected ? 4 : 3}
    >
      <View style={[styles.bus, { backgroundColor: color }, selected && styles.selected]}>
        <AppText variant="label" style={{ color: textColor, fontFamily: fonts.bold }} numberOfLines={1}>
          {routeNumber}
        </AppText>
      </View>
    </Marker>
  );
}

export default memo(BusMarker);

const styles = StyleSheet.create({
  bus: {
    minWidth: space(9),
    height: space(6.5),
    paddingHorizontal: space(2),
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.background
  },
  selected: { borderColor: colors.onPrimary, transform: [{ scale: 1.15 }] }
});
