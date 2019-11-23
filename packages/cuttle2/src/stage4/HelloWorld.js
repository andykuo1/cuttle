import * as wcutil from './wcutil.js';
import Template from './HelloWorld.html.js';
import Style from './HelloWorld.css.js';
const TEMPLATE = wcutil.createTemplate(Template, Style);

class HelloWorld extends HTMLElement
{
    /** @override */
    static get properties()
    {
        return {
            name: { type: String, value: 'George' },
            disabled: Boolean,
        };
    }

    constructor()
    {
        super();

        wcutil.attachShadow(this, TEMPLATE);

        this.myOutput = wcutil.find(this, 'output');
        this.myButton = wcutil.find(this, 'button');
        this.myLabel = wcutil.find(this, '#name');

        this.handleClick = this.handleClick.bind(this);

        wcutil.bindAttributeChanged(this, 'name', value => this.myLabel.textContent = value);
        wcutil.bindAttributeChanged(this, 'disabled', this.handleDisabled);
    }

    /** @override */
    connectedCallback()
    {
        this.myButton.addEventListener('click', this.handleClick);
    }

    /** @override */
    disconnectedCallback()
    {
        this.myButton.removeEventListener('click', this.handleClick);
    }

    handleDisabled(value)
    {
        this.myButton.toggleAttribute('disabled', value);
        if (value) this.myOutput.textContent = 'Zzz';
    }

    handleClick(e) { this.myOutput.textContent = `Hello World, ${this.name}!`; }
}
wcutil.defineComponent(HelloWorld, 'hello-world');

export default HelloWorld;
