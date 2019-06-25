/** @module WebComponent */

/**
 * @example Feast your eyes upon the basic web component.
 * 
 * const templateNode = createTemplate
 * (
 *      '<div></div>',
 *      'div { background: blue; }'
 * );
 * 
 * class ExampleWebComponent extends HTMLElement
 * {
 *      // attributeChangedCallback() will only listen for these attributes.
 *      static get observedAttributes()
 *      {
 *          return ['disabled'];
 *      }
 * 
 *      constructor()
 *      {
 *          super();
 *          attachShadowRoot(this, templateNode, { mode: 'open' });
 * 
 *          // Set any defaults here...
 *      }
 * 
 *      connectedCallback()
 *      {
 *          // Further set-up goes here..
 *          // Any DOM manipulations go here, NOT in constructor.
 *      }
 * 
 *      disconnectedCallback()
 *      {
 *          // Any clean-up goes here...
 *      }
 * 
 *      attributeChangedCallback(attribute, oldValue, newValue)
 *      {
 *          switch(attribute)
 *          {
 *              case 'disabled':
 *                  // This is called anytime the attribute changes, even when it is initially set.
 *                  break;
 *              default:
 *          }
 *      }
 * 
 *      set disabled(value)
 *      {
 *          // Just in case of inifinite loops from attributeChangedCallback().
 *          if (this._disabled === value) return;
 *          this._disabled = value;
 * 
 *          // ... then update if necessary
 *      }
 * 
 *      get disabled()
 *      {
 *          return this._disabled;
 *      }
 * }
 * registerCustomTag('example-web-component', ExampleWebComponent);
 */

/* -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-= */
/*
 * Here's some useful functions to setup web component. This simplifies the boilerplate code.
 * 3 things make up a web component:
 *  - Shadow DOM: To encapsulate the style and logic within the component.
 *  - Template Tag: To setup an inert HTML tree structure to clone for each.
 *  - Custom Tag: To allow users to declaratively create components by a custom tag name.
 */
/* -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-= */

/**
 * Creates the template element for the passed-in template and style content.
 * @param {String} templateString   The template html string representation
 * @param {String} styleString      The style css string representation
 * @returns {Node} the created template element
 */
export function createTemplate(templateString = '', styleString = '')
{
    const contentString = `<template><style>${styleString}</style>${templateString}</template>`;
    const fragment = document.createRange().createContextualFragment(contentString);
    // Get the template element before fragment is destroyed.
    const templateElement = fragment.firstElementChild
    // Attach it to the head of the document. Afterwards, fragment will be destroyed as the parent.
    document.head.appendChild(fragment);
    return templateElement;
}

/**
 * Register the passed-in element class with the passed-in tag name for the document.
 * @param {String} customTagName  The tag name that represents the class in HTML.
 * @param {Class} elementClass    The class to represent.
 * @param {Object} opts           The options to pass to customElements.define().
 */
export function registerCustomTag(customTagName, elementClass, opts = {})
{
    // Just in case it was already defined somewhere...
    if (!window.customElements.get(customTagName))
    {
        window.customElements.define(customTagName, elementClass, opts);
    }
    else
    {
        console.error(`Found duplicate definition of <${customTagName}>... ignoring new definition.`)
    }
}

/**
 * Attach the shadow DOM root, with a childElement if specified, to the
 * element. This should be called in the constructor.
 * @param {Node} element        The element to attach to.
 * @param {Node} childElement   The child element in the shadow DOM root.
 * @param {Object} opts         The options passed to attachShadow().
 * @return {Node}               The attached shadow root.
 */
export function attachShadowRoot(element, childElement = null, opts = {})
{
    // Attach the shadow root to this element.
    const shadowRoot = element.attachShadow(opts);
    // Attach the template node to the shadow root, if it exists.
    if (childElement)
    {
        shadowRoot.appendChild(childElement.content.cloneNode(true));
    }
    return shadowRoot;
}

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

/* -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-= */
/*
 * Here's a way to tie this all together in something that can be easily used. By extending
 * the provided class and calling minimal setup code, all functionalities mentioned prior
 * will be handled automatically. This is done through setting different options for each
 * property in the static getter, properties(), defined by the child class.
 */
