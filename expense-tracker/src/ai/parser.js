/**
 * AI 解析器 - 自然语言记账输入解析
 * 支持识别金额、分类、时间等信息
 */

import dayjs from 'dayjs'

/**
 * 分类关键词映射
 */
const CATEGORY_KEYWORDS = {
  food: ['饭', '吃', '餐厅', '食堂', '外卖', '零食', '饮料', '咖啡', '奶茶', '早餐', '午餐', '晚餐', '宵夜', '聚餐', '宴请', '买菜', '生鲜', '水果', '超市', '烧烤', '火锅', '炸鸡'],
  transport: ['打车', '滴滴', '出租', '公交', '地铁', '火车', '高铁', '飞机', '机票', '汽油', '油费', '停车', '高速', '网约车', '车费', '交通'],
  shopping: ['买', '购', '商城', '淘宝', '京东', '拼多多', '网购', '衣服', '鞋子', '包包', '化妆品', '护肤品', '数码', '电脑', '手机', '家电', '家具', '日用品', '百货'],
  entertainment: ['电影', '游戏', 'KTV', '酒吧', '夜店', '游乐场', '景点', '旅游', '度假', '酒店', '演唱会', '票', '娱乐', '休闲'],
  housing: ['房租', '水电', '燃气', '物业', '宽带', '话费', '网费', '装修', '维修', '居住'],
  medical: ['医院', '药店', '药', '看病', '体检', '医疗', '治疗', '挂号', '检查'],
  education: ['书', '课程', '培训', '学习', '学费', '考试', '资料', '教育']
}

/**
 * 时间关键词映射
 */
const TIME_KEYWORDS = {
  today: ['今天', '今日'],
  yesterday: ['昨天', '昨日'],
  dayBeforeYesterday: ['前天'],
  thisWeek: ['本周', '这周'],
  lastWeek: ['上周'],
  thisMonth: ['本月', '这个月', '这月'],
  lastMonth: ['上月', '上个月']
}

/**
 * 解析日期
 * @param {string} text - 输入文本
 * @returns {string} 格式化后的日期 YYYY-MM-DD
 */
function parseDate(text) {
  const today = dayjs()

  // 检查是否包含时间关键词
  for (const [key, keywords] of Object.entries(TIME_KEYWORDS)) {
    for (const keyword of keywords) {
      if (text.includes(keyword)) {
        switch (key) {
          case 'today':
            return today.format('YYYY-MM-DD')
          case 'yesterday':
            return today.subtract(1, 'day').format('YYYY-MM-DD')
          case 'dayBeforeYesterday':
            return today.subtract(2, 'days').format('YYYY-MM-DD')
        }
      }
    }
  }

  // 尝试解析具体日期格式
  const datePatterns = [
    /(\d{4})[-/年](\d{1,2})[-/月](\d{1,2})日?/,
    /(\d{1,2})[-/月](\d{1,2})日?/,
    /(\d{1,2})\/(\d{1,2})\/(\d{4})/,
    /(\d{1,2})\/(\d{1,2})/
  ]

  for (const pattern of datePatterns) {
    const match = text.match(pattern)
    if (match) {
      const groups = match.slice(1).map(g => parseInt(g))
      let date
      if (groups.length === 3) {
        date = dayjs(new Date(groups[0], groups[1] - 1, groups[2]))
      } else if (groups.length === 2) {
        date = dayjs(new Date(today.year(), groups[0] - 1, groups[1]))
      }
      return date.format('YYYY-MM-DD')
    }
  }

  // 默认返回今天
  return today.format('YYYY-MM-DD')
}

/**
 * 解析分类
 * @param {string} text - 输入文本
 * @returns {string} 分类代码
 */
function parseCategory(text) {
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const keyword of keywords) {
      if (text.includes(keyword)) {
        return category
      }
    }
  }
  return 'other'
}

/**
 * 提取备注（去除金额、分类、时间等已识别的信息）
 * @param {string} text - 原始文本
 * @param {Array} amounts - 金额数组
 * @returns {string} 备注内容
 */
function extractNote(text, amounts) {
  let note = text

  // 移除金额
  amounts.forEach(amount => {
    const amountPatterns = [
      `${amount}元`,
      `${amount} 元`,
      `花了${amount}`,
      `付了${amount}`,
      `支出${amount}`
    ]
    amountPatterns.forEach(pattern => {
      note = note.replace(pattern, '')
    })
  })

  // 移除分类关键词
  Object.values(CATEGORY_KEYWORDS).flat().forEach(keyword => {
    note = note.replace(keyword, '')
  })

  // 移除时间关键词
  Object.values(TIME_KEYWORDS).flat().forEach(keyword => {
    note = note.replace(keyword, '')
  })

  // 移除常见动词
  const verbs = ['花了', '付了', '消费了', '用了', '是', '和', '一起', '跟', '同']
  verbs.forEach(verb => {
    note = note.replace(verb, '')
  })

  // 清理空白字符
  note = note.trim()

  // 如果备注为空或太短，根据分类生成默认备注
  if (note.length < 2) {
    const category = parseCategory(text)
    const defaultNotes = {
      food: '餐饮消费',
      transport: '交通出行',
      shopping: '购物消费',
      entertainment: '娱乐消费',
      housing: '居住支出',
      medical: '医疗支出',
      education: '教育支出',
      other: '其他支出'
    }
    return defaultNotes[category] || '其他支出'
  }

  return note
}

