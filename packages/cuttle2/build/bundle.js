var Template = "<div>\n    <p>\n        <output for=\"hello\">\n            Zzz\n        </output>\n    </p>\n    <button id=\"hello\">\n        Say hello to <label id=\"name\">???</label>\n    </button>\n</div>";

var Style = "div {\n    border: 1px solid black;\n    margin: 0.5rem;\n    padding: 0.5rem;\n}";

const TEMPLATE = function createTemplate(templateString) {
  let element = document.createElement('template');
  element.innerHTML = templateString;
  return element;
}(Template);

const STYLE = function createStyle(styleString) {
  let element = document.createElement('style');
  element.innerHTML = styleString;
  return element;
}(Style);

class HelloWorld extends HTMLElement {
  static get observedAttributes() {
    return ["name", "disabled"];
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

  constructor() {
    super();
    this.attachShadow({
      mode: 'open'
    });
    this.shadowRoot.appendChild(STYLE.cloneNode(true));
    this.shadowRoot.appendChild(TEMPLATE.content.cloneNode(true));
    this.myOutput = (this.shadowRoot || this).querySelector('output');
    this.myButton = (this.shadowRoot || this).querySelector('button');
    this.myLabel = (this.shadowRoot || this).querySelector('#name');
    this.handleClick = this.handleClick.bind(this);

    this.__nameAttributeChangedCallback = value => this.myLabel.textContent = value;

    this.__disabledAttributeChangedCallback = this.handleDisabled;
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

    (() => {
      this.myButton.addEventListener('click', this.handleClick);
    })();
  }

  /** @override */
  disconnectedCallback() {
    this.myButton.removeEventListener('click', this.handleClick);
  }

  handleDisabled(value) {
    this.myButton.toggleAttribute('disabled', value);
    if (value) this.myOutput.textContent = 'Zzz';
  }

  handleClick(e) {
    this.myOutput.textContent = `Hello World, ${this.name}!`;
  }

  attributeChangedCallback(attribute, prev, value) {
    {
      let ownedPrev, ownedValue;

      switch (attribute) {
        case "name":
          if (this.__nameAttributeChangedCallback) {
            ownedPrev = this._name;
            ownedValue = this._name = value;

            this.__nameAttributeChangedCallback.call(this, ownedValue, ownedPrev, attribute);
          }

          break;

        case "disabled":
          if (this.__disabledAttributeChangedCallback) {
            ownedPrev = this._disabled;
            ownedValue = this._disabled = value !== null;

            this.__disabledAttributeChangedCallback.call(this, ownedValue, ownedPrev, attribute);
          }

          break;
      }

      if (this.__any__AttributeChangedCallback) {
        this.__any__AttributeChangedCallback.call(this, ownedValue, ownedPrev, attribute);
      }
    }
  }

}

window.customElements.define('hello-world', HelloWorld);
