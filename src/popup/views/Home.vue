<template>
  <div class="flex flex-col gap-2 divide-x-0 divide-y divide-solid divide-gray-400">
    <div>选择表格，导出为XLSX文件</div>
    <div v-if="tables.length">
      <div class="p-2 flex flex-col gap-2">
        <div class="hidden">
          <button @click="queryTables">获得当前页面的表格</button>
        </div>
        <div>页面中的表格：</div>
        <div class="tables flex flex-col gap-2">
          <div v-for="t in tables" @click="selectTable(t)">{{ t.selector }}</div>
        </div>
        <div>选中的表格（单击选择）：{{ selectedTable }}</div>
      </div>
      <div class="p-2">
        <div>
          <label>合并导出表格中的多页数据：<input type="checkbox" v-model="mergeMultiPageData" /></label>
        </div>
      </div>
      <div class="p-2 flex flex-col gap-2" v-if="mergeMultiPageData">
        <div>设置表格操作元素</div>
        <div>
          <button @click="onOpenSelectorPicker">
            从页面选取操作表格元素的selector
          </button>
        </div>
        <div>
          <div v-for="s in selectors">{{ s.selector }}</div>
        </div>
        <div class="flex flex-col gap-2">
          <div>
            <label>下一页：<input v-model="nextSelector" /></label>
          </div>
          <div>
            <label>上一页：<input v-model="prevSelector" /></label>
          </div>
          <div>
            <div>
              <label>指定页前缀：<input v-model="pageSelectorPrefix" /></label>
            </div>
            <div>
              <label>指定页后缀：<input v-model="pageSelectorPostfix" /></label>
            </div>
          </div>
          <div>
            <div>
              <button @click="nextPage">下一页</button>
              <button @click="prevPage">上一页</button>
            </div>
            <div>
              <label>编号：<input type="number" v-model="pageNumber" /></label><button @click="gotoPage">指定页</button>
            </div>
          </div>
        </div>
        <div>
          <div>
            <label>追加时保留首行：<input type="checkbox" v-model="perserveFirstRow" /></label>
          </div>
          <div>
            <button @click="extractTable">获得表格数据</button>
            <button @click="clearData" :disabled="cachedTableData.length === 0">清空数据</button>
          </div>
          <div id="preview" v-html="exportDataPreview"></div>
        </div>
      </div>
      <div class="p-2 flex flex-col gap-2">
        <div>
          <label>文件名：<input v-model="filename" /></label>
        </div>
        <div>
          <button @click="exportData" :disabled="!canExport">{{ exportButtonLabel }}</button>
        </div>
      </div>
    </div>
    <div v-else class="p-2">
      当前页面中没有【表格】。
    </div>
  </div>
</template>
<style lang="scss">
.tables>div:nth-child(1) {
  outline: 2px dotted red;
  background-color: rgba(255, 0, 0, 0.2);
}

.tables>div:nth-child(2) {
  outline: 2px dotted green;
  background-color: rgba(0, 255, 0, 0.2);
}

.tables>div:nth-child(3) {
  outline: 2px dotted blue;
  background-color: rgba(0, 0, 255, 0.2);
}

.tables>div:nth-child(4) {
  outline: 2px dotted brown;
  background-color: rgba(150, 75, 0, 0.2);
}

.tables>div:nth-child(5) {
  outline: 2px dotted orange;
  background-color: rgba(255, 104, 31, 0.2);
}

#preview {
  overflow: auto;
  width: 100%;
  max-height: 100px;

  table {
    border-collapse: collapse;
    border: 1px solid gray;

    td {
      border: 1px solid lightgray;
    }
  }
}
</style>
<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { build, BrowserApi } from '@/popup/browser'
import * as XLSX from 'xlsx'
import { storeToRefs } from 'pinia'
import useStore from '../store'
import type { TableProfile, QueryTablesResult } from '@/types'

const tables = ref<TableProfile[]>([])
const selectedTable = ref('')
const mergeMultiPageData = ref(false)
const nextSelector = ref('')
const prevSelector = ref('')
const pageSelectorPrefix = ref('')
const pageSelectorPostfix = ref('')
const pageNumber = ref('')
const perserveFirstRow = ref(false)
const filename = ref('')

const store = useStore()

const { selectors } = storeToRefs(store)

const cachedTableData = ref([] as string[][])

// 导出数据的表格形式字符串 
const exportDataPreview = ref<string>('')

let bapi: BrowserApi | null

