import axios from 'axios'
import { ElMessage } from 'element-plus'
import router from '@/router'

const api = axios.create({
  baseURL: '/api',
  timeout: 10000
})

api.interceptors.request.use(
  config => {
    const user = localStorage.getItem('user')
    if (user) {
      config.headers['x-user-id'] = JSON.parse(user).id
    }
    return config
  },
  error => Promise.reject(error)
)

api.interceptors.response.use(
  response => {
    if (response.data.success === false) {
      ElMessage.error(response.data.message || '请求失败')
      return Promise.reject(response.data)
    }
    return response.data
  },
  error => {
    if (error.response?.status === 401) {
      localStorage.removeItem('user')
      router.push('/login')
    }
    ElMessage.error(error.response?.data?.message || error.message || '网络错误')
    return Promise.reject(error)
  }
)

export default api
