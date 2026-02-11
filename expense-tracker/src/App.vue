<template>
  <div id="app">
    <div class="app-container">
      <el-container>
        <el-header class="header">
          <h1 class="title">智能记账助手</h1>
        </el-header>

        <el-main>
          <!-- 输入区域 -->
          <div class="input-section">
            <el-card shadow="hover">
              <template #header>
                <div class="card-header">
                  <span>记账输入</span>
                  <el-tag type="info">支持自然语言输入</el-tag>
                </div>
              </template>
              <el-input
                v-model="inputText"
                type="textarea"
                :rows="3"
                placeholder="例如：昨天和朋友吃饭花了128，打车36&#10;或：这个月帮我总结一下都花在哪了"
                @keydown.enter.ctrl="handleInput"
                clearable
              />
              <div class="input-hints">
                <el-tag size="small" effect="plain" type="info">提示：按 Ctrl+Enter 快速提交</el-tag>
                <el-tag size="small" effect="plain">支持相对时间：今天、昨天、前天、上周、上个月</el-tag>
              </div>
              <div class="input-actions">
                <el-button type="primary" @click="handleInput" :loading="processing">
                  <el-icon><Check /></el-icon>提交记账
                </el-button>
                <el-button type="success" @click="analyzeExpense" :loading="analyzing">
                  <el-icon><DataAnalysis /></el-icon>消费分析
                </el-button>
              </div>
            </el-card>

            <!-- 解析结果展示 -->
            <div v-if="parsedResult" class="parsed-result">
              <el-card shadow="hover">
                <template #header>
                  <div class="card-header">
                    <span>解析结果</span>
                    <el-tag type="success" size="small">AI识别成功</el-tag>
                  </div>
                </template>
                <div class="result-list">
                  <div v-for="(item, index) in parsedResult" :key="index" class="result-item">
                    <div class="item-info">
                      <span class="item-amount">{{ item.amount }} 元</span>
                      <el-tag :type="getCategoryTagType(item.category)" size="small">
                        {{ getCategoryLabel(item.category) }}
                      </el-tag>
                      <span class="item-date">{{ item.date }}</span>
                    </div>
                    <div class="item-note">{{ item.note }}</div>
                  </div>
                </div>
              </el-card>
            </div>
          </div>

          <!-- 消费分析面板 -->
          <div v-if="analysisResult" class="analysis-section">
            <el-card shadow="hover">
              <template #header>
                <div class="card-header">
                  <span>消费分析</span>
                  <el-tag type="warning">{{ analysisResult.period }}</el-tag>
                </div>
              </template>

              <div class="analysis-content">
                <!-- 总览 -->
                <div class="summary">
                  <el-row :gutter="16">
                    <el-col :span="8">
                      <div class="summary-item total">
                        <div class="summary-label">总支出</div>
                        <div class="summary-value">{{ analysisResult.totalAmount }} 元</div>
                      </div>
                    </el-col>
                    <el-col :span="8">
                      <div class="summary-item count">
                        <div class="summary-label">笔数</div>
                        <div class="summary-value">{{ analysisResult.count }}</div>
                      </div>
                    </el-col>
                    <el-col :span="8">
                      <div class="summary-item avg">
                        <div class="summary-label">日均</div>
                        <div class="summary-value">{{ analysisResult.avgAmount }} 元</div>
                      </div>
                    </el-col>
                  </el-row>
                </div>

                <!-- 分类图表 -->
                <div class="charts">
                  <el-row :gutter="20">
                    <el-col :span="12">
                      <div class="chart-container">
                        <h3>分类占比</h3>
                        <div ref="pieChartRef" style="width: 100%; height: 300px;"></div>
                      </div>
                    </el-col>
                    <el-col :span="12">
                      <div class="chart-container">
                        <h3>消费趋势</h3>
                        <div ref="lineChartRef" style="width: 100%; height: 300px;"></div>
                      </div>
                    </el-col>
                  </el-row>
                </div>

                <!-- 分类详情 -->
                <div class="category-detail">
                  <h3>分类详情</h3>
                  <el-table :data="analysisResult.categoryDetail" style="width: 100%">
                    <el-table-column prop="category" label="分类" width="120">
                      <template #default="{ row }">
                        <el-tag :type="getCategoryTagType(row.category)" size="small">
                          {{ getCategoryLabel(row.category) }}
                        </el-tag>
                      </template>
                    </el-table-column>
                    <el-table-column prop="amount" label="金额" width="120" />
                    <el-table-column prop="count" label="笔数" width="100" />
                    <el-table-column prop="percentage" label="占比" width="100">
                      <template #default="{ row }">
                        {{ row.percentage }}%
                      </template>
                    </el-table-column>
                    <el-table-column label="进度">
                      <template #default="{ row }">
                        <el-progress :percentage="row.percentage" :color="getCategoryColor(row.category)" />
                      </template>
                    </el-table-column>
                  </el-table>
                </div>

                <!-- 文字总结 -->
                <div class="text-summary">
                  <h3>消费总结</h3>
                  <div class="summary-text">{{ analysisResult.summary }}</div>
                </div>
              </div>
            </el-card>
          </div>

          <!-- 账本记录 -->
          <div class="records-section">
            <el-card shadow="hover">
              <template #header>
                <div class="card-header">
                  <span>账本记录</span>
                  <div class="header-actions">
                    <el-date-picker
                      v-model="dateFilter"
                      type="month"
                      placeholder="选择月份"
                      @change="loadRecords"
                      format="YYYY年MM月"
                      value-format="YYYY-MM"
                      size="small"
                    />
                    <el-button type="danger" size="small" text @click="clearAllRecords">
                      <el-icon><Delete /></el-icon>清空
                    </el-button>
                  </div>
                </div>
              </template>

              <el-table :data="records" style="width: 100%" empty-text="暂无记账记录">
                <el-table-column prop="date" label="日期" width="120" sortable />
                <el-table-column prop="amount" label="金额" width="100" sortable :sort-method="sortAmount">
                  <template #default="{ row }">
                    <span class="amount">{{ row.amount }} 元</span>
                  </template>
                </el-table-column>
                <el-table-column prop="category" label="分类" width="100">
                  <template #default="{ row }">
                    <el-tag :type="getCategoryTagType(row.category)" size="small">
                      {{ getCategoryLabel(row.category) }}
                    </el-tag>
                  </template>
                </el-table-column>
                <el-table-column prop="note" label="备注" />
                <el-table-column label="操作" width="80" fixed="right">
                  <template #default="{ row, $index }">
                    <el-button type="danger" size="small" text @click="deleteRecord($index)">
                      <el-icon><Delete /></el-icon>
                    </el-button>
                  </template>
                </el-table-column>
              </el-table>
            </el-card>
          </div>
        </el-main>
      </el-container>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Check, DataAnalysis, Delete } from '@element-plus/icons-vue'
