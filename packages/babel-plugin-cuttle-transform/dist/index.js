'use strict';

var helperPluginUtils = require('@babel/helper-plugin-utils');
var core = require('@babel/core');

function evaluate(path) {
  var dst = {};
  var node = path.node;
  var returnStatement = node.body.body[node.body.body.length - 1];
  var returnedObject = returnStatement.argument;

  if (returnedObject.type === 'ObjectExpression') {
    var _iteratorNormalCompletion = true;
    var _didIteratorError = false;
    var _iteratorError = undefined;

    try {
      for (var _iterator = returnedObject.properties[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
        var objectProperty = _step.value;

        if (objectProperty.type !== 'ObjectProperty') {
          throw new Error('Unsupported property type.');
        }

        var propertyName = getPropertyName(objectProperty);
        var propertyType = void 0;
        var propertyDefaultValue = void 0;

        switch (objectProperty.value.type) {
          case 'Identifier':
            propertyType = objectProperty.value;
            propertyDefaultValue = undefined;
            break;

          case 'ObjectExpression':
            propertyType = findPropertyWithName(objectProperty.value.properties, 'type').value;
            propertyDefaultValue = findPropertyWithName(objectProperty.value.properties, 'value').value;
            break;

          default:
            throw new Error('Unsupported property value type - must be either a type or object.');
        }

        dst[propertyName] = {
          type: propertyType,
          value: propertyDefaultValue
        };
      }
    } catch (err) {
      _didIteratorError = true;
      _iteratorError = err;
    } finally {
      try {
        if (!_iteratorNormalCompletion && _iterator["return"] != null) {
          _iterator["return"]();
        }
      } finally {
        if (_didIteratorError) {
          throw _iteratorError;
        }
      }
    }

    return dst;
  } else {
    throw new Error('Unsupported properties object evaluation.');
  }
}

function getPropertyName(objectProperty) {
  var propertyName;

  switch (objectProperty.key.type) {
    case 'Identifier':
      propertyName = objectProperty.key.name;
      break;

    case 'StringLiteral':
      propertyName = objectProperty.key.value;
      break;

    default:
      throw new Error('Unsupported property name type - must be a string.');
  }

  return propertyName;
}

function findPropertyWithName(objectProperties, name) {
  var _iteratorNormalCompletion2 = true;
  var _didIteratorError2 = false;
  var _iteratorError2 = undefined;

  try {
    for (var _iterator2 = objectProperties[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
      var objectProperty = _step2.value;
      var propertyName = getPropertyName(objectProperty);
      if (propertyName === name) return objectProperty;
    }
  } catch (err) {
    _didIteratorError2 = true;
    _iteratorError2 = err;
  } finally {
    try {
      if (!_iteratorNormalCompletion2 && _iterator2["return"] != null) {
        _iterator2["return"]();
      }
    } finally {
      if (_didIteratorError2) {
        throw _iteratorError2;
      }
    }
  }

  return null;
}

function _toConsumableArray(arr) {
  return _arrayWithoutHoles(arr) || _iterableToArray(arr) || _nonIterableSpread();
}

function _arrayWithoutHoles(arr) {
  if (Array.isArray(arr)) {
    for (var i = 0, arr2 = new Array(arr.length); i < arr.length; i++) arr2[i] = arr[i];

    return arr2;
  }
}

function _iterableToArray(iter) {
  if (Symbol.iterator in Object(iter) || Object.prototype.toString.call(iter) === "[object Arguments]") return Array.from(iter);
}

function _nonIterableSpread() {
  throw new TypeError("Invalid attempt to spread non-iterable instance");
}

function generate(properties, path) {
  replaceObservedAttributes(path.parentPath, function (superCallback) {
    var returnArrayElements = _toConsumableArray(Object.keys(properties).map(function (value) {
      return core.types.stringLiteral(value);
    }));

    if (superCallback) {
      returnArrayElements.push(core.types.spreadElement(core.types.callExpression(core.types.arrowFunctionExpression([], superCallback.body), [])));
    }

    return core.types.classMethod('get', core.types.identifier('observedAttributes'), [], core.types.blockStatement([core.types.returnStatement(core.types.arrayExpression(returnArrayElements))]), false, true);
  });
}

function replaceObservedAttributes(parentPath, callback) {
  var parentNode = parentPath.node;

  for (var i = 0; i < parentNode.body.length; ++i) {
    var classMethod = parentNode.body[i];

    if (classMethod.type === 'ClassMethod' && classMethod["static"] && classMethod.kind === 'get' && classMethod.key.type === 'Identifier' && classMethod.key.name === 'observedAttributes') {
      parentNode.body[i] = callback(classMethod);
      return;
    }
  }

  parentNode.body.unshift(callback(null));
}

function generate$1(properties, path) {
  replaceConnectedCallback(path.parentPath, function (superCallback) {
    var statements = [];
    var defaultBuildRequire = core.template("\n        if (!this.hasAttribute(KEY)) {\n            this.setAttribute(KEY, DEFAULT_VALUE);\n        }\n        ");
    var upgradeBuildRequire = core.template("\n        if (this.hasOwnProperty(KEY)) {\n            let value = this.KEY_IDENTIFIER;\n            delete this.KEY_IDENTIFIER;\n            this.KEY_IDENTIFIER = value;\n        }\n        "); // Set default values...

    for (var _i = 0, _Object$keys = Object.keys(properties); _i < _Object$keys.length; _i++) {
      var key = _Object$keys[_i];

      if (hasDefaultPropertyValue(properties, key)) {
        statements.push(defaultBuildRequire({
          KEY: core.types.stringLiteral(key),
          DEFAULT_VALUE: getDefaultPropertyValue(properties, key)
        }));
      }
    } // Upgrade properties...


    for (var _i2 = 0, _Object$keys2 = Object.keys(properties); _i2 < _Object$keys2.length; _i2++) {
      var _key = _Object$keys2[_i2];
      statements.push(upgradeBuildRequire({
        KEY: core.types.stringLiteral(_key),
        KEY_IDENTIFIER: core.types.identifier(_key)
      }));
    }

    if (superCallback) {
      statements.push(core.types.expressionStatement(core.types.callExpression(core.types.arrowFunctionExpression([], superCallback.body), [])));
    }

    return core.types.classMethod('method', core.types.identifier('connectedCallback'), [], core.types.blockStatement(statements));
  });
}

function replaceConnectedCallback(parentPath, callback) {
  var parentNode = parentPath.node;

  for (var i = 0; i < parentNode.body.length; ++i) {
    var classMethod = parentNode.body[i];

    if (classMethod.type === 'ClassMethod' && classMethod.kind === 'method' && classMethod.key.type === 'Identifier' && classMethod.key.name === 'connectedCallback') {
      parentNode.body[i] = callback(classMethod);
      return;
    }
  }

  parentNode.body.push(callback(null));
}

function hasDefaultPropertyValue(properties, key) {
  return typeof properties[key].value !== 'undefined';
}

function getDefaultPropertyValue(properties, key) {
  return properties[key].value;
}

function generate$2(properties, path) {
  for (var _i = 0, _Object$keys = Object.keys(properties); _i < _Object$keys.length; _i++) {
    var key = _Object$keys[_i];
    var property = properties[key]; // Create getter...

    createGetterFromProperty(path, key); // Create setter...

    createSetterFromProperty(path, key, property);
  }
}

function createGetterFromProperty(path, key, property) {
  var result = core.types.classMethod('get', core.types.identifier(key), [], core.types.blockStatement([core.types.returnStatement(core.template.expression.ast('this._' + key))]));
  path.insertAfter(result);
}

function createSetterFromProperty(path, key, property) {
  var statement;

  switch (property.type.name) {
    case 'Boolean':
      statement = "this.toggleAttribute('".concat(key, "', value)");
      break;

    case 'String':
      statement = "this.setAttribute('".concat(key, "', value)");
      break;

    default:
      statement = "this.setAttribute('".concat(key, "', String(value))");
  }

  var result = core.types.classMethod('set', core.types.identifier(key), [core.types.identifier('value')], core.types.blockStatement([core.template.ast(statement)]));
  path.insertAfter(result);
}

function generate$3(properties, path) {
  replaceAttributeChangedCallback(path.parentPath, function (superCallback) {
    var statements = [];
    var innerStatements = [];
    innerStatements.push(core.types.variableDeclaration('let', [core.types.variableDeclarator(core.types.identifier('ownedPrev')), core.types.variableDeclarator(core.types.identifier('ownedValue'))]));
    var switchCases = [];
    var attributeBuildRequire = core.template("\n        if (this.CALLBACK) {\n            ownedPrev = this.KEY;\n            ownedValue = this.KEY = PARSER_EXPRESSION;\n            this.CALLBACK.call(this, ownedValue, ownedPrev, attribute);\n        }\n        ");

    for (var _i = 0, _Object$keys = Object.keys(properties); _i < _Object$keys.length; _i++) {
      var key = _Object$keys[_i];
      switchCases.push(core.types.switchCase(core.types.stringLiteral(key), [attributeBuildRequire({
        KEY: core.types.identifier('_' + key),
        CALLBACK: core.types.identifier(getCallbackNameForAttribute(key)),
        PARSER_EXPRESSION: getParserExpressionByProperty(properties[key])
      }), core.types.breakStatement()]));
    }

    innerStatements.push(core.types.switchStatement(core.types.identifier('attribute'), switchCases)); // Handle the 'any' callback...

    innerStatements.push(core.template.ast("\n            if (this.".concat(getCallbackNameForAttribute('*'), ") {\n                this.").concat(getCallbackNameForAttribute('*'), ".call(this, ownedValue, ownedPrev, attribute);\n            }\n        "))); // Make sure our code is within its own scope...

    statements.push(core.types.blockStatement(innerStatements));

    if (superCallback) {
      statements.push(core.types.expressionStatement(core.types.callExpression(core.types.arrowFunctionExpression([superCallback.params], superCallback.body), [core.types.identifier('attribute'), core.types.identifier('prev'), core.types.identifier('value')])));
    }

    return core.types.classMethod('method', core.types.identifier('attributeChangedCallback'), [core.types.identifier('attribute'), core.types.identifier('prev'), core.types.identifier('value')], core.types.blockStatement(statements));
  });
}

function replaceAttributeChangedCallback(parentPath, callback) {
  var parentNode = parentPath.node;

  for (var i = 0; i < parentNode.body.length; ++i) {
    var classMethod = parentNode.body[i];

    if (classMethod.type === 'ClassMethod' && classMethod.kind === 'method' && classMethod.key.type === 'Identifier' && classMethod.key.name === 'attributeChangedCallback') {
      parentNode.body[i] = callback(classMethod);
      return;
    }
  }

  parentNode.body.push(callback(null));
}

function getParserExpressionByProperty(property) {
  switch (property.type.name) {
    case 'Boolean':
      return core.template.expression.ast('value !== null');

    case 'String':
      return core.template.expression.ast('value');

    default:
      return core.template.expression('PARSER(value)')({
        PARSER: property.type
      });
  }
}

function getCallbackNameForAttribute(attribute) {
  if (attribute === '*') {
    return '__any__AttributeChangedCallback';
  } else {
    return '__' + attribute + 'AttributeChangedCallback';
  }
}

var index = helperPluginUtils.declare(function (api) {
  api.assertVersion(7);
  var visitor = {
    ImportDeclaration: function ImportDeclaration(path) {
      var node = path.node;

      if (node.source.type === 'StringLiteral' && node.source.value.endsWith('cuttle.js')) {
        path.remove();
        return;
      }
    },
    ClassMethod: function ClassMethod(path) {
      // `static get properties()`
      var node = path.node;
      if (!node["static"] || node.kind !== 'get' || node.key.name !== 'properties') return;
      var properties = evaluate(path);
      generate(properties, path);
      generate$1(properties, path);
      generate$2(properties, path);
      generate$3(properties, path); // Remove it from the class...

      path.remove();
    },
    CallExpression: function CallExpression(path) {
      var node = path.node;

      if (node.callee.type === 'MemberExpression' && node.callee.object.name === 'cuttle') {
        // `attachShadow()`
        if (node.callee.property.name === 'attachShadow') {
          var componentInstance = node.arguments[0];
          var templateElement = node.arguments[1];
          var styleElement = node.arguments[2];

          if (templateElement) {
            var buildRequire = core.template("\n                            INSTANCE.shadowRoot.appendChild(TEMPLATE_ELEMENT.content.cloneNode(true))\n                        ");
            path.parentPath.insertAfter(buildRequire({
              INSTANCE: componentInstance,
              TEMPLATE_ELEMENT: templateElement
            }));
          }

          if (styleElement) {
            var _buildRequire = core.template("\n                            INSTANCE.shadowRoot.appendChild(STYLE_ELEMENT.cloneNode(true))\n                        ");

            path.parentPath.insertAfter(_buildRequire({
              INSTANCE: componentInstance,
              STYLE_ELEMENT: styleElement
            }));
          }

          {
            var _buildRequire2 = core.template("\n                            INSTANCE.attachShadow({ mode: 'open' })\n                        ");

            path.replaceWithMultiple(_buildRequire2({
              INSTANCE: node.arguments[0]
            }));
          }
          return;
        } // `defineComponent()`


        if (node.callee.property.name === 'defineComponent') {
          var classTarget = node.arguments[0];
          var tagName = node.arguments[1];
          var extendedTagName = node.arguments[2];
          var shadowOpts = node.arguments[3];
          var shadowArgs = [];
          if (extendedTagName) shadowArgs.push(core.types.objectProperty(core.types.identifier('extends'), extendedTagName));
          if (shadowOpts) shadowArgs.push(core.types.spreadElement(shadowOpts));
          {
            var _buildRequire3 = core.template("\n                            window.customElements.define(TAG_NAME, CLASS_TARGET, SHADOW_OPTS)\n                        ");

            path.replaceWithMultiple(_buildRequire3({
              TAG_NAME: tagName,
              CLASS_TARGET: classTarget,
              SHADOW_OPTS: shadowArgs.length > 0 ? core.types.objectExpression(shadowArgs) : undefined
            }));
          }
          return;
        } // `createTemplate()`


        if (node.callee.property.name === 'createTemplate') {
          var _buildRequire4 = core.template("\n                        (function createTemplate(templateString) {\n                            let element = document.createElement('template');\n                            element.innerHTML = templateString;\n                            return element;\n                        })(ARGUMENT)\n                    ");

          path.replaceWithMultiple(_buildRequire4({
            ARGUMENT: node.arguments[0]
          }));
          return;
        } // `createStyle()`


        if (node.callee.property.name === 'createStyle') {
          var _buildRequire5 = core.template("\n                        (function createStyle(styleString) {\n                            let element = document.createElement('style');\n                            element.innerHTML = styleString;\n                            return element;\n                        })(ARGUMENT)\n                    ");

          path.replaceWithMultiple(_buildRequire5({
            ARGUMENT: node.arguments[0]
          }));
          return;
        } // `bindAttributeChanged()`


        if (node.callee.property.name === 'bindAttributeChanged') {
          var _componentInstance = node.arguments[0];
          var attributeName = node.arguments[1];
          var callback = node.arguments[2];

          var _buildRequire6 = core.template("\n                        INSTANCE.CALLBACK_NAME = CALLBACK\n                    ");

          path.replaceWithMultiple(_buildRequire6({
            INSTANCE: _componentInstance,
            CALLBACK_NAME: getCallbackNameForAttribute(attributeName.value),
            CALLBACK: callback
          }));
          return;
        } // `find()`


        if (node.callee.property.name === 'find') {
          var _componentInstance2 = node.arguments[0];
          var selectors = node.arguments[1];

          var _buildRequire7 = core.template("\n                        (INSTANCE.shadowRoot || INSTANCE).querySelector(SELECTORS)\n                    ");

          path.replaceWithMultiple(_buildRequire7({
            INSTANCE: _componentInstance2,
            SELECTORS: selectors
          }));
          return;
        } // `findById()`


        if (node.callee.property.name === 'find') {
          var _componentInstance3 = node.arguments[0];
          var id = node.arguments[1];

          var _buildRequire8 = core.template("\n                        (INSTANCE.shadowRoot || INSTANCE).getElementById(ID)\n                    ");

          path.replaceWithMultiple(_buildRequire8({
            INSTANCE: _componentInstance3,
            ID: id
          }));
          return;
        } // `findAll()`


        if (node.callee.property.name === 'find') {
          var _componentInstance4 = node.arguments[0];
          var _selectors = node.arguments[1];

          var _buildRequire9 = core.template("\n                        (INSTANCE.shadowRoot || INSTANCE).querySelectorAll(SELECTORS)\n                    ");

          path.replaceWithMultiple(_buildRequire9({
            INSTANCE: _componentInstance4,
            SELECTORS: _selectors
          }));
          return;
        } // `getRootElement()`


        if (node.callee.property.name === 'getRootElement') {
          var _componentInstance5 = node.arguments[0];

          var _buildRequire10 = core.template("\n                        (INSTANCE.shadowRoot || INSTANCE)\n                    ");

          path.replaceWithMultiple(_buildRequire10({
            INSTANCE: _componentInstance5
          }));
          return;
        }
      }
    }
  };
  return {
    name: "transform-cuttle",
    visitor: visitor
  };
});

module.exports = index;
