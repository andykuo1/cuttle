const TEMPLATE = function createTemplateElement(templateString) {
  let element = document.createElement('template');
  element.innerHTML = templateString;
  return element;
}(`
<p>
    Hello world!
</p>
`);

const STYLE = function createStyleElement(styleString) {
  let element = document.createElement('style');
  element.innerHTML = styleString;
  return element;
}(`
p {
    color: blue;
}
`);

export class HelloWorld extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({
      mode: 'open'
    });
    this.shadowRoot.appendChild(TEMPLATE.content.cloneNode(true));
    this.shadowRoot.appendChild(STYLE.cloneNode(true));
  }

  connectedCallback() {
    console.log('Hello! I am connected!');
  }

}
window.customElements.define('hello-world', HelloWorld);