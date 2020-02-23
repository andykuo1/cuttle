(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
    typeof define === 'function' && define.amd ? define(['exports'], factory) :
    (global = global || self, factory(global.Cuttle = {}));
}(this, (function (exports) { 'use strict';

    function applyTransformations(elementConstructor, ...transformations)
    {
        let elementPrototype = elementConstructor.prototype;
        
        let observedAttributesFunctions = [];
        let connectedCallbackFunctions = [];
        let disconnectedCallbackFunctions = [];
        let attributeChangedCallbackFunctions = [];

        for(let transformation of transformations)
        {
            const {
                classStaticPropertyMap,
                classPropertyMap,
                observedAttributes,
                connectedCallback,
                disconnectedCallback,
                attributeChangedCallback
            } = transformation;

            if (classStaticPropertyMap)
            {
                for(const classStaticPropertyName of Object.keys(classStaticPropertyMap))
                {
                    if (elementConstructor.hasOwnProperty(classStaticPropertyName))
                    {
                        throw new Error(`Cannot override existing property '${classStaticPropertyName}'.`);
                        // Or let the user override our definitions...
                        // delete classStaticPropertyMap[classStaticPropertyName];
                    }
                }

                Object.defineProperties(elementConstructor, classStaticPropertyMap);
            }

            if (classPropertyMap)
            {
                for(const classPropertyName of Object.keys(classPropertyMap))
                {
                    if (elementPrototype.hasOwnProperty(classPropertyName))
                    {
                        throw new Error(`Cannot override existing property '${classPropertyName}'.`);
                        // Or let the user override our definitions...
                        // delete classPropertyMap[classPropertyName];
                    }
                }

                Object.defineProperties(elementPrototype, classPropertyMap);
            }

            if (Array.isArray(observedAttributes)) observedAttributesFunctions.push(...observedAttributes);
            else if (observedAttributes) observedAttributesFunctions.push(observedAttributes);
            if (Array.isArray(connectedCallback)) connectedCallbackFunctions.push(...connectedCallback);
            else if (connectedCallback) connectedCallbackFunctions.push(connectedCallback);
            if (Array.isArray(disconnectedCallback)) disconnectedCallbackFunctions.push(...disconnectedCallback);
            else if (disconnectedCallback) disconnectedCallbackFunctions.push(disconnectedCallback);
            if (Array.isArray(attributeChangedCallback)) attributeChangedCallbackFunctions.push(...attributeChangedCallback);
            else if (attributeChangedCallback) attributeChangedCallbackFunctions.push(attributeChangedCallback);
        }

        injectObservedAttributes(elementConstructor, ...observedAttributesFunctions);
        injectConnectedCallback(elementConstructor, ...connectedCallbackFunctions);
        injectDisconnectedCallback(elementConstructor, ...disconnectedCallbackFunctions);
        injectAttributeChangedCallback(elementConstructor, ...attributeChangedCallbackFunctions);

        return elementConstructor;
    }

    const OWN_OBSERVED_ATTRIBUTES = Symbol('ownObservedAttributes');
    const OWN_CACHED_OBSERVED_ATTRIBUTES = Symbol('ownCachedObservedAttributes');
    const OWN_ATTRIBUTE_CHANGED_CALLBACK = Symbol('ownAttributeChangedCallback');
    const OWN_CONNECTED_CALLBACK = Symbol('ownConnectedCallback');
    const OWN_DISCONNECTED_CALLBACK = Symbol('ownDisconnectedCallback');

    function getOwnObservedAttributes(elementConstructor)
    {
        return Object.getOwnPropertyDescriptor(elementConstructor, OWN_OBSERVED_ATTRIBUTES).value;
    }

    function getOwnConnectedCallback(elementConstructor)
    {
        return Object.getOwnPropertyDescriptor(elementConstructor.prototype, OWN_CONNECTED_CALLBACK).value;
    }

    function getOwnDisconnectedCallback(elementConstructor)
    {
        return Object.getOwnPropertyDescriptor(elementConstructor.prototype, OWN_DISCONNECTED_CALLBACK).value;
    }

    function getOwnAttributeChangedCallback(elementConstructor)
    {
        return Object.getOwnPropertyDescriptor(elementConstructor.prototype, OWN_ATTRIBUTE_CHANGED_CALLBACK).value;
    }

    function injectObservedAttributes(elementConstructor, ...callbacks)
    {
        _injectPropertyGetter(
            elementConstructor,
            'observedAttributes',
            OWN_OBSERVED_ATTRIBUTES,
            createObservedAttributesFunction(callbacks)
        );
        
        function createObservedAttributesFunction(callbacks)
        {
            return function observedAttributes()
            {
                const ownObservedAttributes = getOwnObservedAttributes(this);
                const attributes = ownObservedAttributes.call(this) || [];
                Object.defineProperty(this, OWN_CACHED_OBSERVED_ATTRIBUTES, { value: attributes, writable: true });

                let result = [...attributes];
                for(let callback of callbacks)
                {
                    result.push(...callback.call(this));
                }
                return result;
            };
        }
    }

    function injectConnectedCallback(elementConstructor, ...callbacks)
    {
        _injectPropertyValue(
            elementConstructor.prototype,
            'connectedCallback',
            OWN_CONNECTED_CALLBACK,
            createConnectedCallbackFunction(callbacks)
        );

        function createConnectedCallbackFunction(callbacks)
        {
            return function connectedCallback()
            {
                const ownConnectedCallback = getOwnConnectedCallback(getConstructorOf(this));
                ownConnectedCallback.call(this);
                for(let callback of callbacks)
                {
                    callback.call(this);
                }
            }
        }
    }

    function injectDisconnectedCallback(elementConstructor, ...callbacks)
    {
        _injectPropertyValue(
            elementConstructor.prototype,
            'disconnectedCallback',
            OWN_DISCONNECTED_CALLBACK,
            createDisconnectedCallbackFunction(callbacks)
        );

        function createDisconnectedCallbackFunction(callbacks)
        {
            return function disconnectedCallback()
            {
                // NOTE: Inverted call stack to retain inter-functional dependencies possibly created during connectedCallback().
                const ownDisconnectedCallback = getOwnDisconnectedCallback(getConstructorOf(this));
                for(let callback of callbacks.reverse())
                {
                    callback.call(this);
                }
                ownDisconnectedCallback.call(this);
            }
        }
    }

    function injectAttributeChangedCallback(elementConstructor, ...callbacks)
    {
        _injectPropertyValue(
            elementConstructor.prototype,
            'attributeChangedCallback',
            OWN_ATTRIBUTE_CHANGED_CALLBACK,
            createAttributeChangedCallback(callbacks),
        );

        function createAttributeChangedCallback(callbacks)
        {
            return function attributeChangedCallback(attribute, prev, value)
            {
                const thisConstructor = getConstructorOf(this);
                const ownCachedObservedAttributes = thisConstructor.hasOwnProperty(OWN_CACHED_OBSERVED_ATTRIBUTES)
                    ? Object.getOwnPropertyDescriptor(thisConstructor, OWN_CACHED_OBSERVED_ATTRIBUTES).value
                    : Object.getOwnPropertyDescriptor(thisConstructor, OWN_OBSERVED_ATTRIBUTES).value.call(thisConstructor);
                
                // TODO: Maybe make this a Set instead for constant time access? Though that may be considered bloat...
                if (ownCachedObservedAttributes.includes(attribute))
                {
                    const ownAttributeChangedCallback = getOwnAttributeChangedCallback(thisConstructor);
                    ownAttributeChangedCallback.call(this, attribute, prev, value);
                }

                for(let callback of callbacks)
                {
                    callback.call(this, attribute, prev, value);
                }
            }
        }
    }

    function getConstructorOf(object)
    {
        return Object.getPrototypeOf(object).constructor;
    }

    function _injectPropertyGetter(propertyOwner, propertyName, ownPropertyName, get)
    {
        if (propertyOwner.hasOwnProperty(propertyName))
        {
            const ownDescriptor = Object.getOwnPropertyDescriptor(propertyOwner, propertyName);
            Object.defineProperty(propertyOwner, ownPropertyName, {
                value: ownDescriptor.get
            });
        }
        else
        {
            Object.defineProperty(propertyOwner, ownPropertyName, {
                value: function() {}
            });
        }
        Object.defineProperty(propertyOwner, propertyName, { get });
    }

    function _injectPropertyValue(propertyOwner, propertyName, ownPropertyName, value)
    {
        if (propertyOwner.hasOwnProperty(propertyName))
        {
            const ownDescriptor = Object.getOwnPropertyDescriptor(propertyOwner, propertyName);
            Object.defineProperty(propertyOwner, ownPropertyName, {
                value: ownDescriptor.value
            });
        }
        else
        {
            Object.defineProperty(propertyOwner, ownPropertyName, {
                value: function() {}
            });
        }
        Object.defineProperty(propertyOwner, propertyName, { value });
    }

    /**
     * @module Properties
     * @description
     * Evaluates `static get properties()` to custom element observedAttributes(), get(), and set().
     */

    /** Generates the transform object for this module. */
    function transformify(elementConstructor, properties = elementConstructor.properties)
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
        {
            return cachedGetter;
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

    function asString(func, strings, values)
    {
        let fname = func.name;
        if (typeof strings === 'string') strings = [strings];
        return `__${strings.reduce((prev, curr, i) => prev + curr + values[i])}${fname}`;
    }

    function getEntries(func, target)
    {
        const fname = func.name;
        const flength = fname.length;

        let dst = {};
        for(let propertyName of Object.getOwnPropertyNames(target))
        {
            if (propertyName.startsWith('__') && propertyName.endsWith(fname))
            {
                let attribute = propertyName.substring(2, propertyName.length - flength);
                dst[attribute] = target[propertyName];
            }
        }
        return dst;
    }

    // static [Attribute`name`]() { return String; }
    function Attribute(strings, ...values)
    {
        return asString(Attribute, strings, values);
    }

    function transformify$1(elementConstructor)
    {
        if (!(elementConstructor.prototype instanceof HTMLElement)) throw new Error('Custom elements must extend HTMLElement.');

        let entries = getEntries(Attribute, elementConstructor);

        let properties = {};
        for(let name of Object.keys(entries))
        {
            properties[name] = entries[name].call(undefined);
        }
        return transformify(elementConstructor, properties);
    }

    function ObservedAttributeChanged(strings, ...values)
    {
        return asString(ObservedAttributeChanged, strings, values);
    }

    const OBSERVED_ATTRIBUTES_CALLBACK_MAP = Symbol('observedAttributesCallbackMap');

    function transformify$2(elementConstructor)
    {
        if (!(elementConstructor.prototype instanceof HTMLElement)) throw new Error('Custom elements must extend HTMLElement.');

        // Generates individual callbacks for attributeChangedCallback() with ObservedAttributeChanged()...
        const entries = getEntries(ObservedAttributeChanged, elementConstructor.prototype);

        return {
            classStaticPropertyMap: {
                [OBSERVED_ATTRIBUTES_CALLBACK_MAP]: { value: entries }
            },
            observedAttributes: getObservedAttributesFunctionsForObservedAttributes(),
            attributeChangedCallback: getAttributeChangedCallbackForObservedAttributes(),
        };
    }

    function getObservedAttributesFunctionsForObservedAttributes()
    {
        return [
            function observedAttributes()
            {
                const observedAttributeCallbacks = this[OBSERVED_ATTRIBUTES_CALLBACK_MAP];
                return Object.keys(observedAttributeCallbacks);
            }
        ];
    }

    function getAttributeChangedCallbackForObservedAttributes()
    {
        return [
            function attributeChangedCallback(attribute, prev, value)
            {
                const observedAttributeCallbacks = this.constructor[OBSERVED_ATTRIBUTES_CALLBACK_MAP];
                if (observedAttributeCallbacks.hasOwnProperty(attribute))
                {
                    observedAttributeCallbacks[attribute].call(this, attribute, prev, value);
                }
            }
        ];
    }

    function createTemplate(innerHTML)
    {
        let template = document.createElement('template');
        template.innerHTML = innerHTML;
        return template;
    }

    function createStyle(innerCSS)
    {
        if (isConstructStylesheetSupported())
        {
            let style = new CSSStyleSheet();
            style.replaceSync(innerCSS);
            return style;
        }
        else
        {
            let style = document.createElement('style');
            style.innerHTML = innerCSS;
            return style;
        }
    }

    function attachShadowAndTemplate(shadowElement, templateElement = 'template', styleElement = undefined, shadowInitOpts = { mode: 'open' })
    {
        let shadowRoot = shadowElement.attachShadow(shadowInitOpts);
        if (typeof templateElement === 'string')
        {
            templateElement = document.querySelector(templateElement);
        }
        if (typeof styleElement === 'string')
        {
            styleElement = document.querySelector(styleElement);
        }
        else if (styleElement)
        {
            if (isConstructStylesheetSupported())
            {
                shadowRoot.adoptedStyleSheets = [styleElement];
            }
            else
            {
                templateElement.content.appendChild(styleElement);
            }
        }
        shadowRoot.appendChild(templateElement.content.cloneNode(true));
        return shadowRoot;
    }

    function isConstructStylesheetSupported()
    {
        return 'CSSStyleSheet' in window && window.CSSStyleSheet.prototype.replace;
    }

    function find(element, selectors)
    {
        return element.shadowRoot.querySelector(selectors);
    }

    function findAll(element, selectors)
    {
        return element.shadowRoot.querySelectorAll(selectors);
    }

    function transform(elementConstructor)
    {
        return applyTransformations(elementConstructor,
            transformify(elementConstructor),
            transformify$1(elementConstructor),
            transformify$2(elementConstructor),
        );
    }

    exports.Attribute = Attribute;
    exports.ObservedAttributeChanged = ObservedAttributeChanged;
    exports.attachShadowAndTemplate = attachShadowAndTemplate;
    exports.createStyle = createStyle;
    exports.createTemplate = createTemplate;
    exports.find = find;
    exports.findAll = findAll;
    exports.transform = transform;

    Object.defineProperty(exports, '__esModule', { value: true });

})));
