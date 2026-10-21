# 🎴 复习卡片 (Review Cards)

基于 **Cloudflare Workers + KV** 的单文件复习卡片应用。抽卡背题、Markdown 编辑、多分类筛选、自定义毛玻璃配色，全部塞在一个 `.js` 文件里——后端路由和前端页面都在同一份代码中，复制粘贴即可部署。

> 当前版本：`复习卡片1.3.js`

---

## 🌟 功能

**抽卡复习**
- 顶栏「抽一张 / 抽五张」，抽五张以多张小卡并排展示
- 点「显示答案」翻牌，答案走 Markdown 渲染
- 「本轮不重复」：抽过的题本轮不再出现，抽完自动开始新一轮；关掉则允许随机重复
- 收藏（⭐）的题抽中权重 ×3
- 「本轮剩余」按当前分类口径统计；关闭不重复时显示 `—`

**题目管理**
- 分类支持多标签（逗号分隔），顶部下拉可筛选，另有「⭐ 仅看收藏」
- 侧边栏题目列表：搜索、行内编辑、收藏、删除
- **双击列表条目**弹出大卡片查看详情（手机端单击正文区域）
- 批量导入（`分类 | 问题 | 答案`）、JSON 导入导出（按标题去重）
- 粘贴带格式的富文本会自动转成 Markdown

**编辑体验**
- 双击卡片上的问题/答案原位编辑，失焦或 `Ctrl+Enter` 保存
- 编辑框内 `Ctrl+B` 加粗、`Ctrl+I` 斜体、`Ctrl+K` 行内代码

**外观与统计**
- 双击左上角 `✦` 打开调色盘：6 套预设主题 + 自定义背景色 + 卡片玻璃透明度，改动即时自动保存
- 统计面板：总题数 / 收藏数 / 本轮剩余 / 抽卡次数 / 覆盖率进度条
- 顶部 25 分钟番茄倒计时，点一下改时长

**数据可靠性**
- 所有改动先写 `localStorage` 再上传 KV，断网、刷新都不丢
- 保存请求串行化并合并，避免并发写把新数据覆盖成旧快照
- 断网时自动载入本地缓存；网络恢复后自动补传
- 删除单题、清空题库需要输入验证码

---

## 🚀 部署

### 需要准备

| 名称 | 类型 | 说明 |
|---|---|---|
| `REVIEW_KV` | KV 命名空间绑定 | 数据存储，全部数据存在 key `user_review_data` |
| `k` | 运行变量 / Secret | 删除题目的验证码，**不设就无法删除** |

### 方式一：控制台粘贴（最快）

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)，进入 **Workers & Pages**，新建 Worker。
2. 把 `复习卡片1.3.js` 的全部内容粘贴进在线编辑器，保存发布。
3. **Settings → Variables and Secrets → KV Namespace Bindings**：变量名填 `REVIEW_KV`，绑定你创建的 KV。
4. **Settings → Variables and Secrets → Runtime variables**：新增变量 `k`，值设成你的验证码。
5. 重新部署。

> 控制台里手加的变量，下次用 wrangler 部署时可能被配置文件覆盖。用 wrangler 的话务必按下面的配置写，或者用 `wrangler secret put k`。

### 方式二：Wrangler

```bash
# 1. 创建 KV 命名空间，记下返回的 id
npx wrangler kv namespace create REVIEW_KV

# 2. 写配置（wrangler.jsonc）
```

```jsonc
{
  "name": "reviewcard",
  "main": "复习卡片1.3.js",
  "compatibility_date": "2026-10-01",
  "kv_namespaces": [
    { "binding": "REVIEW_KV", "id": "<上一步返回的 id>" }
  ],
  "vars": { "k": "3513785336" }
}
```

```bash
# 3. 部署
npx wrangler deploy
```

更推荐把验证码做成密钥而不是明文变量：

```bash
npx wrangler secret put k
```

代码读的是 `env.k`，两种方式都不用改代码。

---

## 🖥️ 本地预览

`dev-server.mjs` 用内存 Map 模拟 KV，直接运行 Worker 的 `fetch`，改文件自动热重载，不需要登录 Cloudflare。

```bash
node dev-server.mjs          # → http://127.0.0.1:8787
K=你的验证码 node dev-server.mjs   # 覆盖验证码（默认 3513785336）
PORT=9000 node dev-server.mjs      # 换端口
```

数据存在内存里，重启即清空。这个文件不参与部署，删掉不影响线上。

---

## 🔌 接口

| 方法 | 路径 | 说明 |
|---|---|---|
| `GET` | `/` | 返回前端页面 |
| `GET` | `/api/data` | 读取整份数据；KV 为空时返回 `initialized: false` |
| `POST` | `/api/data` | 整份覆盖写入 |
| `POST` | `/api/verify` | 校验危险操作验证码，比对 `env.k` |

**数据结构**（KV key `user_review_data`）

```json
{
  "points": [{ "id": "…", "category": "网络, HTTP", "title": "…", "content": "…", "starred": false }],
  "pool": ["还在本轮牌池里的题目 id"],
  "seen": ["抽过的题目 id"],
  "draws": 0,
  "theme": { "name": "自定义", "bg": "linear-gradient(…)", "cardOp": "0.75", "pickColor": "#e0e6ed" },
  "updatedAt": "2026-10-21T05:00:00.000Z"
}
```

---

## ⚠️ 已知限制

- **无鉴权**：`/api/data` 的 CORS 是 `*`，任何知道域名的人都能读写全部数据。当个人自用工具没问题，链接别外传。想加口令需要自己补一层校验。
- **整份覆盖写入**：多设备同时编辑会互相覆盖，没有冲突合并。多端场景下请错开使用。
- **单用户**：所有数据共用一份 KV，不支持多账号隔离。
- 验证码只是防手滑，不是安全边界——真正的保护得靠 Cloudflare Access 之类的方案。

---

## 📄 许可证

本项目采用 MIT 许可证。
