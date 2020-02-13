/** Helpful find functions. */

/**
 * Finds the first element in the component that satisfy the selectors.
 * @param {HTMLElement} component The component to find within.
 * @param {String} selectors A string of query selectors that identify the target element.
 * @returns {Element} The first element that satisfies the specified selectors within the root of the component.
 */
export function find(component, selectors) { return getRootElement(component).querySelector(selectors); }
find.template = {
    content: '(INSTANCE.shadowRoot || INSTANCE).querySelector(SELECTORS)',
    arguments: [ 'INSTANCE', 'SELECTORS' ],
};

/**
 * Finds all the elements in the component that satisfy the selectors.
 * @param {HTMLElement} component The component to find within.
 * @param {String} selectors A string of query selectors that identify the target element.
 * @returns {Element} The first element that satisfies the specified selectors within the root of the component.
 */
export function findAll(component, selectors) { return getRootElement(component).querySelectorAll(selectors); }
findAll.template = {
    content: '(INSTANCE.shadowRoot || INSTANCE).querySelectorAll(SELECTORS)',
    arguments: [ 'INSTANCE', 'SELECTORS' ],
};

/**
 * Finds the element in the component that has the specified id.
 * @param {HTMLElement} component The component to find within.
 * @param {String} id The value of the `id` attribute of the element.
 * @returns {Element} The first element with the matched `id` attribute within the root of the component.
 */
export function findById(component, id) { return getRootElement(component).getElementById(id); }
findById.template = {
    content: '(INSTANCE.shadowRoot || INSTANCE).getElementById(ID)',
    arguments: [ 'INSTANCE', 'ID' ],
};

/**
 * Gets the element root of the component.
 * @param {HTMLElement} component The component to find the root for.
 * @returns {Element} The root element of the component. Usually this is either the shadow root or just itself.
 */
export function getRootElement(component)
{
    if (!(component instanceof HTMLElement)) throw new Error('Cannot find root element of component not extended from HTMLElement.');
    return component.shadowRoot || component;
}
getRootElement.template = {
    content: '(INSTANCE.shadowRoot || INSTANCE)',
    arguments: [ 'INSTANCE' ],
};
