/** @module ElementProperties */

import {
    getAttributeDataAsProperty,
    setAttributeDataAsProperty,
    getAttributeNameFromProperty
} from './PropertyType.js';

/**
 * The key for requestPropertyUpdate to determine if the data is set from attribute side.
 */
export const ATTRIBUTE_SIDE = Symbol('ATTRIBUTE_SIDE');

/**
 * The key for requestPropertyUpdate to determine if the data is set from property side.
 */
export const PROPERTY_SIDE = Symbol('PROPERTY_SIDE');

/**
 * Load and initialize the properties for the element. This should be called
 * in the constructor. Otherwise, some browsers may auto-insert their own
 * property-attribute entries, which will incur infinite loops.
 *
 * This does the same thing as calling addProperty() for every property.
 * 
 * @param {HTMLElement} element         The element to construct properties for.
 * @param {Object} properties           The property options to construct from.
 * @param {Map} properties.options      A map of property names to their respective options.
 * @param {Map} properties.attributes   A map of attribute names to their corresponding property name.
 */
export function addPropertiesToElement(element, properties)
{
    for (const [property, opts] of properties.options.entries())
    {
        addPropertyToElement(element, property, opts);
    }
}

/**
 * Creates a property for the element linked with an attribute, along with data.
 * This will also setup any getters and setters needed to maintain the data link.
 * However, this does not handle attribute data changes. To be fully effective,
 * the changed property should be set in attributeChangedCallback(). For example:
 *
 * @example
 * attributeChangedCallback(attribute, oldValue, newValue) {
 *  // Assumes the property name is the same as the attribute name.
 *  // This may not always be the case for camelCase properties.
 *  this[attribute] = newValue;
 * }
 *
 * @param {HTMLElement} element     The element to add the property to.
 * @param {String} property         The property name.
 * @param {Object} opts             The additional property options.
 * @param {*|Function} opts.type    The type of the property. If a function, it will be
 *                                  called with the attribute data string to parse to a valid
 *                                  property value.
 * @param {Boolean} [opts.reflect]  Whether to reflect the property changes to attributes
 * @param {String} [opts.attribute] The attribute name linked to the property. If undefined,
 *                                  it will convert the property name to dash-case and use
 *                                  that instead. If null, no changes to any attribute will
 *                                  update this property.
 * @param {Function} [opts.set]     If set, called before the property setter for a
 *                                  chance to alter the value before change.
 * @param {Function} [opts.get]     If set, called after the property getter for a
 *                                  chance to alter the value before return.
 */
function addPropertyToElement(element, property, opts)
{
    const propertyDescriptor = createPropertyDescriptor(property, opts);
    const attribute = getAttributeNameFromProperty(property);

    let defaultValue = undefined;
    // Synchronize property to attribute value.
    if (element.hasAttribute(attribute))
    {
        defaultValue = getAttributeDataAsProperty(element, attribute, opts);
    }
    // Upgrade initially set property. So any properties defined in the constructor (or earlier by
    // other frameworks) are treated as default values for the new created property.
    else if (element.hasOwnProperty(property))
    {
        defaultValue = element[property];
        delete element[property];
    }

    // TODO: If Angular didn't set values BEFORE the constructor, we could allow
    // users to modify the getters and setters. But, assuming they use defineProperty(),
    // any user-defined changes will be overriden by Angular. Therefore, for now,
    // existing accessors with the same name as properties are errors.

    // Do not override user-defined getters and setters. Tell them it's wrong!
    // Refer to the comment above for the reasoning.
    // If they want to modify the data as it is set, they should use
    // changedCallback() instead. Otherwise, for default values, set the property
    // in the constructor.
    const existingDescriptor = Object.getOwnPropertyDescriptor(element, property);
    if (existingDescriptor)
    {
        //TODO: It never gets here actually, because the previous block deletes it.
        if (typeof existingDescriptor.get === 'function')
        {
            throw new Error('Found conflicting getter for instance.');
        }
        if (typeof existingDescriptor.set === 'function')
        {
            throw new Error('Found conflicting setter for instance.');
        }
    }

    // Add the property to the element.
    Object.defineProperty(element, property, propertyDescriptor);

    // Call this after the setter has been set, otherwise you cannot use this.property in changedCallback().
    if (typeof defaultValue !== 'undefined')
    {
        // Call setter on element for default value. This allows reflection and other type handling.
        element[property] = defaultValue;
    }
}

/**
 * The key to re-entry flag for overridden property accessors.
 */
const reentrantFlag = Symbol('reentrantFlag');

/**
 * Creates object property descriptor for property.
 * @param {String} propert the name of the property
 * @param {Object} opts the property descriptor options
 */
function createPropertyDescriptor(property, opts)
{
    // The property key for the object. Otherwise, it would be ambiguous whether it is a property or a getter.
    const dataKey = `__${property}`;
    return {
        get()
        {
            // Let the user override our value.
            if (opts.get && !opts.get[reentrantFlag])
            {
                // Stop the property accessor from re-enter
                opts.get[reentrantFlag] = true;
                const result = opts.get.call(this);
                opts.get[reentrantFlag] = false;
                return result;
            }
            else
            {
                return this[dataKey];
            }
        },
        set(value)
        {
            const prevValue = this[property];

            // Let the user override our value.
            if (opts.set && !opts.set[reentrantFlag])
            {
                // Stop the property accessor from re-enter
                opts.set[reentrantFlag] = true;
                opts.set.call(this, value);
                opts.set[reentrantFlag] = false;
            }
            else
            {
                // Set the property value.
                this[dataKey] = value;

                // Then try to update, if necessary ...
                requestPropertyUpdate(this, property, opts, prevValue, value, PROPERTY_SIDE);
            }
        },

        // This is by default...
        configurable: true,
        enumerable: false,
    };
}

/**
 * The key for whether to stop propagating update requests with the element.
 */
const stopPropagateUpdate = Symbol('stopPropagateUpdate');

/**
 * Called by property setters to signify a change in value. This will usually update the
 * attribute/property or allow the user to handle the change.
 */
function requestPropertyUpdate(element, property, opts, oldValue, newValue, sourceSide)
{
    // Don't propagate changes until the end of ALL the changes here.
    if (element[stopPropagateUpdate]) return;

    // It's already up-to-date. Don't update it.
    if (oldValue === newValue) return;

    // Stop changes from propagating! :(
    element[stopPropagateUpdate] = true;
    {
        // Handle changes only if this is a connected element...
        if (sourceSide === ATTRIBUTE_SIDE)
        {
            element[property] = newValue;
        }
        else if (sourceSide === PROPERTY_SIDE && element.isConnected && opts.reflect)
        {
            setAttributeDataAsProperty(element, opts.attribute, opts, newValue);
        }

        // If property has callback, call it.
        if (typeof opts.changedCallback === 'function')
        {
            opts.changedCallback.call(element, oldValue, newValue);
        }
    }
    // Allow changes to propagate again! :D
    element[stopPropagateUpdate] = false;
}
