'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

/** Helpful find functions. */

/**
 * Finds the first element in the component that satisfy the selectors.
 * @param {HTMLElement} component The component to find within.
 * @param {String} selectors A string of query selectors that identify the target element.
 * @returns {Element} The first element that satisfies the specified selectors within the root of the component.
 */
function find(component, selectors) { return getRootElement(component).querySelector(selectors); }

/**
 * Finds all the elements in the component that satisfy the selectors.
 * @param {HTMLElement} component The component to find within.
 * @param {String} selectors A string of query selectors that identify the target element.
 * @returns {Element} The first element that satisfies the specified selectors within the root of the component.
 */
function findAll(component, selectors) { return getRootElement(component).querySelectorAll(selectors); }

/**
 * Finds the element in the component that has the specified id.
 * @param {HTMLElement} component The component to find within.
 * @param {String} id The value of the `id` attribute of the element.
 * @returns {Element} The first element with the matched `id` attribute within the root of the component.
 */
function findById(component, id) { return getRootElement(component).getElementById(id); }

/**
 * Gets the element root of the component.
 * @param {HTMLElement} component The component to find the root for.
 * @returns {Element} The root element of the component. Usually this is either the shadow root or just itself.
 */
function getRootElement(component)
{
    if (!(component instanceof HTMLElement)) throw new Error('Cannot find root element of component not extended from HTMLElement.');
    return component.shadowRoot || component;
}

/** Helpful create functions. */

/**
 * Creates a `<template>` tag with the passed-in content.
 * @param {String} templateString The template content.
 */
function createTemplateElement(templateString)
{
    let element = document.createElement('template');
    element.innerHTML = templateString;
    return element;
}

/**
 * Creates a `<style>` tag with the passed-in content.
 * @param {String} styleString The style content.
 * @returns {Element} The style element that has the passed-in content.
 */
function createStyleElement(styleString)
{
    let element = document.createElement('style');
    element.innerHTML = styleString;
    return element;
}

/**
 * Appends a cloned instance of the passed-in template element.
 * @param {HTMLElement} componentInstance The component instance to attach to.
 * @param {HTMLTemplateElement} templateElement The <template> element to append to the component root.
 */
function appendTemplate(componentInstance, templateElement)
{
    let root = getRootElement(componentInstance);
    let content = templateElement.content.cloneNode(true);
    root.appendChild(content);
    return content;
}

/**
 * Appends a cloned instance of the passed-in style element.
 * @param {HTMLElement} componentInstance The component instance to attach to.
 * @param {HTMLStyleElement} styleElement The <style> element to append to the component root.
 */
function appendStyle(componentInstance, styleElement)
{
    let root = getRootElement(componentInstance);
    let content = styleElement.cloneNode(true);
    root.appendChild(content);
    return content;
}

/**
 * Attaches a shadow root.
 * @param {HTMLElement} componentInstance The component instance to attach a shadow root.
 * @param {Element} templateElement The template element to create and attach an instance.
 * @param {Element} styleElement The style element to attach to the component.
 */
function attachShadow(componentInstance, templateElement = undefined, styleElement = undefined)
{
    let shadowRoot = componentInstance.attachShadow({ mode: 'open' });
    if (styleElement) shadowRoot.appendChild(styleElement.cloneNode(true));
    if (templateElement) shadowRoot.appendChild(templateElement.content.cloneNode(true));
    return shadowRoot;
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

const ATTRIBUTE_CHANGED_LISTENERS_KEY = Symbol('attributeChangedListeners');
const ATTRIBUTE_ALL_KEY = '*';

/** A better way to handle attribute changes. */
function bindAttributeChanged(component, attributeName, callback)
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

function defineComponent(componentClass, tagNames, extendedTagName = undefined, opts = undefined)
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
        parsePropertiesToPropertyAccessors(propertyEntries, classPropertyMap);
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
        let getter = getGetterForType().bind(undefined, key);
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
    {
        return cachedGetter;
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

function stringSetter(key, self, value) { self.setAttribute(key, value); }
function booleanSetter(key, self, value) { if (value) self.setAttribute(key, ''); else self.removeAttribute(key); }
function customSetter(parser, key, self, value) { self.setAttribute(key, String(value)); }

function stringParser(value) { return value; }
function booleanParser(value) { return value === null ? false : true; }
function customParser(parser, value) { parser.call(undefined, value); }

exports.appendStyle = appendStyle;
exports.appendTemplate = appendTemplate;
exports.attachShadow = attachShadow;
exports.bindAttributeChanged = bindAttributeChanged;
exports.createStyleElement = createStyleElement;
exports.createTemplateElement = createTemplateElement;
exports.defineComponent = defineComponent;
exports.find = find;
exports.findAll = findAll;
exports.findById = findById;
exports.getRootElement = getRootElement;
exports.isCustomElement = isCustomElement;
exports.isExtendedClassForTagName = isExtendedClassForTagName;
