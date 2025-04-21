#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { program } = require('commander');
const glob = require('glob');

program
  .argument('<routerFile>', 'Path to your router index.js file')
  .action((routerFile) => {
    const absPath = path.resolve(process.cwd(), routerFile);
    if (!fs.existsSync(absPath)) {
      console.error('❌ Router file not found:', absPath);
      process.exit(1);
    }

    const content = fs.readFileSync(absPath, 'utf-8');
    const routesMatch = content.match(/const routes\s*=\s*\[([\s\S]*?)\];/);
    if (!routesMatch) {
      console.log('⚠️ No static routes array found.');
      return;
    }

    try {
      const code = `module.exports = [${routesMatch[1]}];`;
      const tempFile = path.join(__dirname, 'temp_routes.js');
      fs.writeFileSync(tempFile, code, 'utf-8');
      const routes = require(tempFile);
      fs.unlinkSync(tempFile);

      routes.forEach((r) => {
        console.log(`\n📌 Route Name: ${r.name || '-'}\n📍 Path: ${r.path}\n📦 Component: ${r.component}`);
        if (r.meta) {
          console.log('🧩 Meta:', JSON.stringify(r.meta));
        }
      });
    } catch (e) {
      console.error('❌ Failed to parse routes:', e.message);
    }
  });

program.parse();