/* -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-= */

/**
 * The key for the map of properties associated with the class.
 */
const classProperties = Symbol('classProperties');

/**
 * The key for the build properties function and signifies whether it should be processed
 * as a descendent of WebComponent, which inherits auto-generated properties.
 */
const buildProperties = Symbol('buildProperties');

/**
 * The key for the shadow dom options for each instance associated with the class.
 */
const shadowOptions = Symbol('shadowOptions');

/**
 * The key for requestPropertyUpdate to determine if the data is set from attribute side.
 */
const ATTRIBUTE_SIDE = Symbol('ATTRIBUTE_SIDE');

/**
 * The key for requestPropertyUpdate to determine if the data is set from property side.
 */
const PROPERTY_SIDE = Symbol('PROPERTY_SIDE');

/**
 * Handles most initialization calls for the class.
 * @param {HTMLElement} superClass The native class the element inherits from.
 * @example An example on how it is used.
 * class FancyButtonElement extends WebComponent(HTMLButtonElement)
 * {
 *      //...
 * }
 */
function WebComponent(superClass = HTMLElement)
{
    class Component extends superClass
    {
        /**
         * Builds the property map and properly initializes the class. This is only done once by
         * observedAttributes().
         */
        static [buildProperties]()
        {
            // Assemble old and new properties. Only pass in newly defined properties or else it will be duplicated.
            buildClassProperties(this, this.hasOwnProperty('properties') ? this.properties : null);
        }
        
        /**
         * Constructs the web component, attaches the shadow root, and sets up the default values.
         */
        constructor()
        {
            super();
    
            // Why shadow root? Encapsulation and separation of style.
            // Why initialize here? Cause no one can mess with this.
            
            if (shadowOptions in this.constructor)
            {
                const shadow = this.constructor[shadowOptions];
                attachShadowRoot(this, shadow.childNode, shadow.opts);
            }
            else
            {
                throw new Error("Cannot initialize web component - missing template node.");
            }
    
            // Create all properties for this instance.
            constructPropertiesForElement(this, this.constructor[classProperties]);
        }
    }

    return Component;
}

/**
 * Load and initialize the properties for the element. This should be called
 * in the constructor. Otherwise, some browsers may auto-insert their own
 * property-attribute entries, which will incur infinite loops.
 *
 * This does the same thing as calling addProperty() for every property.
 * 
 * @param {HTMLElement} element         The element to construct properties for.
 * @param {Object} properties           The property options to construct from.
 * @param {Map} properties.options      A map of property names to their respective options.
 * @param {Map} properties.attributes   A map of attribute names to their corresponding property name.
 */
function constructPropertiesForElement(element, properties)
{
    for (const [property, opts] of properties.options.entries())
    {
        addPropertyToElement(element, property, opts);
    }
}

/**
 * Assigns attributeChangedCallback() function that will correctly update component
 * properties from classProperties. Assumes buildClassProperties() has already been
 * successfully called.
 * 
 * Although you can just override the function in the class, if the user overrides
 * our definition, they are able to NOT call our function, by omitting a super call, which
 * is bad. By forcing any user-defined override to be called by our function instead, effectively
 * always calling super() first, this negates the issue.
 * 
 * NOTE: The difference for attributeChangedCallback is that it is an instance function.
 */
function assignAttributeChangedCallbackForProperties(elementClass)
{
    const attributeChangedCallback = Object.getOwnPropertyDescriptor(elementClass.prototype, 'attributeChangedCallback');
    
    // Re-define attributeChangedCallback to update properties...
    Object.defineProperty(elementClass.prototype, 'attributeChangedCallback',
    {
        value: function(attribute, oldValue, newValue)
        {
            // Call user-defined function...
            if (attributeChangedCallback) attributeChangedCallback.value.call(this, attribute, oldValue, newValue);

            // Don't bother parsing if the attribute data string is the same.
            if (oldValue === newValue) return;

            const elementClass = this.constructor;
            // Not all attributes are added/handled in class properties...
            const elementClassProperties = elementClass[classProperties];
            if (elementClassProperties.attributes.has(attribute))
            {
                // Gets the property linked to the attribute.
                const property = elementClassProperties.attributes.get(attribute);
                const opts = elementClassProperties.options.get(property);

                // Parse the attribute data strings to property values of valid type.
                const oldPropertyValue = this[property];
                const newPropertyValue = attributeToPropertyData(opts.type, newValue);

                // Will cause the element to update data. Since this is called
                // whenever a change occurs on the tag, even at the beginning,
                // the data will always be synchronized when attribute is set.
                requestPropertyUpdate(this, property, opts,
                    oldPropertyValue, newPropertyValue, ATTRIBUTE_SIDE);
            }
        }
    });
}

