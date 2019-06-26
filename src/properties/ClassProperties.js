/** @module ClassProperties */

import { getAttributeNameFromProperty } from './PropertyType.js';

export const classProperties = Symbol('classProperties');

/**
 * Builds the property map and properly initializes the class. This is only done once by
 * observedAttributes(). Only pass in newly defined properties or else it will be duplicated
 * from inherited class properties.
 */
export function buildClassProperties(elementClass, elementProperties)
{
    // Only build it if it doesn't exist.
    if (elementClass.hasOwnProperty(classProperties)) return;

    // Initialize current property map (with parent's properties).
    prepareClassProperties(elementClass);

    // Add new properties to the hierarchy (don't re-add old ones).
    if (elementProperties)
    {
        for (const property of Object.getOwnPropertyNames(elementProperties))
        {
            addClassProperty(elementClass, property, elementProperties[property]);
        }
    }
}

/**
 * Creates a new class properties for the class.
 */
function prepareClassProperties(elementClass)
{
    let optionMap;
    let attributeMap;

    // Build properties for parents too...
    const superClass = Object.getPrototypeOf(elementClass);

    // NOTE: Since the super class of the passed-in element must be defined
    // to be initially set as the super class, the class properties initialization
    // must have already been executed for the initialization of that class.
    // This assumes that every class if defined in its own module file and is referenced
    // by static imports, therefore always processed before the child class.
    // However, for the case if classes were defined out-of-order or dynamically,
    // a super class may not yet have the chance to inititalize. Therefore, we must
    // try to initialize it here.
    /*
    // NOTE: This is only possible if there is some sort of indicator in the class itself
    // to signify it is a web component using this helper. Since there are no such
    // common indicators that apply to ALL components, we MUST require the user to
    // call our define() functions BEFORE using it. Therefore, out-of-order is no longer
    // an issue.
    // Here is the code for posterity:
    if (typeof superClass[buildProperties] === 'function')
    {
        superClass[buildProperties]();
    }
    */

    if (superClass && superClass.hasOwnProperty(classProperties))
    {
        // Derive class properties from parent...
        const superClassProperties = superClass[classProperties];
        optionMap = new Map(superClassProperties.options);
        attributeMap = new Map(superClassProperties.attributes);
    }
    else
    {
        // Standalone class properties...
        optionMap = new Map();
        attributeMap = new Map();
    }

    // Actually assign class properties to result.
    elementClass[classProperties] = {
        options: optionMap,
        attributes: attributeMap,
    };
}

/**
 * Adds a property to the class properties. These are used to define the properties
 * of its children and instances.
 */
function addClassProperty(elementClass, property, opts)
{
    // Define attribute name for property...
    if (typeof opts.attribute === 'undefined')
    {
        opts.attribute = getAttributeNameFromProperty(property);
    }

    // Add the property to the class.
    const elementClassProperties = elementClass[classProperties];
    elementClassProperties.options.set(property, opts);
    if (opts.attribute)
    {
        elementClassProperties.attributes.set(opts.attribute, property);
    }
}