import * as echarts from 'echarts'
import dayjs from 'dayjs'

// 引入AI解析器
import { parseExpenseInput, analyzeExpenses } from './ai/parser.js'

// 数据
const inputText = ref('')
const processing = ref(false)
const analyzing = ref(false)
const parsedResult = ref(null)
const analysisResult = ref(null)
const records = ref([])
const dateFilter = ref(dayjs().format('YYYY-MM'))

// 图表引用
const pieChartRef = ref(null)
const lineChartRef = ref(null)
let pieChart = null
let lineChart = null

// 分类定义
const CATEGORIES = {
  food: { label: '餐饮', color: '#FF6B6B', tagType: 'danger' },
  transport: { label: '交通', color: '#4ECDC4', tagType: 'success' },
  shopping: { label: '购物', color: '#45B7D1', tagType: 'primary' },
  entertainment: { label: '娱乐', color: '#96CEB4', tagType: 'info' },
  housing: { label: '居住', color: '#FECA57', tagType: 'warning' },
  medical: { label: '医疗', color: '#FF9FF3', tagType: '' },
  education: { label: '教育', color: '#54A0FF', tagType: '' },
  other: { label: '其他', color: '#C4C4C4', tagType: 'info' }
}

// 获取分类标签
const getCategoryLabel = (category) => {
  return CATEGORIES[category]?.label || category
}

// 获取分类标签类型
const getCategoryTagType = (category) => {
  return CATEGORIES[category]?.tagType || 'info'
}

