// cloud/aiChat/config.js
// MiMo API 配置模板
//
// 使用方式（二选一）：
// 方案 A（推荐）：在云开发控制台设置环境变量，无需修改此文件
// 方案 B：直接在此文件填写配置，但注意不要提交到公开仓库

module.exports = {
  // MiMo API Key（必填）
  // 获取方式：登录小米开放平台 → AI 服务 → 创建应用 → 获取 API Key
  API_KEY: process.env.MIMO_API_KEY || 'sk-c06u0cjzeto0tsk0gks6wq29vgq5omf400eul0h4nyg75tt3',

  // MiMo API 请求地址（OpenAI 兼容格式）
  API_URL: process.env.MIMO_API_URL || 'https://api.xiaomimimo.com/v1/chat/completions',

  // 模型名称
  MODEL: process.env.MIMO_MODEL || 'mimo-v2.5-pro',

  // 最大上下文消息数（从数据库读取最近 N 条作为上下文）
  MAX_HISTORY: 10,

  // AI 回复最大 token 数
  MAX_TOKENS: 500,

  // 温度（0~1，越高越随机）
  TEMPERATURE: 0.7
}
