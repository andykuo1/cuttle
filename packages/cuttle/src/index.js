// TODO: Add custom form elements.
// TODO: Add more extended tag registry.

export * from './helper/find.js';
export * from './helper/create.js';
export * from './helper/typecheck.js';
export { bindAttributeChanged } from './helper/attributes.js';
export * from './component.js';

// NOTE: To support default exports as well :)
import * as self from './index.js';
export default self;
