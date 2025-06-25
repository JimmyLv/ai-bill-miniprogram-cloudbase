Page({
  data: {
    records: [],
    groupedRecords: [],
    monthlyTotal: 0,
    totalCount: 0,
    activeFilter: 'all',
    filterOptions: [
      { key: 'all', name: '全部' },
      { key: '食物', name: '餐饮' },
      { key: '交通', name: '交通' },
      { key: '购物', name: '购物' },
      { key: '娱乐', name: '娱乐' },
      { key: '其他', name: '其他' }
    ],
    hasMore: true,
    loading: false,
    pageSize: 20,
    lastRecord: null
  },

  onLoad() {
    this.loadRecords()
  },

  onShow() {
    // 每次显示时刷新数据
    this.refreshData()
  },

  onPullDownRefresh() {
    this.refreshData()
  },

  // 刷新数据
  refreshData() {
    this.setData({
      records: [],
      groupedRecords: [],
      hasMore: true,
      lastRecord: null
    })
    this.loadRecords()
    wx.stopPullDownRefresh()
  },

  // 加载记录
  async loadRecords() {
    if (this.data.loading || !this.data.hasMore) return

    this.setData({ loading: true })

    try {
      const db = wx.cloud.database()
      const { activeFilter, pageSize, lastRecord, records } = this.data

      // 构建查询条件
      let whereCondition = {}
      
      // 添加分类筛选
      if (activeFilter !== 'all') {
        whereCondition.category = activeFilter
      }

      // 添加分页条件
      if (lastRecord) {
        whereCondition.createTime = db.command.lt(lastRecord.createTime)
      }

      console.log('查询条件:', whereCondition)

      const result = await db.collection('expenses')
        .where(whereCondition)
        .orderBy('createTime', 'desc')
        .limit(pageSize)
        .get()

      console.log('查询结果:', result)

      const newRecords = result.data.map(item => ({
        ...item,
        timeText: this.formatTime(item.date || item.createTime),
        amount: Number(item.amount).toFixed(2)
      }))

      // 更新数据
      const allRecords = [...records, ...newRecords]
      
      this.setData({
        records: allRecords,
        hasMore: newRecords.length === pageSize,
        lastRecord: newRecords[newRecords.length - 1],
        loading: false
      })

      // 分组和统计
      this.groupRecords(allRecords)
      this.calculateStats(allRecords)

    } catch (error) {
      console.error('加载记录失败:', error)
      this.setData({ loading: false })
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      })
    }
  },

  // 分组记录
  groupRecords(records) {
    const groups = {}
    
    records.forEach(record => {
      const dateField = record.date || record.createTime
      const dateKey = this.formatDate(dateField)
      if (!groups[dateKey]) {
        groups[dateKey] = {
          date: dateKey,
          dateText: this.formatDateText(dateField),
          records: [],
          total: 0
        }
      }
      groups[dateKey].records.push(record)
      groups[dateKey].total += Number(record.amount)
    })

    // 转换为数组并排序
    const groupedRecords = Object.values(groups)
      .map(group => ({
        ...group,
        total: group.total.toFixed(2)
      }))
      .sort((a, b) => new Date(b.date) - new Date(a.date))

    this.setData({ groupedRecords })
  },

  // 计算统计数据
  calculateStats(records) {
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    
    const monthlyRecords = records.filter(record => 
      new Date(record.date || record.createTime) >= monthStart
    )
    
    const monthlyTotal = monthlyRecords.reduce((sum, record) => 
      sum + Number(record.amount), 0
    )

    this.setData({
      monthlyTotal: monthlyTotal.toFixed(2),
      totalCount: records.length
    })
  },

  // 切换筛选器
  switchFilter(e) {
    const filter = e.currentTarget.dataset.filter
    if (filter === this.data.activeFilter) return

    this.setData({
      activeFilter: filter,
      records: [],
      groupedRecords: [],
      hasMore: true,
      lastRecord: null
    })

    this.loadRecords()
  },

  // 加载更多
  loadMore() {
    this.loadRecords()
  },

  // 格式化时间
  formatTime(date) {
    const recordDate = new Date(date)
    return `${recordDate.getHours().toString().padStart(2, '0')}:${recordDate.getMinutes().toString().padStart(2, '0')}`
  },

  // 格式化日期
  formatDate(date) {
    const d = new Date(date)
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  },

  // 格式化日期显示文本
  formatDateText(date) {
    const today = new Date()
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000)
    const recordDate = new Date(date)
    
    if (this.isSameDay(recordDate, today)) {
      return '今天'
    } else if (this.isSameDay(recordDate, yesterday)) {
      return '昨天'
    } else {
      return `${recordDate.getMonth() + 1}月${recordDate.getDate()}日`
    }
  },

  // 判断是否是同一天
  isSameDay(date1, date2) {
    return date1.toDateString() === date2.toDateString()
  },

  // 跳转到记账页面
  goToRecord() {
    wx.navigateTo({
      url: '/pages/record/record'
    })
  }
}) 