// pages/privacy/index.js
/**
 * 隐私政策页
 */
Page({
  data: {
    agreed: false
  },

  onLoad() {
    const app = getApp()
    this.setData({ agreed: app.globalData.privacyAgreed })
  },

  onAgree() {
    const app = getApp()
    app.globalData.privacyAgreed = true
    wx.setStorageSync('privacy_agreed', true)
    this.setData({ agreed: true })
    wx.showToast({ title: '已同意隐私政策', icon: 'success' })
    setTimeout(() => {
      wx.switchTab({ url: '/pages/index/index' })
    }, 800)
  }
})
