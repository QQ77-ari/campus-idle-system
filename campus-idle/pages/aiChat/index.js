// pages/aiChat/index.js
// 智能助手聊天页

function getDB() { return wx.cloud.database() }

// 本地生成会话 ID
function getLocalSessionId() {
  let sid = wx.getStorageSync('ai_session_id')
  if (!sid) {
    sid = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 8)
    wx.setStorageSync('ai_session_id', sid)
  }
  return sid
}

Page({
  data: {
    messages: [],
    inputText: '',
    isLoading: false,
    scrollTop: 0,
    scrollIntoView: '',
    sessionId: '',
    userInfo: null,
    quickQuestions: [
      '帮我给一本二手教材定价',
      '二手手机怎么估价？',
      '如何写好商品描述？',
      '线下交易注意什么？'
    ]
  },

  onLoad() {
    this.setData({ sessionId: getLocalSessionId() })
    // 加载用户信息（用于显示用户头像）
    const app = getApp()
    if (app.globalData.userInfo) {
      this.setData({ userInfo: app.globalData.userInfo })
    }
    this.loadHistory()
  },

  // ========== 加载历史消息 ==========
  async loadHistory() {
    try {
      const db = getDB()
      const res = await db.collection('ai_conversations')
        .where({ sessionId: this.data.sessionId })
        .orderBy('createdAt', 'asc')
        .limit(50)
        .get()

      if (res.data.length > 0) {
        const messages = res.data.map(item => ({
          role: item.role,
          content: item.content,
          type: item.type || 'text',
          time: this.formatTime(item.createdAt)
        }))
        this.setData({ messages })
        this.scrollToBottom()
      } else {
        // 无历史，显示欢迎语
        this.setData({
          messages: [{
            role: 'assistant',
            content: '你好！我是校园闲置助手 \n\n有什么关于二手交易的问题都可以问我，比如商品定价、描述优化、交易安全等～\n\n你也可以发图片给我看哦！',
            type: 'text',
            time: this.formatTime(Date.now())
          }]
        })
      }
    } catch (err) {
      console.error('加载历史失败:', err)
    }
  },

  // ========== 选择图片 ==========
  onChooseImage() {
    if (this.data.isLoading) return
    wx.showActionSheet({
      itemList: ['拍照', '从相册选择'],
      success: (res) => {
        const sourceType = res.tapIndex === 0 ? ['camera'] : ['album']
        wx.chooseMedia({
          count: 1,
          mediaType: ['image'],
          sourceType: sourceType,
          sizeType: ['compressed'],
          success: (res) => {
            const tempFilePath = res.tempFiles[0].tempFilePath
            this.uploadAndSendImage(tempFilePath)
          }
        })
      }
    })
  },

  // ========== 上传图片并发送 ==========
  async uploadAndSendImage(tempFilePath) {
    // 先显示本地图片预览
    const localMsg = {
      role: 'user',
      content: tempFilePath,
      type: 'image',
      time: this.formatTime(Date.now())
    }
    const now = Date.now()
    this.setData({
      messages: [...this.data.messages, localMsg],
      isLoading: true
    })
    this.scrollToBottom()

    try {
      // 1. 上传到云存储
      const ext = tempFilePath.split('.').pop() || 'jpg'
      const cloudPath = `ai_chat/${now}.${ext}`
      const uploadRes = await wx.cloud.uploadFile({
        cloudPath: cloudPath,
        filePath: tempFilePath
      })
      const fileID = uploadRes.fileID

      // 2. 替换本地路径为云文件 ID
      const msgs = this.data.messages
      msgs[msgs.length - 1].content = fileID
      this.setData({ messages: msgs })

      // 3. 保存图片消息到数据库（异步，不阻塞）
      getDB().collection('ai_conversations').add({
        data: {
          sessionId: this.data.sessionId,
          role: 'user',
          content: fileID,
          type: 'image',
          createdAt: now
        }
      }).catch(err => console.error('保存图片消息失败:', err))

      // 4. 发送图片描述文本给 AI
      this.setData({ isLoading: true })
      const result = await wx.cloud.callFunction({
        name: 'aiChat',
        data: {
          content: '[用户发送了一张图片]',
          sessionId: this.data.sessionId,
          imageUrl: fileID
        }
      })

      const res = result.result
      if (res && res.success) {
        const aiMsg = {
          role: 'assistant',
          content: res.reply,
          type: 'text',
          time: this.formatTime(Date.now())
        }
        this.setData({
          messages: [...this.data.messages, aiMsg]
        })
      } else {
        const aiMsg = {
          role: 'assistant',
          content: (res && res.error) ? '识别失败：' + res.error : '图片已收到，但识别出了点问题，请重试',
          type: 'text',
          time: this.formatTime(Date.now()),
          isError: true
        }
        this.setData({
          messages: [...this.data.messages, aiMsg]
        })
      }
    } catch (err) {
      console.error('图片处理失败:', err)
      const errorMsg = {
        role: 'assistant',
        content: '图片处理超时，请检查网络后重试',
        type: 'text',
        time: this.formatTime(Date.now()),
        isError: true
      }
      this.setData({
        messages: [...this.data.messages, errorMsg]
      })
    } finally {
      this.setData({ isLoading: false })
      this.scrollToBottom()
    }
  },

  // ========== 预览图片 ==========
  onPreviewImage(e) {
    const url = e.currentTarget.dataset.url
    // 只预览非本地路径的图片
    if (url && !url.startsWith('wxfile://')) {
      wx.previewImage({
        current: url,
        urls: [url]
      })
    }
  },

  // ========== 发送文本消息 ==========
  async onSend() {
    const content = this.data.inputText.trim()
    if (!content || this.data.isLoading) return

    // 追加用户消息到界面
    const userMsg = {
      role: 'user',
      content: content,
      type: 'text',
      time: this.formatTime(Date.now())
    }
    this.setData({
      messages: [...this.data.messages, userMsg],
      inputText: '',
      isLoading: true
    })
    this.scrollToBottom()

    try {
      const result = await wx.cloud.callFunction({
        name: 'aiChat',
        data: { content, sessionId: this.data.sessionId }
      })

      const res = result.result
      if (res.success) {
        const aiMsg = {
          role: 'assistant',
          content: res.reply,
          type: 'text',
          time: this.formatTime(Date.now())
        }
        this.setData({
          messages: [...this.data.messages, aiMsg]
        })
      } else {
        const errorMsg = {
          role: 'assistant',
          content: '抱歉，出了点问题：' + (res.error || '请稍后再试'),
          type: 'text',
          time: this.formatTime(Date.now()),
          isError: true
        }
        this.setData({
          messages: [...this.data.messages, errorMsg]
        })
      }
    } catch (err) {
      console.error('发送失败:', err)
      const errorMsg = {
        role: 'assistant',
        content: '网络连接失败，请检查网络后重试',
        type: 'text',
        time: this.formatTime(Date.now()),
        isError: true
      }
      this.setData({
        messages: [...this.data.messages, errorMsg]
      })
    } finally {
      this.setData({ isLoading: false })
      this.scrollToBottom()
    }
  },

  // ========== 快捷提问 ==========
  onQuickTap(e) {
    const question = e.currentTarget.dataset.text
    this.setData({ inputText: question })
    this.onSend()
  },

  // ========== 清空对话 ==========
  onClearChat() {
    wx.showModal({
      title: '提示',
      content: '确定要清空所有对话记录吗？',
      success: (res) => {
        if (!res.confirm) return
        const db = getDB()
        db.collection('ai_conversations')
          .where({ sessionId: this.data.sessionId })
          .remove()
          .then(() => {
            // 生成新会话 ID
            const newSid = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 8)
            wx.setStorageSync('ai_session_id', newSid)
            this.setData({
              messages: [],
              sessionId: newSid
            })
            this.loadHistory()
          })
          .catch(err => {
            console.error('清空失败:', err)
            wx.showToast({ title: '清空失败', icon: 'none' })
          })
      }
    })
  },

  // ========== 输入框变化 ==========
  onInputChange(e) {
    this.setData({ inputText: e.detail.value })
  },

  // ========== 工具方法 ==========

  scrollToBottom() {
    const msgs = this.data.messages
    if (msgs.length > 0) {
      this.setData({ scrollIntoView: 'msg-' + (msgs.length - 1) })
    }
  },

  formatTime(ts) {
    const d = new Date(ts)
    const h = d.getHours().toString().padStart(2, '0')
    const m = d.getMinutes().toString().padStart(2, '0')
    return h + ':' + m
  }
})
