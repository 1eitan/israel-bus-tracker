module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // reanimated חייב להיות האחרון (נדרש ל-@gorhom/bottom-sheet)
    plugins: ['react-native-reanimated/plugin']
  };
};
