import { useState, useMemo, type ComponentProps } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { ChatMessage, ContentBlock } from "../types.js";
import { ToolBlock, getToolIcon, getToolLabel, getToolBorderColor, getPreview, ToolIcon } from "./ToolBlock.js";
import { useStore } from "../store.js";
import hljs from "../utils/hljs.js";

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  function handleCopy(e: React.MouseEvent) {
    e.stopPropagation();
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <button
      onClick={handleCopy}
      className="absolute top-2 right-2 px-1.5 py-1 rounded-md bg-cc-fg/10 hover:bg-cc-fg/20 text-cc-code-fg/60 hover:text-cc-code-fg text-[11px] font-mono-code opacity-0 group-hover:opacity-100 transition-all cursor-pointer z-10"
    >
      {copied ? "Copied!" : (
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3.5 h-3.5">
          <rect x="5" y="5" width="8" height="8" rx="1" />
          <path d="M3 11V3h8" strokeLinecap="round" />
        </svg>
      )}
    </button>
  );
}

function MessageCopyButton({ text }: { text: string }) {
  const addToast = useStore((s) => s.addToast);

  function handleCopy(e: React.MouseEvent) {
    e.stopPropagation();
    navigator.clipboard.writeText(text).then(() => {
      addToast({ message: "Message copied", variant: "success" });
    });
  }

  return (
    <button
      onClick={handleCopy}
      title="Copy message"
      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md hover:bg-cc-hover text-cc-muted hover:text-cc-fg cursor-pointer"
    >
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3.5 h-3.5">
        <rect x="5" y="5" width="8" height="8" rx="1" />
        <path d="M3 11V3h8" strokeLinecap="round" />
      </svg>
    </button>
  );
}

export function MessageBubble({ message }: { message: ChatMessage }) {
  if (message.role === "system") {
    return (
      <div className="flex items-center gap-3 py-1">
        <div className="flex-1 h-px bg-cc-border" />
        <span className="text-[11px] text-cc-muted italic font-mono-code shrink-0 px-1">
          {message.content}
        </span>
        <div className="flex-1 h-px bg-cc-border" />
      </div>
    );
  }

  if (message.role === "user") {
    return <UserMessage message={message} />;
  }

  // Assistant message
  return (
    <div className="animate-[fadeSlideIn_0.2s_ease-out] group/msg">
      <AssistantMessage message={message} />
    </div>
  );
}

function UserMessage({ message }: { message: ChatMessage }) {
  const setLightboxSrc = useStore((s) => s.setLightboxSrc);

  return (
    <div className="flex justify-end animate-[fadeSlideIn_0.2s_ease-out]">
      <div className="max-w-[80%] px-4 py-3 rounded-2xl rounded-br-[6px] bg-cc-user-bubble text-cc-fg shadow-sm">
        {message.images && message.images.length > 0 && (
          <div className="flex gap-2 flex-wrap mb-2">
            {message.images.map((img, i) => (
              <img
                key={i}
                src={`data:${img.media_type};base64,${img.data}`}
                alt="attachment"
                className="max-w-[200px] max-h-[150px] rounded-xl object-cover cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => setLightboxSrc(`data:${img.media_type};base64,${img.data}`)}
              />
            ))}
          </div>
        )}
        <pre className="text-[14px] whitespace-pre-wrap break-words font-sans-ui leading-relaxed">
          {message.content}
        </pre>
      </div>
    </div>
  );
}

interface ToolGroupItem {
  id: string;
  name: string;
  input: Record<string, unknown>;
}

type GroupedBlock =
  | { kind: "content"; block: ContentBlock }
  | { kind: "tool_group"; name: string; items: ToolGroupItem[] };

function groupContentBlocks(blocks: ContentBlock[]): GroupedBlock[] {
  const groups: GroupedBlock[] = [];

  for (const block of blocks) {
    if (block.type === "tool_use") {
      const last = groups[groups.length - 1];
      if (last?.kind === "tool_group" && last.name === block.name) {
        last.items.push({ id: block.id, name: block.name, input: block.input });
      } else {
        groups.push({
          kind: "tool_group",
          name: block.name,
          items: [{ id: block.id, name: block.name, input: block.input }],
        });
      }
    } else {
      groups.push({ kind: "content", block });
    }
  }

  return groups;
}

