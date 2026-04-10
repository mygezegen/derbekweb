module.exports = function (api) {
  api.cache(true);
  return {
    presets: [['babel-preset-expo', { router: false }]],
    plugins: ['react-native-reanimated/plugin'],
  };
};
