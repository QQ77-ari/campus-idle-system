// pages/admin/index.js
// 管理员数据后台

function getDB() { return wx.cloud.database() }

Page({
  data: {
    stats: {
      totalGoods: 0,
      onSaleGoods: 0,
      totalOrders: 0,
      completedOrders: 0,
      totalReports: 0,
      pendingReports: 0,
      totalUsers: 0
    },
    recentGoods: [],
    recentReports: []
  },

  onShow() {
    this.loadStats()
  },

  async loadStats() {
    wx.showLoading({ title: '加载中...' })
    try {
      const db = getDB()

      // 并行加载所有统计数据
      const [
        totalGoods, onSaleGoods,
        totalOrders, completedOrders,
        totalReports, pendingReports,
        recentGoodsRes, recentReportsRes
      ] = await Promise.all([
        db.collection('goods').count(),
        db.collection('goods').where({ status: '在售' }).count(),
        db.collection('orders').count(),
        db.collection('orders').where({ status: 'completed' }).count(),
        db.collection('reports').count(),
        db.collection('reports').where({ status: '待处理' }).count(),
        db.collection('goods').orderBy('createdAt', 'desc').limit(10).get(),
        db.collection('reports').orderBy('reportedAt', 'desc').limit(10).get()
      ])

      this.setData({
        stats: {
          totalGoods: totalGoods.total,
          onSaleGoods: onSaleGoods.total,
          totalOrders: totalOrders.total,
          completedOrders: completedOrders.total,
          totalReports: totalReports.total,
          pendingReports: pendingReports.total
        },
        recentGoods: recentGoodsRes.data,
        recentReports: recentReportsRes.data
      })
    } catch (err) {
      console.error('加载数据失败:', err)
      wx.showToast({ title: '加载失败', icon: 'none' })
    } finally {
      wx.hideLoading()
    }
  },

  // 处理举报
  async onHandleReport(e) {
    const reportId = e.currentTarget.dataset.id
    const action = e.currentTarget.dataset.action

    wx.showModal({
      title: '确认',
      content: action === 'dismiss' ? '确定忽略此举报？' : '确定已处理此举报？',
      success: async (res) => {
        if (!res.confirm) return
        try {
          await getDB().collection('reports').doc(reportId).update({
            data: { status: action === 'dismiss' ? '已忽略' : '已处理' }
          })
          wx.showToast({ title: '已更新', icon: 'success' })
          this.loadStats()
        } catch (err) {
          wx.showToast({ title: '操作失败', icon: 'none' })
        }
      }
    })
  },

  // 下架商品
  async onTakeDownGoods(e) {
    const goodsId = e.currentTarget.dataset.id
    wx.showModal({
      title: '确认下架',
      content: '确定要下架此商品吗？',
      success: async (res) => {
        if (!res.confirm) return
        try {
          await getDB().collection('goods').doc(goodsId).update({
            data: { status: '下架' }
          })
          wx.showToast({ title: '已下架', icon: 'success' })
          this.loadStats()
        } catch (err) {
          wx.showToast({ title: '操作失败', icon: 'none' })
        }
      }
    })
  },

  formatTime(ts) {
    if (!ts) return ''
    const d = new Date(ts)
    return `${d.getMonth()+1}/${d.getDate()} ${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`
  }
})
