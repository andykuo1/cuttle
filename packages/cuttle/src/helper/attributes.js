export const ATTRIBUTE_CHANGED_LISTENERS_KEY = Symbol('attributeChangedListeners');
export const ATTRIBUTE_ALL_KEY = '*';

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
