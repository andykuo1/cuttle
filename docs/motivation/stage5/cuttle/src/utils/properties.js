/** Handle cached object properties. */
export function updatePropertyOnAttributeChanged(propertyName, propertyEntry, attribute, prev, value)
{
    const propertyType = getTypeFunctionForPropertyEntry(propertyEntry);
    const parser = getPropertyParserForType(this, propertyType);
    const key = `_${propertyName}`;
    
    const prevProp = this[key];
    const nextProp = this[key] = parser.call(this, value);
}

/** Handle default and upgraded properties. */
export function preparePropertyOnConnected(propertyName, propertyEntry)
{
    if (hasDefaultPropertyEntry(propertyEntry))
    {
        defaultProperty(this, propertyName, propertyEntry.value);
    }
    upgradeProperty(this, propertyName);
}

export function hasDefaultPropertyEntry(propertyEntry)
{
    return typeof propertyEntry === 'object' && 'value' in propertyEntry;
}

export function defaultProperty(self, propertyName, defaultValue)
{
    if (!self.hasAttribute(propertyName))
    {
        self.setAttribute(propertyName, defaultValue);
    }
}

export function upgradeProperty(self, propertyName)
{
    if (self.hasOwnProperty(propertyName))
    {
        let value = self[propertyName];
        delete self[propertyName];
        self[propertyName] = value;
    }
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
export function getCachedPropertyMapForProperties(propertyEntries, dst = {})
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

export function getPropertyAccessorsForProperties(propertyEntries, dst = {})
{
    for(let key of Object.keys(propertyEntries))
    {
        let propertyEntry = propertyEntries[key];
        let type = getTypeFunctionForPropertyEntry(propertyEntry);
        let getter = getPropertyGetterForType(this, type, key);
        let setter = getPropertySetterForType(this, type, key);

        dst[key] = {
            get() { return getter(this); },
            set(value) { setter(this, value); }
        };
    }
    return dst;
}

export function getObservedAttributesForProperties(propertyEntries, dst = [])
{
    dst.push(...Object.keys(propertyEntries));
    return dst;
}

function getTypeFunctionForPropertyEntry(propertyEntry)
{
    return typeof propertyEntry === 'function' ? propertyEntry : propertyEntry.type;
}

export function getPropertyParserForType(context, type)
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

export function getPropertyGetterForType(context, type, key)
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
            default: return customGetter.bind(context, type, key);
        }
    }
}

export function getPropertySetterForType(context, type, key)
{
    switch(type)
    {
        case String: return stringSetter;
        case Boolean: return booleanSetter;
        case Function: return functionSetter;
        case Number: return numberSetter;
        default: return customSetter.bind(context, type, key);
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
