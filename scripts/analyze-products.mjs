import fs from 'fs';

const dir = 'c:/projects/shop-admin/backup/images/products';
const files = fs.readdirSync(dir);

// Regex to match patterns like:
// 1.3_Lily_800_S.jpg
// 1.3_Lily_800_S_1_.jpg
// 1.1_Adele_800_XS.1_Adele_800_XS.1_Adele_800_XS.jpg
// 1.1_Solene_800_M.png / .jpg
// 1.20_Lyra_1200_2XL.jpg
// 1.20_Lyra_1200_2XL_1_.jpg

// Notice prefix like 1.X_
// Then Name
// Then Price
// Then Size (XS, S, M, L, XL, 2XL)
// Then optional suffix like _1_, _2_, etc.
// Then extension

const pattern = /(?:^|\.)(?:1\.\d+_)?([A-Za-z]+)_(\d+)_(XS|S|M|L|XL|2XL|Free\s*Size)(?:_\d+_)?(?:\.[A-Za-z0-9_]+)*\.(jpg|jpeg|png|webp)$/i;

const unclassified = [];
const productsMap = new Map();

for (const file of files) {
  const withoutTimestamp = file.replace(/^\d+-/, '');
  
  // Try matching
  // Let's also handle Adele special repeating name:
  // 1.1_Adele_800_XS.1_Adele_800_XS.1_Adele_800_XS.jpg
  // Simple extraction:
  const match = withoutTimestamp.match(/([A-Za-z]+)_(\d+)_(XS|S|M|L|XL|2XL)/i);
  
  if (match) {
    const name = match[1];
    const price = parseInt(match[2], 10);
    const size = match[3].toUpperCase();
    
    // Key by name + price + size (or just name, let's check)
    const key = `${name.toLowerCase()}_${price}_${size}`;
    
    if (!productsMap.has(key)) {
      productsMap.set(key, {
        name,
        price,
        size,
        files: []
      });
    }
    productsMap.get(key).files.push(file);
  } else {
    unclassified.push({ file, withoutTimestamp });
  }
}

console.log(`Matched products: ${productsMap.size}`);
for (const [key, prod] of productsMap.entries()) {
  console.log(`Product: ${prod.name} | Price: ${prod.price} | Size: ${prod.size} | Images (${prod.files.length}):`);
  for (const f of prod.files) {
    console.log(`   - ${f}`);
  }
}

console.log(`\nUnclassified files (${unclassified.length}):`);
for (const u of unclassified) {
  console.log(`   - ${u.file} (${u.withoutTimestamp})`);
}
