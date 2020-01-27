/** Helpful create functions. */
import { getRootElement } from './find.js';

/**
 * Creates a `<template>` tag with the passed-in content.
 * @param {String} templateString The template content.
 */
export function createTemplateElement(templateString)
{
    let element = document.createElement('template');
    element.innerHTML = templateString;
    return element;
}

/**
 * Creates a `<style>` tag with the passed-in content.
 * @param {String} styleString The style content.
 * @returns {Element} The style element that has the passed-in content.
 */
export function createStyleElement(styleString)
{
    let element = document.createElement('style');
    element.innerHTML = styleString;
    return element;
}

/**
 * Appends a cloned instance of the passed-in template element.
 * @param {HTMLElement} componentInstance The component instance to attach to.
 * @param {HTMLTemplateElement} templateElement The <template> element to append to the component root.
 */
export function appendTemplate(componentInstance, templateElement)
{
    let root = getRootElement(componentInstance);
    let content = templateElement.content.cloneNode(true);
    root.appendChild(content);
    return content;
}

/**
 * Appends a cloned instance of the passed-in style element.
 * @param {HTMLElement} componentInstance The component instance to attach to.
 * @param {HTMLStyleElement} styleElement The <style> element to append to the component root.
 */
export function appendStyle(componentInstance, styleElement)
{
    let root = getRootElement(componentInstance);
    let content = styleElement.cloneNode(true);
    root.appendChild(content);
    return content;
}

/**
 * Attaches a shadow root.
 * @param {HTMLElement} componentInstance The component instance to attach a shadow root.
 * @param {Element} templateElement The template element to create and attach an instance.
 * @param {Element} styleElement The style element to attach to the component.
 */
export function attachShadow(componentInstance, templateElement = undefined, styleElement = undefined)
{
    let shadowRoot = componentInstance.attachShadow({ mode: 'open' });
    if (styleElement) shadowRoot.appendChild(styleElement.cloneNode(true));
    if (templateElement) shadowRoot.appendChild(templateElement.content.cloneNode(true));
    return shadowRoot;
}
