import * as Middleware from './Middleware.js';
import * as Properties from '../../utils/properties.js';

Middleware.define('Property', function(key, callback) {
    const propertyType = callback.call(this);
    const properties = { [key]: propertyType };
    let result = {
        propertyMap: Properties.getPropertyAccessorsForProperties(properties),
        observedAttributes()
        {
            return Properties.getObservedAttributesForProperties(properties);
        },
        connectedCallback()
        {
            Properties.preparePropertyOnConnected.call(this, key, propertyType);
        },
        attributeChangedTestCases: {
            [key](attribute, prev, value)
            {
                Properties.updatePropertyOnAttributeChanged.call(this, key, propertyType, attribute, prev, value);
            }
        }
    };
    return result;
});
