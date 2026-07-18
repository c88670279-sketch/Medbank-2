import fs from 'fs';
let file = 'src/lib/api.ts';
let code = fs.readFileSync(file, 'utf8');

const target1 = `export const importMCQs = async (payload: {`;
const replace1 = `export const fetchSources = async (): Promise<string[]> => {
  const res = await fetch(\`\${API_BASE}/sources\`);
  if (!res.ok) throw new Error('Failed to fetch sources');
  return res.json();
};

export const renameSource = async (oldName: string, newName: string): Promise<any> => {
  const res = await fetch(\`\${API_BASE}/sources/rename\`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ oldName, newName }),
  });
  if (!res.ok) throw new Error('Failed to rename source');
  return res.json();
};

export const importMCQs = async (payload: {`;
code = code.replace(target1, replace1);

const target2 = `topic?: string;
}) => {`;
const replace2 = `topic?: string;
  sourceName?: string;
}) => {`;
code = code.replace(target2, replace2);

// Same for extractImageMCQ if it exists
const target3 = `export const extractImageMCQ = async (payload: {`;
const replace3 = `export const extractImageMCQ = async (payload: {
  sourceName?: string;`;
code = code.replace(target3, replace3);

fs.writeFileSync(file, code);
