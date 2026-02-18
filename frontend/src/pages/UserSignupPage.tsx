import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import GoogleAuth from "../components/GoogleAuth";

const INTEREST_OPTIONS = [
    "Sports",
    "Reading",
    "Fitness",
    "Cooking",
    "Music",
    "Art",
    "Travel",
    "Technology",
    "Movies",
    "Meditation",
    "Studying",
    "Nature",
];

const UserSignupPage: React.FC = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        username: "",
        email: "",
        password: "",
        confirmPassword: "",
        interests: [] as string[],
    });
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [checkingAuth, setCheckingAuth] = useState(true);
    const { username, email, password, confirmPassword, interests } = formData;

    useEffect(() => {
        try {
            const raw = localStorage.getItem("user");
            if (raw) {
                const u = JSON.parse(raw);
                if (u?.token) {
                    navigate("/");
                    return;
                }
            }
        } catch {
            localStorage.removeItem("user");
        }
        setCheckingAuth(false);
    }, [navigate]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) =>
        setFormData({ ...formData, [e.target.name]: e.target.value });

    const toggleInterest = (val: string) =>
        setFormData({
            ...formData,
            interests: interests.includes(val)
                ? interests.filter((i) => i !== val)
                : [...interests, val],
        });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            setError("Passwords do not match");
            return;
        }
        setLoading(true);
        setError("");
        try {
            const { data } = await axios.post(
                "http://localhost:3000/api/users",
                { username, email, password, interests },
                { headers: { "Content-Type": "application/json" } },
            );
            localStorage.setItem("user", JSON.stringify(data));
            navigate("/");
        } catch (err: any) {
            if (err.request && !err.response) {
                try {
                    const r = await fetch("http://localhost:3000/api/users", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            username,
                            email,
                            password,
                            interests,
                        }),
                    });
                    if (r.ok) {
                        localStorage.setItem(
                            "user",
                            JSON.stringify(await r.json()),
                        );
                        navigate("/");
                        return;
                    }
                } catch {}
            }
            setError(
                err.response?.data?.message || err.message || "Sign up failed.",
            );
        } finally {
            setLoading(false);
        }
    };

    if (checkingAuth)
        return (
            <div className="min-h-screen bg-[#F9FAFB] flex items-center justify-center">
                <p className="text-[#6B7280]">Loading…</p>
            </div>
        );

    return (
        <div className="min-h-screen bg-[#F9FAFB] flex flex-col items-center justify-center px-4 py-12">
            <Link
                to="/"
                className="text-3xl font-bold text-[#C66408] mb-8 tracking-tight select-none"
            >
                MITRA
            </Link>

            <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-8 border border-gray-100">
                <h2 className="text-xl font-bold text-[#1F2937] mb-6 text-center">
                    Create your account
                </h2>

                {error && (
                    <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-600 text-sm text-center">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    {[
                        {
                            label: "Username",
                            name: "username",
                            type: "text",
                            value: username,
                            placeholder: "Choose a username",
                        },
                        {
                            label: "Email",
                            name: "email",
                            type: "email",
                            value: email,
                            placeholder: "you@example.com",
                        },
                        {
                            label: "Password",
                            name: "password",
                            type: "password",
                            value: password,
                            placeholder: "••••••••",
                        },
                        {
                            label: "Confirm Password",
                            name: "confirmPassword",
                            type: "password",
                            value: confirmPassword,
                            placeholder: "••••••••",
                        },
                    ].map(({ label, name, type, value, placeholder }) => (
                        <div key={name}>
                            <label
                                className="block text-sm font-semibold text-[#1F2937] mb-1"
                                htmlFor={name}
                            >
                                {label}
                            </label>
                            <input
                                type={type}
                                id={name}
                                name={name}
                                value={value}
                                onChange={handleChange}
                                required
                                placeholder={placeholder}
                                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#C66408]"
                            />
                        </div>
                    ))}

                    {/* Interests */}
                    <div>
                        <p className="block text-sm font-semibold text-[#1F2937] mb-2">
                            Interests
                        </p>
                        <div className="flex flex-wrap gap-2">
                            {INTEREST_OPTIONS.map((i) => (
                                <button
                                    key={i}
                                    type="button"
                                    onClick={() => toggleInterest(i)}
                                    className={`px-3 py-1 rounded-full text-sm font-medium border transition-colors focus:outline-none ${
                                        interests.includes(i)
                                            ? "bg-[#C66408] text-white border-[#C66408]"
                                            : "bg-white text-[#6B7280] border-gray-300 hover:border-[#C66408] hover:text-[#C66408]"
                                    }`}
                                >
                                    {i}
                                </button>
                            ))}
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-2.5 rounded-lg bg-[#C66408] text-white font-semibold text-sm hover:bg-[#B35C07] transition-colors disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-[#C66408] focus:ring-offset-2"
                    >
                        {loading ? "Creating account…" : "Sign Up"}
                    </button>
                </form>

                <GoogleAuth mode="signup" userType="user" />

                <p className="mt-6 text-center text-sm text-[#6B7280]">
                    Already have an account?{" "}
                    <Link
                        to="/login"
                        className="text-[#C66408] font-semibold hover:underline"
                    >
                        Login
                    </Link>
                </p>
                <p className="mt-2 text-center text-sm text-[#6B7280]">
                    Are you a therapist?{" "}
                    <Link
                        to="/signup/therapist"
                        className="text-[#C66408] font-semibold hover:underline"
                    >
                        Sign up here
                    </Link>
                </p>
            </div>
        </div>
    );
};

export default UserSignupPage;