// 获取分类颜色
const getCategoryColor = (category) => {
  return CATEGORIES[category]?.color || '#C4C4C4'
}

// 处理输入
const handleInput = async () => {
  if (!inputText.value.trim()) {
    ElMessage.warning('请输入记账内容')
    return
  }

  // 检查是否是分析请求
  const analysisKeywords = ['总结', '分析', '统计', '花在哪', '消费', '支出']
  if (analysisKeywords.some(kw => inputText.value.includes(kw))) {
    await analyzeExpense()
    inputText.value = ''
    return
  }

  processing.value = true
  try {
    const result = parseExpenseInput(inputText.value)
    if (result && result.length > 0) {
      parsedResult.value = result

      // 保存到账本
      result.forEach(item => {
        records.value.unshift({
          date: item.date,
          amount: item.amount,
          category: item.category,
          note: item.note
        })
      })

      // 按日期排序
      records.value.sort((a, b) => dayjs(b.date).unix() - dayjs(a.date).unix())

      saveRecords()

      ElMessage.success(`成功添加 ${result.length} 条记账记录`)
      inputText.value = ''

      // 3秒后隐藏解析结果
      setTimeout(() => {
        parsedResult.value = null
      }, 3000)
    } else {
      ElMessage.warning('未能识别到有效的记账信息，请重新输入')
    }
  } catch (error) {
    ElMessage.error('解析失败：' + error.message)
  } finally {
    processing.value = false
  }
}

// 分析消费
const analyzeExpense = async () => {
  analyzing.value = true
  try {
    const period = inputText.value.match(/(本月|这个月|本月)/) ? 'month' :
                   inputText.value.match(/(本周|这周)/) ? 'week' : 'all'

    const allRecords = getAllRecords()
    const result = analyzeExpenses(allRecords, period)
    analysisResult.value = result

    // 等待DOM更新后渲染图表
    await nextTick()
    renderCharts(result)
  } catch (error) {
    ElMessage.error('分析失败：' + error.message)
  } finally {
    analyzing.value = false
  }
}

// 渲染图表
const renderCharts = (result) => {
  // 销毁旧图表
  if (pieChart) pieChart.dispose()
  if (lineChart) lineChart.dispose()

  // 饼图 - 分类占比
  if (pieChartRef.value) {
    pieChart = echarts.init(pieChartRef.value)
    pieChart.setOption({
      tooltip: {
        trigger: 'item',
        formatter: '{b}: {c}元 ({d}%)'
      },
      legend: {
        orient: 'vertical',
        left: 'left'
      },
      series: [
        {
          type: 'pie',
          radius: ['40%', '70%'],
          data: result.categoryDetail.map(item => ({
            name: getCategoryLabel(item.category),
            value: item.amount,
            itemStyle: { color: getCategoryColor(item.category) }
          })),
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowOffsetX: 0,
              shadowColor: 'rgba(0, 0, 0, 0.5)'
            }
          }
        }
      ]
    })
  }

  // 折线图 - 消费趋势
  if (lineChartRef.value) {
    lineChart = echarts.init(lineChartRef.value)
    lineChart.setOption({
      tooltip: {
        trigger: 'axis'
      },
      xAxis: {
        type: 'category',
        data: result.trendData.map(item => item.date)
      },
      yAxis: {
        type: 'value',
        name: '金额(元)'
      },
      series: [
        {
          type: 'line',
          data: result.trendData.map(item => item.amount),
          smooth: true,
          areaStyle: {
            color: {
              type: 'linear',
              x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(78, 205, 196, 0.5)' },
                { offset: 1, color: 'rgba(78, 205, 196, 0.1)' }
              ]
            }
          }
        }
      ]
    })
  }
}

// 保存记录到localStorage
const saveRecords = () => {
  localStorage.setItem('expense-records', JSON.stringify(records.value))
}

// 获取所有记录
const getAllRecords = () => {
  const saved = localStorage.getItem('expense-records')
  return saved ? JSON.parse(saved) : []
}

// 加载记录
const loadRecords = () => {
  const all = getAllRecords()
  if (dateFilter.value) {
    records.value = all.filter(r => r.date.startsWith(dateFilter.value))
  } else {
    records.value = all
  }
}

