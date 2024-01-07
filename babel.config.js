module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind" }],
      "nativewind/babel",
    ],
    plugins: [
      [
        "module-resolver",
        {
          root: ["./"],
          alias: {
            crypto: "react-native-quick-crypto",
            stream: "stream-browserify",
            buffer: "@craftzdog/react-native-buffer",
          },
        },
      ],
      "react-native-reanimated/plugin",
    ],
  };
};