function AssistantMessage({ message }: { message: ChatMessage }) {
  const blocks = message.contentBlocks || [];

  const grouped = useMemo(() => groupContentBlocks(blocks), [blocks]);

  if (blocks.length === 0 && message.content) {
    return (
      <div className="flex items-start gap-3 group">
        <AssistantAvatar />
        <div className="flex-1 min-w-0">
          <MarkdownContent text={message.content} />
        </div>
        <MessageCopyButton text={message.content} />
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3 group">
      <AssistantAvatar />
      <div className="flex-1 min-w-0 space-y-3">
        {grouped.map((group, i) => {
          if (group.kind === "content") {
            return <ContentBlockRenderer key={i} block={group.block} />;
          }
          // Single tool_use renders as before
          if (group.items.length === 1) {
            const item = group.items[0];
            return <ToolBlock key={i} name={item.name} input={item.input} toolUseId={item.id} />;
          }
          // Grouped tool_uses
          return <ToolGroupBlock key={i} name={group.name} items={group.items} />;
        })}
      </div>
      {message.content && <MessageCopyButton text={message.content} />}
    </div>
  );
}

function AssistantAvatar() {
  return (
    <div className="w-6 h-6 rounded-lg bg-cc-primary/10 flex items-center justify-center shrink-0 mt-0.5">
      <svg viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3 text-cc-primary">
        <circle cx="8" cy="8" r="3" />
      </svg>
    </div>
  );
}

function HighlightedCode({ code, lang }: { code: string; lang: string }) {
  const highlighted = useMemo(() => {
    if (!lang) return null;
    try {
      const result = hljs.highlight(code, { language: lang, ignoreIllegals: true });
      return result.value;
    } catch {
      return null;
    }
  }, [code, lang]);

  if (highlighted) {
    return <code dangerouslySetInnerHTML={{ __html: highlighted }} />;
  }
  return <code>{code}</code>;
}

function MarkdownContent({ text }: { text: string }) {
  return (
    <div className="markdown-body text-[15px] text-cc-fg leading-[1.7]">
      <Markdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => (
            <p className="mb-3 last:mb-0">{children}</p>
          ),
          strong: ({ children }) => (
            <strong className="font-semibold text-cc-fg">{children}</strong>
          ),
          em: ({ children }) => (
            <em className="italic">{children}</em>
          ),
          h1: ({ children }) => (
            <h1 className="text-xl font-bold text-cc-fg mt-4 mb-2">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-lg font-bold text-cc-fg mt-3 mb-2">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-base font-semibold text-cc-fg mt-3 mb-1">{children}</h3>
          ),
          ul: ({ children }) => (
            <ul className="list-disc pl-5 mb-3 space-y-1">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal pl-5 mb-3 space-y-1">{children}</ol>
          ),
          li: ({ children }) => (
            <li className="text-cc-fg">{children}</li>
          ),
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noopener noreferrer" className="text-cc-primary hover:underline">
              {children}
            </a>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-cc-primary/30 pl-3 my-2 text-cc-muted italic">
              {children}
            </blockquote>
          ),
          hr: () => (
            <hr className="border-cc-border my-4" />
          ),
          code: (props: ComponentProps<"code">) => {
            const { children, className } = props;
            const match = /language-(\w+)/.exec(className || "");
            const isBlock = match || (typeof children === "string" && children.includes("\n"));

            if (isBlock) {
              const lang = match?.[1] || "";
              const codeText = typeof children === "string" ? children : String(children ?? "");
              return (
                <div className="my-3 rounded-xl overflow-hidden border border-cc-border shadow-card relative group">
                  {lang && (
                    <div className="px-3 py-1.5 bg-cc-code-bg/80 border-b border-cc-border text-[10px] text-cc-muted font-mono-code uppercase tracking-wider">
                      {lang}
                    </div>
                  )}
                  <CopyButton text={codeText.replace(/\n$/, "")} />
                  <pre className="px-4 py-3 bg-cc-code-bg text-cc-code-fg text-[13px] font-mono-code leading-relaxed overflow-x-auto">
                    <HighlightedCode code={codeText} lang={lang} />
                  </pre>
                </div>
              );
            }

            return (
              <code className="px-1.5 py-0.5 rounded-md bg-cc-code-bg/20 text-[13px] font-mono-code text-cc-primary">
                {children}
              </code>
            );
          },
          pre: ({ children }) => <>{children}</>,
          table: ({ children }) => (
            <div className="overflow-x-auto my-2">
              <table className="min-w-full text-sm border border-cc-border rounded-lg overflow-hidden">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-cc-code-bg/50">{children}</thead>
          ),
          th: ({ children }) => (
            <th className="px-3 py-1.5 text-left text-xs font-semibold text-cc-fg border-b border-cc-border">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="px-3 py-1.5 text-xs text-cc-fg border-b border-cc-border">
              {children}
            </td>
          ),
        }}
      >
        {text}
      </Markdown>
    </div>
  );
}

