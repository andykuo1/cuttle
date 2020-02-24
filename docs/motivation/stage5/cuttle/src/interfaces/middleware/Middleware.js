const middlewares = {};

export function define(name, middleware)
{
    if (name in middlewares) return;
    middlewares[name] = middleware;
    window[name] = tag.bind(undefined, name);
}

function tag(name, ...args)
{
    if (typeof args[0] === 'string') args[0] = [args[0]];
    return `__${name}::${args[0].reduce((prev, curr, i) => prev + curr + args[i + 1])}`;
}

export function transformify(elementConstructor)
{
    let transforms = [];

    let elementPrototype = elementConstructor.prototype;
    for(let propertyName of Object.getOwnPropertyNames(elementPrototype))
    {
        let index = propertyName.indexOf('::');
        if (propertyName.startsWith('__') && index > 2)
        {
            let name = propertyName.substring(2, index);
            let key = propertyName.substring(index + 2);
            let callback = elementPrototype[propertyName];
            let result = middlewares[name].call(elementConstructor, key, callback);
            transforms.push(result);
        }
    }
    
    return transforms;
}
