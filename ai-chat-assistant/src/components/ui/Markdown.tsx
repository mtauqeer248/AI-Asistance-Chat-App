'use client'

import { memo, useRef, type ComponentPropsWithoutRef } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import { CopyButton } from './CopyButton'
import { cn } from '@/lib/utils'

function CodeBlock({ children, ...props }: ComponentPropsWithoutRef<'pre'>) {
  const ref = useRef<HTMLPreElement>(null)
  // rehype-highlight puts `language-xyz` on the inner <code>; read it back for the label.
  const child = Array.isArray(children) ? children[0] : children
  const className: string = (child as { props?: { className?: string } })?.props?.className ?? ''
  const language = /language-([\w-]+)/.exec(className)?.[1]

  return (
    <div className="code-block group/code">
      <div className="code-block__bar">
        <span>{language ?? 'code'}</span>
        <CopyButton getText={() => ref.current?.innerText ?? ''} label="Copy code" />
      </div>
      <pre ref={ref} {...props}>
        {children}
      </pre>
    </div>
  )
}

interface MarkdownProps {
  content: string
  className?: string
}

/** Memoised: while a reply streams, earlier messages don't re-parse their markdown. */
export const Markdown = memo(function Markdown({ content, className }: MarkdownProps) {
  return (
    <div className={cn('markdown', className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={{
          pre: CodeBlock,
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noopener noreferrer">
              {children}
            </a>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
})
