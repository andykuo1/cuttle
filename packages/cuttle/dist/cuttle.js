(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
    typeof define === 'function' && define.amd ? define(['exports'], factory) :
    (global = global || self, factory(global.Cuttle = {}));
}(this, function (exports) { 'use strict';

    /** @module PropertyType */

    /**
     * Gets the lowercase, dash-separated attribute name from the property name.
     * Any uppercase characters are prepended with a dash. In other words, it
     * transforms the property name, which is in camelCase, to valid attribute
     * name, in dash-case.
     * @param {String} property The name of the property.
     * @returns {String} The converted attribute name from the property.
     */
    function getAttributeNameFromProperty(property)
    {
        return property.replace(/([A-Z])/g, '-$1').toLowerCase();
    }

    /** @module ClassProperties */

    const classProperties = Symbol('classProperties');

    /**
     * Builds the property map and properly initializes the class. This is only done once by
     * observedAttributes(). Only pass in newly defined properties or else it will be duplicated
     * from inherited class properties.
     */
    function buildClassProperties(elementClass, elementProperties)
    {
        // Only build it if it doesn't exist.
        if (elementClass.hasOwnProperty(classProperties)) return;

        // Initialize current property map (with parent's properties).
        prepareClassProperties(elementClass);

        // Add new properties to the hierarchy (don't re-add old ones).
        if (elementProperties)
        {
            for (const property of Object.getOwnPropertyNames(elementProperties))
            {
                addClassProperty(elementClass, property, elementProperties[property]);
            }
        }
    }

    /**
     * Creates a new class properties for the class.
     */
    function prepareClassProperties(elementClass)
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
        /*
        // NOTE: This is only possible if there is some sort of indicator in the class itself
        // to signify it is a web component using this helper. Since there are no such
        // common indicators that apply to ALL components, we MUST require the user to
        // call our define() functions BEFORE using it. Therefore, out-of-order is no longer
        // an issue.
        // Here is the code for posterity:
        if (typeof superClass[buildProperties] === 'function')
        {
            superClass[buildProperties]();
        }
        */

        if (superClass && superClass.hasOwnProperty(classProperties))
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

    /** @module ObservedAttributes */

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
                value: function (attribute, oldValue, newValue)
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

    /** @module WebComponentHelper */

    /**
     * @example Feast your eyes upon the basic web component.
     * 
     * const templateNode = createTemplateElementFromString
     * (
     *      '<div>Hello</div>',
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
     * 
     *          const shadowRoot = element.attachShadow({ mode: 'open' });
     *          shadowRoot.appendChild(templateNode.content.cloneNode(true));
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
     * 
     * window.customElements.define('example-web-component', ExampleWebComponent, {});
     * export default ExampleWebComponent;
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
     * Creates the element for the passed-in HTML string.
     * @param {String} contentString    The HTML string representation to parse.
     * @returns {Element}               The created element.
     */
    function createElementFromString(contentString)
    {
        const fragment = document.createRange().createContextualFragment(contentString);
        // Get the template element before fragment is destroyed.
        const templateElement = fragment.firstElementChild;
        // Attach it to the head of the document. Afterwards, fragment will be destroyed as the parent.
        document.head.appendChild(fragment);
        return templateElement;
    }

    /**
     * Creates the template element for the passed-in template and style content.
     * @param {String} templateString   The template HTML string representation.
     * @param {String} styleString      The style CSS string representation.
     * @returns {Element}               The created template element.
     */
    function createTemplateElementFromString(templateString = '', styleString = '')
    {
        const contentString = `<template><style>${styleString}</style>${templateString}</template>`;
        return createElementFromString(contentString);
    }

    /** @module CuttleDefine */

    /**
     * Defines the passed-in element as a WebComponent with options. This should be called after class definition.
     * @param {String|Object} opts The tag name. Or, if the parameter is of object type, the element options.
     * @param opts.name The custom element tag name.
     * @param opts.shadowTemplate The <template> element to attach to the shadow root.
     * @param opts.custom The customElements.define() options. If false, then will not define custom tag.
     * @param opts.properties The properties object map for the element.
     */
    function define(elementClass, opts)
    {
        const isObject = typeof opts === 'object';

        // Properties...
        if (isObject && opts.properties)
        {
            defineProperties(elementClass, opts.properties);
        }
        else if (elementClass.hasOwnProperty('properties'))
        {
            defineClassProperties(elementClass, elementClass.properties);
        }

        // Shadow template...
        if (isObject && opts.shadowTemplate)
        {
            defineShadowTemplate(elementClass, opts.shadowTemplate);
        }
        else if (elementClass.hasOwnProperty('shadowTemplate'))
        {
            defineShadowTemplate(elementClass, elementClass.shadowTemplate);
        }

        // Custom tag...
        // NOTE: This must be last in the function as it will call the element
        // constructor before end of function.
        if (typeof opts === 'string')
        {
            defineCustomTag(elementClass, opts);
        }
        // Only define if custom is NOT false...
        else if (isObject && opts.custom !== false && opts.name)
        {
            defineCustomTag(elementClass, opts.name, opts.custom || {});
        }

        return elementClass;
    }

    function defineClassProperties(elementClass, properties)
    {
        // Just in case it was already defined somewhere...
        if (!elementClass.hasOwnProperty(classProperties))
        {
            buildClassProperties(elementClass, properties);
        
            // Setup our functions such that they are always called, regardless if the user overrides it.
            assignObservedAttributesForProperties(elementClass);
            assignAttributeChangedCallbackForProperties(elementClass);
        }
        else
        {
            console.error(`[Cuttle] Found duplicate property definition for <${tagName}>... ignoring re-definition.`);
        }
    }
    /** Gets the classProperties for the element class. */
    function getDefinedClassProperties(elementClass)
    {
        return elementClass[classProperties];
    }

    const shadowTemplate = Symbol('shadowTemplate');
    function defineShadowTemplate(elementClass, templateElement)
    {
        if (!elementClass.hasOwnProperty(shadowTemplate))
        {
            if (templateElement instanceof Element)
            ;
            else if (typeof templateElement === 'string')
            {
                templateElement = createElementFromString(templateElement);
            }
            else if (typeof templateElement === 'object')
            {
                templateElement = createTemplateElementFromString(templateElement.template, templateElement.style);
            }
            elementClass[shadowTemplate] = templateElement;
        }
        else
        {
            console.error(`[Cuttle] Found duplicate shadow template definition for <${tagName}>... ignoring re-definition.`);
        }
    }
    /** Gets the shadow template for the element class. */
    function getDefinedShadowTemplate(elementClass)
    {
        return elementClass[shadowTemplate];
    }

    /**
     * Register the passed-in element class with the passed-in tag name for the document.
     * This should be called once after class definition.
     * @param {Class} elementClass          The class to represent.
     * @param {String} tagName              The tag name that represents the tag in HTML.
     * @param {Object} customOpts           The additional options to define custom tags.
     * @param {String} customOpts.extends   The name of the tag this Element is an extension of.
     *                                      This will be passed to customElement.define().
     *                                      Refer to the web component specifications for
     *                                      more information.
     */
    function defineCustomTag(elementClass, tagName, customOpts)
    {
        // Just in case it was already defined somewhere...
        if (!window.customElements.get(tagName))
        {
            window.customElements.define(tagName, elementClass, customOpts);
        }
        else
        {
            console.error(`[Cuttle] Found duplicate tag definition of <${tagName}>... ignoring re-definition.`);
        }
    }

    /** @module CuttleConstruct */

    /** This should be called in the constructor. */
    function construct(element, opts = {})
    {
        // Why shadow root? Encapsulation and separation of style.
        // Why initialize here? Cause no one can mess with this.

        let shadowRootFlag = false;
        let propertiesFlag = false;

        // Object as options...
        if (typeof opts === 'object')
        {
            if (opts.shadow === false)
            {
                // Don't define a shadow root...
                shadowRootFlag = true;
            }
        }

        // None as options...
        if (!shadowRootFlag)
        {
            shadowRootFlag = true;
            const shadowTemplate = getDefinedShadowTemplate(element.constructor);
            constructShadowRoot(element, shadowTemplate, opts.shadow || { mode: 'open' });
        }
        if (!propertiesFlag)
        {
            propertiesFlag = true;
            const classProperties = getDefinedClassProperties(element.constructor);
        }
        
        return element;
    }

    /**
     * Attach the shadow DOM root, with a childElement if specified, to the
     * element. This should be called in the constructor.
     * @param {Node} element        The element to attach to.
     * @param {Node} shadowTemplate The child element in the shadow DOM root.
     * @param {Object} opts         The options passed to attachShadow().
     */
    function constructShadowRoot(element, shadowTemplate, opts)
    {
        const shadowRoot = element.attachShadow(opts);
        shadowRoot.appendChild(shadowTemplate.content.cloneNode(true));
    }

    exports.construct = construct;
    exports.define = define;

    Object.defineProperty(exports, '__esModule', { value: true });

}));
