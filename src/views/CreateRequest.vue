<script setup>
import { ref, reactive, onMounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import api from '../api'
import MapView from '../components/MapView.vue'

const router = useRouter()

const form = reactive({
  title: '',
  subject: '',
  grade: '',
  student_situation: '',
  schedule: '',
  teacher_requirement: '',
  hourly_min: '',
  hourly_max: '',
  address: '',
})

const location = ref(null)
const mapRef = ref(null)
const addrInput = ref('')
const suggestions = ref([])
const suggestLoading = ref(false)
const showSuggest = ref(false)
const submitting = ref(false)
const errorMsg = ref('')
const geoMsg = ref('')

const SUBJECTS = ['数学', '语文', '英语', '物理', '化学', '生物', '政治', '历史', '地理', '科学', '奥数', '编程', '钢琴', '其他']
const GRADES = ['幼儿园小班', '幼儿园中班', '幼儿园大班', '小学一年级', '小学二年级', '小学三年级', '小学四年级', '小学五年级', '小学六年级', '初中一年级', '初中二年级', '初中三年级', '高中一年级', '高中二年级', '高中三年级', '成人']

let suggestTimer = null

function onLocationPick(latlng) {
  location.value = latlng
  reverseGeocode(latlng)
}

async function reverseGeocode({ lat, lng }) {
  try {
    const data = await api.get('/geo/regeo', { params: { location: `${lng},${lat}` } })
    const addr = data.regeocode?.formattedAddress
    if (data.status === '1' && addr) {
      form.address = addr
      geoMsg.value = ''
    } else {
      geoMsg.value = '已定位，但未能识别地址名称，可直接填写地址'
    }
  } catch {
    geoMsg.value = '已定位，但未能识别地址名称，可直接填写地址'
  }
}

function onAddrInput() {
  clearTimeout(suggestTimer)
  const kw = addrInput.value.trim()
  if (kw.length < 2) {
    showSuggest.value = false
    return
  }
  suggestTimer = setTimeout(async () => {
    try {
      suggestLoading.value = true
      const data = await api.get('/geo/inputtips', { params: { keywords: kw, city: '武汉' } })
      suggestions.value = (data.tips || []).slice(0, 6)
      showSuggest.value = suggestions.value.length > 0
    } catch {
      suggestions.value = []
      showSuggest.value = false
    } finally {
      suggestLoading.value = false
    }
  }, 400)
}

function onSelectSuggestion(s) {
  showSuggest.value = false
  addrInput.value = s.rawName || s.name
  form.address = s.rawName || s.name
  if (s.location) {
    location.value = { lat: s.location.lat, lng: s.location.lng }
    nextTick(() => mapRef.value?.setPickedMarker(s.location.lat, s.location.lng))
  } else {
    // 无坐标时用 Geocoder 解析
    api.get('/geo/geocode', { params: { address: s.rawName } }).then((data) => {
      const g = data.geocodes?.[0]
      if (g?.location) {
        location.value = { lat: g.location.lat, lng: g.location.lng }
        nextTick(() => mapRef.value?.setPickedMarker(g.location.lat, g.location.lng))
      }
    }).catch(() => {})
  }
}

function validate() {
  const required = {
    title: form.title,
    subject: form.subject,
    grade: form.grade,
    student_situation: form.student_situation,
    schedule: form.schedule,
    teacher_requirement: form.teacher_requirement,
    address: form.address,
  }
  for (const [k, v] of Object.entries(required)) {
    if (!String(v).trim()) return `请填写${labelOf(k)}`
  }
  const mn = Number(form.hourly_min)
  const mx = Number(form.hourly_max)
  if (!Number.isFinite(mn) || !Number.isFinite(mx) || mn <= 0 || mx < mn) return '请填写有效的时薪范围'
  if (!location.value) return '请在地图上点击选择家教位置'
  return ''
}

function labelOf(key) {
  return { title: '标题', subject: '科目', grade: '年级', student_situation: '学员情况', schedule: '安排时间', teacher_requirement: '教员要求', address: '家教地址' }[key]
}

async function onSubmit() {
  errorMsg.value = ''
  const err = validate()
  if (err) {
    errorMsg.value = err
    return
  }
  submitting.value = true
  try {
    await api.post('/requests', {
      ...form,
      hourly_min: Number(form.hourly_min),
      hourly_max: Number(form.hourly_max),
      lat: location.value.lat,
      lng: location.value.lng,
    })
    router.push('/')
  } catch (e) {
    errorMsg.value = e.message
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="page create-page">
    <h1 class="page-title">发布家教需求</h1>
    <p class="page-sub">填写需求信息，并在地图上标记家教位置</p>

    <div class="create-grid">
      <form class="card form-card" @submit.prevent="onSubmit">
        <div class="field">
          <label>需求标题</label>
          <input v-model="form.title" class="input" placeholder="例如：高一数学辅导，函数基础薄弱" />
        </div>

        <div class="field-row">
          <div class="field">
            <label>辅导科目</label>
            <select v-model="form.subject" class="input">
              <option value="" disabled>选择科目</option>
              <option v-for="s in SUBJECTS" :key="s" :value="s">{{ s }}</option>
            </select>
          </div>
          <div class="field">
            <label>学员年级</label>
            <select v-model="form.grade" class="input">
              <option value="" disabled>选择年级</option>
              <option v-for="g in GRADES" :key="g" :value="g">{{ g }}</option>
            </select>
          </div>
        </div>

        <div class="field">
          <label>学员情况</label>
          <textarea v-model="form.student_situation" class="input" rows="3" placeholder="孩子的学习现状、薄弱环节、目标等"></textarea>
        </div>

        <div class="field">
          <label>安排时间</label>
          <input v-model="form.schedule" class="input" placeholder="例如：每周六下午2-4点，可长期" />
        </div>

        <div class="field">
          <label>教员要求</label>
          <textarea v-model="form.teacher_requirement" class="input" rows="2" placeholder="例如：重点大学在校生，有耐心，女老师优先"></textarea>
        </div>

        <div class="field-row">
          <div class="field">
            <label>时薪下限（元/时）</label>
            <input v-model="form.hourly_min" type="number" class="input" placeholder="120" min="0" />
          </div>
          <div class="field">
            <label>时薪上限（元/时）</label>
            <input v-model="form.hourly_max" type="number" class="input" placeholder="180" min="0" />
          </div>
        </div>

        <div class="field">
          <label>家教地址（搜索或直接在地图上点击）</label>
          <div class="addr-search">
            <input v-model="addrInput" class="input" placeholder="搜索小区、学校、路名…" @input="onAddrInput" @focus="showSuggest = !!suggestions.length" @focusout="setTimeout(() => showSuggest = false, 200)" />
            <span v-if="suggestLoading" class="addr-loading">搜索中…</span>
          </div>
          <transition name="pop">
            <ul v-if="showSuggest && suggestions.length" class="addr-suggest">
              <li v-for="s in suggestions" :key="s.name" @mousedown.prevent="onSelectSuggestion(s)">
                📍 {{ s.name }}
              </li>
            </ul>
          </transition>
          <p v-if="geoMsg" class="geo-msg">{{ geoMsg }}</p>
          <p v-if="form.address" class="geo-ok">📍 {{ form.address }}</p>
        </div>

        <p v-if="errorMsg" class="error-text">{{ errorMsg }}</p>

        <button type="submit" class="btn btn-primary submit-btn" :disabled="submitting">
          {{ submitting ? '发布中…' : '发布需求' }}
        </button>
      </form>

      <div class="map-card">
        <MapView ref="mapRef" :pick-mode="true" :pick-center="{ lat: 30.5928, lng: 114.3054 }" :zoom="13" @location-pick="onLocationPick" />
        <div class="map-tip">👆 点击地图标记家教位置</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page-title { font-size: 22px; font-weight: 800; }
.page-sub { font-size: 13px; color: var(--ink-3); margin: 6px 0 20px; }

.create-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 1fr;
  gap: 20px;
  align-items: start;
}
.form-card { padding: 24px; }
.field-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }

.addr-search { position: relative; }
.addr-loading {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 12px;
  color: var(--ink-3);
}
.addr-suggest {
  list-style: none;
  margin-top: 6px;
  background: #fff;
  border-radius: 10px;
  box-shadow: var(--shadow-pop);
  border: 1px solid var(--line);
  overflow: hidden;
  max-height: 240px;
  overflow-y: auto;
  position: relative;
  z-index: 30;
}
.addr-suggest li {
  padding: 10px 14px;
  font-size: 13px;
  cursor: pointer;
  border-bottom: 1px solid var(--line);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.addr-suggest li:hover { background: var(--bg); }
.geo-msg { font-size: 12px; color: #d97706; margin-top: 6px; }
.geo-ok { font-size: 12px; color: var(--primary-dark); margin-top: 6px; font-weight: 600; }

.error-text { color: var(--danger); font-size: 13px; margin-bottom: 10px; }
.submit-btn { width: 100%; padding: 12px; font-size: 15px; border-radius: 12px; }

.map-card {
  position: relative;
  border-radius: var(--radius);
  overflow: hidden;
  box-shadow: var(--shadow-card);
  height: 560px;
}
.map-card :deep(.map-container) { height: 560px; }
.map-tip {
  position: absolute;
  left: 12px;
  bottom: 12px;
  background: rgba(15, 23, 42, 0.75);
  color: #fff;
  font-size: 12px;
  padding: 6px 12px;
  border-radius: 999px;
  z-index: 30;
  pointer-events: none;
}

.pop-enter-active, .pop-leave-active { transition: all 0.15s ease; }
.pop-enter-from, .pop-leave-to { opacity: 0; transform: translateY(-4px); }

@media (max-width: 900px) {
  .create-grid { grid-template-columns: 1fr; }
  .map-card, .map-card :deep(.map-container) { height: 400px; }
}
</style>