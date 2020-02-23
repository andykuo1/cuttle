export function asString(func, strings=[], values=[])
{
    const name = func.name;
    if (typeof args[0] === 'string') args[0] = [args[0]];
    return `__${name}::${strings.reduce((prev, curr, i) => prev + curr + values[i])}`;
}

export function getEntries(func, target)
{
    const prefix = '__' + func.name + '::';
    let dst = {};
    for(let propertyName of Object.getOwnPropertyNames(target))
    {
        if (propertyName.startsWith(prefix))
        {
            let attribute = propertyName.substring(prefix.length);
            dst[attribute] = target[propertyName];
        }
    }
    return dst;
}

export function define(name, opts)
{
    opts.name = name;
    opts.tag = asString.bind(opts);
    opts.tag.opts = opts;
    window[name] = opts.tag;
}
