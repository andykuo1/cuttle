export function evaluate(path)
{
    let dst = {};
    let node = path.node;
    let returnStatement = node.body.body[node.body.body.length - 1];
    let returnedObject = returnStatement.argument;
    if (returnedObject.type === 'ObjectExpression')
    {
        for (let objectProperty of returnedObject.properties)
        {
            if (objectProperty.type !== 'ObjectProperty')
            {
                throw new Error('Unsupported property type.');
            }

            let propertyName = getPropertyName(objectProperty);
            let propertyType;
            let propertyDefaultValue;
            switch(objectProperty.value.type)
            {
                case 'Identifier':
                    propertyType = objectProperty.value;
                    propertyDefaultValue = undefined;
                    break;
                case 'ObjectExpression':
                    propertyType = findPropertyWithName(objectProperty.value.properties, 'type').value;
                    propertyDefaultValue = findPropertyWithName(objectProperty.value.properties, 'value').value;
                    break;
                default:
                    throw new Error('Unsupported property value type - must be either a type or object.');
            }

            dst[propertyName] = {
                type: propertyType,
                value: propertyDefaultValue,
            };
        }

        return dst;
    }
    else
    {
        throw new Error('Unsupported properties object evaluation.');
    }
}

function getPropertyName(objectProperty)
{
    let propertyName;
    switch(objectProperty.key.type)
    {
        case 'Identifier':
            propertyName = objectProperty.key.name;
            break;
        case 'StringLiteral':
            propertyName = objectProperty.key.value;
            break;
        default:
            throw new Error('Unsupported property name type - must be a string.');
    }
    return propertyName;
}

function findPropertyWithName(objectProperties, name)
{
    for (let objectProperty of objectProperties)
    {
        let propertyName = getPropertyName(objectProperty);
        if (propertyName === name) return objectProperty;
    }
    return null;
}