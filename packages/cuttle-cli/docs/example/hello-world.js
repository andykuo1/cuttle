import Cuttle from 'cuttle';

const TEMPLATE = Cuttle.createTemplateElement(`
<p>
    Hello world!
</p>
`);
const STYLE = Cuttle.createStyleElement(`
p {
    color: blue;
}
`);

export class HelloWorld extends HTMLElement
{
    constructor()
    {
        super();

        this.attachShadow({ mode: 'open' });

        Cuttle.appendTemplate(this, TEMPLATE);
        Cuttle.appendStyle(this, STYLE);
    }

    connectedCallback()
    {
        console.log('Hello! I am connected!');
    }
}

Cuttle.defineComponent(HelloWorld, 'hello-world');
