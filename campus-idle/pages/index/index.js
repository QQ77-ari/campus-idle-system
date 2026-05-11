// pages/index/index.js
/**
 * 首页 —— 商品列表浏览
 * 功能：搜索、分类筛选、下拉刷新、上拉加载更多
 * 数据来源：云数据库 goods 集合（用户自行发布的商品）
 */

const PAGE_SIZE = 10

function getDB() { return wx.cloud.database() }

Page({
  data: {
    searchValue: '',
    categories: ['全部', '书籍', '数码', '生活用品', '体育器材'],
    activeCategory: '全部',
    goodsList: [],
    page: 0,
    hasMore: true,
    isLoading: false,
    showBanner: true,
    // 筛选和排序
    showFilter: false,
    priceMin: '',
    priceMax: '',
    conditionFilter: '',
    sortBy: 'newest',
    conditionList: ['全新', '几乎全新', '有使用痕迹', '明显磨损']
  },

  // ========== 生命周期 ==========

  onLoad() {
    // 检查隐私政策是否已同意
    const app = getApp()
    if (!app.globalData.privacyAgreed) {
      wx.showModal({
        title: '隐私政策',
        content: '使用本小程序前，请先阅读并同意《隐私政策》。我们将保护您的个人信息安全。',
        confirmText: '去阅读',
        cancelText: '暂不使用',
        success: (res) => {
          if (res.confirm) {
            wx.navigateTo({ url: '/pages/privacy/index' })
          }
        }
      })
      return
    }
    this.loadGoods(true)
  },

  onShow() {
    this.loadGoods(true)
  },

  // ========== 从云数据库加载商品 ==========

  async loadGoods(reset = false) {
    if (this.data.isLoading) return
    if (!reset && !this.data.hasMore) return

    this.setData({ isLoading: true })

    const page = reset ? 0 : this.data.page
    const skip = page * PAGE_SIZE

    try {
      const db = getDB()
      const _ = db.command
      const whereCondition = { status: '在售' }

      if (this.data.activeCategory !== '全部') {
        whereCondition.category = this.data.activeCategory
      }

      // 新旧程度筛选
      if (this.data.conditionFilter) {
        whereCondition.condition = this.data.conditionFilter
      }

      // 价格区间筛选
      const priceMin = Number(this.data.priceMin)
      const priceMax = Number(this.data.priceMax)
      if (!isNaN(priceMin) && priceMin > 0) {
        whereCondition.price = _.gte(priceMin)
      }
      if (!isNaN(priceMax) && priceMax > 0) {
        whereCondition.price = whereCondition.price
          ? _.and(whereCondition.price, _.lte(priceMax))
          : _.lte(priceMax)
      }

      let query = db.collection('goods').where(whereCondition)

      if (this.data.searchValue.trim()) {
        const keyword = this.data.searchValue.trim()
        query = db.collection('goods').where({
          ...whereCondition,
          title: db.RegExp({ regexp: keyword, options: 'i' })
        })
      }

      // 排序
      let orderBy = 'createdAt'
      let orderDir = 'desc'
      if (this.data.sortBy === 'price-asc') {
        orderBy = 'price'; orderDir = 'asc'
      } else if (this.data.sortBy === 'price-desc') {
        orderBy = 'price'; orderDir = 'desc'
      }

      const res = await query
        .orderBy(orderBy, orderDir)
        .skip(skip)
        .limit(PAGE_SIZE)
        .get()

      const newList = res.data

      this.setData({
        goodsList: reset ? newList : [...this.data.goodsList, ...newList],
        page: page + 1,
        hasMore: newList.length >= PAGE_SIZE
      })

    } catch (err) {
      console.error('加载商品列表失败：', err)
      wx.showToast({ title: '加载失败，请重试', icon: 'none' })
    } finally {
      this.setData({ isLoading: false })
      wx.stopPullDownRefresh()
    }
  },

  // ========== 搜索相关 ==========

  onSearchInput(e) {
    this.setData({ searchValue: e.detail.value })
  },

  onSearch() {
    this.setData({ showBanner: false })
    this.loadGoods(true)
  },

  onSearchClear() {
    this.setData({ searchValue: '', showBanner: true })
    this.loadGoods(true)
  },

  // ========== 分类筛选 ==========

  onCategoryTap(e) {
    const category = e.currentTarget.dataset.category
    if (category === this.data.activeCategory) return
    this.setData({
      activeCategory: category,
      showBanner: category === '全部' && !this.data.searchValue
    })
    this.loadGoods(true)
  },

  // ========== 筛选排序 ==========

  onToggleFilter() {
    this.setData({ showFilter: !this.data.showFilter })
  },

  onPriceMinInput(e) { this.setData({ priceMin: e.detail.value }) },
  onPriceMaxInput(e) { this.setData({ priceMax: e.detail.value }) },

  onConditionFilterTap(e) {
    const condition = e.currentTarget.dataset.condition
    this.setData({
      conditionFilter: this.data.conditionFilter === condition ? '' : condition
    })
  },

  onSortTap(e) {
    const sortBy = e.currentTarget.dataset.sort
    this.setData({ sortBy })
    this.loadGoods(true)
  },

  onFilterReset() {
    this.setData({
      priceMin: '',
      priceMax: '',
      conditionFilter: '',
      sortBy: 'newest'
    })
    this.loadGoods(true)
  },

  onFilterConfirm() {
    this.setData({ showFilter: false })
    this.loadGoods(true)
  },

  onCategoryIconTap(e) {
    const category = e.currentTarget.dataset.category
    this.setData({ activeCategory: category, showBanner: false })
    this.loadGoods(true)
  },

  // ========== 下拉刷新 & 上拉加载 ==========

  onPullDownRefresh() {
    this.loadGoods(true)
  },

  onReachBottom() {
    this.loadGoods(false)
  },

  // ========== 页面跳转 ==========

  onGoodsTap(e) {
    const goodsId = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/goodsDetail/index?id=${goodsId}`
    })
  },

  onCloseBanner() {
    this.setData({ showBanner: false })
  },

  onImageError(e) {
    const id = e.currentTarget.dataset.id
    const idx = this.data.goodsList.findIndex(g => g._id === id)
    if (idx === -1) return
    const key = `goodsList[${idx}].images[0]`
    this.setData({ [key]: '/images/goods-placeholder.png' })
  }
})
