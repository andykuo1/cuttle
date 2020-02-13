import Cuttle from 'cuttle';

const TEMPLATE = Cuttle.createTemplateElement(`
<div>
    <p>
        <output for="hello">
            Zzz
        </output>
    </p>
    <button id="hello">
        Say hello to <label id="name">???</label>
    </button>
</div>
`);
const STYLE = Cuttle.createStyleElement(`
div {
    border: 1px solid black;
    margin: 0.5rem;
    padding: 0.5rem;
}
`);

export class HelloWorld extends HTMLElement
{
    static get properties()
    {
        return {
            name: { type: String, value: 'George' },
            disabled: Boolean,
        };
    }

    static get events()
    {
        return ['namechanged'];
    }

    constructor()
    {
        super();

        this.attachShadow({ mode: 'open' });
        Cuttle.appendTemplate(this, TEMPLATE);
        Cuttle.appendStyle(this, STYLE);

        this.myOutput = Cuttle.find(this, 'output');
        this.myButton = Cuttle.find(this, 'button');
        this.myLabel = Cuttle.find(this, '#name');

        this.handleClick = this.handleClick.bind(this);

        Cuttle.bindAttributeChanged(this, 'name', value => this.myLabel.textContent = value);
        Cuttle.bindAttributeChanged(this, 'disabled', this.handleDisabled);

        this.dispatchEvent(new CustomEvent('namechanged'));
    }

    /** @override */
    connectedCallback()
    {
        // BOOM
        console.log('Hello! I am connected!');
        this.myButton.addEventListener('click', this.handleClick);
    }

    /** @override */
    disconnectedCallback()
    {
        this.myButton.removeEventListener('click', this.handleClick);
    }

    /** @override */
    attributeChangedCallback(name, prev, next)
    {
        console.log(name, prev, next);
    }

    handleDisabled(value)
    {
        this.myButton.toggleAttribute('disabled', value);
        if (value) this.myOutput.textContent = 'Zzz';
    }

    handleClick(e) { this.myOutput.textContent = `Hello World, ${this.name}!`; }
}

Cuttle.defineComponent(HelloWorld, 'hello-world');
