Page({
  data: {
    monthlyExpense: 0,
    dailyAverage: 0,
    totalDays: 0,
    monthlyChange: '',
    activeTimeFilter: 'month',
    timeFilters: [
      { key: 'week', name: '本周' },
      { key: 'month', name: '本月' },
      { key: 'year', name: '本年' }
    ],
    categoryStats: [],
    topRecords: []
  },

  onLoad() {
    this.loadStatistics()
  },

  onShow() {
    this.loadStatistics()
  },

  // 加载统计数据
  async loadStatistics() {
    try {
      const db = wx.cloud.database()
      const { activeTimeFilter } = this.data
      
      // 获取时间范围
      const timeRange = this.getTimeRange(activeTimeFilter)
      
      // 查询记录
      const result = await db.collection('expenses')
        .where({
          date: db.command.gte(timeRange.start).and(db.command.lte(timeRange.end))
        })
        .orderBy('createTime', 'desc')
        .get()

      const records = result.data

      // 计算统计数据
      this.calculateSummary(records, timeRange)
      this.calculateCategoryStats(records)
      this.getTopRecords(records)

    } catch (error) {
      console.error('加载统计数据失败:', error)
    }
  },

  // 获取时间范围
  getTimeRange(filter) {
    const now = new Date()
    let start, end

    switch (filter) {
      case 'week':
        const weekStart = new Date(now)
        weekStart.setDate(now.getDate() - 6)
        weekStart.setHours(0, 0, 0, 0)
        start = weekStart
        end = now
        break
      case 'month':
        start = new Date(now.getFullYear(), now.getMonth(), 1)
        end = now
        break
      case 'year':
        start = new Date(now.getFullYear(), 0, 1)
        end = now
        break
    }

    return { start, end }
  },

  // 计算汇总数据
  calculateSummary(records, timeRange) {
    const totalAmount = records.reduce((sum, record) => sum + Number(record.amount), 0)
    const days = Math.ceil((timeRange.end - timeRange.start) / (1000 * 60 * 60 * 24)) + 1
    const dailyAverage = days > 0 ? totalAmount / days : 0

    // 计算环比变化（简化实现）
    const changePercent = Math.random() * 20 - 10 // 模拟数据
    const monthlyChange = changePercent > 0 
      ? `+${changePercent.toFixed(1)}%` 
      : `${changePercent.toFixed(1)}%`

    this.setData({
      monthlyExpense: totalAmount.toFixed(2),
      dailyAverage: dailyAverage.toFixed(2),
      totalDays: days,
      monthlyChange
    })
  },

  // 计算类别统计
  calculateCategoryStats(records) {
    const categoryMap = {}
    const totalAmount = records.reduce((sum, record) => sum + Number(record.amount), 0)

    records.forEach(record => {
      const category = record.category
      if (!categoryMap[category]) {
        categoryMap[category] = {
          category,
          amount: 0,
          count: 0
        }
      }
      categoryMap[category].amount += Number(record.amount)
      categoryMap[category].count++
    })

    const categoryStats = Object.values(categoryMap)
      .map(item => ({
        ...item,
        amount: item.amount.toFixed(2),
        percent: totalAmount > 0 ? ((item.amount / totalAmount) * 100).toFixed(1) : 0
      }))
      .sort((a, b) => Number(b.amount) - Number(a.amount))

    this.setData({ categoryStats })
  },

  // 获取最大支出记录
  getTopRecords(records) {
    const topRecords = records
      .sort((a, b) => Number(b.amount) - Number(a.amount))
      .slice(0, 5)
      .map(record => ({
        ...record,
        amount: Number(record.amount).toFixed(2),
        dateText: this.formatDateText(record.date)
      }))

    this.setData({ topRecords })
  },

  // 切换时间筛选
  switchTimeFilter(e) {
    const filter = e.currentTarget.dataset.filter
    if (filter === this.data.activeTimeFilter) return

    this.setData({
      activeTimeFilter: filter
    })

    this.loadStatistics()
  },

  // 格式化日期显示
  formatDateText(date) {
    const d = new Date(date)
    return `${d.getMonth() + 1}月${d.getDate()}日`
  }
}) 