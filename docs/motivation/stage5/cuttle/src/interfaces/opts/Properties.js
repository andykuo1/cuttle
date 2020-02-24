/**
 * @module Properties
 * @description
 * Evaluates `static get properties()` to custom element observedAttributes(), get(), and set().
 */
import * as Properties from '../../utils/properties.js';

/** Generates the transform object for this module. */
export function transformify(elementConstructor, properties = elementConstructor.properties)
{
    if (!(elementConstructor.prototype instanceof HTMLElement)) throw new Error('Custom elements must extend HTMLElement.');
    if (!properties) return {};
    
    return {
        // Generates get() and set()...
        propertyMap: Properties.getPropertyAccessorsForProperties(properties),
        // Override static observedAttributes() with properties
        observedAttributes()
        {
            return Properties.getObservedAttributesForProperties(properties);
        },
        // Override connectedCallback() with defaultProperty() and upgradeProperty()...
        connectedCallback()
        {
            for(let key of Object.keys(properties))
            {
                Properties.preparePropertyOnConnected.call(this, key, properties[key]);
            }
        },
        // Override attributeChangedCallback() to update _property values...
        attributeChangedCallback(attribute, prev, value)
        {
            for(let key of Object.keys(properties))
            {
                Properties.updatePropertyOnAttributeChanged.call(this, key, properties[key], attribute, prev, value);
            }
        }
    };
}
