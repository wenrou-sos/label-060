<template>
  <div class="page-container">
    <div class="page-header">
      <div>
        <h2 class="page-title">📊 实时看板</h2>
        <p style="color: #6b7280; margin-top: 4px;">生产数据实时监控与统计分析</p>
      </div>
      <el-button type="primary" @click="loadData" :loading="loading">
        <el-icon><Refresh /></el-icon>
        <span style="margin-left: 4px;">刷新数据</span>
      </el-button>
    </div>

    <div class="kpi-grid">
      <div class="stat-card">
        <div class="stat-card-header">
          <div>
            <div class="stat-card-title">总工单数</div>
            <div class="stat-card-value">{{ overview.total_orders }}</div>
          </div>
          <div class="stat-card-icon" style="background: #dbeafe; color: #1e40af;">📋</div>
        </div>
        <div style="display: flex; gap: 10px; margin-top: 10px;">
          <el-tag size="small" type="warning" effect="light">待生产 {{ overview.pending_orders }}</el-tag>
          <el-tag size="small" type="primary" effect="light">生产中 {{ overview.in_progress_orders }}</el-tag>
          <el-tag size="small" type="success" effect="light">已完成 {{ overview.completed_orders }}</el-tag>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-card-header">
          <div>
            <div class="stat-card-title">计划总数</div>
            <div class="stat-card-value">{{ overview.total_plan_qty.toLocaleString() }}</div>
          </div>
          <div class="stat-card-icon" style="background: #fef3c7; color: #92400e;">📦</div>
        </div>
        <div style="color: #6b7280; font-size: 13px; margin-top: 10px;">件/台/副等</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-header">
          <div>
            <div class="stat-card-title">完成率</div>
            <div class="stat-card-value" style="color: #1e40af;">{{ overview.total_completion_rate }}%</div>
          </div>
          <div class="stat-card-icon" style="background: #d1fae5; color: #065f46;">✅</div>
        </div>
        <el-progress :percentage="overview.total_completion_rate" :stroke-width="8" :show-text="false" style="margin-top: 10px;" />
      </div>
      <div class="stat-card">
        <div class="stat-card-header">
          <div>
            <div class="stat-card-title">不良率</div>
            <div class="stat-card-value" :style="{ color: overview.total_defect_rate > 3 ? '#dc2626' : '#059669' }">{{ overview.total_defect_rate }}%</div>
          </div>
          <div class="stat-card-icon" :style="{ background: overview.total_defect_rate > 3 ? '#fee2e2' : '#d1fae5', color: overview.total_defect_rate > 3 ? '#991b1b' : '#065f46' }">⚠️</div>
        </div>
        <div style="display: flex; justify-content: space-between; font-size: 13px; margin-top: 10px;">
          <span style="color: #6b7280;">不良数</span>
          <span style="color: #dc2626; font-weight: 600;">{{ overview.total_defect_qty.toLocaleString() }}</span>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-card-header">
          <div>
            <div class="stat-card-title">累计工时</div>
            <div class="stat-card-value">{{ overview.total_work_hours.toLocaleString() }}<span style="font-size: 14px; color: #6b7280; font-weight: normal;"> h</span></div>
          </div>
          <div class="stat-card-icon" style="background: #ede9fe; color: #6d28d9;">⏱️</div>
        </div>
        <div style="display: flex; justify-content: space-between; font-size: 13px; margin-top: 10px;">
          <span style="color: #6b7280;">已完成数量</span>
          <span style="font-weight: 600;">{{ overview.total_completed_qty.toLocaleString() }}</span>
        </div>
      </div>
    </div>

    <div class="chart-row">
      <div class="stat-card">
        <div class="page-header" style="margin-bottom: 16px;">
          <h3 style="font-size: 16px; font-weight: 600;">📈 各产线完成情况</h3>
        </div>
        <div class="bar-chart">
          <div class="bar-item" v-for="line in lineStats" :key="line.line_id">
            <div class="bar-label">{{ line.line_name }}</div>
            <div class="bar-track">
              <div class="bar-fill" :style="{ width: line.completion_rate + '%', background: getBarColor(line.completion_rate) }"></div>
              <span class="bar-text">{{ line.completion_rate }}%</span>
            </div>
            <div style="width: 120px; display: flex; justify-content: flex-end; gap: 8px; font-size: 12px;">
              <span style="color: #059669;">不良率 {{ line.defect_rate }}%</span>
            </div>
          </div>
          <div v-if="lineStats.length === 0" style="text-align: center; padding: 40px; color: #9ca3af;">暂无数据</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="page-header" style="margin-bottom: 16px;">
          <h3 style="font-size: 16px; font-weight: 600;">🏆 工单完成率排行</h3>
        </div>
        <el-table :data="ordersRank" size="small" :header-cell-style="{ background: '#f9fafb' }">
          <el-table-column type="index" label="#" width="50" align="center" />
          <el-table-column prop="order_no" label="工单" width="140" />
          <el-table-column prop="line_name" label="产线" width="100" />
          <el-table-column label="进度" width="160">
            <template #default="{ row }">
              <div class="progress-bar-wrap">
                <el-progress :percentage="row.completion_rate" :stroke-width="12" :show-text="false" style="flex: 1;" />
                <span style="font-size: 12px; color: #374151; font-weight: 600;">{{ row.completion_rate }}%</span>
              </div>
            </template>
          </el-table-column>
          <el-table-column label="不良率" width="90" align="center">
            <template #default="{ row }">
              <el-tag :type="row.defect_rate > 3 ? 'danger' : 'success'" size="small">{{ row.defect_rate }}%</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="状态" width="80" align="center">
            <template #default="{ row }">
              <span :class="['status-tag', 'status-' + row.status]">{{ statusText(row.status) }}</span>
            </template>
          </el-table-column>
        </el-table>
        <div v-if="ordersRank.length === 0" style="text-align: center; padding: 40px; color: #9ca3af;">暂无数据</div>
      </div>
    </div>

    <div class="stat-card">
      <div class="page-header" style="margin-bottom: 16px;">
        <h3 style="font-size: 16px; font-weight: 600;">🕐 最近生产记录</h3>
      </div>
      <el-table :data="recentRecords" size="small" :header-cell-style="{ background: '#f9fafb' }">
        <el-table-column prop="order_no" label="工单号" width="150" />
        <el-table-column prop="line_name" label="产线" width="110" />
        <el-table-column label="产品" min-width="180">
          <template #default="{ row }">
            {{ row.product_name }} <span style="color: #6b7280;">({{ row.product_model }})</span>
          </template>
        </el-table-column>
        <el-table-column prop="user_name" label="上报人" width="90" />
        <el-table-column prop="completed_qty" label="完成数" width="80" align="center" />
        <el-table-column prop="defect_qty" label="不良数" width="80" align="center">
          <template #default="{ row }">
            <span v-if="row.defect_qty > 0" style="color: #dc2626; font-weight: 600;">{{ row.defect_qty }}</span>
            <span v-else style="color: #9ca3af;">0</span>
          </template>
        </el-table-column>
        <el-table-column prop="work_hours" label="工时(h)" width="80" align="center" />
        <el-table-column prop="defect_reason" label="不良原因" min-width="140">
          <template #default="{ row }">
            <span v-if="row.defect_reason" style="color: #92400e;">{{ row.defect_reason }}</span>
            <span v-else style="color: #d1d5db;">-</span>
          </template>
        </el-table-column>
        <el-table-column prop="created_at" label="时间" width="160">
          <template #default="{ row }">{{ formatTime(row.created_at) }}</template>
        </el-table-column>
      </el-table>
      <div v-if="recentRecords.length === 0" style="text-align: center; padding: 40px; color: #9ca3af;">暂无数据</div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { Refresh } from '@element-plus/icons-vue'
