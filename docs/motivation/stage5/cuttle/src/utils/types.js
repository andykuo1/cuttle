export function EventListener(type)
{
    if (!type) throw new Error('Event type must be defined.');
    return function EventListener(value)
    {
        let listener = this[`_on${type}`];
        if (listener) this.removeEventListener(type, listener);
        let result = new Function('event', 'with(document){with(this){' + value + '}}');
        this.addEventListener(type, result);
        return result;
    };
}
