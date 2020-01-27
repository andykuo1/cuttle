## babel-plugin-transform-cuttle
The Babel transform plugin for zero-abstraction Cuttle.

A babel plugin to transform cuttle code into vanilla JavaScript. Essentially, it is a zero-cost abstraction :D

This is made for Cuttle.

## Install
This depends on `cuttle` and `@babel/core`.

```bash
npm install --save-dev @babel/core
npm install --save-dev cuttle babel-plugin-transform-cuttle
```

## Usage
### `.babelrc`
```json
{
  "plugins": [ "babel-plugin-transform-cuttle" ]
}
```

### CLI
```bash
babel --plugins babel-plugin-transform-cuttle script.js
```

### Node.js
```javascript
require('@babel/core').transform(code, {
  plugins: ['babel-plugin-transform-cuttle']
});
```
