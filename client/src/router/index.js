import { createRouter, createWebHashHistory } from 'vue-router'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/Login.vue'),
    meta: { title: '登录' }
  },
  {
    path: '/',
    redirect: '/dashboard'
  },
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: () => import('@/views/layout/Layout.vue'),
    redirect: '/dashboard/index',
    children: [
      {
        path: 'index',
        name: 'DashboardIndex',
        component: () => import('@/views/Dashboard.vue'),
        meta: { title: '实时看板', roles: [1, 2] }
      }
    ]
  },
  {
    path: '/workorders',
    component: () => import('@/views/layout/Layout.vue'),
    children: [
      {
        path: '',
        name: 'WorkOrders',
        component: () => import('@/views/WorkOrders.vue'),
        meta: { title: '工单管理', roles: [1] }
      }
    ]
  },
  {
    path: '/products',
    component: () => import('@/views/layout/Layout.vue'),
    children: [
      {
        path: '',
        name: 'Products',
        component: () => import('@/views/Products.vue'),
        meta: { title: '产品管理', roles: [1] }
      }
    ]
  },
  {
    path: '/report',
    component: () => import('@/views/layout/Layout.vue'),
    children: [
      {
        path: '',
        name: 'Report',
        component: () => import('@/views/Report.vue'),
        meta: { title: '生产上报', roles: [2] }
      }
    ]
  },
  {
    path: '/records',
    component: () => import('@/views/layout/Layout.vue'),
    children: [
      {
        path: '',
        name: 'Records',
        component: () => import('@/views/Records.vue'),
        meta: { title: '生产记录', roles: [1, 2] }
      }
    ]
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

router.beforeEach((to, from, next) => {
  const userStr = localStorage.getItem('user')
  const user = userStr ? JSON.parse(userStr) : null

  if (to.path === '/login') {
    if (user) {
      next(user.role === 1 ? '/dashboard' : '/report')
    } else {
      next()
    }
    return
  }

  if (!user) {
    next('/login')
    return
  }

  if (to.meta.roles && !to.meta.roles.includes(user.role)) {
    next(user.role === 1 ? '/dashboard' : '/report')
    return
  }

  next()
})

export default router
