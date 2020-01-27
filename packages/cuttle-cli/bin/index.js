#!/usr/bin/env node

const TransformCuttle = require('babel-plugin-transform-cuttle');
const babel = require('@babel/core');
const fs = require('fs');

let result = babel.transformFileSync(process.argv[2], {
    plugins: [ TransformCuttle ]
});

fs.writeFileSync(process.argv[3], result.code);

console.log('Success!');
