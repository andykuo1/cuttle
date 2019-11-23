const ATTRIBUTE_CHANGED_LISTENERS_KEY = Symbol('attributeChangedListeners');
const ATTRIBUTE_ALL_KEY = '*';

// TODO: Add custom form elements.
// TODO: Add more extended tag registry.

/** Helpful wrapper functions. */

export function find(component, selectors) { return getRootElement(component).querySelector(selectors); }
export function findAll(component, selectors) { return getRootElement(component).querySelectorAll(selectors); }
export function findById(component, id) { return getRootElement(component).getElementById(id); }

export function getRootElement(component)
{
    if (!(component instanceof HTMLElement)) throw new Error('Cannot find root element of component not extended from HTMLElement.');
    return component.shadowRoot || component;
}

/** Sanity checker for extended elements */

function isExtendedClassForTagName(componentClass, tagName = '')
{
    const prototype = componentClass.prototype;
    switch(tagName.toLowerCase())
    {
        case 'button':
            return prototype instanceof HTMLButtonElement;
        case 'blockquote':
        case 'q':
            return prototype instanceof HTMLQuoteElement;
        default:
            // TODO: There are definitely more than this, but I don't want to manually do it :(
            return tagName.length > 0;
    }
}

function isCustomElement(componentClass)
{
    return componentClass.prototype instanceof HTMLElement;
}

/** A better way to handle attribute changes. */

export function bindAttributeChanged(component, attributeName, callback)
{
    let listeners = component[ATTRIBUTE_CHANGED_LISTENERS_KEY]
        || (component[ATTRIBUTE_CHANGED_LISTENERS_KEY] = new Map());

    if (listeners.has(attributeName))
    {
        listeners.get(attributeName).push(callback);
    }
    else
    {
        listeners.set(attributeName, [ callback ]);
    }
}

/** A better way to create web components. */

export function createTemplate(templateString, styleString = undefined)
{
    let element = document.createElement('template');
    let elementHTML;
    if (styleString)
    {
        elementHTML = `<style>${styleString}</style>\n${templateString}`;
    }
    else
    {
        elementHTML = templateString;
    }
    element.innerHTML = elementHTML;
    return element;
}

export function attachShadow(componentInstance, template)
{
    let shadowRoot = componentInstance.attachShadow({ mode: 'open' });
    shadowRoot.appendChild(template.content.cloneNode(true));
    return shadowRoot;
}

export function defineComponent(componentClass, tagNames, extendedTagName = undefined, opts = undefined)
{
    if (extendedTagName && !isExtendedClassForTagName(componentClass, extendedTagName))
        throw new Error(`Extended element class does not match the tag name for custom tag '${tagNames}'.`);
    if (!isCustomElement(componentClass))
        throw new Error(`Cannot define custom tag '${tagNames}' that does not extend HTMLElement.`);

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

    // Handle extended components...
    let defineOptions = extendedTagName ? { extends: extendedTagName } : undefined;
    let defineTags = typeof tagNames === 'string' ? [ tagNames ] : tagNames;
    for(let name of defineTags)
    {
        window.customElements.define(name, componentClass, defineOptions);
    }
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

        // Call attribute listeners from bindAttributeChanged()
        // NOTE: This is different from the attributeChangedCallback(), in that this
        // will properly convert prev and next values to the correct type before
        // passing it to the listeners, unlike attributeChangedCallback(), which
        // remains as strings (or null).
        if (ATTRIBUTE_CHANGED_LISTENERS_KEY in this)
        {
            let listeners = this[ATTRIBUTE_CHANGED_LISTENERS_KEY];
            if (listeners.has(attribute))
            {
                for(let listener of listeners.get(attribute))
                {
                    // NOTE: Allow listener's context to be 'this' for people who don't like to bind().
                    listener.call(this, ownedNext, ownedPrev, attribute);
                }
            }

            if (listeners.has(ATTRIBUTE_ALL_KEY))
            {
                for(let listener of listeners.get(ATTRIBUTE_ALL_KEY))
                {
                    // NOTE: Ditto from above.
                    listener.call(this, ownedNext, ownedPrev, attribute);
                }
            }
        }

        // Call the original attributeChangedCallback(), if overriden
        if (ownedAttributeChangedCallback) ownedAttributeChangedCallback.call(this, ...arguments);
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

        // Call the original connectedCallback(), if overriden
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