function ContentBlockRenderer({ block }: { block: ContentBlock }) {
  if (block.type === "text") {
    return <MarkdownContent text={block.text} />;
  }

  if (block.type === "thinking") {
    return <ThinkingBlock text={block.thinking} />;
  }

  if (block.type === "tool_use") {
    return <ToolBlock name={block.name} input={block.input} toolUseId={block.id} />;
  }

  if (block.type === "tool_result") {
    const content = typeof block.content === "string" ? block.content : JSON.stringify(block.content);
    const isError = block.is_error;
    return (
      <div className={`text-xs font-mono-code rounded-lg px-3 py-2 border ${
        isError
          ? "bg-cc-error/5 border-cc-error/20 text-cc-error"
          : "bg-cc-card border-cc-border text-cc-muted"
      } max-h-40 overflow-y-auto whitespace-pre-wrap`}>
        {content}
      </div>
    );
  }

  return null;
}

function ToolGroupBlock({ name, items }: { name: string; items: ToolGroupItem[] }) {
  const [open, setOpen] = useState(false);
  const iconType = getToolIcon(name);
  const label = getToolLabel(name);
  const borderColor = getToolBorderColor(name);

  return (
    <div className={`border border-cc-border border-l-[3px] ${borderColor} rounded-xl overflow-hidden bg-cc-card shadow-card`}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left hover:bg-cc-hover transition-all duration-150 cursor-pointer"
      >
        <svg
          viewBox="0 0 16 16"
          fill="currentColor"
          className={`w-3 h-3 text-cc-muted transition-transform shrink-0 ${open ? "rotate-90" : ""}`}
        >
          <path d="M6 4l4 4-4 4" />
        </svg>
        <ToolIcon type={iconType} />
        <span className="text-xs font-medium text-cc-fg">{label}</span>
        <span className="text-[10px] text-cc-muted bg-cc-hover rounded-full px-1.5 py-0.5 tabular-nums">
          {items.length}
        </span>
      </button>

      {open && (
        <div className="border-t border-cc-border px-3 py-1.5">
          {items.map((item, i) => {
            const preview = getPreview(item.name, item.input);
            return (
              <div key={item.id || i} className="flex items-center gap-2 py-1 text-xs text-cc-muted font-mono-code truncate">
                <span className="w-1 h-1 rounded-full bg-cc-muted/40 shrink-0" />
                <span className="truncate">{preview || JSON.stringify(item.input).slice(0, 80)}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ThinkingBlock({ text }: { text: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border border-cc-border rounded-xl overflow-hidden bg-cc-card/50">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-3 py-2.5 text-xs text-cc-muted hover:bg-cc-hover transition-all duration-150 cursor-pointer"
      >
        <svg
          viewBox="0 0 16 16"
          fill="currentColor"
          className={`w-3 h-3 transition-transform duration-200 ${open ? "rotate-90" : ""}`}
        >
          <path d="M6 4l4 4-4 4" />
        </svg>
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3.5 h-3.5 text-cc-muted/60">
          <circle cx="8" cy="8" r="5" />
          <path d="M6 6.5c0-.83.67-1.5 1.5-1.5h1c.83 0 1.5.67 1.5 1.5 0 .56-.32 1.07-.8 1.3l-.7.35V9" strokeLinecap="round" />
          <circle cx="8" cy="10.5" r="0.5" fill="currentColor" stroke="none" />
        </svg>
        <span className="font-medium">Thinking</span>
        <span className="text-cc-muted/40 font-mono-code text-[10px]">{text.length} chars</span>
      </button>
      {open && (
        <div className="px-3 pb-3 pt-0 border-t border-cc-border animate-[fadeIn_0.15s_ease-out]">
          <pre className="mt-2 text-xs text-cc-muted font-mono-code whitespace-pre-wrap leading-relaxed max-h-60 overflow-y-auto">
            {text}
          </pre>
        </div>
      )}
    </div>
  );
}
