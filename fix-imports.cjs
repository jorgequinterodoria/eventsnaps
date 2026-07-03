const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(fullPath));
    } else if (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx') || fullPath.endsWith('.js')) {
      results.push(fullPath);
    }
  });
  return results;
}

function replaceAliases() {
  const files = walk(srcDir);
  let changedCount = 0;

  files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    const importRegex = /from\s+['"]@\/([^'"]+)['"]/g;
    const dynamicImportRegex = /import\(['"]@\/([^'"]+)['"]\)/g;

    let hasChanges = false;

    // Normal imports
    let newContent = content.replace(importRegex, (match, importPath) => {
      hasChanges = true;
      const targetAbsPath = path.join(srcDir, importPath);
      let relativePath = path.relative(path.dirname(file), targetAbsPath);
      if (!relativePath.startsWith('.')) {
        relativePath = './' + relativePath;
      }
      return `from '${relativePath}'`;
    });

    // Dynamic imports
    newContent = newContent.replace(dynamicImportRegex, (match, importPath) => {
      hasChanges = true;
      const targetAbsPath = path.join(srcDir, importPath);
      let relativePath = path.relative(path.dirname(file), targetAbsPath);
      if (!relativePath.startsWith('.')) {
        relativePath = './' + relativePath;
      }
      return `import('${relativePath}')`;
    });

    if (hasChanges) {
      fs.writeFileSync(file, newContent, 'utf8');
      changedCount++;
    }
  });

  console.log(`Updated imports in ${changedCount} files.`);
}

replaceAliases();
