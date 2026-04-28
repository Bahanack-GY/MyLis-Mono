import fs from 'fs';
import path from 'path';

const map = {
  "GraduationCapIcon": "GraduationScrollIcon",
  "HoldCoinIcon": "Money01Icon",
  "ScaleIcon": "JusticeScale01Icon",
  "Truck01Icon": "DeliveryTruck01Icon",
  "BarChart01Icon": "BarChartIcon",
  "PlanetIcon": "Globe02Icon",
  "UserSetting01Icon": "AccountSetting01Icon",
  "Dashboard01Icon": "DashboardSquare01Icon",
  "ShieldWarningIcon": "Shield01Icon",
  "BarChart02Icon": "BarChartHorizontalIcon",
  "UnlockIcon": "CircleUnlock01Icon",
  "ReplyIcon": "MailReply01Icon"
};

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
  
  // Custom fix for type LucideIcon in the hugeicons-react import
  if (content.includes("type LucideIcon") && content.includes("hugeicons-react")) {
    content = content.replace(/,\s*type\s+LucideIcon/g, '');
    if (!content.includes('type LucideIcon =')) {
      content = "import type { FC, SVGProps } from 'react';\ntype LucideIcon = FC<Omit<SVGProps<SVGSVGElement>, 'ref'> & { size?: number | string }>;\n" + content;
    }
  }

  const importRegex = /import\s+\{([^}]+)\}\s+from\s+['"]hugeicons-react['"];?/g;
  let hasChanges = false;
  let newContent = content;

  let match;
  while ((match = importRegex.exec(content)) !== null) {
    const originalImportMatch = match[0];
    const iconListStr = match[1];
    
    const icons = iconListStr.split(',').map(s => s.trim()).filter(Boolean);
    const newIcons = [];
    const replacements = [];
    
    for (const iconItem of icons) {
      const parts = iconItem.split(' as ').map(s => s.trim());
      const originalName = parts[0];
      const aliasName = parts.length > 1 ? parts[1] : null;
      
      const newName = map[originalName] || originalName;
      
      if (newName !== originalName) {
        hasChanges = true;
      }
      
      if (aliasName) {
        if (aliasName !== newName) {
          newIcons.push(`${newName} as ${aliasName}`);
        } else {
          newIcons.push(newName);
        }
      } else {
        newIcons.push(newName);
        if (newName !== originalName) {
          replacements.push({ old: originalName, new: newName });
        }
      }
    }
    
    // Deduplicate
    const uniqueIcons = [...new Set(newIcons)];
    const newImportStr = `import { ${uniqueIcons.join(', ')} } from 'hugeicons-react';`;
    newContent = newContent.replace(originalImportMatch, newImportStr);
    
    for (const { old, new: n } of replacements) {
      const usageRegex = new RegExp(`\\b${old}\\b`, 'g');
      newContent = newContent.replace(usageRegex, n);
    }
  }

  if (hasChanges || content !== fs.readFileSync(filePath, 'utf8')) {
    fs.writeFileSync(filePath, newContent, 'utf8');
    console.log(`Updated ${filePath}`);
  }
}

walkDir('./src', processFile);
