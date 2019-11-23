import pkg from './package.json';
import { terser } from 'rollup-plugin-terser';

export default [
    {
        input: 'src/Cuttle.js',
        output: {
            name: 'Cuttle',
            file: pkg.browser,
            format: 'umd'
        }
    },
    {
        input: 'src/Cuttle.js',
        output: {
            name: 'Cuttle',
            file: 'dist/cuttle.min.js',
            format: 'umd'
        },
        plugins: [terser()]
    }
];