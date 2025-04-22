# 📦 vue-route-analyzer

一个 Vue 路由资产分析工具，用于对 Vue Router 配置文件进行静态分析，自动识别页面类型、组件复用情况、重复命名、meta 配置、路径分布等信息，并可导出为结构化 JSON 和 Markdown 格式的报告。

> 🔍 适用于 Vue 2 + Vue-Router 的项目，基于 AST 解析，无需运行项目即可静态分析路由资产。

## ✨ 特性
功能模块 | 描述
✅ 路由基本信息统计 | 路由总数、命名路由、未命名路由、keepAlive 数量等
✅ 动态导入组件识别 | 精准提取 () => import('...') 中的真实路径
✅ 组件复用分析 | 找出哪些路由复用了相同组件
✅ 页面类型归类 | 自动归类为 list / detail / add / edit / view 页面
✅ 重复 name 检测 | 找出命名冲突的路由
✅ meta.flag 检出 | 标记含特殊标识页面（如详情页类型）
✅ 路径前缀分布统计 | 如 /procurement、/plan、/announcement 等
✅ 报告导出 | 支持导出为 JSON 和 Markdown

## 📦 安装依赖

```bash
npm install @babel/parser @babel/traverse chalk
```

## Usage

```bash
在项目根目录运行：
node analyze-router.js ./src/router/index.js
node analyze-router.js ./src/router/index.js --json router-report.json
node analyze-router.js ./src/router/index.js --md router-report.md
```

## Output Example

```
📦 路由资产分析
├─ 总路由数量：134
├─ 命名路由：120
├─ 未命名路由：14
├─ 含 keepAlive：67
├─ 动态组件：45
├─ 含 props 配置：20
├─ 重复 name：
│    ⚠️  myPlan (2 次)
├─ 路径前缀统计：
│    /plan - 22 个
│    /market - 17 个
├─ 含 flag 页：
│    /app/detail => flag=4

✅ 分析完成

```

## TODO
支持目录结构可视化（HTML/Graph 输出）
统计各组件引用频次
---

🙋‍♀️ 作者 Author
Created with ☕ by 喝拿铁的桔子
GitHub: @cynthiaCh
如果你喜欢这个项目，欢迎 Star ⭐ 支持

Created with ☕ by [喝拿铁的桔子](https://juejin.cn/user/3526889032395613)
