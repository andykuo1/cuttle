import { types, template } from '@babel/core';

export function generate(properties, path, context)
{
    replaceAttributeChangedCallback(path, superCallback => {
        let statements = [];

        let switchCases = [];
        const attributeBuildRequire = template(`{
            let ownedPrev = this.KEY;
            let ownedValue = this.KEY = PARSER_EXPRESSION;
            (CALLBACK).call(INSTANCE, ownedValue, ownedPrev, attribute);
        }
        `);
        for(let key of Object.keys(properties))
        {
            if (key in context.attributeChangedCallbacks)
            {
                switchCases.push(types.switchCase(types.stringLiteral(key), [
                    attributeBuildRequire({
                        KEY: types.identifier('_' + key),
                        INSTANCE: context.attributeChangedCallbacks[key].instance,
                        PARSER_EXPRESSION: getParserExpressionByProperty(properties[key]),
                        CALLBACK: context.attributeChangedCallbacks[key].callback,
                    }),
                    types.breakStatement()
                ]));
            }
        }

        const eventBuildRequire = template(`{
            this.KEY = new Function('event', 'with(document){with(this){' + value + '}}').bind(INSTANCE);
        }
        `);
        for(let event of context.events)
        {
            switchCases.push(types.switchCase(types.stringLiteral('on' + event), [
                eventBuildRequire({
                    KEY: types.identifier('on' + event),
                    INSTANCE: types.thisExpression(),
                }),
                types.breakStatement()
            ]));
        }
        statements.push(types.switchStatement(types.identifier('attribute'), switchCases));
        
        if (superCallback)
        {
            statements.push(
                types.expressionStatement(
                    types.callExpression(
                        types.arrowFunctionExpression(superCallback.params, superCallback.body),
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
