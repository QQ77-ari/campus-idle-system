// cloud/initDB/index.js
// 初始化数据库集合 — 直接插入占位数据以自动创建集合

const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async () => {
  const results = {}

  const collections = [
    {
      name: 'ai_conversations',
      data: { _tag: '_init', sessionId: '_init', role: 'system', content: '初始化', type: 'text', createdAt: Date.now() }
    },
    {
      name: 'chat_messages',
      data: { _tag: '_init', chatId: '_init', goodsId: '', senderId: '', senderName: '', senderAvatar: '', receiverId: '', content: '初始化', type: 'text', createdAt: Date.now(), read: true }
    },
    {
      name: 'chat_sessions',
      data: { _tag: '_init', chatId: '_init', goodsId: '', goodsTitle: '', goodsImage: '', participants: ['_init'], lastMessage: '初始化', lastTime: Date.now(), unreadCount: 0 }
    },
    {
      name: 'orders',
      data: { _tag: '_init', goodsId: '', goodsTitle: '', goodsImage: '', price: 0, buyerId: '_init', sellerId: '', sellerName: '', status: 'completed', createdAt: Date.now(), buyerReviewed: true, sellerReviewed: true }
    },
    {
      name: 'reviews',
      data: { _tag: '_init', orderId: '', goodsId: '', reviewerId: '_init', targetId: '', rating: 5, content: '初始化', createdAt: Date.now() }
    },
    {
      name: 'reports',
      data: { _tag: '_init', goodsId: '', goodsTitle: '', reason: '初始化', reportedAt: Date.now(), status: '已处理' }
    }
  ]

  // 先创建集合（插入第一条数据）
  for (const col of collections) {
    try {
      await db.collection(col.name).add({ data: col.data })
      results[col.name] = '创建成功'
    } catch (err) {
      // 如果集合已存在，说明之前创建过
      if (err.errCode === -502005) {
        results[col.name] = '创建成功（集合已存在）'
      } else {
        results[col.name] = `失败: ${err.message}`
      }
    }
  }

  // 清理占位数据
  await sleep(1000)
  for (const col of collections) {
    try {
      await db.collection(col.name).where({ _tag: '_init' }).remove()
    } catch (e) {}
  }

  return { success: true, results }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}
