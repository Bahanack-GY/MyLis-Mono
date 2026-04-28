import fs from 'fs';
import path from 'path';

const dts = fs.readFileSync('node_modules/hugeicons-react/dist/hugeicons-react.d.ts', 'utf8');
const exportsMatch = dts.match(/export \{([\s\S]+?)\};/);
const exportedIcons = new Set(exportsMatch[1].split(',').map(s => s.trim()).filter(Boolean));

const missingIcons = new Set();

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    if (isDirectory) {
      walkDir(dirPath, callback);
    } else if (dirPath.endsWith('.tsx') || dirPath.endsWith('.ts')) {
      callback(path.join(dirPath));
    }
  });
}

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  const importRegex = /import\s+\{([^}]+)\}\s+from\s+['"]hugeicons-react['"];?/g;
  let match;
  while ((match = importRegex.exec(content)) !== null) {
    const iconListStr = match[1];
    const icons = iconListStr.split(',').map(s => s.trim()).filter(Boolean);
    for (let iconItem of icons) {
      // Parse possible alias: e.g. "File01Icon as FileIcon" or just "File01Icon"
      // the exported name is the first part
      const exportedName = iconItem.split(' as ')[0].trim();
      if (!exportedIcons.has(exportedName)) {
        missingIcons.add(exportedName);
      }
    }
  }
}

walkDir('./src', processFile);

console.log('Missing icons used in src/:', Array.from(missingIcons));
