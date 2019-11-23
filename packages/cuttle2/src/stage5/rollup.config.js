import { string } from 'rollup-plugin-string';
import babel from 'rollup-plugin-babel';

export default {
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
};