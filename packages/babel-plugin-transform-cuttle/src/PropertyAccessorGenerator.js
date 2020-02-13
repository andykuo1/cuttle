import { types, template } from '@babel/core';

export const EVENT_CALLBACK = Symbol('callback');

export function generate(properties, path, context)
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
    if (property === EVENT_CALLBACK) key = 'on' + key;
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
    if (property === EVENT_CALLBACK)
    {
        let event = key;
        key = 'on' + event;
        statement = `if (this._${key}) this.removeEventListener('${event}', this._${key});`
            + `this._${key} = value;`
            + `if (this._${key}) this.addEventListener('${event}', value);`;
        statement = template.ast(statement);
    }
    else
    {
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
        statement = [template.ast(statement)];
    }
    let result = types.classMethod(
        'set',
        types.identifier(key),
        [ types.identifier('value') ],
        types.blockStatement(statement)
    );
    path.insertAfter(result);
}
