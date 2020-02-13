import { declare } from '@babel/helper-plugin-utils';
import { types, template } from '@babel/core';

import Cuttle from 'cuttle';

import * as PropertiesEvaluator from './PropertiesEvaluator.js';
import * as EventsEvaluator from './EventsEvaluator.js';
import * as ObservedAttributesGenerator from './ObservedAttributesGenerator.js';
import * as ConnectedCallbackGenerator from './ConnectedCallbackGenerator.js';
import * as PropertyAccessorGenerator from './PropertyAccessorGenerator.js';
import * as AttributeChangedCallbackGenerator from './AttributeChangedCallbackGenerator.js';

export default declare(api => {
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
                ObservedAttributesGenerator.generate(properties, path, context);
                ConnectedCallbackGenerator.generate(properties, path, context);
                AttributeChangedCallbackGenerator.generate(properties, path, context);
            }
        },
        ClassMethod(path)
        {
            let node = path.node;
            // `static get properties()`
            if (node.static && node.kind === 'get' && node.key.name === 'properties')
            {
                let properties = PropertiesEvaluator.evaluate(path);
                context.properties = properties;
    
                PropertyAccessorGenerator.generate(properties, path, context);
                
                // Remove it from the class...
                path.remove();
            }
            // `static get events()`
            else if (node.static && node.kind === 'get' && node.key.name === 'events')
            {
                let events = EventsEvaluator.evaluate(path);
                context.events = events;

                let eventProperties = {};
                for(let event of events)
                {
                    eventProperties[event] = PropertyAccessorGenerator.EVENT_CALLBACK;
                }
                PropertyAccessorGenerator.generate(eventProperties, path, context);
                
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
                    if (extendedTagName) shadowArgs.push(types.objectProperty(types.identifier('extends'), extendedTagName));
                    if (shadowOpts) shadowArgs.push(types.spreadElement(shadowOpts));
                    
                    {
                        let buildRequire = template(`
                            window.customElements.define(TAG_NAME, CLASS_TARGET, SHADOW_OPTS)
                        `);
                        path.replaceWithMultiple(buildRequire({
                            TAG_NAME: tagName,
                            CLASS_TARGET: classTarget,
                            SHADOW_OPTS: shadowArgs.length > 0 ? types.objectExpression(shadowArgs) : undefined
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
                    let buildRequire = template(templateOpts.content);
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
                    let buildRequire = template(`(${func.toString()})(${Object.keys(argumentMap).join(',')})`);
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
