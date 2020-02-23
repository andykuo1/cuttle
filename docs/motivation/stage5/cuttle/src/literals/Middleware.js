const middlewares = {};

export function define(name, opts)
{
    middlewares[name] = opts;
    opts.name = name;
    opts.tag = tag.bind(opts);
    window[name] = opts.tag;
}

export function tag(...args)
{
    const name = this.name;
    if (typeof args[0] === 'string') args[0] = [args[0]];
    return `${name}::${strings.reduce((prev, curr, i) => prev + curr + values[i])}`;
}

export function entries(elementConstructor)
{
    const fname = elementConstructor.name;
    const flength = fname.length;

    let dst = {};
    for(let propertyName of Object.getOwnPropertyNames(target))
    {
        let index = propertyName.indexOf('::');
        if (index > 0)
        {
            let name = propertyName.substring(0, index);
            if (name === fname)
        }
        if (propertyName.startsWith('__') && propertyName.endsWith(fname))
        {
            let attribute = propertyName.substring(2, propertyName.length - flength);
            dst[attribute] = target[propertyName];
        }
    }
    return dst;
}

export class Middleware
{
    static get tag() { return ''}

    static findEntries()
    {
        const fname = func.name;
        const flength = fname.length;
    
        let dst = {};
        for(let propertyName of Object.getOwnPropertyNames(target))
        {
            if (propertyName.startsWith('__') && propertyName.endsWith(fname))
            {
                let attribute = propertyName.substring(2, propertyName.length - flength);
                dst[attribute] = target[propertyName];
            }
        }
        return dst;
    }

    static computeKey(strings, ...values)
    {
        const name = this.tag.name;
        if (typeof strings === 'string') strings = [strings];
        return `${name}::${strings.reduce((prev, curr, i) => prev + curr + values[i])}`;
    }

    constructor(key, handler, elementClass)
    {
        this.key = key;
        this.handler = handler;
        this.elementClass = elementClass;

        this._mapKey = Symbol(this.name + 'MapKey');
    }

    entries()
    {
        return this.elementClass.prototype[this._mapKey];
    }

    observedAttributes()
    {
        return [];
    }

    connectedCallback()
    {
        return;
    }

    disconnectedCallback()
    {
        return;
    }

    adoptedCallback()
    {
        return;
    }

    attributeChangedCallback(attribute, prev, value)
    {
        return;
    }
}
