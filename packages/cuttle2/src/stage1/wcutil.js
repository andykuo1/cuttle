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
    if (componentClass.properties)
    {
        let propertyEntries = componentClass.properties;
        let componentProperties = {};
        let observedAttributes = [];
        // Generates get() and set()...
        parsePropertiesToPropertyMap(propertyEntries, componentProperties);
        // Generates the array for observedAttributes()...
        parsePropertiesToObservedList(propertyEntries, observedAttributes);
        // Override connectedCallback() with defaultProperty() and upgradeProperty()...
        injectUpgradedConnectedCallback(propertyEntries, componentClass);

        // TODO: Check to not overwrite existing observedAttributes(), get(), and set()
        Object.defineProperty(componentClass, 'observedAttributes', { get() { return observedAttributes; } });
        Object.defineProperties(componentClass.prototype, componentProperties);
    }

    window.customElements.define(name, componentClass);
    return componentClass;
}

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

        if (ownedConnectedCallback) ownedConnectedCallback.call(this);
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

function parsePropertiesToObservedList(propertyEntries, dst = [])
{
    for(let key of Object.keys(propertyEntries))
    {
        dst.push(key);
    }
    return dst;
}

function parsePropertiesToPropertyMap(propertyEntries, dst = {})
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

function getGetterForType(type)
{
    switch(type)
    {
        case String: return stringGetter;
        case Boolean: return booleanGetter;
        default: return parseGetter.bind(undefined, type);
    }
}

function getSetterForType(type)
{
    switch(type)
    {
        case String: return stringSetter;
        case Boolean: return booleanSetter;
        default: return parseSetter.bind(undefined, type);
    }
}

function stringGetter(key, self) { return self.getAttribute(key); }
function stringSetter(key, self, value) { self.setAttribute(key, value); }
function booleanGetter(key, self) { return self.hasAttribute(key); }
function booleanSetter(key, self, value) { if (value) self.setAttribute(key, ''); else self.removeAttribute(key); }
function parseGetter(parser, key, self) { parser.call(undefined, self.getAttribute(key)); }
function parseSetter(parser, key, self, value) { self.setAttribute(key, String(value)); }
