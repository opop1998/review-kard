/**
 * Cloudflare Worker + KV 架构的复习卡片应用
 * 特性：统一高质感毛玻璃 UI + 富文本粘贴转 Markdown + 自适应文本编辑 + 调色盘 + 带去重与详情弹窗的 JSON 导入
 */

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // 1. API 接口：获取数据 (GET /api/data)
    if (url.pathname === '/api/data' && request.method === 'GET') {
      try {
        const rawData = await env.REVIEW_KV.get('user_review_data');
        if (!rawData) {
          return new Response(JSON.stringify({ points: [], pool: [], seen: [], draws: 0, theme: null }), {
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
          });
        }
        return new Response(rawData, {
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
      }
    }

    // 2. API 接口：保存数据 (POST /api/data)
    if (url.pathname === '/api/data' && request.method === 'POST') {
      try {
        const body = await request.text();
        JSON.parse(body);
        await env.REVIEW_KV.put('user_review_data', body);
        return new Response(JSON.stringify({ success: true, timestamp: new Date().toISOString() }), {
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { status: 400 });
      }
    }

    // 3. 根目录 / ：返回 HTML 页面
    if (url.pathname === '/' || url.pathname === '/index.html') {
      return new Response(HTML_CONTENT, {
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
      });
    }

    return new Response('Not Found', { status: 404 });
  }
};

// ==================== 前端 HTML / CSS / JS 模板 ====================
const HTML_CONTENT = `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#eef1f5">
<title>复习卡片 · Cloudflare KV</title>
<!-- 引入 Markdown 渲染库 Marked -->
<script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
<style>
:root{
  --bg-gradient: linear-gradient(135deg, #e0e6ed 0%, #edf2f7 50%, #dbe3ed 100%);
  --glass-bg: rgba(255, 255, 255, 0.68);
  --glass-border: rgba(255, 255, 255, 0.75);
  --glass-shadow: 0 20px 50px rgba(15, 23, 42, 0.08), 0 1px 3px rgba(0, 0, 0, 0.04);
  --card-bg: rgba(255, 255, 255, 0.75);
  --text: #1e293b;
  --muted: #64748b;
  --accent: #2563eb;
  --danger: #ef4444;
  --star-color: #f59e0b;
}

*{box-sizing:border-box}
html{scroll-behavior:smooth}
body{
  margin:0;
  color:var(--text);
  font-family:-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Segoe UI", Roboto, "PingFang SC", sans-serif;
  background: var(--bg-gradient);
  background-attachment: fixed;
  min-height:100vh;
  transition: background 0.4s ease;
}

button,input,textarea,select{font:inherit}
button{cursor:pointer}

.glass {
  background: var(--glass-bg);
  backdrop-filter: blur(28px) saturate(140%);
  -webkit-backdrop-filter: blur(28px) saturate(140%);
  border: 1px solid var(--glass-border);
  box-shadow: var(--glass-shadow);
  transition: background 0.3s ease, border-color 0.3s ease;
}

.app{width:min(1280px,100%);margin:auto;padding:28px 20px 70px}

.topbar{
  display:flex;align-items:center;justify-content:space-between;gap:16px;
  padding:16px 24px;border-radius:24px;margin-bottom:20px;flex-wrap:wrap;
}
.brand{display:flex;align-items:center;gap:13px}
.logo{
  width:40px;height:40px;border-radius:14px;display:grid;place-items:center;
  background:linear-gradient(135deg, #1e293b, #0f172a);color:#fff;font-size:18px;
  box-shadow:0 8px 20px rgba(15,23,42,.15);
  cursor: pointer; user-select: none; transition: transform 0.2s ease, box-shadow 0.2s ease;
}
.logo:hover{ transform: scale(1.05); box-shadow:0 10px 25px rgba(15,23,42,.25); }
.logo:active{ transform: scale(0.95); }
.brand h1{font-size:18px;line-height:1.2;margin:0;font-weight:700;letter-spacing:-.3px}

.timer-widget{
  display:flex;align-items:center;gap:6px;font-size:12px;font-weight:600;color:var(--text);
  padding:5px 12px;border-radius:999px;background:rgba(255,255,255,.5);border:1px solid var(--glass-border);
  cursor:pointer;user-select:none;transition:.2s;
}
.timer-widget:hover{background:rgba(255,255,255,.85)}

.topbar-center{display:flex;align-items:center;gap:12px;flex-wrap:wrap}
.category-select{
  padding:7px 14px;border-radius:14px;border:1px solid var(--glass-border);
  background:rgba(255,255,255,.6);color:var(--text);font-size:13px;outline:none;
}

.toggle-switch{
  display:inline-flex;align-items:center;gap:8px;font-size:13px;color:var(--text);
  cursor:pointer;user-select:none;font-weight:500;
}
.toggle-switch input{display:none}
.toggle-track{
  width:38px;height:22px;border-radius:999px;background:rgba(0,0,0,.12);
  position:relative;transition:background .2s ease;display:inline-block;
}
.toggle-track::after{
  content:'';position:absolute;top:2px;left:2px;width:18px;height:18px;
  border-radius:50%;background:#fff;transition:transform .2s ease;
  box-shadow:0 2px 4px rgba(0,0,0,.15);
}
.toggle-switch input:checked + .toggle-track{background:#1e293b}
.toggle-switch input:checked + .toggle-track::after{transform:translateX(16px)}

.actions{display:flex;gap:8px;align-items:center}
.icon-btn,.btn{
  border:1px solid var(--glass-border);background:rgba(255,255,255,.6);color:var(--text);
  border-radius:14px;padding:8px 16px;font-size:13px;font-weight:550;transition:.2s ease;
}
.icon-btn{width:40px;height:40px;padding:0;display:grid;place-items:center;border-radius:14px;}
.btn:hover,.icon-btn:hover{transform:translateY(-1px);background:rgba(255,255,255,.9)}
.btn.primary{background:#1e293b;color:#fff;border-color:#1e293b}
.btn.danger{color:var(--danger)}
.sync{
  display:flex;align-items:center;gap:8px;font-size:12px;color:var(--muted);
  padding:7px 12px;border-radius:999px;background:rgba(255,255,255,.4);border:1px solid var(--glass-border);
  cursor:pointer;transition:.2s ease;
}
.sync:hover{background:rgba(255,255,255,.8)}
.dot{width:7px;height:7px;border-radius:50%;background:#94a3b8}
.dot.ok{background:#10b981}.dot.busy{background:#f59e0b}.dot.err{background:#ef4444}

.study{
  min-height:500px;border-radius:28px;padding:36px 24px;display:flex;flex-direction:column;
  justify-content:center;align-items:center
}
.cards{width:100%;display:flex;flex-wrap:wrap;justify-content:center;align-items:center;gap:24px;min-height:420px}
.empty{text-align:center;color:var(--muted);padding:80px 20px}
.empty .big{font-size:42px;margin-bottom:12px;opacity:.5}
.empty h2{font-size:18px;margin:0 0 8px;color:var(--text)}.empty p{font-size:13px;margin:0;line-height:1.6}

.card{
  width:480px;height:480px;animation:appear .35s ease both;
  position:relative;padding:28px 30px 24px;display:flex;flex-direction:column;
  background: var(--card-bg);
  backdrop-filter: blur(28px) saturate(140%);
  -webkit-backdrop-filter: blur(28px) saturate(140%);
  border:1px solid rgba(255, 255, 255, 0.85);
  border-radius:28px;
  box-shadow:0 20px 40px rgba(15, 23, 42, 0.08);
  user-select:none;transition:transform .2s ease, box-shadow .2s ease, background 0.3s ease;
}
.card:hover{transform:translateY(-2px);box-shadow:0 24px 50px rgba(15, 23, 42, 0.12)}
.card.small{width:280px;height:340px;padding:20px}
@keyframes appear{from{opacity:0;transform:translateY(12px) scale(.98)}to{opacity:1;transform:none}}

.star-btn{
  position:absolute;top:22px;left:24px;font-size:20px;color:#cbd5e1;
  cursor:pointer;transition:transform .15s ease, color .15s ease;z-index:2;line-height:1;
}
.card.small .star-btn{top:16px;left:16px;font-size:16px}
.star-btn:hover{transform:scale(1.2)}
.star-btn.starred{color:var(--star-color)}

.tags-container{
  position:absolute;top:22px;right:24px;display:flex;gap:5px;flex-wrap:wrap;justify-content:flex-end;max-width:65%;
}
.card.small .tags-container{top:16px;right:16px}
.tag-badge{background:rgba(30, 41, 59, 0.08);color:#334155;padding:3px 8px;border-radius:8px;font-weight:600;font-size:11px}

.qa-question{margin-top:20px;display:flex;flex-direction:column;flex-shrink:0}
.qa-question small, .answer small{display:block;color:#94a3b8;font-size:10px;font-weight:700;letter-spacing:1px;margin-bottom:6px;flex-shrink:0}
.question{font-size:17px;font-weight:700;line-height:1.45;padding:6px 8px;border-radius:10px;transition:background .15s;color:#0f172a}
.question:hover,.answer-content:hover{background:rgba(255,255,255,.5)}

.answer{
  border-top:1px dashed rgba(148, 163, 184, 0.35);margin-top:14px;padding-top:12px;
  display:flex;flex-direction:column;flex:1;min-height:0;overflow:hidden;
}
.answer-content{
  font-size:14px;line-height:1.65;color:#334155;padding:6px 8px;border-radius:10px;
  flex:1;overflow-y:auto;transition:background .15s;
}

.answer-content::-webkit-scrollbar, .expanded-scroll::-webkit-scrollbar{width:4px}
.answer-content::-webkit-scrollbar-thumb, .expanded-scroll::-webkit-scrollbar-thumb{background:rgba(0,0,0,.12);border-radius:4px}

.inline-editor {
  width: 100%; border: 1px solid rgba(37, 99, 235, 0.4); border-radius: 10px;
  padding: 8px 10px; font-family: inherit; font-size: inherit; line-height: inherit;
  color: var(--text); background: rgba(255, 255, 255, 0.85);
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12); outline: none; resize: none; overflow: hidden;
  transition: all 0.15s ease;
}

.markdown-body p { margin: 0 0 8px 0; }
.markdown-body p:last-child { margin-bottom: 0; }
.markdown-body ul, .markdown-body ol { margin: 4px 0 8px 20px; padding: 0; }
.markdown-body code { background: rgba(0,0,0,.06); padding: 2px 6px; border-radius: 6px; font-family: monospace; font-size: 0.88em; }
.markdown-body pre { background: #0f172a; color: #f8fafc; padding: 12px; border-radius: 12px; overflow-x: auto; font-size: 0.85em; }
.markdown-body pre code { background: none; color: inherit; padding: 0; }
.markdown-body blockquote { margin: 6px 0; padding-left: 12px; border-left: 3px solid #cbd5e1; color: var(--muted); }

.card.small .question{font-size:13px}
.card.small .answer-content{font-size:11px}

.reveal{
  margin-top:auto; width:100%; border:1px solid rgba(255,255,255,.8);
  background:rgba(255,255,255,.6); color:#1e293b; border-radius:14px;
  padding:12px; font-weight:650; flex-shrink:0; backdrop-filter:blur(10px); transition:.2s;
}
.reveal:hover{background:rgba(255,255,255,.9);transform:translateY(-1px)}

.bottom-actions{display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin-top:24px}

.modal-layer{
  position:fixed;inset:0;background:rgba(15,23,42,.25);backdrop-filter:blur(10px);
  opacity:0;pointer-events:none;transition:.22s;z-index:20
}
.modal-layer.show{opacity:1;pointer-events:auto}

.theme-palette-modal {
  position: fixed; z-index: 35; top: 50%; left: 50%; transform: translate(-50%, -46%) scale(.95);
  width: min(520px, 92vw); background: rgba(255, 255, 255, 0.82);
  border: 1px solid rgba(255, 255, 255, 0.9); border-radius: 28px;
  box-shadow: 0 30px 80px rgba(15, 23, 42, 0.16); backdrop-filter: blur(32px) saturate(150%);
  padding: 28px; opacity: 0; pointer-events: none; transition: .2s ease;
}
.theme-palette-modal.show { opacity: 1; pointer-events: auto; transform: translate(-50%, -50%) scale(1); }

.preset-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin: 16px 0 20px; }
.preset-card {
  border-radius: 16px; padding: 12px; border: 2px solid transparent;
  cursor: pointer; transition: all 0.2s ease; display: flex; flex-direction: column; gap: 8px;
}
.preset-card:hover { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(0,0,0,0.06); }
.preset-card.active { border-color: #1e293b; }
.preset-preview { height: 36px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.8); }
.preset-name { font-size: 12px; font-weight: 600; text-align: center; color: var(--text); }

.color-controls { display: flex; flex-direction: column; gap: 12px; background: rgba(255,255,255,0.4); padding: 16px; border-radius: 18px; border: 1px solid rgba(255,255,255,0.6); }
.color-picker-row { display: flex; align-items: center; justify-content: space-between; font-size: 13px; font-weight: 500; }
.color-picker-row input[type="color"] { border: none; width: 36px; height: 36px; border-radius: 50%; cursor: pointer; background: none; }

.card-expanded-modal{
  position:fixed;z-index:35;top:50%;left:50%;transform:translate(-50%,-46%) scale(.95);
  width:min(780px,92vw);max-height:85vh;
  background: var(--card-bg);
  border:1px solid rgba(255, 255, 255, 0.9);
  border-radius:32px; box-shadow:0 30px 80px rgba(15, 23, 42, 0.16);
  backdrop-filter:blur(32px) saturate(150%);
  padding:36px 40px;display:flex;flex-direction:column;opacity:0;pointer-events:none;transition:.2s ease;
}
.card-expanded-modal.show{opacity:1;pointer-events:auto;transform:translate(-50%,-50%) scale(1)}
.expanded-scroll{overflow-y:auto;flex:1;padding-right:6px}

.drawer{
  position:fixed;z-index:21;top:0;right:0;height:100dvh;width:min(500px,94vw);
  transform:translateX(102%);transition:transform .3s cubic-bezier(.2,.8,.2,1);
  background:rgba(248, 250, 252, 0.85); border-left:1px solid rgba(255, 255, 255, 0.9);
  box-shadow:-20px 0 60px rgba(15,23,42,.12); backdrop-filter:blur(30px);overflow:auto
}
.drawer.open{transform:none}
.drawer-head{
  position:sticky;top:0;z-index:2;display:flex;align-items:center;justify-content:space-between;
  padding:20px 24px;border-bottom:1px solid var(--glass-border);background:rgba(248,250,252,.75);backdrop-filter:blur(20px)
}
.drawer-head h2{font-size:17px;margin:0}.drawer-body{padding:20px 24px 50px}

.dialog {
  position: fixed; z-index: 30; top: 50%; left: 50%; transform: translate(-50%, -46%) scale(0.95);
  width: min(560px, 92vw); background: rgba(255, 255, 255, 0.85);
  border: 1px solid rgba(255, 255, 255, 0.9); border-radius: 28px;
  box-shadow: 0 25px 70px rgba(15,23,42,.15); backdrop-filter: blur(30px) saturate(140%);
  padding: 28px; opacity: 0; pointer-events: none; transition: .2s ease;
}
.dialog.show { opacity: 1; pointer-events: auto; transform: translate(-50%, -50%) scale(1); }
.dialog-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.dialog-head h3 { margin: 0; font-size: 18px; font-weight: 700; }
.dialog-body { display: flex; flex-direction: column; gap: 16px; }
.dialog-foot { display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px; }

/* 导入结果详情统计卡片 */
.import-result-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin: 12px 0 6px; }
.import-res-item { background: rgba(255,255,255,0.6); padding: 12px; border-radius: 16px; border: 1px solid rgba(255,255,255,0.8); text-align: center; }
.import-res-item .num { font-size: 20px; font-weight: 800; }
.import-res-item .lbl { font-size: 11px; color: var(--muted); margin-top: 2px; }

.form-group { display: flex; flex-direction: column; gap: 6px; }
.form-group label { font-size: 12px; font-weight: 600; color: var(--muted); display:flex; justify-content:space-between; }
.form-group label span.tip { font-weight:400; opacity:0.8; font-size:11px; }
.form-group input, .form-group textarea {
  width: 100%; border: 1px solid var(--glass-border); border-radius: 14px; background: rgba(255,255,255,.6);
  padding: 10px 14px; outline: none; font-size: 13px; color: var(--text); transition: all .15s ease;
}
.form-group input:focus, .form-group textarea:focus {
  background: rgba(255,255,255,.9); border-color: rgba(37,99,235,0.5); box-shadow: 0 0 0 3px rgba(37,99,235,0.12);
}
.form-group textarea { resize: vertical; }

.section{margin-bottom:24px}.section-title{font-size:11px;font-weight:750;letter-spacing:1px;color:#94a3b8;margin-bottom:10px;text-transform:uppercase}

.stats-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin-bottom:10px}
.stat{padding:14px 16px;border-radius:16px;background:rgba(255,255,255,.4);border:1px solid rgba(255,255,255,.6)}
.stat .num{font-size:22px;font-weight:760;letter-spacing:-1px}
.stat .label{font-size:11px;color:var(--muted);margin-top:2px}
.progress{height:5px;background:rgba(0,0,0,.06);border-radius:99px;margin-top:8px;overflow:hidden}
.progress i{display:block;height:100%;width:0;background:#1e293b;border-radius:99px;transition:width .3s}

.row{display:flex;gap:8px}.row>*{flex:1}

.search-box { width: 100%; margin-bottom: 12px; }
.search-box input {
  width: 100%; border: 1px solid var(--glass-border); border-radius: 14px;
  background: rgba(255,255,255,.6); padding: 10px 14px; outline: none; font-size: 13px;
}

.list { display: flex; flex-direction: column; gap: 10px; width: 100%; }
.item {
  width: 100%; padding: 14px 16px; border: 1px solid var(--glass-border); border-radius: 18px;
  background: rgba(255,255,255,.45); display: flex; gap: 12px; align-items: center;
  justify-content: space-between; box-sizing: border-box; transition: background .15s;
}
.item:hover { background: rgba(255,255,255,.75); }
.item-main { min-width: 0; flex: 1; }
.item-header { display: flex; align-items: center; gap: 6px; margin-bottom: 3px; flex-wrap:wrap; }
.item-tag { font-size: 10px; font-weight: 700; background: rgba(30,41,59,.08); color: #334155; padding: 2px 6px; border-radius: 6px; flex-shrink: 0; }
.item-main b {
  display: block; font-size: 13px; line-height: 1.4; color: var(--text);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.item-main span {
  display: block; font-size: 11px; color: var(--muted); margin-top: 3px;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.item-ops { display: flex; gap: 6px; flex-shrink: 0; }
.item-ops button { font-size: 11px; padding: 5px 10px; border-radius: 10px; border: 1px solid var(--glass-border); background: rgba(255,255,255,.8); }

.toast{
  position:fixed;z-index:50;left:50%;bottom:28px;transform:translate(-50%,12px);opacity:0;
  padding:10px 18px;border-radius:14px;background:rgba(15,23,42,.9);color:#fff;font-size:13px;
  backdrop-filter:blur(10px);transition:.22s;pointer-events:none;box-shadow:0 10px 30px rgba(0,0,0,.15)
}
.toast.show{opacity:1;transform:translate(-50%,0)}

@media(max-width:850px){
  .topbar{flex-direction:column;align-items:stretch;gap:12px}
  .topbar-center{justify-content:space-between}
  .actions{justify-content:flex-end}
}
@media(max-width:760px){
  .app{padding:12px 12px 45px}.topbar{padding:14px 16px;border-radius:20px}
  .sync{display:none}
  .study{padding:16px;min-height:470px;border-radius:22px}.cards{min-height:370px}
  .card{width:min(400px,92vw);height:460px}.card.small{width:min(44vw,190px);height:280px}
  .preset-grid { grid-template-columns: repeat(2, 1fr); }
}
</style>
</head>
<body>
<div class="app">
  <header class="topbar glass">
    <div class="brand">
      <div class="logo" id="appLogo" title="双击切换主题氛围调色盘">✦</div>
      <div style="display:flex;align-items:center;gap:10px;">
        <h1>复习卡片</h1>
        <div class="timer-widget" id="timerWidget" title="点击设置倒计时">
          ⏱️ <span id="timerDisplay">25:00</span>
        </div>
      </div>
    </div>
    
    <div class="topbar-center">
      <select class="category-select" id="mainCategoryFilter">
        <option value="">全部分类</option>
      </select>
      <label class="toggle-switch">
        <input type="checkbox" id="noRepeatMode" checked>
        <span class="toggle-track"></span>
        <span>本轮不重复</span>
      </label>
    </div>

    <div class="actions">
      <div class="sync" id="syncState" title="点击手动同步数据"><i class="dot ok"></i><span>Cloudflare KV</span></div>
      <button class="btn" id="manualSyncBtn">↻ 同步</button>
      <button class="btn" id="resetPoolBtn">重置本轮</button>
      <button class="btn primary" id="addModalBtn">+ 添加题目</button>
      <button class="icon-btn" id="manageBtn" title="题库管理与统计">☰</button>
    </div>
  </header>

  <main class="study glass">
    <div class="cards" id="cardsWrap">
      <div class="empty"><div class="big">✦</div><h2>准备开始复习</h2><p>抽一张卡，先在脑中思考，再点“显示答案”查看。<br><small style="opacity:.7">提示：双击左上角 Logo 可自定义毛玻璃配色与背景氛围</small></p></div>
    </div>
    <div class="bottom-actions">
      <button class="btn primary" id="drawOneBtn">抽一张</button>
      <button class="btn" id="drawFiveBtn">抽五张</button>
    </div>
  </main>
</div>

<!-- 全局遮罩层 -->
<div class="modal-layer" id="overlay"></div>

<!-- 双击 Logo 调色盘 Modal -->
<div class="theme-palette-modal" id="themeModal">
  <div class="dialog-head">
    <h3>🎨 氛围色调与毛玻璃设置</h3>
    <button class="icon-btn" id="closeThemeBtn">×</button>
  </div>
  <div style="font-size:12px;color:var(--muted);margin-bottom:12px;">选择预设推荐主题，或自定义背景色调与卡片透明度：</div>
  
  <div class="preset-grid" id="presetGrid"></div>

  <div class="color-controls">
    <div class="color-picker-row">
      <span>自定义主背景色</span>
      <input type="color" id="bgPicker" value="#e0e6ed">
    </div>
    <div class="color-picker-row">
      <span>卡片玻璃不透明度</span>
      <input type="range" id="opacitySlider" min="0.3" max="0.95" step="0.05" value="0.75">
    </div>
  </div>

  <div class="dialog-foot">
    <button class="btn primary" id="saveThemeBtn" style="width:100%;">保存并应用</button>
  </div>
</div>

<!-- 卡片双击展开 Modal -->
<div class="card-expanded-modal" id="expandedCardModal"></div>

<!-- JSON 导入结果详情 Dialog -->
<div class="dialog" id="importResultDialog">
  <div class="dialog-head">
    <h3>📥 JSON 导入结果详情</h3>
    <button class="icon-btn" id="closeImportResultBtn">×</button>
  </div>
  <div class="dialog-body">
    <div style="font-size:13px;color:var(--text);">导入任务已完成，详细统计如下：</div>
    <div class="import-result-grid">
      <div class="import-res-item">
        <div class="num" id="resAddedCount" style="color:#10b981">0</div>
        <div class="lbl">新增题目</div>
      </div>
      <div class="import-res-item">
        <div class="num" id="resSkippedCount" style="color:#f59e0b">0</div>
        <div class="lbl">重复跳过</div>
      </div>
      <div class="import-res-item">
        <div class="num" id="resInvalidCount" style="color:#ef4444">0</div>
        <div class="lbl">格式无效</div>
      </div>
    </div>
    <div style="font-size:12px;color:var(--muted);line-height:1.5;background:rgba(255,255,255,0.5);padding:10px 12px;border-radius:12px;border:1px solid rgba(255,255,255,0.7);">
      ℹ️ <b>去重规则说明：</b>系统根据题目标题自动去重（忽略前后空格及大小写差异）。重复题目已保留原有内容，未进行覆盖。
    </div>
  </div>
  <div class="dialog-foot">
    <button class="btn primary" id="confirmImportResultBtn" style="width:100%;">确定</button>
  </div>
</div>

<!-- 弹窗：添加/编辑题目 -->
<div class="dialog" id="itemDialog">
  <div class="dialog-head">
    <h3 id="dialogTitle">添加题目</h3>
    <button class="icon-btn" id="closeDialogBtn">×</button>
  </div>
  <div class="dialog-body">
    <div class="form-group">
      <label>分类 <span class="tip">(支持逗号分割，如：网络, HTTP)</span></label>
      <input type="text" id="inputCategory" placeholder="如：HTTP, 计算机网络..." />
    </div>
    <div class="form-group">
      <label>问题 <span class="tip">(快捷键: Ctrl+B 加粗, Ctrl+I 斜体)</span></label>
      <input type="text" id="inputTitle" placeholder="请输入问题描述..." />
    </div>
    <div class="form-group">
      <label>答案 <span class="tip">(支持粘贴带格式富文本，将自动转为 Markdown)</span></label>
      <textarea id="inputContent" rows="6" placeholder="请输入详细答案，支持 Markdown 格式..."></textarea>
    </div>
  </div>
  <div class="dialog-foot">
    <button class="btn" id="cancelDialogBtn">取消</button>
    <button class="btn primary" id="saveDialogBtn">保存</button>
  </div>
</div>

<!-- 侧边抽屉：统计与批量管理 -->
<aside class="drawer" id="drawer">
  <div class="drawer-head"><h2>复习统计与管理</h2><button class="icon-btn" id="closeDrawerBtn">×</button></div>
  <div class="drawer-body">
    <section class="section">
      <div class="section-title">复习进度概览</div>
      <div class="stats-grid">
        <div class="stat"><div class="num" id="statTotal">0</div><div class="label">总题目</div></div>
        <div class="stat"><div class="num" id="statStarred">0</div><div class="label">已收藏 ⭐</div></div>
        <div class="stat"><div class="num" id="statPool">0</div><div class="label">本轮剩余</div></div>
        <div class="stat"><div class="num" id="statDraws">0</div><div class="label">抽卡次数</div></div>
      </div>
      <div class="stat" style="margin-top:10px">
        <div style="display:flex;justify-content:space-between;font-size:12px"><span style="color:var(--muted)">覆盖率</span><b id="statCoverage">0%</b></div>
        <div class="progress"><i id="progressBar"></i></div>
      </div>
    </section>

    <section class="section">
      <div class="section-title">批量导入 (格式：分类 | 问题 | 答案)</div>
      <textarea id="bulkInput" style="width:100%;min-height:90px;border-radius:14px;border:1px solid var(--glass-border);padding:10px;background:rgba(255,255,255,.5)" placeholder="网络, HTTP | HTTP 200 | 成功&#10;HTTP 404 | 未找到"></textarea>
      <div class="row" style="margin-top:10px">
        <button class="btn primary" id="bulkAddBtn">批量添加</button>
        <button class="btn" id="exportBtn">导出 JSON</button>
        <button class="btn" id="importBtn">导入 JSON</button>
        <input hidden type="file" id="importFile" accept=".json">
      </div>
    </section>

    <section class="section">
      <div class="section-title">题目列表 · <span id="countLabel">0</span></div>
      <div class="search-box">
        <input type="text" id="searchInput" placeholder="🔍 搜索问题、答案或分类..." />
      </div>
      <div class="list" id="pointList"></div>
    </section>

    <section class="section">
      <button class="btn danger" id="clearAllBtn" style="width:100%">清空全部题目</button>
    </section>
  </div>
</aside>

<div class="toast" id="toast"></div>

<script>
(() => {
  const defaultPoints=[
    {id:uid(),category:'HTTP, 网络',title:'HTTP **200** 状态码代表什么？',content:'**请求成功**。表示服务器已成功处理了请求。\\n\\n常见场景：\\n- \\x60GET\\x60 请求返回了资源\\n- \\x60POST\\x60 请求成功提交', starred: true},
    {id:uid(),category:'网络, TCP',title:'TCP 三次握手的过程？',content:'1. **SYN**: 客户端发送连接请求\\n2. **SYN-ACK**: 服务端确认并回应\\n3. **ACK**: 客户端确认，连接建立', starred: false},
    {id:uid(),category:'JS, 前端',title:'使用 \\x60async/await\\x60 的优势？',content:'* 消除回调地狱（Callback Hell）\\n* 代码逻辑呈同步书写样式，可读性更高\\n* 可使用标准的 \\x60try/catch\\x60 捕获异步异常', starred: false}
  ];

  const PRESET_THEMES = [
    { name: '极光冰蓝', bg: 'linear-gradient(135deg, #e0e6ed 0%, #edf2f7 50%, #dbe3ed 100%)', cardOp: '0.75', pickColor: '#e0e6ed' },
    { name: '莫兰迪粉', bg: 'linear-gradient(135deg, #f5e6e8 0%, #f9f0f2 50%, #ebd8dc 100%)', cardOp: '0.75', pickColor: '#f5e6e8' },
    { name: '森林苔绿', bg: 'linear-gradient(135deg, #e2ebd8 0%, #eff5ea 50%, #d3e0c7 100%)', cardOp: '0.75', pickColor: '#e2ebd8' },
    { name: '暮光日落', bg: 'linear-gradient(135deg, #faebd7 0%, #fdf5e6 50%, #f3d9b1 100%)', cardOp: '0.75', pickColor: '#faebd7' },
    { name: '燕麦奶茶', bg: 'linear-gradient(135deg, #e9e4dc 0%, #f4efe9 50%, #ded7cd 100%)', cardOp: '0.78', pickColor: '#e9e4dc' },
    { name: '暗夜微光', bg: 'linear-gradient(135deg, #2a323d 0%, #1e2530 50%, #141a24 100%)', cardOp: '0.65', pickColor: '#2a323d', dark: true }
  ];

  let currentTheme = PRESET_THEMES[0];

  let points = [];
  let pool = [];
  let seen = new Set();
  let draws = 0;
  let editingId = null;

  const $=s=>document.querySelector(s);
  function uid(){return Date.now().toString(36)+Math.random().toString(36).slice(2,8)}
  function toast(msg){const t=$('#toast');t.textContent=msg;t.classList.add('show');clearTimeout(window.__toast);window.__toast=setTimeout(()=>t.classList.remove('show'),1800)}
  function status(type,text){const el=$('#syncState');el.innerHTML='<i class="dot '+type+'"></i><span>'+text+'</span>'}

  /**
   * HTML 富文本转 Markdown 格式转换器
   */
  function htmlToMarkdown(htmlStr) {
    if (!htmlStr) return '';
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlStr, 'text/html');

    function walkNode(node) {
      if (node.nodeType === Node.TEXT_NODE) {
        return node.nodeValue;
      }
      if (node.nodeType !== Node.ELEMENT_NODE) {
        return '';
      }

      let childText = Array.from(node.childNodes).map(walkNode).join('');
      const tag = node.tagName.toLowerCase();

      switch (tag) {
        case 'b':
        case 'strong':
          return childText.trim() ? '**' + childText.trim() + '**' : '';
        case 'i':
        case 'em':
          return childText.trim() ? '*' + childText.trim() + '*' : '';
        case 'code':
          if (node.parentNode && node.parentNode.tagName.toLowerCase() === 'pre') {
            return childText;
          }
          return childText.trim() ? '\\x60' + childText.trim() + '\\x60' : '';
        case 'pre':
          return '\\n\\n\\x60\\x60\\x60\\n' + childText.trim() + '\\n\\x60\\x60\\x60\\n\\n';
        case 'p':
        case 'div':
          return '\\n\\n' + childText.trim() + '\\n\\n';
        case 'br':
          return '\\n';
        case 'h1':
          return '\\n\\n# ' + childText.trim() + '\\n\\n';
        case 'h2':
          return '\\n\\n## ' + childText.trim() + '\\n\\n';
        case 'h3':
          return '\\n\\n### ' + childText.trim() + '\\n\\n';
        case 'h4':
        case 'h5':
        case 'h6':
          return '\\n\\n#### ' + childText.trim() + '\\n\\n';
        case 'li':
          return '\\n- ' + childText.trim();
        case 'ul':
        case 'ol':
          return '\\n' + childText + '\\n';
        case 'blockquote':
          return '\\n\\n> ' + childText.trim().replace(/\\n/g, '\\n> ') + '\\n\\n';
        case 'a':
          const href = node.getAttribute('href');
          return href ? '[' + childText.trim() + '](' + href + ')' : childText;
        default:
          return childText;
      }
    }

    let result = walkNode(doc.body);
    // 整理连续空行
    return result
      .replace(/\\n{3,}/g, '\\n\\n')
      .trim();
  }

  function applyTheme(themeObj) {
    currentTheme = themeObj;
    document.documentElement.style.setProperty('--bg-gradient', themeObj.bg);
    document.documentElement.style.setProperty('--card-bg', 'rgba(255, 255, 255, ' + (themeObj.cardOp || '0.75') + ')');
    
    if(themeObj.dark) {
      document.documentElement.style.setProperty('--text', '#f8fafc');
      document.documentElement.style.setProperty('--muted', '#94a3b8');
      document.documentElement.style.setProperty('--card-bg', 'rgba(30, 41, 59, ' + (themeObj.cardOp || '0.75') + ')');
    } else {
      document.documentElement.style.setProperty('--text', '#1e293b');
      document.documentElement.style.setProperty('--muted', '#64748b');
    }
  }

  function renderThemePresets() {
    const grid = $('#presetGrid');
    grid.innerHTML = '';
    PRESET_THEMES.forEach((t, idx) => {
      const card = document.createElement('div');
      card.className = 'preset-card' + (t.name === currentTheme.name ? ' active' : '');
      card.innerHTML = '<div class="preset-preview" style="background:' + t.bg + '"></div>' +
        '<div class="preset-name">' + t.name + '</div>';
      card.onclick = () => {
        applyTheme(t);
        renderThemePresets();
        $('#bgPicker').value = t.pickColor || '#e0e6ed';
        $('#opacitySlider').value = t.cardOp || 0.75;
      };
      grid.appendChild(card);
    });
  }

  $('#appLogo').addEventListener('dblclick', (e) => {
    e.stopPropagation();
    renderThemePresets();
    openOverlay();
    $('#themeModal').classList.add('show');
  });

  $('#closeThemeBtn').onclick = closeOverlay;
  $('#saveThemeBtn').onclick = () => {
    saveDataToKV();
    closeOverlay();
    toast('主题配色已保存');
  };

  $('#bgPicker').oninput = (e) => {
    const hex = e.target.value;
    const customT = {
      name: '自定义',
      bg: 'linear-gradient(135deg, ' + hex + ' 0%, #ffffff 100%)',
      cardOp: $('#opacitySlider').value,
      pickColor: hex
    };
    applyTheme(customT);
  };

  $('#opacitySlider').oninput = (e) => {
    currentTheme.cardOp = e.target.value;
    applyTheme(currentTheme);
  };

  // 绑定 Markdown 快捷键与 HTML 富文本粘贴转换
  function attachRichTextAndShortcuts(inputEl) {
    if (!inputEl || inputEl.dataset.richTextAttached) return;
    inputEl.dataset.richTextAttached = 'true';

    // 捕获粘贴事件 (Paste Event)
    inputEl.addEventListener('paste', (e) => {
      const clipboardData = e.clipboardData || window.clipboardData;
      if (!clipboardData) return;

      const htmlData = clipboardData.getData('text/html');
      if (htmlData && htmlData.trim()) {
        e.preventDefault();
        const markdownText = htmlToMarkdown(htmlData);

        const start = inputEl.selectionStart;
        const end = inputEl.selectionEnd;
        const val = inputEl.value;

        inputEl.value = val.substring(0, start) + markdownText + val.substring(end);
        inputEl.selectionStart = inputEl.selectionEnd = start + markdownText.length;

        // 若为自适应 textarea，触发 input 事件更新高度
        inputEl.dispatchEvent(new Event('input', { bubbles: true }));
        toast('已自动将带格式富文本转换为 Markdown');
      }
    });

    // 快捷键 Ctrl+B, Ctrl+I, Ctrl+K
    inputEl.addEventListener('keydown', (e) => {
      const isCmdOrCtrl = e.ctrlKey || e.metaKey;
      if (!isCmdOrCtrl) return;

      const key = e.key.toLowerCase();
      let prefix = '', suffix = '';

      if (key === 'b') { prefix = '**'; suffix = '**'; }
      else if (key === 'i') { prefix = '*'; suffix = '*'; }
      else if (key === 'k') { prefix = '\\x60'; suffix = '\\x60'; }
      else { return; }

      e.preventDefault();
      const start = inputEl.selectionStart;
      const end = inputEl.selectionEnd;
      const val = inputEl.value;
      const selected = val.substring(start, end);

      if (selected.length > 0) {
        inputEl.value = val.substring(0, start) + prefix + selected + suffix + val.substring(end);
        inputEl.selectionStart = start + prefix.length;
        inputEl.selectionEnd = end + prefix.length;
      } else {
        inputEl.value = val.substring(0, start) + prefix + suffix + val.substring(end);
        inputEl.selectionStart = start + prefix.length;
        inputEl.selectionEnd = start + prefix.length;
      }
    });
  }

  function parseCategories(catStr) {
    if (!catStr) return [];
    return catStr.split(/[,，]/).map(s => s.trim()).filter(Boolean);
  }

  function renderMarkdown(str) {
    if (!str) return '';
    try { return marked.parse(str); } catch(e) { return str; }
  }

  function updateCategoryOptions() {
    const select = $('#mainCategoryFilter');
    const currentVal = select.value;
    
    const catSet = new Set();
    points.forEach(p => {
      parseCategories(p.category).forEach(c => catSet.add(c));
    });

    select.innerHTML = '<option value="">全部分类</option><option value="__STARRED__">⭐ 仅看收藏</option>';
    catSet.forEach(cat => {
      const opt = document.createElement('option');
      opt.value = cat;
      opt.textContent = cat;
      select.appendChild(opt);
    });

    select.value = currentVal;
  }

  async function loadDataFromKV() {
    status('busy', '同步中...');
    try {
      const res = await fetch('/api/data');
      if (!res.ok) throw new Error('网络响应异常');
      const data = await res.json();
      
      if (data.theme) {
        applyTheme(data.theme);
      }

      if (Array.isArray(data.points) && data.points.length > 0) {
        points = data.points.map(p => ({ ...p, starred: !!p.starred }));
        pool = Array.isArray(data.pool) ? data.pool : [];
        seen = new Set(Array.isArray(data.seen) ? data.seen : []);
        draws = Number(data.draws) || 0;
      } else {
        points = defaultPoints;
        pool = points.map(p => p.id);
        await saveDataToKV(true);
      }
      status('ok', 'Cloudflare KV');
      syncPool(false);
      updateCategoryOptions();
      renderList();
      renderStats();
    } catch (e) {
      status('err', '加载失败');
      toast('从 KV 加载失败：' + e.message);
    }
  }

  async function saveDataToKV(silent = false) {
    status('busy', '保存中...');
    try {
      const payload = { points, pool, seen: [...seen], draws, theme: currentTheme, updatedAt: new Date().toISOString() };
      const res = await fetch('/api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('保存失败');
      status('ok', 'Cloudflare KV');
      if (!silent) toast('已同步到云端');
    } catch (e) {
      status('err', '保存出错');
      toast('保存到 KV 失败：' + e.message);
    }
  }

  function syncPool(reset=false){
    const ids=new Set(points.map(p=>p.id));
    if(reset) pool=points.map(p=>p.id);
    else{
      pool=pool.filter(id=>ids.has(id));
      points.forEach(p=>{if(!pool.includes(p.id)&&!seen.has(p.id))pool.push(p.id)});
      if(points.length&&pool.length===0)pool=points.map(p=>p.id);
    }
    renderStats();
  }

  let timerSeconds = 25 * 60, timerInterval = null, isTimerRunning = false;
  function updateTimerDisplay() {
    const m = Math.floor(timerSeconds / 60).toString().padStart(2, '0');
    const s = (timerSeconds % 60).toString().padStart(2, '0');
    $('#timerDisplay').textContent = m + ':' + s;
  }
  function toggleTimer() {
    if (isTimerRunning) {
      clearInterval(timerInterval); isTimerRunning = false; toast('倒计时已暂停');
    } else {
      if (timerSeconds <= 0) timerSeconds = 25 * 60;
      isTimerRunning = true; toast('倒计时开始');
      timerInterval = setInterval(() => {
        if (timerSeconds > 0) { timerSeconds--; updateTimerDisplay(); }
        else { clearInterval(timerInterval); isTimerRunning = false; toast('时间到！'); }
      }, 1000);
    }
  }
  $('#timerWidget').onclick = () => {
    const input = prompt('设置倒计时时长（分钟）：', Math.round(timerSeconds / 60));
    if (input === null) { toggleTimer(); return; }
    const mins = parseInt(input, 10);
    if (!isNaN(mins) && mins > 0) {
      if (isTimerRunning) { clearInterval(timerInterval); isTimerRunning = false; }
      timerSeconds = mins * 60; updateTimerDisplay(); toast('已设定倒计时：' + mins + ' 分钟'); toggleTimer();
    }
  };

  function getEligiblePoints() {
    const selectedCategory = $('#mainCategoryFilter').value;
    if (!selectedCategory) return points;
    if (selectedCategory === '__STARRED__') return points.filter(p => p.starred);
    return points.filter(p => parseCategories(p.category).includes(selectedCategory));
  }

  function weightedRandomSelect(candidates) {
    if (!candidates.length) return null;
    const weights = candidates.map(p => p.starred ? 3 : 1);
    const totalWeight = weights.reduce((a, b) => a + b, 0);
    let randomNum = Math.random() * totalWeight;
    for (let i = 0; i < candidates.length; i++) {
      if (randomNum < weights[i]) return candidates[i];
      randomNum -= weights[i];
    }
    return candidates[0];
  }

  function drawOnePoint(){
    const candidates = getEligiblePoints();
    if(!candidates.length) return null;

    let p;
    if($('#noRepeatMode').checked){
      let activeCandidates = candidates.filter(item => pool.includes(item.id));
      if(!activeCandidates.length){
        candidates.forEach(item => { if(!pool.includes(item.id)) pool.push(item.id); });
        activeCandidates = candidates;
        toast('该分类下本轮已抽完，自动重置');
      }
      const chosen = weightedRandomSelect(activeCandidates);
      pool = pool.filter(id => id !== chosen.id);
      p = chosen;
    } else {
      p = weightedRandomSelect(candidates);
    }

    if(p){seen.add(p.id);draws++;saveDataToKV(true);}
    return p;
  }

  function toggleStar(pId, starEl) {
    const p = points.find(x => x.id === pId);
    if (p) {
      p.starred = !p.starred;
      if (p.starred) starEl.classList.add('starred');
      else starEl.classList.remove('starred');
      saveDataToKV(true);
      renderStats();
      renderList();
      toast(p.starred ? '已加入收藏（抽卡概率翻倍）' : '已取消收藏');
    }
  }

  function buildCard(p, small=false){
    const el=document.createElement('article');
    el.className='card'+(small?' small':'');
    
    const cats = parseCategories(p.category);
    const tagsHtml = cats.map(c => '<span class="tag-badge">' + c + '</span>').join('');

    el.innerHTML = '<div class="star-btn ' + (p.starred ? 'starred' : '') + '" title="点击收藏（提升抽到概率）">★</div>' +
      '<div class="tags-container">' + tagsHtml + '</div>' +
      '<div class="qa-question">' +
        '<small>QUESTION (双击编辑)</small>' +
        '<div class="question markdown-body" title="双击直接编辑问题">' + renderMarkdown(p.title) + '</div>' +
      '</div>' +
      '<div class="answer" style="display:none;">' +
        '<small>ANSWER (双击编辑)</small>' +
        '<div class="answer-content markdown-body" title="双击直接编辑答案">' + renderMarkdown(p.content) + '</div>' +
      '</div>' +
      '<button class="reveal" type="button">显示答案</button>';

    const starBtn = el.querySelector('.star-btn');
    starBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleStar(p.id, starBtn);
    });

    const revealBtn = el.querySelector('.reveal');
    revealBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const a = el.querySelector('.answer');
      const isHidden = a.style.display === 'none';
      a.style.display = isHidden ? 'flex' : 'none';
      revealBtn.textContent = isHidden ? '隐藏答案' : '显示答案';
    });

    el.addEventListener('dblclick', (e) => {
      if (e.target.closest('.inline-editor')) return;
      openExpandedCard(p);
    });

    const qEl = el.querySelector('.question');
    qEl.addEventListener('dblclick', (e) => {
      e.stopPropagation();
      enableInlineEdit(qEl, p, 'title');
    });

    const aEl = el.querySelector('.answer-content');
    aEl.addEventListener('dblclick', (e) => {
      e.stopPropagation();
      enableInlineEdit(aEl, p, 'content');
    });

    return el;
  }

  function enableInlineEdit(containerEl, pointObj, key) {
    if (containerEl.querySelector('textarea')) return;
    const oldVal = pointObj[key] || '';
    
    const textarea = document.createElement('textarea');
    textarea.className = 'inline-editor';
    textarea.value = oldVal;
    
    const autoResize = () => {
      textarea.style.height = 'auto';
      textarea.style.height = textarea.scrollHeight + 'px';
    };

    containerEl.innerHTML = '';
    containerEl.appendChild(textarea);
    
    attachRichTextAndShortcuts(textarea);
    autoResize();
    textarea.focus();

    textarea.addEventListener('input', autoResize);

    let isSaved = false;
    const saveAndExit = () => {
      if (isSaved) return;
      isSaved = true;
      const newVal = textarea.value.trim();
      pointObj[key] = newVal;
      containerEl.innerHTML = renderMarkdown(newVal);
      saveDataToKV();
      renderList();
      toast('修改已实时保存');
    };

    textarea.addEventListener('blur', saveAndExit);
    textarea.addEventListener('keydown', (evt) => {
      if (evt.key === 'Enter' && (evt.ctrlKey || evt.metaKey)) {
        textarea.blur();
      }
    });
  }

  function openExpandedCard(p) {
    const modal = $('#expandedCardModal');
    const cats = parseCategories(p.category);
    const tagsHtml = cats.map(c => '<span class="tag-badge">' + c + '</span>').join('');

    modal.innerHTML = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;flex-shrink:0;">' +
        '<div style="display:flex;align-items:center;gap:12px;">' +
          '<div class="star-btn ' + (p.starred ? 'starred' : '') + '" style="position:static;font-size:22px;">★</div>' +
          '<div style="display:flex;gap:6px;flex-wrap:wrap;">' + tagsHtml + '</div>' +
        '</div>' +
        '<button class="icon-btn" id="closeExpandBtn" style="border-radius:50%;">×</button>' +
      '</div>' +
      '<div class="expanded-scroll">' +
        '<div style="margin-bottom:24px;">' +
          '<small style="color:#94a3b8;font-size:11px;font-weight:700;letter-spacing:1px;display:block;margin-bottom:8px;">QUESTION (双击编辑)</small>' +
          '<div class="question markdown-body" style="font-size:20px;font-weight:700;line-height:1.45;">' + renderMarkdown(p.title) + '</div>' +
        '</div>' +
        '<div style="border-top:1px dashed rgba(148,163,184,.35);padding-top:20px;">' +
          '<small style="color:#94a3b8;font-size:11px;font-weight:700;letter-spacing:1px;display:block;margin-bottom:10px;">ANSWER (双击编辑)</small>' +
          '<div class="answer-content markdown-body" style="font-size:15px;line-height:1.7;color:#334155;">' + renderMarkdown(p.content) + '</div>' +
        '</div>' +
      '</div>';

    modal.querySelector('.star-btn').onclick = (e) => {
      toggleStar(p.id, e.target);
    };
    modal.querySelector('#closeExpandBtn').onclick = closeOverlay;

    const expQ = modal.querySelector('.question');
    expQ.ondblclick = (e) => { e.stopPropagation(); enableInlineEdit(expQ, p, 'title'); };
    const expA = modal.querySelector('.answer-content');
    expA.ondblclick = (e) => { e.stopPropagation(); enableInlineEdit(expA, p, 'content'); };

    openOverlay();
    modal.classList.add('show');
  }

  function draw(n){
    const candidates = getEligiblePoints();
    if(!candidates.length){
      toast('该分类下暂无题目，请添加题目');
      return;
    }
    const wrap=$('#cardsWrap');wrap.innerHTML='';
    
    const drawnMap = new Map();
    for(let i=0; i<n; i++){
      const p = drawOnePoint();
      if(!p) break;
      if(!drawnMap.has(p.id)){
        drawnMap.set(p.id, p);
      }
    }

    const drawnList = Array.from(drawnMap.values());
    drawnList.forEach((p, index) => {
      const c = buildCard(p, drawnList.length > 1);
      c.style.animationDelay = (index * 0.06) + 's';
      wrap.appendChild(c);
    });

    renderStats();
  }

  function renderStats(){
    $('#statTotal').textContent=points.length;
    $('#statStarred').textContent=points.filter(p=>p.starred).length;
    const pct=points.length?Math.round(seen.size/points.length*100):0;
    $('#statCoverage').textContent=pct+'%';$('#progressBar').style.width=pct+'%';
    $('#statPool').textContent=pool.length;$('#statDraws').textContent=draws;$('#countLabel').textContent=points.length
  }

  function renderList(){
    const list=$('#pointList');list.innerHTML='';
    const kw = $('#searchInput').value.trim().toLowerCase();
    
    const filtered = points.filter(p => {
      if(!kw) return true;
      return (p.category && p.category.toLowerCase().includes(kw)) ||
             (p.title && p.title.toLowerCase().includes(kw)) ||
             (p.content && p.content.toLowerCase().includes(kw));
    });

    if(!filtered.length){
      list.innerHTML='<div style="color:#94a3b8;font-size:12px;padding:8px 0;">未找到相关题目</div>';
      return;
    }

    filtered.forEach(p=>{
      const el=document.createElement('div');el.className='item';
      const cleanTitle = (p.title || '').replace(/[#*_\`]/g, '').replace(/\\n+/g, ' ');
      const cleanContent = (p.content || '').replace(/[#*_\`]/g, '').replace(/\\n+/g, ' ');
      
      const cats = parseCategories(p.category);
      const tagsHtml = cats.map(c => '<span class="item-tag">' + c + '</span>').join('');
      const starIcon = p.starred ? '<span style="color:var(--star-color);margin-right:4px;">★</span>' : '';

      el.innerHTML = '<div class="item-main">' +
          '<div class="item-header">' +
            starIcon + tagsHtml +
            '<b title="' + cleanTitle + '">' + cleanTitle + '</b>' +
          '</div>' +
          '<span title="' + cleanContent + '">' + (cleanContent || '暂无答案') + '</span>' +
        '</div>' +
        '<div class="item-ops">' +
          '<button data-a="star" data-id="' + p.id + '">' + (p.starred ? '取消收藏' : '收藏') + '</button>' +
          '<button data-a="edit" data-id="' + p.id + '">编辑</button>' +
          '<button data-a="del" data-id="' + p.id + '">删除</button>' +
        '</div>';
      list.appendChild(el);
    });
  }

  $('#searchInput').oninput = renderList;

  function openOverlay(){ $('#overlay').classList.add('show'); }
  function closeOverlay(){
    $('#overlay').classList.remove('show');
    $('#drawer').classList.remove('open');
    $('#itemDialog').classList.remove('show');
    $('#themeModal').classList.remove('show');
    $('#expandedCardModal').classList.remove('show');
    $('#importResultDialog').classList.remove('show');
  }

  function openDrawer(){ openOverlay(); $('#drawer').classList.add('open'); }
  
  function openDialog(id = null){
    editingId = id;
    if(id) {
      const p = points.find(x => x.id === id);
      if(p) {
        $('#dialogTitle').textContent = '编辑题目';
        $('#inputCategory').value = p.category || '';
        $('#inputTitle').value = p.title || '';
        $('#inputContent').value = p.content || '';
      }
    } else {
      $('#dialogTitle').textContent = '添加题目';
      $('#inputCategory').value = '';
      $('#inputTitle').value = '';
      $('#inputContent').value = '';
    }
    openOverlay();
    $('#itemDialog').classList.add('show');
  }

  attachRichTextAndShortcuts($('#inputTitle'));
  attachRichTextAndShortcuts($('#inputContent'));
  attachRichTextAndShortcuts($('#bulkInput'));

  $('#addModalBtn').onclick = () => openDialog();
  $('#closeDialogBtn').onclick = closeOverlay;
  $('#cancelDialogBtn').onclick = closeOverlay;
  $('#manageBtn').onclick = openDrawer;
  $('#closeDrawerBtn').onclick = closeOverlay;
  $('#overlay').onclick = closeOverlay;
  $('#closeImportResultBtn').onclick = closeOverlay;
  $('#confirmImportResultBtn').onclick = closeOverlay;

  $('#manualSyncBtn').onclick = async () => {
    await loadDataFromKV();
    toast('已手动重新拉取云端数据');
  };
  $('#syncState').onclick = async () => {
    await loadDataFromKV();
    toast('已手动重新拉取云端数据');
  };

  $('#saveDialogBtn').onclick = () => {
    const category = $('#inputCategory').value.trim();
    const title = $('#inputTitle').value.trim();
    const content = $('#inputContent').value.trim();

    if(!title) {
      toast('请输入问题描述');
      return;
    }

    if(editingId) {
      const p = points.find(x => x.id === editingId);
      if(p) { p.category = category; p.title = title; p.content = content; }
      toast('题目修改成功');
    } else {
      const p = { id: uid(), category, title, content, starred: false };
      points.push(p);
      pool.push(p.id);
      toast('新增题目成功');
    }

    saveDataToKV();
    updateCategoryOptions();
    renderList();
    renderStats();
    closeOverlay();
  };

  $('#drawOneBtn').onclick=()=>draw(1);
  $('#drawFiveBtn').onclick=()=>draw(5);
  $('#resetPoolBtn').onclick=()=>{syncPool(true);saveDataToKV();toast('卡片已重置')};

  $('#bulkAddBtn').onclick=()=>{
    const text=$('#bulkInput').value.trim();if(!text){toast('请输入内容');return}
    let n=0;
    text.split(/\\n+/).map(x=>x.trim()).filter(Boolean).forEach(line=>{
      const parts = line.split('|').map(s=>s.trim());
      let category = '', title = '', content = '';
      if(parts.length >= 3) {
        category = parts[0];
        title = parts[1];
        content = parts.slice(2).join('|');
      } else if(parts.length === 2) {
        title = parts[0];
        content = parts[1];
      } else {
        title = parts[0];
      }
      if(title){const p={id:uid(),category,title,content,starred:false};points.push(p);pool.push(p.id);n++}
    });
    $('#bulkInput').value='';
    saveDataToKV();
    updateCategoryOptions();
    renderList();
    renderStats();
    toast('已批量添加 ' + n + ' 条题目');
  };

  $('#pointList').onclick=e=>{
    const b=e.target.closest('button');if(!b)return;
    const id = b.dataset.id;
    if(b.dataset.a==='del'){
      if(!confirm('确定删除这道题吗？'))return;
      points=points.filter(x=>x.id!==id);pool=pool.filter(x=>x!==id);seen.delete(id);
      saveDataToKV();updateCategoryOptions();renderList();renderStats();
    }else if(b.dataset.a==='edit'){
      openDialog(id);
    }else if(b.dataset.a==='star'){
      const p = points.find(x=>x.id===id);
      if(p) {
        p.starred = !p.starred;
        saveDataToKV();renderList();renderStats();
      }
    }
  };

  $('#exportBtn').onclick=()=>{
    const blob=new Blob([JSON.stringify({points,pool,seen:[...seen],draws,theme:currentTheme},null,2)],{type:'application/json'});
    const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='review-cards.json';a.click();URL.revokeObjectURL(a.href)
  };

  $('#importBtn').onclick=()=>$('#importFile').click();

  // JSON 导入处理：依据标题去重，默认追加添加，弹出结果详情 Modal
  $('#importFile').onchange = e => {
    const f = e.target.files[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = async () => {
      try {
        const d = JSON.parse(r.result);
        const incoming = Array.isArray(d) ? d : d.points;
        if (!Array.isArray(incoming)) throw new Error('无效数据架构');

        const existingTitleSet = new Set(
          points.map(p => (p.title || '').trim().toLowerCase())
        );

        let addedCount = 0;
        let skippedCount = 0;
        let invalidCount = 0;

        incoming.forEach(p => {
          if (!p || typeof p !== 'object') {
            invalidCount++;
            return;
          }

          const rawTitle = String(p.title || '').trim();
          if (!rawTitle) {
            invalidCount++;
            return;
          }

          const normalizedTitle = rawTitle.toLowerCase();
          if (existingTitleSet.has(normalizedTitle)) {
            skippedCount++;
          } else {
            const newCard = {
              id: p.id || uid(),
              category: String(p.category || ''),
              title: rawTitle,
              content: String(p.content || ''),
              starred: !!p.starred
            };
            points.push(newCard);
            pool.push(newCard.id);
            existingTitleSet.add(normalizedTitle);
            addedCount++;
          }
        });

        if (d.theme) applyTheme(d.theme);

        syncPool(false);
        updateCategoryOptions();
        renderList();
        renderStats();

        await saveDataToKV();

        $('#resAddedCount').textContent = addedCount;
        $('#resSkippedCount').textContent = skippedCount;
        $('#resInvalidCount').textContent = invalidCount;

        openOverlay();
        $('#importResultDialog').classList.add('show');

      } catch (err) {
        toast('导入失败：JSON 格式不正确');
      }
    };
    r.readAsText(f);
    e.target.value = '';
  };

  $('#clearAllBtn').onclick=()=>{
    if(!confirm('确定清空全部题目？此操作不可恢复。'))return;
    points=[];pool=[];seen=new Set();draws=0;
    saveDataToKV();updateCategoryOptions();renderList();renderStats();
    $('#cardsWrap').innerHTML='<div class="empty"><div class="big">✦</div><h2>题库已清空</h2><p>点击上方“+ 添加题目”进行添加。</p></div>';
    toast('题库已清空');
  };

  loadDataFromKV();
  updateTimerDisplay();
})();
</script>
</body>
</html>
`;
