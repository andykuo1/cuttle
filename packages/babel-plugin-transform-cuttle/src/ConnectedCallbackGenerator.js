import { types, template } from '@babel/core';

export function generate(properties, path, context)
{
    replaceConnectedCallback(path, superCallback => {
        let statements = [];

        const defaultBuildRequire = template(`
        if (!this.hasAttribute(KEY)) {
            this.setAttribute(KEY, DEFAULT_VALUE);
        }
        `);

        const upgradeBuildRequire = template(`
        if (this.hasOwnProperty(KEY)) {
            let value = this.KEY_IDENTIFIER;
            delete this.KEY_IDENTIFIER;
            this.KEY_IDENTIFIER = value;
        }
        `);

        // Set default values...
        for (let key of Object.keys(properties))
        {
            if (hasDefaultPropertyValue(properties, key))
            {
                statements.push(
                    defaultBuildRequire({
                        KEY: types.stringLiteral(key),
                        DEFAULT_VALUE: getDefaultPropertyValue(properties, key)
                    })
                );
            }
        }

        // Upgrade properties...
        for(let key of Object.keys(properties))
        {
            statements.push(
                upgradeBuildRequire({
                    KEY: types.stringLiteral(key),
                    KEY_IDENTIFIER: types.identifier(key),
                })
            );
        }

        // User-defined callback...
        if (superCallback)
        {
            statements.push(superCallback.body);
        }
        
        return types.classMethod(
            'method',
            types.identifier('connectedCallback'),
            [],
            types.blockStatement(statements)
        );
    });
}

function replaceConnectedCallback(parentPath, callback)
{
    let parentNode = parentPath.node;
    for (let i = 0; i < parentNode.body.length; ++i)
    {
        let classMethod = parentNode.body[i];
        if (classMethod.type === 'ClassMethod'
            && classMethod.kind === 'method'
            && classMethod.key.type === 'Identifier'
            && classMethod.key.name === 'connectedCallback')
        {
            parentNode.body[i] = callback(classMethod);
            return;
        }
    }
    parentNode.body.push(callback(null));
}

function hasDefaultPropertyValue(properties, key)
{
    return typeof properties[key].value !== 'undefined';
}

function getDefaultPropertyValue(properties, key)
{
    return properties[key].value;
}
