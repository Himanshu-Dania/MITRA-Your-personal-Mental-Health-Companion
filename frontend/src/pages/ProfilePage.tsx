import React, { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import Header from "../components/Header";
import axios from "axios";
import { User, Therapist } from "../types";
import ProtectedRoute from "../components/ProtectedRoute";

const ProfileContent: React.FC = () => {
    const navigate = useNavigate();
    const [profile, setProfile] = useState<User | Therapist | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

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

                    <div className="mt-8 flex justify-center">
                        <button className="px-6 py-2.5 rounded-lg bg-[#C66408] text-white font-semibold text-sm hover:bg-[#B35C07] transition-colors focus:outline-none focus:ring-2 focus:ring-[#C66408] focus:ring-offset-2">
                            Edit Profile
                        </button>
                    </div>
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
