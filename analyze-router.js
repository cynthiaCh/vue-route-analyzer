// analyze-router.js
// 使用方法：node analyze-router.js ./src/router/index.js
const fs = require('fs');
const path = require('path');
const babelParser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const chalk = require('chalk');

// === 参数解析 ===
const args = process.argv.slice(2);
const filePath = args[0];
if (!filePath) {
  console.error(chalk.red('❌ 请提供路由文件路径，例如：node analyze-router-enhanced.js ./src/router/index.js'));
  process.exit(1);
}

let jsonOut = null;
let mdOut = null;
args.forEach((arg, idx) => {
  if (arg === '--json') jsonOut = args[idx + 1];
  if (arg === '--md') mdOut = args[idx + 1];
});

// === 读取并解析 AST ===
const sourceCode = fs.readFileSync(path.resolve(filePath), 'utf-8');
const ast = babelParser.parse(sourceCode, {
  sourceType: 'module',
  plugins: ['jsx', 'dynamicImport'],
});

const routeItems = [];

function extractRoutes(node) {
  if (node.type === 'ArrayExpression') {
    node.elements.forEach((element) => {
      if (element.type === 'ObjectExpression') {
        const route = {};
        element.properties.forEach((prop) => {
          const key = prop.key.name || prop.key.value;
          if (key === 'path' || key === 'name') {
            route[key] = prop.value.value;
          } else if (key === 'component') {
            if (prop.value.type === 'ArrowFunctionExpression') {
              const { body } = prop.value;
              if (
                body.type === 'CallExpression'
                && body.callee.type === 'Import'
                && body.arguments.length > 0
                && body.arguments[0].type === 'StringLiteral'
              ) {
                route.component = body.arguments[0].value;
              } else {
                route.component = 'dynamic';
              }
            } else if (prop.value.type === 'Identifier') {
              route.component = prop.value.name;
            }
          } else if (key === 'meta') {
            route.meta = {};
            prop.value.properties.forEach((metaProp) => {
              const metaKey = metaProp.key.name || metaProp.key.value;
              route.meta[metaKey] = metaProp.value.type === 'BooleanLiteral'
                ? metaProp.value.value
                : metaProp.value.value || 'true';
            });
          } else if (key === 'props') {
            route.props = true;
          }
        });
        routeItems.push(route);

        const children = element.properties.find((p) => p.key.name === 'children');
        if (children && children.value.type === 'ArrayExpression') {
          extractRoutes(children.value);
        }
      }
    });
  }
}

traverse(ast, {
  VariableDeclarator(path) {
    if (path.node.id.name === 'routes') {
      extractRoutes(path.node.init);
    }
  },
});

// === 分析结构 ===
const summary = {
  total: routeItems.length,
  named: 0,
  unnamed: 0,
  withKeepAlive: 0,
  dynamicComponent: 0,
  hasProps: 0,
  flags: [],
  nameCountMap: {},
  prefixMap: {},
  componentMap: {},
  typeMap: {
    list: [],
    detail: [],
    edit: [],
    add: [],
    view: [],
  },
};

// === 分析逻辑 ===
routeItems.forEach((r) => {
  if (r.name) {
    summary.named++;
    summary.nameCountMap[r.name] = (summary.nameCountMap[r.name] || 0) + 1;
  } else {
    summary.unnamed++;
  }

  if (r.meta?.keepAlive) summary.withKeepAlive++;
  if (r.meta?.flag) summary.flags.push({ path: r.path, flag: r.meta.flag });
  if (r.component === 'dynamic') summary.dynamicComponent++;
  if (r.props) summary.hasProps++;

  if (r.component && r.component !== 'dynamic') {
    summary.componentMap[r.component] = summary.componentMap[r.component] + 1 || 1;
  }

  const prefix = r.path?.split('/')?.[1] || '/';
  summary.prefixMap[prefix] = (summary.prefixMap[prefix] || 0) + 1;

  const lcPath = r.path?.toLowerCase() || '';
  Object.keys(summary.typeMap).forEach((key) => {
    if (lcPath.includes(key)) {
      summary.typeMap[key].push(r.path);
    }
  });
});

