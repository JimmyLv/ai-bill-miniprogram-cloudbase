const cloud = require('wx-server-sdk')
const cloudbase = require('@cloudbase/js-sdk')
const adapter = require('@cloudbase/adapter-node')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

// 初始化云开发AI SDK
const { sessionStorage } = adapter.genAdapter()
cloudbase.useAdapters(adapter)

const db = cloud.database()

// 消费类别映射
const categoryMap = {
  '食物': ['吃', '饭', '菜', '零食', '水果', '饮料', '咖啡', '奶茶', '早餐', '午餐', '晚餐', '外卖', '餐厅', '食堂', '花'],
  '交通': ['打车', '地铁', '公交', '火车', '飞机', '加油', '停车', '高速', '出租车', '滴滴', 'uber'],
  '购物': ['衣服', '鞋子', '包包', '化妆品', '护肤品', '电子产品', '手机', '电脑', '书', '文具', '买', '购物', '超市'],
  '娱乐': ['电影', '游戏', 'ktv', '酒吧', '旅游', '景点', '门票', '演出', '音乐会'],
  '医疗': ['医院', '药', '体检', '看病', '治疗', '挂号'],
  '教育': ['学费', '培训', '课程', '辅导', '书本'],
  '居住': ['房租', '水电', '燃气', '物业', '网费', '家具', '装修'],
  '其他': []
}

// 中文数字转换
const chineseNumbers = {
  '零': 0, '一': 1, '二': 2, '三': 3, '四': 4, '五': 5, '六': 6, '七': 7, '八': 8, '九': 9,
  '十': 10, '百': 100, '千': 1000, '万': 10000,
  '两': 2, '俩': 2
}

// 转换中文数字为阿拉伯数字
function convertChineseNumber(text) {
  let result = text
  
  // 处理复合数字（如一百二十）
  const complexPatterns = [
    { pattern: /一百零五/g, value: 105 },
    { pattern: /一百零六/g, value: 106 },
    { pattern: /一百零七/g, value: 107 },
    { pattern: /一百零八/g, value: 108 },
    { pattern: /一百零九/g, value: 109 },
    { pattern: /一百一十/g, value: 110 },
    { pattern: /一百二十/g, value: 120 },
    { pattern: /一百三十/g, value: 130 },
    { pattern: /一百四十/g, value: 140 },
    { pattern: /一百五十/g, value: 150 },
    { pattern: /两百二十/g, value: 220 },
    { pattern: /两百三十/g, value: 230 },
    { pattern: /三百二十/g, value: 320 },
  ]
  
  // 先处理复合数字
  for (const { pattern, value } of complexPatterns) {
    result = result.replace(pattern, value.toString())
  }
  
  // 处理简单的情况
  const simplePatterns = [
    // 十几
    { pattern: /十一/g, value: 11 },
    { pattern: /十二/g, value: 12 },
    { pattern: /十三/g, value: 13 },
    { pattern: /十四/g, value: 14 },
    { pattern: /十五/g, value: 15 },
    { pattern: /十六/g, value: 16 },
    { pattern: /十七/g, value: 17 },
    { pattern: /十八/g, value: 18 },
    { pattern: /十九/g, value: 19 },
    // 几十
    { pattern: /一十/g, value: 10 },
    { pattern: /二十/g, value: 20 },
    { pattern: /三十/g, value: 30 },
    { pattern: /四十/g, value: 40 },
    { pattern: /五十/g, value: 50 },
    { pattern: /六十/g, value: 60 },
    { pattern: /七十/g, value: 70 },
    { pattern: /八十/g, value: 80 },
    { pattern: /九十/g, value: 90 },
    // 几百
    { pattern: /一百/g, value: 100 },
    { pattern: /两百/g, value: 200 },
    { pattern: /三百/g, value: 300 },
    { pattern: /四百/g, value: 400 },
    { pattern: /五百/g, value: 500 },
    // 简写形式
    { pattern: /^十$/g, value: 10 }
  ]
  
  for (const { pattern, value } of simplePatterns) {
    result = result.replace(pattern, value.toString())
  }
  
  return result
}

