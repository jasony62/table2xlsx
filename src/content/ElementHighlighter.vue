<template>
  <rect v-for="(item, index) in items" v-bind="{
    x: getNumber(item?.x),
    y: getNumber(item?.y),
    fill: getFillColor(item),
    stroke: getStrokeColor(item),
    width: getNumber(item?.width),
    height: getNumber(item?.height),
    'stroke-dasharray': item?.outline ? '5,5' : '',
  }" :key="index" stroke-width="2"></rect>
</template>
<script setup lang="ts">

const props = defineProps({
  items: {
    type: Object,
    default: () => ({}),
  },
  stroke: {
    type: String,
    default: null,
  },
  activeStroke: {
    type: String,
    default: null,
  },
  fill: {
    type: String,
    default: null,
  },
  activeFill: {
    type: String,
    default: null,
  },
});

function getNumber(num: number) {
  if (Number.isNaN(num) || !num) return 0;

  return num;
}
function getFillColor(item: any) {
  if (!item) return '';
  if (item.outline) return '';

  return item.highlight ? props.fill : props.activeFill || props.fill;
}
function getStrokeColor(item: any) {
  if (!item) return '';

  return item.highlight ? props.stroke : props.activeStroke || props.stroke;
}
</script>
