// analyze-router.js
// 使用方法：node analyze-router.js ./src/router/index.js
const fs = require('fs');
const path = require('path');
const babelParser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const chalk = require('chalk');

const filePath = process.argv[2];
if (!filePath) {
  console.error(chalk.red('❌ 请提供路由文件路径，例如：node analyze-router.js ./src/router/index.js'));
  process.exit(1);
}

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
              route.component = 'dynamic';
            } else if (prop.value.type === 'Identifier') {
              route.component = prop.value.name;
            }
          } else if (key === 'meta') {
            route.meta = {};
            prop.value.properties.forEach((metaProp) => {
              const metaKey = metaProp.key.name || metaProp.key.value;
              route.meta[metaKey] =
                metaProp.value.type === 'BooleanLiteral'
                  ? metaProp.value.value
                  : metaProp.value.value || 'true';
            });
          } else if (key === 'props') {
            route.props = true;
          }
        });
        routeItems.push(route);

        // 递归处理 children
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

// 分析数据结构
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

// 主动统计
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

  // component 使用统计
  if (r.component && r.component !== 'dynamic') {
    summary.componentMap[r.component] = summary.componentMap[r.component] + 1 || 1;
  }

  // 路径前缀
  const prefix = r.path?.split('/')?.[1] || '/';
  summary.prefixMap[prefix] = (summary.prefixMap[prefix] || 0) + 1;

  // 类型路径关键词识别
  const lcPath = r.path?.toLowerCase() || '';
  Object.keys(summary.typeMap).forEach((key) => {
    if (lcPath.includes(key)) {
      summary.typeMap[key].push(r.path);
    }
  });
});

// 输出结果
console.log(chalk.green('\n📦 路由资产分析'));
console.log(`├─ 总路由数量：${summary.total}`);
console.log(`├─ 命名路由：${summary.named}`);
console.log(`├─ 未命名路由：${summary.unnamed}`);
console.log(`├─ 含 keepAlive：${summary.withKeepAlive}`);
console.log(`├─ 动态组件：${summary.dynamicComponent}`);
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

console.log('├─ 引用重复组件：');
Object.entries(summary.componentMap).forEach(([comp, count]) => {
  if (count > 1) {
    console.log(`│    ⚠️  ${comp} 被 ${count} 个路由复用`);
  }
});

console.log('├─ 页面类型识别：');
Object.entries(summary.typeMap).forEach(([type, list]) => {
  console.log(`│    ${type} 页面：${list.length} 个`);
  list.forEach((p) => {
    console.log(`│      - ${p}`);
  });
});

console.log(chalk.green('\n✅ 分析完成\n'));
