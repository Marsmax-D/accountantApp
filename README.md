# 管账人

个人收支记账应用，支持手动记账、微信账单导入、数据报表和家庭共享。基于 Expo SDK 56 + React Native 0.85，支持 Android、iOS 和 Web。

## 功能

- 💰 **收支记录** — 手动添加收入/支出，支持金额、分类、日期、备注，可编辑和删除
- 📊 **账单列表** — 按日期分组展示所有收支，支持筛选（收入/支出/全部）、关键词搜索、下拉刷新、无限滚动
- 📂 **分类管理** — 16 个系统预置分类（8 收入 + 8 支出），支持自定义分类，区分线上/线下渠道
- 📥 **微信账单导入** — 支持 CSV / XLSX 微信账单文件导入，自动检测编码（UTF-8/GBK），智能去重归类
- 📈 **数据报表** — 按月/季/年查看收支趋势柱状图，支持左右滑动切换周期，点击柱子查看明细
- 🏠 **仪表盘** — 今日收支总览（净收入卡片），本月收支明细（收入/支出占比、金额统计），最近 6 条记录快速查看
- 🔄 **对比分析** — 不同时期数据对比，展示环比变化率
- 👨‍👩‍👧 **家庭共享** — 创建或加入家庭，多设备数据自动同步，家庭成员即时共享
- ☁️ **云端同步** — 基于 Supabase 的自动同步引擎（操作队列 + 增量拉取 + Realtime 订阅）
- 🌙 **暗色模式** — 跟随系统自动切换亮色/暗色主题
- 🌐 **Web 适配** — 浏览器端完整体验，响应式布局

## 下载