// 删除记录
const deleteRecord = async (index) => {
  try {
    await ElMessageBox.confirm('确定要删除这条记录吗？', '提示', {
      type: 'warning'
    })
    const record = records.value[index]
    const all = getAllRecords()
    const allIndex = all.findIndex(r =>
      r.date === record.date &&
      r.amount === record.amount &&
      r.category === record.category &&
      r.note === record.note
    )
    if (allIndex > -1) {
      all.splice(allIndex, 1)
      localStorage.setItem('expense-records', JSON.stringify(all))
    }
    records.value.splice(index, 1)
    ElMessage.success('删除成功')
  } catch {
    // 用户取消
  }
}

// 清空所有记录
const clearAllRecords = async () => {
  try {
    await ElMessageBox.confirm('确定要清空所有记录吗？此操作不可恢复！', '警告', {
      type: 'warning',
      confirmButtonText: '确定清空',
      cancelButtonText: '取消'
    })
    records.value = []
    localStorage.removeItem('expense-records')
    analysisResult.value = null
    ElMessage.success('已清空所有记录')
  } catch {
    // 用户取消
  }
}

// 金额排序
const sortAmount = (a, b) => {
  return a.amount - b.amount
}

// 窗口大小变化时重绘图表
const handleResize = () => {
  if (pieChart) pieChart.resize()
  if (lineChart) lineChart.resize()
}

onMounted(() => {
  loadRecords()
  window.addEventListener('resize', handleResize)
})

// 监听日期过滤变化
watch(dateFilter, () => {
  loadRecords()
})
</script>

<style scoped>
#app {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.app-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.header {
  text-align: center;
  padding: 20px 0;
}

.title {
  color: white;
  font-size: 28px;
  font-weight: 600;
  margin: 0;
}

.el-main {
  padding: 20px 0;
}

.el-card {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-actions {
  display: flex;
  gap: 10px;
  align-items: center;
}

.input-section {
  margin-bottom: 20px;
}

.input-hints {
  margin-top: 10px;
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.input-actions {
  margin-top: 15px;
  display: flex;
  gap: 10px;
}

.parsed-result {
  margin-top: 20px;
}

.result-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.result-item {
  padding: 12px;
  background: #f8f9fa;
  border-radius: 8px;
  border-left: 4px solid #4ECDC4;
}

.item-info {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 6px;
}

.item-amount {
  font-size: 18px;
  font-weight: 600;
  color: #FF6B6B;
}

.item-date {
  margin-left: auto;
  color: #999;
  font-size: 13px;
}

.item-note {
  color: #666;
  font-size: 13px;
}

.analysis-section {
  margin-top: 20px;
}

.summary {
  margin-bottom: 30px;
}

.summary-item {
  padding: 20px;
  border-radius: 8px;
  text-align: center;
  color: white;
}

.summary-item.total {
  background: linear-gradient(135deg, #FF6B6B 0%, #FF8E53 100%);
}

.summary-item.count {
  background: linear-gradient(135deg, #4ECDC4 0%, #44A08D 100%);
}

.summary-item.avg {
  background: linear-gradient(135deg, #45B7D1 0%, #2196F3 100%);
}

.summary-label {
  font-size: 14px;
  opacity: 0.9;
  margin-bottom: 8px;
}

.summary-value {
  font-size: 28px;
  font-weight: 700;
}

.charts {
  margin-bottom: 30px;
}

.chart-container h3 {
  text-align: center;
  margin-bottom: 15px;
  color: #333;
}

.category-detail {
  margin-bottom: 30px;
}

.category-detail h3 {
  text-align: center;
  margin-bottom: 20px;
  color: #333;
}

.amount {
  font-weight: 600;
  color: #FF6B6B;
}

.text-summary {
  background: #f8f9fa;
  padding: 20px;
  border-radius: 8px;
}

.text-summary h3 {
  text-align: center;
  margin-bottom: 15px;
  color: #333;
}

.summary-text {
  line-height: 1.8;
  color: #666;
}

.records-section h3 {
  text-align: center;
  margin-bottom: 15px;
}
</style>
