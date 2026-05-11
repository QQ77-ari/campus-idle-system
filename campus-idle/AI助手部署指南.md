# 智能助手部署指南

## 部署步骤

### 第 1 步：创建数据库集合

1. 打开**微信开发者工具**
2. 点击顶部**云开发**按钮
3. 进入**数据库**标签页
4. 点击左侧 **+** 新建集合，名称填 `ai_conversations`
5. 权限选择：**所有用户可读，仅创建者可写**

### 第 2 步：配置 MiMo API

**方案 A — 环境变量（推荐，更安全）：**

1. 云开发控制台 → **云函数** → 找到 `aiChat`
2. 点击**版本与配置** → **环境变量**
3. 添加以下变量：

| 变量名 | 值 |
|--------|-----|
| `MIMO_API_KEY` | 你的 MiMo API Key |
| `MIMO_API_URL` | MiMo API 地址（如 `https://api.mimo.com/v1/chat/completions`） |
| `MIMO_MODEL` | 模型名（如 `mimo-v2-pro`） |

**方案 B — 直接修改配置文件：**

编辑 `cloud/aiChat/config.js`，把空字符串替换成实际值：

```js
API_KEY: process.env.MIMO_API_KEY || '你的API_KEY写这里',
API_URL: process.env.MIMO_API_URL || 'https://实际地址/v1/chat/completions',
MODEL: process.env.MIMO_MODEL || '实际模型名',
```

### 第 3 步：安装云函数依赖

1. 在微信开发者工具左侧文件树找到 `cloud/aiChat`
2. 右键 → **在终端中打开**
3. 执行：`npm install`
4. 或者右键 `cloud/aiChat` → **云端安装依赖**

### 第 4 步：部署云函数

1. 右键 `cloud/aiChat` → **上传并部署：云端安装依赖**
2. 等待部署完成（控制台显示成功）

### 第 5 步：测试

1. 在云开发控制台 → **云函数** → 点击 `aiChat` → **测试**
2. 测试参数填：`{ "content": "你好" }`
3. 点击运行，检查返回结果是否包含 `success: true` 和 `reply` 字段
4. 测试通过后，在小程序模拟器中点击个人中心 → 智能助手 → 发送消息测试

---

## 常见问题

### Q: 提示 "API Key 未配置"
- 检查环境变量 `MIMO_API_KEY` 是否正确设置
- 如果用方案 B，确认 `config.js` 中的值已填写

### Q: 提示 "网络错误" 或 "请求超时"
- 检查 `MIMO_API_URL` 地址是否正确
- 确认云函数网络环境可以访问该地址

### Q: 云函数部署失败
- 确认 `cloud/aiChat/package.json` 中有 `wx-server-sdk` 依赖
- 尝试删除 `node_modules` 后重新安装

### Q: 数据库权限报错
- 在云开发控制台 → 数据库 → `ai_conversations` → 权限设置为"所有用户可读，仅创建者可写"
