const TEMPLATE = document.createElement('template');
const HTML_TEMPLATE_STRING = `
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
`;
TEMPLATE.innerHTML = HTML_TEMPLATE_STRING;

class HelloWorld extends HTMLElement
{
    static get observedAttributes()
    {
        return [
            'name',
            'disabled'
        ];
    }

    constructor()
    {
        super();

        this.attachShadow({ mode: 'open' }).appendChild(TEMPLATE.content.cloneNode(true));
        this.output = this.shadowRoot.querySelector('output');
        this.button = this.shadowRoot.querySelector('button');
        this.label = this.shadowRoot.querySelector('#name');

        this._name = '';
        this._disabled = false;

        this.handleClick = this.handleClick.bind(this);
    }

    /** @override */
    connectedCallback()
    {
        this.defaultAttribute('name', 'George');

        this.upgradeProperty('name');
        this.upgradeProperty('disabled');

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
                this._disabled = newValue === null ? false : true;
                if (this._disabled)
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
                this._name = newValue;
                this.label.textContent = this._name;
                break;
        }
    }

    defaultAttribute(attribute, value)
    {
        if (!this.hasAttribute(attribute))
        {
            this.setAttribute(attribute, value);
        }
    }

    upgradeProperty(property)
    {
        if (this.hasOwnProperty(property))
        {
            let value = this[property];
            delete this[property];
            this[property] = value;
        }
    }

    handleClick()
    {
        this.output.textContent = `Hello World, ${this.name}!`;
    }

    get disabled() { return this._disabled; }
    set disabled(value) { if (value) this.setAttribute('disabled', ''); else this.removeAttribute('disabled'); }

    get name() { return this._name; }
    set name(value) { this.setAttribute('name', value); }
}
window.customElements.define('hello-world', HelloWorld);

export default HelloWorld;
