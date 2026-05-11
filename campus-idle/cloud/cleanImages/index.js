// cloud/cleanImages/index.js
// 清理云数据库中所有失效的商品图片链接，替换为占位图

const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

exports.main = async (event) => {
  const placeholder = '/images/goods-placeholder.png'
  let goodsUpdated = 0
  let collectsUpdated = 0

  // ========== 1. 清理 goods 集合（替换所有云存储和 unsplash 链接） ==========
  const MAX = 100
  let skip = 0
  while (true) {
    const res = await db.collection('goods')
      .skip(skip)
      .limit(MAX)
      .get()

    if (res.data.length === 0) break

    const tasks = []
    for (const doc of res.data) {
      if (!Array.isArray(doc.images) || doc.images.length === 0) continue

      // 检查是否包含需要替换的图片（unsplash 或 cloud:// 开头的链接）
      const needsUpdate = doc.images.some(url =>
        typeof url === 'string' && (url.includes('unsplash') || url.startsWith('cloud://'))
      )
      if (!needsUpdate) continue

      const newImages = doc.images.map(url => {
        if (typeof url === 'string' && (url.includes('unsplash') || url.startsWith('cloud://'))) {
          return placeholder
        }
        return url
      })

      tasks.push(
        db.collection('goods').doc(doc._id).update({
          data: { images: newImages }
        }).then(() => goodsUpdated++)
      )
    }

    await Promise.all(tasks)
    skip += MAX
  }

  // ========== 2. 清理 collects 集合 ==========
  skip = 0
  while (true) {
    const res = await db.collection('collects')
      .skip(skip)
      .limit(MAX)
      .get()

    if (res.data.length === 0) break

    const tasks = []
    for (const doc of res.data) {
      if (typeof doc.goodsCoverImg !== 'string') continue
      if (!doc.goodsCoverImg.includes('unsplash') && !doc.goodsCoverImg.startsWith('cloud://')) continue

      tasks.push(
        db.collection('collects').doc(doc._id).update({
          data: { goodsCoverImg: placeholder }
        }).then(() => collectsUpdated++)
      )
    }

    await Promise.all(tasks)
    skip += MAX
  }

  return {
    goodsUpdated,
    collectsUpdated,
    message: `清理完成：goods 更新 ${goodsUpdated} 条，collects 更新 ${collectsUpdated} 条`
  }
}
