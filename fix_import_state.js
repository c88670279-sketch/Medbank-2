import fs from 'fs';
let file = 'src/components/ImportMCQs.tsx';
let code = fs.readFileSync(file, 'utf8');

const t = `  const [sourceRenameNew, setSourceRenameNew] = useState('');`;

const r = `  const [sourceRenameNew, setSourceRenameNew] = useState('');
  const [selectedQuestionTypes, setSelectedQuestionTypes] = useState<string[]>(['All Question Types']);
  const [showQuestionTypesDropdown, setShowQuestionTypesDropdown] = useState(false);`;

code = code.replace(t, r);
fs.writeFileSync(file, code);
