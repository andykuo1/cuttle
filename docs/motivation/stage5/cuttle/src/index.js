import * as Transformer from './transformer.js';

import * as OptProperties from './opts/properties.js';

import * as LiteralProperties from './literals/properties.js';
import * as LiteralObservedAttributes from './literals/observedAttributes.js';

export function transform(elementConstructor)
{
    return Transformer.applyTransformations(elementConstructor,
        OptProperties.transformify(elementConstructor),
        LiteralProperties.transformify(elementConstructor),
        LiteralObservedAttributes.transformify(elementConstructor),
    );
}

export * from './utils/shadow.js';
export * from './utils/find.js';
export { ObservedAttributeChanged } from './literals/observedAttributes.js';
export { Attribute } from './literals/properties.js';