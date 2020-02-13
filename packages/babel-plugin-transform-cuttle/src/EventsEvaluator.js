export function evaluate(path)
{
    let dst = [];
    let node = path.node;
    let returnStatement = node.body.body[node.body.body.length - 1];
    let returnedObject = returnStatement.argument;
    if (returnedObject.type === 'ArrayExpression')
    {
        for (let arrayElement of returnedObject.elements)
        {
            if (arrayElement.type === 'StringLiteral')
            {
                let event = arrayElement.value;
                if (!isGlobalEventHandler(event))
                {
                    dst.push(event);
                }
                else
                {
                    throw new Error('Cannot register a duplicate GlobalEventHandler event.');
                }
            }
            else
            {
                throw new Error('Unsupported event value type - must be a string.');
            }
        }

        return dst;
    }
    else
    {
        throw new Error('Unsupported properties object evaluation.');
    }
}

const GLOBAL_EVENT_HANDLER_KEYS = new Set([
    'onabort',
    'onblur',
    'onerror',
    'onfocus',
    'oncancel',
    'oncanplay',
    'onchange',
    'onclick',
    'onclose',
    'oncontextmenu',
    'oncuechange',
    'ondblclick',
    'ondrag',
    'ondragend',
    'ondragenter',
    'ondragexit',
    'ondragleave',
    'ondragstart',
    'ondrop',
    'ondurationchange',
    'onemptied',
    'onended',
    'onformdata',
    'ongotpointercapture',
    'oninput',
    'oninvalid',
    'onkeydown',
    'onkeypress',
    'onkeyup',
    'onload',
    'onloadeddata',
    'onloadedmetadata',
    'onloadend',
    'onloadstart',
    'onresize',
    'ontransitioncancel',
    'ontransitionend',
]);

function isGlobalEventHandler(eventName)
{
    return GLOBAL_EVENT_HANDLER_KEYS.has(eventName);
}
