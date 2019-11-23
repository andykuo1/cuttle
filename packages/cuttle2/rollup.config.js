import { string } from 'rollup-plugin-string';
import babel from 'rollup-plugin-babel';
import { terser } from 'rollup-plugin-terser';

export default [
    {
        input: 'src/main.js',
        external: [
            'lib/cuttle.js'
        ],
        output: {
            file: 'build/bundle.js',
            format: 'esm'
        },
        plugins: [
            string({
                include: [ '**/*.html', '**/*.css' ],
            }),
            babel({
                exclude: 'node_modules/**'
            })
        ]
    },
    {
        input: 'lib/cuttle.js',
        output: {
            file: 'build/cuttle.min.js',
            format: 'umd',
            name: 'cuttle',
        },
        plugins: [
            babel({
                exclude: 'node_modules/**',
            }),
            terser()
        ]
    },
];