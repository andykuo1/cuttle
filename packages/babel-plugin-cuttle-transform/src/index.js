import { declare } from '@babel/helper-plugin-utils';
import { types, template } from '@babel/core';

import * as PropertiesEvaluator from './PropertiesEvaluator.js';
import * as ObservedAttributesGenerator from './ObservedAttributesGenerator.js';
import * as ConnectedCallbackGenerator from './ConnectedCallbackGenerator.js';
import * as PropertyAccessorGenerator from './PropertyAccessorGenerator.js';
import * as AttributeChangedCallbackGenerator from './AttributeChangedCallbackGenerator.js';

export default declare(api => {
    api.assertVersion(7);

    const visitor = {
        ImportDeclaration(path)
        {
            let node = path.node;
            if (node.source.type === 'StringLiteral' && node.source.value.endsWith('cuttle.js'))
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
            
            const properties = PropertiesEvaluator.evaluate(path);
            ObservedAttributesGenerator.generate(properties, path);
            ConnectedCallbackGenerator.generate(properties, path);
            PropertyAccessorGenerator.generate(properties, path);
            AttributeChangedCallbackGenerator.generate(properties, path);

            // Remove it from the class...
            path.remove();
        },
        CallExpression(path)
        {
            let node = path.node;

            if (node.callee.type === 'MemberExpression'
            && node.callee.object.name === 'cuttle')
            {
                // `attachShadow()`
                if (node.callee.property.name === 'attachShadow')
                {
                    let componentInstance = node.arguments[0];
                    let templateElement = node.arguments[1];
                    let styleElement = node.arguments[2];

                    if (templateElement)
                    {
                        let buildRequire = template(`
                            INSTANCE.shadowRoot.appendChild(TEMPLATE_ELEMENT.content.cloneNode(true))
                        `);
                        path.parentPath.insertAfter(buildRequire({
                            INSTANCE: componentInstance,
                            TEMPLATE_ELEMENT: templateElement
                        }));
                    }

                    if (styleElement)
                    {
                        let buildRequire = template(`
                            INSTANCE.shadowRoot.appendChild(STYLE_ELEMENT.cloneNode(true))
                        `);
                        path.parentPath.insertAfter(buildRequire({
                            INSTANCE: componentInstance,
                            STYLE_ELEMENT: styleElement
                        }));
                    }

                    {
                        let buildRequire = template(`
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
                // `createTemplate()`
                if (node.callee.property.name === 'createTemplate')
                {
                    let buildRequire = template(`
                        (function createTemplate(templateString) {
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
                // `createStyle()`
                if (node.callee.property.name === 'createStyle')
                {
                    let buildRequire = template(`
                        (function createStyle(styleString) {
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

                    let buildRequire = template(`
                        INSTANCE.CALLBACK_NAME = CALLBACK
                    `);
                    path.replaceWithMultiple(buildRequire({
                        INSTANCE: componentInstance,
                        CALLBACK_NAME: AttributeChangedCallbackGenerator.getCallbackNameForAttribute(attributeName.value),
                        CALLBACK: callback
                    }));
                    return;
                }
                // `find()`
                if (node.callee.property.name === 'find')
                {
                    let componentInstance = node.arguments[0];
                    let selectors = node.arguments[1];

                    let buildRequire = template(`
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

                    let buildRequire = template(`
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

                    let buildRequire = template(`
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

                    let buildRequire = template(`
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