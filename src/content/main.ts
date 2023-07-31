import { createApp } from 'vue'
import App from './App.vue'
/**
 * 在给定的元素中创建vue应用
 *
 * @param rootElement
 */
export default function (rootElement: HTMLElement) {
  const appRoot = document.createElement('div')
  appRoot.setAttribute('id', 'app')

  if (rootElement.shadowRoot) {
    rootElement.shadowRoot.appendChild(appRoot)
  }

  createApp(App).provide('rootElement', rootElement).mount(appRoot)
}
