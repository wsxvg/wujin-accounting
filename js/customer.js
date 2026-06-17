// 客户管理模块

const CustomerManager = (() => {
  let customers = [];
  let todayActiveIds = [];

  // 加载客户列表
  async function loadCustomers() {
    try {
      customers = await db.getCustomers();
      todayActiveIds = await db.getTodayActiveCustomerIds();
      renderCustomerList();
    } catch (e) {
      console.error('加载客户失败:', e);
      showToast('加载客户列表失败', true);
    }
  }

  // 渲染客户列表（iPhone 端）
  function renderCustomerList(filter = '') {
    const container = document.getElementById('customer-list');
    if (!container) return;

    const filtered = filter
      ? customers.filter(c => c.name.includes(filter))
      : customers;

    if (filtered.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="icon">📋</div>
          <p>${filter ? '没有找到匹配的客户' : '还没有客户，点击右上角 + 添加'}</p>
        </div>
      `;
      return;
    }

    container.innerHTML = filtered.map(c => {
      const hasToday = todayActiveIds.includes(c.id);
      return `
        <div class="customer-item" data-id="${c.id}" data-name="${c.name}">
          ${hasToday ? '<span class="today-badge">今日有记录</span>' : ''}
          <span class="name">${escapeHtml(c.name)}</span>
          <span class="arrow">›</span>
        </div>
      `;
    }).join('');

    // 绑定点击事件
    container.querySelectorAll('.customer-item').forEach(el => {
      el.addEventListener('click', () => {
        const id = el.dataset.id;
        const name = el.dataset.name;
        openCustomerRecords(id, name);
      });
    });
  }

  // 渲染 PC 端客户管理列表
  function renderPCCustomerList() {
    const container = document.getElementById('pc-customer-list');
    if (!container) return;

    if (customers.length === 0) {
      container.innerHTML = '<div class="empty-state"><p>还没有客户</p></div>';
      return;
    }

    container.innerHTML = customers.map(c => `
      <div class="pc-customer-item" data-id="${c.id}">
        <span class="name">${escapeHtml(c.name)}</span>
        <div class="actions">
          <button class="btn-del" data-id="${c.id}" data-name="${escapeHtml(c.name)}">删除</button>
        </div>
      </div>
    `).join('');

    // 绑定删除事件
    container.querySelectorAll('.btn-del').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const id = btn.dataset.id;
        const name = btn.dataset.name;
        if (confirm(`确定要删除客户"${name}"吗？\n该客户的所有记录也会被删除。`)) {
          try {
            await db.deleteCustomer(id);
            showToast('客户已删除');
            await loadCustomers();
            renderPCCustomerList();
          } catch (e) {
            console.error('删除客户失败:', e);
            showToast('删除失败', true);
          }
        }
      });
    });
  }

  // 添加客户
  async function addCustomer(name, phone = '') {
    if (!name.trim()) {
      showToast('请输入客户名称', true);
      return null;
    }

    // 检查是否已存在
    if (customers.some(c => c.name === name.trim())) {
      showToast('该客户已存在', true);
      return null;
    }

    try {
      const customer = await db.addCustomer(name, phone);
      showToast('客户添加成功');
      await loadCustomers();
      return customer;
    } catch (e) {
      console.error('添加客户失败:', e);
      showToast('添加失败', true);
      return null;
    }
  }

  // 打开客户记录页
  function openCustomerRecords(customerId, customerName) {
    RecordManager.loadRecords(customerId, customerName);
    showPage('page-records');
  }

  // 获取客户列表（供外部使用）
  function getCustomers() {
    return customers;
  }

  return {
    loadCustomers,
    renderCustomerList,
    renderPCCustomerList,
    addCustomer,
    openCustomerRecords,
    getCustomers
  };
})();

// 工具函数：HTML 转义
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
