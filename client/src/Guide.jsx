import guide from '../../docs/OKUL_KULLANIM.md?raw';

function inline(text) {
  return text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) return <strong key={index}>{part.slice(2, -2)}</strong>;
    if (part.startsWith('`') && part.endsWith('`')) return <code key={index} className="rounded bg-slate-100 dark:bg-slate-700 px-1 break-all">{part.slice(1, -1)}</code>;
    return part;
  });
}

export default function Guide() {
  const blocks = [];
  const lines = guide.split(/\r?\n/);
  for (let i = 0; i < lines.length;) {
    const line = lines[i].trim();
    if (!line) { i++; continue; }
    if (line.startsWith('# ')) { blocks.push(<h1 key={i} className="text-2xl font-black">{inline(line.slice(2))}</h1>); i++; continue; }
    if (line.startsWith('## ')) { blocks.push(<h2 key={i} className="mt-7 text-lg font-bold">{inline(line.slice(3))}</h2>); i++; continue; }
    if (line.startsWith('### ')) { blocks.push(<h3 key={i} className="mt-5 font-bold">{inline(line.slice(4))}</h3>); i++; continue; }
    const ordered = /^\d+\. /.test(line);
    if (ordered || line.startsWith('- ')) {
      const items = [];
      const first = i;
      while (i < lines.length && (ordered ? /^\d+\. /.test(lines[i].trim()) : lines[i].trim().startsWith('- '))) {
        const item = lines[i].trim().replace(ordered ? /^\d+\. / : /^- /, '');
        items.push(<li key={i}>{inline(item)}</li>);
        i++;
      }
      const List = ordered ? 'ol' : 'ul';
      blocks.push(<List key={first} className={`${ordered ? 'list-decimal' : 'list-disc'} pl-6 space-y-2`}>{items}</List>);
      continue;
    }
    blocks.push(<p key={i}>{inline(line)}</p>);
    i++;
  }
  return <article aria-label="VarYok kullanım kılavuzu" className="panel max-w-4xl mx-auto space-y-3 leading-relaxed text-sm sm:text-base">{blocks}</article>;
}
