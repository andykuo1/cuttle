'use strict';

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var helperPluginUtils = require('@babel/helper-plugin-utils');
var core = require('@babel/core');
var Cuttle = _interopDefault(require('cuttle'));

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

function evaluate$1(path)
{
    let dst = [];
    let node = path.node;
    let returnStatement = node.body.body[node.body.body.length - 1];
    let returnedObject = returnStatement.argument;
    if (returnedObject.type === 'ArrayExpression')
    {
        for (let arrayElement of returnedObject.elements)
        {
            if (arrayElement.type === 'StringLiteral')
            {
                let event = arrayElement.value;
                if (!isGlobalEventHandler(event))
                {
                    dst.push(event);
                }
                else
                {
                    throw new Error('Cannot register a duplicate GlobalEventHandler event.');
                }
            }
            else
            {
                throw new Error('Unsupported event value type - must be a string.');
            }
        }

        return dst;
    }
    else
    {
        throw new Error('Unsupported properties object evaluation.');
    }
}

const GLOBAL_EVENT_HANDLER_KEYS = new Set([
    'onabort',
    'onblur',
    'onerror',
    'onfocus',
    'oncancel',
    'oncanplay',
    'onchange',
    'onclick',
    'onclose',
    'oncontextmenu',
    'oncuechange',
    'ondblclick',
    'ondrag',
    'ondragend',
    'ondragenter',
    'ondragexit',
    'ondragleave',
    'ondragstart',
    'ondrop',
    'ondurationchange',
    'onemptied',
    'onended',
    'onformdata',
    'ongotpointercapture',
    'oninput',
    'oninvalid',
    'onkeydown',
    'onkeypress',
    'onkeyup',
    'onload',
    'onloadeddata',
    'onloadedmetadata',
    'onloadend',
    'onloadstart',
    'onresize',
    'ontransitioncancel',
    'ontransitionend',
]);

function isGlobalEventHandler(eventName)
{
    return GLOBAL_EVENT_HANDLER_KEYS.has(eventName);
}

