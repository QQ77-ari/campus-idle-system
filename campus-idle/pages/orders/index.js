// pages/orders/index.js
// 我的订单页

function getDB() { return wx.cloud.database() }
const _ = wx.cloud.database().command

Page({
  data: {
    activeTab: 'buy', // buy | sell
    buyOrders: [],
    sellOrders: [],
    isEmpty: false
  },

  onShow() {
    this.loadOrders()
  },

  onTabChange(e) {
    this.setData({ activeTab: e.currentTarget.dataset.tab })
    this.loadOrders()
  },

  async loadOrders() {
    try {
      const db = getDB()
      const app = getApp()
      const openid = app.globalData.openid || wx.getStorageSync('openid') || ''

      const field = this.data.activeTab === 'buy' ? 'buyerId' : 'sellerId'
      const res = await db.collection('orders')
        .where({ [field]: openid })
        .orderBy('createdAt', 'desc')
        .limit(50)
        .get()

      if (this.data.activeTab === 'buy') {
        this.setData({ buyOrders: res.data, isEmpty: res.data.length === 0 })
      } else {
        this.setData({ sellOrders: res.data, isEmpty: res.data.length === 0 })
      }
    } catch (err) {
      console.error('加载订单失败:', err)
    }
  },

  onOrderTap(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: `/pages/orderDetail/index?id=${id}` })
  },

  getStatusText(status) {
    const map = { pending: '待确认', confirmed: '已确认', completed: '已完成', cancelled: '已取消' }
    return map[status] || status
  },

  onImageError(e) {
    const idx = e.currentTarget.dataset.index
    const field = this.data.activeTab === 'buy' ? 'buyOrders' : 'sellOrders'
    const key = `${field}[${idx}].goodsImage`
    this.setData({ [key]: '/images/goods-placeholder.png' })
  }
})
