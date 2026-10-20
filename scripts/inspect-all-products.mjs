import fs from 'fs';

const dir = 'c:/projects/shop-admin/backup/images/products';
const files = fs.readdirSync(dir);

const endpoint = 'https://br-round-violet-b3jc7oez.storage.c-4.ap-southeast-1.aws.neon.tech';
const bucket = 'product-images';

function getUrl(filename) {
  return `${endpoint}/${bucket}/products/${filename}`;
}

const groups = {};

for (const file of files) {
  const withoutTimestamp = file.replace(/^\d+-/, '');
  
  // Check special cases
  if (file.includes('Sampaguita') || file.includes('15.12.56') || file.includes('5436054191577874413')) {
    if (!groups['sampaguita']) groups['sampaguita'] = { name: 'Sampaguita', price: 800, sizes: ['M'], files: [] };
    groups['sampaguita'].files.push(file);
    continue;
  }
  
  if (file.includes('Amalia') || file.includes('12.43.00') || file.includes('3247584277644911085')) {
    if (!groups['amalia']) groups['amalia'] = { name: 'Amalia', price: 800, sizes: ['S'], files: [] };
    groups['amalia'].files.push(file);
    continue;
  }
  
  if (file.includes('daisy')) {
    if (!groups['daisy']) groups['daisy'] = { name: 'Daisy', price: 800, sizes: ['S'], files: [] };
    groups['daisy'].files.push(file);
    continue;
  }

  // Blair
  if (file.includes('blair.jpg')) {
    // 1791984789927-blair.jpg is duplicate of 1792397559438-1.7_Blair_1000_S.jpg
    // Let's attach to blair
    if (!groups['blair']) groups['blair'] = { name: 'Blair', price: 1000, sizes: ['S'], files: [] };
    groups['blair'].files.push(file);
    continue;
  }

  const match = withoutTimestamp.match(/([A-Za-z]+)_(\d+)_(XS|S|M|L|XL|2XL)/i);
  if (match) {
    const name = match[1];
    const price = parseInt(match[2], 10);
    const size = match[3].toUpperCase();
    const key = `${name.toLowerCase()}_${price}_${size}`;
    if (!groups[key]) {
      groups[key] = {
        name,
        price,
        sizes: [size],
        files: []
      };
    }
    groups[key].files.push(file);
  } else {
    console.log('Unmatched:', file);
  }
}

console.log(`Total grouped products: ${Object.keys(groups).length}`);

for (const [key, p] of Object.entries(groups)) {
  console.log(`\n--- Product: ${p.name} (Price: ${p.price}, Size: ${p.sizes.join(',')}) ---`);
  console.log(`Files count: ${p.files.length}`);
  p.files.forEach(f => {
    const stat = fs.statSync(`${dir}/${f}`);
    console.log(`  ${f} (size: ${stat.size})`);
  });
}
