import { types, template } from '@babel/core';

export function generate(properties, path)
{
    replaceAttributeChangedCallback(path.parentPath, superCallback => {
        let statements = [];

        let innerStatements = [];
        innerStatements.push(types.variableDeclaration('let', [
            types.variableDeclarator(types.identifier('ownedPrev')),
            types.variableDeclarator(types.identifier('ownedValue'))
        ]));

        let switchCases = [];
        const attributeBuildRequire = template(`
        if (this.CALLBACK) {
            ownedPrev = this.KEY;
            ownedValue = this.KEY = PARSER_EXPRESSION;
            this.CALLBACK.call(this, ownedValue, ownedPrev, attribute);
        }
        `);
        for(let key of Object.keys(properties))
        {
            switchCases.push(types.switchCase(types.stringLiteral(key), [
                attributeBuildRequire({
                    KEY: types.identifier('_' + key),
                    CALLBACK: types.identifier(getCallbackNameForAttribute(key)),
                    PARSER_EXPRESSION: getParserExpressionByProperty(properties[key]),
                }),
                types.breakStatement()
            ]));
        }
        innerStatements.push(types.switchStatement(types.identifier('attribute'), switchCases));

        // Handle the 'any' callback...
        innerStatements.push(template.ast(`
            if (this.${getCallbackNameForAttribute('*')}) {
                this.${getCallbackNameForAttribute('*')}.call(this, ownedValue, ownedPrev, attribute);
            }
        `));

        // Make sure our code is within its own scope...
        statements.push(types.blockStatement(innerStatements));

        if (superCallback)
        {
            statements.push(
                types.expressionStatement(
                    types.callExpression(
                        types.arrowFunctionExpression([superCallback.params], superCallback.body),
                        [
                            types.identifier('attribute'),
                            types.identifier('prev'),
                            types.identifier('value')
                        ]
                    )
                )
            );
        }
        
        return types.classMethod(
            'method',
            types.identifier('attributeChangedCallback'),
            [
                types.identifier('attribute'),
                types.identifier('prev'),
                types.identifier('value')
            ],
            types.blockStatement(statements)
        );
    });
}

function replaceAttributeChangedCallback(parentPath, callback)
{
    let parentNode = parentPath.node;
    for (let i = 0; i < parentNode.body.length; ++i)
    {
        let classMethod = parentNode.body[i];
        if (classMethod.type === 'ClassMethod'
            && classMethod.kind === 'method'
            && classMethod.key.type === 'Identifier'
            && classMethod.key.name === 'attributeChangedCallback')
        {
            parentNode.body[i] = callback(classMethod);
            return;
        }
    }
    parentNode.body.push(callback(null));
}

function getParserExpressionByProperty(property)
{
    switch(property.type.name)
    {
        case 'Boolean':
            return template.expression.ast('value !== null');
        case 'String':
            return template.expression.ast('value');
        default:
            return template.expression('PARSER(value)')({ PARSER: property.type });
    } 
}

export function getCallbackNameForAttribute(attribute)
{
    if (attribute === '*')
    {
        return '__any__AttributeChangedCallback';
    }
    else
    {
        return '__' + attribute + 'AttributeChangedCallback';
    }
}
