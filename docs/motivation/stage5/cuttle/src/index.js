import * as Transformer from './transformer.js';

import * as OptProperties from './interfaces/opts/Properties.js';

import * as Middleware from './interfaces/middleware/Middleware.js';
import './interfaces/middleware/ObservedAttributes.js';
import './interfaces/middleware/Properties.js';

export function transform(elementConstructor)
{
    return Transformer.applyTransformations(elementConstructor,
        OptProperties.transformify(elementConstructor),
        Middleware.transformify(elementConstructor),
    );
}

export * from './utils/shadow.js';
export * from './utils/find.js';
export * from './utils/types.js';
export * from './utils/properties.js';