/**
 * Assigns observedAttributes() function that will return the appropriate value calculated
 * from classProperties. Assumes buildClassProperties() has already been successfully called.
 * 
 * Although you can just override the function in the class, if the user overrides
 * our definition, they are able to NOT call our function, by omitting a super call, which
 * is bad. By forcing any user-defined override to be called by our function instead, effectively
 * always calling super() first, this negates the issue.
 * 
 * NOTE: The difference for observedAttributes is that it is a static property.
 */
function assignObservedAttributesForProperties(elementClass)
{
    // Keep user-defined observed attributes...
    const observedAttributes = Object.getOwnPropertyDescriptor(elementClass, 'observedAttributes');

    // Re-define observed attributes to match properties...
    Object.defineProperty(elementClass, 'observedAttributes',
        {
            get()
            {
                // Since assignObservedAttributeForProperties() is only ever called AFTER
                // buildClassProperties(), it can safely assume classProperties exist
                // without re-building it.
                const result = Array.from(this[classProperties].attributes.keys());

                // Call user-defined function...
                if (observedAttributes)
                {
                    return result.concat(observedAttributes.get.call(this));
                }

                return result;
            },
            configurable: true,
            enumberable: false,
        });
}

/* -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-= */
/* -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-= */

/**
 * Checks whether the class has initialized class properties.
 */
function hasClassProperties(elementClass)
{
    return elementClass.hasOwnProperty(classProperties);
}

/**
 * Adds a property to the class properties. These are used to define the properties
 * of its children and instances.
 */
function addClassProperty(elementClass, property, opts)
{
    // Define attribute name for property...
    if (typeof opts.attribute === 'undefined')
    {
        opts.attribute = getAttributeNameFromProperty(property);
    }

    // Add the property to the class.
    const elementClassProperties = elementClass[classProperties];
    elementClassProperties.options.set(property, opts);
    if (opts.attribute)
    {
        elementClassProperties.attributes.set(opts.attribute, property);
    }
}

/**
 * Creates a new class properties for the class.
 */
function defineClassProperties(elementClass)
{
    let optionMap;
    let attributeMap;

    // Build properties for parents too...
    const superClass = Object.getPrototypeOf(elementClass);

    // NOTE: Since the super class of the passed-in element must be defined
    // to be initially set as the super class, the class properties initialization
    // must have already been executed for the initialization of that class.
    // This assumes that every class if defined in its own module file and is referenced
    // by static imports, therefore always processed before the child class.
    // However, for the case if classes were defined out-of-order or dynamically,
    // a super class may not yet have the chance to inititalize. Therefore, we must
    // try to initialize it here.
    if (typeof superClass[buildProperties] === 'function')
    {
        superClass[buildProperties]();
    }

    if (superClass && hasClassProperties(superClass))
    {
        // Derive class properties from parent...
        const superClassProperties = superClass[classProperties];
        optionMap = new Map(superClassProperties.options);
        attributeMap = new Map(superClassProperties.attributes);
    }
    else
    {
        // Standalone class properties...
        optionMap = new Map();
        attributeMap = new Map();
    }

    // Actually assign class properties to result.
    elementClass[classProperties] = {
        options: optionMap,
        attributes: attributeMap,
    };
}

/**
 * Builds the property map and properly initializes the class. This is only done once by
 * observedAttributes(). Only pass in newly defined properties or else it will be duplicated
 * from inherited class properties.
 */
function buildClassProperties(elementClass, elementProperties)
{
    // Only build it if it doesn't exist.
    if (hasClassProperties(elementClass)) return;

    // Initialize current property map (with parent's properties).
    defineClassProperties(elementClass);

    // Add new properties to the hierarchy (don't re-add old ones).
    if (elementProperties)
    {
        for (const property of Object.getOwnPropertyNames(elementProperties))
        {
            addClassProperty(elementClass, property, elementProperties[property]);
        }
    }
}

