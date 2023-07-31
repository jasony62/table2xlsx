/**
 * 上线文菜单的OnClickData没有提供点击的元素信息
 */
;(async () => {
  let ports: { [tabId: number]: chrome.runtime.Port } = {}
  /**
   * 激活tab的连接端口
   */
  let currentTabId = 0
  /**
   * popup到background的连接端口
   */
  //@ts-ignore
  let popupPort: chrome.runtime.Port | undefined

  function onDisconnect(p: chrome.runtime.Port) {
    console.log('port.onDisconnect', p.name, chrome.runtime.lastError)
    switch (p.name) {
      case 'popup':
        popupPort = undefined
        if (currentTabId) {
          chrome.tabs.sendMessage(currentTabId, {
            type: 'popupClosed',
            from: 'background',
          })
          currentTabId = 0
        }
        break
    }
  }

  function onConnect(p: chrome.runtime.Port) {
    console.log('runtime.onConnect', p.name)
    switch (p.name) {
      case 'popup':
        popupPort = p
        p.onMessage.addListener((message: any) => {
          console.log('port.onMessage', message)
          if (message?.tabId) {
            currentTabId = message.tabId
          }
          if (pendingMessage) {
            p.postMessage(pendingMessage)
            pendingMessage = null
          }
        })
        p.onDisconnect.addListener(onDisconnect)
        break
      default:
        if (p?.sender?.tab?.id) ports[p.sender.tab.id] = p
        p.onMessage.addListener(() => {})
        p.onDisconnect.addListener(onDisconnect)
    }
  }
  /**
   * 等待建立连接
   */
  chrome.runtime.onConnect.addListener(onConnect)
  /**
   * 处理一次性消息
   */
  let pendingMessage: any

  function messageFromContent(message: any) {
    pendingMessage = message.data
    chrome.action.openPopup()
    return false
  }
  /**
   * 监听content页发送的消息
   */
  chrome.runtime.onMessage.addListener((message, _, sendResponse) => {
    switch (message.from) {
      case 'content':
        let rsp = messageFromContent(message)
        if (rsp) sendResponse(rsp)
        break
    }
  })
})()
