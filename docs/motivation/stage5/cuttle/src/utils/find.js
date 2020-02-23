export function find(element, selectors)
{
    return element.shadowRoot.querySelector(selectors);
}

export function findAll(element, selectors)
{
    return element.shadowRoot.querySelectorAll(selectors);
}
