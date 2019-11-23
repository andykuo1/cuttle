import cuttleNative from './rollup-plugin-cuttle-native.js';

export default ({
  input: 'virtual-module', // resolved by our plugin
  plugins: [cuttleNative()],
  output: [{
    file: 'bundle.js',
    format: 'esm'
  }]
});