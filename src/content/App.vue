<template>
  <svg class="tms-auto-element-highlighter" style="
      height: 100%;
      width: 100%;
      top: 0;
      left: 0;
      pointer-events: none;
      position: fixed;
      z-index: 999999;
    ">
    <element-highlighter :items="elementsState.hovered" stroke="#fbbf24" fill="rgba(251, 191, 36, 0.1)" />
    <element-highlighter :items="elementsState.selected" stroke="#2563EB" active-stroke="#f87171"
      fill="rgba(37, 99, 235, 0.1)" active-fill="rgba(248, 113, 113, 0.1)" />
  </svg>
  <div style="
      z-index: 99999999;
      position: fixed;
      left: 0;
      top: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(0, 0, 0, 0.3);
      pointer-events: none;
    ">
    <div style="width:200px; overflow-x:auto; background-color: white;">
      <div style="pointer-events: auto">
        <button @click.stop.prevent="close">关闭</button>
        <button :disabled="elementsState.selected.length === 0" @click.stop.prevent="finish">完成</button>
      </div>
      <div>
        <ul>
          <li v-for="(ei, index) in elementsState.selected" @click.stop.prevent="toggleSelected(ei, index)"
            @mousedown.stop.prevent style="pointer-events: auto">{{
              ei.selector
            }}
          </li>
        </ul>
      </div>
    </div>
  </div>
  <teleport to="html">
    <div id="tms-auto-overlay" style="
        z-index: 9999999;
        position: fixed;
        left: 0;
        top: 0;
        width: 100%;
        height: 100%;
      "></div>
  </teleport>
</template>
<script setup lang="ts">
import { onBeforeUnmount, onMounted, reactive } from 'vue'
import ElementHighlighter from './ElementHighlighter.vue'
import { finder } from '@medv/finder'
import { notifyFinish } from './browser'

function toggleSelected(_: ElementInfo, index: number) {
  elementsState.selected.splice(index, 1)
}
/**
 * 完成选择，通知background
 */
function finish() {
  let selectors = elementsState.selected.map((ei) => { return { selector: ei.selector } })
  close()
  notifyFinish(selectors)
}
function close() {
  const rootElementExist: HTMLElement | null = document.querySelector(
    '#app-container.tms-auto-element-selector'
  )

  if (rootElementExist) {
    rootElementExist.style.display = 'none'
  }

  let el: HTMLElement | null = document.querySelector('#tms-auto-overlay')
  if (el) el.style.display = 'none'
}
/**
 * 探查元素信息
 */
type ElementInfo = {
  x: number
  y: number
  width: number
  height: number
  element?: Element
  selector?: string
}

const elementsState = reactive({
  hovered: [] as ElementInfo[],
  selected: [] as ElementInfo[],
})

const mousePosition = {
  x: 0,
  y: 0,
}

function getElementRect(target: any): ElementInfo | null {
  if (!target) return null

  const { x, y, height, width } = target.getBoundingClientRect()
  const result = {
    width: width + 4,
    height: height + 4,
    x: x - 2,
    y: y - 2,
  }

  return result
}

function getElementRectWithOffset(element: any): ElementInfo | null {
  const rect = getElementRect(element)

  return rect
}

function retrieveElementsRect(
  { clientX, clientY }: { clientX: number; clientY: number }
) {
  let targets = document.elementsFromPoint(clientX, clientY)
  if (!targets) return

  let elementsRect = getElementRectWithOffset(targets[1])
  if (elementsRect) {
    elementsRect.element = targets[1]
  }

  return elementsRect
}

let lastScrollPosY = window.scrollY
let lastScrollPosX = window.scrollX

function debounce(callback: any, time = 200) {
  let interval: any

  return (...args: any) => {
    if (interval) clearTimeout(interval)

    return new Promise((resolve) => {
      interval = setTimeout(() => {
        interval = null

        callback(...args)
        resolve(null)
      }, time)
    })
  }
}

const onScroll = debounce(() => {
  elementsState.hovered = []

  const yPos = window.scrollY - lastScrollPosY
  const xPos = window.scrollX - lastScrollPosX

  elementsState.selected.forEach((_, index) => {
    elementsState.selected[index].x -= xPos
    elementsState.selected[index].y -= yPos
  })

  lastScrollPosX = window.scrollX
  lastScrollPosY = window.scrollY
}, 100)

function onMousedown(event: any) {
  const { 1: selectedElement } = document.elementsFromPoint(
    mousePosition.x,
    mousePosition.y
  );
  if (selectedElement.id === 'tms-auto-overlay') return;

  event.preventDefault()
  event.stopPropagation()
  let elementRect = retrieveElementsRect(event)
  if (elementRect?.element) {
    let index = elementsState.selected.findIndex((info) => elementRect?.element === info.element)
    if (index !== -1) {
      elementsState.selected.splice(index, 1)
    } else {
      let selector = finder(elementRect.element)
      elementRect.selector = selector
      elementsState.selected.push(elementRect)
    }
  } else {
    elementsState.selected = []
  }
}

function onMousemove(event: any) {
  mousePosition.x = event.clientX
  mousePosition.y = event.clientY
  let elementRect = retrieveElementsRect(event)
  elementsState.hovered = elementRect ? [elementRect] : []
}

onMounted(() => {
  document.addEventListener('mousemove', onMousemove)
  document.addEventListener('mousedown', onMousedown)
  document.addEventListener('scroll', onScroll)

})
onBeforeUnmount(() => {
  document.removeEventListener('mousemove', onMousemove)
  document.removeEventListener('mousedown', onMousedown)
  document.removeEventListener('scroll', onScroll)
})
</script>
