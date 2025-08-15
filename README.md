好的！下面给你一份\*\*“只用现有 `home-projectoverview.html` 完成全站跳转与角色分级”的落地方案\*\*。按步骤做就能从当前多页静态原型，变成**单页（SPA-like）+ 角色感知 + 模块化弹层**的交互 Demo。全程不新增页面文件，只改动 `home-projectoverview.html` 与少量公共 JS/CSS（仍可复用你现有的 `assets/js/main.js` 与 `assets/data/sample.json`）。

---

# 一、目标与原则

**目标**

* 所有功能（项目概览、聊天、AI 文档、上传、成员/群组、个人中心、设置、新建项目等）都在 `home-projectoverview.html` 完成交互和跳转。
* 通过**角色分级**（CEO / TeamLeader / Member / Guest）动态控制可见与可操作项。
* 交互采用**Modal / Drawer / Bottom Sheet** 作为“页面替身”，不跳转到其他 HTML。
* 保持 iPhone 15 Pro 视觉（390px 宽，Tailwind + FontAwesome）。

**原则**

* 不破坏既有文件结构：其他页面文件保留，仅不再从首页跳过去。
* 组件化：每个功能模块有独立的渲染/事件函数，统一由一个**路由与权限层**调度。
* 渐进增强：无后端、纯前端 Demo，但结构清晰，未来可替换为真实 API。

---

# 二、准备工作（一次性）

## 步骤 0：备份与分支

* 新建分支 `feat/unified-home`，以便回滚：
  `git checkout -b feat/unified-home`

## 步骤 1：页面骨架（容器 + 模板）

在 `home-projectoverview.html` 中，确认或新增以下结构（Tailwind 略）：

```html
<body class="bg-gray-50">
  <!-- 顶部栏 -->
  <header class="sticky top-0 z-30 bg-white border-b">
    <div class="flex items-center justify-between p-3">
      <button id="btnBack" class="hidden text-xl"><i class="fa-solid fa-chevron-left"></i></button>
      <h1 class="font-semibold">Projects</h1>
      <!-- 角色切换器（仅 Demo 用） -->
      <select id="roleSelect" class="text-sm border rounded px-2 py-1">
        <option>CEO</option>
        <option>TeamLeader</option>
        <option selected>Member</option>
        <option>Guest</option>
      </select>
    </div>
  </header>

  <!-- 主视图：项目卡列表（保留你现有的项目卡 HTML） -->
  <main id="viewDashboard" data-view="dashboard" class="pb-20">
    <!-- 你的项目卡渲染容器 -->
    <div id="projectList" class="space-y-3 p-3"></div>
  </main>

  <!-- 全局模态/抽屉容器（所有“页面”都以模态出现） -->
  <div id="modalHost"></div>

  <!-- 底部 Tab（可选，或用浮动工具条） -->
  <nav class="fixed bottom-0 inset-x-0 bg-white border-t">
    <ul class="grid grid-cols-5 text-xs">
      <li><button data-open="chat" class="w-full py-2"><i class="fa-regular fa-message"></i><div>Chat</div></button></li>
      <li><button data-open="upload" class="w-full py-2"><i class="fa-regular fa-circle-up"></i><div>Upload</div></button></li>
      <li><button data-open="ai" class="w-full py-2"><i class="fa-solid fa-wand-magic-sparkles"></i><div>AI</div></button></li>
      <li><button data-open="groups" class="w-full py-2"><i class="fa-regular fa-object-group"></i><div>Groups</div></button></li>
      <li><button data-open="profile" class="w-full py-2"><i class="fa-regular fa-user"></i><div>Me</div></button></li>
    </ul>
  </nav>

  <!-- 预置模板：用 <template> 收纳原来各 HTML 页的主要区域（从原文件复制 HTML 主体到此处） -->
  <template id="tpl-chat"> ...（从 chat.html 主体复制）...</template>
  <template id="tpl-upload"> ...（从 upload.html 主体复制）...</template>
  <template id="tpl-ai"> ...（从 Ai assistant.html 主体复制）...</template>
  <template id="tpl-groups"> ...（从 group-list.html 主体复制）...</template>
  <template id="tpl-group-settings"> ...（从 group-settings.html 主体复制）...</template>
  <template id="tpl-profile"> ...（从 profile.html 主体复制）...</template>
  <template id="tpl-new-project"> ...（从 new-project.html 主体复制）...</template>
  <template id="tpl-settings"> ...（从 settings.html 主体复制）...</template>

  <div id="toastHost" class="fixed bottom-24 inset-x-0 flex justify-center pointer-events-none"></div>

  <script src="assets/js/main.js"></script>
  <script src="assets/js/unified-home.js"></script>
</body>
```

