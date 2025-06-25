# AI智能记账小程序

基于微信小程序 + 云开发的AI智能记账应用，支持语音输入自动识别类目和金额，让记账变得更简单、更智能。

[![Powered by CloudBase](https://7463-tcb-advanced-a656fc-1257967285.tcb.qcloud.la/mcp/powered-by-cloudbase-badge.svg)](https://github.com/TencentCloudBase/CloudBase-AI-ToolKit)  

> 本项目基于 [**CloudBase AI ToolKit**](https://github.com/TencentCloudBase/CloudBase-AI-ToolKit) 开发，通过AI提示词和 MCP 协议+云开发，让开发更智能、更高效。

## 🎯 项目特点

- 🎙️ **语音智能记账**：说出"今天买花50块"，AI自动识别类目和金额
- 🤖 **AI智能解析**：基于DeepSeek大模型，准确识别消费信息
- 📊 **可视化统计**：多维度消费分析，一目了然
- 🎨 **现代化UI**：Material Design风格，用户体验优秀
- ☁️ **云端存储**：数据安全可靠，多端同步
- 📱 **TabBar导航**：首页、记账、记录、统计四大核心功能

## 🏗️ 项目架构

### 前端页面
- **首页** (`pages/index`)：用户信息、快速记账、最近记录、消费统计
- **记账页** (`pages/record`)：手动记账、语音记账、类别选择
- **记录列表** (`pages/list`)：按日期分组显示、类别筛选、下拉刷新
- **统计页面** (`pages/stats`)：消费趋势、类别占比、最大支出

### 云函数
- **`getOpenId`**：获取用户唯一标识
- **`parseExpense`**：AI解析消费信息
  - DeepSeek AI模型解析语音文本
  - 自动识别金额、类别、描述
  - 规则解析作为降级方案
  - 数据存储到云数据库

### 数据库集合
- **`expenses`**：消费记录集合
  ```javascript
  {
    _id: "记录ID",
    userId: "用户OpenID",
    amount: 50.00,           // 金额
    category: "食物",        // 类别
    description: "买花",     // 描述
    originalText: "今天买花50块", // 原始语音文本
    confidence: 0.95,        // AI识别置信度
    date: new Date(),        // 消费日期
    createTime: serverDate() // 创建时间
  }
  ```

### AI能力
- **语音识别**：微信小程序原生录音API
- **文本解析**：DeepSeek-V3大模型，支持：
  - 金额提取（支持"50块"、"五十元"等表达）
  - 类别识别（餐饮、交通、购物、娱乐等8大类）
  - 描述生成（基于语音内容智能生成）
  - 置信度评估

## 🚀 快速开始

### 前提条件
- 微信开发者工具
- 腾讯云开发账号
- 已配置环境ID：`cloud1-4g0v6uhy5c7dc674`

### 安装步骤

1. **克隆项目**
   ```bash
   git clone [项目地址]
   cd miniprogram-cloudbase-miniprogram-template
   ```

2. **安装云函数依赖**
   ```bash
   cd cloudfunctions/getOpenId && npm install
   cd ../parseExpense && npm install
   ```

3. **配置环境ID**
   在 `miniprogram/app.js` 中确认环境ID配置：
   ```javascript
   wx.cloud.init({
     env: 'cloud1-4g0v6uhy5c7dc674',
     traceUser: true,
   });
   ```

4. **导入微信开发者工具**
   - 打开微信开发者工具
   - 导入项目，选择项目目录
   - 上传云函数到云端

5. **运行项目**
   - 点击编译运行
   - 体验语音记账功能

## 💡 核心功能使用

### 语音记账流程
1. 点击首页"语音记账"按钮
2. 授权录音权限
3. 说出消费内容："今天买花50块"
4. AI自动解析：金额50元，类别餐饮，描述"买花"
5. 确认保存到数据库

### AI解析示例
| 语音输入 | 识别结果 |
|---------|---------|
| "今天买花50块" | 金额：50.00，类别：其他，描述：买花 |
| "打车去机场花了80元" | 金额：80.00，类别：交通，描述：打车去机场 |
| "中午点外卖30块钱" | 金额：30.00，类别：食物，描述：中午点外卖 |

## 🛠️ 技术栈

- **前端**：微信小程序原生开发
- **后端**：腾讯云开发 CloudBase
- **数据库**：CloudBase 云数据库（MongoDB）
- **AI模型**：DeepSeek-V3
- **云函数**：Node.js + wx-server-sdk
- **UI框架**：原生WXSS + Flex布局

## 📱 页面预览

### 首页
- 用户信息展示
- 本月支出统计
- 快速记账入口
- 最近消费记录

### 记账页
- 大数字金额输入
- 8类消费类别选择
- 语音输入功能
- 日期和备注

### 记录列表
- 按日期分组显示
- 类别筛选功能
- 下拉刷新
- 分页加载

### 统计页面
- 消费趋势图表
- 类别占比分析
- 最大支出排行
- 时间维度切换

## 🔧 开发部署

### 本地开发
```bash
# 启动微信开发者工具
# 导入项目进行开发调试
```

### 云函数部署
使用MCP工具自动部署：
```javascript
// 通过AI Agent自动完成云函数部署
// 包括依赖安装、代码上传、权限配置
```

### 数据库权限
- **读取权限**：仅创建者可读写
- **写入权限**：通过云函数操作
- **安全策略**：基于用户OpenID的数据隔离

## 📈 扩展功能

### 已实现
- ✅ 语音识别记账
- ✅ AI智能解析
- ✅ 多维度统计
- ✅ 数据可视化

### 计划中
- 🔄 收入记录功能
- 🔄 预算管理
- 🔄 账单导出
- 🔄 多账户支持
- 🔄 消费提醒
- 🔄 数据分析报告

## 🤝 贡献指南

欢迎提交Issue和Pull Request，共同完善这个AI记账应用！

## 📄 开源协议

MIT License - 详见 [LICENSE](LICENSE) 文件

---

**让记账变得更简单，让AI为生活服务** ✨