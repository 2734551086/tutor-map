<script setup>
import { ref, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import AMapLoader from '@amap/amap-jsapi-loader'

const props = defineProps({
  items: { type: Array, default: () => [] },
  selectedId: { type: [Number, String, null], default: null },
  center: { type: Object, default: null },
  zoom: { type: Number, default: 11 },
  pickMode: { type: Boolean, default: false },
  pickCenter: { type: Object, default: null },
})

const emit = defineEmits([
  'map-ready',
  'marker-click',
  'bounds-change',
  'location-pick',
])

const AMAP_KEY = import.meta.env.VITE_AMAP_KEY
const AMAP_SECURITY = import.meta.env.VITE_AMAP_SECURITY_CODE
const mapContainer = ref(null)
let map = null
let markers = []
let cluster = null
let pickedMarker = null
let loaded = false

async function loadMap() {
  if (!AMAP_KEY) {
    console.error('缺少高德地图 Key，请在 .env 中设置 VITE_AMAP_KEY')
    return
  }
  try {
    await AMapLoader.load({
      key: AMAP_KEY,
      version: '2.0',
      ...(AMAP_SECURITY ? { securityJsCode: AMAP_SECURITY } : {}),
      plugins: ['AMap.Scale', 'AMap.ToolBar', 'AMap.MarkerClusterer'],
    })
    const { AMap } = window
    const center = props.pickMode && props.pickCenter
      ? [props.pickCenter.lng, props.pickCenter.lat]
      : props.center ? [props.center.lng, props.center.lat] : [114.3054, 30.5928]
    const initZoom = props.pickMode ? 14 : props.zoom

    map = new AMap.Map(mapContainer.value, {
      zoom: initZoom,
      center,
      viewMode: '2D',
      mapStyle: 'amap://styles/whitesmoke',
    })

    map.addControl(new AMap.Scale())
    if (!props.pickMode) {
      map.addControl(new AMap.ToolBar({ position: { right: 12, top: 80 } }))
    }

    loaded = true
    emit('map-ready', map)
    emit('bounds-change', getBounds())

    if (props.pickMode) {
      map.on('click', onMapClick)
    } else {
      map.on('moveend', onMoveEnd)
    }

    renderMarkers()
  } catch (err) {
    console.error('地图初始化失败:', err)
  }
}

function getBounds() {
  if (!map) return null
  const b = map.getBounds()
  if (!b) return null
  const sw = b.getSouthWest()
  const ne = b.getNorthEast()
  return `${sw.getLat()},${sw.getLng()},${ne.getLat()},${ne.getLng()}`
}

function onMoveEnd() {
  emit('bounds-change', getBounds())
}

function renderMarkers() {
  if (!map || props.pickMode) return
  clearMarkers()
  if (!props.items.length) return

  const { AMap } = window
  markers = props.items.map(item => {
    const color = item.id === props.selectedId ? '#059669' : '#10b981'
    const marker = new AMap.Marker({
      position: [item.lng, item.lat],
      content: `
        <div style="
          width: 30px; height: 30px; border-radius: 50% 50% 50% 0;
          background: ${color}; border: 2px solid #fff;
          transform: rotate(-45deg);
          box-shadow: 0 3px 10px rgba(5,150,105,.35);
          display:flex; align-items:center; justify-content:center;
          cursor:pointer;">
          <span style="transform: rotate(45deg); color:#fff; font-size:12px; font-weight:700;">¥</span>
        </div>`,
      anchor: 'bottom-center',
      offset: new AMap.Pixel(0, -1),
    })
    marker.on('click', () => emit('marker-click', item.id))
    return marker
  })

  if (AMap.MarkerClusterer) {
    cluster = new AMap.MarkerClusterer(map, markers, { gridSize: 60 })
  } else {
    map.add(markers)
  }
}

function clearMarkers() {
  if (cluster) { cluster.setMarkers([]); cluster = null }
  if (markers.length) map?.remove(markers)
  markers = []
}

function focusTo(lat, lng, zoom) {
  if (!map) return
  map.setZoomAndCenter(zoom ?? map.getZoom(), [lng, lat])
}

function onMapClick(e) {
  if (!props.pickMode) return
  const { lng, lat } = e.lnglat
  if (pickedMarker) {
    pickedMarker.setPosition([lng, lat])
  } else {
    const { AMap } = window
    pickedMarker = new AMap.Marker({
      position: [lng, lat],
      icon: new AMap.Icon({
        size: new AMap.Size(28, 42),
        image: 'https://webapi.amap.com/theme/v1.3/markers/n/mark_r.png',
        imageSize: new AMap.Size(28, 42),
      }),
      anchor: 'bottom-center',
    })
    map.add(pickedMarker)
  }
  emit('location-pick', { lat, lng })
}

function setPickedMarker(lat, lng) {
  if (!map || !props.pickMode) return
  const { AMap } = window
  if (pickedMarker) pickedMarker.setPosition([lng, lat])
  else {
    pickedMarker = new AMap.Marker({
      position: [lng, lat],
      icon: new AMap.Icon({
        size: new AMap.Size(28, 42),
        image: 'https://webapi.amap.com/theme/v1.3/markers/n/mark_r.png',
        imageSize: new AMap.Size(28, 42),
      }),
      anchor: 'bottom-center',
    })
    map.add(pickedMarker)
  }
  map.setCenter([lng, lat])
}

watch(() => props.items, () => {
  if (loaded && !props.pickMode) {
    renderMarkers()
  }
})

watch(() => props.selectedId, id => {
  if (loaded && !props.pickMode) renderMarkers()
})

watch(() => props.center, c => {
  if (loaded && c && !props.pickMode) {
    map.setCenter([c.lng, c.lat])
  }
})

onMounted(async () => {
  await nextTick()
  await loadMap()
})

onBeforeUnmount(() => {
  clearMarkers()
  if (map) {
    map.destroy()
    map = null
  }
})

defineExpose({ focusTo, setPickedMarker, getMap: () => map })
</script>

<template>
  <div ref="mapContainer" class="map-container"></div>
</template>

<style scoped>
.map-container {
  width: 100%;
  height: 100%;
  min-height: 300px;
}
</style>