# 🎴 复习卡片 (Review Cards)

一个基于 **Cloudflare Workers + KV** 的极简高质感毛玻璃复习卡片应用。支持双击交互、 Markdown 编辑、多分类筛选及自定义氛围配色。

---

## 🌟 核心特性

* **☁️ 云端自动同步**：基于 Cloudflare KV 存储，多端数据实时无缝同步。
* **🎨 氛围色调系统**：**双击左上角 `✦` 图标**唤起调色盘，内置 6 款高质感主题，支持自定义背景色与卡片毛玻璃透明度。
* **✏️ 无感 Markdown 编辑**：**双击**卡片上的问题或答案即可直接原位编辑，支持快捷键（`Ctrl+B` 加粗、`Ctrl+I` 斜体）。
* **🏷️ 多分类与权重抽卡**：支持单题多标签。已收藏卡片（⭐）在抽卡时拥有更高出现概率。
* **⏱️ 专注番茄钟**：顶部内置简易倒计时，方便控制复习节奏。
* **📦 批量与备份**：支持 Markdown 格式批量导入，以及 JSON 数据一键导出/导入。

---

## 🚀 快速部署 (Cloudflare Workers)

### 方式一：面板直接粘贴（最快）

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/?utm_source=gemini)，进入 **Workers & Pages**。
2. 创建一个新的 Worker，将 `worker.js` 中的代码完整粘贴进去并保存发布。
3. 进入 Worker 的 **Settings** -> **Variables** -> **KV Namespace Bindings**。
4. 添加绑定：
* **Variable name**: `REVIEW_KV`
* **KV Namespace**: 绑定你创建的 KV 数据库。


5. 重新部署即可使用。

### 方式二：Wrangler CLI 部署

```bash
# 1. 克隆或创建项目目录
mkdir review-cards && cd review-cards

# 2. 创建 KV 数据库
npx wrangler kv:namespace create "REVIEW_KV"

# 3. 在 wrangler.toml 中配置 kv_namespaces 绑定，然后部署
npx wrangler deploy

```

---

## 💡 使用小技巧

* **调色盘**：双击左上角 Logo `✦` 打开主题设置。
* **卡片放大**：双击卡片空白处可弹窗全屏专注查看。
* **原位编辑**：双击卡片上的文字部分直接修改，按 `Ctrl + Enter` 保存。
* **快捷键**：编辑框内选中文字按 `Ctrl + B` 快速加粗。

---

## 📄 开源许可证

本项目采用 [MIT License](https://www.google.com/search?q=LICENSE&utm_source=gemini) 许可证。
