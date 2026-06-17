# 五金记账 PWA

家庭内部使用的五金记账 PWA 应用。

- **iPhone 端**：妈妈通过语音输入记录客户拿货
- **PC 端**：爸爸查看、编辑和管理记录

## 技术栈

- 纯 HTML/CSS/JS（无框架）
- Supabase（数据库 + 实时同步）
- Web Speech API（语音识别，完全免费）
- PWA（可安装到手机主屏幕）

## 快速开始

### 1. 配置 Supabase

1. 打开 [Supabase Dashboard](https://supabase.com/dashboard/project/vyeimyuwsrvywlolxkye)
2. 点击左侧 **SQL Editor**
3. 粘贴 `supabase-setup.sql` 的内容并执行（创建数据库表）
4. 进入 **Settings → API**，复制 **anon public** key
5. 打开 `js/supabase.js`，将 `YOUR_ANON_KEY_HERE` 替换为你的 anon key

### 2. 生成图标

1. 在浏览器中打开 `generate-icons.html`
2. 点击下载按钮，保存图标到 `icons/` 文件夹

### 3. 本地测试

```bash
# 使用任意 HTTP 服务器
npx serve .
# 或
python -m http.server 8000
```

### 4. 部署到 GitHub Pages

```bash
git init
git add .
git commit -m "feat: 初始化五金记账 PWA"
git remote add origin <your-repo-url>
git push -u origin main
```

然后在 GitHub 仓库 Settings → Pages 中启用 GitHub Pages。

## 使用说明

### iPhone 端（妈妈）

1. 打开应用，看到客户列表
2. 点击搜索栏的麦克风图标，语音搜索客户
3. 点击某个客户进入记录页
4. 点击 + 按钮新建记录
5. 点击麦克风语音输入商品名称
6. 手动输入数量
7. 点击确认添加

### PC 端（爸爸）

1. 打开应用，自动显示今日记录
2. 使用顶部日期选择器查看历史
3. 点击商品行可编辑或删除
4. 点击"管理客户"可添加/删除客户

## 文件结构

```
记账/
├── index.html           # 主页面
├── css/style.css        # 样式
├── js/
│   ├── supabase.js      # 数据库连接
│   ├── voice.js         # 语音识别
│   ├── customer.js      # 客户管理
│   ├── record.js        # 记录管理
│   └── app.js           # 主逻辑
├── manifest.json        # PWA 配置
├── sw.js                # Service Worker
├── supabase-setup.sql   # 数据库初始化脚本
├── generate-icons.html  # 图标生成工具
└── icons/               # PWA 图标
```
