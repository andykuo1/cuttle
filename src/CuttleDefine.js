/** @module CuttleDefine */

import {
    classProperties,
    buildClassProperties
} from './properties/ClassProperties.js';
import {
    assignObservedAttributesForProperties,
    assignAttributeChangedCallbackForProperties
} from './properties/ObservedAttributes.js';
import {
    createElementFromString,
    createTemplateElementFromString
} from './util/WebComponentHelper.js';

/**
 * Defines the passed-in element as a WebComponent with options. This should be called after class definition.
 * @param {String|Object} opts The tag name. Or, if the parameter is of object type, the element options.
 * @param opts.name The custom element tag name.
 * @param opts.shadowTemplate The <template> element to attach to the shadow root.
 * @param opts.custom The customElements.define() options. If false, then will not define custom tag.
 * @param opts.properties The properties object map for the element.
 */
export function define(elementClass, opts)
{
    const isObject = typeof opts === 'object';

    // Properties...
    if (isObject && opts.properties)
    {
        defineProperties(elementClass, opts.properties);
    }
    else if (elementClass.hasOwnProperty('properties'))
    {
        defineClassProperties(elementClass, elementClass.properties)
    }

    // Shadow template...
    if (isObject && opts.shadowTemplate)
    {
        defineShadowTemplate(elementClass, opts.shadowTemplate);
    }
    else if (elementClass.hasOwnProperty('shadowTemplate'))
    {
        defineShadowTemplate(elementClass, elementClass.shadowTemplate);
    }

    // Custom tag...
    // NOTE: This must be last in the function as it will call the element
    // constructor before end of function.
    if (typeof opts === 'string')
    {
        defineCustomTag(elementClass, opts);
    }
    // Only define if custom is NOT false...
    else if (isObject && opts.custom !== false && opts.name)
    {
        defineCustomTag(elementClass, opts.name, opts.custom || {});
    }

    return elementClass;
}

function defineClassProperties(elementClass, properties)
{
    // Just in case it was already defined somewhere...
    if (!elementClass.hasOwnProperty(classProperties))
    {
        buildClassProperties(elementClass, properties);
    
        // Setup our functions such that they are always called, regardless if the user overrides it.
        assignObservedAttributesForProperties(elementClass);
        assignAttributeChangedCallbackForProperties(elementClass);
    }
    else
    {
        console.error(`[Cuttle] Found duplicate property definition for <${tagName}>... ignoring re-definition.`);
    }
}
/** Gets the classProperties for the element class. */
export function getDefinedClassProperties(elementClass)
{
    return elementClass[classProperties];
}

const shadowTemplate = Symbol('shadowTemplate');
function defineShadowTemplate(elementClass, templateElement)
{
    if (!elementClass.hasOwnProperty(shadowTemplate))
    {
        if (templateElement instanceof Element)
        {
            // Continue as normal; just don't process as an object map.
        }
        else if (typeof templateElement === 'string')
        {
            templateElement = createElementFromString(templateElement);
        }
        else if (typeof templateElement === 'object')
        {
            templateElement = createTemplateElementFromString(templateElement.template, templateElement.style);
        }
        elementClass[shadowTemplate] = templateElement;
    }
    else
    {
        console.error(`[Cuttle] Found duplicate shadow template definition for <${tagName}>... ignoring re-definition.`);
    }
}
/** Gets the shadow template for the element class. */
export function getDefinedShadowTemplate(elementClass)
{
    return elementClass[shadowTemplate];
}

/**
 * Register the passed-in element class with the passed-in tag name for the document.
 * This should be called once after class definition.
 * @param {Class} elementClass          The class to represent.
 * @param {String} tagName              The tag name that represents the tag in HTML.
 * @param {Object} customOpts           The additional options to define custom tags.
 * @param {String} customOpts.extends   The name of the tag this Element is an extension of.
 *                                      This will be passed to customElement.define().
 *                                      Refer to the web component specifications for
 *                                      more information.
 */
function defineCustomTag(elementClass, tagName, customOpts)
{
    // Just in case it was already defined somewhere...
    if (!window.customElements.get(tagName))
    {
        window.customElements.define(tagName, elementClass, customOpts);
    }
    else
    {
        console.error(`[Cuttle] Found duplicate tag definition of <${tagName}>... ignoring re-definition.`);
    }
}