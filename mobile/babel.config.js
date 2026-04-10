module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Sadece bu plugin'i ekleyin, react-native-worklets otomatik gelir
      'react-native-reanimated/plugin'
    ]
  };
};