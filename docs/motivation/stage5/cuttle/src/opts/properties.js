/**
 * @module Properties
 * @description
 * Evaluates `static get properties()` to custom element observedAttributes(), get(), and set().
 */

/** Generates the transform object for this module. */
export function transformify(elementConstructor, properties = elementConstructor.properties)
{
    if (!(elementConstructor.prototype instanceof HTMLElement)) throw new Error('Custom elements must extend HTMLElement.');
    if (!properties) return {};
    
    let classPropertyMap = {};
    // Generates get() and set()...
    parsePropertiesToPropertyAccessors(properties, classPropertyMap);
    
    return {
        classPropertyMap,
        // Override static observedAttributes() with properties
        observedAttributes: getObservedAttributesFunctionsForProperties(properties),
        // Override connectedCallback() with defaultProperty() and upgradeProperty()...
        connectedCallback: getConnectedCallbackFunctionsForProperties(properties),
        // Override attributeChangedCallback() to update _property values...
        attributeChangedCallback: getAttributeChangedCallbackFunctionsForProperties(properties)
    };
}

/** Handle cached object properties. */

function getAttributeChangedCallbackFunctionsForProperties(propertyEntries)
{
    return [
        function attributeChangedProperty(attribute, prev, value)
        {
            if (propertyEntries.hasOwnProperty(attribute))
            {
                const propertyEntry = propertyEntries[attribute];
                const propertyType = getTypeForPropertyEntry(propertyEntry);
                const parser = getParserForType(this, propertyType);
                const key = `_${attribute}`;
                
                const prevProp = this[key];
                const nextProp = this[key] = parser.call(this, value);
            }
        }
    ];
}

/** Handle default and upgraded properties. */

function getConnectedCallbackFunctionsForProperties(propertyEntries)
{
    function hasDefaultPropertyEntry(propertyEntry)
    {
        return typeof propertyEntry === 'object' && 'value' in propertyEntry;
    }
    
    function defaultProperty(self, propertyName, defaultValue)
    {
        if (!self.hasAttribute(propertyName))
        {
            self.setAttribute(propertyName, defaultValue);
        }
    }
    
    function upgradeProperty(self, propertyName)
    {
        if (self.hasOwnProperty(propertyName))
        {
            let value = self[propertyName];
            delete self[propertyName];
            self[propertyName] = value;
        }
    }

    return [
        function connectedDefaultProperties()
        {
            for(let key of Object.keys(propertyEntries))
            {
                let propertyEntry = propertyEntries[key];
                if (hasDefaultPropertyEntry(propertyEntry))
                {
                    defaultProperty(this, key, propertyEntry.value);
                }
            }
        },
        function connectedUpgradeProperties()
        {
            for(let key of Object.keys(propertyEntries))
            {
                upgradeProperty(this, key);
            }
        },
    ];
}

function getObservedAttributesFunctionsForProperties(propertyEntries)
{
    return [
        function observedAttributesProperties()
        {
            return Object.keys(propertyEntries);
        }
    ];
}

/** Parse static properties() to observedAttributes() and generate getters / setters. */

const USE_CACHED_VALUES_FOR_GETTER = true;

/**
 * @deprecated
 * Generates properties in the form `_propertyName` to serve as cached values.
 * 
 * Called to initialize cached properties in the constructor. However, values will be assigned during connectedCallback(), not in the constructor,
 * therefore the property is never used meaningfully besides user-defined property assignment, which will define the property in of itself. Because of
 * that, it renders this process useless.
 * 
 * It is possible that the user may want to iterate over all cached value properties, but I do not see a meaningful use case for this feature.
 */
function parsePropertiesToCachedObjectProperties(propertyEntries, dst = {})
{
    for(let key of Object.keys(propertyEntries))
    {
        // Create cached getter value
        dst[`_${key}`] = {
            writable: true
        };
    }
    return dst;
}

function parsePropertiesToPropertyAccessors(propertyEntries, dst = {})
{
    for(let key of Object.keys(propertyEntries))
    {
        let propertyEntry = propertyEntries[key];
        let type = getTypeForPropertyEntry(propertyEntry);
        let getter = getGetterForType(this, type, key);
        let setter = getSetterForType(this, type, key);

        dst[key] = {
            get() { return getter(this); },
            set(value) { setter(this, value); }
        };
    }
    return dst;
}

function getTypeForPropertyEntry(propertyEntry)
{
    return typeof propertyEntry === 'function' ? propertyEntry : propertyEntry.type;
}

function getParserForType(context, type)
{
    switch(type)
    {
        case String: return stringParser;
        case Boolean: return booleanParser;
        case Function: return functionParser;
        case Number: return numberParser;
        default: return customParser.bind(context, type);
    }
}

function getGetterForType(context, type, ...bindArgs)
{
    if (USE_CACHED_VALUES_FOR_GETTER)
    {
        return cachedGetter;
    }
    else
    {
        switch(type)
        {
            case String: return stringGetter;
            case Boolean: return booleanGetter;
            case Function: return functionGetter;
            case Number: return numberGetter;
            default: return customGetter.bind(context, type, ...bindArgs);
        }
    }
}

function getSetterForType(context, type, ...bindArgs)
{
    switch(type)
    {
        case String: return stringSetter;
        case Boolean: return booleanSetter;
        case Function: return functionSetter;
        case Number: return numberSetter;
        default: return customSetter.bind(context, type, ...bindArgs);
    }
}

function cachedGetter(key, self) { return self[`_${key}`]; }
function stringGetter(key, self) { return self.getAttribute(key); }
function booleanGetter(key, self) { return self.hasAttribute(key); }
function functionGetter(key, self) { return self[`_${key}`]; }
function numberGetter(key, self) { return Number(self.getAttribute(key)); }
function customGetter(parser, key, self) { return parser.call(this, self.getAttribute(key)); }

function stringSetter(key, self, value) { self.setAttribute(key, value); }
function booleanSetter(key, self, value) { if (value) self.setAttribute(key, ''); else self.removeAttribute(key); }
function functionSetter(key, self, value) { self[`_${key}`] = value; }
function numberSetter(key, self, value) { self.setAttribute(key, value); }
function customSetter(parser, key, self, value) { self.setAttribute(key, String(value)); }

function stringParser(value) { return value; }
function booleanParser(value) { return value === null ? false : true; }
function functionParser(value) { return new Function(`with(document){with(this){${value}}}`); }
function numberParser(value) { return Number(value); }
function customParser(parser, value) { return parser.call(this, value); }
