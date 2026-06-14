<template>
  <div class="page-container">
    <div class="page-header">
      <div>
        <h2 class="page-title">📦 产品管理</h2>
        <p style="color: #6b7280; margin-top: 4px;">管理所有产品型号与规格信息</p>
      </div>
      <el-button type="primary" @click="handleCreate">
        <el-icon><Plus /></el-icon>
        <span style="margin-left: 4px;">新增产品</span>
      </el-button>
    </div>

    <div class="stat-card">
      <el-table :data="products" v-loading="loading" stripe :header-cell-style="{ background: '#f9fafb' }">
        <el-table-column type="index" label="#" width="60" align="center" />
        <el-table-column prop="product_name" label="产品名称" min-width="160" />
        <el-table-column prop="product_model" label="产品型号" width="160" />
        <el-table-column prop="specification" label="规格说明" min-width="260" />
        <el-table-column prop="unit" label="单位" width="100" align="center" />
        <el-table-column prop="created_at" label="创建时间" width="180">
          <template #default="{ row }">{{ formatTime(row.created_at) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="160" align="center" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click="handleEdit(row)">编辑</el-button>
            <el-button type="danger" link size="small" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <el-dialog v-model="dialogVisible" :title="formMode === 'create' ? '新增产品' : '编辑产品'" width="500px" destroy-on-close>
      <el-form :model="form" :rules="rules" ref="formRef" label-width="100px">
        <el-form-item label="产品名称" prop="product_name">
          <el-input v-model="form.product_name" placeholder="请输入产品名称" />
        </el-form-item>
        <el-form-item label="产品型号" prop="product_model">
          <el-input v-model="form.product_model" placeholder="请输入产品型号" />
        </el-form-item>
        <el-form-item label="规格说明" prop="specification">
          <el-input v-model="form.specification" type="textarea" :rows="3" placeholder="产品规格、参数说明" />
        </el-form-item>
        <el-form-item label="单位" prop="unit">
          <el-select v-model="form.unit" style="width: 100%;">
            <el-option label="件" value="件" />
            <el-option label="台" value="台" />
            <el-option label="副" value="副" />
            <el-option label="只" value="只" />
            <el-option label="个" value="个" />
            <el-option label="条" value="条" />
            <el-option label="套" value="套" />
            <el-option label="箱" value="箱" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitForm" :loading="submitting">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import { getProducts, createProduct, updateProduct, deleteProduct } from '@/api/modules'

const loading = ref(false)
const submitting = ref(false)
const products = ref([])

const dialogVisible = ref(false)
const formRef = ref(null)
const formMode = ref('create')

const form = reactive({ id: '', product_name: '', product_model: '', specification: '', unit: '件' })
const rules = {
  product_name: [{ required: true, message: '请输入产品名称', trigger: 'blur' }],
  product_model: [{ required: true, message: '请输入产品型号', trigger: 'blur' }]
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
    const res = await getProducts()
    products.value = res.data
  } finally {
    loading.value = false
  }
}

const handleCreate = () => {
  formMode.value = 'create'
  Object.assign(form, { id: '', product_name: '', product_model: '', specification: '', unit: '件' })
  dialogVisible.value = true
}

const handleEdit = (row) => {
  formMode.value = 'edit'
  Object.assign(form, {
    id: row.id,
    product_name: row.product_name,
    product_model: row.product_model,
    specification: row.specification || '',
    unit: row.unit || '件'
  })
  dialogVisible.value = true
}

const submitForm = async () => {
  await formRef.value.validate()
  submitting.value = true
  try {
    if (formMode.value === 'create') {
      await createProduct({
        product_name: form.product_name,
        product_model: form.product_model,
        specification: form.specification,
        unit: form.unit
      })
      ElMessage.success('新增成功')
    } else {
      await updateProduct(form.id, {
        product_name: form.product_name,
        product_model: form.product_model,
        specification: form.specification,
        unit: form.unit
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
  await ElMessageBox.confirm(`确定删除产品「${row.product_name}」?`, '警告', { type: 'warning' })
  await deleteProduct(row.id)
  ElMessage.success('删除成功')
  loadData()
}

onMounted(loadData)
</script>
