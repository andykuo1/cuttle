import * as Middleware from './Middleware.js';
import * as Properties from '../../properties.js';

Middleware.define('Property', function(key, callback) {
    const propertyType = callback.call(this);
    const properties = { [key]: propertyType };
    let result = {
        propertyMap: Properties.parsePropertiesToPropertyAccessors(properties),
        observedAttributes()
        {
            return Properties.parsePropertiesToObservedAttributes(properties);
        },
        connectedCallback()
        {
            Properties.setupPropertyWhenConnectedCallback.call(this, key, propertyType);
        },
        attributeChangedTestCases: {
            [key](attribute, prev, value)
            {
                Properties.updatePropertyWhenAttributeChanged.call(this, key, propertyType, attribute, prev, value);
            }
        }
    };
    return result;
});
