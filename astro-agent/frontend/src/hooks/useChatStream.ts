import { useState, useCallback, useRef } from "react";
import { v4 as uuidv4 } from "uuid";
import type { Message } from "../components/MessageBubble";

const API_BASE = import.meta.env.VITE_API_URL || "";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ToolExecution {
  id: string;
  toolName: string;
  isActive: boolean;
  isComplete: boolean;
  success: boolean;
}

interface UseChatStreamReturn {
  messages: Message[];
  toolExecutions: ToolExecution[];
  isStreaming: boolean;
  isWaiting: boolean;
  error: string | null;
  sendMessage: (content: string, threadId: string) => Promise<void>;
  clearError: () => void;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useChatStream(): UseChatStreamReturn {
  const [messages, setMessages] = useState<Message[]>([]);
  const [toolExecutions, setToolExecutions] = useState<ToolExecution[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isWaiting, setIsWaiting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const clearError = useCallback(() => setError(null), []);

  const sendMessage = useCallback(async (content: string, threadId: string) => {
    if (isStreaming || isWaiting) return;

    // Abort any previous request
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    // Add user message immediately
    const userMessage: Message = {
      id: uuidv4(),
      role: "user",
      content: content.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setError(null);
    setIsWaiting(true);
    setToolExecutions([]);

    // Placeholder for AI message
    const aiMessageId = uuidv4();
    const aiMessage: Message = {
      id: aiMessageId,
      role: "assistant",
      content: "",
      isStreaming: true,
      timestamp: new Date(),
    };

    try {
      const response = await fetch(`${API_BASE}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: content.trim(), threadId }),
        signal: abortRef.current.signal,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Server error: ${response.status}`);
      }

      if (!response.body) throw new Error("No response body for streaming");

      // SSE parsing via ReadableStream
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      setIsWaiting(false);
      setIsStreaming(true);
      setMessages((prev) => [...prev, aiMessage]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;

          // Parse SSE format: "event: <name>" or "data: <json>"
          if (trimmed.startsWith("event:")) continue; // we read event from data

          if (trimmed.startsWith("data:")) {
            const rawData = trimmed.slice(5).trim();
            if (!rawData) continue;

            let streamError: Error | null = null;
            try {
              const parsed = JSON.parse(rawData);

              // Check event type from the surrounding event line — we need to track it
              // Since we're parsing data lines, we check what kind of event it is
              if (parsed.content !== undefined) {
                // Token event
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === aiMessageId
                      ? { ...m, content: m.content + parsed.content }
                      : m
                  )
                );
              } else if (parsed.tool !== undefined && parsed.input !== undefined) {
                // tool_start
                const execId = uuidv4();
                setToolExecutions((prev) => [
                  ...prev,
                  { id: execId, toolName: parsed.tool, isActive: true, isComplete: false, success: false },
                ]);
              } else if (parsed.tool !== undefined && parsed.success !== undefined) {
                // tool_end
                setToolExecutions((prev) =>
                  prev.map((te) =>
                    te.toolName === parsed.tool && te.isActive
                      ? { ...te, isActive: false, isComplete: true, success: parsed.success }
                      : te
                  )
                );
              } else if (parsed.finished) {
                // done
                break;
              } else if (parsed.message) {
                // error
                streamError = new Error(parsed.message);
              }
            } catch (parseErr) {
              if (parseErr instanceof Error && parseErr.message.startsWith("Server error")) {
                throw parseErr;
              }
              // Ignore JSON parse errors for partial SSE data
            }

            if (streamError) throw streamError;
          }
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;

      const msg = err instanceof Error ? err.message : "Connection failed";
      setError(msg);
      setIsWaiting(false);

      // Remove empty AI message on error
      setMessages((prev) =>
        prev.filter((m) => !(m.id === aiMessageId && m.content === ""))
      );
    } finally {
      // Mark AI message as complete
      setMessages((prev) =>
        prev.map((m) =>
          m.id === aiMessageId ? { ...m, isStreaming: false } : m
        )
      );
      setIsStreaming(false);
      setIsWaiting(false);
    }
  }, [isStreaming, isWaiting]);

  return { messages, toolExecutions, isStreaming, isWaiting, error, sendMessage, clearError };
}