function generate(properties, path, context)
{
    replaceObservedAttributes(path, superCallback => {
        let returnArrayElements = [
            ...Object.keys(properties).map(value => core.types.stringLiteral(value)),
            ...context.events.map(value => core.types.stringLiteral('on' + value)),
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

function generate$1(properties, path, context)
{
    replaceConnectedCallback(path, superCallback => {
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

        // User-defined callback...
        if (superCallback)
        {
            statements.push(superCallback.body);
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

const EVENT_CALLBACK = Symbol('callback');

function generate$2(properties, path, context)
{
    for (let key of Object.keys(properties))
    {
        let property = properties[key];
        // Create getter...
        createGetterFromProperty(path, key, property);
        // Create setter...
        createSetterFromProperty(path, key, property);
    }
}

function createGetterFromProperty(path, key, property)
{
    if (property === EVENT_CALLBACK) key = 'on' + key;
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
    if (property === EVENT_CALLBACK)
    {
        let event = key;
        key = 'on' + event;
        statement = `if (this._${key}) this.removeEventListener('${event}', this._${key});`
            + `this._${key} = value;`
            + `if (this._${key}) this.addEventListener('${event}', value);`;
        statement = core.template.ast(statement);
    }
    else
    {
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
        statement = [core.template.ast(statement)];
    }
    let result = core.types.classMethod(
        'set',
        core.types.identifier(key),
        [ core.types.identifier('value') ],
        core.types.blockStatement(statement)
    );
    path.insertAfter(result);
}

function generate$3(properties, path, context)
{
    replaceAttributeChangedCallback(path, superCallback => {
        let statements = [];

        let switchCases = [];
        const attributeBuildRequire = core.template(`{
            let ownedPrev = this.KEY;
            let ownedValue = this.KEY = PARSER_EXPRESSION;
            (CALLBACK).call(INSTANCE, ownedValue, ownedPrev, attribute);
        }
        `);
        for(let key of Object.keys(properties))
        {
            if (key in context.attributeChangedCallbacks)
            {
                switchCases.push(core.types.switchCase(core.types.stringLiteral(key), [
                    attributeBuildRequire({
                        KEY: core.types.identifier('_' + key),
                        INSTANCE: context.attributeChangedCallbacks[key].instance,
                        PARSER_EXPRESSION: getParserExpressionByProperty(properties[key]),
                        CALLBACK: context.attributeChangedCallbacks[key].callback,
                    }),
                    core.types.breakStatement()
                ]));
            }
        }

        const eventBuildRequire = core.template(`{
            this.KEY = new Function('event', 'with(document){with(this){' + value + '}}').bind(INSTANCE);
        }
        `);
        for(let event of context.events)
        {
            switchCases.push(core.types.switchCase(core.types.stringLiteral('on' + event), [
                eventBuildRequire({
                    KEY: core.types.identifier('on' + event),
                    INSTANCE: core.types.thisExpression(),
                }),
                core.types.breakStatement()
            ]));
        }
        statements.push(core.types.switchStatement(core.types.identifier('attribute'), switchCases));
        
        if (superCallback)
        {
            statements.push(
                core.types.expressionStatement(
                    core.types.callExpression(
                        core.types.arrowFunctionExpression(superCallback.params, superCallback.body),
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

var index = helperPluginUtils.declare(api => {
    api.assertVersion(7);
    const context = {
        properties: {},
        events: [],
        attributeChangedCallbacks: {}
    };
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
        ClassBody: {
            exit(path)
            {
                let properties = context.properties;
                generate(properties, path, context);
                generate$1(properties, path);
                generate$3(properties, path, context);
            }
        },
        ClassMethod(path)
        {
            let node = path.node;
            // `static get properties()`
            if (node.static && node.kind === 'get' && node.key.name === 'properties')
            {
                let properties = evaluate(path);
                context.properties = properties;
    
                generate$2(properties, path);
                
                // Remove it from the class...
                path.remove();
            }
            // `static get events()`
            else if (node.static && node.kind === 'get' && node.key.name === 'events')
            {
                let events = evaluate$1(path);
                context.events = events;

                let eventProperties = {};
                for(let event of events)
                {
                    eventProperties[event] = EVENT_CALLBACK;
                }
                generate$2(eventProperties, path);
                
                // Remove it from the class...
                path.remove();
            }
        },
        CallExpression(path)
        {
            let node = path.node;

            if (node.callee.type === 'MemberExpression'
                && node.callee.object.name === 'Cuttle')
            {
                let name = node.callee.property.name;
                let func = Cuttle[name];

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
                // `bindAttributeChanged()`
                else if (node.callee.property.name === 'bindAttributeChanged')
                {
                    let componentInstance = node.arguments[0];
                    let attributeName = node.arguments[1];
                    let callback = node.arguments[2];

                    context.attributeChangedCallbacks[attributeName.value] = {
                        instance: componentInstance,
                        callback
                    };

                    path.remove();
                    return;
                }
                else if ('template' in func)
                {
                    let templateOpts = func.template;
                    let buildRequire = core.template(templateOpts.content);
                    let argumentMap = templateOpts.constants ? { ...templateOpts.constants } : {};
                    for(let i = 0; i < templateOpts.arguments.length; ++i)
                    {
                        let templateArg = templateOpts.arguments[i];
                        if (typeof templateArg === 'string')
                        {
                            argumentMap[templateArg] = node.arguments[i];
                        }
                        else if (typeof templateArg === 'object')
                        {
                            let templateValue = templateArg.value;
                            if (typeof templateValue === 'string')
                            {
                                argumentMap[templateArg.name] = templateValue;
                            }
                            else if (typeof templateValue === 'function')
                            {
                                argumentMap[templateArg.name] = templateValue(node.arguments[i]);
                            }
                            else
                            {
                                throw new Error('Unknown argument value type.');
                            }
                        }
                        else
                        {
                            throw new Error('Unknown argument identifier type.');
                        }
                    }
                    path.replaceWithMultiple(buildRequire(argumentMap));
                    return;
                }
                else if (func)
                {
                    let argumentMap = {};
                    for(let i = 0; i < node.arguments.length; ++i)
                    {
                        argumentMap['ARGUMENT' + i] = node.arguments[i];
                    }
                    let buildRequire = core.template(`(${func.toString()})(${Object.keys(argumentMap).join(',')})`);
                    path.replaceWithMultiple(buildRequire(argumentMap));
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
