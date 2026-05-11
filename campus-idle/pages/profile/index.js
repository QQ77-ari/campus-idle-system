// pages/profile/index.js
/**
 * 个人中心页
 * 功能：微信登录获取用户信息、我的发布/收藏数量统计、功能菜单
 */

function getDB() { return wx.cloud.database() }

Page({
  data: {
    userInfo: null,
    hasLogin: false,
    publishCount: 0,
    collectCount: 0
  },

  onShow() {
    // 从全局数据读取用户信息
    const app = getApp()
    if (app.globalData.userInfo) {
      this.setData({
        userInfo: app.globalData.userInfo,
        hasLogin: true
      })
    }
    this.loadStats()
  },

  // ========== 微信登录 ==========

  onChooseAvatar(e) {
    const avatarUrl = e.detail.avatarUrl
    this.setData({
      'userInfo.avatarUrl': avatarUrl,
      hasLogin: true
    })
    const app = getApp()
    app.globalData.userInfo = this.data.userInfo
    wx.setStorageSync('userInfo', this.data.userInfo)
  },

  onNicknameComplete(e) {
    const nickName = e.detail.value
    if (!nickName) return
    const userInfo = {
      ...this.data.userInfo,
      nickName: nickName
    }
    this.setData({
      userInfo,
      hasLogin: true
    })
    const app = getApp()
    app.globalData.userInfo = userInfo
    wx.setStorageSync('userInfo', userInfo)
    wx.showToast({ title: '登录成功', icon: 'success' })
  },

  // ========== 加载统计数据 ==========

  async loadStats() {
    try {
      const db = getDB()
      const app = getApp()
      const openid = app.globalData.openid || wx.getStorageSync('openid') || ''

      const _ = db.command
      let goodsQuery = db.collection('goods')
      let collectsQuery = db.collection('collects')

      if (openid) {
        goodsQuery = goodsQuery.where({ _openid: openid })
        collectsQuery = collectsQuery.where({ _openid: openid })
      }

      const [goodsRes, collectsRes] = await Promise.all([
        goodsQuery.count(),
        collectsQuery.count()
      ])

      this.setData({
        publishCount: goodsRes.total,
        collectCount: collectsRes.total
      })
    } catch (err) {
      console.error('加载统计数据失败：', err)
    }
  },

  // ========== 页面跳转 ==========

  onGoFavorites() {
    wx.navigateTo({ url: '/pages/favorites/index' })
  },

  onGoMyPublish() {
    wx.navigateTo({ url: '/pages/myPublish/index' })
  },

  onGoAiChat() {
    wx.navigateTo({ url: '/pages/aiChat/index' })
  },

  onGoChatList() {
    wx.navigateTo({ url: '/pages/chatList/index' })
  },

  onGoOrders() {
    wx.navigateTo({ url: '/pages/orders/index' })
  },

  onGoAdmin() {
    wx.navigateTo({ url: '/pages/admin/index' })
  },

  onGoPrivacy() {
    wx.navigateTo({ url: '/pages/privacy/index' })
  },

  onAbout() {
    wx.showModal({
      title: '关于校园闲置',
      content: '校园闲置物品交易平台 v2.0\n\n让闲置物品找到新主人，\n让校园生活更绿色、更省钱。\n\n如有问题请联系管理员',
      showCancel: false,
      confirmText: '知道了'
    })
  },

  onClearCache() {
    wx.showModal({
      title: '提示',
      content: '确定要清除本地缓存吗？（云端数据不会被删除）',
      success: (res) => {
        if (res.confirm) {
          wx.clearStorageSync()
          this.setData({ userInfo: null, hasLogin: false })
          const app = getApp()
          app.globalData.userInfo = null
          wx.showToast({ title: '已清除', icon: 'success' })
        }
      }
    })
  },

  onCleanImages() {
    wx.showModal({
      title: '清理无效图片',
      content: '将数据库中所有 Unsplash 失效链接替换为占位图，确定执行？',
      success: async (res) => {
        if (!res.confirm) return
        wx.showLoading({ title: '清理中...' })
        try {
          const result = await wx.cloud.callFunction({
            name: 'cleanImages'
          })
          wx.hideLoading()
          wx.showModal({
            title: '清理完成',
            content: result.result.message,
            showCancel: false
          })
          this.loadStats()
        } catch (err) {
          wx.hideLoading()
          console.error('清理失败：', err)
          wx.showToast({ title: '清理失败，请先部署云函数', icon: 'none' })
        }
      }
    })
  }
})
