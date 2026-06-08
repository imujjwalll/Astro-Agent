import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { clsx } from "clsx";

export type MessageRole = "user" | "assistant";

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  isStreaming?: boolean;
  timestamp: Date;
}

interface MessageBubbleProps {
  message: Message;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === "user";

  return (
    <div
      className={clsx(
        "flex gap-3 message-enter",
        isUser ? "flex-row-reverse" : "flex-row"
      )}
    >
      {/* Avatar */}
      <div className="flex-shrink-0">
        {isUser ? (
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cosmos-500 to-nebula-500 flex items-center justify-center text-sm font-bold text-white shadow-lg shadow-cosmos-500/30">
            U
          </div>
        ) : (
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-void-600 to-void-700 border border-cosmos-500/30 flex items-center justify-center shadow-lg shadow-cosmos-500/20">
            <span className="text-base leading-none" role="img" aria-label="AstroAgent">⭐</span>
          </div>
        )}
      </div>

      {/* Bubble */}
      <div
        className={clsx(
          "max-w-[75%] md:max-w-[65%] relative",
          isUser ? "items-end" : "items-start"
        )}
      >
        <div
          className={clsx(
            "rounded-2xl px-4 py-3 text-sm leading-relaxed",
            isUser
              ? "bg-gradient-to-br from-cosmos-600 to-cosmos-700 text-white shadow-lg shadow-cosmos-500/25 rounded-tr-sm"
              : "glass-card text-white/90 rounded-tl-sm"
          )}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap">{message.content}</p>
          ) : (
            <div className={clsx("prose-astro", message.isStreaming && !message.content && "stream-cursor")}>
              {message.content ? (
                <>
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {message.content}
                  </ReactMarkdown>
                  {message.isStreaming && (
                    <span className="inline-block w-0.5 h-4 bg-cosmos-400 animate-pulse ml-0.5 align-middle" />
                  )}
                </>
              ) : (
                <span className="text-white/40 italic text-xs">Thinking...</span>
              )}
            </div>
          )}
        </div>

        {/* Timestamp */}
        <div
          className={clsx(
            "text-xs text-white/25 mt-1 px-1",
            isUser ? "text-right" : "text-left"
          )}
        >
          {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </div>
      </div>
    </div>
  );
}