/* -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-= */
/* -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-= */

/**
 * Creates a property for the element linked with an attribute, along with data.
 * This will also setup any getters and setters needed to maintain the data link.
 * However, this does not handle attribute data changes. To be fully effective,
 * the changed property should be set in attributeChangedCallback(). For example:
 *
 * @example
 * attributeChangedCallback(attribute, oldValue, newValue) {
 *  // Assumes the property name is the same as the attribute name.
 *  // This may not always be the case for camelCase properties.
 *  this[attribute] = newValue;
 * }
 *
 * @param {HTMLElement} element     The element to add the property to.
 * @param {String} property         The property name.
 * @param {Object} opts             The additional property options.
 * @param {*|Function} opts.type    The type of the property. If a function, it will be
 *                                  called with the attribute data string to parse to a valid
 *                                  property value.
 * @param {Boolean} [opts.reflect]  Whether to reflect the property changes to attributes
 * @param {String} [opts.attribute] The attribute name linked to the property. If undefined,
 *                                  it will convert the property name to dash-case and use
 *                                  that instead. If null, no changes to any attribute will
 *                                  update this property.
 * @param {Function} [opts.set]     If set, called before the property setter for a
 *                                  chance to alter the value before change.
 * @param {Function} [opts.get]     If set, called after the property getter for a
 *                                  chance to alter the value before return.
 */
export function addPropertyToElement(element, property, opts)
{
    const propertyDescriptor = createPropertyDescriptor(property, opts);
    const attribute = getAttributeNameFromProperty(property);

    let defaultValue = undefined;
    // Synchronize property to attribute value.
    if (element.hasAttribute(attribute))
    {
        defaultValue = getAttributeDataAsProperty(element, attribute, opts);
    }
    // Upgrade initially set property. So any properties defined in the constructor (or earlier by
    // other frameworks) are treated as default values for the new created property.
    else if (element.hasOwnProperty(property))
    {
        defaultValue = element[property];
        delete element[property];
    }

    // TODO: If Angular didn't set values BEFORE the constructor, we could allow
    // users to modify the getters and setters. But, assuming they use defineProperty(),
    // any user-defined changes will be overriden by Angular. Therefore, for now,
    // existing accessors with the same name as properties are errors.

    // Do not override user-defined getters and setters. Tell them it's wrong!
    // Refer to the comment above for the reasoning.
    // If they want to modify the data as it is set, they should use
    // changedCallback() instead. Otherwise, for default values, set the property
    // in the constructor.
    const existingDescriptor = Object.getOwnPropertyDescriptor(element, property);
    if (existingDescriptor)
    {
        //TODO: It never gets here actually, because the previous block deletes it.
        if (typeof existingDescriptor.get === 'function')
        {
            throw new Error('Found conflicting getter for instance.');
        }
        if (typeof existingDescriptor.set === 'function')
        {
            throw new Error('Found conflicting setter for instance.');
        }
    }

    // Add the property to the element.
    Object.defineProperty(element, property, propertyDescriptor);

    // Call this after the setter has been set, otherwise you cannot use this.property in changedCallback().
    if (typeof defaultValue !== 'undefined')
    {
        // Call setter on element for default value. This allows reflection and other type handling.
        element[property] = defaultValue;
    }
}

/**
 * The key to re-entry flag for overridden property accessors.
 */
const reentrantFlag = Symbol('reentrantFlag');

/**
 * Creates object property descriptor for property.
 * @param {String} propert the name of the property
 * @param {Object} opts the property descriptor options
 */
