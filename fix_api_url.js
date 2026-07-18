import fs from 'fs';
let file = 'src/lib/api.ts';
let code = fs.readFileSync(file, 'utf8');

code = code.replaceAll('${API_BASE}', '/api');
fs.writeFileSync(file, code);
