// pages/chat/index.js
// 买家-卖家站内聊天

function getDB() { return wx.cloud.database() }
const _ = wx.cloud.database().command

Page({
  data: {
    messages: [],
    inputText: '',
    isLoading: false,
    scrollIntoView: '',
    chatId: '',
    goodsId: '',
    goodsInfo: null,
    otherUser: {},
    myOpenId: '',
    userInfo: null
  },

  onLoad(options) {
    const app = getApp()
    const myOpenId = app.globalData.openid || wx.getStorageSync('openid') || ''
    const userInfo = app.globalData.userInfo || wx.getStorageSync('userInfo') || {}
    this.setData({ myOpenId, userInfo })

    if (options.goodsId) {
      this.setData({
        goodsId: options.goodsId,
        otherUser: {
          nickName: decodeURIComponent(options.nickName || ''),
          avatarUrl: decodeURIComponent(options.avatarUrl || ''),
          openId: decodeURIComponent(options.openId || '')
        }
      })
      this.initChat()
    }
  },

  // ========== 初始化聊天 ==========
  async initChat() {
    const db = getDB()
    const { goodsId, myOpenId, otherUser } = this.data

    // 生成 chatId（goodsId + 双方 openid 排序拼接）
    const participants = [myOpenId, otherUser.openId].sort()
    const chatId = `${goodsId}_${participants[0]}_${participants[1]}`
    this.setData({ chatId })

    // 加载商品信息
    try {
      const goodsRes = await db.collection('goods').doc(goodsId).get()
      this.setData({ goodsInfo: goodsRes.data })
    } catch (e) {
      console.error('加载商品信息失败:', e)
    }

    // 加载聊天记录
    this.loadMessages()
  },

  // ========== 加载消息 ==========
  async loadMessages() {
    try {
      const db = getDB()
      const res = await db.collection('chat_messages')
        .where({ chatId: this.data.chatId })
        .orderBy('createdAt', 'asc')
        .limit(100)
        .get()

      const messages = res.data.map(item => ({
        ...item,
        isMine: item.senderId === this.data.myOpenId,
        time: this.formatTime(item.createdAt)
      }))

      this.setData({ messages })
      this.scrollToBottom()
    } catch (err) {
      console.error('加载消息失败:', err)
    }
  },

  // ========== 输入变化 ==========
  onInputChange(e) {
    this.setData({ inputText: e.detail.value })
  },

  // ========== 发送消息 ==========
  async onSend() {
    const content = this.data.inputText.trim()
    if (!content || this.data.isLoading) return

    this.setData({ isLoading: true, inputText: '' })
    const now = Date.now()
    const app = getApp()
    const userInfo = app.globalData.userInfo || {}

    try {
      await this.sendMessage(content, now, userInfo)
      // 追加到界面
      const msg = {
        content,
        senderId: this.data.myOpenId,
        isMine: true,
        time: this.formatTime(now),
        type: 'text'
      }
      this.setData({
        messages: [...this.data.messages, msg]
      })
      this.scrollToBottom()
    } catch (err) {
      console.error('发送失败:', err)
      wx.showToast({ title: '发送失败', icon: 'none' })
    } finally {
      this.setData({ isLoading: false })
    }
  },

  // 写入消息和会话（集合不存在时自动创建后重试）
  async sendMessage(content, now, userInfo, isRetry) {
    const db = getDB()
    try {
      // 1. 写入 chat_messages
      await db.collection('chat_messages').add({
        data: {
          chatId: this.data.chatId,
          goodsId: this.data.goodsId,
          senderId: this.data.myOpenId,
          senderName: userInfo.nickName || '我',
          senderAvatar: userInfo.avatarUrl || '',
          receiverId: this.data.otherUser.openId,
          content: content,
          type: 'text',
          createdAt: now,
          read: false
        }
      })

      // 2. 更新/创建 chat_sessions
      await db.collection('chat_sessions').where({
        chatId: this.data.chatId
      }).remove().catch(() => {})

      await db.collection('chat_sessions').add({
        data: {
          chatId: this.data.chatId,
          goodsId: this.data.goodsId,
          goodsTitle: this.data.goodsInfo ? this.data.goodsInfo.title : '',
          goodsImage: this.data.goodsInfo && this.data.goodsInfo.images ? this.data.goodsInfo.images[0] : '',
          participants: [this.data.myOpenId, this.data.otherUser.openId],
          lastMessage: content,
          lastTime: now,
          unreadCount: 1
        }
      })
    } catch (err) {
      // 集合不存在：自动创建后重试一次
      if (err.errCode === -502005 && !isRetry) {
        await this.createCollections()
        return this.sendMessage(content, now, userInfo, true)
      }
      throw err
    }
  },

  // 创建缺失的集合
  async createCollections() {
    const db = getDB()
    const collections = ['chat_messages', 'chat_sessions']
    for (const name of collections) {
      try {
        await db.collection(name).add({
          data: { _tag: '_init', content: '初始化', createdAt: Date.now() }
        })
        await db.collection(name).where({ _tag: '_init' }).remove()
      } catch (e) {}
    }
  },

  // ========== 跳转商品详情 ==========
  onGoGoodsDetail() {
    if (this.data.goodsId) {
      wx.navigateTo({ url: `/pages/goodsDetail/index?id=${this.data.goodsId}` })
    }
  },

  // ========== 工具方法 ==========

  scrollToBottom() {
    const msgs = this.data.messages
    if (msgs.length > 0) {
      this.setData({ scrollIntoView: 'chat-msg-' + (msgs.length - 1) })
    }
  },

  formatTime(ts) {
    const d = new Date(ts)
    const month = (d.getMonth() + 1).toString().padStart(2, '0')
    const day = d.getDate().toString().padStart(2, '0')
    const h = d.getHours().toString().padStart(2, '0')
    const m = d.getMinutes().toString().padStart(2, '0')
    return `${month}-${day} ${h}:${m}`
  }
})
