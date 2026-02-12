import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeSanitize from 'rehype-sanitize'
import type { Components } from 'react-markdown'

const markdownComponents: Components = {
  p: ({ children }) => <p className="my-2 first:mt-0 last:mb-0">{children}</p>,
  ul: ({ children }) => <ul className="list-disc list-outside pl-6 space-y-1 my-2">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal list-outside pl-6 space-y-1 my-2">{children}</ol>,
  li: ({ children }) => <li className="pl-1">{children}</li>,
  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
  code: ({ className, children, ...props }) => {
    const isBlock =
      (typeof className === 'string' && className.startsWith('language-')) ||
      (typeof children === 'string' && children.includes('\n'))
    if (isBlock) {
      return (
        <pre className="bg-gray-200 dark:bg-gray-700 rounded p-3 my-2 overflow-x-auto text-sm font-mono text-gray-900 dark:text-gray-100">
          <code {...props}>{children}</code>
        </pre>
      )
    }
    return (
      <code
        className="bg-gray-200 dark:bg-gray-700 px-1.5 py-0.5 rounded text-sm font-mono text-gray-900 dark:text-gray-100"
        {...props}
      >
        {children}
      </code>
    )
  },
  pre: ({ children }) => <>{children}</>,
  blockquote: ({ children }) => (
    <blockquote className="border-l-4 border-gray-300 dark:border-gray-600 pl-4 my-2 text-gray-700 dark:text-gray-300">
      {children}
    </blockquote>
  ),
  h1: ({ children }) => <h1 className="text-lg font-bold mt-3 mb-1">{children}</h1>,
  h2: ({ children }) => <h2 className="text-base font-bold mt-3 mb-1">{children}</h2>,
  h3: ({ children }) => <h3 className="text-sm font-bold mt-2 mb-1">{children}</h3>,
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-blue-600 dark:text-blue-400 underline hover:no-underline"
    >
      {children}
    </a>
  ),
  hr: () => <hr className="border-gray-200 dark:border-gray-600 my-3" />,
  table: ({ children }) => (
    <div className="overflow-x-auto my-2">
      <table className="min-w-full border border-gray-200 dark:border-gray-600">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-gray-100 dark:bg-gray-700">{children}</thead>,
  tbody: ({ children }) => <tbody>{children}</tbody>,
  tr: ({ children }) => <tr className="border-b border-gray-200 dark:border-gray-600">{children}</tr>,
  th: ({ children }) => (
    <th className="px-3 py-2 text-left text-sm font-semibold border border-gray-200 dark:border-gray-600">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="px-3 py-2 text-sm border border-gray-200 dark:border-gray-600">{children}</td>
  ),
}

interface MarkdownRendererProps {
  content: string
  className?: string
}

/**
 * Renders markdown using react-markdown with GFM and sanitization.
 * Use this for LLM chat content so headings, lists, code blocks, tables, and links are formatted correctly.
 */
export function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
  if (!content?.trim()) return null
  return (
    <div className={`markdown-renderer ${className ?? ''}`.trim()}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeSanitize]}
        components={markdownComponents}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
