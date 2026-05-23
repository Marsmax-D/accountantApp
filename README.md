# 管账人

个人收入记账应用，支持手动记账和微信账单导入。基于 Expo SDK 56 + React Native 0.85，支持 Android、iOS 和 Web。

## 功能

- **收入记录** — 手动添加收入，支持分类、备注、日期
- **微信账单导入** — 支持 CSV / XLSX 微信账单文件导入，自动去重归类
- **分类管理** — 预置系统分类（工资、红包、转账等），支持自定义
- **数据报表** — 按分类、渠道、来源、日期等维度汇总分析
- **暗色模式** — 跟随系统自动切换亮色/暗色主题

## 技术栈

| 类别 | 技术 |
|------|------|
| 框架 | Expo SDK 56, React Native 0.85 |
| 路由 | Expo Router（文件路由） |
| 语言 | TypeScript 6.0 |
| 数据库 | expo-sqlite（本地 SQLite, WAL 模式） |
| 状态管理 | Zustand |
| 图表 | Victory Native |
| 动画 | react-native-reanimated |
| 日期 | date-fns |
| 解析 | papaparse, xlsx |

## 快速开始

```bash
# 安装依赖
npm install

# 启动开发服务器
npm start

# 在 Android 模拟器中运行
npm run android

# 在 iOS 模拟器中运行
npm run ios

# 在浏览器中运行
npm run web
```

## 项目结构

```
src/
├── app/                    # Expo Router 页面
│   ├── (tabs)/             # 四个标签页：首页、账单、报表、设置
│   ├── add-transaction.tsx # 新增/编辑收入（模态）
│   ├── csv-import.tsx      # 微信账单导入（模态）
│   ├── category-manage.tsx # 分类管理（模态）
│   └── report-detail.tsx   # 对比分析（模态）
├── components/             # 可复用组件
├── db/                     # 数据库层（schema、repo、查询）
├── store/                  # Zustand 状态管理
├── types/                  # TypeScript 类型定义
├── utils/                  # 工具函数
├── hooks/                  # 自定义 hooks
└── constants/              # 常量（主题颜色、字体等）
```
