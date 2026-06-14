<template>
  <div class="login-container">
    <div class="login-box">
      <h1 class="login-title">🏭 生产工单跟踪系统</h1>
      <p class="login-subtitle">Production Order Tracking System</p>
      <el-form :model="form" :rules="rules" ref="formRef" label-width="80px">
        <el-form-item label="用户名" prop="username">
          <el-input v-model="form.username" placeholder="请输入用户名" size="large" />
        </el-form-item>
        <el-form-item label="密码" prop="password">
          <el-input v-model="form.password" type="password" placeholder="请输入密码" size="large" show-password />
        </el-form-item>
        <el-form-item label="角色">
          <el-tag type="info" v-if="showAccount">
            主管 admin/123456 | 操作工 worker01/123456
          </el-tag>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" size="large" style="width: 100%" @click="handleLogin" :loading="loading">
            登 录
          </el-button>
        </el-form-item>
      </el-form>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { login } from '@/api/modules'

const router = useRouter()
const formRef = ref(null)
const loading = ref(false)
const showAccount = ref(true)
const form = reactive({
  username: '',
  password: ''
})
const rules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }]
}

const handleLogin = async () => {
  await formRef.value.validate()
  loading.value = true
  try {
    const res = await login(form)
    localStorage.setItem('user', JSON.stringify(res.data))
    ElMessage.success(res.message)
    if (res.data.role === 1) {
      router.push('/dashboard')
    } else {
      router.push('/report')
    }
  } finally {
    loading.value = false
  }
}
</script>
