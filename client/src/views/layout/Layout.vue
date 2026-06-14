<template>
  <el-container class="layout-container">
    <el-header style="background: #1e40af; color: #fff; display: flex; align-items: center; justify-content: space-between; padding: 0 24px;">
      <div style="display: flex; align-items: center; gap: 16px;">
        <span style="font-size: 22px;">🏭</span>
        <span style="font-size: 18px; font-weight: 600;">生产工单执行跟踪系统</span>
        <el-divider direction="vertical" style="border-color: rgba(255,255,255,0.2);" />
        <span style="font-size: 13px; opacity: 0.85;">{{ currentRoute?.meta?.title || '' }}</span>
      </div>
      <div class="header-info">
        <el-tag v-if="user.role === 1" type="warning" effect="dark">车间主管</el-tag>
        <el-tag v-else type="success" effect="dark">操作工</el-tag>
        <span class="user-info">
          <el-avatar :size="32" style="background: #3b82f6;">{{ user.real_name?.[0] }}</el-avatar>
          <span>{{ user.real_name }}</span>
          <span v-if="user.line_name" style="opacity: 0.75; font-size: 13px;">[{{ user.line_name }}]</span>
        </span>
        <el-button type="danger" plain size="small" @click="handleLogout">退出</el-button>
      </div>
    </el-header>
    <el-container>
      <el-aside width="200px" style="background: #fff; border-right: 1px solid #e5e7eb;">
        <el-menu
          :default-active="activeMenu"
          router
          style="border: none; min-height: calc(100vh - 60px);"
          background-color="#ffffff"
          text-color="#374151"
          active-text-color="#1e40af"
        >
          <template v-if="user.role === 1">
            <el-menu-item index="/dashboard/index">
              <el-icon><Monitor /></el-icon>
              <span>实时看板</span>
            </el-menu-item>
            <el-menu-item index="/workorders">
              <el-icon><Tickets /></el-icon>
              <span>工单管理</span>
            </el-menu-item>
            <el-menu-item index="/products">
              <el-icon><Goods /></el-icon>
              <span>产品管理</span>
            </el-menu-item>
            <el-menu-item index="/records">
              <el-icon><Document /></el-icon>
              <span>生产记录</span>
            </el-menu-item>
          </template>
          <template v-else>
            <el-menu-item index="/dashboard/index">
              <el-icon><Monitor /></el-icon>
              <span>实时看板</span>
            </el-menu-item>
            <el-menu-item index="/report">
              <el-icon><EditPen /></el-icon>
              <span>生产上报</span>
            </el-menu-item>
            <el-menu-item index="/records">
              <el-icon><Document /></el-icon>
              <span>生产记录</span>
            </el-menu-item>
          </template>
        </el-menu>
      </el-aside>
      <el-main style="padding: 0; background: #f0f2f5; overflow: auto;">
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessageBox, ElMessage } from 'element-plus'
import { Monitor, Tickets, Goods, Document, EditPen } from '@element-plus/icons-vue'

const route = useRoute()
const router = useRouter()
const user = ref(JSON.parse(localStorage.getItem('user') || '{}'))
const currentRoute = computed(() => route)
const activeMenu = computed(() => route.path)

onMounted(() => {
  window.addEventListener('storage', (e) => {
    if (e.key === 'user' && !e.newValue) {
      router.push('/login')
    }
  })
})

const handleLogout = () => {
  ElMessageBox.confirm('确定要退出登录吗？', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(() => {
    localStorage.removeItem('user')
    ElMessage.success('已退出登录')
    router.push('/login')
  }).catch(() => {})
}
</script>
