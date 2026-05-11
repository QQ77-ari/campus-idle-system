// pages/myPublish/index.js
/**
 * 我的发布页（云开发版）
 */

// 注意：不在文件顶部创建 db，而是在方法内按需创建
// 避免 wx.cloud.init() 还没执行时 db 为 null
function getDB() {
  return wx.cloud.database()
}

Page({
  data: {
    publishList: [],
    isEmpty: false
  },

  onShow() {
    this.loadPublishList()
  },

  /** 加载我发布的商品 */
  async loadPublishList() {
    try {
      const db = getDB()
      const app = getApp()
      const openid = app.globalData.openid || wx.getStorageSync('openid') || ''

      let query = db.collection('goods')
      if (openid) {
        query = query.where({ _openid: openid })
      }

      const res = await query
        .orderBy('createdAt', 'desc')
        .get()

      this.setData({
        publishList: res.data,
        isEmpty: res.data.length === 0
      })
    } catch (err) {
      console.error('加载发布列表失败：', err)
      wx.showToast({ title: '加载失败，请检查云数据库权限', icon: 'none', duration: 3000 })
    }
  },

  /** 点击商品跳转详情 */
  onGoodsTap(e) {
    const goodsId = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/goodsDetail/index?id=${goodsId}`
    })
  },

  /** 编辑商品 */
  onEditGoods(e) {
    const goodsId = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/publish/index?id=${goodsId}`
    })
  },

  onImageError(e) {
    const idx = e.currentTarget.dataset.index
    const key = `publishList[${idx}].images[0]`
    this.setData({ [key]: '/images/goods-placeholder.png' })
  },

  /** 下架商品 */
  onRemoveGoods(e) {
    const goodsId = e.currentTarget.dataset.id
    const goodsTitle = e.currentTarget.dataset.title
    const that = this

    wx.showModal({
      title: '提示',
      content: `确定下架「${goodsTitle}」吗？`,
      success(res) {
        if (!res.confirm) return

        const db = getDB()
        db.collection('goods').doc(goodsId).update({
          data: { status: '下架' }
        }).then(function () {
          that.loadPublishList()
          wx.showToast({ title: '已下架', icon: 'success' })
        }).catch(function (err) {
          console.error('下架失败：', err)
          wx.showToast({ title: '操作失败', icon: 'none' })
        })
      }
    })
  },

  /** 删除商品（从数据库彻底移除） */
  onDeleteGoods(e) {
    const goodsId = e.currentTarget.dataset.id
    const goodsTitle = e.currentTarget.dataset.title
    const that = this

    wx.showModal({
      title: '提示',
      content: `确定删除「${goodsTitle}」吗？删除后不可恢复。`,
      success(res) {
        if (!res.confirm) return

        const db = getDB()
        db.collection('goods').doc(goodsId).remove().then(function () {
          that.loadPublishList()
          wx.showToast({ title: '已删除', icon: 'success' })
        }).catch(function (err) {
          console.error('删除失败：', err)
          wx.showToast({ title: '操作失败', icon: 'none' })
        })
      }
    })
  }
})
