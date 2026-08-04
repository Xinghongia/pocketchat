import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github-dark.css';
import { cn } from '@/lib/utils';

/**
 * Markdown 渲染器：GFM 表格/任务列表 + 代码高亮。
 * 所有聊天消息统一走这里，保证三种形态下渲染一致。
 */
export function Markdown({ content, className }: { content: string; className?: string }) {
  return (
    <div
      className={cn(
        'markdown-body text-[13.5px] leading-relaxed',
        '[&_p]:my-1.5 [&_p:first-child]:mt-0 [&_p:last-child]:mb-0',
        '[&_h1]:mt-4 [&_h1]:mb-2 [&_h1]:text-base [&_h1]:font-semibold',
        '[&_h2]:mt-3 [&_h2]:mb-2 [&_h2]:text-[15px] [&_h2]:font-semibold',
        '[&_h3]:mt-3 [&_h3]:mb-1.5 [&_h3]:text-sm [&_h3]:font-semibold',
        '[&_ul]:my-1.5 [&_ul]:list-disc [&_ul]:pl-5',
        '[&_ol]:my-1.5 [&_ol]:list-decimal [&_ol]:pl-5',
        '[&_li]:my-0.5',
        '[&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2 [&_a]:decoration-primary/40',
        '[&_blockquote]:my-2 [&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-3 [&_blockquote]:text-muted-foreground',
        '[&_hr]:my-3 [&_hr]:border-border',
        '[&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-[0.85em] [&_code]:text-accent-foreground',
        '[&_pre]:my-2.5 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-[#0d1117] [&_pre]:p-3',
        '[&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_pre_code]:text-[12.5px] [&_pre_code]:leading-relaxed [&_pre_code]:text-[#e6edf3]',
        '[&_table]:my-2.5 [&_table]:w-full [&_table]:border-collapse [&_table]:text-[13px]',
        '[&_th]:border [&_th]:border-border [&_th]:bg-muted [&_th]:px-2.5 [&_th]:py-1.5 [&_th]:text-left [&_th]:font-medium',
        '[&_td]:border [&_td]:border-border [&_td]:px-2.5 [&_td]:py-1.5',
        '[&_input[type=checkbox]]:mr-1.5 [&_input[type=checkbox]]:accent-primary',
        '[&_img]:max-w-full [&_img]:rounded-md',
        className,
      )}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