> 要点
>
> 1. **不新增页面**，只是把其他页面的主要内容复制进 `<template>`。
> 2. 未来如要拆分，可把模板放入外部 JS 的字符串模板里，但 `<template>` 更直观。

## 步骤 2：权限与状态基座（JS）

新建 `assets/js/unified-home.js`，建立全局状态、权限表与工具函数：

```js
// ---- State ----
const AppState = {
  role: 'Member',         // 与 #roleSelect 同步
  activeView: 'dashboard',// 'dashboard' | 'modal:chat' | ...
  currentProjectId: null, // 当前选择的项目
  data: null              // 从 sample.json 拉取的 mock 数据
};

// ---- Permission Map ----
const PERMS = {
  CEO: {
    'project:create': true, 'project:edit': true, 'project:view': true,
    'members:manage': true, 'chat:all': true, 'chat:moderate': true,
    'upload:write': true, 'upload:delete': true, 'ai:use': true,
    'settings:global': true
  },
  TeamLeader: {
    'project:create': false, 'project:edit': true, 'project:view': true,
    'members:manage': true, 'chat:all': false, 'chat:moderate': true,
    'upload:write': true, 'upload:delete': true, 'ai:use': true,
    'settings:global': false
  },
  Member: {
    'project:create': false, 'project:edit': false, 'project:view': true,
    'members:manage': false, 'chat:all': false, 'chat:moderate': false,
    'upload:write': true, 'upload:delete': false, 'ai:use': true,
    'settings:global': false
  },
  Guest: {
    'project:create': false, 'project:edit': false, 'project:view': true,
    'members:manage': false, 'chat:all': false, 'chat:moderate': false,
    'upload:write': false, 'upload:delete': false, 'ai:use': false,
    'settings:global': false
  }
};

const can = (k) => !!PERMS[AppState.role]?.[k];

// ---- Boot ----
document.addEventListener('DOMContentLoaded', async () => {
  // 1) 拉取 mock 数据
  try {
    const res = await fetch('assets/data/sample.json');
    AppState.data = await res.json();
  } catch (e) {
    console.warn('sample.json 加载失败，使用内置示例');
    AppState.data = { projects: [], groups: [], users: [], chats: [], files: [] };
  }

  // 2) 绑定角色切换
  const roleSel = document.getElementById('roleSelect');
  roleSel.addEventListener('change', () => {
    AppState.role = roleSel.value;
    renderDashboard();
    refreshPermUI();
    toast(`Role: ${AppState.role}`);
  });

  // 3) 底部 Tab 打开各模块（以 Modal 呈现）
  document.querySelector('nav').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-open]');
    if (!btn) return;
    openModal(btn.dataset.open);
  });

  // 4) 初次渲染
  renderDashboard();
  refreshPermUI();

  // 5) Hash 路由（可分享与后退）
  window.addEventListener('hashchange', onHashChange);
  onHashChange();
});
```

---

# 三、把“多页面”变“多模态”：迁移策略

## 步骤 3：迁移原页面内容到 `<template>`

