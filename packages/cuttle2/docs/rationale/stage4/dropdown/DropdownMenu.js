import * as wcutil from '../wcutil.js';
const Template = `
<span class="parentContainer">
    <button class="menuTitle">
        <slot name="title"></slot>
    </button>
    <ul class="menuContainer hidden">
        <slot id="menu">
        </slot>
    </ul>
</span>
`;
const Style = `
.parentContainer {
    position: relative;
}
.menuContainer {
    left: 0;
    position: absolute;

    list-style: none;
    margin: 0;
    padding: 0;
    background-color: white;
    border: 1px solid black;
}
.menuTitle {
    border: 1px solid black;
}
.hidden {
    display: none;
}
`;
const TEMPLATE = wcutil.createTemplate(Template, Style);

class DropdownMenu extends HTMLElement
{
    /** @override */
    static get properties()
    {
        return {
            open: Boolean
        };
    }

    constructor()
    {
        super();

        wcutil.attachShadow(this, TEMPLATE);

        this.myMenu = wcutil.find(this, 'ul');
        this.myButton = wcutil.find(this, 'button');

        this.handleClick = this.handleClick.bind(this);
        this.handleOutsideClick = this.handleOutsideClick.bind(this);

        wcutil.bindAttributeChanged(this, 'open', this.handleOpen);
    }

    /** @override */
    connectedCallback()
    {
        this.myButton.addEventListener('click', this.handleClick);
        document.addEventListener('mousedown', this.handleOutsideClick);
    }

    /** @override */
    disconnectedCallback()
    {
        this.myButton.removeEventListener('click', this.handleClick);
        document.removeEventListener('mousedown', this.handleOutsideClick);
    }

    handleClick(e)
    {
        this.open = !this.open;
    }

    handleOpen(value)
    {
        this.myMenu.classList.toggle('hidden', !value);
    }

    handleOutsideClick(e)
    {
        if (!this.contains(e.target))
        {
            this.open = false;
        }
    }
}
wcutil.defineComponent(DropdownMenu, 'dropdown-menu');

export default DropdownMenu;
