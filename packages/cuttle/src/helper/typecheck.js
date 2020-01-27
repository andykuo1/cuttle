/** Sanity checker for extended elements */

export function isExtendedClassForTagName(componentClass, tagName = '')
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

export function isCustomElement(componentClass)
{
    return componentClass.prototype instanceof HTMLElement;
}
