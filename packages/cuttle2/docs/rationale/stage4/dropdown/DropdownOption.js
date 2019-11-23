import * as wcutil from '../wcutil.js';
const Template = `
<li>
    <button>
        <slot>
        </slot>
    </button>
</li>
`;
const Style = `
li {
    display: flex;
}
button {
    flex: 1;
    width: 100%;
    margin: 0;
    padding: 0;
    border: 1px solid black;
}
`;
const TEMPLATE = wcutil.createTemplate(Template, Style);

class DropdownOption extends HTMLElement
{
    /** @override */
    static get properties()
    {
        return {};
    }

    constructor()
    {
        super();

        wcutil.attachShadow(this, TEMPLATE);

        this.myButton = wcutil.find(this, 'button');

        this.handleClick = this.handleClick.bind(this);
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

    handleClick(e)
    {

    }
}
wcutil.defineComponent(DropdownOption, 'dropdown-option');

export default DropdownOption;
