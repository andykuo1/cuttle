export default [
    {
        input: 'src/index.js',
        external: [
            '@babel/core',
            '@babel/helper-plugin-utils'
        ],
        output: [
            {
                file: 'dist/babel-plugin-transform-cuttle.js',
                format: 'cjs',
            }
        ]
    },
];
