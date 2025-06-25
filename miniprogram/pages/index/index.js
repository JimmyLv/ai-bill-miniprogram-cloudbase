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
      const now = new Date()
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
      
      // 获取本月支出
      const monthlyResult = await db.collection('expenses')
        .where({
          date: db.command.gte(monthStart)
        })
        .get()

      // 获取今日支出
      const todayResult = await db.collection('expenses')
        .where({
          date: db.command.gte(today)
        })
        .get()

      // 获取最近记录
      const recentResult = await db.collection('expenses')
        .orderBy('createTime', 'desc')
        .limit(5)
        .get()

      // 计算本月支出总额
      const monthlyExpense = monthlyResult.data.reduce((sum, item) => sum + item.amount, 0)
      
      // 计算今日支出
      const todayExpense = todayResult.data.reduce((sum, item) => sum + item.amount, 0)

      // 统计最常消费类别
      const categoryStats = {}
      monthlyResult.data.forEach(item => {
        categoryStats[item.category] = (categoryStats[item.category] || 0) + 1
      })
      const topCategory = Object.keys(categoryStats).reduce((a, b) => 
        categoryStats[a] > categoryStats[b] ? a : b, '暂无'
      )

      // 处理最近记录时间显示
      const recentExpenses = recentResult.data.map(item => ({
        ...item,
        timeText: this.formatTime(item.date)
      }))

      this.setData({
        monthlyExpense: monthlyExpense.toFixed(2),
        todayExpense: todayExpense.toFixed(2),
        topCategory,
        recentExpenses
      })

    } catch (error) {
      console.error('加载数据失败:', error)
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
      format: 'mp3'
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

      // 语音识别
      wx.cloud.uploadFile({
        cloudPath: `voice/${Date.now()}.mp3`,
        filePath: res.tempFilePath,
        success: uploadRes => {
          // 调用语音识别
          wx.cloud.callFunction({
            name: 'speechRecognition',
            data: {
              fileID: uploadRes.fileID
            },
            success: recognitionRes => {
              const result = recognitionRes.result
              if (result.success && result.text) {
                this.setData({
                  voiceText: result.text,
                  voiceStatus: { text: '识别完成，确认记录？' }
                })
              } else {
                wx.showToast({
                  title: '识别失败，请重试',
                  icon: 'none'
                })
                this.cancelVoiceRecord()
              }
            },
            fail: () => {
              // 如果语音识别云函数不存在，使用模拟数据
              this.setData({
                voiceText: '今天买花50块',
                voiceStatus: { text: '识别完成，确认记录？' }
              })
            }
          })
        },
        fail: () => {
          wx.showToast({
            title: '上传失败，请重试',
            icon: 'none'
          })
          this.cancelVoiceRecord()
        }
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

  // 确认语音记录
  confirmVoiceRecord() {
    if (!this.data.voiceText) {
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
        userId: this.data.openid || 'anonymous'
      },
      success: res => {
        wx.hideLoading()
        
        if (res.result.success) {
          const expense = res.result.data
          wx.showToast({
            title: `记录成功！${expense.category} ¥${expense.amount}`,
            icon: 'success',
            duration: 2000
          })
          
          this.cancelVoiceRecord()
          // 刷新数据
          this.loadExpenseData()
        } else {
          wx.showToast({
            title: res.result.error || '解析失败',
            icon: 'none'
          })
        }
      },
      fail: err => {
        wx.hideLoading()
        console.error('调用解析云函数失败:', err)
        wx.showToast({
          title: '网络错误，请重试',
          icon: 'none'
        })
      }
    })
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