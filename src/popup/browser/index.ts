import * as XLSX from 'xlsx'
import useStore from '../store'
import type { QueryTablesResult } from '@/types'

function s2ab(s: string) {
  let buf = new ArrayBuffer(s.length)
  let view = new Uint8Array(buf)
  for (let i = 0; i < s.length; i++) view[i] = s.charCodeAt(i) & 0xff
  return buf
}

/**
 * 包装的浏览器的api
 */
class BrowserApi {
  /**
   * 当前标签页的id
   */
  tabId: number
  /**
   *
   */
  url: string | undefined
  /**
   * tab页的标题
   */
  title = ''

  constructor(tabId: number, url: string | undefined, title: string) {
    this.tabId = tabId
    this.url = url
    this.title = title
  }
  /**
   * 查询标签页中的所有table
   */
  async queryTables(): Promise<QueryTablesResult | null> {
    // 给页面脚本发送一次性消息，并等待响应
    let rsp = await chrome.tabs.sendMessage(this.tabId, {
      type: 'query',
      from: 'popup',
    })
    if (Array.isArray(rsp)) return { tables: rsp }

    return null
  }
  /**
   * 点击指定的元素
   * @param selector
   */
  async clickElement(selector: string) {
    await chrome.scripting.executeScript({
      target: { tabId: this.tabId },
      args: [selector],
      func: (selector) => {
        let el: HTMLElement | null = document.querySelector(selector)
        if (el) el.click()
      },
    })
  }
  /**
   * 从表格中提取数据
   * @param selector
   * @returns 包含表格数据的二维数组
   */
  async extractTable(selector: string) {
    let rsp = await chrome.scripting.executeScript({
      target: { tabId: this.tabId },
      args: [selector],
      func: (selector) => {
        let table: HTMLTableElement | null = document.querySelector(selector)
        if (table) {
          let { rows } = table
          let data: string[][] = []
          for (let i = 0; i < rows.length; i++) {
            let row = rows[i]
            data.push([])
            for (let cell of row.cells) {
              data[i].push(cell.innerText)
            }
          }
          return data
        }
        return null
      },
    })
    if (Array.isArray(rsp) && rsp.length === 1) {
      return rsp[0].result
    }
    return null
  }
  /**
   * 表格的数据导出到excel文件
   * @param selectors
   * @returns
   */
  async exportTable(selectors: string[]): Promise<boolean> {
    if (!Array.isArray(selectors) || selectors.length === 0) return false

    let filename = 'data.xlsx'
    let workbook = XLSX.utils.book_new()

    for (let i = 0; i < selectors.length; i++) {
      let selector = selectors[i]
      let data: string[][] | null = await this.extractTable(selector)
      if (data) {
        let ws = XLSX.utils.aoa_to_sheet(data)
        XLSX.utils.book_append_sheet(workbook, ws, `Sheet${i + 1}`)
      }
    }

    let excelData = XLSX.write(workbook, { bookType: 'xlsx', type: 'binary' })

    let blob = new Blob([s2ab(excelData)], { type: 'application/octet-stream' })

    await chrome.downloads.download({
      url: URL.createObjectURL(blob),
      filename,
      saveAs: true,
    })

    return true
  }
  /**
   * 数据导出到excel文件
   *
   * @param data
   * @param filename
   * @returns
   */
  async exportData(data: string[][], filename = 'data.xlsx'): Promise<boolean> {
    if (!Array.isArray(data) || data.length === 0) return false

    let workbook = XLSX.utils.book_new()

    let ws = XLSX.utils.aoa_to_sheet(data)
    XLSX.utils.book_append_sheet(workbook, ws, `Sheet1`)

    let excelData = XLSX.write(workbook, { bookType: 'xlsx', type: 'binary' })

    let blob = new Blob([s2ab(excelData)], { type: 'application/octet-stream' })

    await chrome.downloads.download({
      url: URL.createObjectURL(blob),
      filename,
      saveAs: true,
    })

    return true
  }
  /**
   * 保存页面相关的数据
   * @param data
   */
  async storeUserData(data: any) {
    if (typeof this.url === 'string') {
      await chrome.storage.local.set({ [this.url]: data })
    }
  }
  /**
   * 获取页面相关的数据
   * @returns
   */
  async retriveUserData() {
    if (typeof this.url === 'string') {
      let data = await chrome.storage.local.get([this.url])
      if (data?.[this.url]) {
        return data[this.url]
      }
    }
    return null
  }

  async pickSelector() {
    chrome.tabs.sendMessage(this.tabId, {
      type: 'pickSelector',
      from: 'popup',
    })
  }
}
/**
 * 提供操作当前tab页的方法
 * @returns 代理当前tab页的代理对象
 */
async function build(): Promise<BrowserApi | null> {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true })

  if (tabs?.[0].id) {
    let { id, url } = tabs?.[0]
    /**
     * 探测tab页是否已经安装过脚本，没有就安装
     */
    try {
      await chrome.tabs.sendMessage(id, { type: 'probe', from: 'popup' })
    } catch (e) {
      /**
       * 给目标页安装脚本
       */
      await chrome.scripting.executeScript({
        target: { tabId: id },
        files: ['contentScript.js'],
      })
      /**
       * 给页面中表格设置样式
       */
      const Collors = ['red', 'green', 'blue', 'brown', 'orange']
      const css = Collors.reduce((p, color, i) => {
        return `${p} table.table2xlsx.table2xlsx-${i} { outline: 4px dotted ${color}; }`
      }, '')
      await chrome.scripting.insertCSS({
        target: { tabId: id },
        css,
      })
    }
    /**
     * 获得页面的title
     */
    const [{ result: title }] = await chrome.scripting.executeScript({
      target: { tabId: id },
      func: () => document.title,
    })
    /**
     * 告知background，popup操作的tab页
     */
    const port = chrome.runtime.connect({ name: 'popup' })
    port.onMessage.addListener((message) => {
      console.log('message', message)
      if (message) {
        let store = useStore()
        store.setSelectors(message)
      }
    })
    port.postMessage({ tabId: id })

    return new BrowserApi(id, url, title)
  }

  return null
}

export { build, BrowserApi }
