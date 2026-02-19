import React, { useEffect, useState, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import Header from "../components/Header";
import axios from "axios";
import { User, Therapist } from "../types";
import ProtectedRoute from "../components/ProtectedRoute";

const API = "http://localhost:3000";

interface Memory {
    _id: string;
    content: string;
    memoryType: "instruct" | "info";
    conversationId: string | null;
    createdAt: string;
}

/* ------------------------------------------------------------------ */
/* Memories sub-panel                                                   */
/* ------------------------------------------------------------------ */
const MemoryPanel: React.FC<{ token: string }> = ({ token }) => {
    const [memories, setMemories] = useState<Memory[]>([]);
    const [loadingMem, setLoadingMem] = useState(true);
    const [memError, setMemError] = useState("");

    // add-form state
    const [addContent, setAddContent] = useState("");
    const [addType, setAddType] = useState<"info" | "instruct">("info");
    const [adding, setAdding] = useState(false);

    // edit state
    const [editId, setEditId] = useState<string | null>(null);
    const [editContent, setEditContent] = useState("");
    const [editType, setEditType] = useState<"info" | "instruct">("info");
    const [saving, setSaving] = useState(false);

    const headers = { Authorization: `Bearer ${token}` };

    const fetchMemories = useCallback(async () => {
        setLoadingMem(true);
        try {
            const { data } = await axios.get<Memory[]>(`${API}/api/memories`, {
                headers,
            });
            setMemories(data);
        } catch {
            setMemError("Could not load memories.");
        } finally {
            setLoadingMem(false);
        }
    }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        fetchMemories();
    }, [fetchMemories]);

    const handleAdd = async () => {
        if (!addContent.trim()) return;
        setAdding(true);
        try {
            const { data } = await axios.post<Memory>(
                `${API}/api/memories`,
                { content: addContent.trim(), memoryType: addType },
                { headers },
            );
            setMemories((prev) => [data, ...prev]);
            setAddContent("");
        } catch {
            setMemError("Failed to add memory.");
        } finally {
            setAdding(false);
        }
    };

    const startEdit = (m: Memory) => {
        setEditId(m._id);
        setEditContent(m.content);
        setEditType(m.memoryType);
    };

    const handleSave = async () => {
        if (!editId) return;
        setSaving(true);
        try {
            const { data } = await axios.put<Memory>(
                `${API}/api/memories/${editId}`,
                { content: editContent.trim(), memoryType: editType },
                { headers },
            );
            setMemories((prev) =>
                prev.map((m) => (m._id === editId ? data : m)),
            );
            setEditId(null);
        } catch {
            setMemError("Failed to save changes.");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm("Delete this memory?")) return;
        try {
            await axios.delete(`${API}/api/memories/${id}`, { headers });
            setMemories((prev) => prev.filter((m) => m._id !== id));
        } catch {
            setMemError("Failed to delete memory.");
        }
    };

    const info = memories.filter((m) => m.memoryType === "info");
    const instruct = memories.filter((m) => m.memoryType === "instruct");

    const MemoryRow: React.FC<{ m: Memory }> = ({ m }) => {
        const isEditing = editId === m._id;
        return (
            <div className="group flex flex-col gap-1 p-3 rounded-lg border border-gray-100 bg-gray-50 hover:bg-white transition-colors">
                {isEditing ? (
                    <>
                        <textarea
                            className="w-full text-sm border border-gray-300 rounded p-2 resize-none focus:outline-none focus:ring-2 focus:ring-[#C66408]"
                            rows={3}
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                        />
                        <div className="flex items-center gap-2 mt-1">
                            <select
                                className="text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none"
                                value={editType}
                                onChange={(e) =>
                                    setEditType(
                                        e.target.value as "info" | "instruct",
                                    )
                                }
                            >
                                <option value="info">Fact / Info</option>
                                <option value="instruct">
                                    Preference / Instruction
                                </option>
                            </select>
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="ml-auto px-3 py-1 text-xs rounded bg-[#C66408] text-white hover:bg-[#B35C07] disabled:opacity-50"
                            >
                                {saving ? "Saving…" : "Save"}
                            </button>
                            <button
                                onClick={() => setEditId(null)}
                                className="px-3 py-1 text-xs rounded border border-gray-300 hover:bg-gray-100"
                            >
                                Cancel
                            </button>
                        </div>
                    </>
                ) : (
                    <div className="flex items-start gap-2">
                        <p className="flex-1 text-sm text-[#1F2937] leading-relaxed">
                            {m.content}
                        </p>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                            <button
                                onClick={() => startEdit(m)}
                                title="Edit"
                                className="p-1 rounded hover:bg-gray-200 text-[#6B7280]"
                            >
                                ✏️
                            </button>
                            <button
                                onClick={() => handleDelete(m._id)}
                                title="Delete"
                                className="p-1 rounded hover:bg-red-100 text-red-400"
                            >
                                🗑️
                            </button>
                        </div>
                    </div>
                )}
                {!isEditing && (
                    <span className="text-[10px] text-[#9CA3AF]">
                        {m.conversationId
                            ? "from conversation"
                            : "added manually"}{" "}
                        · {new Date(m.createdAt).toLocaleDateString()}
                    </span>
                )}
            </div>
        );
    };

    return (
        <div className="mt-8">
            <h2 className="text-sm font-semibold text-[#6B7280] uppercase tracking-wider mb-4">
                Memories stored by companion
            </h2>

            {memError && (
                <p className="text-red-500 text-sm mb-3">{memError}</p>
            )}

            {/* Add form */}
            <div className="mb-6 p-4 rounded-xl border border-dashed border-[#C66408]/40 bg-[#FFFBF5]">
                <p className="text-xs font-medium text-[#C66408] mb-2">
                    Add a memory manually
                </p>
                <textarea
                    rows={2}
                    placeholder="e.g. I prefer shorter responses, or My name is Sarah and I have anxiety."
                    value={addContent}
                    onChange={(e) => setAddContent(e.target.value)}
                    className="w-full text-sm border border-gray-200 rounded-lg p-2 resize-none focus:outline-none focus:ring-2 focus:ring-[#C66408] mb-2"
                />
                <div className="flex items-center gap-3">
                    <select
                        value={addType}
                        onChange={(e) =>
                            setAddType(e.target.value as "info" | "instruct")
                        }
                        className="text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none"
                    >
                        <option value="info">Fact / Info</option>
                        <option value="instruct">
                            Preference / Instruction
                        </option>
                    </select>
                    <button
                        onClick={handleAdd}
                        disabled={adding || !addContent.trim()}
                        className="ml-auto px-4 py-1.5 text-xs rounded-lg bg-[#C66408] text-white hover:bg-[#B35C07] disabled:opacity-50"
                    >
                        {adding ? "Adding…" : "+ Add"}
                    </button>
                </div>
            </div>

            {loadingMem ? (
                <p className="text-sm text-[#6B7280]">Loading memories…</p>
            ) : memories.length === 0 ? (
                <p className="text-sm text-[#6B7280]">
                    No memories yet. The companion will save things it learns
                    about you.
                </p>
            ) : (
                <div className="space-y-6">
                    {info.length > 0 && (
                        <div>
                            <p className="text-xs font-semibold text-[#6B7280] mb-2">
                                Facts &amp; Info ({info.length})
                            </p>
                            <div className="space-y-2">
                                {info.map((m) => (
                                    <MemoryRow key={m._id} m={m} />
                                ))}
                            </div>
                        </div>
                    )}
                    {instruct.length > 0 && (
                        <div>
                            <p className="text-xs font-semibold text-[#6B7280] mb-2">
                                Preferences &amp; Instructions (
                                {instruct.length})
                            </p>
                            <div className="space-y-2">
                                {instruct.map((m) => (
                                    <MemoryRow key={m._id} m={m} />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

const ProfileContent: React.FC = () => {
    const navigate = useNavigate();
    const [profile, setProfile] = useState<User | Therapist | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [token, setToken] = useState("");

    useEffect(() => {
        const fetchProfile = async () => {
            const raw = localStorage.getItem("user");
            if (!raw) {
                setError("Not logged in");
                setLoading(false);
                return;
            }
            try {
                const userData = JSON.parse(raw);
                if (!userData.token) {
                    setError("Session expired. Please log in.");
                    setLoading(false);
                    return;
                }
                setToken(userData.token);
                const endpoint =
                    userData.userType === "user"
                        ? "http://localhost:3000/api/users/profile"
                        : "http://localhost:3000/api/therapists/profile";
                const { data } = await axios.get(endpoint, {
                    headers: { Authorization: `Bearer ${userData.token}` },
                });
                setProfile(data);
            } catch (err: any) {
                if (err.response?.status === 401) {
                    localStorage.removeItem("user");
                    navigate("/login");
                } else {
                    setError(
                        err.response?.data?.message ||
                            err.message ||
                            "Could not load profile.",
                    );
                }
            } finally {
                setLoading(false);
            }
        };
        fetchProfile();
    }, [navigate]);

    const Spinner = () => (
        <div className="min-h-screen bg-[#F9FAFB] flex items-center justify-center">
            <p className="text-[#6B7280]">Loading profile…</p>
        </div>
    );

    const ErrorPage = ({ msg }: { msg: string }) => (
        <div className="min-h-screen bg-[#F9FAFB]">
            <Header />
            <div className="max-w-md mx-auto mt-20 text-center">
                <p className="text-red-500 mb-4">{msg}</p>
                <Link
                    to="/login"
                    className="text-[#C66408] font-semibold hover:underline"
                >
                    Go to Login
                </Link>
            </div>
        </div>
    );

    if (loading) return <Spinner />;
    if (error) return <ErrorPage msg={error} />;

    const isUser = profile && "username" in profile;
    const displayName = isUser
        ? (profile as User).username
        : (profile as Therapist).name;
    const tags = isUser
        ? (profile as User).interests || []
        : (profile as Therapist).specializations || [];

    return (
        <div className="min-h-screen bg-[#F9FAFB]">
            <Header />
            <main className="max-w-2xl mx-auto px-4 py-12">
                {/* Profile Card */}
                <div className="bg-white rounded-xl shadow-md p-8 border border-gray-100">
                    {/* Avatar + name */}
                    <div className="flex flex-col items-center mb-8">
                        <img
                            src={`https://ui-avatars.com/api/?name=${encodeURIComponent(displayName || "U")}&background=C66408&color=fff&size=96&rounded=true`}
                            alt="avatar"
                            className="w-24 h-24 rounded-full mb-4 shadow-md"
                        />
                        <h1 className="text-2xl font-bold text-[#1F2937]">
                            {displayName}
                        </h1>
                        <p className="text-sm text-[#6B7280] mt-1">
                            {profile?.email}
                        </p>
                        {!isUser && (
                            <span
                                className={`mt-2 px-3 py-1 rounded-full text-xs font-semibold ${
                                    (profile as Therapist).document?.isVerified
                                        ? "bg-green-100 text-green-700"
                                        : "bg-yellow-100 text-yellow-700"
                                }`}
                            >
                                {(profile as Therapist).document?.isVerified
                                    ? "✓ Verified"
                                    : "⏳ Pending Verification"}
                            </span>
                        )}
                    </div>

                    <hr className="border-gray-100 mb-6" />

                    {/* Interests / Specializations */}
                    <div>
                        <h2 className="text-sm font-semibold text-[#6B7280] uppercase tracking-wider mb-3">
                            {isUser ? "Interests" : "Specializations"}
                        </h2>
                        {tags.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                                {tags.map((t) => (
                                    <span
                                        key={t}
                                        className="px-3 py-1 rounded-full text-sm font-medium bg-[#FFEEDB] text-[#C66408]"
                                    >
                                        {t}
                                    </span>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-[#6B7280]">
                                None added yet.
                            </p>
                        )}
                    </div>

                    {/* Memories — only shown for regular users */}
                    {isUser && token && (
                        <>
                            <hr className="border-gray-100 mt-8 mb-2" />
                            <MemoryPanel token={token} />
                        </>
                    )}
                </div>

                {/* Quick nav back home */}
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

const ProfilePage: React.FC = () => (
    <ProtectedRoute>
        <ProfileContent />
    </ProtectedRoute>
);

export default ProfilePage;
