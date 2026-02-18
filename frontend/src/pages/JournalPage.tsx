import React, { useState } from "react";
import { Link } from "react-router-dom";
import Header from "../components/Header";

const JournalPage: React.FC = () => {
    const [entry, setEntry] = useState("");
    const [saved, setSaved] = useState(false);

    const handleSave = () => {
        // TODO: persist to backend
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    const today = new Date().toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
    });

    return (
        <div className="min-h-screen bg-[#F9FAFB]">
            <Header />
            <main className="max-w-2xl mx-auto px-4 py-12">
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-[#1F2937]">
                        Journal
                    </h1>
                    <p className="text-sm text-[#6B7280] mt-1">{today}</p>
                </div>

                <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
                    <textarea
                        value={entry}
                        onChange={(e) => setEntry(e.target.value)}
                        placeholder="Write freely… this is your private space."
                        rows={16}
                        className="w-full p-6 text-sm text-[#1F2937] leading-relaxed resize-none focus:outline-none placeholder:text-[#9CA3AF]"
                    />
                    <div className="border-t border-gray-100 px-6 py-4 flex items-center justify-between">
                        <span className="text-xs text-[#9CA3AF]">
                            {entry.length} characters
                        </span>
                        <button
                            onClick={handleSave}
                            disabled={!entry.trim()}
                            className="px-5 py-2 rounded-lg bg-[#C66408] text-white font-semibold text-sm hover:bg-[#B35C07] transition-colors disabled:opacity-40 focus:outline-none focus:ring-2 focus:ring-[#C66408] focus:ring-offset-2"
                        >
                            {saved ? "✓ Saved!" : "Save Entry"}
                        </button>
                    </div>
                </div>

                <div className="mt-6 text-center">
                    <Link
                        to="/"
                        className="text-sm text-[#6B7280] hover:text-[#C66408] transition-colors"
                    >
                        ← Back to Home
                    </Link>
                </div>
            </main>
        </div>
    );
};

export default JournalPage;
