module.exports = {
  presets: ['next/babel'],
  plugins: [
    // Injects __source prop with file/line info for debugging
    '@babel/plugin-transform-react-jsx-source',
  ],
};
