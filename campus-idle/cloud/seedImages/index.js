// cloud/seedImages/index.js
// 为商品数据批量生成适配图片（使用 loremflickr.com 按分类搜索）

const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

// 分类对应的英文搜索关键词
const CATEGORY_KEYWORDS = {
  '书籍': 'books,study',
  '数码': 'laptop,phone,electronics',
  '生活用品': 'daily,household',
  '体育器材': 'sports,fitness'
}
const DEFAULT_KEYWORD = 'campus,university'

// 为每个商品生成图片 URL
// 使用 https://loremflickr.com/宽/高/关键词 格式
function getImageUrl(index, category) {
  const keyword = CATEGORY_KEYWORDS[category] || DEFAULT_KEYWORD
  // 加入 index 作为随机种子，确保不同商品获取不同图片
  return `https://loremflickr.com/400/300/${keyword}?lock=${index}`
}

exports.main = async (event) => {
  const MAX = 100
  let skip = 0
  let updated = 0
  let total = 0

  while (true) {
    const res = await db.collection('goods')
      .skip(skip)
      .limit(MAX)
      .get()

    if (res.data.length === 0) break

    const tasks = []
    for (let i = 0; i < res.data.length; i++) {
      const doc = res.data[i]
      total++
      const docIndex = skip + i

      // 为每件商品生成 2-4 张图片
      const imgCount = 2 + (total % 3)
      const images = []
      for (let j = 0; j < imgCount; j++) {
        images.push(getImageUrl(docIndex * 10 + j, doc.category))
      }

      tasks.push(
        db.collection('goods').doc(doc._id).update({
          data: { images }
        }).then(() => updated++)
      )
    }

    await Promise.all(tasks)
    skip += MAX
  }

  return {
    total,
    updated,
    message: `处理完成：共 ${total} 条商品，成功更新 ${updated} 条图片`
  }
}
