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

// ---- Render Dashboard ----
function renderDashboard() {
  const box = document.getElementById('projectList');
  const { projects = [] } = AppState.data || {};
  box.innerHTML = projects.map(p => `
    <article class="bg-white rounded-2xl shadow p-4">
      <div class="flex justify-between items-start mb-2">
        <h3 class="font-semibold">${p.name}</h3>
        <span class="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">${p.status || 'In Progress'}</span>
      </div>
      <p class="text-sm text-gray-600 mb-2">${p.location} • ${p.timeRange}</p>
      <div class="w-full bg-gray-200 rounded-full h-2 mb-3">
        <div class="bg-blue-500 h-2 rounded-full" style="width:${p.progress || 0}%"></div>
      </div>
      <div class="grid grid-cols-4 gap-2 text-xs">
        <button class="btn" data-open="chat" data-project="${p.id}"><i class="fa-regular fa-message"></i> Chat</button>
        <button class="btn" data-open="upload" data-project="${p.id}" data-perm="upload:write"><i class="fa-regular fa-circle-up"></i> Upload</button>
        <button class="btn" data-open="ai" data-project="${p.id}" data-perm="ai:use"><i class="fa-solid fa-wand-magic-sparkles"></i> AI</button>
        <button class="btn" data-open="groups" data-project="${p.id}"><i class="fa-regular fa-object-group"></i> Members</button>
      </div>
    </article>
  `).join('');
}

// ---- Modal Management ----
function openModal(kind) {
  const modalHost = document.getElementById('modalHost');
  const tpl = document.getElementById(`tpl-${kind}`);
  if (!tpl) return console.warn('模板未找到', kind);

  modalHost.innerHTML = `
    <div class="fixed inset-0 z-40 bg-black/40 opacity-0 animate-[fadeIn_.15s_forwards]" data-close></div>
    <section class="fixed inset-x-0 bottom-0 z-50 max-h-[85vh] rounded-t-2xl bg-white shadow-xl overflow-auto translate-y-full animate-[slideUp_.2s_forwards]">
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
  location.hash = `#${kind}`;
  mountModal(kind);
}

function closeModal() {
  document.getElementById('modalHost').innerHTML = '';
  AppState.activeView = 'dashboard';
  location.hash = '';
}

function onHashChange() {
  const hash = location.hash.replace('#', '');
  if (!hash) return closeModal();
  const allow = ['chat', 'upload', 'ai', 'groups', 'profile', 'settings', 'new-project', 'group-settings'];
  if (allow.includes(hash)) openModal(hash);
}

function mountModal(kind) {
  switch (kind) {
    case 'chat': mountChat(); break;
    case 'upload': mountUpload(); break;
    case 'ai': mountAI(); break;
    case 'groups': mountGroups(); break;
    case 'group-settings': mountGroupSettings(); break;
    case 'profile': mountProfile(); break;
    case 'settings': mountSettings(); break;
    case 'new-project': mountNewProject(); break;
  }
}

// ---- Mount Modal Modules ----
function mountChat() {
  // 示例：渲染聊天界面
  const body = document.getElementById('modalBody');
  body.innerHTML = `
    <div class="space-y-3">
      <h4 class="font-semibold">Group Chat</h4>
      <div class="border rounded p-2 h-40 overflow-y-auto" id="chatMessages">
        <p class="text-sm text-gray-500">暂无消息</p>
      </div>
      <div class="flex">
        <input type="text" id="chatInput" class="flex-1 border rounded px-2 py-1" placeholder="输入消息...">
        <button class="ml-2 px-3 py-1 bg-blue-500 text-white rounded" onclick="sendChat()">发送</button>
      </div>
    </div>
  `;
}

function mountUpload() {
  const body = document.getElementById('modalBody');
  body.innerHTML = `
    <div class="space-y-3">
      <h4 class="font-semibold">Upload Files</h4>
      <input type="file" id="fileInput" class="w-full">
      <button class="px-3 py-1 bg-blue-500 text-white rounded" onclick="uploadFile()">上传</button>
    </div>
  `;
}

function mountAI() {
  const body = document.getElementById('modalBody');
  body.innerHTML = `
    <div class="space-y-3">
      <h4 class="font-semibold">AI Assistant</h4>
      <textarea id="aiPrompt" class="w-full border rounded px-2 py-1" rows="3" placeholder="输入需求..."></textarea>
      <button class="px-3 py-1 bg-blue-500 text-white rounded" onclick="generateAI()">生成</button>
    </div>
  `;
}

function mountGroups() {
  const body = document.getElementById('modalBody');
  body.innerHTML = `
    <div class="space-y-3">
      <h4 class="font-semibold">Groups</h4>
      <div id="groupList" class="space-y-2"></div>
    </div>
  `;
}

function mountGroupSettings() {
  const body = document.getElementById('modalBody');
  body.innerHTML = `
    <div class="space-y-3">
      <h4 class="font-semibold">Group Settings</h4>
      <p>Group settings content here</p>
    </div>
  `;
}

function mountProfile() {
  const body = document.getElementById('modalBody');
  body.innerHTML = `
    <div class="space-y-3">
      <h4 class="font-semibold">Profile</h4>
      <p>Profile content here</p>
    </div>
  `;
}

function mountSettings() {
  const body = document.getElementById('modalBody');
  body.innerHTML = `
    <div class="space-y-3">
      <h4 class="font-semibold">Settings</h4>
      <p>Settings content here</p>
    </div>
  `;
}

function mountNewProject() {
  const body = document.getElementById('modalBody');
  body.innerHTML = `
    <div class="space-y-3">
      <h4 class="font-semibold">New Project</h4>
      <p>New project content here</p>
    </div>
  `;
}

// ---- Helper Functions ----
function refreshPermUI(root = document) {
  root.querySelectorAll('[data-perm]').forEach(el => {
    const key = el.dataset.perm;
    if (!can(key)) {
      el.classList.add('opacity-40', 'pointer-events-none');
      el.setAttribute('aria-disabled', 'true');
    } else {
      el.classList.remove('opacity-40', 'pointer-events-none');
      el.removeAttribute('aria-disabled');
    }
  });
}

function toast(msg) {
  const host = document.getElementById('toastHost') || (() => {
    const h = document.createElement('div');
    h.id = 'toastHost';
    h.className = 'fixed bottom-24 inset-x-0 flex justify-center pointer-events-none';
    document.body.appendChild(h);
    return h;
  })();
  const id = 't' + Date.now();
  host.insertAdjacentHTML('beforeend', `<div id="${id}" class="pointer-events-auto bg-black text-white text-sm px-3 py-2 rounded-full shadow mb-2">${msg}</div>`);
  setTimeout(() => document.getElementById(id)?.remove(), 2000);
}
