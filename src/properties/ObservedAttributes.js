/** @module ObservedAttributes */

import { classProperties } from './ClassProperties.js';

/**
 * Assigns attributeChangedCallback() function that will correctly update component
 * properties from classProperties. Assumes buildClassProperties() has already been
 * successfully called.
 * 
 * Although you can just override the function in the class, if the user overrides
 * our definition, they are able to NOT call our function, by omitting a super call, which
 * is bad. By forcing any user-defined override to be called by our function instead, effectively
 * always calling super() first, this negates the issue.
 * 
 * NOTE: The difference for attributeChangedCallback is that it is an instance function.
 */
export function assignAttributeChangedCallbackForProperties(elementClass)
{
    const attributeChangedCallback = Object.getOwnPropertyDescriptor(elementClass.prototype, 'attributeChangedCallback');

    // Re-define attributeChangedCallback to update properties...
    Object.defineProperty(elementClass.prototype, 'attributeChangedCallback',
        {
            value: function (attribute, oldValue, newValue)
            {
                // Call user-defined function...
                if (attributeChangedCallback) attributeChangedCallback.value.call(this, attribute, oldValue, newValue);

                // Don't bother parsing if the attribute data string is the same.
                if (oldValue === newValue) return;

                const elementClass = this.constructor;
                // Not all attributes are added/handled in class properties...
                const elementClassProperties = elementClass[classProperties];
                if (elementClassProperties.attributes.has(attribute))
                {
                    // Gets the property linked to the attribute.
                    const property = elementClassProperties.attributes.get(attribute);
                    const opts = elementClassProperties.options.get(property);

                    // Parse the attribute data strings to property values of valid type.
                    const oldPropertyValue = this[property];
                    const newPropertyValue = attributeToPropertyData(opts.type, newValue);

                    // Will cause the element to update data. Since this is called
                    // whenever a change occurs on the tag, even at the beginning,
                    // the data will always be synchronized when attribute is set.
                    requestPropertyUpdate(this, property, opts,
                        oldPropertyValue, newPropertyValue, ATTRIBUTE_SIDE);
                }
            }
        });
}

/**
 * Assigns observedAttributes() function that will return the appropriate value calculated
 * from classProperties. Assumes buildClassProperties() has already been successfully called.
 * 
 * Although you can just override the function in the class, if the user overrides
 * our definition, they are able to NOT call our function, by omitting a super call, which
 * is bad. By forcing any user-defined override to be called by our function instead, effectively
 * always calling super() first, this negates the issue.
 * 
 * NOTE: The difference for observedAttributes is that it is a static property.
 */
export function assignObservedAttributesForProperties(elementClass)
{
    // Keep user-defined observed attributes...
    const observedAttributes = Object.getOwnPropertyDescriptor(elementClass, 'observedAttributes');

    // Re-define observed attributes to match properties...
    Object.defineProperty(elementClass, 'observedAttributes',
        {
            get()
            {
                // Since assignObservedAttributeForProperties() is only ever called AFTER
                // buildClassProperties(), it can safely assume classProperties exist
                // without re-building it.
                const result = Array.from(this[classProperties].attributes.keys());

                // Call user-defined function...
                if (observedAttributes)
                {
                    return result.concat(observedAttributes.get.call(this));
                }

                return result;
            },
            configurable: true,
            enumberable: false,
        });
}
