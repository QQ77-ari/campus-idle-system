// app.js
App({
  onLaunch() {
    // ========== 初始化云开发 ==========
    wx.cloud.init({
      env: 'cloud1-d6g2u0fls0f793a5f',
      traceUser: true
    })

    // ========== 检查隐私政策同意状态 ==========
    const privacyAgreed = wx.getStorageSync('privacy_agreed')
    this.globalData.privacyAgreed = !!privacyAgreed

    // ========== 读取本地缓存的用户信息 ==========
    const userInfo = wx.getStorageSync('userInfo')
    if (userInfo) {
      this.globalData.userInfo = userInfo
    }

    // ========== 获取用户 OPENID ==========
    this.loadUserOpenId()

    console.log('校园闲置小程序启动')
  },

  // 获取当前用户的 OPENID（带超时兜底）
  loadUserOpenId() {
    const fallback = () => {
      const cached = wx.getStorageSync('openid')
      if (cached) {
        this.globalData.openid = cached
      }
    }
    const timer = setTimeout(fallback, 5000)
    wx.cloud.callFunction({
      name: 'getUserInfo'
    }).then(res => {
      clearTimeout(timer)
      if (res.result && res.result.openid) {
        this.globalData.openid = res.result.openid
        wx.setStorageSync('openid', res.result.openid)
      } else {
        fallback()
      }
    }).catch(() => {
      clearTimeout(timer)
      fallback()
    })
  },

  globalData: {
    userInfo: null,
    privacyAgreed: false,
    openid: ''
  }
})