function createPropertyDescriptor(property, opts)
{
    // The property key for the object. Otherwise, it would be ambiguous whether it is a property or a getter.
    const dataKey = `__${property}`;
    return {
        get()
        {
            // Let the user override our value.
            if (opts.get && !opts.get[reentrantFlag])
            {
                // Stop the property accessor from re-enter
                opts.get[reentrantFlag] = true;
                const result = opts.get.call(this);
                opts.get[reentrantFlag] = false;
                return result;
            }
            else
            {
                return this[dataKey];
            }
        },
        set(value)
        {
            const prevValue = this[property];

            // Let the user override our value.
            if (opts.set && !opts.set[reentrantFlag])
            {
                // Stop the property accessor from re-enter
                opts.set[reentrantFlag] = true;
                opts.set.call(this, value);
                opts.set[reentrantFlag] = false;
            }
            else
            {
                // Set the property value.
                this[dataKey] = value;

                // Then try to update, if necessary ...
                requestPropertyUpdate(this, property, opts, prevValue, value, PROPERTY_SIDE);
            }
        },

        // This is by default...
        configurable: true,
        enumerable: false,
    };
}

/**
 * The key for whether to stop propagating update requests with the element.
 */
const stopPropagateUpdate = Symbol('stopPropagateUpdate');

/**
 * Called by property setters to signify a change in value. This will usually update the
 * attribute/property or allow the user to handle the change.
 */
function requestPropertyUpdate(element, property, opts, oldValue, newValue, sourceSide)
{
    // Don't propagate changes until the end of ALL the changes here.
    if (element[stopPropagateUpdate]) return;

    // It's already up-to-date. Don't update it.
    if (oldValue === newValue) return;

    // Stop changes from propagating! :(
    element[stopPropagateUpdate] = true;
    {
        // Handle changes only if this is a connected element...
        if (sourceSide === ATTRIBUTE_SIDE)
        {
            element[property] = newValue;
        }
        else if (sourceSide === PROPERTY_SIDE && element.isConnected && opts.reflect)
        {
            setAttributeDataAsProperty(element, opts.attribute, opts, newValue);
        }

        // If property has callback, call it.
        if (typeof opts.changedCallback === 'function')
        {
            opts.changedCallback.call(element, oldValue, newValue);
        }
    }
    // Allow changes to propagate again! :D
    element[stopPropagateUpdate] = false;
}

/* -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-= */
/* -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-= */

/**
 * Creates the element template and prepares the shadow DOM options.
 * @param {Class} elementClass      The element class to handle the logic.
 * @param {String} templateString   The <template> content as a string for the element.
 * @param {String} styleString      The <style> content as a string for the element.
 * @param {Object} shadowOpts       The shadow root attachment options.
 */
function setShadowTemplateString(elementClass, templateString, styleString, shadowOpts = { mode: 'open' })
{
    return setShadowTemplate(elementClass, createTemplate(templateString, styleString), shadowOpts);
}

/**
 * Prepares the element template and prepares the shadow DOM options.
 * @param {Class} elementClass      The element class to handle the logic.
 * @param {String} templateNode     The <template> node for the element.
 * @param {Object} shadowOpts       The shadow root attachment options.
 */
function setShadowTemplate(elementClass, templateNode, shadowOpts = { mode: 'open' })
{
    // NOTE: This is not the preferred way to setup the shadow template, but because
    // this data is provided statically once, it must be cached until an instance
    // is constructed. It would be better if this function can force the constructor
    // to call the shadow setup function on instantiation.

    // Save the data for later when it is constructed.
    elementClass[shadowOptions] = {
        childNode: templateNode,
        opts: shadowOpts
    };
}

/**
 * Calls all appropriate setup for class properties for the element class.
 * @param {Class} elementClass          The element class to make into a typed element.
 * @param {Object} [elementProperties]  The element properties. Each property is
 *                                      named by its key, and its data generated by the
 *                                      options specified by the associated value.
 */
function setupProperties(elementClass, elementProperties = (elementClass.hasOwnProperty('properties') ? elementClass.properties : null))
{
    buildClassProperties(elementClass, elementProperties);
    
    // Setup our functions such that they are always called, regardless if the user overrides it.
    assignObservedAttributesForProperties(elementClass);
    assignAttributeChangedCallbackForProperties(elementClass);
}

// Expose useful functions for users.
Object.assign(WebComponent, {
    /**
     * The default component that extends HTMLElement.
     * @example An example on how it is used.
     * class HelloWorldElement extends Component
     * {
     *      //...
     * }
     */
    Component: WebComponent(),
    setShadowTemplate,
    registerCustomTag,
    setupProperties
});

export default WebComponent;