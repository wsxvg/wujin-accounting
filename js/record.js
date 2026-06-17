// 记录管理模块

const RecordManager = (() => {
  let currentCustomerId = null;
  let currentCustomerName = '';
  let currentRecords = [];
  let editingItemId = null;
  let editingRecordId = null;

  // 加载某客户的今日记录
  async function loadRecords(customerId, customerName) {
    currentCustomerId = customerId;
    currentCustomerName = customerName;

    document.getElementById('record-customer-name').textContent = customerName;

    try {
      const today = getTodayStr();
      currentRecords = await db.getRecordsByDate(customerId, today);
      renderRecordList();
    } catch (e) {
      console.error('加载记录失败:', e);
      showToast('加载记录失败', true);
    }
  }

  // 渲染记录列表（iPhone 端）
  function renderRecordList() {
    const container = document.getElementById('record-list');
    if (!container) return;

    if (currentRecords.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="icon">📦</div>
          <p>今天还没有记录</p>
          <p style="margin-top:8px;font-size:13px">点击下方 + 按钮新建记录</p>
        </div>
      `;
      return;
    }

    container.innerHTML = currentRecords.map(record => {
      const items = record.record_items || [];
      const time = formatTime(record.created_at);

      return `
        <div class="record-card" data-record-id="${record.id}">
          <div class="record-card-header">
            <span class="time">🕐 ${time}</span>
            <span class="item-count">${items.length} 件商品</span>
          </div>
          <div class="record-items">
            ${items.map(item => `
              <div class="record-item" data-item-id="${item.id}" data-record-id="${record.id}"
                   data-name="${escapeHtml(item.product_name)}" data-quantity="${item.quantity}">
                <span class="product-name">${escapeHtml(item.product_name)}</span>
                <span class="quantity">x${item.quantity}</span>
              </div>
            `).join('')}
            <div class="add-item-row" data-record-id="${record.id}">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              添加商品
            </div>
          </div>
        </div>
      `;
    }).join('');

    // 绑定商品行点击事件（编辑）
    container.querySelectorAll('.record-item').forEach(el => {
      el.addEventListener('click', () => {
        editingItemId = el.dataset.itemId;
        editingRecordId = el.dataset.recordId;
        openEditItemModal(el.dataset.name, el.dataset.quantity);
      });
    });

    // 绑定"添加商品"按钮
    container.querySelectorAll('.add-item-row').forEach(el => {
      el.addEventListener('click', () => {
        editingRecordId = el.dataset.recordId;
        openAddItemModal();
      });
    });
  }

  // 新建记录
  async function createNewRecord() {
    if (!currentCustomerId) return;

    try {
      const today = getTodayStr();
      const record = await db.createRecord(currentCustomerId, today);
      currentRecords.push({ ...record, record_items: [] });
      renderRecordList();
      showToast('新记录已创建');

      // 自动打开添加商品弹窗
      editingRecordId = record.id;
      openAddItemModal();
    } catch (e) {
      console.error('创建记录失败:', e);
      showToast('创建记录失败', true);
    }
  }

  // 打开添加商品弹窗
  function openAddItemModal() {
    document.getElementById('input-product-name').value = '';
    document.getElementById('input-quantity').value = '';
    document.getElementById('modal-add-item').classList.remove('hidden');
    document.getElementById('input-product-name').focus();
  }

  // 打开编辑商品弹窗
  function openEditItemModal(name, quantity) {
    document.getElementById('edit-product-name').value = name;
    document.getElementById('edit-quantity').value = quantity;
    document.getElementById('modal-edit-item').classList.remove('hidden');
  }

  // 确认添加商品
  async function confirmAddItem() {
    const nameInput = document.getElementById('input-product-name');
    const qtyInput = document.getElementById('input-quantity');
    const name = nameInput.value.trim();
    const qty = qtyInput.value;

    if (!name) {
      showToast('请输入商品名称', true);
      return;
    }
    if (!qty || parseFloat(qty) <= 0) {
      showToast('请输入有效数量', true);
      return;
    }

    try {
      await db.addItem(editingRecordId, name, qty);
      showToast('商品已添加');
      document.getElementById('modal-add-item').classList.add('hidden');

      // 重新加载记录
      const today = getTodayStr();
      currentRecords = await db.getRecordsByDate(currentCustomerId, today);
      renderRecordList();

      // 更新客户列表的今日标记
      CustomerManager.loadCustomers();
    } catch (e) {
      console.error('添加商品失败:', e);
      showToast('添加失败', true);
    }
  }

  // 保存编辑
  async function saveEdit() {
    const name = document.getElementById('edit-product-name').value.trim();
    const qty = document.getElementById('edit-quantity').value;

    if (!name) {
      showToast('请输入商品名称', true);
      return;
    }
    if (!qty || parseFloat(qty) <= 0) {
      showToast('请输入有效数量', true);
      return;
    }

    try {
      await db.updateItem(editingItemId, {
        product_name: name,
        quantity: parseFloat(qty)
      });
      showToast('已保存');
      document.getElementById('modal-edit-item').classList.add('hidden');

      const today = getTodayStr();
      currentRecords = await db.getRecordsByDate(currentCustomerId, today);
      renderRecordList();
    } catch (e) {
      console.error('保存失败:', e);
      showToast('保存失败', true);
    }
  }

  // 删除商品
  async function deleteItem() {
    if (!confirm('确定要删除这个商品吗？')) return;

    try {
      await db.deleteItem(editingItemId);
      showToast('已删除');
      document.getElementById('modal-edit-item').classList.add('hidden');

      const today = getTodayStr();
      currentRecords = await db.getRecordsByDate(currentCustomerId, today);
      renderRecordList();
    } catch (e) {
      console.error('删除失败:', e);
      showToast('删除失败', true);
    }
  }

  // 删除客户
  async function deleteCustomer() {
    if (!confirm(`确定要删除客户"${currentCustomerName}"吗？\n该客户的所有记录也会被删除。`)) return;

    try {
      await db.deleteCustomer(currentCustomerId);
      showToast('客户已删除');
      showPage('page-customers');
      CustomerManager.loadCustomers();
    } catch (e) {
      console.error('删除客户失败:', e);
      showToast('删除失败', true);
    }
  }

  // ====== PC 端概览 ======

  // 加载某天的所有记录
  async function loadOverview(dateStr) {
    const container = document.getElementById('overview-content');
    if (!container) return;

    try {
      const records = await db.getAllRecordsByDate(dateStr);
      renderOverview(records, dateStr);
    } catch (e) {
      console.error('加载概览失败:', e);
      container.innerHTML = '<div class="loading">加载失败</div>';
    }
  }

  // 渲染 PC 端概览
  function renderOverview(records, dateStr) {
    const container = document.getElementById('overview-content');
    const today = getTodayStr();
    const isToday = dateStr === today;

    if (records.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="icon">📋</div>
          <p>${isToday ? '今天还没有记录' : formatDate(dateStr) + ' 没有记录'}</p>
        </div>
      `;
      return;
    }

    // 按客户分组
    const grouped = {};
    records.forEach(record => {
      const customerId = record.customer_id;
      const customerName = record.customers?.name || '未知客户';
      if (!grouped[customerId]) {
        grouped[customerId] = {
          name: customerName,
          records: []
        };
      }
      grouped[customerId].records.push(record);
    });

    container.innerHTML = `
      <div class="overview-grid">
        ${Object.entries(grouped).map(([customerId, group]) => `
          <div class="overview-card ${isToday ? 'today' : ''}">
            <div class="overview-card-header">
              <h3>${escapeHtml(group.name)}</h3>
              <span class="time-info">${group.records.length} 次记录</span>
            </div>
            <div class="overview-card-body">
              ${group.records.map(record => {
                const items = record.record_items || [];
                const time = formatTime(record.created_at);
                return items.map(item => `
                  <div class="overview-item"
                       data-item-id="${item.id}" data-record-id="${record.id}"
                       data-name="${escapeHtml(item.product_name)}" data-quantity="${item.quantity}">
                    <span class="product-name">${escapeHtml(item.product_name)}</span>
                    <span class="quantity">x${item.quantity}</span>
                    <span style="margin-left:12px;font-size:12px;color:#5f6368">${time}</span>
                  </div>
                `).join('');
              }).join('')}
            </div>
            <div class="overview-card-footer">
              <button onclick="RecordManager.pcAddItem('${customerId}', '${escapeHtml(group.name)}')">+ 添加商品</button>
            </div>
          </div>
        `).join('')}
      </div>
    `;

    // 绑定点击事件（编辑）
    container.querySelectorAll('.overview-item').forEach(el => {
      el.addEventListener('click', () => {
        editingItemId = el.dataset.itemId;
        editingRecordId = el.dataset.recordId;
        openEditItemModal(el.dataset.name, el.dataset.quantity);
      });
    });
  }

  // PC 端添加商品（找到或创建今天的记录）
  async function pcAddItem(customerId, customerName) {
    try {
      const today = getTodayStr();
      let records = await db.getRecordsByDate(customerId, today);

      let recordId;
      if (records.length > 0) {
        // 使用最新的一条记录
        recordId = records[records.length - 1].id;
      } else {
        // 创建新记录
        const record = await db.createRecord(customerId, today);
        recordId = record.id;
      }

      editingRecordId = recordId;
      openAddItemModal();
    } catch (e) {
      console.error('操作失败:', e);
      showToast('操作失败', true);
    }
  }

  return {
    loadRecords,
    createNewRecord,
    confirmAddItem,
    saveEdit,
    deleteItem,
    deleteCustomer,
    loadOverview,
    pcAddItem,
    openAddItemModal,
    openEditItemModal
  };
})();
