import { finder } from '@medv/finder'
import initElementSelector from './main'

function elementSelectorInstance() {
  const rootElementExist: HTMLElement | null = document.querySelector(
    '#app-container.tms-auto-element-selector'
  )

  if (rootElementExist) {
    rootElementExist.style.display = 'block'

    let el: HTMLElement | null = document.querySelector('#tms-auto-overlay')
    if (el) el.style.display = 'block'

    return true
  }

  return false
}
/**
 * 操作当前页面
 */
;(() => {
  /**
   * 查找并标记所有的table对象
   * @returns
   */
  function queryAndMarkTables() {
    let tables = document.querySelectorAll('table')
    if (tables.length) {
      let profiles = []
      for (let i = 0; i < tables.length; i++) {
        let table = tables[i]
        table.classList.add(`table2xlsx`, `table2xlsx-${i}`)
        let selector = finder(table)
        profiles.push({ selector })
      }
      return profiles
    }

    return null
  }
  /**
   * 执行清理工作
   * 去掉给表格元素添加的class
   */
  function clear() {
    let tables = document.querySelectorAll('table')
    for (let i = 0; i < tables.length; i++) {
      let table = tables[i]
      table.classList.remove(`table2xlsx`, `table2xlsx-${i}`)
    }
  }
  /**
   * 接收消息
   */
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    console.log('runtime.onMessage', message)
    if (message.type) {
      switch (message.type) {
        case 'probe':
          sendResponse('ready')
          break
        case 'query':
          let tables = queryAndMarkTables()
          sendResponse(tables)
          break
        case 'popupClosed':
          clear()
          console.log('table2xlsx', 'popupClosed')
          break
        case 'pickSelector':
          {
            try {
              const isAppExists = elementSelectorInstance()
              if (isAppExists) return
              /**
               * 创建应用
               */
              const rootElement = document.createElement('div')
              rootElement.setAttribute('id', 'app-container')
              rootElement.classList.add('tms-auto-element-selector')
              rootElement.attachShadow({ mode: 'open' })

              initElementSelector(rootElement)

              document.documentElement.appendChild(rootElement)
            } catch (error) {
              console.error(error)
            }
          }
          break
      }
    }

    return false
  })
  console.log('table2xlsx完成代码注入')
})()
