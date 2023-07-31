export function notifyFinish(selectors: any[]) {
  chrome.runtime.sendMessage({
    type: 'finish',
    from: 'content',
    data: selectors,
  })
}