最新版本：**[v1.0.0](https://github.com/Marsmax-D/accountantApp/releases/tag/v1.0.0)**

[![Release](https://img.shields.io/github/v/release/Marsmax-D/accountantApp?style=flat-square)](https://github.com/Marsmax-D/accountantApp/releases)

### Android APK 下载

| 架构 | 文件 | 适用设备 |
|------|------|----------|
| arm64-v8a | [app-arm64-v8a-release.apk](https://github.com/Marsmax-D/accountantApp/releases/download/v1.0.0/app-arm64-v8a-release.apk) | 现代 Android 手机（推荐） |
| armeabi-v7a | [app-armeabi-v7a-release.apk](https://github.com/Marsmax-D/accountantApp/releases/download/v1.0.0/app-armeabi-v7a-release.apk) | 旧款 Android 手机 |
| universal | [app-universal-release.apk](https://github.com/Marsmax-D/accountantApp/releases/download/v1.0.0/app-universal-release.apk) | 全架构（体积较大） |

> 📱 iOS 用户请使用源码本地构建，或等待 App Store 上架。

## 技术栈

| 类别 | 技术 |
|------|------|
| 框架 | Expo SDK 56, React Native 0.85 |
| 路由 | Expo Router（文件路由，typedRoutes 自动类型生成） |
| 语言 | TypeScript 6.0, strict 模式 |
| 数据库 | expo-sqlite（本地 SQLite, WAL 模式） |
| 状态管理 | Zustand |
| 图表 | Victory Native (react-native-svg) |
| 动画 | react-native-reanimated, react-native-worklets |
| 手势 | react-native-gesture-handler, PanResponder |
| 日期 | date-fns |
| 文件解析 | papaparse（CSV）, xlsx（XLSX） |
| 云端同步 | Supabase（PostgreSQL + Realtime 订阅） |
| 构建 | React Compiler（实验性） |

## 快速开始

```bash
# 安装依赖
npm install

# 启动开发服务器（Web）
npm start

# Android（需要连接设备或模拟器）
npm run android

# iOS（需要 macOS + Xcode）
npm run ios

# Web 浏览器预览
npm run web
```

> 首次启动后访问 `http://localhost:8081` 即可在浏览器中预览。

## 项目结构

```
src/
├── app/                     # Expo Router 页面
│   ├── _layout.tsx          # 根布局（SQLiteProvider + SyncProvider + Stack）
│   ├── (tabs)/
│   │   ├── _layout.tsx      # 原生 Tab 栏（含 Tab 图标弹跳动画）
│   │   ├── _layout.web.tsx  # Web Tab 栏（胶囊式悬浮）
│   │   ├── index.tsx        # 首页仪表盘（同步后自动刷新）
│   │   ├── transactions.tsx # 账单列表（筛选/搜索/无限滚动，同步后自动刷新）
│   │   ├── reports.tsx      # 数据报表（滑动切换 + 柱状图 + 分类明细）
│   │   ├── family.tsx       # 家庭管理（创建/加入/成员列表）
│   │   └── settings.tsx     # 设置（Ionicons 图标、分组卡片、暗色适配）
│   ├── add-transaction.tsx  # 新增/编辑收入/支出（保存后即时推送云端）
│   ├── csv-import.tsx       # 微信账单导入（导入后即时推送云端）
│   ├── category-manage.tsx  # 分类管理（模态）
│   └── report-detail.tsx    # 对比分析（模态）
├── components/
│   ├── common/              # 通用组件（FAB、EmptyState、CategoryPicker、ConfirmDialog、SegmentedControl）
│   ├── dashboard/           # 仪表盘组件（收支卡片、渠道拆分、最近记录）
│   ├── reports/             # 报表组件（周期选择器、柱状图、分类明细、对比视图、饼图）
│   ├── transactions/        # 账单组件（筛选栏）
│   ├── family/              # 家庭组件（创建表单、加入表单、家庭详情）
│   └── ui/                  # 基础 UI（collapsible）
├── db/                      # 数据库层
│   ├── schema.ts            # 建表 SQL + 系统分类预置 + 报表查询语句
│   ├── database.ts          # 数据库初始化 + 迁移（含同步字段）
│   ├── transaction-repo.ts  # 交易 CRUD（筛选、搜索、分页）
│   ├── category-repo.ts     # 分类 CRUD
│   └── report-queries.ts    # 聚合查询
├── store/                   # Zustand 状态管理
│   ├── use-ui-store.ts      # 报表类型、筛选条件、搜索词
│   └── use-family-store.ts  # 家庭状态（syncVersion 驱动 UI 刷新）
├── supabase/                # 云端数据库
│   └── client.ts            # Supabase 客户端初始化
├── sync/                    # 同步引擎
│   ├── SyncProvider.tsx     # 全局同步 Provider（每 20 秒自动同步 + Realtime 订阅）
│   ├── sync-engine.ts       # 同步核心（pushChanges/pullChanges/fullSync/家庭 CRUD）
│   └── realtime.ts          # Supabase Realtime 订阅（sync_journal 变更通知）
├── types/                   # TypeScript 类型
│   ├── transaction.ts
│   ├── csv.ts
│   └── report.ts
├── utils/                   # 工具函数
│   ├── format.ts            # 货币/日期格式化（人民币、相对日期、百分比）
│   ├── date-utils.ts        # 日期范围计算（月/季/年）
│   ├── dedup.ts             # 微信账单去重 + 自动归类
│   ├── uuid.ts              # UUID 生成 + 邀请码生成
│   ├── wechat-csv-parser.ts # CSV 解析器（自动编码检测）
│   └── wechat-xlsx-parser.ts# XLSX 解析器
├── hooks/                   # 自定义 hooks（主题、颜色方案）
├── constants/               # 主题常量（颜色、字体、间距）
└── global.css               # Web 端 CSS 字体变量
```

## 数据库设计

### categories 表

| 字段 | 说明 |
|------|------|
| id 1-8 | 系统预置收入分类，不可删除 |
| id 9-16 | 系统预置支出分类（餐饮、交通、购物、住房、娱乐、医疗、教育、其他支出） |
| channel | online / offline，线下收入仅"现金收入" |
| source | wechat / manual / both |

### transactions 表

- `order_id` 唯一索引（部分索引），用于微信导入去重
- 支持 `type = 'income'`（收入）和 `type = 'expense'`（支出）两种类型

## 微信账单导入流程

1. DocumentPicker 选择 CSV / XLSX 文件
2. 自动检测编码（UTF-8 / GBK），papaparse / xlsx 解析
3. 仅提取"收入"类型记录
4. `order_id` 去重（先查询已有集合，跳过重复）
5. 按交易类型自动归类（红包→id=4, 转账→id=3, 商户收款→id=5, 其他→id=8）
6. 逐条插入，order_id 重复异常静默跳过

## 同步架构

多设备家庭成员间的数据同步基于 Supabase，采用操作队列 + 增量拉取 + Realtime 订阅方案：

1. **本地修改** → 写入 `sync_operations` 队列，标记 `sync_status = 'pending'`
2. **推送** → `pushChanges()` 每 20 秒消费队列，通过 Supabase REST API upsert 到云端表
3. **日志** → PostgreSQL 触发器自动记录变更到 `sync_journal`
4. **通知** → 其他设备通过 Supabase Realtime 订阅 `sync_journal` INSERT，收到后立即触发拉取
5. **拉取** → `pullChanges()` 基于 `sync_journal.id` 游标增量拉取，更新本地数据库
6. **UI 刷新** → `syncVersion` 递增通知各页面重新查询数据

组件位置：`src/sync/` — SyncProvider（全局周期同步）、sync-engine（推送/拉取/家庭 CRUD）、realtime（订阅）

## Supabase 配置

如需使用云端同步功能，需要：

1. 在 [Supabase](https://supabase.com) 创建项目
2. 复制 `supabase-setup.sql` 中的 SQL 到 Supabase SQL Editor 执行（创建表、触发器等）
3. 在项目根目录创建 `.env.local` 文件：

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## License

MIT
