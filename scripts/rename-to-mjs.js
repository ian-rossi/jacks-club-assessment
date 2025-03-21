import fs from 'fs';
import path from 'path';

const directory = './dist';

function traverseAndRename(dir) {
  fs.readdirSync(dir).forEach(file => {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      traverseAndRename(fullPath);
    } else if (file.endsWith('.js')) {
      const newPath = path.join(dir, file.replace('.js', '.mjs'));
      fs.renameSync(fullPath, newPath);
      let content = fs.readFileSync(newPath, 'utf8');
      const updatedContent = content.replaceAll(/(["|'])\.(.*).js(["|'])/g, '$1.$2.mjs$3');
      if (content.length != updatedContent.length) {
        fs.writeFileSync(newPath, updatedContent, 'utf8');
      }
    }
  });
}

// Start the recursive traversal
traverseAndRename(directory);