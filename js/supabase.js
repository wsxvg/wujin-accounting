// Supabase 连接配置
// ⚠️ 需要替换为你的 Supabase anon public key（在 Supabase Dashboard → Settings → API 中获取）
const SUPABASE_URL = 'https://vyeimyuwsrvywlolxkye.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ5ZWlteXV3c3J2eXdsb2x4a3llIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODExNjcwMDAsImV4cCI6MjA5Njc0MzAwMH0.qU8Tos1RxqwKADU8Tp9pJna2W4MEZb0_sZ_guQRLHiM';

let supabase = null;

function initSupabase() {
  if (typeof window.supabase !== 'undefined' && window.supabase.createClient) {
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log('Supabase 已连接');
    return true;
  }
  console.error('Supabase SDK 未加载');
  return false;
}

// 通用查询封装
const db = {
  // 获取所有客户
  async getCustomers() {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .order('name');
    if (error) throw error;
    return data || [];
  },

  // 添加客户
  async addCustomer(name, phone = '') {
    const { data, error } = await supabase
      .from('customers')
      .insert({ name: name.trim(), phone: phone.trim() || null })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // 删除客户
  async deleteCustomer(id) {
    // 先删除关联的记录明细
    const { data: records } = await supabase
      .from('records')
      .select('id')
      .eq('customer_id', id);

    if (records && records.length > 0) {
      const recordIds = records.map(r => r.id);
      await supabase.from('record_items').delete().in('record_id', recordIds);
      await supabase.from('records').delete().eq('customer_id', id);
    }

    const { error } = await supabase
      .from('customers')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  // 更新客户
  async updateCustomer(id, updates) {
    const { data, error } = await supabase
      .from('customers')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // 获取某客户某天的记录
  async getRecordsByDate(customerId, dateStr) {
    const { data, error } = await supabase
      .from('records')
      .select(`
        *,
        record_items (*)
      `)
      .eq('customer_id', customerId)
      .eq('record_date', dateStr)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return data || [];
  },

  // 获取某天所有客户的记录（PC 端概览）
  async getAllRecordsByDate(dateStr) {
    const { data, error } = await supabase
      .from('records')
      .select(`
        *,
        record_items (*),
        customers (id, name)
      `)
      .eq('record_date', dateStr)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return data || [];
  },

  // 获取历史记录（按日期范围）
  async getRecordsByDateRange(startDate, endDate) {
    const { data, error } = await supabase
      .from('records')
      .select(`
        *,
        record_items (*),
        customers (id, name)
      `)
      .gte('record_date', startDate)
      .lte('record_date', endDate)
      .order('record_date', { ascending: false })
      .order('created_at', { ascending: true });
    if (error) throw error;
    return data || [];
  },

  // 新建记录
  async createRecord(customerId, dateStr) {
    const { data, error } = await supabase
      .from('records')
      .insert({
        customer_id: customerId,
        record_date: dateStr
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // 删除记录
  async deleteRecord(recordId) {
    await supabase.from('record_items').delete().eq('record_id', recordId);
    const { error } = await supabase
      .from('records')
      .delete()
      .eq('id', recordId);
    if (error) throw error;
  },

  // 添加商品到记录
  async addItem(recordId, productName, quantity) {
    const { data, error } = await supabase
      .from('record_items')
      .insert({
        record_id: recordId,
        product_name: productName.trim(),
        quantity: parseFloat(quantity)
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // 更新商品
  async updateItem(itemId, updates) {
    const { data, error } = await supabase
      .from('record_items')
      .update(updates)
      .eq('id', itemId)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // 删除商品
  async deleteItem(itemId) {
    const { error } = await supabase
      .from('record_items')
      .delete()
      .eq('id', itemId);
    if (error) throw error;
  },

  // 获取今天哪些客户有记录（用于标记客户列表）
  async getTodayActiveCustomerIds() {
    const today = getTodayStr();
    const { data, error } = await supabase
      .from('records')
      .select('customer_id')
      .eq('record_date', today);
    if (error) throw error;
    return [...new Set((data || []).map(r => r.customer_id))];
  }
};

// 工具函数：获取今天的日期字符串
function getTodayStr() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// 工具函数：格式化时间
function formatTime(timestamp) {
  const d = new Date(timestamp);
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

// 工具函数：格式化日期
function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
  return `${d.getMonth() + 1}月${d.getDate()}日 周${weekdays[d.getDay()]}`;
}
