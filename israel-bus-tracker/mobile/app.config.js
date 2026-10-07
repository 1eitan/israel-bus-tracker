// מרחיב את app.json: מפתחות Google Maps נכנסים מ-env במקום להיות hardcoded.
// בלי מפתח תקין נשאר placeholder - ה-manifest/AppDelegate תקינים (אין קריסה בעלייה),
// והקוד ב-src/lib/maps.ts לא מרנדר MapView בכלל.
const PLACEHOLDER_ANDROID = 'REPLACE_WITH_ANDROID_GOOGLE_MAPS_KEY';
const PLACEHOLDER_IOS = 'REPLACE_WITH_IOS_GOOGLE_MAPS_KEY';

module.exports = ({ config }) => ({
  ...config,
  ios: {
    ...config.ios,
    config: { ...config.ios?.config, googleMapsApiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_IOS_KEY || PLACEHOLDER_IOS }
  },
  android: {
    ...config.android,
    config: {
      ...config.android?.config,
      googleMaps: { apiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_KEY || PLACEHOLDER_ANDROID }
    }
  }
});
