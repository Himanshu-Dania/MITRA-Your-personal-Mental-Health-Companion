import React, { useState, useRef } from "react";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

const ChatWidget: React.FC = () => {
    const [messages, setMessages] = useState<
        { from: "user" | "bot" | "system"; text: string }[]
    >([]);
    const [input, setInput] = useState("");
    const [isStreaming, setIsStreaming] = useState(false);
    const sessionIdRef = useRef<string>(`session-${Date.now()}`);

    const append = (from: "user" | "bot" | "system", text: string) => {
        setMessages((m) => [...m, { from, text }]);
    };

    const handleSubmit = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!input.trim() || isStreaming) return;

        const message = input.trim();
        setInput("");
        append("user", message);

        setIsStreaming(true);
        append("bot", ""); // placeholder for streamed content

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
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                const chunk = decoder.decode(value);
                // SSE frames may arrive fragmented; split by newlines
                const lines = chunk.split("\n");
                for (const line of lines) {
                    if (line.startsWith("data: ")) {
                        try {
                            const payload = JSON.parse(line.slice(6));
                            if (payload.content) {
                                botText += payload.content;
                                // update last bot message
                                setMessages((prev) => {
                                    const copy = [...prev];
                                    // replace last bot placeholder
                                    const lastIndex = copy
                                        .map((m) => m.from)
                                        .lastIndexOf("bot");
                                    if (lastIndex !== -1)
                                        copy[lastIndex] = {
                                            from: "bot",
                                            text: botText,
                                        };
                                    return copy;
                                });
                            } else if (payload.error) {
                                setMessages((prev) => [
                                    ...prev,
                                    {
                                        from: "system",
                                        text: `Error: ${payload.error}`,
                                    },
                                ]);
                            }
                        } catch (err) {
                            console.error("Parse error", err);
                        }
                    }
                }
            }
        } catch (err: any) {
            console.error("Chat error", err);
            append("system", `Error: ${err?.message || err}`);
        } finally {
            setIsStreaming(false);
        }
    };

    return (
        <div className="bg-white rounded-lg shadow-md p-4">
            <h3 className="text-lg font-bold mb-2">Chat Companion</h3>
            <div className="h-48 overflow-y-auto border p-2 mb-3">
                {messages.length === 0 && (
                    <div className="text-sm text-gray-500">
                        Say hi to start the chat.
                    </div>
                )}
                {messages.map((m, i) => (
                    <div
                        key={i}
                        className={`mb-2 ${m.from === "user" ? "text-right" : ""}`}
                    >
                        <div
                            className={`inline-block p-2 rounded ${m.from === "user" ? "bg-blue-500 text-white" : m.from === "bot" ? "bg-gray-100 text-black" : "bg-yellow-50 text-black"}`}
                        >
                            {m.text}
                        </div>
                    </div>
                ))}
            </div>

            <form onSubmit={handleSubmit} className="flex gap-2">
                <input
                    className="flex-1 border rounded px-3 py-2"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={
                        isStreaming
                            ? "Waiting for response..."
                            : "Type a message..."
                    }
                    disabled={isStreaming}
                />
                <button
                    type="submit"
                    className="px-4 py-2 bg-[#C66408] text-white rounded"
                    disabled={isStreaming}
                >
                    Send
                </button>
            </form>
        </div>
    );
};

export default ChatWidget;
