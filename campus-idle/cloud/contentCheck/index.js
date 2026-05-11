// cloud/contentCheck/index.js
// 微信内容安全审核（文字 + 图片）

const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

// ========== 文字安全检查 ==========
async function checkText(text) {
  try {
    const res = await cloud.openapi.security.msgSecCheck({
      content: text,
      scene: 2, // 资料
      version: 2
    })
    return { safe: true, result: res }
  } catch (err) {
    if (err.errCode === 87014) {
      return { safe: false, reason: '文字内容含有违规信息' }
    }
    // 其他错误放行
    console.error('文字审核异常:', err)
    return { safe: true }
  }
}

// ========== 图片安全检查 ==========
async function checkImage(fileID) {
  try {
    // 将 fileID 转成可访问的 URL
    const { fileList } = await cloud.getTempFileURL({ fileList: [fileID] })
    if (!fileList || !fileList[0] || !fileList[0].tempFileURL) {
      return { safe: true }
    }
    const imgUrl = fileList[0].tempFileURL

    const res = await cloud.openapi.security.imgSecCheck({
      media: { contentType: 'image/png', value: imgUrl },
      scene: 2,
      version: 2
    })
    return { safe: true, result: res }
  } catch (err) {
    if (err.errCode === 87014) {
      return { safe: false, reason: '图片含有违规内容' }
    }
    console.error('图片审核异常:', err)
    return { safe: true }
  }
}

exports.main = async (event) => {
  const { type, text, fileID } = event

  if (type === 'text' && text) {
    return await checkText(text)
  }

  if (type === 'image' && fileID) {
    return await checkImage(fileID)
  }

  if (type === 'all') {
    // 同时检查文字和图片
    const results = {}

    if (text) {
      results.text = await checkText(text)
    }

    if (fileID) {
      results.image = await checkImage(fileID)
    }

    // 检查是否有不安全的内容
    const allSafe = Object.values(results).every(r => r.safe)
    return {
      safe: allSafe,
      reason: allSafe ? '' : Object.values(results).find(r => !r.safe).reason,
      details: results
    }
  }

  return { safe: true }
}
