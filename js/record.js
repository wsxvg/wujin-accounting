// 记录管理模块

const RecordManager = (() => {
  let currentCustomerId = null;
  let currentCustomerName = '';
  let currentRecords = [];
  let editingItemId = null;
  let editingRecordId = null;

  // ====== 批量录入（staging）状态 ======
  let isStaging = false;
  let stagingItems = [];
  let editingStagingIndex = -1;

  // 加载某客户的今日记录
  async function loadRecords(customerId, customerName) {
    currentCustomerId = customerId;
    currentCustomerName = customerName;
    document.getElementById('record-customer-name').textContent = customerName;

    // 退出 staging 模式
    if (isStaging) exitStagingMode();

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
                   data-name="${escapeHtml(item.product_name)}" data-quantity="${item.quantity}" data-unit="${item.unit || '个'}">
                <span class="product-name">${escapeHtml(item.product_name)}</span>
                <span class="quantity">${formatQty(item.quantity, item.unit)}</span>
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
        openEditItemModal(el.dataset.name, el.dataset.quantity, el.dataset.unit);
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

  // ====== 批量录入模式 ======

  // 进入 staging 模式（点"新建记录"）
  function createNewRecord() {
    if (!currentCustomerId) return;
    isStaging = true;
    stagingItems = [];

    document.getElementById('record-list').classList.add('hidden');
    document.getElementById('btn-new-record').classList.add('hidden');
    document.getElementById('staging-area').classList.remove('hidden');

    renderStagingList();
  }

  // 退出 staging 模式
  function exitStagingMode() {
    isStaging = false;
    stagingItems = [];
    editingStagingIndex = -1;

    document.getElementById('staging-area')?.classList.add('hidden');
    document.getElementById('record-list')?.classList.remove('hidden');
    document.getElementById('btn-new-record')?.classList.remove('hidden');
  }

  // 渲染 staging 列表
  function renderStagingList() {
    const container = document.getElementById('staging-list');
    const countEl = document.getElementById('staging-count');
    if (!container) return;

    if (countEl) countEl.textContent = `${stagingItems.length} 件商品`;

    if (stagingItems.length === 0) {
      container.innerHTML = `
        <div class="staging-empty">
          <div class="icon">📝</div>
          <p>还没有添加商品</p>
          <p style="font-size:13px;color:var(--text-muted);margin-top:4px">点击下方按钮添加</p>
        </div>
      `;
      return;
    }

    container.innerHTML = stagingItems.map((item, i) => `
      <div class="staging-item" data-index="${i}">
        <div class="staging-item-info">
          <span class="staging-item-name">${escapeHtml(item.name)}</span>
          <span class="staging-item-qty">${formatQty(item.quantity, item.unit)}</span>
        </div>
        <button class="staging-remove" data-index="${i}" aria-label="删除">✕</button>
      </div>
    `).join('');

    // 点击编辑
    container.querySelectorAll('.staging-item').forEach(el => {
      el.addEventListener('click', (e) => {
        if (e.target.closest('.staging-remove')) return;
        const idx = parseInt(el.dataset.index);
        editingStagingIndex = idx;
        const item = stagingItems[idx];
        openEditItemModal(item.name, item.quantity, item.unit);
      });
    });

    // 点击删除
    container.querySelectorAll('.staging-remove').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        stagingItems.splice(parseInt(btn.dataset.index), 1);
        renderStagingList();
      });
    });
  }

  // staging 模式下添加商品
  function addStagingItem() {
    editingRecordId = null;
    openAddItemModal();
  }

  // 确认创建记录（批量保存）
  async function confirmNewRecord() {
    if (stagingItems.length === 0) {
      showToast('请先添加商品', true);
      return;
    }

    try {
      const today = getTodayStr();
      const record = await db.createRecord(currentCustomerId, today);

      for (const item of stagingItems) {
        await db.addItem(record.id, item.name, item.quantity, item.unit);
      }

      showToast(`记录已创建，共 ${stagingItems.length} 件商品`);
      exitStagingMode();

      currentRecords = await db.getRecordsByDate(currentCustomerId, today);
      renderRecordList();
      CustomerManager.loadCustomers();
    } catch (e) {
      console.error('创建记录失败:', e);
      showToast('创建失败', true);
    }
  }

  // 取消新建记录
  function cancelNewRecord() {
    if (stagingItems.length > 0 && !confirm('有未保存的商品，确定要放弃吗？')) return;
    exitStagingMode();
    showToast('已取消');
  }

  // 返回按钮处理
  function handleBack() {
    if (isStaging) {
      cancelNewRecord();
    } else {
      showPage('page-customers');
    }
  }

  // ====== 弹窗操作 ======

  // 打开添加商品弹窗
  function openAddItemModal() {
    document.getElementById('input-product-name').value = '';
    document.getElementById('input-quantity').value = '';
    document.querySelectorAll('#input-unit-selector .unit-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.unit === '个');
    });
    const customInput = document.getElementById('input-unit-custom');
    if (customInput) customInput.value = '';
    document.getElementById('modal-add-item').classList.remove('hidden');
    document.getElementById('input-product-name').focus();
  }

  // 打开编辑商品弹窗
  function openEditItemModal(name, quantity, unit) {
    document.getElementById('edit-product-name').value = name;
    document.getElementById('edit-quantity').value = quantity;
    const effectiveUnit = unit || '个';
    const presetUnits = ['个', '公斤', '米', '箱'];
    const isPreset = presetUnits.includes(effectiveUnit);
    document.querySelectorAll('#edit-unit-selector .unit-btn').forEach(btn => {
      btn.classList.toggle('active', isPreset && btn.dataset.unit === effectiveUnit);
    });
    const customInput = document.getElementById('edit-unit-custom');
    if (customInput) customInput.value = isPreset ? '' : effectiveUnit;
    document.getElementById('modal-edit-item').classList.remove('hidden');
  }

  // 确认添加商品
  async function confirmAddItem() {
    const name = document.getElementById('input-product-name').value.trim();
    const qty = document.getElementById('input-quantity').value;
    const customUnit = document.getElementById('input-unit-custom')?.value.trim();
    const unit = customUnit || document.querySelector('#input-unit-selector .unit-btn.active')?.dataset.unit || '个';

    if (!name) { showToast('请输入商品名称', true); return; }
    if (!qty || parseFloat(qty) <= 0) { showToast('请输入有效数量', true); return; }

    // staging 模式：添加到本地列表
    if (isStaging) {
      stagingItems.push({ name, quantity: parseFloat(qty), unit });
      renderStagingList();
      showToast(`已添加：${name}`);
      closeModal('modal-add-item');
      return;
    }

    // DB 模式：写入数据库
    try {
      await db.addItem(editingRecordId, name, qty, unit);
      showToast('商品已添加');
      closeModal('modal-add-item');

      const today = getTodayStr();
      currentRecords = await db.getRecordsByDate(currentCustomerId, today);
      renderRecordList();
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

    if (!name) { showToast('请输入商品名称', true); return; }
    if (!qty || parseFloat(qty) <= 0) { showToast('请输入有效数量', true); return; }

    const customUnit = document.getElementById('edit-unit-custom')?.value.trim();
    const unit = customUnit || document.querySelector('#edit-unit-selector .unit-btn.active')?.dataset.unit || '个';

    // staging 模式：更新本地列表
    if (isStaging && editingStagingIndex >= 0) {
      stagingItems[editingStagingIndex] = { name, quantity: parseFloat(qty), unit };
      editingStagingIndex = -1;
      renderStagingList();
      showToast('已更新');
      closeModal('modal-edit-item');
      return;
    }

    // DB 模式
    try {
      await db.updateItem(editingItemId, {
        product_name: name,
        quantity: parseFloat(qty),
        unit: unit
      });
      showToast('已保存');
      closeModal('modal-edit-item');

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

    // staging 模式：从本地列表移除
    if (isStaging && editingStagingIndex >= 0) {
      stagingItems.splice(editingStagingIndex, 1);
      editingStagingIndex = -1;
      renderStagingList();
      showToast('已删除');
      closeModal('modal-edit-item');
      return;
    }

    // DB 模式
    try {
      await db.deleteItem(editingItemId);
      showToast('已删除');
      closeModal('modal-edit-item');

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

  function renderOverview(records, dateStr) {
    const container = document.getElementById('overview-content');
    const today = getTodayStr();
    const isToday = dateStr === today;
    const dateLabel = isToday ? '今天' : formatDate(dateStr);

    const totalItems = records.reduce((sum, r) => sum + (r.record_items?.length || 0), 0);
    const customerCount = new Set(records.map(r => r.customer_id)).size;

    if (records.length === 0) {
      container.innerHTML = `
        <div class="overview-date-header">
          <h2>${dateLabel}</h2>
        </div>
        <div class="pc-empty">
          <div class="icon">📦</div>
          <h3>${isToday ? '今天还没有记录' : dateLabel + '没有记录'}</h3>
          <p>${isToday ? '等待手机端录入数据，或点击右上角管理客户' : '切换其他日期查看'}</p>
        </div>
      `;
      return;
    }

    const grouped = {};
    records.forEach(record => {
      const customerId = record.customer_id;
      const customerName = record.customers?.name || '未知客户';
      if (!grouped[customerId]) {
        grouped[customerId] = { name: customerName, records: [] };
      }
      grouped[customerId].records.push(record);
    });

    container.innerHTML = `
      <div class="overview-date-header">
        <h2>${dateLabel}</h2>
        <span class="record-count">${customerCount} 位客户 · ${totalItems} 件商品</span>
      </div>
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
                       data-name="${escapeHtml(item.product_name)}" data-quantity="${item.quantity}" data-unit="${item.unit || '个'}">
                    <span class="product-name">${escapeHtml(item.product_name)}</span>
                    <span class="quantity">${formatQty(item.quantity, item.unit)}</span>
                    <span style="margin-left:12px;font-size:12px;color:var(--text-muted)">${time}</span>
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

    container.querySelectorAll('.overview-item').forEach(el => {
      el.addEventListener('click', () => {
        editingItemId = el.dataset.itemId;
        editingRecordId = el.dataset.recordId;
        openEditItemModal(el.dataset.name, el.dataset.quantity, el.dataset.unit);
      });
    });
  }

  async function pcAddItem(customerId, customerName) {
    try {
      const today = getTodayStr();
      let records = await db.getRecordsByDate(customerId, today);

      let recordId;
      if (records.length > 0) {
        recordId = records[records.length - 1].id;
      } else {
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
    confirmNewRecord,
    cancelNewRecord,
    addStagingItem,
    handleBack,
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
