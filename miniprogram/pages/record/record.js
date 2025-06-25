const app = getApp()

Page({
  data: {
    amount: '',
    selectedCategory: '',
    description: '',
    date: '',
    dateText: '',
    amountFocus: true,
    categories: [
      { key: '食物', name: '餐饮', icon: '/images/category-food.png' },
      { key: '交通', name: '交通', icon: '/images/category-transport.png' },
      { key: '购物', name: '购物', icon: '/images/category-shopping.png' },
      { key: '娱乐', name: '娱乐', icon: '/images/category-entertainment.png' },
      { key: '医疗', name: '医疗', icon: '/images/category-medical.png' },
      { key: '教育', name: '教育', icon: '/images/category-education.png' },
      { key: '居住', name: '居住', icon: '/images/category-housing.png' },
      { key: '其他', name: '其他', icon: '/images/category-other.png' }
    ],
    canSave: false,
    showVoiceModal: false,
    isRecording: false,
    voiceText: '',
    voiceStatus: {
      title: '语音输入',
      subtitle: '点击开始录音'
    }
  },

  onLoad(options) {
    this.initializeData()
    // 如果是从语音识别跳转过来的，预填充数据
    if (options.voiceData) {
      try {
        const voiceData = JSON.parse(decodeURIComponent(options.voiceData))
        this.applyParsedData(voiceData)
      } catch (e) {
        console.error('解析语音数据失败:', e)
      }
    }
  },

  // 初始化数据
  initializeData() {
    const now = new Date()
    const dateStr = this.formatDate(now)
    const dateText = this.formatDateText(now)
    
    this.setData({
      date: dateStr,
      dateText: dateText
    })
  },

  // 格式化日期
  formatDate(date) {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  },

  // 格式化日期显示文本
  formatDateText(date) {
    const today = new Date()
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000)
    
    if (this.isSameDay(date, today)) {
      return '今天'
    } else if (this.isSameDay(date, yesterday)) {
      return '昨天'
    } else {
      return `${date.getMonth() + 1}月${date.getDate()}日`
    }
  },

  // 判断是否是同一天
  isSameDay(date1, date2) {
    return date1.toDateString() === date2.toDateString()
  },

  // 金额输入
  onAmountInput(e) {
    let value = e.detail.value
    
    // 处理金额格式
    if (value.includes('.')) {
      const parts = value.split('.')
      if (parts[1] && parts[1].length > 2) {
        value = parts[0] + '.' + parts[1].substring(0, 2)
      }
    }
    
    this.setData({
      amount: value
    })
    
    this.checkCanSave()
  },

  // 选择类别
  selectCategory(e) {
    const category = e.currentTarget.dataset.category
    this.setData({
      selectedCategory: category
    })
    this.checkCanSave()
  },

  // 描述输入
  onDescriptionInput(e) {
    this.setData({
      description: e.detail.value
    })
  },

  // 日期选择
  onDateChange(e) {
    const selectedDate = new Date(e.detail.value)
    this.setData({
      date: e.detail.value,
      dateText: this.formatDateText(selectedDate)
    })
  },

  // 检查是否可以保存
  checkCanSave() {
    const { amount, selectedCategory } = this.data
    const canSave = amount && parseFloat(amount) > 0 && selectedCategory
    
    this.setData({
      canSave
    })
  },

  // 开始语音输入
  startVoiceInput() {
    // 检查录音权限
    wx.getSetting({
      success: (res) => {
        if (!res.authSetting['scope.record']) {
          wx.authorize({
            scope: 'scope.record',
            success: () => {
              this.doVoiceInput()
            },
            fail: () => {
              this.showPermissionDialog()
            }
          })
        } else {
          this.doVoiceInput()
        }
      }
    })
  },

  // 显示权限对话框
  showPermissionDialog() {
    wx.showModal({
      title: '需要录音权限',
      content: '语音输入功能需要您的录音权限，是否前往设置开启？',
      confirmText: '去设置',
      success: (res) => {
        if (res.confirm) {
          wx.openSetting()
        }
      }
    })
  },

  // 执行语音输入
  doVoiceInput() {
    this.setData({
      showVoiceModal: true,
      isRecording: true,
      voiceText: '',
      voiceStatus: {
        title: '正在录音',
        subtitle: '请说出您的消费记录'
      }
    })

    const recorderManager = wx.getRecorderManager()
    
    recorderManager.start({
      duration: 60000,
      sampleRate: 16000,
      numberOfChannels: 1,
      encodeBitRate: 96000,
      format: 'mp3'
    })

    recorderManager.onStop((res) => {
      this.setData({
        isRecording: false,
        voiceStatus: {
          title: '正在识别',
          subtitle: '请稍候...'
        }
      })

      // 模拟语音识别（实际项目中应该调用语音识别服务）
      setTimeout(() => {
        this.setData({
          voiceText: '今天买花五十块',
          voiceStatus: {
            title: '识别完成',
            subtitle: '您可以确认或重新录音'
          }
        })
      }, 1500)
    })

    // 5秒后自动停止录音
    setTimeout(() => {
      if (this.data.isRecording) {
        recorderManager.stop()
      }
    }, 5000)
  },

  // 关闭语音模态框
  closeVoiceModal() {
    this.setData({
      showVoiceModal: false,
      isRecording: false,
      voiceText: '',
      voiceStatus: {
        title: '语音输入',
        subtitle: '点击开始录音'
      }
    })
  },

  // 应用语音识别结果
  applyVoiceResult() {
    if (!this.data.voiceText) return

    wx.showLoading({
      title: '解析中...'
    })

    // 调用AI解析云函数
    wx.cloud.callFunction({
      name: 'parseExpense',
      data: {
        text: this.data.voiceText,
        userId: app.globalData.openid || 'anonymous'
      },
      success: (res) => {
        wx.hideLoading()
        
        if (res.result.success) {
          const data = res.result.data
          this.applyParsedData(data)
          this.closeVoiceModal()
          
          wx.showToast({
            title: '解析成功',
            icon: 'success'
          })
        } else {
          wx.showToast({
            title: '解析失败，请手动输入',
            icon: 'none'
          })
        }
      },
      fail: (err) => {
        wx.hideLoading()
        console.error('调用解析云函数失败:', err)
        
        // 使用简单的文本解析作为降级方案
        this.parseTextFallback(this.data.voiceText)
        this.closeVoiceModal()
      }
    })
  },

  // 应用解析后的数据
  applyParsedData(data) {
    const updates = {}
    
    if (data.amount && data.amount > 0) {
      updates.amount = data.amount.toString()
    }
    
    if (data.category) {
      updates.selectedCategory = data.category
    }
    
    if (data.description) {
      updates.description = data.description
    }
    
    this.setData(updates)
    this.checkCanSave()
  },

  // 简单文本解析（降级方案）
  parseTextFallback(text) {
    const amountMatch = text.match(/(\d+(?:\.\d+)?)[元块钱]/g)
    if (amountMatch) {
      const amount = parseFloat(amountMatch[0].replace(/[元块钱]/g, ''))
      this.setData({
        amount: amount.toString(),
        description: text
      })
    }
    
    // 简单的类别识别
    const foodKeywords = ['吃', '饭', '菜', '零食', '水果', '饮料']
    const transportKeywords = ['打车', '地铁', '公交', '出租车']
    const shoppingKeywords = ['买', '购物', '衣服', '鞋子']
    
    if (foodKeywords.some(keyword => text.includes(keyword))) {
      this.setData({ selectedCategory: '食物' })
    } else if (transportKeywords.some(keyword => text.includes(keyword))) {
      this.setData({ selectedCategory: '交通' })
    } else if (shoppingKeywords.some(keyword => text.includes(keyword))) {
      this.setData({ selectedCategory: '购物' })
    }
    
    this.checkCanSave()
  },

  // 保存记录
  saveRecord() {
    if (!this.data.canSave) return

    const { amount, selectedCategory, description, date } = this.data
    
    wx.showLoading({
      title: '保存中...'
    })

    const db = wx.cloud.database()
    const record = {
      userId: app.globalData.openid || 'anonymous',
      amount: parseFloat(amount),
      category: selectedCategory,
      description: description || selectedCategory,
      date: new Date(date),
      createTime: db.serverDate()
    }

    db.collection('expenses').add({
      data: record,
      success: (res) => {
        wx.hideLoading()
        wx.showToast({
          title: '保存成功',
          icon: 'success'
        })
        
        // 延迟返回上一页
        setTimeout(() => {
          wx.navigateBack()
        }, 1500)
      },
      fail: (err) => {
        wx.hideLoading()
        console.error('保存失败:', err)
        wx.showToast({
          title: '保存失败，请重试',
          icon: 'none'
        })
      }
    })
  }
}) 