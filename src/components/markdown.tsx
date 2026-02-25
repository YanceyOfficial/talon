/**
 * Markdown Renderer Component
 * Renders markdown content with syntax highlighting and math support
 */

import { cn } from '@/lib/utils'
import { CheckIcon, CopyIcon } from 'lucide-react'
import { memo, useMemo, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import SyntaxHighlighter from 'react-syntax-highlighter'
import {
  atomOneDark,
  atomOneLight
} from 'react-syntax-highlighter/dist/esm/styles/hljs'
import rehypeKatex from 'rehype-katex'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'

const themes = {
  light: { codeTheme: atomOneLight },
  dark: { codeTheme: atomOneDark }
}

interface MarkdownProps {
  content: string
  className?: string
}

export function Markdown({ content, className }: MarkdownProps) {
  const [copied, setCopied] = useState<string | null>(null)

  // TODO: Detect system theme or use theme provider
  const theme = 'light'
  const { codeTheme } = useMemo(() => themes[theme], [theme])

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(text)
    setTimeout(() => setCopied(null), 2000)
  }

  // Extract and process frontmatter
  // eslint-disable-next-line react-hooks/preserve-manual-memoization
  const { frontmatter, mainContent } = useMemo(() => {
    const frontmatterRegex = /^---\n([\s\S]*?)\n---\n/
    const match = content.match(frontmatterRegex)

    if (match) {
      return {
        frontmatter: match[1],
        mainContent: content.slice(match[0].length)
      }
    }

    return { frontmatter: null, mainContent: content }
  }, [content])

  return (
    <section className={cn('markdown', className)}>
      {/* Render frontmatter if present */}
      {frontmatter && (
        <div className="not-prose border-border bg-muted/30 mb-3 overflow-x-auto rounded-lg border">
          <pre className="px-3 py-2 text-xs whitespace-pre-wrap">
            {frontmatter}
          </pre>
        </div>
      )}

      <ReactMarkdown
        remarkPlugins={[
          remarkGfm,
          [
            remarkMath,
            {
              singleDollarTextMath: false
            }
          ]
        ]}
        rehypePlugins={[rehypeKatex]}
        components={{
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          code({ className, children, node, ...rest }) {
            const match = /language-(\w+)/.exec(className || 'javascript')
            return match ? (
              <div className="not-prose relative">
                <div className="border-border bg-muted/50 flex items-center justify-between rounded-t-lg border-b px-3 py-1.5">
                  <span className="text-muted-foreground text-xs font-medium">
                    {match[1]}
                  </span>
                  <button
                    onClick={() => {
                      if (typeof children === 'string') {
                        handleCopy(children)
                      }
                    }}
                    className="text-muted-foreground hover:text-foreground flex items-center gap-1.5 text-xs transition-colors"
                  >
                    {copied === children ? (
                      <>
                        <CheckIcon size={12} strokeWidth={2.5} />
                        <span>Copied</span>
                      </>
                    ) : (
                      <>
                        <CopyIcon size={12} />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>

                {/* @ts-expect-error SyntaxHighlighter types */}
                <SyntaxHighlighter
                  {...rest}
                  PreTag="div"
                  language={match[1]}
                  style={codeTheme}
                  customStyle={{
                    margin: 0,
                    padding: '0.75rem',
                    borderRadius: '0 0 0.5rem 0.5rem',
                    fontSize: '0.75rem',
                    lineHeight: '1.5'
                  }}
                >
                  {String(children).replace(/\n$/, '')}
                </SyntaxHighlighter>
              </div>
            ) : (
              <code {...rest} className={className}>
                {children}
              </code>
            )
          },
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          a({ className, children, node, ...rest }) {
            return (
              <a
                {...rest}
                rel="noopener noreferrer"
                target="_blank"
                className={className}
              >
                {children}
              </a>
            )
          },
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          table({ className, children, node, ...rest }) {
            return (
              <div className="border-border not-prose mb-3 overflow-x-auto rounded-lg border last:mb-0">
                <table {...rest} className={className}>
                  {children}
                </table>
              </div>
            )
          }
        }}
      >
        {mainContent}
      </ReactMarkdown>
    </section>
  )
}

export default memo(
  Markdown,
  (prevProps, nextProps) => prevProps.content === nextProps.content
)
