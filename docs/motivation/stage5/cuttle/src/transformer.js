export function applyTransformations(elementConstructor, ...transformations)
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