* 打开每个原始页面（如 `chat.html`），复制其中\*\*主体内容（不含 `<html><head>` 等）\*\*到对应 `<template id="tpl-chat">`。
* 如模板里原本有脚本，改为在 `unified-home.js` 的模块渲染函数里写事件绑定。
* 若使用相同的样式/组件，确保 Tailwind 与 FontAwesome CDN 已在首页引入。

## 步骤 4：统一 Modal 管理器

实现一个**通用模态**（覆盖全屏 / Bottom Sheet）并加载模板内容：

```js
function openModal(kind, params = {}) {
  const modalHost = document.getElementById('modalHost');
  const tpl = document.getElementById(`tpl-${kind}`);
  if (!tpl) return console.warn('找不到模板', kind);

  // 基础遮罩 + 容器
  modalHost.innerHTML = `
    <div class="fixed inset-0 z-40 bg-black/40 opacity-0 animate-[fadeIn_.15s_forwards]" data-close></div>
    <section class="fixed inset-x-0 bottom-0 z-50 max-h-[85vh] rounded-t-2xl bg-white shadow-xl overflow-auto
                    translate-y-full animate-[slideUp_.2s_forwards]"
             role="dialog" aria-modal="true">
      <div class="sticky top-0 flex items-center justify-between p-3 border-b">
        <button class="px-2 py-1" data-close><i class="fa-solid fa-xmark"></i></button>
        <div class="font-medium capitalize">${kind}</div>
        <div class="w-8"></div>
      </div>
      <div class="p-3" id="modalBody"></div>
    </section>
  `;
  document.getElementById('modalBody').append(tpl.content.cloneNode(true));
  modalHost.addEventListener('click', (e) => {
    if (e.target.matches('[data-close]')) closeModal();
  }, { once: true });

  AppState.activeView = `modal:${kind}`;
  location.hash = `#${kind}`; // 路由同步
  // 调用各模块的“挂载逻辑”
  mountModal(kind, params);
}

function closeModal() {
  const modalHost = document.getElementById('modalHost');
  modalHost.innerHTML = '';
  AppState.activeView = 'dashboard';
  history.pushState('', document.title, window.location.pathname + window.location.search);
}

function onHashChange() {
  const hash = location.hash.replace('#','');
  if (!hash) return closeModal();
  // 支持 #chat, #upload, #ai, #groups, #profile, #settings, #new-project
  const allow = ['chat','upload','ai','groups','profile','settings','new-project','group-settings'];
  if (allow.includes(hash)) openModal(hash);
}
```

> 动画类 `fadeIn`、`slideUp` 可在 `<style>`（Tailwind 插件或 @keyframes）里自定义。

---

# 四、模块化挂载（每个“页面”的 Modal 逻辑）

## 步骤 5：模块分发器

```js
function mountModal(kind, params) {
  switch (kind) {
    case 'chat': return mountChat(params);
    case 'upload': return mountUpload(params);
    case 'ai': return mountAI(params);
    case 'groups': return mountGroups(params);
    case 'group-settings': return mountGroupSettings(params);
    case 'profile': return mountProfile(params);
    case 'settings': return mountSettings(params);
    case 'new-project': return mountNewProject(params);
  }
}
```

### 5.1 Chat（群聊）

目标：

* Member 可发消息；TeamLeader/CEO 可**置顶/撤回**（`chat:moderate`）。
* “只看自己有权限的群”：Member 只显示所属组；TeamLeader 显示自己所带组；CEO 全部（`chat:all`）。

实现要点：

* 渲染群组列表 + 消息区；消息数据来源 `sample.json.chats`。
* 发送消息按钮根据 `can('chat:moderate')` 显示**更多操作**（删除、pin）。
* 消息入列后滚动到底部；Demo 用内存数组即可。

```js
function mountChat() {
  // 1) 数据筛选
  const groups = filterGroupsByRole(AppState.role, AppState.data.groups);
  // 2) 渲染侧栏/列表 + 主消息区（模板里预留容器）
  // 3) 绑定：发送、删除、pin、切换群组等
}

