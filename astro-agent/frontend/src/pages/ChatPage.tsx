import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { clsx } from "clsx";
import { StarBackground } from "../components/StarBackground";
import { MessageBubble } from "../components/MessageBubble";
import { ToolBadge } from "../components/ToolBadge";
import { TypingIndicator } from "../components/TypingIndicator";
import { useChatStream } from "../hooks/useChatStream";

// ─── Suggested Questions ──────────────────────────────────────────────────────

const SUGGESTED_QUESTIONS = [
  "What is my sun sign and what does it mean?",
  "Tell me about my moon sign and emotions",
  "What is my rising sign and how does it affect me?",
  "Give me a full reading of my birth chart",
  "What planets are in retrograde for me?",
  "What does my ascendant say about my personality?",
];

export function ChatPage() {
  const navigate = useNavigate();
  const { messages, toolExecutions, isStreaming, isWaiting, error, sendMessage, clearError } =
    useChatStream();

  const [input, setInput] = useState("");
  const [threadId, setThreadId] = useState<string>("");
  const [userName, setUserName] = useState<string>("");
  const [showSuggestions, setShowSuggestions] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Load profile from localStorage
  useEffect(() => {
    const tid = localStorage.getItem("astro_thread_id");
    const name = localStorage.getItem("astro_user_name");

    if (!tid) {
      navigate("/");
      return;
    }

    setThreadId(tid);
    setUserName(name || "Explorer");
  }, [navigate]);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isWaiting, toolExecutions]);

  // Hide suggestions after first message
  useEffect(() => {
    if (messages.length > 0) setShowSuggestions(false);
  }, [messages.length]);

  const handleSend = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || !threadId || isStreaming || isWaiting) return;
    setInput("");
    clearError();
    await sendMessage(trimmed, threadId);
    inputRef.current?.focus();
  }, [input, threadId, isStreaming, isWaiting, sendMessage, clearError]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSuggestion = (q: string) => {
    setInput(q);
    inputRef.current?.focus();
  };

  const handleLogout = () => {
    if (window.confirm("Start over with a new birth profile?")) {
      localStorage.clear();
      navigate("/");
    }
  };

  const activeTools = toolExecutions.filter((t) => t.isActive);
  const completedTools = toolExecutions.filter((t) => t.isComplete);
  const isBusy = isStreaming || isWaiting;
  const birthCity = localStorage.getItem("astro_birth_city") || "";

  return (
    <div className="min-h-screen flex flex-col relative">
      <StarBackground />

      {/* ── Header ── */}
      <header className="relative z-10 border-b border-white/10 backdrop-blur-md bg-void-900/60 flex-shrink-0">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cosmos-500 to-nebula-500 flex items-center justify-center text-base shadow-lg shadow-cosmos-500/30">
              ⭐
            </div>
            <div>
              <h1 className="text-sm font-semibold text-white">AstroAgent</h1>
              <p className="text-xs text-white/40">Swiss Ephemeris · AI Powered</p>
            </div>
          </div>

          {/* User info */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:block text-right">
              <p className="text-xs text-white/70 font-medium">{userName}</p>
              {birthCity && <p className="text-xs text-white/30">Born in {birthCity}</p>}
            </div>
            <button
              onClick={handleLogout}
              className="w-8 h-8 rounded-lg glass-card flex items-center justify-center hover:bg-white/10 transition-colors"
              title="Change birth profile"
              id="logout-button"
            >
              <span className="text-sm text-white/50">↩</span>
            </button>
          </div>
        </div>
      </header>

      {/* ── Messages area ── */}
      <main className="relative z-10 flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
          {/* Welcome state */}
          {messages.length === 0 && !isBusy && (
            <div className="text-center py-12 animate-[fadeIn_0.5s_ease-out]">
              <div className="text-5xl mb-4">🌟</div>
              <h2 className="text-2xl font-bold text-white mb-2">
                Welcome, {userName}!
              </h2>
              <p className="text-white/50 text-sm max-w-sm mx-auto">
                Your birth chart is ready to explore. Ask me anything about your
                planetary positions, zodiac signs, or what the stars reveal about you.
              </p>
            </div>
          )}

          {/* Suggested questions */}
          {showSuggestions && messages.length === 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 animate-[slideUp_0.4s_ease-out]">
              {SUGGESTED_QUESTIONS.map((q) => (
                <button
                  key={q}
                  onClick={() => handleSuggestion(q)}
                  className="glass-card-hover text-left px-4 py-3 text-sm text-white/70 hover:text-white group"
                  id={`suggestion-${q.slice(0, 20).replace(/\s+/g, "-").toLowerCase()}`}
                >
                  <span className="text-cosmos-400 group-hover:text-cosmos-300 mr-2">✦</span>
                  {q}
                </button>
              ))}
            </div>
          )}

          {/* Message list */}
          {messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} />
          ))}

          {/* Tool execution badges (shown during streaming) */}
          {(activeTools.length > 0 || completedTools.length > 0) && (
            <div className="flex flex-wrap gap-2 pl-11 animate-[fadeIn_0.3s_ease-out]">
              {completedTools.map((t) => (
                <ToolBadge key={t.id} toolName={t.toolName} isComplete success={t.success} />
              ))}
              {activeTools.map((t) => (
                <ToolBadge key={t.id} toolName={t.toolName} isActive />
              ))}
            </div>
          )}

          {/* Typing indicator */}
          {isWaiting && <TypingIndicator />}

          {/* Error */}
          {error && (
            <div className="flex items-start gap-3 animate-[fadeIn_0.3s_ease-out]">
              <div className="w-8 h-8 flex-shrink-0" />
              <div className="glass-card px-4 py-3 border-red-500/20 bg-red-500/5 text-sm text-red-300 flex items-start gap-2">
                <span>⚠️</span>
                <div>
                  <p className="font-medium mb-1">Something went wrong</p>
                  <p className="text-red-300/70 text-xs">{error}</p>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* ── Input area ── */}
      <footer className="relative z-10 border-t border-white/10 backdrop-blur-md bg-void-900/60 flex-shrink-0">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div
            className={clsx(
              "flex items-end gap-3 rounded-2xl p-3",
              "bg-white/5 border transition-all duration-300",
              isBusy
                ? "border-white/10 opacity-80"
                : "border-white/15 hover:border-cosmos-500/40 focus-within:border-cosmos-500/60 focus-within:shadow-lg focus-within:shadow-cosmos-500/10"
            )}
          >
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isBusy ? "AstroAgent is thinking..." : "Ask about your birth chart, planetary positions, zodiac..."}
              className="flex-1 bg-transparent text-white placeholder-white/25 text-sm resize-none outline-none min-h-[44px] max-h-40 leading-relaxed py-1"
              disabled={isBusy}
              rows={1}
              id="chat-input"
              style={{
                height: "auto",
                overflowY: input.split("\n").length > 3 ? "auto" : "hidden",
              }}
              onInput={(e) => {
                const el = e.currentTarget;
                el.style.height = "auto";
                el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
              }}
            />

            <button
              onClick={handleSend}
              disabled={!input.trim() || isBusy}
              className={clsx(
                "flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200",
                input.trim() && !isBusy
                  ? "bg-gradient-to-br from-cosmos-500 to-nebula-500 text-white shadow-lg shadow-cosmos-500/30 hover:scale-105 active:scale-95"
                  : "bg-white/10 text-white/20 cursor-not-allowed"
              )}
              id="send-button"
              aria-label="Send message"
            >
              {isBusy ? (
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                </svg>
              )}
            </button>
          </div>

          <p className="text-center text-xs text-white/20 mt-2">
            Press <kbd className="bg-white/10 px-1 rounded text-white/30">Enter</kbd> to send · <kbd className="bg-white/10 px-1 rounded text-white/30">Shift+Enter</kbd> for new line
          </p>
        </div>
      </footer>
    </div>
  );
}
