import { terser } from 'rollup-plugin-terser';

export default [
    {
        input: 'src/index.js',
        output: [
            {
                file: 'dist/esm/cuttle.js',
                format: 'esm'
            },
            {
                file: 'dist/esm/cuttle.min.js',
                format: 'esm',
                plugins: [
                    terser()
                ],
            },
            {
                file: 'dist/cjs/cuttle.js',
                format: 'cjs',
            },
            {
                file: 'dist/cjs/cuttle.min.js',
                format: 'cjs',
                plugins: [
                    terser()
                ],
            },
            {
                file: 'dist/cuttle.js',
                format: 'umd',
                name: 'Cuttle',
                plugins: [
                    terser()
                ],
            },
        ]
    },
];
