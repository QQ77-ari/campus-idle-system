// pages/goodsDetail/index.js
/**
 * 商品详情页（商务大气版）
 * 功能：轮播图预览、商品信息展示、收藏/取消收藏、私信卖家（真实联系方式）、分享
 */

function getDB() { return wx.cloud.database() }

Page({
  data: {
    currentSwiperIndex: 0,
    goodsInfo: {},
    goodsDocId: '',
    isCollected: false,
    collectDocId: '',
    isLoading: true
  },

  // ========== 生命周期 ==========

  onLoad(options) {
    const goodsId = options.id
    this.loadGoodsDetail(goodsId)
  },

  // ========== 加载商品详情 ==========

  async loadGoodsDetail(goodsId) {
    this.setData({ isLoading: true })

    try {
      const db = getDB()
      const res = await db.collection('goods').doc(goodsId).get()
      const goods = res.data

      if (!goods) {
        wx.showToast({ title: '商品不存在', icon: 'none' })
        setTimeout(() => wx.navigateBack(), 1500)
        return
      }

      // 格式化发布时间
      const date = new Date(goods.createdAt)
      const publishTime = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`

      const goodsInfo = {
        _id: goods._id,
        title: goods.title,
        price: goods.price,
        originalPrice: goods.originalPrice || 0,
        category: goods.category,
        condition: goods.condition || '未标注',
        desc: goods.desc,
        images: goods.images,
        nickName: goods.nickName,
        avatarUrl: goods.avatarUrl || '/images/default-avatar.png',
        publishTime,
        viewCount: goods.viewCount || 0,
        wechatId: goods.wechatId || '',
        phone: goods.phone || ''
      }

      this.setData({
        goodsInfo,
        goodsDocId: goods._id,
        isLoading: false
      })

      // 检查收藏状态
      this.checkCollectStatus(goodsId)

    } catch (err) {
      console.error('加载商品详情失败：', err)
      this.setData({ isLoading: false })
      wx.showToast({ title: '加载失败', icon: 'none' })
    }
  },

  // ========== 轮播图 ==========

  onSwiperChange(e) {
    this.setData({ currentSwiperIndex: e.detail.current })
  },

  onPreviewImage(e) {
    wx.previewImage({
      current: e.currentTarget.dataset.src,
      urls: this.data.goodsInfo.images
    })
  },

  onImageError(e) {
    const idx = e.currentTarget.dataset.index
    const key = `goodsInfo.images[${idx}]`
    this.setData({ [key]: '/images/goods-placeholder.png' })
  },

  // ========== 收藏相关 ==========

  async checkCollectStatus(goodsId) {
    try {
      const db = getDB()
      const res = await db.collection('collects').where({
        goodsId: goodsId
      }).get()

      if (res.data.length > 0) {
        this.setData({
          isCollected: true,
          collectDocId: res.data[0]._id
        })
      } else {
        this.setData({ isCollected: false, collectDocId: '' })
      }
    } catch (err) {
      console.error('检查收藏状态失败：', err)
    }
  },

  async onCollect() {
    const { goodsInfo, isCollected, collectDocId } = this.data

    try {
      const db = getDB()
      if (isCollected) {
        await db.collection('collects').doc(collectDocId).remove()
        this.setData({ isCollected: false, collectDocId: '' })
        wx.showToast({ title: '已取消收藏', icon: 'none' })
      } else {
        const res = await db.collection('collects').add({
          data: {
            goodsId: goodsInfo._id,
            goodsTitle: goodsInfo.title,
            goodsPrice: goodsInfo.price,
            goodsCoverImg: goodsInfo.images[0],
            createdAt: Date.now()
          }
        })
        this.setData({ isCollected: true, collectDocId: res._id })
        wx.showToast({ title: '收藏成功', icon: 'success' })
      }
    } catch (err) {
      console.error('收藏操作失败：', err)
      wx.showToast({ title: '操作失败', icon: 'none' })
    }
  },

  // ========== 发起交易 ==========

  onCreateOrder() {
    const { goodsInfo } = this.data
    const app = getApp()
    const myOpenId = app.globalData.openid || wx.getStorageSync('openid') || ''

    if (goodsInfo._openid === myOpenId) {
      wx.showToast({ title: '不能购买自己的商品', icon: 'none' })
      return
    }

    wx.showModal({
      title: '发起交易',
      content: `确定以 ¥${goodsInfo.price} 购买「${goodsInfo.title}」吗？`,
      success: async (res) => {
        if (!res.confirm) return
        try {
          await getDB().collection('orders').add({
            data: {
              goodsId: goodsInfo._id,
              goodsTitle: goodsInfo.title,
              goodsImage: goodsInfo.images ? goodsInfo.images[0] : '',
              price: goodsInfo.price,
              buyerId: myOpenId,
              sellerId: goodsInfo._openid || '',
              sellerName: goodsInfo.nickName,
              status: 'pending',
              createdAt: Date.now(),
              buyerReviewed: false,
              sellerReviewed: false
            }
          })

          // 更新商品状态为已售
          await getDB().collection('goods').doc(goodsInfo._id).update({
            data: { status: '已售' }
          })

          wx.showToast({ title: '交易已发起', icon: 'success' })
        } catch (err) {
          console.error('创建订单失败:', err)
          wx.showToast({ title: '操作失败', icon: 'none' })
        }
      }
    })
  },

  // ========== 举报 ==========

  onReport() {
    const reasons = ['虚假信息', '违禁物品', '价格欺诈', '骚扰行为', '其他']
    wx.showActionSheet({
      itemList: reasons,
      success: (res) => {
        const reason = reasons[res.tapIndex]
        const { goodsInfo } = this.data
        const db = getDB()

        db.collection('reports').add({
          data: {
            goodsId: goodsInfo._id,
            goodsTitle: goodsInfo.title,
            reason: reason,
            reportedAt: Date.now(),
            status: '待处理'
          }
        }).then(() => {
          wx.showToast({ title: '举报已提交', icon: 'success' })
        }).catch(err => {
          console.error('举报失败:', err)
          wx.showToast({ title: '举报失败', icon: 'none' })
        })
      }
    })
  },

  // ========== 在线聊天 ==========

  onChatSeller() {
    const { goodsInfo } = this.data
    if (!goodsInfo) return

    // 获取卖家的 openid（从商品创建者获取）
    const sellerOpenId = goodsInfo._openid || ''
    wx.navigateTo({
      url: `/pages/chat/index?goodsId=${goodsInfo._id}&nickName=${encodeURIComponent(goodsInfo.nickName || '卖家')}&avatarUrl=${encodeURIComponent(goodsInfo.avatarUrl || '/images/default-avatar.png')}&openId=${encodeURIComponent(sellerOpenId)}`
    })
  },

  // ========== 私信相关（真实联系方式） ==========

  onContactSeller() {
    const { goodsInfo } = this.data
    const itemList = []

    // 根据卖家填写的联系方式动态生成选项
    if (goodsInfo.wechatId) {
      itemList.push('复制微信号：' + goodsInfo.wechatId)
    }
    if (goodsInfo.phone) {
      itemList.push('拨打电话：' + goodsInfo.phone)
    }
    itemList.push('复制商品信息')

    // 如果没有任何联系方式，显示提示
    if (!goodsInfo.wechatId && !goodsInfo.phone) {
      wx.showActionSheet({
        itemList: ['复制商品标题', '复制卖家昵称'],
        success: (res) => {
          switch (res.tapIndex) {
            case 0:
              wx.setClipboardData({
                data: goodsInfo.title,
                success: () => wx.showToast({ title: '已复制标题', icon: 'success' })
              })
              break
            case 1:
              wx.setClipboardData({
                data: goodsInfo.nickName,
                success: () => wx.showToast({ title: '已复制昵称', icon: 'success' })
              })
              break
          }
        }
      })
      return
    }

    wx.showActionSheet({
      itemList,
      success: (res) => {
        let idx = 0

        // 微信号
        if (goodsInfo.wechatId) {
          if (res.tapIndex === idx) {
            wx.setClipboardData({
              data: goodsInfo.wechatId,
              success: () => wx.showToast({ title: '微信号已复制，去微信添加吧', icon: 'success' })
            })
            return
          }
          idx++
        }

        // 电话
        if (goodsInfo.phone) {
          if (res.tapIndex === idx) {
            wx.makePhoneCall({
              phoneNumber: goodsInfo.phone,
              fail: () => wx.showToast({ title: '已取消', icon: 'none' })
            })
            return
          }
          idx++
        }

        // 复制商品信息
        if (res.tapIndex === idx) {
          const info = '【' + goodsInfo.title + '】\n价格：¥' + goodsInfo.price + '\n卖家：' + goodsInfo.nickName + (goodsInfo.wechatId ? '\n微信：' + goodsInfo.wechatId : '') + (goodsInfo.phone ? '\n电话：' + goodsInfo.phone : '')
          wx.setClipboardData({
            data: info,
            success: () => wx.showToast({ title: '商品信息已复制', icon: 'success' })
          })
        }
      }
    })
  },

  // ========== 返回 & 分享 ==========

  onGoBack() {
    wx.navigateBack({
      fail: () => wx.switchTab({ url: '/pages/index/index' })
    })
  },

  onShareAppMessage() {
    const { goodsInfo } = this.data
    return {
      title: goodsInfo.title,
      path: `/pages/goodsDetail/index?id=${goodsInfo._id}`
    }
  }
})
