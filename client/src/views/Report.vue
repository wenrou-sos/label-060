<template>
  <div class="page-container">
    <div class="page-header">
      <div>
        <h2 class="page-title">✏️ 生产上报</h2>
        <p style="color: #6b7280; margin-top: 4px;">
          当前产线: <strong style="color: #1e40af;">{{ user.line_name || '-' }}</strong>
        </p>
      </div>
      <el-button type="primary" plain @click="loadData" :loading="loading">
        <el-icon><Refresh /></el-icon>
        <span style="margin-left: 4px;">刷新工单</span>
      </el-button>
    </div>

    <div v-if="activeOrders.length === 0 && !loading" style="text-align: center; padding: 80px 0; color: #9ca3af;">
      <div style="font-size: 48px; margin-bottom: 16px;">📭</div>
      <div>当前产线暂无生产中的工单</div>
      <div style="font-size: 13px; margin-top: 8px;">请联系车间主管分配工单</div>
    </div>

    <div class="kpi-grid">
      <div class="stat-card" v-for="order in activeOrders" :key="order.id"
           style="cursor: pointer; border: 2px solid transparent;"
           :style="selectedOrder?.id === order.id ? 'border-color: #1e40af;' : ''"
           @click="selectOrder(order)">
        <div class="stat-card-header">
          <div>
            <div class="stat-card-title" style="font-weight: 600; font-size: 15px;">{{ order.order_no }}</div>
            <div style="font-size: 12px; margin-top: 4px; color: #374151;">
              {{ order.product_name }} <span style="color: #6b7280;">({{ order.product_model }})</span>
            </div>
          </div>
          <div style="text-align: right;">
            <span :class="['status-tag', 'status-' + order.status]">{{ statusText(order.status) }}</span>
          </div>
        </div>
        <div style="margin-top: 10px;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 13px;">
            <span style="color: #6b7280;">进度</span>
            <span style="font-weight: 600;">{{ order.completed_qty }} / {{ order.plan_qty }} {{ order.unit }}</span>
          </div>
          <el-progress :percentage="order.completion_rate" :stroke-width="10"
            :color="order.completion_rate >= 100 ? '#10b981' : '#3b82f6'" />
          <div style="display: flex; justify-content: space-between; margin-top: 10px; font-size: 12px;">
            <span style="color: #6b7280;">完成率 <strong style="color: #111827;">{{ order.completion_rate }}%</strong></span>
            <span>
              <el-tag size="small" :type="order.defect_rate > 3 ? 'danger' : 'success'">不良 {{ order.defect_qty }} ({{ order.defect_rate }}%)</el-tag>
            </span>
          </div>
        </div>
        <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #f3f4f6;">
          <div style="display: flex; justify-content: space-between; font-size: 12px; color: #6b7280;">
            <span>开始时间: {{ formatTime(order.start_time) }}</span>
            <span>累计工时: {{ order.total_work_hours }}h</span>
          </div>
          <div v-if="order.remark" style="font-size: 12px; color: #92400e; margin-top: 4px;">
            备注: {{ order.remark }}</div>
        </div>
      </div>
    </div>

    <el-dialog v-model="reportVisible" title="📝 生产进度上报" width="520px" destroy-on-close>
      <div v-if="selectedOrder" style="margin-bottom: 16px; padding: 16px; background: #f9fafb; border-radius: 8px;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
          <div><strong>{{ selectedOrder.order_no }}</strong></div>
          <span :class="['status-tag', 'status-' + selectedOrder.status]">{{ statusText(selectedOrder.status) }}</span>
        </div>
        <div style="font-size: 13px; color: #374151;">
          {{ selectedOrder.product_name }} ({{ selectedOrder.product_model }})
        </div>
        <div style="font-size: 13px; margin-top: 4px; color: #6b7280;">
          已完成 <strong style="color: #1e40af;">{{ selectedOrder.completed_qty }}</strong> / {{ selectedOrder.plan_qty }} {{ selectedOrder.unit }}
          <span style="margin-left: 12px;">不良 <strong style="color: #dc2626;">{{ selectedOrder.defect_qty }}</strong></span>
        </div>
      </div>
      <el-form :model="reportForm" :rules="reportRules" ref="reportFormRef" label-width="100px">
        <el-form-item label="本次完成" prop="completed_qty">
          <el-input-number v-model="reportForm.completed_qty" :min="0" :max="99999" style="width: 100%;" />
          <div style="font-size: 12px; color: #6b7280; margin-top: 4px;">
            完成后总数将达到 {{ (selectedOrder?.completed_qty || 0) + reportForm.completed_qty }} {{ selectedOrder?.unit }}
          </div>
        </el-form-item>
        <el-form-item label="本次不良" prop="defect_qty">
          <el-input-number v-model="reportForm.defect_qty" :min="0" :max="9999" style="width: 100%;" />
        </el-form-item>
        <el-form-item label="工作工时" prop="work_hours">
          <el-input-number v-model="reportForm.work_hours" :min="0" :max="24" :step="0.5" :precision="1" style="width: 100%;" />
        </el-form-item>
        <el-form-item label="不良原因">
          <el-input v-model="reportForm.defect_reason" placeholder="如存在不良，请说明原因" type="textarea" :rows="2" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="reportForm.remark" placeholder="其他说明（可选）" type="textarea" :rows="2" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="reportVisible = false">取消</el-button>
        <el-button type="primary" @click="submitReport" :loading="submitting">确认上报</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Refresh } from '@element-plus/icons-vue'
