// cloud/getUserInfo/index.js
// 获取当前用户的 OPENID 和 UNIONID

const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

exports.main = async (event) => {
  const { OPENID, APPID, UNIONID } = cloud.getWXContext()
  return {
    openid: OPENID,
    appid: APPID,
    unionid: UNIONID || ''
  }
}
