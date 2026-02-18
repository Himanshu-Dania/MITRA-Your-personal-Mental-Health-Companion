import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header";

const MOOD_EMOJIS = ["😞", "😔", "😐", "🙂", "😊", "😄"];

const ActionCard: React.FC<{
    emoji: string;
    title: string;
    description: string;
    onClick: () => void;
}> = ({ emoji, title, description, onClick }) => (
    <button
        onClick={onClick}
        className="card-hover text-left w-full bg-white rounded-xl shadow-md p-6 flex items-start gap-4 border border-gray-100 focus:outline-none focus:ring-2 focus:ring-[#C66408]"
    >
        <span className="text-3xl">{emoji}</span>
        <div>
            <p className="font-semibold text-[#1F2937] text-base">{title}</p>
            <p className="text-sm text-[#6B7280] mt-1">{description}</p>
        </div>
    </button>
);

const HomePage: React.FC = () => {
    const navigate = useNavigate();
    const [mood, setMood] = useState(3);
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        const u = localStorage.getItem("user");
        if (!u) navigate("/login");
    }, [navigate]);

    const handleSave = () => {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    const emojiIndex = Math.min(
        Math.floor((mood / 10) * MOOD_EMOJIS.length),
        MOOD_EMOJIS.length - 1,
    );

    return (
        <div className="min-h-screen bg-[#F9FAFB]">
            <Header />

            <main className="max-w-2xl mx-auto px-4 py-12">
                {/* Greeting */}
                <div className="text-center mb-10">
                    <h1 className="text-3xl font-bold text-[#1F2937] mb-2">
                        How are you feeling today?
                    </h1>
                    <p className="text-[#6B7280] text-sm">
                        Take a moment to check in with yourself.
                    </p>
                </div>

                {/* Mood Slider Card */}
                <div className="bg-white rounded-xl shadow-md p-8 mb-8 border border-gray-100">
                    <div className="flex justify-between text-xs text-[#6B7280] mb-3 px-1">
                        <span>Very low</span>
                        <span>Neutral</span>
                        <span>Very positive</span>
                    </div>

                    <div className="flex items-center gap-4">
                        <input
                            type="range"
                            min={0}
                            max={10}
                            value={mood}
                            onChange={(e) => setMood(Number(e.target.value))}
                            className="w-full h-3 rounded-full cursor-pointer"
                        />
                        <span className="text-4xl select-none">
                            {MOOD_EMOJIS[emojiIndex]}
                        </span>
                    </div>

                    <div className="flex justify-center mt-6">
                        <button
                            onClick={handleSave}
                            className="px-6 py-2 rounded-lg bg-[#C66408] text-white font-semibold hover:bg-[#B35C07] transition-colors focus:outline-none focus:ring-2 focus:ring-[#C66408] focus:ring-offset-2"
                        >
                            {saved ? "✓ Saved!" : "Save Check-In"}
                        </button>
                    </div>
                </div>

                {/* Action Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <ActionCard
                        emoji="🐶"
                        title="Talk to MITRA"
                        description="Chat with your companion for support and reflection."
                        onClick={() => navigate("/pet")}
                    />
                    <ActionCard
                        emoji="📓"
                        title="Journal"
                        description="Write your thoughts freely in a private space."
                        onClick={() => navigate("/journal")}
                    />
                    <ActionCard
                        emoji="✅"
                        title="Tasks"
                        description="Set gentle goals and build healthy habits."
                        onClick={() => navigate("/tasks")}
                    />
                </div>
            </main>

            <footer className="text-center text-xs text-[#6B7280] py-8">
                &copy; {new Date().getFullYear()} MITRA
            </footer>
        </div>
    );
};

export default HomePage;
