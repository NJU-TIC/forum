import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { dark } from "react-syntax-highlighter/dist/esm/styles/prism";

interface MarkdownRendererProps {
  content: string;
}

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  return (
    <Markdown
      remarkPlugins={[remarkGfm]}
      components={{
        h1: ({ children }) => (
          <h1 className="scroll-m-20 text-4xl font-bold tracking-tight">
            {children}
          </h1>
        ),

        h2: ({ children }) => (
          <h2 className="scroll-m-20 border-b pb-2 text-3xl font-semibold tracking-tight">
            {children}
          </h2>
        ),

        p: ({ children }) => (
          <p className="leading-7 [&:not(:first-child)]:mt-6">{children}</p>
        ),

        ul: ({ children }) => (
          <ul className="my-6 ml-6 list-disc">{children}</ul>
        ),

        code(props) {
          const { children, className, node, ...rest } = props;
          const match = /language-(\w+)/.exec(className || "");
          return match ? (
            <SyntaxHighlighter
              PreTag="div"
              language={match[1]}
              style={dark}
            >
              {String(children).replace(/\n$/, "")}
            </SyntaxHighlighter>
          ) : (
            <code {...rest} className={className}>
              {children}
            </code>
          );
        },

        blockquote: ({ children }) => (
          <blockquote className="mt-6 border-l-2 pl-6 italic">
            {children}
          </blockquote>
        ),

        table: ({ children }) => (
          <div className="my-6 w-full overflow-x-auto">
            <table className="w-full text-sm">{children}</table>
          </div>
        ),

        th: ({ children }) => (
          <th className="border px-3 py-2 font-semibold">{children}</th>
        ),

        td: ({ children }) => (
          <td className="border px-3 py-2">{children}</td>
        ),
      }}
    >
      {content}
    </Markdown>
  );
}