// 规则匹配解析
function parseExpenseWithRules(text) {
  const result = {
    amount: 0,
    category: '其他',
    description: text,
    confidence: 0.8
  }

  // 先转换中文数字
  const convertedText = convertChineseNumber(text)
  
  // 提取金额 - 支持多种格式
  const amountPatterns = [
    /(\d+(?:\.\d+)?)[元块钱]/g,  // 数字+单位
    /花了?(\d+(?:\.\d+)?)/g,     // 花了X
    /(\d+(?:\.\d+)?)块/g,        // X块
    /票(\d+(?:\.\d+)?)/g,        // 票X（如地铁票12块）
    /(\d+(?:\.\d+)?)$/g,         // 纯数字在结尾 - 放到最后，避免误匹配
  ]
  
  let amounts = []
  
  for (const pattern of amountPatterns) {
    const matches = [...convertedText.matchAll(pattern)]
    
    for (const match of matches) {
      // 获取第一个捕获组
      const amount = parseFloat(match[1])
      if (!isNaN(amount) && amount > 0) {
        amounts.push(amount)
      }
    }
  }
  
  if (amounts.length > 0) {
    result.amount = Math.max(...amounts)
  }

  // 识别类别
  for (const [category, keywords] of Object.entries(categoryMap)) {
    if (keywords.some(keyword => text.includes(keyword))) {
      result.category = category
      result.confidence = 0.9
      break
    }
  }
  
  // 生成更好的描述
  if (result.category !== '其他' && result.amount > 0) {
    const categoryName = result.category
    result.description = `${categoryName}消费`
  }

  return {
    success: true,
    data: result
  }
}

// 使用AI解析消费信息
async function parseExpenseWithAI(text) {
  try {
    // 在云函数中使用CloudBase JS SDK调用AI
    const app = cloudbase.init({
      env: cloud.DYNAMIC_CURRENT_ENV || process.env.TCB_ENV
    })
    
    const auth = app.auth({
      storage: sessionStorage,
      captchaOptions: {
        openURIWithCallback: () => console.log("open uri with callback"),
      },
    })
    
    await auth.signInAnonymously()
    
    const ai = app.ai()
    const model = ai.createModel("deepseek")
    
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

    console.log('正在调用AI解析:', text)
    
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
    
    console.log('AI原始响应:', fullResponse)

    // 尝试解析JSON
    try {
      // 提取JSON部分
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
        
        return {
          success: true,
          data: result
        }
      }
    } catch (e) {
      console.error('JSON解析失败:', e, fullResponse)
    }

    // 如果AI解析失败，使用规则匹配作为备选
    console.log('AI解析失败，降级到规则解析')
    return parseExpenseWithRules(text)
    
  } catch (error) {
    console.error('AI调用失败:', error.message || error)
    console.log('降级到规则解析')
    // 降级到规则解析
    return parseExpenseWithRules(text)
  }
}

exports.main = async (event, context) => {
  const { text, userId, saveToDb = true } = event

  if (!text) {
    return {
      success: false,
      error: '文本内容不能为空'
    }
  }

  try {
    console.log('解析文本:', text, '是否保存到数据库:', saveToDb)
    
    // 解析消费信息
    const parseResult = await parseExpenseWithAI(text)
    
    if (!parseResult.success) {
      return parseResult
    }

    const expenseData = parseResult.data
    console.log('解析结果:', expenseData)

    // 根据参数决定是否保存到数据库
    if (saveToDb) {
      const now = new Date()
      const expense = {
        userId: userId || 'anonymous',
        amount: expenseData.amount,
        category: expenseData.category,
        description: expenseData.description,
        originalText: text,
        confidence: expenseData.confidence,
        date: now,
        createTime: now
      }

      const saveResult = await db.collection('expenses').add({
        data: expense
      })

      return {
        success: true,
        data: {
          ...expenseData,
          _id: saveResult._id,
          date: expense.date
        }
      }
    } else {
      // 只返回解析结果，不保存
      return {
        success: true,
        data: {
          ...expenseData,
          originalText: text
        }
      }
    }

  } catch (error) {
    console.error('解析消费信息失败:', error)
    return {
      success: false,
      error: error.message || '解析失败'
    }
  }
} 