import { getOverviewStats, getLineStats, getOrdersRank, getRecentRecords } from '@/api/modules'

const loading = ref(false)
const overview = ref({
  total_orders: 0, pending_orders: 0, in_progress_orders: 0, completed_orders: 0,
  total_plan_qty: 0, total_completed_qty: 0, total_defect_qty: 0, total_work_hours: 0,
  total_completion_rate: 0, total_defect_rate: 0
})
const lineStats = ref([])
const ordersRank = ref([])
const recentRecords = ref([])
let timer = null

const statusText = (s) => ['待生产', '生产中', '已完成', '已暂停'][s] || '未知'

const getBarColor = (rate) => {
  if (rate >= 80) return '#10b981'
  if (rate >= 50) return '#3b82f6'
  if (rate >= 20) return '#f59e0b'
  return '#ef4444'
}

const formatTime = (t) => {
  if (!t) return '-'
  const d = new Date(t)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const loadData = async () => {
  loading.value = true
  try {
    const [o, l, r, rr] = await Promise.all([
      getOverviewStats(),
      getLineStats(),
      getOrdersRank(8),
      getRecentRecords(10)
    ])
    overview.value = o.data
    lineStats.value = l.data
    ordersRank.value = r.data
    recentRecords.value = rr.data
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadData()
  timer = setInterval(loadData, 30000)
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
})
</script>
