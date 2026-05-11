// pages/chatList/index.js
// 聊天列表页 — 显示所有对话

function getDB() { return wx.cloud.database() }

Page({
  data: {
    chatList: [],
    isEmpty: false,
    myOpenId: ''
  },

  onShow() {
    const app = getApp()
    const myOpenId = app.globalData.openid || wx.getStorageSync('openid') || ''
    this.setData({ myOpenId })
    this.loadChatList()
  },

  async loadChatList() {
    try {
      const db = getDB()
      const OPENID = this.data.myOpenId || ''

      const res = await db.collection('chat_sessions')
        .where({ participants: OPENID })
        .orderBy('lastTime', 'desc')
        .limit(50)
        .get()

      this.setData({
        chatList: res.data.map(item => ({
          ...item,
          lastTimeStr: this.formatTime(item.lastTime)
        })),
        isEmpty: res.data.length === 0
      })
    } catch (err) {
      console.error('加载聊天列表失败:', err)
    }
  },

  onChatTap(e) {
    const item = e.currentTarget.dataset.item
    const myOpenId = this.data.myOpenId
    const otherOpenId = item.participants.find(p => p !== myOpenId) || ''

    wx.navigateTo({
      url: `/pages/chat/index?goodsId=${item.goodsId}&nickName=${encodeURIComponent('对方')}&avatarUrl=${encodeURIComponent('/images/default-avatar.png')}&openId=${encodeURIComponent(otherOpenId)}`
    })
  },

  // 长按删除聊天
  onDeleteChat(e) {
    const item = e.currentTarget.dataset.item
    wx.showActionSheet({
      itemList: ['删除该对话'],
      itemColor: '#e74c3c',
      success: (res) => {
        if (res.tapIndex === 0) {
          wx.showModal({
            title: '确认删除',
            content: '删除后聊天记录将无法恢复，确定要删除吗？',
            confirmColor: '#e74c3c',
            success: async (modal) => {
              if (!modal.confirm) return
              try {
                const db = getDB()
                // 删除会话记录
                await db.collection('chat_sessions').doc(item._id).remove()
                // 删除该会话的所有消息
                await db.collection('chat_messages').where({ chatId: item.chatId }).remove().catch(() => {})
                // 更新本地列表
                const chatList = this.data.chatList.filter(c => c._id !== item._id)
                this.setData({ chatList, isEmpty: chatList.length === 0 })
                wx.showToast({ title: '已删除', icon: 'success' })
              } catch (err) {
                console.error('删除聊天失败:', err)
                wx.showToast({ title: '删除失败', icon: 'none' })
              }
            }
          })
        }
      }
    })
  },

  onImageError(e) {
    const idx = e.currentTarget.dataset.index
    const key = `chatList[${idx}].goodsImage`
    this.setData({ [key]: '/images/goods-placeholder.png' })
  },

  formatTime(ts) {
    if (!ts) return ''
    const d = new Date(ts)
    const now = new Date()
    const diff = now - d

    if (diff < 60000) return '刚刚'
    if (diff < 3600000) return Math.floor(diff / 60000) + '分钟前'
    if (diff < 86400000) return Math.floor(diff / 3600000) + '小时前'

    const month = (d.getMonth() + 1).toString().padStart(2, '0')
    const day = d.getDate().toString().padStart(2, '0')
    return `${month}-${day}`
  }
})
