// pages/orderDetail/index.js
// 订单详情页（含评价功能）

function getDB() { return wx.cloud.database() }

Page({
  data: {
    order: null,
    myOpenId: '',
    canReview: false,
    reviewRating: 5,
    reviewContent: ''
  },

  onLoad(options) {
    const app = getApp()
    this.setData({ myOpenId: app.globalData.openid || wx.getStorageSync('openid') || '' })
    if (options.id) {
      this.loadOrder(options.id)
    }
  },

  async loadOrder(orderId) {
    try {
      const res = await getDB().collection('orders').doc(orderId).get()
      const order = res.data
      const isBuyer = order.buyerId === this.data.myOpenId
      const isCompleted = order.status === 'completed'
      const hasReviewed = isBuyer ? order.buyerReviewed : order.sellerReviewed

      this.setData({
        order,
        canReview: isCompleted && !hasReviewed
      })
    } catch (err) {
      console.error('加载订单失败:', err)
    }
  },

  // 确认交易
  async onConfirmOrder() {
    wx.showModal({
      title: '确认交易',
      content: '确定要确认此交易吗？',
      success: async (res) => {
        if (!res.confirm) return
        try {
          await getDB().collection('orders').doc(this.data.order._id).update({
            data: { status: 'completed', completedAt: Date.now() }
          })
          wx.showToast({ title: '交易完成', icon: 'success' })
          this.loadOrder(this.data.order._id)
        } catch (err) {
          wx.showToast({ title: '操作失败', icon: 'none' })
        }
      }
    })
  },

  // 取消订单
  async onCancelOrder() {
    wx.showModal({
      title: '取消订单',
      content: '确定取消此订单吗？',
      success: async (res) => {
        if (!res.confirm) return
        try {
          await getDB().collection('orders').doc(this.data.order._id).update({
            data: { status: 'cancelled' }
          })
          wx.showToast({ title: '已取消', icon: 'success' })
          this.loadOrder(this.data.order._id)
        } catch (err) {
          wx.showToast({ title: '操作失败', icon: 'none' })
        }
      }
    })
  },

  // 评分
  onRatingChange(e) {
    this.setData({ reviewRating: Number(e.currentTarget.dataset.rating) })
  },

  onReviewInput(e) {
    this.setData({ reviewContent: e.detail.value })
  },

  // 提交评价
  async onSubmitReview() {
    if (!this.data.reviewContent.trim()) {
      wx.showToast({ title: '请输入评价内容', icon: 'none' })
      return
    }

    try {
      const order = this.data.order
      const isBuyer = order.buyerId === this.data.myOpenId

      await getDB().collection('reviews').add({
        data: {
          orderId: order._id,
          goodsId: order.goodsId,
          reviewerId: this.data.myOpenId,
          targetId: isBuyer ? order.sellerId : order.buyerId,
          rating: this.data.reviewRating,
          content: this.data.reviewContent.trim(),
          createdAt: Date.now()
        }
      })

      // 更新订单评价状态
      const updateField = isBuyer ? 'buyerReviewed' : 'sellerReviewed'
      await getDB().collection('orders').doc(order._id).update({
        data: { [updateField]: true }
      })

      wx.showToast({ title: '评价成功', icon: 'success' })
      this.setData({ canReview: false })
      this.loadOrder(order._id)
    } catch (err) {
      console.error('评价失败:', err)
      wx.showToast({ title: '评价失败', icon: 'none' })
    }
  },

  formatTime(ts) {
    if (!ts) return ''
    const d = new Date(ts)
    return `${d.getFullYear()}-${(d.getMonth()+1).toString().padStart(2,'0')}-${d.getDate().toString().padStart(2,'0')} ${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`
  }
})