function xlsxFilename(title: string) {
  let now = new Date().toISOString().substr(0, 10)
  return title + `${now}` + '.xlsx'
}

const exportButtonLabel = computed(() => {
  let label = '导出数据'
  if (cachedTableData.value.length) {
    label += `(${cachedTableData.value.length})`
  }
  return label
})

onMounted(async () => {
  bapi = await build()
  if (bapi) {
    /**
 * 获得页面的表格
 */
    await queryTables()
    /**
     * 获得保存的用户数据
     */
    let beforeData = await bapi.retriveUserData()
    if (beforeData) {
      if (beforeData.mergeMultiPageData) mergeMultiPageData.value = true
      if (beforeData.nextSelector) nextSelector.value = beforeData.nextSelector
      if (beforeData.prevSelector) prevSelector.value = beforeData.prevSelector
      if (beforeData.pageSelectorPrefix)
        pageSelectorPrefix.value = beforeData.pageSelectorPrefix
      if (beforeData.pageSelectorPostfix)
        pageSelectorPostfix.value = beforeData.pageSelectorPostfix
      if (beforeData.perserveFirstRow)
        perserveFirstRow.value = beforeData.perserveFirstRow
      if (beforeData.selectedTable) {
        if (tables.value.length && tables.value.find((tp) => tp.selector === beforeData.selectedTable)) {
          selectedTable.value = beforeData.selectedTable
        }
      }
    }
    /**
     * 如果只有1个表格，自动选中
     */
    if (tables.value.length == 1) {
      selectTable(tables.value[0])
    }
    /**
     * 用页面标题作为默认的文件名称
     */
    filename.value = xlsxFilename(bapi.title)
    /**
     * 保存用户数据
     * 因为无法获取popup关闭事件，所以定时更新
     */
    setInterval(async () => {
      let userData = {
        selectedTable: selectedTable.value,
        mergeMultiPageData: mergeMultiPageData.value,
        nextSelector: nextSelector.value,
        prevSelector: prevSelector.value,
        pageSelectorPrefix: pageSelectorPrefix.value,
        pageSelectorPostfix: pageSelectorPostfix.value,
        perserveFirstRow: perserveFirstRow.value
      }
      await bapi?.storeUserData(userData)
    }, 1000)
  }
})
/**
 * 打开CSS Selector选择页面
 */
async function onOpenSelectorPicker() {
  if (bapi) {
    bapi.pickSelector()
    window.close()
  }
}

async function queryTables() {
  if (bapi) {
    tables.value.splice(0, tables.value.length)
    let result: QueryTablesResult | null = await bapi.queryTables()
    result?.tables.forEach((t) => tables.value.push(t))
  }
}

async function selectTable(tp: TableProfile) {
  selectedTable.value = tp.selector
}

async function nextPage() {
  if (!nextSelector.value) return
  await bapi?.clickElement(nextSelector.value)
}

async function prevPage() {
  if (!prevSelector.value) return
  await bapi?.clickElement(prevSelector.value)
}

async function gotoPage() {
  if (!pageSelectorPrefix.value) return
  let page = parseInt(pageNumber.value)
  if (!page) return
  let selector = `${pageSelectorPrefix.value}${page}${pageSelectorPostfix.value}`
  await bapi?.clickElement(selector)
}
/**
 * 提取表格中的数据
 */
async function extractTable() {
  if (bapi && selectedTable.value) {
    let data: string[][] | null = await bapi.extractTable(selectedTable.value)
    if (data) {
      if (mergeMultiPageData.value) {
        if (cachedTableData.value.length && perserveFirstRow.value !== true)
          data.splice(0, 1) // 去掉标题行
        cachedTableData.value = cachedTableData.value.concat(data)
      } else {
        cachedTableData.value = data
      }
      if (cachedTableData) {
        let ws = XLSX.utils.aoa_to_sheet(cachedTableData.value)
        exportDataPreview.value = XLSX.utils.sheet_to_html(ws)
      }
    } else {
      exportDataPreview.value = ''
    }
  }
}
/**
 * 清除选择的表格数据
 */
function clearData() {
  cachedTableData.value = []
  exportDataPreview.value = ''
}
/**
 * 是否可以执行导出操作
 */
const canExport = computed(() => {
  return selectedTable.value && filename.value
})
/**
 * 数据导出到文件
 */
async function exportData() {
  if (bapi && selectedTable.value) {
    if (cachedTableData.value.length === 0) {
      await extractTable()
    }
    await bapi.exportData(cachedTableData.value, filename.value)
  }
}
</script>
