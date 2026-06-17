// 主应用逻辑

// ====== 页面切换 ======
function showPage(pageId) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const page = document.getElementById(pageId);
  if (page) page.classList.add('active');

  // 根据页面加载数据
  if (pageId === 'page-customers') {
    CustomerManager.loadCustomers();
  } else if (pageId === 'page-overview') {
    const datePicker = document.getElementById('date-picker');
    if (datePicker) {
      datePicker.value = getTodayStr();
      RecordManager.loadOverview(getTodayStr());
    }
  }
}

// ====== 检测设备类型 ======
function isMobile() {
  return window.innerWidth < 768;
}

// ====== Toast 提示 ======
let toastTimer = null;
function showToast(message, isError = false) {
  const toast = document.getElementById('toast');
  if (!toast) return;

  toast.textContent = message;
  toast.className = 'toast' + (isError ? ' error' : '');
  toast.classList.remove('hidden');

  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.add('hidden');
  }, 2500);
}

// ====== 弹窗管理 ======
function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.add('hidden');
}

function closeAllModals() {
  document.querySelectorAll('.modal').forEach(m => m.classList.add('hidden'));
}

// ====== 应用初始化 ======
async function initApp() {
  // 初始化 Supabase
  if (!initSupabase()) {
    document.body.innerHTML = `
      <div style="padding:40px;text-align:center;color:#d93025;">
        <h2>连接失败</h2>
        <p>Supabase SDK 加载失败，请检查网络连接</p>
      </div>
    `;
    return;
  }

  // 检查 anon key 是否已配置
  if (SUPABASE_ANON_KEY === 'YOUR_ANON_KEY_HERE') {
    document.body.innerHTML = `
      <div style="padding:40px;text-align:center;max-width:500px;margin:0 auto;">
        <h2 style="color:#1a73e8;">⚙️ 需要配置</h2>
        <p style="margin:16px 0;color:#5f6368;">
          请先在 <code>js/supabase.js</code> 中填入你的 Supabase anon public key。
        </p>
        <div style="background:#f8f9fa;padding:16px;border-radius:8px;text-align:left;font-size:14px;">
          <p><strong>获取步骤：</strong></p>
          <ol style="margin-top:8px;padding-left:20px;">
            <li>打开 <a href="https://supabase.com/dashboard/project/vyeimyuwsrvywlolxkye/settings/api" target="_blank">Supabase Dashboard → Settings → API</a></li>
            <li>找到 <strong>Project API keys</strong> 部分</li>
            <li>复制 <strong>anon / public</strong> key（不是 service_role key）</li>
            <li>打开 <code>js/supabase.js</code>，替换 <code>YOUR_ANON_KEY_HERE</code></li>
          </ol>
        </div>
        <div style="margin-top:20px;background:#fff3cd;padding:12px;border-radius:8px;font-size:13px;">
          <strong>⚠️ 注意：</strong>anon key 是公开密钥，可以安全地放在前端代码中。
          <br>你之前提供的 sb_secret 是服务端密钥，<strong>不要</strong>放在前端。
        </div>
      </div>
    `;
    return;
  }

  // 初始化语音识别
  VoiceRecognition.init();

  // 设置手机端日期副标题
  const dateSub = document.getElementById('today-date-mobile');
  if (dateSub) dateSub.textContent = formatDate(getTodayStr());

  // 根据设备类型显示不同界面
  if (isMobile()) {
    showPage('page-customers');
  } else {
    showPage('page-overview');
  }

  // ====== 绑定事件 ======

  // iPhone: 返回按钮
  document.getElementById('btn-back')?.addEventListener('click', () => {
    showPage('page-customers');
  });

  // iPhone: 添加客户按钮
  document.getElementById('btn-add-customer')?.addEventListener('click', () => {
    document.getElementById('input-customer-name').value = '';
    document.getElementById('input-customer-phone').value = '';
    document.getElementById('modal-add-customer').classList.remove('hidden');
    document.getElementById('input-customer-name').focus();
  });

  // iPhone: 确认添加客户
  document.getElementById('btn-confirm-customer')?.addEventListener('click', async () => {
    const name = document.getElementById('input-customer-name').value;
    const phone = document.getElementById('input-customer-phone').value;
    const result = await CustomerManager.addCustomer(name, phone);
    if (result) {
      closeModal('modal-add-customer');
    }
  });

  // iPhone: 搜索客户
  document.getElementById('search-input')?.addEventListener('input', (e) => {
    CustomerManager.renderCustomerList(e.target.value.trim());
  });

  // iPhone: 语音搜索
  document.getElementById('btn-voice-search')?.addEventListener('click', () => {
    const btn = document.getElementById('btn-voice-search');
    VoiceRecognition.startRecording((transcript) => {
      document.getElementById('search-input').value = transcript;
      CustomerManager.renderCustomerList(transcript);
    }, btn);
  });

  // iPhone: 语音输入商品名
  document.getElementById('btn-voice-product')?.addEventListener('click', () => {
    const btn = document.getElementById('btn-voice-product');
    VoiceRecognition.startRecording((transcript) => {
      document.getElementById('input-product-name').value = transcript;
    }, btn);
  });

  // iPhone: 语音输入客户名
  document.getElementById('btn-voice-customer')?.addEventListener('click', () => {
    const btn = document.getElementById('btn-voice-customer');
    VoiceRecognition.startRecording((transcript) => {
      document.getElementById('input-customer-name').value = transcript;
    }, btn);
  });

  // iPhone: 新建记录
  document.getElementById('btn-new-record')?.addEventListener('click', () => {
    RecordManager.createNewRecord();
  });

  // iPhone: 删除客户
  document.getElementById('btn-delete-customer')?.addEventListener('click', () => {
    RecordManager.deleteCustomer();
  });

  // 添加商品弹窗：确认
  document.getElementById('btn-confirm-item')?.addEventListener('click', () => {
    RecordManager.confirmAddItem();
  });

  // 编辑商品弹窗：保存
  document.getElementById('btn-save-edit')?.addEventListener('click', () => {
    RecordManager.saveEdit();
  });

  // 编辑商品弹窗：删除
  document.getElementById('btn-delete-item')?.addEventListener('click', () => {
    RecordManager.deleteItem();
  });

  // PC: 日期选择器
  document.getElementById('date-picker')?.addEventListener('change', (e) => {
    RecordManager.loadOverview(e.target.value);
  });

  // PC: 管理客户按钮
  document.getElementById('btn-manage-customers')?.addEventListener('click', () => {
    CustomerManager.renderPCCustomerList();
    document.getElementById('modal-manage-customers').classList.remove('hidden');
  });

  // PC: 添加客户
  document.getElementById('btn-pc-add-customer')?.addEventListener('click', async () => {
    const name = document.getElementById('pc-customer-name').value;
    const phone = document.getElementById('pc-customer-phone').value;
    const result = await CustomerManager.addCustomer(name, phone);
    if (result) {
      document.getElementById('pc-customer-name').value = '';
      document.getElementById('pc-customer-phone').value = '';
      CustomerManager.renderPCCustomerList();
    }
  });

  // 关闭弹窗：点击背景或关闭按钮
  document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.classList.add('hidden');
      }
    });
  });

  document.querySelectorAll('.btn-close').forEach(btn => {
    btn.addEventListener('click', () => {
      btn.closest('.modal')?.classList.add('hidden');
    });
  });

  // Enter 键提交
  document.getElementById('input-product-name')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      document.getElementById('input-quantity')?.focus();
    }
  });

  document.getElementById('input-quantity')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      RecordManager.confirmAddItem();
    }
  });

  document.getElementById('input-customer-name')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      document.getElementById('input-customer-phone')?.focus();
    }
  });

  // 单位选择器按钮点击事件
  document.querySelectorAll('.unit-selector').forEach(selector => {
    selector.querySelectorAll('.unit-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        selector.querySelectorAll('.unit-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });
  });

  // 窗口大小变化时切换界面
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      const currentPage = document.querySelector('.page.active')?.id;
      if (isMobile() && currentPage === 'page-overview') {
        showPage('page-customers');
      } else if (!isMobile() && currentPage === 'page-customers') {
        showPage('page-overview');
      }
    }, 200);
  });

  // 注册 Service Worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch((err) => {
      console.warn('Service Worker 注册失败:', err);
    });
  }

  console.log('五金记账 PWA 已启动');
}

// DOM 加载完成后初始化
document.addEventListener('DOMContentLoaded', initApp);
