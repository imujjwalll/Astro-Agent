export function TypingIndicator() {
  return (
    <div className="flex gap-3 message-enter">
      {/* AI Avatar */}
      <div className="flex-shrink-0">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-void-600 to-void-700 border border-cosmos-500/30 flex items-center justify-center shadow-lg shadow-cosmos-500/20">
          <span className="text-base leading-none" role="img" aria-label="AstroAgent thinking">⭐</span>
        </div>
      </div>

      {/* Typing bubble */}
      <div className="glass-card px-4 py-3 rounded-2xl rounded-tl-sm flex items-center gap-1.5">
        <div
          className="w-2 h-2 rounded-full bg-cosmos-400"
          style={{ animation: "typing 1.2s ease-in-out infinite", animationDelay: "0ms" }}
        />
        <div
          className="w-2 h-2 rounded-full bg-cosmos-400"
          style={{ animation: "typing 1.2s ease-in-out infinite", animationDelay: "200ms" }}
        />
        <div
          className="w-2 h-2 rounded-full bg-cosmos-400"
          style={{ animation: "typing 1.2s ease-in-out infinite", animationDelay: "400ms" }}
        />
      </div>
    </div>
  );
}
