import * as Middleware from './Middleware.js';

Middleware.define('ObservedAttributeChanged', function(key, callback) {
    return {
        observedAttributes() { return [key]; },
        attributeChangedTestCases: {
            [key]: callback
        }
    };
});
