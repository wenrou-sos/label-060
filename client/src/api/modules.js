import api from './index'

export const login = (data) => api.post('/users/login', data)

export const getLines = () => api.get('/lines')

export const getProducts = () => api.get('/products')

export const createProduct = (data) => api.post('/products', data)

export const updateProduct = (id, data) => api.put(`/products/${id}`, data)

export const deleteProduct = (id) => api.delete(`/products/${id}`)

export const getWorkOrders = (params) => api.get('/workorders', { params })

export const getWorkOrderDetail = (id) => api.get(`/workorders/${id}`)

export const createWorkOrder = (data) => api.post('/workorders', data)

export const updateWorkOrder = (id, data) => api.put(`/workorders/${id}`, data)

export const deleteWorkOrder = (id) => api.delete(`/workorders/${id}`)

export const getRecords = (params) => api.get('/records', { params })

export const submitRecord = (data) => api.post('/records', data)

export const getUsers = (params) => api.get('/users', { params })

export const getOverviewStats = () => api.get('/stats/overview')

export const getLineStats = () => api.get('/stats/by-line')

export const getOrdersRank = (limit = 10) => api.get('/stats/orders-rank', { params: { limit } })

export const getRecentRecords = (limit = 20) => api.get('/stats/recent-records', { params: { limit } })
