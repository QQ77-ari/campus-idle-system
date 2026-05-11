# Claude Code Skill 讲解文档
> 配合「校园闲置小程序」项目演示

---

## 一、什么是 Claude Code Skill？

Skill 是 Claude Code 中的**可复用工作流**，通过斜杠命令（`/skill-name`）触发。它们本质上是预定义好的 prompt 模板，让 AI 按照特定方式执行任务。

**类比理解**：
- 普通对话 = 你跟 AI 自由聊天
- Skill = 给 AI 预设了一个"角色卡"，让它按照特定规则工作

---

## 二、内置 Skill 一览

| Skill | 一句话说明 | 触发方式 |
|-------|-----------|---------|
| `/simplify` | 审查代码质量，自动优化 | 直接输入 `/simplify` |
| `/loop` | 设置定时循环任务 | `/loop 5m 任务描述` |
| `/update-config` | 配置自动化行为（hooks） | 直接输入 `/update-config` |
| `/claude-api` | Claude API 开发助手 | 直接输入 `/claude-api` |

---

## 三、各 Skill 详解 + 实战演示

### Skill 1: `/simplify` — 代码审查专家

#### 是什么？
自动扫描你最近修改的代码，找出以下问题：
- 冗余代码（重复逻辑）
- 性能问题（不必要的循环、未优化的查询）
- 不规范写法（命名、格式）
- 潜在 Bug

#### 怎么用？
```
在 Claude Code 对话框中直接输入：
/simplify
```

#### 演示场景（校园闲置项目）：
```
1. 先修改 pages/index/index.js 中的搜索功能
2. 执行 /simplify
3. 观察 AI 给出的审查结果和自动修复
```

#### 讲解要点：
> "/simplify 相当于请了一个免费的 Code Reviewer，每次写完代码跑一遍，代码质量会明显提升。"

---

### Skill 2: `/loop` — 定时任务执行器

#### 是什么？
让 Claude Code 按照指定间隔反复执行某个任务，直到你手动停止。

#### 怎么用？
```
/loop <间隔时间> <任务描述>

示例：
/loop 5m 检查云开发数据库是否正常连接
/loop 10m 检查校园闲置小程序的云函数部署状态
/loop 30s 监控 goods 集合的数据量变化
```

#### 演示场景（校园闲置项目）：
```
/loop 1m 检查 campus-idle 项目中 goods 集合的记录总数，如果超过 50 条就提醒我
```

#### 讲解要点：
> "/loop 适合需要持续监控的场景，比如部署后观察状态、定时检查数据量等。它会自动运行，不需要你反复手动触发。"

---

### Skill 3: `/update-config` — 自动化配置器

#### 是什么？
通过修改 `settings.json` 中的 hooks 配置，让 Claude Code 在特定事件发生时自动执行操作。

#### 核心概念：Hooks（钩子）

| Hook 类型 | 含义 |
|-----------|------|
| `PreToolUse` | 在工具执行**前**触发 |
| `PostToolUse` | 在工具执行**后**触发 |
| `SessionStart` | 会话开始时触发 |
| `UserPromptSubmit` | 用户提交消息时触发 |

#### 当前项目已配置的 Hooks：

```json
// 1. 修改小程序文件后自动提醒
PostToolUse + Write → 检查 .wxml/.wxss/.js/.json 文件，提醒开发规范

// 2. 编辑文件后自动确认
PostToolUse + Edit → 提醒确认代码规范

// 3. 执行命令后记录时间
PostToolUse + Bash → 记录命令执行时间

// 4. 修改全局文件前警告
PreToolUse + Write → 修改 app.js/app.json/app.wxss 时发出警告
```

#### 怎么用？
```
方式一：直接对话
/update-config
然后描述你想要的自动化行为，AI 会帮你写配置

方式二：手动编辑 settings.json
文件路径：~/.claude/settings.json
```

#### 演示场景（校园闲置项目）：
```
1. 打开 settings.json 查看已配置的 hooks
2. 修改 pages/index/index.wxml 文件
3. 观察控制台自动输出的检查提醒
```

#### 讲解要点：
> "Hooks 让 Claude Code 从'被动应答'变成'主动服务'。你不需要每次都提醒它检查代码，它会自动在合适的时机帮你检查。"

---

### Skill 4: `/claude-api` — API 开发助手

