export function asString(func, strings=[], values=[])
{
    let fname = func.name;
    if (typeof strings === 'string') strings = [strings];
    return `__${strings.reduce((prev, curr, i) => prev + curr + values[i])}${fname}`;
}

export function getEntries(func, target)
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
