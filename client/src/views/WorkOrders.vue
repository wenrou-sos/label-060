<template>
  <div class="page-container">
    <div class="page-header">
      <div>
        <h2 class="page-title">📋 工单管理</h2>
        <p style="color: #6b7280; margin-top: 4px;">创建、编辑和管理所有生产工单</p>
      </div>
      <div style="display: flex; gap: 10px;">
        <el-button @click="handleExport">
          <el-icon><Download /></el-icon>
          <span style="margin-left: 4px;">导出数据</span>
        </el-button>
        <el-button type="primary" @click="handleCreate">
          <el-icon><Plus /></el-icon>
          <span style="margin-left: 4px;">新建工单</span>
        </el-button>
      </div>
    </div>

    <div class="stat-card" style="margin-bottom: 16px;">
      <div style="display: flex; gap: 16px; flex-wrap: wrap;">
        <el-select v-model="filter.status" placeholder="全部状态" clearable style="width: 160px;" @change="loadData">
          <el-option label="待生产" :value="0" />
          <el-option label="生产中" :value="1" />
          <el-option label="已完成" :value="2" />
          <el-option label="已暂停" :value="3" />
        </el-select>
        <el-select v-model="filter.line_id" placeholder="全部产线" clearable style="width: 180px;" @change="loadData">
          <el-option v-for="l in lines" :key="l.id" :label="l.line_name" :value="l.id" />
        </el-select>
        <el-input v-model="filter.keyword" placeholder="搜索工单号/产品" clearable style="width: 240px;" @clear="loadData" @keyup.enter="loadData" />
        <el-button type="primary" plain @click="loadData">查询</el-button>
      </div>
    </div>

    <div class="stat-card">
      <el-table :data="filteredOrders" v-loading="loading" stripe :header-cell-style="{ background: '#f9fafb' }">
        <el-table-column prop="order_no" label="工单号" width="150" fixed />
        <el-table-column prop="line_name" label="产线" width="110" />
        <el-table-column label="产品" min-width="200">
          <template #default="{ row }">
            <div style="font-weight: 500;">{{ row.product_name }}</div>
            <div style="font-size: 12px; color: #6b7280;">型号: {{ row.product_model }}</div>
          </template>
        </el-table-column>
        <el-table-column label="计划/完成/不良" width="200" align="center">
          <template #default="{ row }">
            <div style="font-weight: 600;">{{ row.plan_qty }} / <span style="color: #1e40af;">{{ row.completed_qty }}</span> / <span :style="{ color: row.defect_qty > 0 ? '#dc2626' : '#6b7280' }">{{ row.defect_qty }}</span></div>
            <div style="font-size: 12px; color: #9ca3af; margin-top: 2px;">单位: {{ row.unit }}</div>
          </template>
        </el-table-column>
        <el-table-column label="完成率" width="160">
          <template #default="{ row }">
            <div class="progress-bar-wrap">
              <el-progress :percentage="row.completion_rate" :stroke-width="12" :show-text="false"
                :color="row.completion_rate >= 100 ? '#10b981' : (row.completion_rate >= 50 ? '#3b82f6' : '#f59e0b')" style="flex: 1;" />
              <span style="font-size: 12px; font-weight: 600;">{{ row.completion_rate }}%</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="不良率" width="100" align="center">
          <template #default="{ row }">
            <el-tag v-if="row.defect_rate > 3" type="danger" size="small">{{ row.defect_rate }}%</el-tag>
            <el-tag v-else type="success" size="small">{{ row.defect_rate }}%</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="工时" width="90" align="center">
          <template #default="{ row }">{{ row.total_work_hours }}h</template>
        </el-table-column>
        <el-table-column label="状态" width="90" align="center">
          <template #default="{ row }">
            <span :class="['status-tag', 'status-' + row.status]">{{ statusText(row.status) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="指派/时间" width="180">
          <template #default="{ row }">
            <div style="font-size: 13px;">{{ row.assigned_by_name }}</div>
            <div style="font-size: 11px; color: #9ca3af;">{{ formatTime(row.created_at) }}</div>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="220" fixed="right" align="center">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click="handleDetail(row)">详情</el-button>
            <el-button type="warning" link size="small" @click="handleUpdateStatus(row)">状态</el-button>
            <el-button type="primary" link size="small" @click="handleEdit(row)" v-if="row.status === 0">编辑</el-button>
            <el-button type="danger" link size="small" @click="handleDelete(row)" v-if="row.status === 0">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
      <div v-if="!loading && filteredOrders.length === 0" style="text-align: center; padding: 60px; color: #9ca3af;">暂无工单数据</div>
    </div>

    <el-dialog v-model="dialogVisible" :title="formMode === 'create' ? '新建工单' : '编辑工单'" width="520px" destroy-on-close>
      <el-form :model="form" :rules="rules" ref="formRef" label-width="100px">
        <el-form-item label="产线" prop="line_id">
          <el-select v-model="form.line_id" placeholder="请选择产线" style="width: 100%;">
            <el-option v-for="l in lines" :key="l.id" :label="l.line_name + ' (' + l.line_code + ')'" :value="l.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="产品型号" prop="product_id">
          <el-select v-model="form.product_id" placeholder="请选择产品" style="width: 100%;" filterable>
            <el-option v-for="p in products" :key="p.id" :label="p.product_name + ' - ' + p.product_model" :value="p.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="计划数量" prop="plan_qty">
          <el-input-number v-model="form.plan_qty" :min="1" :max="99999" style="width: 100%;" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="form.remark" type="textarea" :rows="3" placeholder="可选" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitForm" :loading="submitting">确定</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="statusDialogVisible" title="更新工单状态" width="400px">
      <div style="margin-bottom: 16px;">
        <div style="margin-bottom: 8px; color: #374151;">工单: <strong>{{ currentOrder?.order_no }}</strong></div>
        <div style="color: #6b7280; font-size: 13px;">当前状态: <span :class="['status-tag', 'status-' + currentOrder?.status]">{{ statusText(currentOrder?.status) }}</span></div>
      </div>
      <el-radio-group v-model="newStatus" style="display: flex; flex-direction: column; gap: 10px;">
        <el-radio :value="0">待生产</el-radio>
        <el-radio :value="1">开始生产</el-radio>
        <el-radio :value="2">标记完成</el-radio>
        <el-radio :value="3">暂停</el-radio>
      </el-radio-group>
      <template #footer>
        <el-button @click="statusDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitStatus" :loading="submitting">确定</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="detailVisible" title="工单详情" width="680px" destroy-on-close>
      <div v-if="orderDetail" style="line-height: 1.8;">
        <el-descriptions :column="2" border size="small">
          <el-descriptions-item label="工单号">{{ orderDetail.order_no }}</el-descriptions-item>
          <el-descriptions-item label="状态">
            <span :class="['status-tag', 'status-' + orderDetail.status]">{{ statusText(orderDetail.status) }}</span>
          </el-descriptions-item>
          <el-descriptions-item label="产线">{{ orderDetail.line_name }} ({{ orderDetail.line_code }})</el-descriptions-item>
          <el-descriptions-item label="指派">{{ orderDetail.assigned_by_name }}</el-descriptions-item>
          <el-descriptions-item label="产品">{{ orderDetail.product_name }}</el-descriptions-item>
          <el-descriptions-item label="型号">{{ orderDetail.product_model }}</el-descriptions-item>
          <el-descriptions-item label="计划数量">{{ orderDetail.plan_qty }} {{ orderDetail.unit }}</el-descriptions-item>
          <el-descriptions-item label="已完成">{{ orderDetail.completed_qty }} {{ orderDetail.unit }}</el-descriptions-item>
          <el-descriptions-item label="不良数量">{{ orderDetail.defect_qty }} {{ orderDetail.unit }}</el-descriptions-item>
          <el-descriptions-item label="累计工时">{{ orderDetail.total_work_hours }} 小时</el-descriptions-item>
          <el-descriptions-item label="完成率">
            <el-tag type="primary" effect="plain">{{ orderDetail.completion_rate }}%</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="不良率">
            <el-tag :type="orderDetail.defect_rate > 3 ? 'danger' : 'success'" effect="plain">{{ orderDetail.defect_rate }}%</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="开始时间">{{ formatTime(orderDetail.start_time) }}</el-descriptions-item>
          <el-descriptions-item label="结束时间">{{ formatTime(orderDetail.end_time) }}</el-descriptions-item>
          <el-descriptions-item label="创建时间" :span="2">{{ formatTime(orderDetail.created_at) }}</el-descriptions-item>
          <el-descriptions-item label="备注" :span="2">{{ orderDetail.remark || '-' }}</el-descriptions-item>
        </el-descriptions>

        <h4 style="margin: 20px 0 12px;">📝 生产进度记录</h4>
        <el-table :data="orderRecords" size="small" border>
          <el-table-column label="序号" type="index" width="50" align="center" />
          <el-table-column prop="user_name" label="上报人" width="90" />
          <el-table-column prop="completed_qty" label="完成" width="70" align="center" />
          <el-table-column prop="defect_qty" label="不良" width="70" align="center">
            <template #default="{ row }">
              <span v-if="row.defect_qty > 0" style="color: #dc2626;">{{ row.defect_qty }}</span>
              <span v-else>0</span>
            </template>
          </el-table-column>
          <el-table-column prop="work_hours" label="工时" width="70" align="center" />
          <el-table-column prop="defect_reason" label="不良原因" min-width="120">
            <template #default="{ row }">{{ row.defect_reason || '-' }}</template>
          </el-table-column>
          <el-table-column prop="remark" label="备注" min-width="100">
            <template #default="{ row }">{{ row.remark || '-' }}</template>
          </el-table-column>
          <el-table-column label="时间" width="150">
            <template #default="{ row }">{{ formatTime(row.created_at) }}</template>
          </el-table-column>
        </el-table>
        <div v-if="orderRecords.length === 0" style="text-align: center; padding: 20px; color: #9ca3af;">暂无记录</div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Download } from '@element-plus/icons-vue'
import {
  getLines, getProducts,
  getWorkOrders, getWorkOrderDetail,
  createWorkOrder, updateWorkOrder, deleteWorkOrder,
  getRecords
} from '@/api/modules'

const user = JSON.parse(localStorage.getItem('user') || '{}')
const loading = ref(false)
const submitting = ref(false)
const lines = ref([])
const products = ref([])
const orders = ref([])
const filter = reactive({ status: '', line_id: '', keyword: '' })

const dialogVisible = ref(false)
const statusDialogVisible = ref(false)
const detailVisible = ref(false)
const formMode = ref('create')
const formRef = ref(null)
const currentOrder = ref(null)
const newStatus = ref(0)
const orderDetail = ref(null)
const orderRecords = ref([])

const form = reactive({ line_id: '', product_id: '', plan_qty: 100, remark: '' })
const rules = {
  line_id: [{ required: true, message: '请选择产线', trigger: 'change' }],
  product_id: [{ required: true, message: '请选择产品', trigger: 'change' }],
  plan_qty: [{ required: true, message: '请输入计划数量', trigger: 'blur' }]
}

const statusText = (s) => ['待生产', '生产中', '已完成', '已暂停'][s] || '未知'

const formatTime = (t) => {
  if (!t) return '-'
  const d = new Date(t)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const filteredOrders = computed(() => {
  if (!filter.keyword) return orders.value
  const kw = filter.keyword.toLowerCase()
  return orders.value.filter(o =>
    o.order_no.toLowerCase().includes(kw) ||
    (o.product_name || '').toLowerCase().includes(kw) ||
    (o.product_model || '').toLowerCase().includes(kw)
  )
})

const loadData = async () => {
  loading.value = true
  try {
    const params = {}
    if (filter.status !== '' && filter.status !== null && filter.status !== undefined) params.status = filter.status
    if (filter.line_id) params.line_id = filter.line_id
    const [o, l, p] = await Promise.all([getWorkOrders(params), getLines(), getProducts()])
    orders.value = o.data
    lines.value = l.data
    products.value = p.data
  } finally {
    loading.value = false
  }
}

const handleCreate = () => {
  formMode.value = 'create'
  Object.assign(form, { line_id: '', product_id: '', plan_qty: 100, remark: '' })
  dialogVisible.value = true
}

const handleEdit = (row) => {
  formMode.value = 'edit'
  Object.assign(form, {
    id: row.id,
    line_id: row.line_id,
    product_id: row.product_id,
    plan_qty: row.plan_qty,
    remark: row.remark || ''
  })
  dialogVisible.value = true
}

const submitForm = async () => {
  await formRef.value.validate()
  submitting.value = true
  try {
    if (formMode.value === 'create') {
      await createWorkOrder({ ...form, assigned_by: user.id })
      ElMessage.success('工单创建成功')
    } else {
      await updateWorkOrder(form.id, {
        line_id: form.line_id,
        product_id: form.product_id,
        plan_qty: form.plan_qty,
        remark: form.remark
      })
      ElMessage.success('更新成功')
    }
    dialogVisible.value = false
    loadData()
  } finally {
    submitting.value = false
  }
}

const handleDelete = async (row) => {
  await ElMessageBox.confirm(`确定删除工单 ${row.order_no}？`, '警告', { type: 'warning' })
  await deleteWorkOrder(row.id)
  ElMessage.success('删除成功')
  loadData()
}

const handleUpdateStatus = (row) => {
  currentOrder.value = row
  newStatus.value = row.status
  statusDialogVisible.value = true
}

const submitStatus = async () => {
  submitting.value = true
  try {
    await updateWorkOrder(currentOrder.value.id, { status: newStatus.value })
    ElMessage.success('状态已更新')
    statusDialogVisible.value = false
    loadData()
  } finally {
    submitting.value = false
  }
}

const handleDetail = async (row) => {
  try {
    const [d, r] = await Promise.all([getWorkOrderDetail(row.id), getRecords({ order_id: row.id, pageSize: 100 })])
    orderDetail.value = d.data
    orderRecords.value = r.data
    detailVisible.value = true
  } catch {}
}

const handleExport = () => {
  const header = '工单号,产线,产品名称,产品型号,计划数量,完成数量,不良数量,完成率,不良率,工时,状态,备注'
  const rows = filteredOrders.value.map(o => [
    o.order_no, o.line_name, o.product_name, o.product_model,
    o.plan_qty, o.completed_qty, o.defect_qty,
    o.completion_rate + '%', o.defect_rate + '%',
    o.total_work_hours, statusText(o.status), (o.remark || '').replace(/,/g, '，')
  ].join(','))
  const csv = '\uFEFF' + [header, ...rows].join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `工单数据_${new Date().toISOString().slice(0,10)}.csv`
  a.click()
}

onMounted(loadData)
</script>