/**
 * 解析自然语言记账输入
 * @param {string} input - 用户输入的自然语言
 * @returns {Array} 解析结果数组
 */
export function parseExpenseInput(input) {
  const results = []

  // 提取所有金额（支持小数）
  const amountPattern = /(\d+(?:\.\d{1,2})?)/g
  const amountMatches = input.match(amountPattern)

  if (!amountMatches || amountMatches.length === 0) {
    return results
  }

  // 解析日期
  const date = parseDate(input)

  // 如果只有一个金额
  if (amountMatches.length === 1) {
    const amount = parseFloat(amountMatches[0])
    if (amount <= 0) return results

    const category = parseCategory(input)
    const note = extractNote(input, [amount])

    results.push({
      date,
      amount,
      category,
      note
    })
  } else {
    // 多个金额的情况，尝试分割文本
    let remainingText = input

    amountMatches.forEach((amountStr, index) => {
      const amount = parseFloat(amountStr)
      if (amount <= 0) return

      // 找到这个金额在原文中的位置
      const amountIndex = remainingText.indexOf(amountStr)
      if (amountIndex === -1) return

      // 提取这个金额前面的文本作为上下文
      const contextStart = Math.max(0, amountIndex - 50)
      const contextEnd = Math.min(remainingText.length, amountIndex + 50)
      const context = remainingText.substring(contextStart, contextEnd)

      const category = parseCategory(context)
      const note = extractNote(context, [amount])

      results.push({
        date,
        amount,
        category,
        note
      })

      // 移除已处理的部分
      remainingText = remainingText.substring(contextEnd)
    })
  }

  return results
}

/**
 * 分析消费数据
 * @param {Array} records - 消费记录数组
 * @param {string} period - 分析周期: 'all', 'week', 'month'
 * @returns {Object} 分析结果
 */
export function analyzeExpenses(records, period = 'all') {
  const today = dayjs()
  let filteredRecords = [...records]

  // 根据周期筛选
  if (period === 'week') {
    const weekAgo = today.subtract(7, 'days')
    filteredRecords = records.filter(r => dayjs(r.date).isAfter(weekAgo))
  } else if (period === 'month') {
    const monthStart = today.startOf('month')
    filteredRecords = records.filter(r => dayjs(r.date).isAfter(monthStart.subtract(1, 'day')))
  }

  if (filteredRecords.length === 0) {
    return {
      period: period === 'all' ? '全部时间' : period === 'week' ? '近7天' : '本月',
      totalAmount: 0,
      count: 0,
      avgAmount: 0,
      categoryDetail: [],
      trendData: [],
      summary: '暂无消费数据'
    }
  }

  // 计算总金额和笔数
  const totalAmount = filteredRecords.reduce((sum, r) => sum + r.amount, 0)
  const count = filteredRecords.length
  const avgAmount = Math.round(totalAmount / count * 100) / 100

  // 按分类汇总
  const categoryMap = {}
  filteredRecords.forEach(r => {
    if (!categoryMap[r.category]) {
      categoryMap[r.category] = { amount: 0, count: 0 }
    }
    categoryMap[r.category].amount += r.amount
    categoryMap[r.category].count += 1
  })

  // 按金额排序分类
  const categoryDetail = Object.entries(categoryMap)
    .map(([category, data]) => ({
      category,
      amount: Math.round(data.amount * 100) / 100,
      count: data.count,
      percentage: Math.round(data.amount / totalAmount * 100)
    }))
    .sort((a, b) => b.amount - a.amount)

  // 计算消费趋势（按日期汇总）
  const dateMap = {}
  filteredRecords.forEach(r => {
    if (!dateMap[r.date]) {
      dateMap[r.date] = 0
    }
    dateMap[r.date] += r.amount
  })

  const trendData = Object.entries(dateMap)
    .map(([date, amount]) => ({
      date: dayjs(date).format('MM-DD'),
      amount: Math.round(amount * 100) / 100
    }))
    .sort((a, b) => dayjs(a.date, 'MM-DD').unix() - dayjs(b.date, 'MM-DD').unix())

  // 生成文字总结
  const summary = generateSummary(filteredRecords, totalAmount, categoryDetail, period)

  return {
    period: period === 'all' ? '全部时间' : period === 'week' ? '近7天' : '本月',
    totalAmount: Math.round(totalAmount * 100) / 100,
    count,
    avgAmount,
    categoryDetail,
    trendData,
    summary
  }
}

/**
 * 生成消费总结文字
 */
function generateSummary(records, totalAmount, categoryDetail, period) {
  if (records.length === 0) {
    return '暂无消费数据。'
  }

  const topCategory = categoryDetail[0]
  const periodText = period === 'all' ? '累计' : period === 'week' ? '近7天' : '本月'

  let summary = `${periodText}共消费 ${totalAmount} 元，共 ${records.length} 笔，日均 ${Math.round(totalAmount / records.length * 100) / 100} 元。`

  if (topCategory) {
    summary += `支出最多的是 ${topCategory.category} 类，共 ${topCategory.amount} 元，占比 ${topCategory.percentage}%。`
  }

  if (categoryDetail.length > 1) {
    const secondCategory = categoryDetail[1]
    summary += `其次是 ${secondCategory.category} 类，${secondCategory.amount} 元。`
  }

  return summary
}
