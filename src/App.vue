<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from './stores/auth'

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()

const mobileOpen = ref(false)
const showLoginTip = ref(false)

const menus = computed(() => {
  const items = [
    { label: '需求地图', icon: '🗺️', path: '/' },
  ]
  if (auth.isLoggedIn) {
    items.push({ label: '发布需求', icon: '📝', path: '/create' })
    items.push({ label: '消息', icon: '💬', path: '/messages' })
    items.push({ label: '我的', icon: '👤', path: '/profile' })
  }
  return items
})

function isActive(path) {
  return path === '/' ? route.path === '/' : route.path.startsWith(path)
}

function navigate(path) {
  mobileOpen.value = false
  router.push(path)
}

function onLogout() {
  auth.logout()
  mobileOpen.value = false
  router.push('/')
}

function onLogoutTip() {
  showLoginTip.value = true
  setTimeout(() => (showLoginTip.value = false), 2000)
}

watch(() => route.fullPath, () => { mobileOpen.value = false })
</script>

<template>
  <div class="app-shell">
    <header class="topbar">
      <div class="topbar-inner">
        <button class="brand" @click="navigate('/')">
          <span class="brand-mark">📚</span>
          <span class="brand-name">家教地图</span>
        </button>

        <nav class="desktop-nav">
          <button
            v-for="m in menus"
            :key="m.path"
            class="nav-item"
            :class="{ active: isActive(m.path) }"
            @click="navigate(m.path)"
          >
            {{ m.label }}
          </button>
        </nav>

        <div class="topbar-right">
          <template v-if="auth.isLoggedIn">
            <button class="btn btn-ghost btn-sm logout-btn" @click="onLogout">退出</button>
            <span class="user-chip" @click="navigate('/profile')">
              {{ auth.user?.name }}
              <em class="role-tag">{{ auth.isParent ? '家长' : '教员' }}</em>
            </span>
          </template>
          <template v-else>
            <button class="btn btn-ghost btn-sm" @click="navigate('/login')">登录</button>
            <button class="btn btn-primary btn-sm" @click="navigate('/register')">注册</button>
          </template>
        </div>

        <button class="hamburger" @click="mobileOpen = !mobileOpen">
          <span></span><span></span><span></span>
        </button>
      </div>

      <transition name="slide">
        <div v-if="mobileOpen" class="mobile-menu">
          <button
            v-for="m in menus"
            :key="m.path"
            class="mobile-menu-item"
            :class="{ active: isActive(m.path) }"
            @click="navigate(m.path)"
          >
            <span>{{ m.icon }}</span>{{ m.label }}
          </button>
          <template v-if="auth.isLoggedIn">
            <div class="mobile-menu-divider"></div>
            <button class="mobile-menu-item danger" @click="onLogout">🚪 退出登录</button>
          </template>
        </div>
      </transition>
    </header>

    <main class="app-main">
      <RouterView />
    </main>

    <transition name="fade">
      <div v-if="showLoginTip" class="login-tip">请先登录后再操作</div>
    </transition>
  </div>
</template>

<style scoped>
.topbar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--line);
}
.topbar-inner {
  max-width: 1200px;
  margin: 0 auto;
  height: 56px;
  padding: 0 20px;
  display: flex;
  align-items: center;
  gap: 20px;
}
.brand {
  display: flex;
  align-items: center;
  gap: 8px;
}
.brand-mark { font-size: 22px; }
.brand-name {
  font-size: 17px;
  font-weight: 800;
  background: linear-gradient(135deg, var(--primary), #0d9488);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}
.desktop-nav { display: flex; gap: 4px; flex: 1; margin-left: 12px; }
.nav-item {
  padding: 7px 14px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  color: var(--ink-2);
  transition: all 0.15s;
}
.nav-item:hover { background: var(--bg); color: var(--ink); }
.nav-item.active { background: var(--primary-light); color: var(--primary-dark); font-weight: 700; }

.topbar-right { display: flex; align-items: center; gap: 8px; }
.btn-sm { padding: 6px 12px; font-size: 13px; border-radius: 8px; }
.user-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 10px;
  border-radius: 999px;
  background: var(--primary-light);
  font-size: 13px;
  font-weight: 600;
  color: var(--primary-dark);
  cursor: pointer;
}
.role-tag {
  font-style: normal;
  font-size: 11px;
  padding: 1px 6px;
  border-radius: 999px;
  background: #fff;
}

.hamburger {
  display: none;
  flex-direction: column;
  gap: 5px;
  padding: 8px;
}
.hamburger span {
  width: 20px;
  height: 2px;
  background: var(--ink-2);
  border-radius: 2px;
}

.mobile-menu {
  display: none;
  padding: 8px 16px 16px;
  border-top: 1px solid var(--line);
  background: #fff;
}
.mobile-menu-item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 12px 8px;
  font-size: 15px;
  font-weight: 500;
  color: var(--ink);
  border-radius: 8px;
  text-align: left;
}
.mobile-menu-item:hover { background: var(--bg); }
.mobile-menu-item.active { color: var(--primary-dark); font-weight: 700; }
.mobile-menu-item.danger { color: var(--danger); }
.mobile-menu-divider { height: 1px; background: var(--line); margin: 8px 0; }

.login-tip {
  position: fixed;
  bottom: 30px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 200;
  background: rgba(15, 23, 42, 0.85);
  color: #fff;
  padding: 10px 20px;
  border-radius: 999px;
  font-size: 13px;
}

.slide-enter-active, .slide-leave-active { transition: all 0.2s ease; }
.slide-enter-from, .slide-leave-to { opacity: 0; transform: translateY(-8px); }
.fade-enter-active, .fade-leave-active { transition: opacity 0.25s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

@media (max-width: 767px) {
  .desktop-nav { display: none; }
  .topbar-right { display: none; }
  .hamburger { display: flex; margin-left: auto; }
  .mobile-menu { display: block; }
}
</style>