<script setup>
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()

const username = ref('')
const password = ref('')
const showPwd = ref(false)
const loading = ref(false)
const errorMsg = ref('')

async function onSubmit() {
  errorMsg.value = ''
  if (!username.value.trim() || !password.value) {
    errorMsg.value = '请输入用户名和密码'
    return
  }
  loading.value = true
  try {
    await auth.login(username.value.trim(), password.value)
    router.push(route.query.redirect || '/')
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
        <h1>家教地图</h1>
        <p>找到离你最近的家教需求</p>
      </div>

      <form class="auth-form" @submit.prevent="onSubmit">
        <div class="field">
          <label>用户名</label>
          <input v-model="username" class="input" placeholder="请输入用户名" autocomplete="username" />
        </div>

        <div class="field">
          <label>密码</label>
          <div class="pwd-wrap">
            <input
              v-model="password"
              :type="showPwd ? 'text' : 'password'"
              class="input"
              placeholder="请输入密码"
              autocomplete="current-password"
            />
            <button type="button" class="pwd-toggle" @click="showPwd = !showPwd">
              {{ showPwd ? '🙈' : '👁️' }}
            </button>
          </div>
        </div>

        <p v-if="errorMsg" class="error-text">{{ errorMsg }}</p>

        <button type="submit" class="btn btn-primary submit-btn" :disabled="loading">
          {{ loading ? '登录中…' : '登 录' }}
        </button>
      </form>

      <div class="auth-alt">
        还没有账号？<RouterLink to="/register">立即注册</RouterLink>
      </div>

      <div class="demo-hint">
        <p class="demo-title">💡 演示账号</p>
        <p>家长：<code>demo_parent</code> / <code>demo123</code></p>
        <p>教员：<code>demo_tutor</code> / <code>demo123</code></p>
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
  max-width: 400px;
  padding: 36px 32px 28px;
  border-radius: 20px;
}
.auth-brand { text-align: center; margin-bottom: 28px; }
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

.demo-hint {
  margin-top: 20px;
  background: var(--primary-light);
  border-radius: 12px;
  padding: 12px 14px;
  font-size: 12px;
  color: var(--primary-dark);
  line-height: 1.8;
}
.demo-title { font-weight: 700; margin-bottom: 2px; }
.demo-hint code {
  background: #fff;
  border-radius: 5px;
  padding: 1px 6px;
  font-size: 11px;
}
</style>