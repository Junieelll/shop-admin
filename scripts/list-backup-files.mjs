import fs from 'fs';
import path from 'path';

const dir = 'c:/projects/shop-admin/backup/images/products';
const files = fs.readdirSync(dir);

console.log(`Total files in backup/images/products: ${files.length}`);

// Print all filenames
for (const file of files) {
  console.log(file);
}
