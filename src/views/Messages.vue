<script setup>
import { ref, reactive, onMounted, onBeforeUnmount, computed, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import api from '../api'
import { useAuthStore } from '../stores/auth'

const auth = useAuthStore()
const router = useRouter()

const conversations = ref([])
const activeUserId = ref(null)
const messages = ref([])
const msgInput = ref('')
const chatLoading = ref(false)
const sendLoading = ref(false)
const scrollRef = ref(null)

let pollTimer = null

async function loadConversations() {
  try {
    conversations.value = await api.get('/messages/conversations')
  } catch {}
}

async function openChat(userId) {
  activeUserId.value = userId
  chatLoading.value = true
  try {
    messages.value = await api.get(`/messages/${userId}`)
    await nextTick()
    scrollToBottom()
    loadConversations()
  } catch (e) {
    console.error(e)
  } finally {
    chatLoading.value = false
  }
}

async function sendMessage() {
  const content = msgInput.value.trim()
  if (!content || !activeUserId.value) return
  sendLoading.value = true
  try {
    const msg = await api.post('/messages', {
      receiver_id: activeUserId.value,
      content,
    })
    messages.value.push(msg)
    msgInput.value = ''
    await nextTick()
    scrollToBottom()
  } catch (e) {
    alert(e.message)
  } finally {
    sendLoading.value = false
  }
}

function scrollToBottom() {
  scrollRef.value?.scrollTo({ top: scrollRef.value.scrollHeight })
}

const activeConvo = computed(() =>
  conversations.value.find(c => c.user_id === activeUserId.value)
)

function formatTime(iso) {
  if (!iso) return ''
  const d = new Date(iso.replace(' ', 'T') + 'Z')
  return d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
}

async function poll() {
  if (document.hidden) return
  if (activeUserId.value) {
    await openChat(activeUserId.value)
  }
  await loadConversations()
}

onMounted(async () => {
  await loadConversations()
  pollTimer = setInterval(poll, 4000)
})

onBeforeUnmount(() => clearInterval(pollTimer))
</script>

<template>
  <div class="msg-page">
    <div class="convo-panel card">
      <div class="convo-head">
        <h2>会话列表</h2>
      </div>
      <div class="convo-list">
        <template v-if="conversations.length">
          <button
            v-for="c in conversations"
            :key="c.user_id"
            class="convo-item"
            :class="{ active: c.user_id === activeUserId }"
            @click="openChat(c.user_id)"
          >
            <div class="convo-avatar">{{ c.other_name?.[0] }}</div>
            <div class="convo-info">
              <div class="convo-line">
                <span class="convo-name">{{ c.other_name }}</span>
                <span class="convo-role">{{ c.other_role === 'parent' ? '家长' : '教员' }}</span>
                <span class="convo-time">{{ formatTime(c.last_time) }}</span>
              </div>
              <div class="convo-last">
                <span class="convo-text">{{ c.last_message }}</span>
                <span v-if="Number(c.unread_count) > 0" class="unread-badge">{{ c.unread_count }}</span>
              </div>
            </div>
          </button>
        </template>
        <div v-else class="convo-empty">
          <p class="convo-empty-icon">💬</p>
          <p>暂无会话</p>
          <p class="convo-empty-sub">在地图上点击需求，联系发布人开始聊天</p>
          <button class="btn btn-primary convo-go-map" @click="router.push('/')">去地图看看</button>
        </div>
      </div>
    </div>

    <div class="chat-panel card">
      <template v-if="activeUserId">
        <div class="chat-head">
          <span class="chat-name">{{ activeConvo?.other_name || '聊天' }}</span>
          <span class="chat-role">{{ activeConvo?.other_role === 'parent' ? '家长' : '教员' }}</span>
        </div>
        <div ref="scrollRef" class="chat-body">
          <div v-if="chatLoading" class="chat-loading">加载中…</div>
          <template v-else>
            <div
              v-for="m in messages"
              :key="m.id"
              class="bubble-row"
              :class="{ mine: m.sender_id === auth.user?.id }"
            >
              <div class="bubble">
                <span class="bubble-text">{{ m.content }}</span>
                <span class="bubble-time">{{ formatTime(m.created_at) }}</span>
              </div>
            </div>
          </template>
        </div>
        <div class="chat-input-row">
          <input
            v-model="msgInput"
            class="input chat-input"
            placeholder="输入消息…"
            @keyup.enter="sendMessage"
          />
          <button class="btn btn-primary" :disabled="sendLoading || !msgInput.trim()" @click="sendMessage">发送</button>
        </div>
      </template>
      <div v-else class="chat-placeholder">
        <p class="placeholder-icon">💬</p>
        <p>选择一个会话开始聊天</p>
        <p class="placeholder-sub">当你联系家教需求发布者后，会话会出现在这里</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.msg-page {
  height: calc(100vh - 56px);
  max-width: 1100px;
  margin: 0 auto;
  padding: 20px;
  display: grid;
  grid-template-columns: 340px 1fr;
  gap: 16px;
}

.convo-panel { display: flex; flex-direction: column; overflow: hidden; }
.convo-head { padding: 16px 18px; border-bottom: 1px solid var(--line); }
.convo-head h2 { font-size: 16px; font-weight: 800; }
.convo-list { flex: 1; overflow-y: auto; }
.convo-item {
  width: 100%;
  display: flex;
  gap: 12px;
  padding: 14px 16px;
  text-align: left;
  border-bottom: 1px solid var(--line);
  transition: background 0.12s;
}
.convo-item:hover { background: var(--bg); }
.convo-item.active { background: var(--primary-light); }
.convo-avatar {
  width: 42px;
  height: 42px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--primary), #0d9488);
  color: #fff;
  font-size: 17px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.convo-info { flex: 1; min-width: 0; }
.convo-line { display: flex; align-items: center; gap: 6px; }
.convo-name { font-size: 14px; font-weight: 700; color: var(--ink); }
.convo-role {
  font-size: 10px;
  background: #ede9fe;
  color: #6d28d9;
  border-radius: 999px;
  padding: 1px 6px;
  font-weight: 600;
}
.convo-time { margin-left: auto; font-size: 11px; color: var(--ink-3); }
.convo-last { display: flex; align-items: center; gap: 6px; margin-top: 3px; }
.convo-text {
  font-size: 12px;
  color: var(--ink-2);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
}
.unread-badge {
  min-width: 18px;
  height: 18px;
  border-radius: 999px;
  background: var(--danger);
  color: #fff;
  font-size: 11px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 5px;
  font-weight: 700;
}
.convo-empty { text-align: center; padding: 50px 20px; color: var(--ink-2); font-size: 14px; }
.convo-empty-icon { font-size: 38px; margin-bottom: 10px; }
.convo-empty-sub { font-size: 12px; color: var(--ink-3); margin: 6px 0 16px; }
.convo-go-map { padding: 8px 18px; font-size: 13px; }

.chat-panel { display: flex; flex-direction: column; overflow: hidden; }
.chat-head {
  padding: 16px 18px;
  border-bottom: 1px solid var(--line);
  display: flex;
  align-items: center;
  gap: 8px;
}
.chat-name { font-size: 15px; font-weight: 800; }
.chat-role {
  font-size: 11px;
  background: var(--primary-light);
  color: var(--primary-dark);
  border-radius: 999px;
  padding: 1px 8px;
  font-weight: 600;
}
.chat-body { flex: 1; overflow-y: auto; padding: 18px; display: flex; flex-direction: column; gap: 10px; }
.chat-loading { text-align: center; color: var(--ink-3); font-size: 13px; padding: 30px; }

.bubble-row { display: flex; }
.bubble-row.mine { justify-content: flex-end; }
.bubble {
  max-width: 70%;
  padding: 10px 14px;
  border-radius: 14px;
  background: var(--bg);
  border: 1px solid var(--line);
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.mine .bubble { background: var(--primary); border-color: var(--primary); }
.bubble-text { font-size: 14px; line-height: 1.5; color: var(--ink); word-break: break-word; }
.mine .bubble-text { color: #fff; }
.bubble-time { font-size: 10px; color: var(--ink-3); align-self: flex-end; }
.mine .bubble-time { color: rgba(255,255,255,0.7); }

.chat-input-row {
  display: flex;
  gap: 10px;
  padding: 14px 16px;
  border-top: 1px solid var(--line);
}
.chat-input { flex: 1; }

.chat-placeholder {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--ink-2);
  font-size: 14px;
}
.placeholder-icon { font-size: 44px; margin-bottom: 12px; }
.placeholder-sub { font-size: 12px; color: var(--ink-3); margin-top: 6px; }

@media (max-width: 767px) {
  .msg-page {
    grid-template-columns: 1fr;
    padding: 12px;
    height: calc(100vh - 56px);
  }
  .convo-panel { min-height: 30vh; }
}
</style>