function filterGroupsByRole(role, allGroups) {
  if (role === 'CEO') return allGroups;
  if (role === 'TeamLeader') return allGroups.filter(g => g.leaderId === currentUserId());
  if (role === 'Member') return allGroups.filter(g => g.memberIds?.includes(currentUserId()));
  return []; // Guest
}
```

### 5.2 Upload（上传）

* Member 可上传；TeamLeader/CEO 可删除（`upload:delete`）。
* 演示**伪进度条**：`setInterval` 模拟 0→100%。

```js
function mountUpload() {
  // 1) 绑定 <input type="file">；预览缩略图
  // 2) 模拟上传进度；完成后 push 到 AppState.data.files
  // 3) 文件卡片的“删除”按钮根据 can('upload:delete') 控制显隐
}
```

### 5.3 AI（文档助手）

* Guest 禁用；其他角色可用（`ai:use`）。
* 预置模板快速生成（仅占位）：生成一段 Markdown + 时间戳 → 展示在文档预览区，可一键“保存到项目文件”（写入 `files`）。

```js
function mountAI() {
  if (!can('ai:use')) return showNoPerm('AI is disabled for your role.');
  // 1) 模板列表（日报/周报/隐患排查…）
  // 2) 点击生成：把表单输入合成 Markdown → 渲染
  // 3) “保存到文件”：调用一个 addFileToProject() 写入内存
}
```

### 5.4 Groups（群组列表）与 Group Settings（组管理）

* Member：只读组信息
* TeamLeader/CEO：显示“添加/移除成员”“改名”等（`members:manage`）

```js
function mountGroups() {
  // 列出可见组，点击某组 -> openModal('group-settings', { groupId })
}
function mountGroupSettings({ groupId }) {
  // 右上角“Add / Remove”按钮由 can('members:manage') 控制
}
```

### 5.5 Profile（个人中心）

* 展示当前用户、所属项目/组；允许“退出登录”（仅 Demo：重置角色为 Guest）。
* 可提供“语言/单位/时区”个人偏好（写入 localStorage）。

### 5.6 Settings（全局设置）

* 仅 CEO 显示敏感开关（`settings:global`），如：**全员导出**、**审计开关**等。
* 其他角色只显示客户端偏好（深色模式、字号等）。

### 5.7 New Project（新建项目）

* CEO 才能新建（`project:create`）。
* TeamLeader 能编辑所属项目（`project:edit`），Member/Guest 隐藏相关按钮。
* 新建完成后更新内存并 `renderDashboard()`。

---

# 五、Dashboard（主视图）与权限可视化

## 步骤 6：渲染项目卡与入口

* 你的项目卡原有结构保持，只需补充**入口按钮**：Chat / Upload / AI / Members / Settings 等。
* 每个按钮使用 `data-perm="xxx"` 或 `data-requires="project:edit"` 来声明所需权限。

```js
function renderDashboard() {
  const box = document.getElementById('projectList');
  const { projects = [] } = AppState.data || {};

  box.innerHTML = projects.map(p => `
    <article class="bg-white rounded-2xl shadow p-3">
      <div class="flex justify-between items-center">
        <div>
          <h3 class="font-semibold">${p.name}</h3>
          <p class="text-xs text-gray-500">${p.location} • ${p.timeRange}</p>
        </div>
        <div class="text-right">
          <div class="text-xs">Progress</div>
          <div class="h-2 bg-gray-200 rounded">
            <div class="h-2 bg-emerald-500 rounded" style="width:${p.progress||0}%"></div>
          </div>
        </div>
      </div>

      <div class="mt-3 grid grid-cols-4 gap-2 text-xs">
        <button class="btn" data-open="chat" data-project="${p.id}">
          <i class="fa-regular fa-message"></i> Chat
        </button>
        <button class="btn" data-open="upload" data-project="${p.id}" data-perm="upload:write">
          <i class="fa-regular fa-circle-up"></i> Upload
        </button>
        <button class="btn" data-open="ai" data-project="${p.id}" data-perm="ai:use">
          <i class="fa-solid fa-wand-magic-sparkles"></i> AI
        </button>
        <button class="btn" data-open="groups" data-project="${p.id}">
          <i class="fa-regular fa-object-group"></i> Members
        </button>
      </div>

      <div class="mt-2 flex justify-end gap-2">
        <button class="text-xs px-2 py-1 border rounded" data-open="new-project" data-perm="project:edit" data-project="${p.id}">Edit</button>
        <button class="text-xs px-2 py-1 border rounded" data-open="settings" data-perm="settings:global">Settings</button>
      </div>
    </article>
  `).join('');

  // 事件委托：打开对应模态
  box.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-open]');
    if (!btn) return;
    AppState.currentProjectId = btn.dataset.project || null;
    openModal(btn.dataset.open, { projectId: AppState.currentProjectId });
  }, { once: true });

  refreshPermUI();
}
```

## 步骤 7：权限组件刷新（隐藏/禁用）

```js
function refreshPermUI(root = document) {
  root.querySelectorAll('[data-perm],[data-requires]').forEach(el => {
    const key = el.dataset.perm || el.dataset.requires;
    if (!can(key)) {
      el.classList.add('opacity-40','pointer-events-none');
      el.setAttribute('aria-disabled','true');
    } else {
      el.classList.remove('opacity-40','pointer-events-none');
      el.removeAttribute('aria-disabled');
    }
  });
}
```

> 注意：**不要仅靠隐藏**，在动作触发处也要**二次校验**（防止直接调用函数触发）。

---

# 六、导航与返回体验

## 步骤 8：轻路由（Hash）

* 打开模态时写入 `#chat`、`#ai` 等；关闭时清除 hash。
* 点击卡片内部按钮时，带上 `projectId` 写入内存（必要可追加 `#chat-p42` 这种自定义 hash）。

