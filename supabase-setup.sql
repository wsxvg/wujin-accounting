-- ============================================
-- 五金记账 PWA - Supabase 数据库初始化脚本
-- ============================================
-- 使用方法：
-- 1. 打开 Supabase Dashboard: https://supabase.com/dashboard/project/vyeimyuwsrvywlolxkye
-- 2. 点击左侧 "SQL Editor"
-- 3. 粘贴此文件内容并执行
-- ============================================

-- 先删除已存在的表（如果之前创建失败过）
DROP TABLE IF EXISTS record_items CASCADE;
DROP TABLE IF EXISTS records CASCADE;
DROP TABLE IF EXISTS customers CASCADE;

-- 创建客户表
CREATE TABLE customers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建记录表（使用 record_date 避免与 SQL 保留字 date 冲突）
CREATE TABLE records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  record_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建记录明细表
CREATE TABLE record_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  record_id UUID NOT NULL REFERENCES records(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  quantity NUMERIC NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建索引（提升查询性能）
CREATE INDEX idx_records_customer_date ON records(customer_id, record_date);
CREATE INDEX idx_records_date ON records(record_date);
CREATE INDEX idx_record_items_record ON record_items(record_id);

-- 创建 updated_at 自动更新触发器
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_records_updated_at
  BEFORE UPDATE ON records
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- RLS（行级安全）策略
-- 因为是家庭内部应用，无需登录，所以允许匿名访问
-- ============================================

-- 启用 RLS
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE records ENABLE ROW LEVEL SECURITY;
ALTER TABLE record_items ENABLE ROW LEVEL SECURITY;

-- 允许匿名用户完全访问（因为是私人家庭应用）
CREATE POLICY "Allow anonymous access on customers" ON customers
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow anonymous access on records" ON records
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow anonymous access on record_items" ON record_items
  FOR ALL USING (true) WITH CHECK (true);

-- 启用实时订阅（用于 PC 端实时更新）
ALTER PUBLICATION supabase_realtime ADD TABLE records;
ALTER PUBLICATION supabase_realtime ADD TABLE record_items;
