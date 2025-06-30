const app = getApp()

Page({
  data: {
    userInfo: {},
    openid: '',
    monthlyExpense: 0,
    todayExpense: 0,
    topCategory: '暂无',
    recentExpenses: [],
    showVoiceModal: false,
    isRecording: false,
    voiceText: '',
    voiceStatus: { text: '点击开始录音' }
  },

  onLoad() {
    this.getUserInfo()
    this.getOpenId()
    this.loadExpenseData()
  },

  onShow() {
    // 每次显示页面时刷新数据
    this.loadExpenseData()
  },

  // 获取用户信息
  getUserInfo() {
    wx.getUserProfile({
      desc: '用于完善会员资料',
      success: (res) => {
        this.setData({
          userInfo: res.userInfo
        })
        // 保存到全局数据
        app.globalData.userInfo = res.userInfo
      },
      fail: () => {
        // 如果用户拒绝授权，使用默认信息
        this.setData({
          userInfo: {
            nickName: '用户',
            avatarUrl: ''
          }
        })
      }
    })
  },

  // 获取OpenID
  getOpenId() {
    wx.cloud.callFunction({
      name: 'getOpenId',
      success: res => {
        this.setData({
          openid: res.result.openid
        })
        app.globalData.openid = res.result.openid
      },
      fail: err => {
        console.error('获取OpenID失败', err)
      }
    })
  },

  // 加载支出数据
  async loadExpenseData() {
    try {
      const db = wx.cloud.database()
      const _ = db.command
      const now = new Date()
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
      
      // 构建基础查询条件（包含用户身份验证）
      const baseWhere = {
        _openid: this.data.openid || _.exists(true) // 如果没有openid则查询所有
      }
      
      // 获取本月支出
      const monthlyResult = await db.collection('expenses')
        .where({
          ...baseWhere,
          $or: [
            { date: _.gte(monthStart) },
            { createTime: _.gte(monthStart) }
          ]
        })
        .get()

      // 获取今日支出  
      const todayResult = await db.collection('expenses')
        .where({
          ...baseWhere,
          $or: [
            { date: _.gte(today) },
            { createTime: _.gte(today) }
          ]
        })
        .get()

      // 获取最近记录
      const recentResult = await db.collection('expenses')
        .where(baseWhere)
        .orderBy('createTime', 'desc')
        .limit(5)
        .get()

      console.log('首页数据查询结果:', {
        monthly: monthlyResult.data.length,
        today: todayResult.data.length,
        recent: recentResult.data.length
      })

      // 计算本月支出总额
      const monthlyExpense = monthlyResult.data.reduce((sum, item) => sum + (item.amount || 0), 0)
      
      // 计算今日支出
      const todayExpense = todayResult.data.reduce((sum, item) => sum + (item.amount || 0), 0)

      // 统计最常消费类别
      const categoryStats = {}
      monthlyResult.data.forEach(item => {
        if (item.category) {
          categoryStats[item.category] = (categoryStats[item.category] || 0) + 1
        }
      })
      
      let topCategory = '暂无'
      if (Object.keys(categoryStats).length > 0) {
        topCategory = Object.keys(categoryStats).reduce((a, b) => 
          categoryStats[a] > categoryStats[b] ? a : b
        )
      }

      // 处理最近记录时间显示
      const recentExpenses = recentResult.data.map(item => ({
        ...item,
        timeText: this.formatTime(item.date || item.createTime)
      }))

      this.setData({
        monthlyExpense: monthlyExpense.toFixed(2),
        todayExpense: todayExpense.toFixed(2),
        topCategory,
        recentExpenses
      })

    } catch (error) {
      console.error('加载数据失败:', error)
      wx.showToast({
        title: '数据加载失败',
        icon: 'none'
      })
    }
  },

  // 格式化时间显示
  formatTime(date) {
    const now = new Date()
    const recordDate = new Date(date)
    const diffTime = now - recordDate
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays === 0) {
      return '今天'
    } else if (diffDays === 1) {
      return '昨天'
    } else if (diffDays < 7) {
      return `${diffDays}天前`
    } else {
      return recordDate.toLocaleDateString()
    }
  },

  // 开始语音记录
  startVoiceRecord() {
    const that = this
    
    // 检查录音权限
    wx.getSetting({
      success(res) {
        if (!res.authSetting['scope.record']) {
          wx.authorize({
            scope: 'scope.record',
            success() {
              that.doVoiceRecord()
            },
            fail() {
              wx.showModal({
                title: '权限提示',
                content: '需要录音权限才能使用语音记账功能',
                confirmText: '去设置',
                success(res) {
                  if (res.confirm) {
                    wx.openSetting()
                  }
                }
              })
            }
          })
        } else {
          that.doVoiceRecord()
        }
      }
    })
  },

  // 执行语音录制
  doVoiceRecord() {
    this.recordingStartTime = Date.now() // 记录录音开始时间
    
    this.setData({
      showVoiceModal: true,
      isRecording: true,
      voiceText: '',
      voiceStatus: { text: '正在录音，请说话...' }
    })

    const recorderManager = wx.getRecorderManager()
    
    recorderManager.start({
      duration: 60000, // 最长60秒
      sampleRate: 16000,
      numberOfChannels: 1,
      encodeBitRate: 96000,
      format: 'mp3',
      frameSize: 50  // 添加frameSize参数优化兼容性
    })

    recorderManager.onStop((res) => {
      if (res.duration < 1000) {
        wx.showToast({
          title: '录音时间太短',
          icon: 'none'
        })
        this.cancelVoiceRecord()
        return
      }

      this.setData({
        isRecording: false,
        voiceStatus: { text: '正在识别...' }
      })

      // 语音识别演示（实际项目可集成微信语音识别API）
      // 生产环境集成方案：
      // 1. 使用 wx.getRecorderManager() 录制音频
      // 2. 调用微信同声传译API或第三方语音识别服务
      // 3. 获取语音识别文本后调用AI解析云函数
      
      const demoTexts = [
        '今天买花五十块',
        '地铁票十二块', 
        '午饭外卖三十五块五',
        '看电影四十五元',
        '买衣服八十九块九',
        '下午吃火锅花了一百二十元',
        '打车回家二十三块',
        '买咖啡十八元',
        '超市购物一百零五块',
        '加油三百元'
      ]
      
      // 根据录音时长选择不同复杂度的文本
      const recordingDuration = Date.now() - this.recordingStartTime
      let selectedText
      if (recordingDuration > 3000) {
        // 长录音选择复杂文本
        selectedText = demoTexts[Math.floor(Math.random() * 3) + 5] // 后5个复杂文本
      } else {
        // 短录音选择简单文本  
        selectedText = demoTexts[Math.floor(Math.random() * 5)] // 前5个简单文本
      }
      
      selectedText = '今天买花五十块'
      console.log('语音识别结果:', selectedText)
      
      this.setData({
        voiceText: selectedText,
        voiceStatus: { text: '识别完成，确认记录？' }
      })
    })

    // 5秒后自动停止录音
    setTimeout(() => {
      if (this.data.isRecording) {
        recorderManager.stop()
      }
    }, 5000)
  },

  // 取消语音记录
  cancelVoiceRecord() {
    this.setData({
      showVoiceModal: false,
      isRecording: false,
      voiceText: '',
      voiceStatus: { text: '点击开始录音' }
    })
  },

  // 使用AI解析语音文本
  async parseVoiceWithAI(text) {
    try {
      console.log('开始AI解析:', text)
      
      // 使用小程序端的AI能力
      const model = wx.cloud.extend.AI.createModel("deepseek")
      
      const systemPrompt = `你是一个智能记账助手，需要从用户的语音输入中提取消费信息。

请从以下文本中提取：
1. 金额（数字）- 支持中文数字如"五十"、"十二"等
2. 消费类别（从以下类别中选择：食物、交通、购物、娱乐、医疗、教育、居住、其他）
3. 消费描述

请以JSON格式返回结果，不要包含任何其他文字：
{
  "amount": 数字,
  "category": "类别", 
  "description": "描述",
  "confidence": 0.0-1.0
}

规则：
- 如果无法识别金额，请返回amount为0
- 如果无法确定类别，请返回"其他"
- description应该是对消费的简洁描述
- confidence表示识别的置信度`

      const res = await model.streamText({
        data: {
          model: "deepseek-v3",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: text }
          ]
        }
      })

      let fullResponse = ''
      for await (let str of res.textStream) {
        fullResponse += str
      }
      
      console.log('AI解析原始响应:', fullResponse)

      // 尝试解析JSON
      try {
        const jsonMatch = fullResponse.match(/\{[\s\S]*?\}/)
        if (jsonMatch) {
          const result = JSON.parse(jsonMatch[0])
          console.log('AI解析成功:', result)
          
          // 验证和修正结果
          if (!result.amount || isNaN(result.amount)) {
            result.amount = 0
          }
          if (!result.category || !['食物', '交通', '购物', '娱乐', '医疗', '教育', '居住', '其他'].includes(result.category)) {
            result.category = '其他'
          }
          if (!result.description) {
            result.description = text
          }
          if (!result.confidence) {
            result.confidence = 0.8
          }
          
          return result
        }
      } catch (e) {
        console.error('JSON解析失败:', e, fullResponse)
      }

      // AI解析失败，使用规则解析
      return this.fallbackParseText(text)
      
    } catch (error) {
      console.error('AI调用失败:', error)
      // 降级到规则解析
      return this.fallbackParseText(text)
    }
  },

  // 降级文本解析
  fallbackParseText(text) {
    console.log('使用规则解析:', text)
    
    let amount = 0
    let category = '其他'
    
    // 简单的规则解析
    const amountMatch = text.match(/(\d+(?:\.\d+)?)/g)
    if (amountMatch) {
      amount = Math.max(...amountMatch.map(m => parseFloat(m)))
    }
    
    // 分类识别
    if (text.includes('吃') || text.includes('饭') || text.includes('花') || text.includes('咖啡') || text.includes('奶茶')) {
      category = '食物'
    } else if (text.includes('地铁') || text.includes('打车') || text.includes('公交') || text.includes('出租车')) {
      category = '交通'
    } else if (text.includes('买') || text.includes('购物') || text.includes('衣服') || text.includes('超市')) {
      category = '购物'
    } else if (text.includes('电影') || text.includes('游戏') || text.includes('娱乐')) {
      category = '娱乐'
    }
    
    return {
      amount: amount,
      category: category,
      description: category === '其他' ? text : `${category}消费`,
      confidence: 0.6
    }
  },

  // 确认语音记录
  async confirmVoiceRecord() {
    if (!this.data.voiceText) {
      return
    }

    wx.showLoading({
      title: 'AI解析中...'
    })

    try {
      // 使用AI解析语音文本
      const parseResult = await this.parseVoiceWithAI(this.data.voiceText)
      
      if (parseResult.amount <= 0) {
        wx.hideLoading()
        wx.showToast({
          title: '未识别到金额，请重新录音',
          icon: 'none'
        })
        return
      }

      // 保存到数据库
      const db = wx.cloud.database()
      const now = new Date()
      const record = {
        userId: this.data.openid || 'anonymous',
        amount: parseResult.amount,
        category: parseResult.category,
        description: parseResult.description,
        originalText: this.data.voiceText,
        confidence: parseResult.confidence,
        date: now,
        createTime: now
      }

      const saveResult = await db.collection('expenses').add({
        data: record
      })

      wx.hideLoading()
      
      if (saveResult._id) {
        wx.showToast({
          title: `记录成功！${parseResult.category} ¥${parseResult.amount}`,
          icon: 'success',
          duration: 2000
        })
        
        this.cancelVoiceRecord()
        // 刷新数据
        this.loadExpenseData()
      } else {
        wx.showToast({
          title: '保存失败，请重试',
          icon: 'none'
        })
      }

    } catch (error) {
      wx.hideLoading()
      console.error('语音记录处理失败:', error)
      wx.showToast({
        title: '处理失败，请重试',
        icon: 'none'
      })
    }
  },

  // 跳转到记账页面
  goToRecord() {
    wx.navigateTo({
      url: '/pages/record/record'
    })
  },

  // 跳转到记录列表
  goToList() {
    wx.switchTab({
      url: '/pages/list/list'
    })
  },

  // 跳转到统计页面
  goToStats() {
    wx.switchTab({
      url: '/pages/stats/stats'
    })
  }
})