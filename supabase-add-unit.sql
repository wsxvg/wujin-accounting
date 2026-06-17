-- 添加商品单位字段（默认"个"）
ALTER TABLE record_items ADD COLUMN IF NOT EXISTS unit TEXT NOT NULL DEFAULT '个';
