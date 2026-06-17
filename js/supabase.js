// Supabase 连接配置
const SUPABASE_URL = 'https://vyeimyuwsrvywlolxkye.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ5ZWlteXV3c3J2eXdsb2x4a3llIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODExNjcwMDAsImV4cCI6MjA5Njc0MzAwMH0.qU8Tos1RxqwKADU8Tp9pJna2W4MEZb0_sZ_guQRLHiM';

// 使用不同变量名避免与 Supabase SDK 的全局 supabase 变量冲突
let sbClient = null;

function initSupabase() {
  if (typeof window.supabase !== 'undefined' && window.supabase.createClient) {
    sbClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log('Supabase 已连接');
    return true;
  }
  console.error('Supabase SDK 未加载');
  return false;
}

// 通用查询封装
const db = {
  async getCustomers() {
    const { data, error } = await sbClient.from('customers').select('*').order('name');
    if (error) throw error;
    return data || [];
  },

  async addCustomer(name, phone = '') {
    const { data, error } = await sbClient
      .from('customers')
      .insert({ name: name.trim(), phone: phone.trim() || null })
      .select().single();
    if (error) throw error;
    return data;
  },

  async deleteCustomer(id) {
    const { data: records } = await sbClient.from('records').select('id').eq('customer_id', id);
    if (records && records.length > 0) {
      const recordIds = records.map(r => r.id);
      await sbClient.from('record_items').delete().in('record_id', recordIds);
      await sbClient.from('records').delete().eq('customer_id', id);
    }
    const { error } = await sbClient.from('customers').delete().eq('id', id);
    if (error) throw error;
  },

  async updateCustomer(id, updates) {
    const { data, error } = await sbClient
      .from('customers').update(updates).eq('id', id).select().single();
    if (error) throw error;
    return data;
  },

  async getRecordsByDate(customerId, dateStr) {
    const { data, error } = await sbClient
      .from('records')
      .select('*, record_items (*)')
      .eq('customer_id', customerId)
      .eq('record_date', dateStr)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return data || [];
  },

  async getAllRecordsByDate(dateStr) {
    const { data, error } = await sbClient
      .from('records')
      .select('*, record_items (*), customers (id, name)')
      .eq('record_date', dateStr)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return data || [];
  },

  async getRecordsByDateRange(startDate, endDate) {
    const { data, error } = await sbClient
      .from('records')
      .select('*, record_items (*), customers (id, name)')
      .gte('record_date', startDate)
      .lte('record_date', endDate)
      .order('record_date', { ascending: false })
      .order('created_at', { ascending: true });
    if (error) throw error;
    return data || [];
  },

  async createRecord(customerId, dateStr) {
    const { data, error } = await sbClient
      .from('records')
      .insert({ customer_id: customerId, record_date: dateStr })
      .select().single();
    if (error) throw error;
    return data;
  },

  async deleteRecord(recordId) {
    await sbClient.from('record_items').delete().eq('record_id', recordId);
    const { error } = await sbClient.from('records').delete().eq('id', recordId);
    if (error) throw error;
  },

  async addItem(recordId, productName, quantity, unit = '个') {
    const { data, error } = await sbClient
      .from('record_items')
      .insert({ record_id: recordId, product_name: productName.trim(), quantity: parseFloat(quantity), unit: unit })
      .select().single();
    if (error) throw error;
    return data;
  },

  async updateItem(itemId, updates) {
    const { data, error } = await sbClient
      .from('record_items').update(updates).eq('id', itemId).select().single();
    if (error) throw error;
    return data;
  },

  async deleteItem(itemId) {
    const { error } = await sbClient.from('record_items').delete().eq('id', itemId);
    if (error) throw error;
  },

  async getTodayActiveCustomerIds() {
    const today = getTodayStr();
    const { data, error } = await sbClient
      .from('records').select('customer_id').eq('record_date', today);
    if (error) throw error;
    return [...new Set((data || []).map(r => r.customer_id))];
  }
};

// 工具函数
function getTodayStr() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function formatTime(timestamp) {
  const d = new Date(timestamp);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
  return `${d.getMonth() + 1}月${d.getDate()}日 周${weekdays[d.getDay()]}`;
}

// 格式化数量+单位：如 "50个" "3.5公斤"
function formatQty(num, unit) {
  const n = parseFloat(num);
  if (isNaN(n)) return num;
  const qtyStr = n % 1 === 0 ? n.toString() : n.toFixed(1);
  return unit && unit !== '个' ? `${qtyStr}${unit}` : qtyStr;
}
