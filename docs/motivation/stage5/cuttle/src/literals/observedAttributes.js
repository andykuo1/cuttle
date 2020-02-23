import * as Literals from './literals.js';

export function ObservedAttributeChanged(strings, ...values)
{
    return Literals.asString(ObservedAttributeChanged, strings, values);
}

const OBSERVED_ATTRIBUTES_CALLBACK_MAP = Symbol('observedAttributesCallbackMap');

export function transformify(elementConstructor)
{
    if (!(elementConstructor.prototype instanceof HTMLElement)) throw new Error('Custom elements must extend HTMLElement.');

    // Generates individual callbacks for attributeChangedCallback() with ObservedAttributeChanged()...
    const entries = Literals.getEntries(ObservedAttributeChanged, elementConstructor.prototype);

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
