export function createTemplate(templateString)
{
    let element = document.createElement('template');
    element.innerHTML = templateString;
    return element;
}

export function createShadow(componentInstance, template)
{
    let shadowRoot = componentInstance.attachShadow({ mode: 'open' });
    shadowRoot.appendChild(template.content.cloneNode(true));
    return shadowRoot;
}

export function defineComponent(componentClass, name)
{
    const propertyEntries = componentClass.properties;
    if (propertyEntries)
    {
        let classPropertyMap = {};
        let observedList = [];
        // Generates get() and set()...
        parsePropertiesToPropertyAccessors(propertyEntries, classPropertyMap, true);
        // Generates the array for observedAttributes()...
        parsePropertiesToObservedList(propertyEntries, observedList);
        // Generates associated _property values...
        parsePropertiesToCachedObjectProperties(propertyEntries, classPropertyMap);
        // Override connectedCallback() with defaultProperty() and upgradeProperty()...
        injectUpgradedConnectedCallback(propertyEntries, componentClass);
        // Override attributeChangedCallback() to update _property values...
        injectCachedObjectAttributeChangedCallback(propertyEntries, componentClass);
        // Append observedAttributes(), get(), and set()...
        injectCustomObservedAttributes(observedList, componentClass);
        injectCustomClassProperties(classPropertyMap, componentClass);
    }

    window.customElements.define(name, componentClass);
    return componentClass;
}

/** Handle cached object properties. */

function injectCachedObjectAttributeChangedCallback(propertyEntries, componentClass)
{
    let componentPrototype = componentClass.prototype;
    let ownedAttributeChangedCallback = componentPrototype.hasOwnProperty('attributeChangedCallback')
        ? componentPrototype.attributeChangedCallback
        : undefined;

    let result = function attributeChangedCallback(attribute, prev, value)
    {
        let ownedPrev = prev;
        let ownedNext = value;

        if (attribute in propertyEntries)
        {
            const propertyEntry = propertyEntries[attribute];
            const propertyType = getTypeForPropertyEntry(propertyEntry);
            const parser = getParserForType(propertyType);
            const key = `_${attribute}`;
            ownedPrev = this[key];
            ownedNext = this[key] = parser(value);
        }
        
        // NOTE: attributeChangedCallback() param types have changed! This is helpful because you can use prev / next with the
        // correct types, but it does change what you expect from attributeChangedCallback().
        if (ownedAttributeChangedCallback) ownedAttributeChangedCallback.call(this, attribute, ownedPrev, ownedNext);
    };

    componentPrototype.attributeChangedCallback = result;
}

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

/** Handle default and upgraded properties. */

function injectUpgradedConnectedCallback(propertyEntries, componentClass)
{
    let componentPrototype = componentClass.prototype;
    let ownedConnectedCallback = componentPrototype.hasOwnProperty('connectedCallback')
        ? componentPrototype.connectedCallback
        : undefined;

    let result = function connectedCallback()
    {
        for(let key of Object.keys(propertyEntries))
        {
            let propertyEntry = propertyEntries[key];
            if (hasDefaultPropertyEntry(propertyEntry))
            {
                defaultProperty(this, key, propertyEntry.value);
            }
        }

        for(let key of Object.keys(propertyEntries))
        {
            upgradeProperty(this, key);
        }

        if (ownedConnectedCallback) ownedConnectedCallback.call(this, ...arguments);
    };

    componentPrototype.connectedCallback = result;
}

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

/** Parse properties() to observedAttributes() and generate getters / setters. */

const USE_CACHED_VALUES_FOR_GETTER = true;

function injectCustomObservedAttributes(observedList, componentClass)
{
    if (componentClass.hasOwnProperty('observedAttribtes'))
        throw new Error('Cannot override existing observedAttributes() in class.');
    
    Object.defineProperty(componentClass, 'observedAttributes', { get() { return observedList; } });
}

function injectCustomClassProperties(classPropertyMap, componentClass)
{
    const componentPrototype = componentClass.prototype;
    for(const classPropertyName of Object.keys(classPropertyMap))
    {
        if (componentPrototype.hasOwnProperty(classPropertyName))
        {
            // Let the user override our definitions...
            delete classPropertyMap[classPropertyName];
        }
    }
    Object.defineProperties(componentClass.prototype, classPropertyMap);
}

function parsePropertiesToObservedList(propertyEntries, dst = [])
{
    for(let key of Object.keys(propertyEntries))
    {
        dst.push(key);
    }
    return dst;
}

function parsePropertiesToPropertyAccessors(propertyEntries, dst = {})
{
    for(let key of Object.keys(propertyEntries))
    {
        let propertyEntry = propertyEntries[key];
        let type = getTypeForPropertyEntry(propertyEntry);
        let getter = getGetterForType(type).bind(undefined, key);
        let setter = getSetterForType(type).bind(undefined, key);

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

function getParserForType(type)
{
    switch(type)
    {
        case String: return stringParser;
        case Boolean: return booleanParser;
        default: return customParser.bind(undefined, type);
    }
}

function getGetterForType(type)
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
            default: return customGetter.bind(undefined, type);
        }
    }
}

function getSetterForType(type)
{
    switch(type)
    {
        case String: return stringSetter;
        case Boolean: return booleanSetter;
        default: return customSetter.bind(undefined, type);
    }
}

function cachedGetter(key, self) { return self[`_${key}`]; }
function stringGetter(key, self) { return self.getAttribute(key); }
function booleanGetter(key, self) { return self.hasAttribute(key); }
function customGetter(parser, key, self) { parser.call(undefined, self.getAttribute(key)); }

function stringSetter(key, self, value) { self.setAttribute(key, value); }
function booleanSetter(key, self, value) { if (value) self.setAttribute(key, ''); else self.removeAttribute(key); }
function customSetter(parser, key, self, value) { self.setAttribute(key, String(value)); }

function stringParser(value) { return value; }
function booleanParser(value) { return value === null ? false : true; }
function customParser(parser, value) { parser.call(undefined, value); }