import { getWorkOrders, submitRecord } from '@/api/modules'

const user = JSON.parse(localStorage.getItem('user') || '{}')
const loading = ref(false)
const submitting = ref(false)
const orders = ref([])
const selectedOrder = ref(null)
const reportVisible = ref(false)
const reportFormRef = ref(null)
const reportForm = reactive({
  completed_qty: 0, defect_qty: 0, work_hours: 0, defect_reason: '', remark: ''
})
const reportRules = {
  completed_qty: [{
    validator: (r, v, cb) => {
      if (v === 0 && reportForm.defect_qty === 0) {
        cb(new Error('完成数量和不良数量不能同时为0'))
      } else {
        cb()
      }
    }, trigger: 'blur'
  }],
  work_hours: [{ required: true, message: '请输入工作工时', trigger: 'blur' }]
}
let timer = null

const statusText = (s) => ['待生产', '生产中', '已完成', '已暂停'][s] || '未知'

const formatTime = (t) => {
  if (!t) return '-'
  const d = new Date(t)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const activeOrders = computed(() => orders.value.filter(o => o.status === 0 || o.status === 1))

const loadData = async () => {
  if (!user.line_id) {
    ElMessage.warning('您未分配到产线，请联系管理员')
    return
  }
  loading.value = true
  try {
    const res = await getWorkOrders({ line_id: user.line_id })
    orders.value = res.data
  } finally {
    loading.value = false
  }
}

const selectOrder = (order) => {
  if (order.status === 2) {
    ElMessage.info('该工单已完成')
    return
  }
  if (order.status === 3) {
    ElMessage.info('该工单已暂停')
    return
  }
  selectedOrder.value = order
  Object.assign(reportForm, { completed_qty: 0, defect_qty: 0, work_hours: 0, defect_reason: '', remark: '' })
  reportVisible.value = true
}

const submitReport = async () => {
  await reportFormRef.value.validate()
  if (reportForm.completed_qty + (selectedOrder.value?.completed_qty || 0) > selectedOrder.value.plan_qty) {
    await ElMessageBox.confirm(
      `上报后累计完成数将超过计划数量 (${selectedOrder.value.plan_qty})，是否继续？`,
      '数量超限提示', { type: 'warning' }
    )
  }
  submitting.value = true
  try {
    await submitRecord({
      order_id: selectedOrder.value.id,
      user_id: user.id,
      completed_qty: reportForm.completed_qty,
      defect_qty: reportForm.defect_qty,
      work_hours: reportForm.work_hours,
      defect_reason: reportForm.defect_reason || '',
      remark: reportForm.remark || ''
    })
    ElMessage.success('上报成功')
    reportVisible.value = false
    loadData()
  } finally {
    submitting.value = false
  }
}

onMounted(() => {
  loadData()
  timer = setInterval(loadData, 15000)
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
})
</script>
