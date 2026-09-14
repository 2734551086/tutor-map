<script setup>
import { computed } from 'vue'

const props = defineProps({
  request: { type: Object, required: true },
  selected: { type: Boolean, default: false },
})

const emit = defineEmits(['select'])

const price = computed(() =>
  `${props.request.hourly_min}–${props.request.hourly_max}元/时`
)
const timeAgo = computed(() => {
  const created = new Date(props.request.created_at?.replace(' ', 'T') + 'Z')
  const diff = Date.now() - created.getTime()
  const days = Math.floor(diff / 86400000)
  if (days <= 0) {
    const hours = Math.floor(diff / 3600000)
    if (hours <= 0) return '刚刚'
    return `${hours}小时前`
  }
  if (days === 1) return '昨天'
  return `${days}天前`
})
</script>

<template>
  <article
    class="req-card"
    :class="{ selected }"
    @click="emit('select', request.id)"
  >
    <div class="req-head">
      <h3 class="req-title">{{ request.title }}</h3>
      <span class="badge req-subject">{{ request.subject }}</span>
    </div>

    <div class="req-meta">
      <span class="meta-chip">{{ request.grade }}</span>
      <span class="meta-chip price-chip">{{ price }}</span>
      <span class="meta-time">{{ timeAgo }}</span>
    </div>

    <dl class="req-detail">
      <div class="row">
        <dt>学员情况</dt>
        <dd class="clamp-2">{{ request.student_situation }}</dd>
      </div>
      <div class="row">
        <dt>安排时间</dt>
        <dd>{{ request.schedule }}</dd>
      </div>
      <div class="row">
        <dt>教员要求</dt>
        <dd class="clamp-2">{{ request.teacher_requirement }}</dd>
      </div>
      <div class="row">
        <dt>家教地址</dt>
        <dd class="addr">📍 {{ request.address }}</dd>
      </div>
    </dl>

    <div class="req-footer">
      <span class="poster">发布人：{{ request.poster?.name }}</span>
      <span v-if="request.poster?.role === 'parent'" class="poster-tag">家长</span>
      <span class="contact-hint">点击卡片查看详情</span>
    </div>
  </article>
</template>

<style scoped>
.req-card {
  background: var(--surface);
  border-radius: var(--radius);
  box-shadow: var(--shadow-card);
  padding: 16px;
  cursor: pointer;
  transition: all 0.15s ease;
  border: 2px solid transparent;
}
.req-card:hover { transform: translateY(-2px); box-shadow: var(--shadow-pop); }
.req-card.selected { border-color: var(--primary); box-shadow: 0 0 0 3px var(--primary-light); }

.req-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; }
.req-title { font-size: 15px; font-weight: 700; flex: 1; line-height: 1.4; }
.req-subject { flex-shrink: 0; }

.req-meta { display: flex; align-items: center; gap: 8px; margin: 10px 0 12px; flex-wrap: wrap; }
.meta-chip {
  font-size: 12px;
  padding: 3px 10px;
  border-radius: 999px;
  background: var(--bg);
  color: var(--ink-2);
  font-weight: 600;
}
.price-chip { background: #ecfdf5; color: var(--primary-dark); font-weight: 700; }
.meta-time { margin-left: auto; font-size: 12px; color: var(--ink-3); }

.req-detail { display: flex; flex-direction: column; gap: 8px; }
.row { display: flex; gap: 10px; font-size: 13px; line-height: 1.5; }
.row dt {
  flex-shrink: 0;
  width: 62px;
  color: var(--ink-3);
  font-weight: 500;
  padding-top: 1px;
}
.row dd { color: var(--ink-2); flex: 1; }
.clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.addr { color: var(--ink) !important; font-weight: 500; }

.req-footer {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--line);
  font-size: 12px;
}
.poster { color: var(--ink-2); font-weight: 600; }
.poster-tag {
  font-size: 11px;
  padding: 1px 7px;
  border-radius: 999px;
  background: #ede9fe;
  color: #6d28d9;
  font-weight: 600;
}
.contact-hint { margin-left: auto; color: var(--ink-3); }
</style>