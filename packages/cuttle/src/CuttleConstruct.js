/** @module CuttleConstruct */
import {
    addPropertiesToElement
} from './properties/ElementProperties.js';
import {
    getDefinedClassProperties,
    getDefinedShadowTemplate
} from './CuttleDefine.js';

/** This should be called in the constructor. */
export function construct(element, opts = {})
{
    // Why shadow root? Encapsulation and separation of style.
    // Why initialize here? Cause no one can mess with this.

    let shadowRootFlag = false;
    let propertiesFlag = false;

    // Object as options...
    if (typeof opts === 'object')
    {
        if (opts.shadow === false)
        {
            // Don't define a shadow root...
            shadowRootFlag = true;
        }
    }

    // None as options...
    if (!shadowRootFlag)
    {
        shadowRootFlag = true;
        const shadowTemplate = getDefinedShadowTemplate(element.constructor);
        constructShadowRoot(element, shadowTemplate, opts.shadow || { mode: 'open' });
    }
    if (!propertiesFlag)
    {
        propertiesFlag = true;
        const classProperties = getDefinedClassProperties(element.constructor);
        constructProperties(element, classProperties);
    }
    
    return element;
}

/**
 * Attach the shadow DOM root, with a childElement if specified, to the
 * element. This should be called in the constructor.
 * @param {Node} element        The element to attach to.
 * @param {Node} shadowTemplate The child element in the shadow DOM root.
 * @param {Object} opts         The options passed to attachShadow().
 */
export function constructShadowRoot(element, shadowTemplate, opts)
{
    const shadowRoot = element.attachShadow(opts);
    shadowRoot.appendChild(shadowTemplate.content.cloneNode(true));
}

function constructProperties(element, properties)
{
    addPropertiesToElement(element, properties);
}