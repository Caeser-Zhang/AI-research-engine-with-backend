
import React from 'react';
import ReactMarkdown from 'react-markdown';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, className }) => {
  return (
    <div className={`prose prose-slate max-w-none leading-7 text-slate-600 break-words ${className}`}>
      <ReactMarkdown
        components={{
          // Code Blocks & Inline Code
          code(props) {
            const {children, className, node, ...rest} = props;
            const match = /language-(\w+)/.exec(className || '');
            const isBlock = match || (children && String(children).includes('\n'));

            if (isBlock) {
                return (
                    <div className="not-prose my-5 rounded-xl overflow-hidden bg-[#1e1e2e] shadow-xl border border-slate-200/20 ring-1 ring-slate-900/5">
                         {/* Code Header */}
                         <div className="flex items-center justify-between px-4 py-2.5 bg-[#181825] border-b border-white/5">
                             <div className="flex gap-1.5">
                                <div className="w-2.5 h-2.5 rounded-full bg-red-500/80"></div>
                                <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80"></div>
                                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80"></div>
                             </div>
                             <span className="text-[10px] font-mono font-medium text-slate-400 uppercase tracking-wider">
                                 {match ? match[1] : 'Code'}
                             </span>
                         </div>
                         {/* Code Body */}
                         <pre className="p-4 overflow-x-auto text-sm leading-relaxed text-blue-100 font-mono scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
                             <code className={className || ''} {...rest}>
                                 {children}
                             </code>
                         </pre>
                    </div>
                );
            }
            
            return (
                <code className="font-mono text-[0.9em] font-medium bg-violet-50 text-violet-700 px-1.5 py-0.5 rounded-[4px] border border-violet-100/50 mx-0.5" {...rest}>
                    {children}
                </code>
            )
          },
          // Override Pre to avoid double wrapping since we handle the wrapper in code
          pre(props) {
              return <div className="contents">{props.children}</div>;
          },
          // Links
          a(props) {
                return (
                    <a className="text-violet-600 hover:text-violet-800 hover:underline decoration-2 underline-offset-2 font-semibold transition-colors" target="_blank" rel="noreferrer" {...props}>
                        {props.children}
                    </a>
                )
          },
          // Lists
          ul(props) {
              return <ul className="list-disc list-outside ml-5 space-y-2 my-4 text-slate-700 marker:text-violet-400" {...props}>{props.children}</ul>
          },
          ol(props) {
              return <ol className="list-decimal list-outside ml-5 space-y-2 my-4 text-slate-700 marker:text-violet-500 font-medium" {...props}>{props.children}</ol>
          },
          li(props) {
              return <li className="pl-1" {...props}>{props.children}</li>
          },
          // Headings
          h1(props) { return <h1 className="text-3xl font-bold mt-8 mb-4 text-slate-900 tracking-tight" {...props}>{props.children}</h1> },
          h2(props) { return <h2 className="text-2xl font-bold mt-8 mb-4 text-slate-800 tracking-tight border-b border-slate-100 pb-2" {...props}>{props.children}</h2> },
          h3(props) { return <h3 className="text-lg font-bold mt-6 mb-3 text-slate-800" {...props}>{props.children}</h3> },
          // Blockquote
          blockquote(props) {
              return (
                <blockquote className="border-l-4 border-violet-500 pl-4 py-1 my-6 italic text-slate-600 bg-slate-50/80 rounded-r-lg" {...props}>
                    {props.children}
                </blockquote>
              )
          },
          // Tables
          table(props) {
              return (
                <div className="overflow-x-auto my-6 rounded-xl border border-slate-200 shadow-sm">
                    <table className="min-w-full divide-y divide-slate-200 bg-white text-sm" {...props}>
                        {props.children}
                    </table>
                </div>
              )
          },
          thead(props) {
              return <thead className="bg-slate-50" {...props}>{props.children}</thead>
          },
          th(props) {
              return <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider" {...props}>{props.children}</th>
          },
          td(props) {
              return <td className="px-4 py-3 text-slate-600 border-t border-slate-100 whitespace-pre-wrap" {...props}>{props.children}</td>
          },
          tr(props) {
              return <tr className="hover:bg-slate-50/50 transition-colors" {...props}>{props.children}</tr>
          },
          hr(props) {
              return <hr className="my-8 border-slate-200" {...props} />
          }
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};
