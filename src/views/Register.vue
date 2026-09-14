<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const auth = useAuthStore()
const router = useRouter()

const form = ref({
  username: '',
  name: '',
  phone: '',
  wechat: '',
  password: '',
  confirm: '',
  role: 'tutor',
})
const showPwd = ref(false)
const loading = ref(false)
const errorMsg = ref('')

function validate() {
  if (!form.value.username.trim() || form.value.username.trim().length < 3 || form.value.username.trim().length > 20) {
    return '用户名需为3-20个字符'
  }
  if (!form.value.name.trim()) return '请输入姓名'
  if (form.value.password.length < 6) return '密码至少6位'
  if (form.value.password !== form.value.confirm) return '两次输入的密码不一致'
  return ''
}

async function onSubmit() {
  errorMsg.value = ''
  const err = validate()
  if (err) {
    errorMsg.value = err
    return
  }
  loading.value = true
  try {
    await auth.register({
      username: form.value.username.trim(),
      password: form.value.password,
      name: form.value.name.trim(),
      role: form.value.role,
      phone: form.value.phone.trim(),
      wechat: form.value.wechat.trim(),
    })
    router.push('/')
  } catch (e) {
    errorMsg.value = e.message
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="auth-page">
    <div class="auth-card card">
      <div class="auth-brand">
        <span class="brand-mark">📚</span>
        <h1>创建账号</h1>
        <p>选择你的身份开始使用</p>
      </div>

      <div class="role-select">
        <button
          type="button"
          class="role-card"
          :class="{ on: form.role === 'tutor' }"
          @click="form.role = 'tutor'"
        >
          <span class="role-icon">🎓</span>
          <span class="role-name">我是教员</span>
          <span class="role-desc">接单辅导学生</span>
        </button>
        <button
          type="button"
          class="role-card"
          :class="{ on: form.role === 'parent' }"
          @click="form.role = 'parent'"
        >
          <span class="role-icon">👨‍👩‍👧</span>
          <span class="role-name">我是家长</span>
          <span class="role-desc">发布家教需求</span>
        </button>
      </div>

      <form class="auth-form" @submit.prevent="onSubmit">
        <div class="field">
          <label>用户名</label>
          <input v-model="form.username" class="input" placeholder="3-20个字符" autocomplete="username" />
        </div>
        <div class="field">
          <label>姓名</label>
          <input v-model="form.name" class="input" placeholder="您的称呼" />
        </div>
        <div class="field-row">
          <div class="field">
            <label>手机号（选填）</label>
            <input v-model="form.phone" class="input" placeholder="手机号" />
          </div>
          <div class="field">
            <label>微信号（选填）</label>
            <input v-model="form.wechat" class="input" placeholder="微信号" />
          </div>
        </div>
        <div class="field">
          <label>密码</label>
          <div class="pwd-wrap">
            <input
              v-model="form.password"
              :type="showPwd ? 'text' : 'password'"
              class="input"
              placeholder="至少6位"
              autocomplete="new-password"
            />
            <button type="button" class="pwd-toggle" @click="showPwd = !showPwd">
              {{ showPwd ? '🙈' : '👁️' }}
            </button>
          </div>
        </div>
        <div class="field">
          <label>确认密码</label>
          <input v-model="form.confirm" type="password" class="input" placeholder="再次输入密码" autocomplete="new-password" />
        </div>

        <p v-if="errorMsg" class="error-text">{{ errorMsg }}</p>

        <button type="submit" class="btn btn-primary submit-btn" :disabled="loading">
          {{ loading ? '注册中…' : '注 册' }}
        </button>
      </form>

      <div class="auth-alt">
        已有账号？<RouterLink to="/login">去登录</RouterLink>
      </div>
    </div>
  </div>
</template>

<style scoped>
.auth-page {
  min-height: calc(100vh - 56px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px 16px;
  background: linear-gradient(145deg, #ecfdf5, #f0fdfa 55%, #e6f7ef);
}
.auth-card {
  width: 100%;
  max-width: 460px;
  padding: 32px 30px 26px;
  border-radius: 20px;
}
.auth-brand { text-align: center; margin-bottom: 22px; }
.brand-mark { font-size: 40px; }
.auth-brand h1 {
  font-size: 24px;
  font-weight: 800;
  margin-top: 8px;
  background: linear-gradient(135deg, var(--primary), #0d9488);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}
.auth-brand p { font-size: 13px; color: var(--ink-3); margin-top: 6px; }

.role-select { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 18px; }
.role-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  padding: 16px 10px;
  border-radius: 14px;
  border: 2px solid var(--line);
  background: var(--bg);
  transition: all 0.15s;
}
.role-card:hover { border-color: #a7f3d0; }
.role-card.on { border-color: var(--primary); background: var(--primary-light); }
.role-icon { font-size: 26px; }
.role-name { font-size: 14px; font-weight: 700; color: var(--ink); }
.role-desc { font-size: 11px; color: var(--ink-3); }

.field-row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }

.pwd-wrap { position: relative; }
.pwd-toggle {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 16px;
  padding: 2px;
}
.pwd-wrap .input { padding-right: 40px; }

.submit-btn { width: 100%; padding: 12px; font-size: 15px; border-radius: 12px; margin-top: 4px; }
.error-text { color: var(--danger); font-size: 13px; margin-bottom: 10px; }
.auth-alt { text-align: center; margin-top: 18px; font-size: 14px; color: var(--ink-2); }

@media (max-width: 420px) {
  .field-row { grid-template-columns: 1fr; gap: 0; }
}
</style>