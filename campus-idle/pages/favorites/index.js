// pages/favorites/index.js
/**
 * 我的收藏页（云开发版）
 */

function getDB() { return wx.cloud.database() }

Page({
  data: {
    collectList: [],
    isEmpty: false
  },

  onShow() {
    this.loadCollectList()
  },

  /** 加载收藏列表 */
  async loadCollectList() {
    try {
      const db = getDB()
      const app = getApp()
      const openid = app.globalData.openid || wx.getStorageSync('openid') || ''

      let query = db.collection('collects')
      if (openid) {
        query = query.where({ _openid: openid })
      }

      const res = await query
        .orderBy('createdAt', 'desc')
        .get()

      this.setData({
        collectList: res.data,
        isEmpty: res.data.length === 0
      })
    } catch (err) {
      console.error('加载收藏列表失败：', err)
    }
  },

  /** 取消收藏 */
  onRemoveCollect(e) {
    const docId = e.currentTarget.dataset.docid
    const goodsTitle = e.currentTarget.dataset.title
    const that = this

    wx.showModal({
      title: '提示',
      content: `确定取消收藏「${goodsTitle}」吗？`,
      success(res) {
        if (!res.confirm) return
        const db = getDB()
        db.collection('collects').doc(docId).remove().then(function () {
          that.loadCollectList()
          wx.showToast({ title: '已取消收藏', icon: 'none' })
        }).catch(function (err) {
          console.error('取消收藏失败：', err)
          wx.showToast({ title: '操作失败', icon: 'none' })
        })
      }
    })
  },

  /** 点击商品跳转详情 */
  onGoodsTap(e) {
    const goodsId = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/goodsDetail/index?id=${goodsId}`
    })
  },

  onImageError(e) {
    const idx = e.currentTarget.dataset.index
    const key = `collectList[${idx}].goodsCoverImg`
    this.setData({ [key]: '/images/goods-placeholder.png' })
  }
})
