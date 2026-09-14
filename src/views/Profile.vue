<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import api from '../api'

const auth = useAuthStore()
const router = useRouter()

const editMode = ref(false)
const saving = ref(false)
const message = ref('')

const form = ref({
  name: auth.user?.name || '',
  phone: auth.user?.phone || '',
  wechat: auth.user?.wechat || '',
  subjects: [...(auth.user?.subjects || [])],
})

const SUBJECT_OPTIONS = ['数学', '语文', '英语', '物理', '化学', '生物', '政治', '历史', '地理', '科学', '奥数', '编程', '钢琴', '其他']

const roleText = computed(() => (auth.isParent ? '家长' : '教员'))
const isTutor = computed(() => auth.isTutor)

function toggleSubject(s) {
  const i = form.value.subjects.indexOf(s)
  if (i >= 0) form.value.subjects.splice(i, 1)
  else form.value.subjects.push(s)
}

async function save() {
  saving.value = true
  message.value = ''
  try {
    const user = await auth.updateProfile({
      name: form.value.name,
      phone: form.value.phone,
      wechat: form.value.wechat,
      subjects: form.value.subjects,
    })
    auth.user = user
    editMode.value = false
    message.value = '✓ 保存成功'
    setTimeout(() => (message.value = ''), 2500)
  } catch (e) {
    message.value = '✗ ' + e.message
  } finally {
    saving.value = false
  }
}

async function onLogout() {
  auth.logout()
  router.push('/')
}
</script>

<template>
  <div class="page profile-page">
    <div class="profile-card card">
      <div class="profile-head">
        <div class="avatar">{{ (auth.user?.name || '?')[0] }}</div>
        <div class="profile-info">
          <div class="info-line">
            <h1>{{ auth.user?.name }}</h1>
            <span class="badge role-badge">{{ roleText }}</span>
          </div>
          <p class="username">@{{ auth.user?.username }}</p>
        </div>
        <button v-if="!editMode" class="btn btn-ghost" @click="editMode = true">编辑资料</button>
        <button v-else class="btn btn-ghost" @click="editMode = false">取消</button>
      </div>

      <div v-if="!editMode" class="profile-body">
        <div class="profile-row"><span>手机号</span><b>{{ auth.user?.phone || '未填写' }}</b></div>
        <div class="profile-row"><span>微信号</span><b>{{ auth.user?.wechat || '未填写' }}</b></div>
        <template v-if="isTutor">
          <div class="profile-row">
            <span>可教科目</span>
            <b>
              <span v-if="auth.user?.subjects?.length" class="subject-list">
                <em v-for="s in auth.user.subjects" :key="s" class="subject-chip">{{ s }}</em>
              </span>
              <span v-else>未填写</span>
            </b>
          </div>
        </template>
        <div class="profile-row"><span>注册时间</span><b>{{ auth.user?.created_at?.slice(0, 10) }}</b></div>
      </div>

      <form v-else class="profile-form" @submit.prevent="save">
        <div class="field">
          <label>姓名</label>
          <input v-model="form.name" class="input" />
        </div>
        <div class="field">
          <label>手机号</label>
          <input v-model="form.phone" class="input" placeholder="选填" />
        </div>
        <div class="field">
          <label>微信号</label>
          <input v-model="form.wechat" class="input" placeholder="选填" />
        </div>
        <template v-if="isTutor">
          <div class="field">
            <label>可教科目（多选）</label>
            <div class="subject-opts">
              <button
                v-for="s in SUBJECT_OPTIONS"
                :key="s"
                type="button"
                class="opt"
                :class="{ on: form.subjects.includes(s) }"
                @click="toggleSubject(s)"
              >{{ s }}</button>
            </div>
          </div>
        </template>
        <p v-if="message" class="save-msg">{{ message }}</p>
        <button type="submit" class="btn btn-primary save-btn" :disabled="saving">
          {{ saving ? '保存中…' : '保存修改' }}
        </button>
      </form>
    </div>

    <div class="profile-actions">
      <RouterLink to="/messages" class="btn btn-ghost action-btn">💬 消息中心</RouterLink>
      <RouterLink to="/create" class="btn btn-ghost action-btn">📝 发布需求</RouterLink>
      <button class="btn btn-danger action-btn" @click="onLogout">退出登录</button>
    </div>
  </div>
</template>

<style scoped>
.profile-page { max-width: 560px; }
.profile-card { padding: 26px; }
.profile-head { display: flex; align-items: center; gap: 16px; }
.avatar {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--primary), #0d9488);
  color: #fff;
  font-size: 26px;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.profile-info { flex: 1; min-width: 0; }
.info-line { display: flex; align-items: center; gap: 8px; }
.info-line h1 { font-size: 19px; font-weight: 800; }
.role-badge { font-size: 11px; }
.username { font-size: 13px; color: var(--ink-3); margin-top: 4px; }

.profile-body { margin-top: 22px; border-top: 1px solid var(--line); padding-top: 14px; }
.profile-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid var(--line);
  font-size: 14px;
}
.profile-row:last-child { border-bottom: none; }
.profile-row span { color: var(--ink-3); }
.profile-row b { font-weight: 600; }
.subject-list { display: flex; flex-wrap: wrap; gap: 5px; justify-content: flex-end; }
.subject-chip {
  font-style: normal;
  font-size: 11px;
  background: var(--primary-light);
  color: var(--primary-dark);
  border-radius: 999px;
  padding: 2px 8px;
  font-weight: 600;
}

.profile-form { margin-top: 20px; border-top: 1px solid var(--line); padding-top: 18px; }
.subject-opts { display: flex; flex-wrap: wrap; gap: 6px; }
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
.save-msg { font-size: 13px; margin-bottom: 10px; color: var(--primary-dark); }
.save-btn { width: 100%; }

.profile-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-top: 16px;
}
.action-btn { width: 100%; padding: 11px; font-size: 13px; }
</style>