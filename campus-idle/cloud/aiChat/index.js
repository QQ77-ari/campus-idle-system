// cloud/aiChat/index.js
// 智能助手对话云函数 — 调用 MiMo API (OpenAI 兼容格式，支持多模态图片)

const cloud = require('wx-server-sdk')
const https = require('https')
const config = require('./config')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command
const MAX_HISTORY = config.MAX_HISTORY

// ========== System Prompt ==========
const SYSTEM_PROMPT = `你是「校园闲置助手」，一个专门为大学生提供二手交易相关帮助的 AI 助手。

你的能力包括：
1. 二手商品定价建议 — 根据商品类型、新旧程度给出合理的价格范围
2. 物品分类指导 — 帮助用户选择正确的商品分类（书籍、数码、生活用品、体育器材）
3. 交易安全提醒 — 提醒用户注意线下交易安全事项
4. 商品描述优化 — 帮助用户优化商品描述文案
5. 图片识别 — 用户发来的图片通常是闲置物品照片，帮助识别物品并给出定价建议
6. 闲聊互动 — 友好地与用户交流校园生活

回答要求：
- 简洁明了，控制在 200 字以内
- 语气亲切，像一个热心的学长/学姐
- 如果不确定具体价格，给出大致范围供参考
- 涉及交易安全时要认真严肃
- 收到图片时，先描述你看到的物品，再给出定价和交易建议`

// ========== 下载云存储图片转 base64 ==========
async function getImageBase64(fileID) {
  try {
    const res = await cloud.downloadFile({ fileID })
    const buffer = res.fileContent
    return buffer.toString('base64')
  } catch (err) {
    console.error('下载图片失败:', err)
    return null
  }
}

// ========== 获取图片 MIME 类型 ==========
function getImageMimeType(fileID) {
  const lower = fileID.toLowerCase()
  if (lower.includes('.png')) return 'image/png'
  if (lower.includes('.gif')) return 'image/gif'
  if (lower.includes('.webp')) return 'image/webp'
  return 'image/jpeg'
}

// ========== 调用 MiMo API (OpenAI 兼容格式，支持多模态) ==========
function callMiMo(apiUrl, apiKey, model, messages) {
  return new Promise((resolve, reject) => {
    const url = new URL(apiUrl)
    const postData = JSON.stringify({
      model: model,
      messages: messages,
      max_completion_tokens: config.MAX_TOKENS,
      temperature: config.TEMPERATURE,
      stream: false
    })

    const options = {
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': apiKey,
        'Content-Length': Buffer.byteLength(postData)
      },
      timeout: 30000
    }

    const req = https.request(options, (res) => {
      let body = ''
      res.on('data', (chunk) => { body += chunk })
      res.on('end', () => {
        try {
          const json = JSON.parse(body)
          if (json.error) {
            reject(new Error(json.error.message || 'API 调用失败'))
            return
          }
          const reply = json.choices && json.choices[0] && json.choices[0].message
            ? json.choices[0].message.content
            : null
          resolve(reply || '抱歉，我暂时无法回复，请稍后再试。')
        } catch (e) {
          reject(new Error('解析 API 响应失败: ' + body.substring(0, 200)))
        }
      })
    })

    req.on('error', (e) => reject(new Error(`网络错误: ${e.message}`)))
    req.on('timeout', () => { req.destroy(); reject(new Error('请求超时')) })
    req.write(postData)
    req.end()
  })
}

// ========== 生成会话 ID ==========
async function getSessionId(event) {
  if (event.sessionId) return event.sessionId
  try {
    const { OPENID } = cloud.getWXContext()
    return `session_${OPENID}`
  } catch {
    return `session_${Date.now()}`
  }
}

// ========== 构建历史消息（支持多模态） ==========
async function buildHistoryMessages(history, currentContent, imageUrl) {
  const messages = [
    { role: 'system', content: SYSTEM_PROMPT }
  ]

  // 添加历史消息（图片消息用多模态格式）
  for (const h of history) {
    if (h.type === 'image' && h.content) {
      const base64 = await getImageBase64(h.content)
      if (base64) {
        const mimeType = getImageMimeType(h.content)
        messages.push({
          role: h.role,
          content: [
            { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64}` } }
          ]
        })
      }
    } else {
      messages.push({ role: h.role, content: h.content })
    }
  }

  // 添加当前消息
  if (imageUrl) {
    // 多模态消息：图片 + 文字
    const base64 = await getImageBase64(imageUrl)
    const userContent = []
    if (base64) {
      const mimeType = getImageMimeType(imageUrl)
      userContent.push({
        type: 'image_url',
        image_url: { url: `data:${mimeType};base64,${base64}` }
      })
    }
    userContent.push({ type: 'text', text: currentContent.trim() })
    messages.push({ role: 'user', content: userContent })
  } else {
    messages.push({ role: 'user', content: currentContent.trim() })
  }

  return messages
}

// ========== 云函数主入口 ==========
exports.main = async (event) => {
  const { content, imageUrl } = event

  // 参数校验
  if (!content || typeof content !== 'string' || content.trim().length === 0) {
    return { success: false, error: '消息内容不能为空' }
  }
  if (content.length > 500) {
    return { success: false, error: '消息内容不能超过 500 字' }
  }

  const sessionId = await getSessionId(event)
  const now = Date.now()

  // 读取配置
  const apiKey = config.API_KEY
  const apiUrl = config.API_URL
  const model = config.MODEL

  if (!apiKey) {
    return { success: false, error: 'API Key 未配置' }
  }

  try {
    // 1. 读取最近历史记录
    const historyRes = await db.collection('ai_conversations')
      .where({ sessionId })
      .orderBy('createdAt', 'desc')
      .limit(MAX_HISTORY)
      .get()

    const history = historyRes.data.reverse()

    // 2. 构建 messages（含多模态图片）
    const messages = await buildHistoryMessages(history, content, imageUrl)

    // 3. 调用 MiMo API
    const reply = await callMiMo(apiUrl, apiKey, model, messages)

    // 4. 存储用户消息（如果是图片消息则保存 imageUrl）
    await db.collection('ai_conversations').add({
      data: {
        sessionId,
        role: 'user',
        content: imageUrl || content.trim(),
        type: imageUrl ? 'image' : 'text',
        createdAt: now
      }
    })

    await db.collection('ai_conversations').add({
      data: {
        sessionId,
        role: 'assistant',
        content: reply,
        type: 'text',
        createdAt: now + 1
      }
    })

    return { success: true, reply, sessionId }
  } catch (err) {
    console.error('aiChat error:', err)
    return { success: false, error: err.message || '服务异常，请稍后再试' }
  }
}
