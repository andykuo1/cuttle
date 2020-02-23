export function createTemplate(innerHTML)
{
    let template = document.createElement('template');
    template.innerHTML = innerHTML;
    return template;
}

export function createStyle(innerCSS)
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

export function attachShadowAndTemplate(shadowElement, templateElement = 'template', styleElement = undefined, shadowInitOpts = { mode: 'open' })
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
