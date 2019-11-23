import babel from 'rollup-plugin-babel';

export default {
    input: 'src/index.js',
    external: [
        '@babel/helper-plugin-utils',
        '@babel/core',
    ],
    output: {
        file: 'dist/index.js',
        format: 'cjs'
    },
    plugins: [
        babel({
            exclude: 'node_modules/**'
        })
    ]
};