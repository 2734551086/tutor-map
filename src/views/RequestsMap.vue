<script setup>
import { ref, reactive, computed, onMounted, watch, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import api from '../api'
import { useAuthStore } from '../stores/auth'
import MapView from '../components/MapView.vue'
import RequestCard from '../components/RequestCard.vue'

const router = useRouter()
const auth = useAuthStore()

const mapRef = ref(null)
const listRef = ref(null)
const selectedId = ref(null)
const searchInput = ref('')
const activeKeyword = ref('')
const searchSuggestions = ref([])
const suggestLoading = ref(false)
const showSuggest = ref(false)
const loading = ref(false)
const loadError = ref('')
const filterMeta = reactive({ subjects: [], grades: [] })
const filterOpen = ref(false)
const filters = reactive({ subject: 'all', grade: 'all' })
const isMobile = window.matchMedia('(max-width: 767px)').matches

const requests = ref([])
const bounds = ref('')

let suggestTimer = null
let boundsTimer = null

async function fetchRequests() {
  loading.value = true
  loadError.value = ''
  try {
    const params = {}
    if (bounds.value) params.bounds = bounds.value
    if (filters.subject !== 'all') params.subject = filters.subject
    if (filters.grade !== 'all') params.grade = filters.grade
    if (activeKeyword.value.trim()) params.keyword = activeKeyword.value.trim()
    requests.value = await api.get('/requests', { params })
  } catch (e) {
    loadError.value = e.message
  } finally {
    loading.value = false
  }
}

async function fetchFilterMeta() {
  const data = await api.get('/requests/meta/filters')
  filterMeta.subjects = data.subjects
  filterMeta.grades = data.grades
}

function onBoundsChange(b) {
  bounds.value = b
  clearTimeout(boundsTimer)
  boundsTimer = setTimeout(fetchRequests, 300)
}

function onMarkerClick(id) {
  selectedId.value = id
  scrollToCard(id)
}

function onSelectRequest(id) {
  selectedId.value = id
  const req = requests.value.find(r => r.id === id)
  if (req) {
    mapRef.value?.focusTo(req.lat, req.lng, 15)
  }
}

function scrollToCard(id) {
  nextTick(() => {
    const el = listRef.value?.querySelector(`[data-id="${id}"]`)
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  })
}

async function onSelectSuggestion(s) {
  showSuggest.value = false
  searchInput.value = s.rawName || s.name
  if (!s.location) {
    // 无坐标时用 Geocoder 解析
    try {
      const data = await api.get('/geo/geocode', { params: { address: s.rawName || s.name } })
      const g = data.geocodes?.[0]
      if (g?.location) {
        s.location = g.location
      }
    } catch {}
  }
  if (s.location) {
    mapRef.value?.focusTo(s.location.lat, s.location.lng, 14)
  }
  // 地名点选=定位查看附近，不应作为关键词过滤
  activeKeyword.value = ''
  await fetchRequests()
}

async function onSearchInput() {
  clearTimeout(suggestTimer)
  const kw = searchInput.value.trim()
  if (kw.length < 2) {
    showSuggest.value = false
    return
  }
  suggestTimer = setTimeout(async () => {
    try {
      suggestLoading.value = true
      const data = await api.get('/geo/inputtips', { params: { keywords: kw, city: '武汉' } })
      searchSuggestions.value = (data.tips || []).slice(0, 6)
      showSuggest.value = searchSuggestions.value.length > 0
    } catch {
      searchSuggestions.value = []
      showSuggest.value = false
    } finally {
      suggestLoading.value = false
    }
  }, 350)
}

function clearSearch() {
  searchInput.value = ''
  activeKeyword.value = ''
  showSuggest.value = false
  fetchRequests()
}

function onSearchSubmit() {
  showSuggest.value = false
  activeKeyword.value = searchInput.value.trim()
  fetchRequests()
}

function resetFilters() {
  filters.subject = 'all'
  filters.grade = 'all'
  fetchRequests()
}

const activeFilterCount = computed(() =>
  (filters.subject !== 'all' ? 1 : 0) + (filters.grade !== 'all' ? 1 : 0)
)

function onContactRequest(req) {
  if (!auth.isLoggedIn) {
    router.push({ path: '/login', query: { redirect: `/messages?user=${req.poster.id}&rid=${req.id}` } })
    return
  }
  router.push({ path: '/messages', query: { user: req.poster.id, rid: req.id } })
}

watch(() => [filters.subject, filters.grade], () => {
  fetchRequests()
})

onMounted(async () => {
  await fetchFilterMeta()
  await fetchRequests()
})
</script>

<template>
  <div class="req-page">
    <div class="map-area">
      <MapView
        ref="mapRef"
        :items="requests"
        :selected-id="selectedId"
        @bounds-change="onBoundsChange"
        @marker-click="onMarkerClick"
      />

      <div class="search-wrap" :class="{ mobile: isMobile }" @mouseleave="showSuggest = false">
        <div class="search-bar">
          <span class="search-icon">🔍</span>
          <input
            v-model="searchInput"
            class="search-input"
            placeholder="搜索小区、地铁站、地址关键词…"
            @input="onSearchInput"
            @keyup.enter="onSearchSubmit"
            @focus="showSuggest = !!searchSuggestions.length"
          />
          <button v-if="searchInput" class="search-clear" @click="clearSearch">✕</button>
          <button class="btn btn-primary search-btn" @click="onSearchSubmit">搜索</button>
          <button
            class="btn filter-btn"
            :class="{ 'filter-active': activeFilterCount > 0 }"
            @click="filterOpen = !filterOpen"
          >
            <span>筛选</span>
            <span v-if="activeFilterCount" class="filter-count">{{ activeFilterCount }}</span>
          </button>
        </div>

        <transition name="pop">
          <div v-if="filterOpen" class="filter-panel">
            <div class="filter-row">
              <label>科目</label>
              <div class="filter-opts">
                <button
                  v-for="s in ['all', ...filterMeta.subjects]"
                  :key="s"
                  class="opt"
                  :class="{ on: filters.subject === s }"
                  @click="filters.subject = s"
                >{{ s === 'all' ? '全部' : s }}</button>
              </div>
            </div>
            <div class="filter-row">
              <label>年级</label>
              <div class="filter-opts">
                <button
                  v-for="g in ['all', ...filterMeta.grades]"
                  :key="g"
                  class="opt"
                  :class="{ on: filters.grade === g }"
                  @click="filters.grade = g"
                >{{ g === 'all' ? '全部' : g }}</button>
              </div>
            </div>
            <button class="btn btn-ghost reset-btn" @click="resetFilters">重置筛选</button>
          </div>
        </transition>

        <transition name="pop">
          <ul v-if="showSuggest && searchSuggestions.length" class="suggest-list">
            <li v-for="s in searchSuggestions" :key="s.name" @click="onSelectSuggestion(s)">
              <span class="suggest-pin">📍</span>
              <span class="suggest-name">{{ s.name }}</span>
            </li>
          </ul>
        </transition>
      </div>

      <aside class="card-panel desktop-only">
        <div class="panel-head">
          <h2>附近家教需求 <em v-if="!loading" class="count">{{ requests.length }}</em></h2>
          <span v-if="loading" class="loading-dots">加载中…</span>
        </div>
        <div ref="listRef" class="cards-scroll">
          <template v-if="requests.length">
            <div v-for="r in requests" :key="r.id" :data-id="r.id">
              <RequestCard :request="r" :selected="r.id === selectedId" @select="onSelectRequest" @contact="onContactRequest" />
            </div>
          </template>
          <div v-else-if="loading" class="empty">加载中…</div>
          <div v-else class="empty">
            <p class="empty-emoji">🗺️</p>
            <p>{{ loadError || '当前区域暂无家教需求' }}</p>
            <p class="empty-sub">试试调整地图视野或清除筛选条件</p>
          </div>
        </div>
      </aside>

      <div class="mobile-sheet mobile-only">
        <div class="sheet-handle"></div>
        <div class="sheet-head">
          <h2>家教需求 <em class="count">{{ requests.length }}</em></h2>
          <span v-if="loading" class="loading-dots">加载中…</span>
        </div>
        <div ref="listRef" class="sheet-scroll">
          <div v-for="r in requests" :key="r.id" :data-id="r.id">
            <RequestCard :request="r" :selected="r.id === selectedId" @select="onSelectRequest" @contact="onContactRequest" />
          </div>
          <div v-if="!requests.length && !loading" class="empty mobile-empty">
            <p class="empty-emoji">🗺️</p>
            <p>{{ loadError || '当前区域暂无家教需求' }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.req-page { height: calc(100vh - 56px); }
.map-area { position: relative; height: 100%; overflow: hidden; }

.search-wrap {
  position: absolute;
  top: 16px;
  left: 16px;
  width: 420px;
  z-index: 110;
}
.search-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(255,255,255,0.96);
  border-radius: 12px;
  padding: 8px 10px;
  box-shadow: var(--shadow-pop);
  border: 1px solid var(--line);
}
.search-icon { font-size: 15px; }
.search-input {
  flex: 1;
  border: none;
  outline: none;
  font-size: 14px;
  background: transparent;
  min-width: 0;
}
.search-clear {
  color: var(--ink-3);
  font-size: 13px;
  padding: 2px 5px;
}
.search-btn { padding: 7px 14px; border-radius: 8px; font-size: 13px; }
.filter-btn {
  position: relative;
  padding: 7px 14px;
  border-radius: 8px;
  font-size: 13px;
  background: var(--bg);
  color: var(--ink-2);
  font-weight: 600;
  border: 1px solid var(--line);
}
.filter-btn.filter-active { background: var(--primary-light); color: var(--primary-dark); border-color: var(--primary); }
.filter-count {
  position: absolute;
  top: -5px;
  right: -5px;
  min-width: 16px;
  height: 16px;
  border-radius: 999px;
  background: var(--primary);
  color: #fff;
  font-size: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 3px;
}

.filter-panel {
  margin-top: 8px;
  background: #fff;
  border-radius: 12px;
  box-shadow: var(--shadow-pop);
  padding: 14px;
  border: 1px solid var(--line);
}
.filter-row { margin-bottom: 12px; }
.filter-row label { font-size: 12px; color: var(--ink-3); font-weight: 600; display: block; margin-bottom: 6px; }
.filter-opts { display: flex; flex-wrap: wrap; gap: 6px; }
.opt {
  padding: 5px 12px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  background: var(--bg);
  color: var(--ink-2);
  border: 1px solid transparent;
  transition: all 0.12s;
}
.opt.on { background: var(--primary-light); color: var(--primary-dark); border-color: var(--primary); }
.reset-btn { width: 100%; margin-top: 4px; }

.suggest-list {
  list-style: none;
  margin-top: 8px;
  background: #fff;
  border-radius: 12px;
  box-shadow: var(--shadow-pop);
  border: 1px solid var(--line);
  overflow: hidden;
  max-height: 300px;
  overflow-y: auto;
}
.suggest-list li {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 11px 14px;
  font-size: 13px;
  cursor: pointer;
  border-bottom: 1px solid var(--line);
  transition: background 0.12s;
}
.suggest-list li:last-child { border-bottom: none; }
.suggest-list li:hover { background: var(--bg); color: var(--primary-dark); }
.suggest-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.card-panel {
  position: absolute;
  top: 16px;
  right: 16px;
  bottom: 16px;
  width: 380px;
  background: rgba(255,255,255,0.96);
  border-radius: 16px;
  box-shadow: var(--shadow-pop);
  display: flex;
  flex-direction: column;
  z-index: 40;
}
.panel-head, .sheet-head {
  padding: 16px 18px 12px;
  border-bottom: 1px solid var(--line);
  display: flex;
  align-items: center;
  gap: 8px;
}
.panel-head h2, .sheet-head h2 { font-size: 16px; font-weight: 800; }
.count {
  font-style: normal;
  font-size: 12px;
  background: var(--primary);
  color: #fff;
  border-radius: 999px;
  padding: 1px 8px;
  margin-left: 4px;
}
.loading-dots { font-size: 12px; color: var(--ink-3); }
.cards-scroll { flex: 1; overflow-y: auto; padding: 12px; display: flex; flex-direction: column; gap: 12px; }

.empty { text-align: center; padding: 50px 20px; color: var(--ink-2); font-size: 14px; }
.empty-emoji { font-size: 40px; margin-bottom: 10px; }
.empty-sub { font-size: 12px; color: var(--ink-3); margin-top: 6px; }

.mobile-sheet { display: none; }

.pop-enter-active, .pop-leave-active { transition: all 0.18s ease; }
.pop-enter-from, .pop-leave-to { opacity: 0; transform: translateY(-6px) scale(0.98); }

@media (max-width: 767px) {
  .desktop-only { display: none; }

  .search-wrap {
    left: 10px;
    right: 10px;
    width: auto;
    top: calc(env(safe-area-inset-top) + 10px);
  }
  .search-bar { padding: 7px 8px; }

  .mobile-sheet {
    display: flex;
    flex-direction: column;
    position: absolute;
    left: 8px;
    right: 8px;
    bottom: 8px;
    height: 46%;
    background: rgba(255,255,255,0.97);
    border-radius: 18px;
    box-shadow: 0 -8px 30px rgba(15,23,42,0.15);
    z-index: 40;
  }
  .sheet-handle {
    width: 36px;
    height: 4px;
    border-radius: 4px;
    background: var(--line);
    margin: 8px auto 0;
  }
  .sheet-head { padding: 10px 16px 8px; }
  .sheet-scroll {
    flex: 1;
    overflow-y: auto;
    padding: 10px;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .mobile-empty { padding: 30px 20px; }
}
</style>