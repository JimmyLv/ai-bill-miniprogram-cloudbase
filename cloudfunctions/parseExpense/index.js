const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

// 消费类别映射
const categoryMap = {
  '食物': ['吃', '饭', '菜', '零食', '水果', '饮料', '咖啡', '奶茶', '早餐', '午餐', '晚餐', '外卖', '餐厅', '食堂', '花'],
  '交通': ['打车', '地铁', '公交', '火车', '飞机', '加油', '停车', '高速', '出租车', '滴滴', 'uber'],
  '购物': ['衣服', '鞋子', '包包', '化妆品', '护肤品', '电子产品', '手机', '电脑', '书', '文具', '买'],
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
  // 处理简单的情况
  const simplePatterns = [
    { pattern: /五十/g, value: 50 },
    { pattern: /六十/g, value: 60 },
    { pattern: /七十/g, value: 70 },
    { pattern: /八十/g, value: 80 },
    { pattern: /九十/g, value: 90 },
    { pattern: /一十/g, value: 10 },
    { pattern: /二十/g, value: 20 },
    { pattern: /三十/g, value: 30 },
    { pattern: /四十/g, value: 40 },
    { pattern: /一百/g, value: 100 },
    { pattern: /两百/g, value: 200 },
    { pattern: /三百/g, value: 300 },
    { pattern: /四百/g, value: 400 },
    { pattern: /五百/g, value: 500 }
  ]
  
  let result = text
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
    /(\d+(?:\.\d+)?)$/g,         // 纯数字在结尾
    /花了?(\d+(?:\.\d+)?)/g,     // 花了X
    /(\d+(?:\.\d+)?)块/g         // X块
  ]
  
  let amounts = []
  
  for (const pattern of amountPatterns) {
    const matches = convertedText.match(pattern)
    if (matches) {
      for (const match of matches) {
        const numberMatch = match.match(/(\d+(?:\.\d+)?)/)
        if (numberMatch) {
          amounts.push(parseFloat(numberMatch[1]))
        }
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

// 使用AI解析消费信息 (暂时使用规则解析)
async function parseExpenseWithAI(text) {
  try {
    // TODO: 集成AI模型解析
    // 目前直接使用规则解析作为主要方法
    return parseExpenseWithRules(text)
    
  } catch (error) {
    console.error('AI解析失败:', error)
    // 降级到规则解析
    return parseExpenseWithRules(text)
  }
}

exports.main = async (event, context) => {
  const { text, userId } = event

  if (!text) {
    return {
      success: false,
      error: '文本内容不能为空'
    }
  }

  try {
    console.log('解析文本:', text)
    
    // 解析消费信息
    const parseResult = await parseExpenseWithAI(text)
    
    if (!parseResult.success) {
      return parseResult
    }

    const expenseData = parseResult.data
    console.log('解析结果:', expenseData)

    // 保存到数据库
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

  } catch (error) {
    console.error('解析消费信息失败:', error)
    return {
      success: false,
      error: error.message || '解析失败'
    }
  }
} 