## 步骤 9：返回键

* 顶栏返回键 `#btnBack`：当存在模态时关闭模态；否则可返回到 Dashboard 顶部或忽略。
* iOS 手势/浏览器后退：依赖 `hashchange` 自动关闭或重开模态（见前文）。

---

# 七、体验与动效

## 步骤 10：iOS 手感细节

* **触感大小**：所有点击目标 ≥44px；
* **过渡**：Tailwind `transition` + `duration-200`；
* **阴影**：卡片 `shadow`、模态 `shadow-xl`；
* **圆角**：组件 `rounded-2xl`；
* **Haptics**（可选）：点击时给按钮加 `active:scale-95`。

## 步骤 11：空态/错误态

* 无权限：显示占位插画 + 简短说明；
* 无数据：给出“添加/上传/邀请”建议动作；
* 上传失败：Toast + 重试按钮（即使是假的）。

```js
function showNoPerm(msg='No permission') {
  document.getElementById('modalBody').innerHTML = `
    <div class="text-center p-6 text-gray-500">
      <i class="fa-regular fa-circle-xmark text-3xl"></i>
      <p class="mt-2">${msg}</p>
    </div>`;
}
function toast(msg) {
  const host = document.getElementById('toastHost');
  const id = 't' + Date.now();
  host.insertAdjacentHTML('beforeend',
    `<div id="${id}" class="pointer-events-auto bg-black text-white text-sm px-3 py-2 rounded-full shadow mb-2">
      ${msg}
     </div>`);
  setTimeout(()=>document.getElementById(id)?.remove(), 2000);
}
```

---

# 八、数据与本地存储

## 步骤 12：数据形态对齐 `sample.json`

确保 `sample.json` 至少包含：

