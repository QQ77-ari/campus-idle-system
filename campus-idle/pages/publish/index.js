// pages/publish/index.js
/**
 * 发布闲置页（商务大气版）
 * 功能：上传图片 → 填写表单（含联系方式） → 写入云数据库
 */

function getDB() { return wx.cloud.database() }

Page({
  data: {
    images: [],
    title: '',
    price: '',
    category: '',
    condition: '',
    desc: '',
    wechatId: '',
    phone: '',
    categoryList: ['书籍', '数码', '生活用品', '体育器材'],
    conditionList: ['全新', '几乎全新', '有使用痕迹', '明显磨损'],
    categoryIndex: -1,
    conditionIndex: -1,
    isSubmitting: false,
    // 编辑模式
    isEdit: false,
    editGoodsId: ''
  },

  onLoad(options) {
    // 如果传入 goodsId，进入编辑模式
    if (options.id) {
      this.setData({ isEdit: true, editGoodsId: options.id })
      this.loadGoodsData(options.id)
    }
  },

  // ========== 加载商品数据（编辑模式） ==========
  async loadGoodsData(goodsId) {
    try {
      const db = getDB()
      const res = await db.collection('goods').doc(goodsId).get()
      const goods = res.data

      const categoryIndex = this.data.categoryList.indexOf(goods.category)
      const conditionIndex = this.data.conditionList.indexOf(goods.condition)

      this.setData({
        images: goods.images || [],
        title: goods.title || '',
        price: String(goods.price || ''),
        desc: goods.desc || '',
        wechatId: goods.wechatId || '',
        phone: goods.phone || '',
        categoryIndex: categoryIndex >= 0 ? categoryIndex : -1,
        conditionIndex: conditionIndex >= 0 ? conditionIndex : -1
      })
    } catch (err) {
      console.error('加载商品数据失败:', err)
      wx.showToast({ title: '加载失败', icon: 'none' })
    }
  },

  // ========== 图片选择 ==========

  onChooseImage() {
    const remaining = 4 - this.data.images.length
    if (remaining <= 0) {
      wx.showToast({ title: '最多上传4张', icon: 'none' })
      return
    }

    wx.chooseMedia({
      count: remaining,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const newImages = res.tempFiles.map(f => f.tempFilePath)
        this.setData({
          images: [...this.data.images, ...newImages]
        })
      }
    })
  },

  onRemoveImage(e) {
    const index = e.currentTarget.dataset.index
    const images = [...this.data.images]
    images.splice(index, 1)
    this.setData({ images })
  },

  onPreviewImage(e) {
    wx.previewImage({
      current: e.currentTarget.dataset.src,
      urls: this.data.images
    })
  },

  // ========== 表单输入 ==========

  onTitleInput(e) { this.setData({ title: e.detail.value }) },
  onPriceInput(e) { this.setData({ price: e.detail.value }) },
  onCategoryChange(e) { this.setData({ categoryIndex: e.detail.value }) },
  onConditionChange(e) { this.setData({ conditionIndex: e.detail.value }) },
  onDescInput(e) { this.setData({ desc: e.detail.value }) },
  onWechatInput(e) { this.setData({ wechatId: e.detail.value }) },
  onPhoneInput(e) { this.setData({ phone: e.detail.value }) },

  // ========== AI 帮写描述 ==========
  async onAiGenDesc() {
    const title = this.data.title.trim()
    if (!title) {
      wx.showToast({ title: '请先输入商品标题', icon: 'none' })
      return
    }

    wx.showLoading({ title: 'AI 生成中...' })
    try {
      const category = this.data.categoryIndex >= 0 ? this.data.categoryList[this.data.categoryIndex] : ''
      const condition = this.data.conditionIndex >= 0 ? this.data.conditionList[this.data.conditionIndex] : ''
      const prompt = `帮我为以下二手商品写一段吸引人的商品描述（200字以内）：\n标题：${title}\n分类：${category || '未选择'}\n新旧程度：${condition || '未选择'}\n要求：突出卖点，语言亲切，适合校园二手交易。`

      const result = await wx.cloud.callFunction({
        name: 'aiChat',
        data: { content: prompt }
      })

      wx.hideLoading()
      if (result.result && result.result.success) {
        this.setData({ desc: result.result.reply })
        wx.showToast({ title: '已生成', icon: 'success' })
      } else {
        wx.showToast({ title: '生成失败，请重试', icon: 'none' })
      }
    } catch (err) {
      wx.hideLoading()
      console.error('AI 生成描述失败:', err)
      wx.showToast({ title: '生成失败', icon: 'none' })
    }
  },

  // ========== 表单验证 ==========

  validateForm() {
    const { images, title, price, categoryIndex, conditionIndex, desc, wechatId, phone } = this.data
    if (images.length === 0) return '请至少上传1张商品图片'
    if (!title.trim()) return '请输入商品标题'
    if (title.trim().length > 40) return '标题不能超过40个字'
    if (!price || isNaN(price) || Number(price) <= 0) return '请输入有效的价格'
    if (Number(price) > 99999) return '价格不能超过99999元'
    if (categoryIndex < 0) return '请选择商品分类'
    if (conditionIndex < 0) return '请选择新旧程度'
    if (!desc.trim()) return '请输入商品描述'
    if (!wechatId.trim() && !phone.trim()) return '请至少填写一种联系方式'
    return null
  },

  // ========== 提交发布 ==========

  async onSubmit() {
    if (this.data.isSubmitting) return

    const error = this.validateForm()
    if (error) {
      wx.showToast({ title: error, icon: 'none' })
      return
    }

    this.setData({ isSubmitting: true })
    wx.showLoading({ title: '正在发布...' })

    try {
      // 1. 内容安全审核
      wx.showLoading({ title: '内容审核中...' })
      const textContent = `${this.data.title.trim()} ${this.data.desc.trim()}`
      const checkRes = await wx.cloud.callFunction({
        name: 'contentCheck',
        data: { type: 'text', text: textContent }
      })

      if (checkRes.result && !checkRes.result.safe) {
        wx.hideLoading()
        wx.showModal({
          title: '内容不合规',
          content: checkRes.result.reason || '您发布的内容含有违规信息，请修改后重新提交',
          showCancel: false
        })
        this.setData({ isSubmitting: false })
        return
      }

      // 2. 上传图片
      wx.showLoading({ title: '上传图片中...' })
      const imageFileIDs = await this.uploadImages(this.data.images)

      // 3. 图片安全审核
      if (imageFileIDs.length > 0) {
        wx.showLoading({ title: '图片审核中...' })
        const imgCheckRes = await wx.cloud.callFunction({
          name: 'contentCheck',
          data: { type: 'image', fileID: imageFileIDs[0] }
        })

        if (imgCheckRes.result && !imgCheckRes.result.safe) {
          wx.hideLoading()
          wx.showModal({
            title: '图片不合规',
            content: imgCheckRes.result.reason || '您上传的图片含有违规内容，请更换后重新提交',
            showCancel: false
          })
          this.setData({ isSubmitting: false })
          return
        }
      }

      // 4. 写入数据库
      wx.showLoading({ title: this.data.isEdit ? '正在保存...' : '正在发布...' })
      const db = getDB()
      const app = getApp()
      const userInfo = app.globalData.userInfo || {}

      const goodsData = {
        title: this.data.title.trim(),
        price: Number(this.data.price),
        category: this.data.categoryList[this.data.categoryIndex],
        condition: this.data.conditionList[this.data.conditionIndex],
        desc: this.data.desc.trim(),
        images: imageFileIDs,
        wechatId: this.data.wechatId.trim(),
        phone: this.data.phone.trim()
      }

      if (this.data.isEdit) {
        // 编辑模式：更新已有商品
        await db.collection('goods').doc(this.data.editGoodsId).update({
          data: goodsData
        })
      } else {
        // 新增模式
        await db.collection('goods').add({
          data: {
            ...goodsData,
            originalPrice: 0,
            status: '在售',
            nickName: userInfo.nickName || '匿名用户',
            avatarUrl: userInfo.avatarUrl || '/images/default-avatar.png',
            createdAt: Date.now(),
            viewCount: 0
          }
        })
      }

      wx.hideLoading()

      // 询问是否继续发布
      wx.showModal({
        title: this.data.isEdit ? '修改成功' : '发布成功',
        content: this.data.isEdit ? '商品信息已更新' : '商品已上架，是否继续发布下一个？',
        confirmText: this.data.isEdit ? '返回' : '继续发布',
        cancelText: '返回首页',
        success: (res) => {
          if (this.data.isEdit) {
            wx.navigateBack()
          } else if (res.confirm) {
            this.resetForm()
          } else {
            wx.switchTab({ url: '/pages/index/index' })
          }
        }
      })

    } catch (err) {
      console.error('发布失败：', err)
      wx.hideLoading()
      wx.showToast({ title: '发布失败，请重试', icon: 'none' })
      this.setData({ isSubmitting: false })
    }
  },

  // ========== 清空表单 ==========

  resetForm() {
    this.setData({
      images: [],
      title: '',
      price: '',
      category: '',
      condition: '',
      desc: '',
      wechatId: '',
      phone: '',
      categoryIndex: -1,
      conditionIndex: -1,
      isSubmitting: false
    })
    wx.showToast({ title: '已清空，继续发布吧', icon: 'success' })
  },

  async uploadImages(tempPaths) {
    const fileIDs = []
    for (let i = 0; i < tempPaths.length; i++) {
      // 压缩图片
      let filePath = tempPaths[i]
      try {
        const compressRes = await wx.compressImage({
          src: filePath,
          quality: 80
        })
        filePath = compressRes.tempFilePath
      } catch (e) {
        // 压缩失败则使用原图
        console.warn('图片压缩失败，使用原图:', e)
      }

      const ext = filePath.split('.').pop()
      const cloudPath = `goods/${Date.now()}-${i}.${ext}`

      const res = await wx.cloud.uploadFile({
        cloudPath,
        filePath: filePath
      })

      fileIDs.push(res.fileID)
    }
    return fileIDs
  }
})