#### 是什么？
当你需要在项目中接入 Claude API（如添加 AI 智能推荐、AI 客服等功能）时，提供专业的 API 调用指导。

#### 怎么用？
```
/claude-api
然后描述你想实现的 AI 功能
```

#### 演示场景（校园闲置项目扩展）：
```
如果要在校园闲置小程序中加入 AI 功能：
- 智能定价建议：根据商品描述自动建议合理价格
- 智能客服：自动回复买家常见问题
- 商品推荐：根据用户浏览记录推荐相关商品

这时可以使用 /claude-api 获取专业的接入指导
```

#### 讲解要点：
> "这个 skill 是专门面向 AI 应用开发的。如果你的项目需要调用大模型能力，它能帮你快速搞定 API 接入。"

---

## 四、如何添加自定义 Skill？

### 方式 1: CLAUDE.md（项目级指令）
在项目根目录创建 `CLAUDE.md`，写入：
- 项目概述和技术栈
- 开发规范和约束
- AI 行为指导

**效果**：每次启动对话时自动加载，相当于给 AI 设定了"项目人设"

### 方式 2: Hooks（自动化行为）
编辑 `~/.claude/settings.json`，在 `hooks` 字段添加：
```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write",
        "hooks": [
          {
            "type": "command",
            "command": "你想要自动执行的命令",
            "shell": "bash"
          }
        ]
      }
    ]
  }
}
```

### 方式 3: MCP 服务器（外部工具扩展）
```bash
# 添加文件系统 MCP 服务器
claude mcp add my-fs -- npx -y @anthropic-ai/mcp-server-filesystem /path/to/project

# 添加 Memory MCP 服务器（持久化记忆）
claude mcp add memory -- npx -y @anthropic-ai/mcp-server-memory
```

### 方式 4: Plugin 插件（社区扩展）
```bash
# 添加插件市场
claude plugin marketplace add https://example.com/marketplace.json

# 安装插件
claude plugin install plugin-name
```

---

## 五、Skill 对比总结

| 维度 | 内置 Skill | CLAUDE.md | Hooks | MCP |
|------|-----------|-----------|-------|-----|
| 触发方式 | 手动 `/命令` | 自动加载 | 事件触发 | 工具调用 |
| 作用范围 | 当前对话 | 项目级 | 用户级 | 对话级 |
| 配置难度 | 无需配置 | 写 Markdown | 写 JSON | 运行命令 |
| 适合场景 | 一次性任务 | 项目上下文 | 自动化流程 | 外部工具集成 |

---

## 六、演示流程建议

### 开场（2分钟）
> "今天我要演示的是 Claude Code 的 Skill 系统。简单说，Skill 就是给 AI 预设了特定角色和行为规则的工作流。"

### 演示 1: `/simplify`（5分钟）
1. 打开校园闲置项目
2. 故意写一段有问题的代码
3. 执行 `/simplify`
4. 展示 AI 的审查结果和自动修复

### 演示 2: Hooks 自动化（5分钟）
1. 打开 `settings.json` 展示 hooks 配置
2. 修改一个 `.wxml` 文件
3. 展示控制台自动输出的检查提醒
4. 修改 `app.json` 展示警告信息

### 演示 3: CLAUDE.md（3分钟）
1. 打开 `CLAUDE.md` 展示项目上下文配置
2. 新开一个对话，展示 AI 自动了解项目结构
3. 对比没有 CLAUDE.md 时 AI 的表现差异

### 演示 4: `/loop`（可选，3分钟）
1. 执行 `/loop 1m 检查项目文件总数`
2. 展示定时执行效果

### 总结（2分钟）
> "Skill 的本质是让 AI 从'被动应答'变为'主动服务'。通过合理配置，可以大幅提升开发效率。"

---

## 七、常见问题

**Q: Skill 和普通对话有什么区别？**
A: 普通对话是你问 AI 答，Skill 是给 AI 预设了行为规则，让它自动按规则执行。

**Q: 我可以自己创建 Skill 吗？**
A: 可以。通过 CLAUDE.md（项目指令）、Hooks（自动化）、MCP（工具扩展）三种方式组合实现。

**Q: Skill 要联网才能用吗？**
A: 内置 Skill 不需要。MCP 服务器需要能下载 npm 包。

**Q: 一个项目可以配置多个 Skill 吗？**
A: 可以。内置 Skill 随时可用，Hooks 和 CLAUDE.md 可以同时配置多个。
