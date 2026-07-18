import sys

with open('src/components/AdminPanel.tsx', 'r') as f:
    content = f.read()

# Add states for source dropdown
state_target = "  const [imageTopic, setImageTopic] = useState('');"
state_repl = """  const [imageTopic, setImageTopic] = useState('');
  const [sourceName, setSourceName] = useState('');
  const [sourcesList, setSourcesList] = useState<string[]>([]);
  const [showSourceDropdown, setShowSourceDropdown] = useState(false);
  const [sourceSearch, setSourceSearch] = useState('');
  const [isRenamingSource, setIsRenamingSource] = useState(false);
  const [sourceRenameOld, setSourceRenameOld] = useState('');
  const [sourceRenameNew, setSourceRenameNew] = useState('');"""
if state_target in content and "const [sourceName, setSourceName]" not in content:
    content = content.replace(state_target, state_repl)

# We need to fetch sources in loadData or useeffect
fetch_target = """        fetchDBChapters(),
        fetchDBTopics(),"""
fetch_repl = """        fetchDBChapters(),
        fetchDBTopics(),
        fetch('/api/sources').then(res => res.json()).catch(() => []),"""
if fetch_target in content and "fetch('/api/sources')" not in content:
    content = content.replace(fetch_target, fetch_repl)

# Process results
res_target = "setTopicsList(t);"
res_repl = "setTopicsList(t);\n        if (results[14]) setSourcesList(results[14] as string[]);"
if res_target in content and "setSourcesList" not in content:
    content = content.replace(res_target, res_repl)

# Note: results length might change. It has 14 items currently? 
# let's just use `fetch('/api/sources')` in a separate useEffect
