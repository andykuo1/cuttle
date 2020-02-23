import * as OptProperties from '../opts/properties.js';
import * as Literals from './literals.js';

// static [Attribute`name`]() { return String; }
export function Attribute(strings, ...values)
{
    return Literals.asString(Attribute, strings, values);
}

export function transformify(elementConstructor)
{
    if (!(elementConstructor.prototype instanceof HTMLElement)) throw new Error('Custom elements must extend HTMLElement.');

    let entries = Literals.getEntries(Attribute, elementConstructor);

    let properties = {};
    for(let name of Object.keys(entries))
    {
        properties[name] = entries[name].call(undefined);
    }
    return OptProperties.transformify(elementConstructor, properties);
}
