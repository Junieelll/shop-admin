import fs from 'fs';
import path from 'path';

const dir = 'c:/projects/shop-admin/backup/images/products';
const files = fs.readdirSync(dir);

console.log(`Total files: ${files.length}`);

const parsedFiles = files.map(filename => {
  // filename like: 1792397029851-1.3_Lily_800_S.jpg
  // or 1792397032008-1.3_Lily_800_S_1_.jpg
  // or 1792397456977-1.1_Solene_800_M.jpg
  // or 1792397460369-1.1_Solene_800_M.png
  // or 1792042076152-1.1_Adele_800_XS.1_Adele_800_XS.1_Adele_800_XS.jpg
  
  // Strip timestamp prefix: 179...-
  const withoutTimestamp = filename.replace(/^\d+-/, '');
  
  return {
    filename,
    clean: withoutTimestamp
  };
});

console.log(JSON.stringify(parsedFiles, null, 2));
