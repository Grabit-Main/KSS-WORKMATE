import React, { useMemo } from 'react';
import { Copy, Check, Info, AlertTriangle, AlertCircle, Sparkles, Code } from 'lucide-react';

export const DocMarkdownRenderer = ({ content, onTocExtracted }) => {
  const [copiedIndex, setCopiedIndex] = React.useState(null);

  const handleCopy = (codeText, idx) => {
    navigator.clipboard.writeText(codeText);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  // Parse sections and TOC elements
  const { blocks, toc } = useMemo(() => {
    if (!content) return { blocks: [], toc: [] };

    const lines = content.split('\n');
    const parsedBlocks = [];
    const extractedToc = [];
    let currentCodeBlock = null;
    let currentTable = null;
    let codeIndex = 0;

    lines.forEach((line, index) => {
      // Code blocks
      if (line.trim().startsWith('```')) {
        if (currentCodeBlock) {
          parsedBlocks.push({
            type: 'code',
            lang: currentCodeBlock.lang,
            code: currentCodeBlock.lines.join('\n'),
            index: codeIndex++
          });
          currentCodeBlock = null;
        } else {
          const lang = line.trim().replace('```', '').trim() || 'code';
          currentCodeBlock = { lang, lines: [] };
        }
        return;
      }

      if (currentCodeBlock) {
        currentCodeBlock.lines.push(line);
        return;
      }

      // Headings
      if (line.startsWith('#')) {
        const match = line.match(/^(#{1,6})\s+(.*)$/);
        if (match) {
          const level = match[1].length;
          const text = match[2].trim();
          const id = text.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
          
          extractedToc.push({ id, text, level });
          parsedBlocks.push({ type: 'heading', level, text, id });
          return;
        }
      }

      // Callouts
      if (line.trim().startsWith('> [!NOTE]') || line.trim().startsWith('> [!IMPORTANT]') || line.trim().startsWith('> [!WARNING]') || line.trim().startsWith('> [!TIP]')) {
        let kind = 'note';
        if (line.includes('IMPORTANT')) kind = 'important';
        if (line.includes('WARNING')) kind = 'warning';
        if (line.includes('TIP')) kind = 'tip';
        parsedBlocks.push({ type: 'callout', kind, text: '' });
        return;
      }

      if (line.trim().startsWith('>') && parsedBlocks.length > 0 && parsedBlocks[parsedBlocks.length - 1].type === 'callout') {
        const last = parsedBlocks[parsedBlocks.length - 1];
        const textPart = line.trim().replace(/^>\s?/, '');
        last.text = last.text ? last.text + ' ' + textPart : textPart;
        return;
      }

      // Table row
      if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
        if (!currentTable) {
          currentTable = [];
        }
        // Skip separator line |---|---|
        if (!line.includes('---')) {
          const cells = line.split('|').slice(1, -1).map(c => c.trim());
          currentTable.push(cells);
        }
        return;
      } else if (currentTable) {
        parsedBlocks.push({ type: 'table', rows: currentTable });
        currentTable = null;
      }

      // Bullet lists
      if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
        const text = line.trim().substring(2);
        parsedBlocks.push({ type: 'list-item', text, ordered: false });
        return;
      }

      // Numbered list
      const numMatch = line.trim().match(/^(\d+)\.\s+(.*)$/);
      if (numMatch) {
        parsedBlocks.push({ type: 'list-item', text: numMatch[2], ordered: true, num: numMatch[1] });
        return;
      }

      // Empty line
      if (!line.trim()) {
        return;
      }

      // Paragraph
      parsedBlocks.push({ type: 'paragraph', text: line.trim() });
    });

    if (currentTable) {
      parsedBlocks.push({ type: 'table', rows: currentTable });
    }

    return { blocks: parsedBlocks, toc: extractedToc };
  }, [content]);

  React.useEffect(() => {
    if (onTocExtracted) {
      onTocExtracted(toc);
    }
  }, [toc, onTocExtracted]);

  return (
    <div className="doc-content-body" style={{ color: 'var(--text-primary)', fontSize: '15px', lineHeight: 1.7 }}>
      {blocks.map((block, idx) => {
        if (block.type === 'heading') {
          const Tag = `h${Math.min(block.level + 1, 6)}`;
          return (
            <Tag
              key={idx}
              id={block.id}
              style={{
                fontSize: block.level === 1 ? '26px' : block.level === 2 ? '20px' : '16px',
                fontWeight: 700,
                color: 'var(--text-primary)',
                marginTop: block.level === 1 ? '32px' : '24px',
                marginBottom: '12px',
                paddingBottom: block.level <= 2 ? '8px' : '0',
                borderBottom: block.level <= 2 ? '1px solid var(--border)' : 'none',
                scrollMarginTop: '80px'
              }}
            >
              {block.text}
            </Tag>
          );
        }

        if (block.type === 'paragraph') {
          return (
            <p key={idx} style={{ marginBottom: '14px', color: 'var(--text-secondary)' }}>
              {block.text}
            </p>
          );
        }

        if (block.type === 'list-item') {
          return (
            <div key={idx} style={{ display: 'flex', gap: '8px', marginBottom: '6px', marginLeft: '12px', color: 'var(--text-secondary)' }}>
              <span style={{ color: 'var(--brand-600)', fontWeight: 600 }}>{block.ordered ? `${block.num}.` : '•'}</span>
              <span>{block.text}</span>
            </div>
          );
        }

        if (block.type === 'code') {
          return (
            <div key={idx} style={{
              margin: '18px 0',
              borderRadius: 'var(--radius-md)',
              background: '#0F172A',
              border: '1px solid #1E293B',
              overflow: 'hidden'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 14px',
                background: '#1E293B',
                color: '#94A3B8',
                fontSize: '12px',
                fontWeight: 600,
                textTransform: 'uppercase'
              }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Code size={14} />
                  {block.lang}
                </span>
                <button
                  onClick={() => handleCopy(block.code, block.index)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#94A3B8',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '12px'
                  }}
                >
                  {copiedIndex === block.index ? <Check size={14} style={{ color: '#10B981' }} /> : <Copy size={14} />}
                  {copiedIndex === block.index ? 'Copied' : 'Copy'}
                </button>
              </div>
              <pre style={{
                padding: '16px',
                margin: 0,
                overflowX: 'auto',
                color: '#F8FAFC',
                fontFamily: 'monospace',
                fontSize: '13.5px',
                lineHeight: 1.6
              }}>
                <code>{block.code}</code>
              </pre>
            </div>
          );
        }

        if (block.type === 'callout') {
          const isWarning = block.kind === 'warning';
          const isImportant = block.kind === 'important';
          const isTip = block.kind === 'tip';

          const bg = isWarning ? '#FEF2F2' : isImportant ? '#FFFBEB' : isTip ? '#ECFDF5' : '#EEF2FF';
          const border = isWarning ? '#FCA5A5' : isImportant ? '#FDE68A' : isTip ? '#6EE7B7' : '#C7D2FE';
          const textCol = isWarning ? '#991B1B' : isImportant ? '#92400E' : isTip ? '#065F46' : '#3730A3';
          const IconComp = isWarning ? AlertTriangle : isImportant ? AlertCircle : isTip ? Sparkles : Info;

          return (
            <div key={idx} style={{
              padding: '14px 18px',
              margin: '16px 0',
              borderRadius: 'var(--radius-md)',
              background: bg,
              borderLeft: `4px solid ${border}`,
              color: textCol,
              fontSize: '14px',
              display: 'flex',
              gap: '12px',
              alignItems: 'flex-start'
            }}>
              <IconComp size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>{block.text || block.kind.toUpperCase()}</div>
            </div>
          );
        }

        if (block.type === 'table') {
          if (block.rows.length === 0) return null;
          const headers = block.rows[0];
          const dataRows = block.rows.slice(1);

          return (
            <div key={idx} style={{ overflowX: 'auto', margin: '18px 0' }}>
              <table style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: '13.5px',
                textAlign: 'left'
              }}>
                <thead>
                  <tr style={{ background: 'var(--surface-hover)', borderBottom: '2px solid var(--border)' }}>
                    {headers.map((h, i) => (
                      <th key={i} style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--text-primary)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {dataRows.map((r, ri) => (
                    <tr key={ri} style={{ borderBottom: '1px solid var(--border)' }}>
                      {r.map((c, ci) => (
                        <td key={ci} style={{ padding: '10px 14px', color: 'var(--text-secondary)' }}>{c}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }

        return null;
      })}
    </div>
  );
};
