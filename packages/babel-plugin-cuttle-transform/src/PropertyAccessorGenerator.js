import { types, template } from '@babel/core';

export function generate(properties, path)
{
    for (let key of Object.keys(properties))
    {
        let property = properties[key];
        // Create getter...
        createGetterFromProperty(path, key, property);
        // Create setter...
        createSetterFromProperty(path, key, property);
    }
}

function createGetterFromProperty(path, key, property)
{
    let result = types.classMethod(
        'get',
        types.identifier(key),
        [],
        types.blockStatement([
            types.returnStatement(
                template.expression.ast('this._' + key)
            )
        ])
    );
    path.insertAfter(result);
}

function createSetterFromProperty(path, key, property)
{
    let statement;
    switch(property.type.name)
    {
        case 'Boolean':
            statement = `this.toggleAttribute('${key}', value)`;
            break;
        case 'String':
            statement = `this.setAttribute('${key}', value)`;
            break;
        default:
            statement = `this.setAttribute('${key}', String(value))`;
    }
    let result = types.classMethod(
        'set',
        types.identifier(key),
        [ types.identifier('value') ],
        types.blockStatement([
            template.ast(statement)
        ])
    );
    path.insertAfter(result);
}