// === 控制台输出 ===
const printSummary = () => {
  console.log(chalk.green('\n📦 路由资产分析'));
  console.log(`├─ 总路由数量：${summary.total}`);
  console.log(`├─ 命名路由：${summary.named}`);
  console.log(`├─ 未命名路由：${summary.unnamed}`);
  console.log(`├─ 含 keepAlive：${summary.withKeepAlive}`);
  console.log(`├─ 动态组件（无路径）：${summary.dynamicComponent}`);
  console.log(`├─ 含 props 配置：${summary.hasProps}`);

  console.log('├─ 重复 name：');
  Object.entries(summary.nameCountMap).forEach(([name, count]) => {
    if (count > 1) console.log(`│    ⚠️  ${name} (${count} 次)`);
  });

  console.log('├─ 路径前缀统计：');
  Object.entries(summary.prefixMap).forEach(([prefix, count]) => {
    console.log(`│    /${prefix} - ${count} 个`);
  });

  if (summary.flags.length) {
    console.log('├─ 含 flag 页：');
    summary.flags.forEach(({ path, flag }) => {
      console.log(`│    ${path}  => flag=${flag}`);
    });
  }

  console.log('├─ 引用重复组件路径：');
  Object.entries(summary.componentMap).forEach(([comp, count]) => {
    if (count > 1) {
      console.log(`│    ⚠️  ${comp} 被 ${count} 个路由复用`);
    }
  });

  console.log('├─ 页面类型识别（基于路径关键字）：');
  Object.entries(summary.typeMap).forEach(([type, list]) => {
    console.log(`│    ${type} 页面：${list.length} 个`);
    list.forEach((p) => console.log(`│      - ${p}`));
  });

  console.log(chalk.green('\n✅ 分析完成\n'));
};

// === JSON 输出 ===
if (jsonOut) {
  const output = {
    summary,
    routeItems,
  };
  fs.writeFileSync(path.resolve(jsonOut), JSON.stringify(output, null, 2), 'utf-8');
  console.log(chalk.cyan(`📄 已导出 JSON 分析报告至 ${jsonOut}`));
}

// === Markdown 输出 ===
if (mdOut) {
  let md = '# 📦 路由资产分析报告\n\n';

  md += `- 总路由数量：${summary.total}\n`;
  md += `- 命名路由：${summary.named}\n`;
  md += `- 未命名路由：${summary.unnamed}\n`;
  md += `- 含 keepAlive：${summary.withKeepAlive}\n`;
  md += `- 动态组件（无路径）：${summary.dynamicComponent}\n`;
  md += `- 含 props 配置：${summary.hasProps}\n\n`;

  md += '## ⚠️ 重复 name\n';
  Object.entries(summary.nameCountMap).forEach(([name, count]) => {
    if (count > 1) md += `- \`${name}\` (${count} 次)\n`;
  });

  md += '\n## 📁 路径前缀分布\n';
  Object.entries(summary.prefixMap).forEach(([prefix, count]) => {
    md += `- \`/${prefix}\`：${count} 个\n`;
  });

  if (summary.flags.length) {
    md += '\n## 🚩 含 flag 页面\n';
    summary.flags.forEach(({ path, flag }) => {
      md += `- \`${path}\` => flag=${flag}\n`;
    });
  }

  md += '\n## ♻️ 组件复用统计\n';
  Object.entries(summary.componentMap).forEach(([comp, count]) => {
    if (count > 1) {
      md += `- \`${comp}\` 被 ${count} 个路由复用\n`;
    }
  });

  md += '\n## 🧩 页面类型统计\n';
  Object.entries(summary.typeMap).forEach(([type, list]) => {
    md += `### ${type} 页面（${list.length} 个）\n`;
    list.forEach((p) => md += `- ${p}\n`);
    md += '\n';
  });

  fs.writeFileSync(path.resolve(mdOut), md, 'utf-8');
  console.log(chalk.cyan(`📄 已导出 Markdown 分析报告至 ${mdOut}`));
}

// 默认打印
if (!jsonOut && !mdOut) {
  printSummary();
}
