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
      { key: '食物', name: '餐饮', icon: '/images/category-食物.png' },
      { key: '交通', name: '交通', icon: '/images/category-交通.png' },
      { key: '购物', name: '购物', icon: '/images/category-购物.png' },
      { key: '娱乐', name: '娱乐', icon: '/images/category-娱乐.png' },
      { key: '医疗', name: '医疗', icon: '/images/category-医疗.png' },
      { key: '教育', name: '教育', icon: '/images/category-教育.png' },
      { key: '居住', name: '居住', icon: '/images/category-居住.png' },
      { key: '其他', name: '其他', icon: '/images/category-其他.png' }
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

  // 临时存储解析结果
  tempParseResult: null,

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
    this.recordingStartTime = Date.now() // 记录录音开始时间
    
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
      format: 'mp3',
      frameSize: 50  // 添加frameSize参数优化兼容性
    })

    recorderManager.onStop((res) => {
      this.setData({
        isRecording: false,
        voiceStatus: {
          title: '正在识别',
          subtitle: '请稍候...'
        }
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
      
      console.log('语音识别结果:', selectedText)
      
      // 直接在小程序端使用AI解析
      this.parseWithAI(selectedText)
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
    
    // 清理临时解析结果
    this.tempParseResult = null
  },

  // 使用小程序端AI解析文本
  async parseWithAI(text) {
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
          
          // 设置UI状态
          this.setData({
            voiceText: text,
            voiceStatus: {
              title: 'AI解析完成',
              subtitle: '点击确认应用结果'
            }
          })
          
          // 预填充解析结果
          this.tempParseResult = {
            amount: result.amount,
            category: result.category,
            description: result.description,
            confidence: result.confidence
          }
          
          return
        }
      } catch (e) {
        console.error('JSON解析失败:', e, fullResponse)
      }

      // AI解析失败，使用规则解析
      this.fallbackParseText(text)
      
    } catch (error) {
      console.error('AI调用失败:', error)
      // 降级到规则解析
      this.fallbackParseText(text)
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
    
    this.setData({
      voiceText: text,
      voiceStatus: {
        title: '解析完成',
        subtitle: '点击确认应用结果'
      }
    })
    
    this.tempParseResult = {
      amount: amount,
      category: category,
      description: category === '其他' ? text : `${category}消费`,
      confidence: 0.6
    }
  },

  // 应用语音识别结果
  applyVoiceResult() {
    if (!this.data.voiceText) return

    // 如果已经有预解析结果，直接使用
    if (this.tempParseResult) {
      this.applyParsedData(this.tempParseResult)
      this.closeVoiceModal()
      this.tempParseResult = null
      
      wx.showToast({
        title: '应用成功',
        icon: 'success'
      })
      return
    }

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
    const now = new Date()
    const record = {
      userId: app.globalData.openid || 'anonymous',
      amount: parseFloat(amount),
      category: selectedCategory,
      description: description || selectedCategory,
      date: new Date(date),
      createTime: now
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
  },

  // 真实语音识别示例（可选实现）
  realVoiceRecognition(audioFilePath) {
    // 方案1: 使用微信同声传译API（需要申请权限）
    // wx.translateVoice({
    //   filePath: audioFilePath,
    //   success: (res) => {
    //     console.log('语音识别结果:', res.result)
    //     this.parseWithAI(res.result)
    //   },
    //   fail: (err) => {
    //     console.error('语音识别失败:', err)
    //     this.fallbackParseText('语音识别失败，请手动输入')
    //   }
    // })

    // 方案2: 上传到云函数调用第三方语音识别服务
    // wx.cloud.uploadFile({
    //   cloudPath: `audio/${Date.now()}.mp3`,
    //   filePath: audioFilePath,
    //   success: (uploadRes) => {
    //     wx.cloud.callFunction({
    //       name: 'speechToText',
    //       data: { fileID: uploadRes.fileID },
    //       success: (res) => {
    //         if (res.result.text) {
    //           this.parseWithAI(res.result.text)
    //         }
    //       }
    //     })
    //   }
    // })

    // 方案3: 使用腾讯云ASR服务（推荐）
    // 可以在云函数中集成腾讯云语音识别SDK
    console.log('真实语音识别待实现，当前使用模拟方式')
  }
}) 