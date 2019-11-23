# cuttle v2
A tiny helper for creating Web Components.

The file itself is smaller than ~3KB.

_This is a redesign of the cuttle utility library (hence the extra 2). This includes the "compiled" and the library version._

## Features
- A small footprint.
- Compatible with Angular, Vue.js, and any other framework that works with native web components.
- Crafted to satisfy the web component specifications.
- Let's you override existing web components, unlike other frameworks such as `lit-html` or `slim.js`. So feel free to extend HTMLButtonElement!
- Doesn't care about your backplate. It's just properties. Use `redux` or whatever you prefer.
- Has multiple ways to do things to match your code style.
- Automatically parses attributes to any type when you use it.
- Use what you learn or already know about native Web Components! Simple and reusable.

## What do I need to USE a Cuttle component?
- ~~Add a `<script>` tag to the document for Cuttle.js~~
    - **NO LONGER NECESSARY!!! :D**
    - Transpile it with our new Babel plugin and you are **DEPENDENCY-FREE!**.
- And a `<script>` tag for the component you want to use.
- That's it.

~~**In the future, we are planning to be able "transpile" Cuttle components into plain, old native web components. It would be just like you wrote it from scratch! No more external dependencies and usable everywhere, just as web components should be.**~~

**It's already here! Check out our new Babel plugin!**

```html
<!DOCTYPE html>
<html>
    <head>
        <script src="cuttle.min.js"></script>
        <!-- ^^^ If you use the Babel plugin, you don't need to load any external libraries! -->

        <script src="MyCuttleComponent.js"></script>
    </head>
    <body>
        <!-- Your other code here... -->
    </body>
</html>
```

## How do I make a Cuttle component?
There are a few ways to make one.

Here's a basic setup.

```javascript
class HelloWorld extends HTMLElement
{
    constructor()
    {
        super();
    }
}
cuttle.defineComponent(HelloWorld, 'hello-world');

export default HelloWorld;
```

Something a little more complex...

```javascript
const HELLO_WORLD_TEMPLATE = document.querySelector('template#hello-world');
class HelloWorld extends HTMLElement
{
    static get properties()
    {
        return {
            content: { type: String, value: 'World' },
            rainbow: { type: Boolean }
        };
    }

    constructor()
    {
        super();

        cuttle.attachShadow(this, HELLO_WORLD_TEMPLATE);
    }
}
cuttle.defineComponent(HelloWorld, 'hello-world');
export default HelloWorld;
```

Have it as a single file component...

```javascript
const TEMPLATE = cuttle.createTemplate(`
<h1>Hello!</h1>
`);
const STYLE = cuttle.createStyle(`
h1 {
    color: tomato;
}
`);

class HelloWorld extends HTMLElement
{
    static get properties()
    {
        return {
            content: { type: String },
            rainbow: { type: Boolean }
        }
    }

    constructor()
    {
        super();

        cuttle.attachShadow(this, TEMPLATE, STYLE);
    }
}

cuttle.defineComponent(HelloWorld, 'hello-world');
```

---
**THIS PART IS UNDER CONSTRUCTION**
---

Or as decorators when we get they get implemented into the language...

```javascript
@shadowRoot(`
<template>
    <h1>Hello!</h1>
    <style>
        h1 { color: tomato; }
    </style>
</template>
`)
@customTag('hello-world', { extends: 'h1' })
class HelloWorld extends HTMLElement
{
    @property({ type: String })                 content
    @property({ type: Boolean, reflect: true }) rainbow

    constructor()
    {
        super();
        Cuttle.construct(this);
    }
}

export default HelloWorld;
```

Or just use any part of it you want...

```javascript

const HelloWorldTemplate = Cuttle.createTemplateElementFromString(
    '<h1>Hello</h1>',
    'h1 { color: tomato; }'
);

class HelloWorld extends HTMLElement
{
    constructor()
    {
        super();
        Cuttle.constructShadowRoot(this,
            HelloWorldTemplate,
            { mode: 'close' });
    }
}

Cuttle.defineCustomTag(HelloWorld, 'hello-world', { extends: 'h1' });
export default HelloWorld;
```