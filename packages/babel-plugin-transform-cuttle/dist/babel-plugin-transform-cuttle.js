'use strict';

var helperPluginUtils = require('@babel/helper-plugin-utils');
var core = require('@babel/core');

function evaluate(path)
{
    let dst = {};
    let node = path.node;
    let returnStatement = node.body.body[node.body.body.length - 1];
    let returnedObject = returnStatement.argument;
    if (returnedObject.type === 'ObjectExpression')
    {
        for (let objectProperty of returnedObject.properties)
        {
            if (objectProperty.type !== 'ObjectProperty')
            {
                throw new Error('Unsupported property type.');
            }

            let propertyName = getPropertyName(objectProperty);
            let propertyType;
            let propertyDefaultValue;
            switch(objectProperty.value.type)
            {
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
                value: propertyDefaultValue,
            };
        }

        return dst;
    }
    else
    {
        throw new Error('Unsupported properties object evaluation.');
    }
}

function getPropertyName(objectProperty)
{
    let propertyName;
    switch(objectProperty.key.type)
    {
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

function findPropertyWithName(objectProperties, name)
{
    for (let objectProperty of objectProperties)
    {
        let propertyName = getPropertyName(objectProperty);
        if (propertyName === name) return objectProperty;
    }
    return null;
}

function generate(properties, path)
{
    replaceObservedAttributes(path.parentPath, superCallback => {
        let returnArrayElements = [
            ...Object.keys(properties).map(value => core.types.stringLiteral(value))
        ];

        if (superCallback)
        {
            returnArrayElements.push(
                core.types.spreadElement(
                    core.types.callExpression(
                        core.types.arrowFunctionExpression([], superCallback.body),
                        []
                    )
                )
            );
        }
        
        return core.types.classMethod(
            'get',
            core.types.identifier('observedAttributes'),
            [],
            core.types.blockStatement([
                core.types.returnStatement(
                    core.types.arrayExpression(returnArrayElements)
                )
            ]),
            false,
            true
        );
    });
}

function replaceObservedAttributes(parentPath, callback)
{
    let parentNode = parentPath.node;
    for (let i = 0; i < parentNode.body.length; ++i)
    {
        let classMethod = parentNode.body[i];
        if (classMethod.type === 'ClassMethod'
            && classMethod.static
            && classMethod.kind === 'get'
            && classMethod.key.type === 'Identifier'
            && classMethod.key.name === 'observedAttributes')
        {
            parentNode.body[i] = callback(classMethod);
            return;
        }
    }
    parentNode.body.unshift(callback(null));
}

function generate$1(properties, path)
{
    replaceConnectedCallback(path.parentPath, superCallback => {
        let statements = [];

        const defaultBuildRequire = core.template(`
        if (!this.hasAttribute(KEY)) {
            this.setAttribute(KEY, DEFAULT_VALUE);
        }
        `);

        const upgradeBuildRequire = core.template(`
        if (this.hasOwnProperty(KEY)) {
            let value = this.KEY_IDENTIFIER;
            delete this.KEY_IDENTIFIER;
            this.KEY_IDENTIFIER = value;
        }
        `);

        // Set default values...
        for (let key of Object.keys(properties))
        {
            if (hasDefaultPropertyValue(properties, key))
            {
                statements.push(
                    defaultBuildRequire({
                        KEY: core.types.stringLiteral(key),
                        DEFAULT_VALUE: getDefaultPropertyValue(properties, key)
                    })
                );
            }
        }

        // Upgrade properties...
        for(let key of Object.keys(properties))
        {
            statements.push(
                upgradeBuildRequire({
                    KEY: core.types.stringLiteral(key),
                    KEY_IDENTIFIER: core.types.identifier(key),
                })
            );
        }

        if (superCallback)
        {
            statements.push(
                core.types.expressionStatement(
                    core.types.callExpression(
                        core.types.arrowFunctionExpression([], superCallback.body),
                        []
                    )
                )
            );
        }
        
        return core.types.classMethod(
            'method',
            core.types.identifier('connectedCallback'),
            [],
            core.types.blockStatement(statements)
        );
    });
}

function replaceConnectedCallback(parentPath, callback)
{
    let parentNode = parentPath.node;
    for (let i = 0; i < parentNode.body.length; ++i)
    {
        let classMethod = parentNode.body[i];
        if (classMethod.type === 'ClassMethod'
            && classMethod.kind === 'method'
            && classMethod.key.type === 'Identifier'
            && classMethod.key.name === 'connectedCallback')
        {
            parentNode.body[i] = callback(classMethod);
            return;
        }
    }
    parentNode.body.push(callback(null));
}

function hasDefaultPropertyValue(properties, key)
{
    return typeof properties[key].value !== 'undefined';
}

function getDefaultPropertyValue(properties, key)
{
    return properties[key].value;
}

function generate$2(properties, path)
{
    for (let key of Object.keys(properties))
    {
        let property = properties[key];
        // Create getter...
        createGetterFromProperty(path, key);
        // Create setter...
        createSetterFromProperty(path, key, property);
    }
}

function createGetterFromProperty(path, key, property)
{
    let result = core.types.classMethod(
        'get',
        core.types.identifier(key),
        [],
        core.types.blockStatement([
            core.types.returnStatement(
                core.template.expression.ast('this._' + key)
            )
        ])
    );
    path.insertAfter(result);
}

function createSetterFromProperty(path, key, property)
{
    let statement;
    switch(property.type.name)
    {
        case 'Boolean':
            statement = `this.toggleAttribute('${key}', value)`;
            break;
        case 'String':
            statement = `this.setAttribute('${key}', value)`;
            break;
        default:
            statement = `this.setAttribute('${key}', String(value))`;
    }
    let result = core.types.classMethod(
        'set',
        core.types.identifier(key),
        [ core.types.identifier('value') ],
        core.types.blockStatement([
            core.template.ast(statement)
        ])
    );
    path.insertAfter(result);
}

function generate$3(properties, path)
{
    replaceAttributeChangedCallback(path.parentPath, superCallback => {
        let statements = [];

        let innerStatements = [];
        innerStatements.push(core.types.variableDeclaration('let', [
            core.types.variableDeclarator(core.types.identifier('ownedPrev')),
            core.types.variableDeclarator(core.types.identifier('ownedValue'))
        ]));

        let switchCases = [];
        const attributeBuildRequire = core.template(`
        if (this.CALLBACK) {
            ownedPrev = this.KEY;
            ownedValue = this.KEY = PARSER_EXPRESSION;
            this.CALLBACK.call(this, ownedValue, ownedPrev, attribute);
        }
        `);
        for(let key of Object.keys(properties))
        {
            switchCases.push(core.types.switchCase(core.types.stringLiteral(key), [
                attributeBuildRequire({
                    KEY: core.types.identifier('_' + key),
                    CALLBACK: core.types.identifier(getCallbackNameForAttribute(key)),
                    PARSER_EXPRESSION: getParserExpressionByProperty(properties[key]),
                }),
                core.types.breakStatement()
            ]));
        }
        innerStatements.push(core.types.switchStatement(core.types.identifier('attribute'), switchCases));

        // Handle the 'any' callback...
        innerStatements.push(core.template.ast(`
            if (this.${getCallbackNameForAttribute('*')}) {
                this.${getCallbackNameForAttribute('*')}.call(this, ownedValue, ownedPrev, attribute);
            }
        `));

        // Make sure our code is within its own scope...
        statements.push(core.types.blockStatement(innerStatements));

        if (superCallback)
        {
            statements.push(
                core.types.expressionStatement(
                    core.types.callExpression(
                        core.types.arrowFunctionExpression([superCallback.params], superCallback.body),
                        [
                            core.types.identifier('attribute'),
                            core.types.identifier('prev'),
                            core.types.identifier('value')
                        ]
                    )
                )
            );
        }
        
        return core.types.classMethod(
            'method',
            core.types.identifier('attributeChangedCallback'),
            [
                core.types.identifier('attribute'),
                core.types.identifier('prev'),
                core.types.identifier('value')
            ],
            core.types.blockStatement(statements)
        );
    });
}

function replaceAttributeChangedCallback(parentPath, callback)
{
    let parentNode = parentPath.node;
    for (let i = 0; i < parentNode.body.length; ++i)
    {
        let classMethod = parentNode.body[i];
        if (classMethod.type === 'ClassMethod'
            && classMethod.kind === 'method'
            && classMethod.key.type === 'Identifier'
            && classMethod.key.name === 'attributeChangedCallback')
        {
            parentNode.body[i] = callback(classMethod);
            return;
        }
    }
    parentNode.body.push(callback(null));
}

function getParserExpressionByProperty(property)
{
    switch(property.type.name)
    {
        case 'Boolean':
            return core.template.expression.ast('value !== null');
        case 'String':
            return core.template.expression.ast('value');
        default:
            return core.template.expression('PARSER(value)')({ PARSER: property.type });
    } 
}

function getCallbackNameForAttribute(attribute)
{
    if (attribute === '*')
    {
        return '__any__AttributeChangedCallback';
    }
    else
    {
        return '__' + attribute + 'AttributeChangedCallback';
    }
}

var index = helperPluginUtils.declare(api => {
    api.assertVersion(7);

    const visitor = {
        ImportDeclaration(path)
        {
            let node = path.node;
            if (node.source.type === 'StringLiteral' && node.source.value === 'cuttle')
            {
                path.remove();
                return;
            }
        },
        ClassMethod(path)
        {
            // `static get properties()`
            let node = path.node;
            if (!node.static
                || node.kind !== 'get'
                || node.key.name !== 'properties')
                return;
            
            const properties = evaluate(path);
            generate(properties, path);
            generate$1(properties, path);
            generate$2(properties, path);
            generate$3(properties, path);

            // Remove it from the class...
            path.remove();
        },
        CallExpression(path)
        {
            let node = path.node;

            if (node.callee.type === 'MemberExpression'
            && node.callee.object.name === 'Cuttle')
            {
                // `appendTemplate()`
                if (node.callee.property.name === 'appendTemplate')
                {
                    let componentInstance = node.arguments[0];
                    let templateElement = node.arguments[1];

                    let buildRequire = core.template(`
                        INSTANCE.shadowRoot.appendChild(TEMPLATE_ELEMENT.content.cloneNode(true))
                    `);
                    path.replaceWithMultiple(buildRequire({
                        INSTANCE: componentInstance,
                        TEMPLATE_ELEMENT: templateElement
                    }));
                    return;
                }
                // `appendStyle()`
                if (node.callee.property.name === 'appendStyle')
                {
                    let componentInstance = node.arguments[0];
                    let styleElement = node.arguments[1];

                    let buildRequire = core.template(`
                        INSTANCE.shadowRoot.appendChild(STYLE_ELEMENT.cloneNode(true))
                    `);
                    path.replaceWithMultiple(buildRequire({
                        INSTANCE: componentInstance,
                        STYLE_ELEMENT: styleElement
                    }));
                    return;
                }
                // `attachShadow()`
                if (node.callee.property.name === 'attachShadow')
                {
                    let componentInstance = node.arguments[0];
                    let templateElement = node.arguments[1];
                    let styleElement = node.arguments[2];

                    if (templateElement)
                    {
                        let buildRequire = core.template(`
                            INSTANCE.shadowRoot.appendChild(TEMPLATE_ELEMENT.content.cloneNode(true))
                        `);
                        path.parentPath.insertAfter(buildRequire({
                            INSTANCE: componentInstance,
                            TEMPLATE_ELEMENT: templateElement
                        }));
                    }

                    if (styleElement)
                    {
                        let buildRequire = core.template(`
                            INSTANCE.shadowRoot.appendChild(STYLE_ELEMENT.cloneNode(true))
                        `);
                        path.parentPath.insertAfter(buildRequire({
                            INSTANCE: componentInstance,
                            STYLE_ELEMENT: styleElement
                        }));
                    }

                    {
                        let buildRequire = core.template(`
                            INSTANCE.attachShadow({ mode: 'open' })
                        `);
                        path.replaceWithMultiple(buildRequire({
                            INSTANCE: node.arguments[0]
                        }));
                    }

                    return;
                }
                // `defineComponent()`
                if (node.callee.property.name === 'defineComponent')
                {
                    let classTarget = node.arguments[0];
                    let tagName = node.arguments[1];
                    let extendedTagName = node.arguments[2];
                    let shadowOpts = node.arguments[3];
                    
                    let shadowArgs = [];
                    if (extendedTagName) shadowArgs.push(core.types.objectProperty(core.types.identifier('extends'), extendedTagName));
                    if (shadowOpts) shadowArgs.push(core.types.spreadElement(shadowOpts));
                    
                    {
                        let buildRequire = core.template(`
                            window.customElements.define(TAG_NAME, CLASS_TARGET, SHADOW_OPTS)
                        `);
                        path.replaceWithMultiple(buildRequire({
                            TAG_NAME: tagName,
                            CLASS_TARGET: classTarget,
                            SHADOW_OPTS: shadowArgs.length > 0 ? core.types.objectExpression(shadowArgs) : undefined
                        }));
                    }

                    return;
                }
                // `createTemplateElement()`
                if (node.callee.property.name === 'createTemplateElement')
                {
                    let buildRequire = core.template(`
                        (function createTemplateElement(templateString) {
                            let element = document.createElement('template');
                            element.innerHTML = templateString;
                            return element;
                        })(ARGUMENT)
                    `);
                    path.replaceWithMultiple(buildRequire({
                        ARGUMENT: node.arguments[0]
                    }));
                    return;
                }
                // `createStyleElement()`
                if (node.callee.property.name === 'createStyleElement')
                {
                    let buildRequire = core.template(`
                        (function createStyleElement(styleString) {
                            let element = document.createElement('style');
                            element.innerHTML = styleString;
                            return element;
                        })(ARGUMENT)
                    `);
                    path.replaceWithMultiple(buildRequire({
                        ARGUMENT: node.arguments[0]
                    }));
                    return;
                }
                // `bindAttributeChanged()`
                if (node.callee.property.name === 'bindAttributeChanged')
                {
                    let componentInstance = node.arguments[0];
                    let attributeName = node.arguments[1];
                    let callback = node.arguments[2];

                    let buildRequire = core.template(`
                        INSTANCE.CALLBACK_NAME = CALLBACK
                    `);
                    path.replaceWithMultiple(buildRequire({
                        INSTANCE: componentInstance,
                        CALLBACK_NAME: getCallbackNameForAttribute(attributeName.value),
                        CALLBACK: callback
                    }));
                    return;
                }
                // `find()`
                if (node.callee.property.name === 'find')
                {
                    let componentInstance = node.arguments[0];
                    let selectors = node.arguments[1];

                    let buildRequire = core.template(`
                        (INSTANCE.shadowRoot || INSTANCE).querySelector(SELECTORS)
                    `);
                    path.replaceWithMultiple(buildRequire({
                        INSTANCE: componentInstance,
                        SELECTORS: selectors
                    }));

                    return;
                }
                // `findById()`
                if (node.callee.property.name === 'find')
                {
                    let componentInstance = node.arguments[0];
                    let id = node.arguments[1];

                    let buildRequire = core.template(`
                        (INSTANCE.shadowRoot || INSTANCE).getElementById(ID)
                    `);
                    path.replaceWithMultiple(buildRequire({
                        INSTANCE: componentInstance,
                        ID: id
                    }));

                    return;
                }
                // `findAll()`
                if (node.callee.property.name === 'find')
                {
                    let componentInstance = node.arguments[0];
                    let selectors = node.arguments[1];

                    let buildRequire = core.template(`
                        (INSTANCE.shadowRoot || INSTANCE).querySelectorAll(SELECTORS)
                    `);
                    path.replaceWithMultiple(buildRequire({
                        INSTANCE: componentInstance,
                        SELECTORS: selectors
                    }));

                    return;
                }
                // `getRootElement()`
                if (node.callee.property.name === 'getRootElement')
                {
                    let componentInstance = node.arguments[0];

                    let buildRequire = core.template(`
                        (INSTANCE.shadowRoot || INSTANCE)
                    `);
                    path.replaceWithMultiple(buildRequire({
                        INSTANCE: componentInstance
                    }));
                    
                    return;
                }
            }
        }
    };

    return {
        name: 'transform-cuttle',
        visitor
    };
});

module.exports = index;