```json
{
  "users": [{ "id": "u1", "name": "Alice", "role": "TeamLeader" }],
  "groups": [{ "id": "g1", "name": "Electricians", "leaderId": "u1", "memberIds": ["u1","u2"] }],
  "projects": [{ "id": "p1", "name": "Tower A", "location": "Taipei", "timeRange": "2025-05~2025-12", "progress": 36 }],
  "chats": [{ "groupId": "g1", "messages": [{ "id":"m1", "userId":"u1", "text":"Hello", "ts": 1723500000 }] }],
  "files": [{ "id":"f1", "projectId":"p1", "name":"photo.jpg", "size":234123, "ts":1723500000, "uploaderId":"u2" }]
}
```

> Demo 阶段所有写操作（新建项目、上传、删除、成员变更）都改写 **内存数据**，如需“持久化”，把变更同步到 `localStorage`（下次加载时先读 localStorage）。

---

# 九、可访问性（A11y）

## 步骤 13：模态语义

* `role="dialog"`、`aria-modal="true"`；
* 打开模态后把焦点聚焦到标题/关闭按钮；`Esc` 关闭；
* 关闭后把焦点还原到触发按钮。

---

# 十、性能与结构

## 步骤 14：按需挂载 & 事件委托

* 只在 `mountXXX()` 时绑定监听，关闭模态后**移除**或依赖 `[once:true]` 的委托；
* 大列表采用事件委托（减少监听器数）。

## 步骤 15：样式复用

* 常用按钮样式可定义一个 Tailwind 组件类（或直接复用类名 `btn`）：

```html
<!-- 在 <style> 里加 -->
<style>
  .btn { @apply px-2 py-1 border rounded flex items-center gap-1 justify-center; }
</style>
```

---

# 十一、QA 用例（逐条验证）

## 步骤 16：四种角色自测清单

**Guest**

* Dashboard 只读；底部 “Upload”“AI”“Settings” 按钮灰置。
* 打开 AI -> 显示无权限页。

**Member**

* 可上传文件、参与聊天；不可删除文件/管理成员。
* Groups 模块中无“Add/Remove”按钮。

**TeamLeader**

* Groups 可添加/移除成员；Chat 可进行基本管理（撤回/置顶）。
* Upload 可删除文件；新建项目按钮不可见。

**CEO**

* 显示“新建项目”“全局设置”；查看全部群聊与所有项目成员；拥有所有权限。

---

# 十二、可选增强（仍不新增页面）

* **哈希参数**支持：如 `#chat?g=g1` 直接打开指定群；
* **搜索/筛选**：Dashboard 顶部搜索框按名称/状态过滤；
* **多语言**：Profile 中选择语言，把 UI 文案存入 localStorage；
* **轻主题**：深浅色切换（Tailwind `dark:`）。

---

## 交付清单（你现在可以直接动手做）

1. 在 `home-projectoverview.html`

* 增加：顶部栏（含角色切换）、`#viewDashboard`、`#modalHost`、底部 Tab、`<template>` 集合、`#toastHost`。
* 从其它 HTML 页面复制主体内容到对应 `<template>`。

2. 新建 `assets/js/unified-home.js`

* 写入：`AppState`、`PERMS`、`can()`；`renderDashboard()`；`openModal()/closeModal()`；`mountModal()` 分发；各 `mountXXX()` 模块；`refreshPermUI()`；`toast()`；`hashchange` 处理。

3. 在 `assets/js/main.js`（如有）

* 保留原有通用代码；**不要**再做跨页跳转（删除/替换 `location.href = 'chat.html'` 这类语句，改为 `openModal('chat')`）。

4. 在 `assets/data/sample.json`

* 对齐数据结构；补足最小样例。

---

如果你愿意，我也可以把上面的骨架整理成**可直接粘贴的 `unified-home.js` 初始版本**（含最小可用的 Chat/Upload/AI 模态挂载与权限控制），你只需把各 `<template>` 填上你已有页面主体就能跑起来。需要的话直接说一声，我马上给你一份“开箱即跑”的精简代码包。
