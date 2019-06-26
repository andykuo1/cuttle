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
export function createElementFromString(contentString)
{
    const fragment = document.createRange().createContextualFragment(contentString);
    // Get the template element before fragment is destroyed.
    const templateElement = fragment.firstElementChild
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
export function createTemplateElementFromString(templateString = '', styleString = '')
{
    const contentString = `<template><style>${styleString}</style>${templateString}</template>`;
    return createElementFromString(contentString);
}