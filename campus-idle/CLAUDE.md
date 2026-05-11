# 校园闲置小程序 (Campus Idle)

## 项目概述
微信小程序校园二手交易平台，让学生发布、浏览、搜索、收藏闲置物品。

## 技术栈
- **前端**: 微信小程序原生开发 (WXML/WXSS/JS/JSON)
- **后端**: 微信云开发 (Serverless)
  - 云数据库: `goods`(商品) + `collects`(收藏) 集合
  - 云存储: 商品图片存储在 `goods/` 路径
  - 云函数: `cleanImages` 清理失效图片链接
- **无 npm 依赖** (前端), 云函数仅依赖 `wx-server-sdk`

## 目录结构
```
campus-idle/
├── app.js / app.json / app.wxss   # 入口文件
├── images/                         # 静态资源 (tab图标、默认头像、占位图)
├── pages/
│   ├── index/          # 首页 (商品列表、搜索、分类筛选)
│   ├── publish/        # 发布页 (图片上传、表单提交)
│   ├── goodsDetail/    # 商品详情 (轮播图、收藏、联系卖家)
│   ├── favorites/      # 我的收藏
│   ├── myPublish/      # 我的发布 (上架/下架/删除)
│   ├── profile/        # 个人中心 (用户信息、菜单)
│   └── privacy/        # 隐私政策
└── cloud/
    └── cleanImages/    # 云函数: 清理 unsplash 失效图片
```

## 开发规范
- 使用 `rpx` 响应式单位
- 全局样式变量定义在 `app.wxss` (`--primary`, `--price` 等)
- 分页查询使用 `skip()` + `limit()`，每页 10 条
- 搜索使用 `db.RegExp()` 实现标题模糊匹配
- 图片必须设置 `lazy-load` 和 `binderror` 降级到占位图
- 适配刘海屏使用 `env(safe-area-inset-*)`

## 数据库字段
### goods 集合
`_id, title, price, originalPrice, category, condition, desc, images[], status, nickName, avatarUrl, wechatId, phone, createdAt, viewCount`

### collects 集合
`_id, goodsId, goodsTitle, goodsPrice, goodsCoverImg, createdAt`

## 常用操作
- 在微信开发者工具中打开项目
- 云开发环境 ID: `cloud1-d6g2u0fls0f793a5f`
- 分类: `['书籍', '数码', '生活用品', '体育器材']`
- 成色: `['全新', '几乎全新', '有使用痕迹', '明显磨损']`

## 注意事项
- 当前无用户认证系统，使用微信 `chooseAvatar` + `type="nickname"` 获取用户信息
- 收藏表做了反范式化设计，冗余存储商品展示字段
- 隐私协议同意状态存储在 `wx.setStorageSync('privacy_agreed')`

---

# Claude Code Skill 使用指南

## 可用 Skill 列表

### 1. `/simplify` — 代码简化审查
**用途**: 自动审查修改过的代码，找出冗余、低效、不规范的地方并修复
**使用场景**: 每次写完一批代码后执行，保持代码质量
**示例对话**: 直接输入 `/simplify` 即可

### 2. `/loop` — 定时循环任务
**用途**: 设置定时执行的任务，自动轮询状态
**使用场景**: 部署后定时检查状态、定时清理缓存等
**示例对话**:
- `/loop 5m 检查小程序云函数是否正常`
- `/loop 10m 检查 campus-idle 项目的云开发数据库连接状态`

### 3. `/update-config` — 配置自动化行为
**用途**: 通过修改 settings.json 配置 hooks，实现自动化行为
**使用场景**: 添加文件修改后的自动检查、提交前自动格式化等
**示例对话**: 输入 `/update-config` 然后描述想要的自动化行为

### 4. `/claude-api` — API 开发助手
**用途**: 使用 Anthropic SDK 构建 AI 应用时的专业帮助
**使用场景**: 如果项目需要接入 AI 功能（如智能推荐、智能客服）

## 已配置的 Hooks（自动化行为）

| Hook 类型 | 触发条件 | 执行内容 |
|-----------|----------|----------|
| PostToolUse | 修改 .wxml/.wxss/.js/.json 文件 | 提醒检查小程序开发规范 |
| PostToolUse | 编辑 .wxml/.wxss/.js/.json 文件 | 提醒确认代码规范 |
| PostToolUse | 执行 Bash 命令 | 记录命令执行时间 |
| PreToolUse | 修改 app.js/app.json/app.wxss | 警告正在修改全局入口文件 |

## 推荐使用流程
1. 修改代码前 → 先用对话描述需求
2. 修改代码后 → 执行 `/simplify` 审查质量
3. 部署前 → 执行 `/loop` 检查状态
4. 想添加自动化 → 使用 `/update-config` 配置 hooks
