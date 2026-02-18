import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import GoogleAuth from "../components/GoogleAuth";

const LoginPage: React.FC = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        email: "",
        password: "",
        userType: "user",
    });
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [checkingAuth, setCheckingAuth] = useState(true);
    const { email, password, userType } = formData;

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

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
    ) => setFormData({ ...formData, [e.target.name]: e.target.value });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");
        const endpoint =
            userType === "user"
                ? "http://localhost:3000/api/users/login"
                : "http://localhost:3000/api/therapists/login";
        try {
            const { data } = await axios.post(
                endpoint,
                { email, password },
                {
                    headers: { "Content-Type": "application/json" },
                },
            );
            localStorage.setItem("user", JSON.stringify(data));
            navigate("/");
        } catch (err: any) {
            if (err.request && !err.response) {
                try {
                    const r = await fetch(endpoint, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ email, password }),
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
                err.response?.data?.message || err.message || "Login failed.",
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
            {/* Brand */}
            <Link
                to="/"
                className="text-3xl font-bold text-[#C66408] mb-8 tracking-tight select-none"
            >
                MITRA
            </Link>

            <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-8 border border-gray-100">
                <h2 className="text-xl font-bold text-[#1F2937] mb-6 text-center">
                    Welcome back
                </h2>

                {error && (
                    <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-600 text-sm text-center">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label
                            className="block text-sm font-semibold text-[#1F2937] mb-1"
                            htmlFor="userType"
                        >
                            I am a
                        </label>
                        <select
                            id="userType"
                            name="userType"
                            value={userType}
                            onChange={handleChange}
                            className="w-full px-4 py-2.5 rounded-lg border border-gray-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#C66408]"
                        >
                            <option value="user">Regular User</option>
                            <option value="therapist">Therapist</option>
                        </select>
                    </div>

                    <div>
                        <label
                            className="block text-sm font-semibold text-[#1F2937] mb-1"
                            htmlFor="email"
                        >
                            Email
                        </label>
                        <input
                            type="email"
                            id="email"
                            name="email"
                            value={email}
                            onChange={handleChange}
                            required
                            autoComplete="email"
                            className="w-full px-4 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#C66408]"
                            placeholder="you@example.com"
                        />
                    </div>

                    <div>
                        <label
                            className="block text-sm font-semibold text-[#1F2937] mb-1"
                            htmlFor="password"
                        >
                            Password
                        </label>
                        <input
                            type="password"
                            id="password"
                            name="password"
                            value={password}
                            onChange={handleChange}
                            required
                            autoComplete="current-password"
                            className="w-full px-4 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#C66408]"
                            placeholder="••••••••"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-2.5 rounded-lg bg-[#C66408] text-white font-semibold text-sm hover:bg-[#B35C07] transition-colors disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-[#C66408] focus:ring-offset-2"
                    >
                        {loading ? "Logging in…" : "Login"}
                    </button>
                </form>

                <GoogleAuth mode="login" />

                <p className="mt-6 text-center text-sm text-[#6B7280]">
                    Don't have an account?{" "}
                    <Link
                        to="/signup/user"
                        className="text-[#C66408] font-semibold hover:underline"
                    >
                        Sign Up
                    </Link>
                </p>
            </div>
        </div>
    );
};

export default LoginPage;
