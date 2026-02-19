import React, { useState, useRef, useEffect, useCallback } from "react";
import Header from "../components/Header";

const ML_API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";
const BACKEND_URL =
    process.env.REACT_APP_BACKEND_URL || "http://localhost:3000";

interface Message {
    from: "user" | "bot" | "system";
    text: string;
}

interface ToolEvent {
    name: string;
    args?: Record<string, unknown>;
    result?: string;
    id?: string;
}

interface DBConversation {
    _id: string;
    title: string;
    lastMessageAt?: string;
    createdAt: string;
}

interface LocalConv {
    conversationId: string; // always a real MongoDB _id string
    label: string;
    messages: Message[];
    toolEvents: ToolEvent[];
}

function getAuth() {
    try {
        const raw = localStorage.getItem("user");
        if (!raw) return { userId: "guest", token: "" };
        const u = JSON.parse(raw);
        return { userId: u._id as string, token: u.token as string };
    } catch {
        return { userId: "guest", token: "" };
    }
}

const PetPage: React.FC = () => {
    const { userId, token } = getAuth();

    const [conversations, setConversations] = useState<LocalConv[]>([]);
    const [activeId, setActiveId] = useState<string | null>(null);
    const [input, setInput] = useState("");
    const [isStreaming, setIsStreaming] = useState(false);
    const [loadingMsgs, setLoadingMsgs] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const active =
        conversations.find((c) => c.conversationId === activeId) ?? null;

    // ── Load conversation list from DB ──────────────────────────────────────
    const fetchConversations = useCallback(async () => {
        if (!token) return;
        try {
            const res = await fetch(`${BACKEND_URL}/api/conversations`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) return;
            const data: DBConversation[] = await res.json();
            setConversations((prev) => {
                const dbConvs: LocalConv[] = data.map((d) => {
                    const existing = prev.find(
                        (c) => c.conversationId === d._id,
                    );
                    return {
                        conversationId: d._id,
                        label: d.title || "Conversation",
                        messages: existing?.messages ?? [],
                        toolEvents: existing?.toolEvents ?? [],
                    };
                });
                // Preserve any local-only (temp) conversations not yet in DB
                const localOnly = prev.filter(
                    (c) => !data.some((d) => d._id === c.conversationId),
                );
                return [...localOnly, ...dbConvs];
            });
        } catch {
            // silent
        }
    }, [token]);

    useEffect(() => {
        fetchConversations().then(() => {
            setConversations((prev) => {
                if (prev.length === 0) {
                    // No conversations yet — we'll create one on first message
                    // For now set a placeholder; handleNewConversation will replace it
                    setActiveId(null);
                    return [];
                }
                setActiveId((cur) => cur ?? prev[0].conversationId);
                return prev;
            });
        });
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [active?.messages]);

    // ── Load messages for a DB conversation on demand ───────────────────────
    const loadMessagesFromDB = useCallback(
        async (conv: LocalConv) => {
            if (conv.messages.length > 0) return;
            setLoadingMsgs(true);
            try {
                const res = await fetch(
                    `${BACKEND_URL}/api/conversations/${conv.conversationId}/messages`,
                    { headers: { Authorization: `Bearer ${token}` } },
                );
                if (!res.ok) return;
                const data = await res.json();
                const msgs: Message[] = data.map(
                    (m: { role: string; content: string }) => ({
                        from: m.role === "user" ? "user" : "bot",
                        text: m.content,
                    }),
                );
                const events: ToolEvent[] = [];
                for (const m of data) {
                    if (m.toolCalls && typeof m.toolCalls === "object") {
                        for (const ev of Object.values(
                            m.toolCalls,
                        ) as ToolEvent[]) {
                            if (ev?.name) events.push(ev);
                        }
                    }
                }
                setConversations((prev) =>
                    prev.map((c) =>
                        c.conversationId === conv.conversationId
                            ? { ...c, messages: msgs, toolEvents: events }
                            : c,
                    ),
                );
            } finally {
                setLoadingMsgs(false);
            }
        },
        [token],
    );

    const handleSelectConv = (conv: LocalConv) => {
        setActiveId(conv.conversationId);
        loadMessagesFromDB(conv);
    };

    // ── New conversation ────────────────────────────────────────────────────
    const handleNewConversation = async () => {
        if (!token) return;
        try {
            const res = await fetch(`${BACKEND_URL}/api/conversations`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ title: "New Conversation" }),
            });
            if (!res.ok) return;
            const conv = await res.json();
            const newConv: LocalConv = {
                conversationId: conv._id,
                label: "New Conversation",
                messages: [],
                toolEvents: [],
            };
            setConversations((c) => [newConv, ...c]);
            setActiveId(conv._id);
        } catch {
            // silent
        }
    };

    // ── Delete conversation ─────────────────────────────────────────────────
    const handleDelete = async (conv: LocalConv, e: React.MouseEvent) => {
        e.stopPropagation();
        if (token) {
            await fetch(
                `${BACKEND_URL}/api/conversations/${conv.conversationId}`,
                {
                    method: "DELETE",
                    headers: { Authorization: `Bearer ${token}` },
                },
            );
        }
        setConversations((prev) => {
            const remaining = prev.filter(
                (c) => c.conversationId !== conv.conversationId,
            );
            if (activeId === conv.conversationId) {
                setActiveId(remaining[0]?.conversationId ?? null);
            }
            return remaining;
        });
    };

    // ── State helpers ────────────────────────────────────────────────────────
    const updateConv = (
        cid: string,
        updater: (c: LocalConv) => Partial<LocalConv>,
    ) =>
        setConversations((prev) =>
            prev.map((c) =>
                c.conversationId === cid ? { ...c, ...updater(c) } : c,
            ),
        );

    const appendMsg = (cid: string, msg: Message) =>
        updateConv(cid, (c) => ({ messages: [...c.messages, msg] }));

    // ── Send message ─────────────────────────────────────────────────────────
    const handleSubmit = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!input.trim() || isStreaming) return;

        // Ensure we have an active conversation — create one on-the-fly if needed
        let currentConvId = activeId;
        if (!currentConvId) {
            if (!token) return;
            try {
                const res = await fetch(`${BACKEND_URL}/api/conversations`, {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ title: "New Conversation" }),
                });
                if (!res.ok) return;
                const conv = await res.json();
                currentConvId = conv._id;
                const newConv: LocalConv = {
                    conversationId: conv._id,
                    label: "New Conversation",
                    messages: [],
                    toolEvents: [],
                };
                setConversations((c) => [newConv, ...c]);
                setActiveId(conv._id);
            } catch {
                return;
            }
        }

        // After the block above, currentConvId is guaranteed to be a string
        const safeConvId = currentConvId as string;

        const message = input.trim();
        setInput("");
        appendMsg(safeConvId, { from: "user", text: message });

        const currentConv = conversations.find(
            (c) => c.conversationId === safeConvId,
        );
        if (currentConv && currentConv.messages.length === 0) {
            updateConv(safeConvId, () => ({
                label: message.slice(0, 32) + (message.length > 32 ? "…" : ""),
            }));
        }

        setIsStreaming(true);
        appendMsg(safeConvId, { from: "bot", text: "" });
        const capturedConvId = safeConvId;

        try {
            const res = await fetch(`${ML_API_URL}/chat`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    message,
                    conversationId: capturedConvId,
                    userId,
                }),
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);

            const reader = res.body!.getReader();
            const decoder = new TextDecoder();
            let botText = "";

            const processChunk = (raw: string) => {
                for (const line of raw.split("\n")) {
                    if (!line.startsWith("data: ")) continue;
                    try {
                        const payload = JSON.parse(line.slice(6));
                        if (payload.content) {
                            botText += payload.content;
                            const captured = botText;
                            setConversations((prev) =>
                                prev.map((c) => {
                                    if (c.conversationId !== capturedConvId)
                                        return c;
                                    const copy = [...c.messages];
                                    const lastBot = copy
                                        .map((m) => m.from)
                                        .lastIndexOf("bot");
                                    if (lastBot !== -1)
                                        copy[lastBot] = {
                                            from: "bot",
                                            text: captured,
                                        };
                                    return { ...c, messages: copy };
                                }),
                            );
                        } else if (payload.toolEvents) {
                            setConversations((prev) =>
                                prev.map((c) =>
                                    c.conversationId === capturedConvId
                                        ? {
                                              ...c,
                                              toolEvents: [
                                                  ...c.toolEvents,
                                                  ...(payload.toolEvents as ToolEvent[]),
                                              ],
                                          }
                                        : c,
                                ),
                            );
                        } else if (payload.error) {
                            appendMsg(capturedConvId, {
                                from: "system",
                                text: `Error: ${payload.error}`,
                            });
                        }
                    } catch {}
                }
            };

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                processChunk(decoder.decode(value));
            }

            await fetchConversations(); // refresh sidebar titles/order
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            appendMsg(capturedConvId, {
                from: "system",
                text: `Error: ${msg}`,
            });
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

    // ── Tool event label helper ───────────────────────────────────────────────
    const toolLabel = (ev: ToolEvent) => {
        if (ev.name === "create_therapy_task") {
            const text = (
                ev.result ??
                (ev.args?.reason_for_task_creation as string) ??
                "Task created"
            ).slice(0, 48);
            return { icon: "🎯", text };
        }
        if (ev.name === "save_memory_to_db") {
            const text = ((ev.args?.memory as string) ?? "Memory saved").slice(
                0,
                48,
            );
            return { icon: "💾", text };
        }
        return { icon: "🔧", text: ev.name };
    };

    return (
        <div className="flex flex-col min-h-screen bg-[#F9FAFB]">
            <Header />

            <div className="text-center py-6">
                <h1 className="text-2xl font-bold text-[#1F2937]">
                    Therapy Companion 🐶
                </h1>
                <p className="text-sm text-[#6B7280] mt-1">
                    A safe space to talk, reflect, and feel heard.
                </p>
            </div>

            <div className="flex flex-1 max-w-5xl mx-auto w-full px-4 pb-10 gap-6">
                {/* ─── Sidebar ─── */}
                <aside className="hidden md:flex flex-col w-64 shrink-0 gap-3">
                    {/* Conversation list */}
                    <div className="bg-white rounded-xl shadow-md p-4 flex flex-col gap-3 flex-1">
                        <button
                            onClick={handleNewConversation}
                            className="w-full px-4 py-2 rounded-lg bg-[#C66408] text-white font-semibold text-sm hover:bg-[#B35C07] transition-colors focus:outline-none focus:ring-2 focus:ring-[#C66408]"
                        >
                            + New Conversation
                        </button>
                        <div className="flex-1 overflow-y-auto space-y-1">
                            {conversations.map((c) => (
                                <div
                                    key={c.conversationId}
                                    className={`group flex items-center gap-1 w-full rounded-lg text-sm transition-colors px-3 py-2 cursor-pointer ${
                                        c.conversationId === activeId
                                            ? "bg-[#FFEEDB] text-[#C66408] font-semibold"
                                            : "text-[#6B7280] hover:bg-gray-50"
                                    }`}
                                    onClick={() => handleSelectConv(c)}
                                >
                                    <span className="flex-1 truncate">
                                        {c.label}
                                    </span>
                                    <button
                                        onClick={(e) => handleDelete(c, e)}
                                        className="opacity-0 group-hover:opacity-100 ml-1 text-gray-300 hover:text-red-400 transition text-lg leading-none focus:outline-none"
                                        title="Delete"
                                        aria-label="Delete conversation"
                                    >
                                        ×
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Session activity panel */}
                    {active && active.toolEvents.length > 0 && (
                        <div className="bg-white rounded-xl shadow-md p-4 flex flex-col gap-2">
                            <p className="text-xs font-semibold text-[#C66408] uppercase tracking-wide mb-1">
                                Session Activity
                            </p>
                            <div className="space-y-1 max-h-52 overflow-y-auto">
                                {active.toolEvents.map((ev, i) => {
                                    const { icon, text } = toolLabel(ev);
                                    return (
                                        <div
                                            key={i}
                                            className="flex items-start gap-2 text-xs text-[#374151] bg-[#F9FAFB] rounded-lg px-3 py-2"
                                        >
                                            <span>{icon}</span>
                                            <span className="leading-snug">
                                                {text}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </aside>

                {/* ─── Main chat ─── */}
                <div className="flex-1 flex flex-col bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100 min-h-[520px]">
                    <div className="flex-1 overflow-y-auto p-6 space-y-4">
                        {loadingMsgs && (
                            <p className="text-center text-xs text-[#6B7280] py-4">
                                Loading history…
                            </p>
                        )}
                        {active &&
                            active.messages.length === 0 &&
                            !loadingMsgs && (
                                <div className="flex flex-col items-center justify-center h-full text-center text-[#6B7280] gap-3 py-12">
                                    <span className="text-5xl">🐶</span>
                                    <p className="text-base font-medium">
                                        Hey there! I'm here for you.
                                    </p>
                                    <p className="text-sm">
                                        Share what's on your mind whenever
                                        you're ready.
                                    </p>
                                </div>
                            )}
                        {active?.messages.map((m, i) => (
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

                    {/* Tool events strip (mobile) */}
                    {active && active.toolEvents.length > 0 && (
                        <div className="md:hidden border-t border-gray-100 px-4 py-2 flex gap-2 overflow-x-auto">
                            {active.toolEvents.map((ev, i) => {
                                const { icon, text } = toolLabel(ev);
                                return (
                                    <span
                                        key={i}
                                        className="shrink-0 flex items-center gap-1 bg-[#FFF7ED] border border-[#FFEEDB] text-[#C66408] text-xs rounded-full px-3 py-1"
                                    >
                                        {icon} {text}
                                    </span>
                                );
                            })}
                        </div>
                    )}

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
