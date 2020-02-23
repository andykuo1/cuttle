import * as wcutil from './wcutil.js';

const TEMPLATE = wcutil.createTemplate(`
<style>
    div {
        border: 1px solid black;
        margin: 0.5rem;
        padding: 0.5rem;
    }
</style>
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

class HelloWorld extends HTMLElement
{
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

        wcutil.createShadow(this, TEMPLATE);

        this.output = this.shadowRoot.querySelector('output');
        this.button = this.shadowRoot.querySelector('button');
        this.label = this.shadowRoot.querySelector('#name');

        this.handleClick = this.handleClick.bind(this);
    }

    /** @override */
    connectedCallback()
    {
        this.button.addEventListener('click', this.handleClick);
    }

    /** @override */
    disconnectedCallback()
    {
        this.button.removeEventListener('click', this.handleClick);
    }

    /** @override */
    attributeChangedCallback(attribute, oldValue, newValue)
    {
        switch(attribute)
        {
            case 'disabled':
                if (newValue)
                {
                    this.button.setAttribute('disabled', '');
                    this.output.textContent = 'Zzz';
                }
                else
                {
                    this.button.removeAttribute('disabled');
                }
                break;
            case 'name':
                this.label.textContent = newValue;
                break;
        }
    }

    handleClick()
    {
        this.output.textContent = `Hello World, ${this.name}!`;
    }
}
wcutil.defineComponent(HelloWorld, 'hello-world');

export default HelloWorld;
