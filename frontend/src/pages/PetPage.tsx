import React, { useState, useRef, useEffect } from "react";
import Header from "../components/Header";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

interface Message {
    from: "user" | "bot" | "system";
    text: string;
}

interface Conversation {
    id: string;
    label: string;
    messages: Message[];
}

const PetPage: React.FC = () => {
    const [conversations, setConversations] = useState<Conversation[]>([
        { id: "conv-1", label: "Conversation 1", messages: [] },
    ]);
    const [activeId, setActiveId] = useState("conv-1");
    const [input, setInput] = useState("");
    const [isStreaming, setIsStreaming] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const sessionIdRef = useRef<string>(`session-${Date.now()}`);

    const active = conversations.find((c) => c.id === activeId)!;

    const updateMessages = (
        id: string,
        updater: (msgs: Message[]) => Message[],
    ) => {
        setConversations((convs) =>
            convs.map((c) =>
                c.id === id ? { ...c, messages: updater(c.messages) } : c,
            ),
        );
    };

    const append = (from: Message["from"], text: string) => {
        updateMessages(activeId, (m) => [...m, { from, text }]);
    };

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [active?.messages]);

    const handleNewConversation = () => {
        const id = `conv-${Date.now()}`;
        const label = `Conversation ${conversations.length + 1}`;
        setConversations((c) => [...c, { id, label, messages: [] }]);
        setActiveId(id);
        sessionIdRef.current = `session-${Date.now()}`;
    };

    const handleSubmit = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!input.trim() || isStreaming) return;

        const message = input.trim();
        setInput("");
        append("user", message);

        // auto-label first message
        if (active.messages.length === 0) {
            setConversations((convs) =>
                convs.map((c) =>
                    c.id === activeId
                        ? {
                              ...c,
                              label:
                                  message.slice(0, 30) +
                                  (message.length > 30 ? "…" : ""),
                          }
                        : c,
                ),
            );
        }

        setIsStreaming(true);
        updateMessages(activeId, (m) => [...m, { from: "bot", text: "" }]);

        try {
            const res = await fetch(`${API_URL}/chat`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    message,
                    sessionId: sessionIdRef.current,
                    userId: "web-user",
                }),
            });

            if (!res.ok) throw new Error(`HTTP ${res.status}`);

            const reader = res.body!.getReader();
            const decoder = new TextDecoder();
            let botText = "";

            const processChunk = (chunk: string) => {
                for (const line of chunk.split("\n")) {
                    if (line.startsWith("data: ")) {
                        try {
                            const payload = JSON.parse(line.slice(6));
                            if (payload.content) {
                                botText += payload.content;
                                const captured = botText;
                                updateMessages(activeId, (prev) => {
                                    const copy = [...prev];
                                    const lastBot = copy
                                        .map((m) => m.from)
                                        .lastIndexOf("bot");
                                    if (lastBot !== -1)
                                        copy[lastBot] = {
                                            from: "bot",
                                            text: captured,
                                        };
                                    return copy;
                                });
                            } else if (payload.error) {
                                append("system", `Error: ${payload.error}`);
                            }
                        } catch {}
                    }
                }
            };

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                processChunk(decoder.decode(value));
            }
        } catch (err: any) {
            append("system", `Error: ${err?.message || err}`);
        } finally {
            setIsStreaming(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        }
    };

    return (
        <div className="flex flex-col min-h-screen bg-[#F9FAFB]">
            <Header />

            {/* Page title */}
            <div className="text-center py-6">
                <h1 className="text-2xl font-bold text-[#1F2937]">
                    Therapy Companion 🐶
                </h1>
                <p className="text-sm text-[#6B7280] mt-1">
                    A safe space to talk, reflect, and feel heard.
                </p>
            </div>

            {/* Two-column layout */}
            <div className="flex flex-1 max-w-5xl mx-auto w-full px-4 pb-10 gap-6">
                {/* Sidebar */}
                <aside className="hidden md:flex flex-col w-64 shrink-0">
                    <div className="bg-white rounded-xl shadow-md p-4 flex flex-col gap-3 h-full">
                        <button
                            onClick={handleNewConversation}
                            className="w-full px-4 py-2 rounded-lg bg-[#C66408] text-white font-semibold text-sm hover:bg-[#B35C07] transition-colors focus:outline-none focus:ring-2 focus:ring-[#C66408]"
                        >
                            + New Conversation
                        </button>
                        <div className="flex-1 overflow-y-auto space-y-1">
                            {[...conversations].reverse().map((c) => (
                                <button
                                    key={c.id}
                                    onClick={() => setActiveId(c.id)}
                                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors truncate ${
                                        c.id === activeId
                                            ? "bg-[#FFEEDB] text-[#C66408] font-semibold"
                                            : "text-[#6B7280] hover:bg-gray-50"
                                    }`}
                                >
                                    {c.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </aside>

                {/* Main chat */}
                <div className="flex-1 flex flex-col bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100 min-h-[520px]">
                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-4">
                        {active.messages.length === 0 && (
                            <div className="flex flex-col items-center justify-center h-full text-center text-[#6B7280] gap-3 py-12">
                                <span className="text-5xl">🐶</span>
                                <p className="text-base font-medium">
                                    Hey there! I'm here for you.
                                </p>
                                <p className="text-sm">
                                    Share what's on your mind whenever you're
                                    ready.
                                </p>
                            </div>
                        )}
                        {active.messages.map((m, i) => (
                            <div
                                key={i}
                                className={`flex ${m.from === "user" ? "justify-end" : "justify-start"}`}
                            >
                                <div
                                    className={`max-w-[78%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                                        m.from === "user"
                                            ? "bg-[#FFEEDB] text-[#1F2937] rounded-br-sm"
                                            : m.from === "bot"
                                              ? "bg-[#F3F4F6] text-[#1F2937] rounded-bl-sm"
                                              : "bg-yellow-50 text-yellow-800 text-xs italic"
                                    }`}
                                >
                                    {m.text || (
                                        <span className="inline-flex gap-1 items-center text-[#6B7280]">
                                            <span className="animate-bounce">
                                                ·
                                            </span>
                                            <span className="animate-bounce [animation-delay:0.1s]">
                                                ·
                                            </span>
                                            <span className="animate-bounce [animation-delay:0.2s]">
                                                ·
                                            </span>
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input bar */}
                    <div className="border-t border-gray-100 p-4 bg-white">
                        <form
                            onSubmit={handleSubmit}
                            className="flex items-end gap-3"
                        >
                            <textarea
                                rows={1}
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder={
                                    isStreaming
                                        ? "Waiting…"
                                        : "Type a message… (Enter to send)"
                                }
                                disabled={isStreaming}
                                className="flex-1 resize-none rounded-xl border border-gray-200 px-4 py-3 text-sm bg-[#F9FAFB] focus:outline-none focus:ring-2 focus:ring-[#C66408] disabled:opacity-50 transition-all"
                            />
                            <button
                                type="submit"
                                disabled={isStreaming || !input.trim()}
                                className="px-5 py-3 rounded-xl bg-[#C66408] text-white font-semibold text-sm hover:bg-[#B35C07] transition-colors disabled:opacity-40 focus:outline-none focus:ring-2 focus:ring-[#C66408]"
                            >
                                Send
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PetPage;
