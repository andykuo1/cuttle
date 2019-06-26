/** @module PropertyType */

/* -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-= */
/*
 * Here's some useful attribute-property handling functions. Since attributes are always
 * strings, it gets difficult to work with different types, like numbers or objects.
 * If working solely with attributes, any computation you do must parse from string to the
 * expected type, and back, to update the value.
 * Therefore, the solution is to keep the parsed value as properties of the element, separate
 * but synchronized, with the corresponding tag attributes. Any computations, which are
 * usually done in JavaScript, will manipulate the correctly parsed properties. Then, to
 * maintain the link with the DOM attributes, the property values should update the attributes
 * as well.
 */
/* -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-= */

/**
 * Creates a custom type that matches the format for attribute to property conversions
 * and vice versa. It functions similarly to how Number, String, Object, etc. parse and
 * stringify values.
 * 
 * @example An example for integer type.
 * const Integer = CustomType(
 *      (value) => { return parseInt(value, 10); },
 *      (value) => { return `${value}`; }
 * );
 * // To parse into a string...
 * Integer.stringify(10);
 * // To parse into the defined data type from a string...
 * Integer('10');
 * 
 * @param {Function} parseCallback      The parse function for the custom type.
 * @param {Function} stringifyCallback  The stringify function for the custom type.
 * @returns {Function} The custom type.
 */
export function CustomType(parseCallback, stringifyCallback)
{
    Object.defineProperty(parseCallback, 'stringify', {
        value: stringifyCallback
    });
    return parseCallback;
}

/**
 * Gets the converted property value from string to its expected type.
 * @param {*|Function} propertyType The data type to convert to.
 * @param {String} attributeData    The attribute data to convert from.
 * @returns {*} The converted data for the property of passed-in type.
 */
export function attributeToPropertyData(propertyType, attributeData)
{
    switch (propertyType || String)
    {
        case Object:
            return JSON.parse(attributeData);
        case Boolean:
            // Although this is usually handled in getAttributeDataAsProperty(), sometimes
            // you need to parse attribute data directly without access to the
            // element. The only valid FALSE value for an attribue is to not
            // declare it. Therefore, it's value could either be undefined or null.
            return attributeData !== null || typeof attributeData !== 'undefined';
        default:
            // This should not only handle custom type functions, but also
            // String, Number, etc.
            if (typeof propertyType === 'function') return propertyType(attributeData);

            // Otherwise, just use the data as-is.
            return attributeData;
    }
}

/**
 * Gets the converted attribute value from its property type to a string.
 * @param {*|Function} propertyType The data type to convert from.
 * @param {*} propertyData          The property data to convert from.
 * @returns {String} The converted string for the attribute of passed-in type.
 */
export function propertyToAttributeData(propertyType, propertyData)
{
    switch (propertyType || String)
    {
        case Object:
            return JSON.stringify(propertyData);
        default:
            // This should allow it to handle custom type functions.
            if (typeof propertyType['stringify'] === 'function')
            {
                return propertyType.stringify(propertyData);
            }

            // Otherwise, just use the data as-is.
            return propertyData;
    }
}

/**
 * Gets the property value from the current attribute.
 * @param {HTMLElement} element The element the attribute belongs to.
 * @param {String} attribute    The attribute to get the value from.
 * @param {Object} opts         The property options.
 */
export function getAttributeDataAsProperty(element, attribute, opts)
{
    const propertyType = opts.type;
    if (propertyType === Boolean)
    {
        return element.hasAttribute(attribute);
    }

    const attributeData = element.getAttribute(attribute);
    return attributeToPropertyData(propertyType, attributeData);
}

/**
 * Sets the current attribute to the property value.
 * @param {HTMLElement} element The element the attribute belongs to.
 * @param {String} attribute    The attribute to set the value for.
 * @param {Object} opts         The property options.
 * @param {*} value             The value to update the attribute to.
 */
export function setAttributeDataAsProperty(element, attribute, opts, value = null)
{
    const propertyType = opts.type;
    // Booleans are special. As an attribute, they can be defined simply
    // by whether they exist and not by their actual data.
    if (propertyType === Boolean)
    {
        if (value)
        {
            element.setAttribute(attribute, '');
        }
        else
        {
            element.removeAttribute(attribute);
        }

        // If it's a boolean, its data is irrelevant. So stop here.
        return;
    }

    // Process the data, based on type.
    const attributeData = propertyToAttributeData(opts.type, value);
    element.setAttribute(attribute, attributeData);
}

/**
 * Gets the lowercase, dash-separated attribute name from the property name.
 * Any uppercase characters are prepended with a dash. In other words, it
 * transforms the property name, which is in camelCase, to valid attribute
 * name, in dash-case.
 * @param {String} property The name of the property.
 * @returns {String} The converted attribute name from the property.
 */
export function getAttributeNameFromProperty(property)
{
    return property.replace(/([A-Z])/g, '-$1').toLowerCase();
}
