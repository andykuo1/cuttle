import * as cuttle from '../../lib/cuttle.js';
import Template from './HelloWorld.html';
import Style from './HelloWorld.css';
const TEMPLATE = cuttle.createTemplate(Template);
const STYLE = cuttle.createStyle(Style);

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

        cuttle.attachShadow(this, TEMPLATE, STYLE);

        this.myOutput = cuttle.find(this, 'output');
        this.myButton = cuttle.find(this, 'button');
        this.myLabel = cuttle.find(this, '#name');

        this.handleClick = this.handleClick.bind(this);

        cuttle.bindAttributeChanged(this, 'name', value => this.myLabel.textContent = value);
        cuttle.bindAttributeChanged(this, 'disabled', this.handleDisabled);
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
cuttle.defineComponent(HelloWorld, 'hello-world');

export default HelloWorld;
