const TEMPLATE = function createTemplateElement(templateString) {
  let element = document.createElement('template');
  element.innerHTML = templateString;
  return element;
}(`
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

const STYLE = function createStyleElement(styleString) {
  let element = document.createElement('style');
  element.innerHTML = styleString;
  return element;
}(`
div {
    border: 1px solid black;
    margin: 0.5rem;
    padding: 0.5rem;
}
`);

export class HelloWorld extends HTMLElement {
  static get observedAttributes() {
    return ["name", "disabled", "onnamechanged"];
  }

  set disabled(value) {
    this.toggleAttribute('disabled', value);
  }

  get disabled() {
    return this._disabled;
  }

  set name(value) {
    this.setAttribute('name', value);
  }

  get name() {
    return this._name;
  }

  set onnamechanged(value) {
    if (this._onnamechanged) this.removeEventListener('namechanged', this._onnamechanged);
    this._onnamechanged = value;
    if (this._onnamechanged) this.addEventListener('namechanged', value);
  }

  get onnamechanged() {
    return this._onnamechanged;
  }

  constructor() {
    super();
    this.attachShadow({
      mode: 'open'
    });
    this.shadowRoot.appendChild(TEMPLATE.content.cloneNode(true));
    this.shadowRoot.appendChild(STYLE.cloneNode(true));
    this.myOutput = (this.shadowRoot || this).querySelector('output');
    this.myButton = (this.shadowRoot || this).querySelector('button');
    this.myLabel = (this.shadowRoot || this).querySelector('#name');
    this.handleClick = this.handleClick.bind(this);
    this.dispatchEvent(new CustomEvent('namechanged'));
  }
  /** @override */


  connectedCallback() {
    if (!this.hasAttribute("name")) {
      this.setAttribute("name", 'George');
    }

    if (this.hasOwnProperty("name")) {
      let value = this.name;
      delete this.name;
      this.name = value;
    }

    if (this.hasOwnProperty("disabled")) {
      let value = this.disabled;
      delete this.disabled;
      this.disabled = value;
    }

    {
      // BOOM
      console.log('Hello! I am connected!');
      this.myButton.addEventListener('click', this.handleClick);
    }
  }

  /** @override */
  disconnectedCallback() {
    this.myButton.removeEventListener('click', this.handleClick);
  }
  /** @override */


  attributeChangedCallback(attribute, prev, value) {
    switch (attribute) {
      case "name":
        {
          let ownedPrev = this._name;
          let ownedValue = this._name = value;
          (value => this.myLabel.textContent = value).call(this, ownedValue, ownedPrev, attribute);
        }
        break;

      case "disabled":
        {
          let ownedPrev = this._disabled;
          let ownedValue = this._disabled = value !== null;
          this.handleDisabled.call(this, ownedValue, ownedPrev, attribute);
        }
        break;

      case "onnamechanged":
        {
          this.onnamechanged = new Function('event', 'with(document){with(this){' + value + '}}').bind(this);
        }
        break;
    }

    ((name, prev, next) => {
      console.log(name, prev, next);
    })(attribute, prev, value);
  }

  handleDisabled(value) {
    this.myButton.toggleAttribute('disabled', value);
    if (value) this.myOutput.textContent = 'Zzz';
  }

  handleClick(e) {
    this.myOutput.textContent = `Hello World, ${this.name}!`;
  }

}
window.customElements.define('hello-world', HelloWorld);