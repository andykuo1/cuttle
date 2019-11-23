import { types } from '@babel/core';

export function generate(properties, path)
{
    replaceObservedAttributes(path.parentPath, superCallback => {
        let returnArrayElements = [
            ...Object.keys(properties).map(value => types.stringLiteral(value))
        ];

        if (superCallback)
        {
            returnArrayElements.push(
                types.spreadElement(
                    types.callExpression(
                        types.arrowFunctionExpression([], superCallback.body),
                        []
                    )
                )
            );
        }
        
        return types.classMethod(
            'get',
            types.identifier('observedAttributes'),
            [],
            types.blockStatement([
                types.returnStatement(
                    types.arrayExpression(returnArrayElements)
                )
            ]),
            false,
            true
        );
    });
}

function replaceObservedAttributes(parentPath, callback)
{
    let parentNode = parentPath.node;
    for (let i = 0; i < parentNode.body.length; ++i)
    {
        let classMethod = parentNode.body[i];
        if (classMethod.type === 'ClassMethod'
            && classMethod.static
            && classMethod.kind === 'get'
            && classMethod.key.type === 'Identifier'
            && classMethod.key.name === 'observedAttributes')
        {
            parentNode.body[i] = callback(classMethod);
            return;
        }
    }
    parentNode.body.unshift(callback(null));
}