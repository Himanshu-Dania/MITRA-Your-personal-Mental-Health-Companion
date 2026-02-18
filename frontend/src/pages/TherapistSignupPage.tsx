import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import GoogleAuth from "../components/GoogleAuth";

const SPECIALIZATION_OPTIONS = [
    "Cognitive Behavioral Therapy (CBT)",
    "Depression",
    "Anxiety",
    "Trauma",
    "PTSD",
    "Marriage Counseling",
    "Family Therapy",
    "Addiction",
    "Eating Disorders",
    "Child Psychology",
    "Grief Counseling",
    "Stress Management",
];

const TherapistSignupPage: React.FC = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        name: "",
        username: "",
        email: "",
        password: "",
        confirmPassword: "",
        specializations: [] as string[],
    });
    const [docFile, setDocFile] = useState<File | null>(null);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [checkingAuth, setCheckingAuth] = useState(true);
    const {
        name,
        username,
        email,
        password,
        confirmPassword,
        specializations,
    } = formData;

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

    const toggleSpec = (val: string) =>
        setFormData({
            ...formData,
            specializations: specializations.includes(val)
                ? specializations.filter((s) => s !== val)
                : [...specializations, val],
        });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            setError("Passwords do not match");
            return;
        }
        if (!docFile) {
            setError("Please upload a verification document");
            return;
        }
        setLoading(true);
        setError("");
        const fd = new FormData();
        fd.append("name", name);
        fd.append("username", username);
        fd.append("email", email);
        fd.append("password", password);
        fd.append("document", docFile);
        specializations.forEach((s) => fd.append("specializations", s));
        try {
            const { data } = await axios.post(
                "http://localhost:3000/api/therapists",
                fd,
                {
                    headers: { "Content-Type": "multipart/form-data" },
                },
            );
            localStorage.setItem("user", JSON.stringify(data));
            navigate("/");
        } catch (err: any) {
            if (err.request && !err.response) {
                try {
                    const fd2 = new FormData();
                    fd2.append("name", name);
                    fd2.append("username", username);
                    fd2.append("email", email);
                    fd2.append("password", password);
                    fd2.append("document", docFile);
                    specializations.forEach((s) =>
                        fd2.append("specializations", s),
                    );
                    const r = await fetch(
                        "http://localhost:3000/api/therapists",
                        { method: "POST", body: fd2 },
                    );
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
                    Join as a Therapist
                </h2>

                {error && (
                    <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-600 text-sm text-center">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    {[
                        {
                            label: "Full Name",
                            name: "name",
                            type: "text",
                            value: name,
                            placeholder: "Dr. Jane Smith",
                        },
                        {
                            label: "Username",
                            name: "username",
                            type: "text",
                            value: username,
                            placeholder: "Unique username",
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
                    ].map(({ label, name: n, type, value, placeholder }) => (
                        <div key={n}>
                            <label
                                className="block text-sm font-semibold text-[#1F2937] mb-1"
                                htmlFor={n}
                            >
                                {label}
                            </label>
                            <input
                                type={type}
                                id={n}
                                name={n}
                                value={value}
                                onChange={handleChange}
                                required
                                placeholder={placeholder}
                                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#C66408]"
                            />
                        </div>
                    ))}

                    {/* Specializations */}
                    <div>
                        <p className="block text-sm font-semibold text-[#1F2937] mb-2">
                            Specializations
                        </p>
                        <div className="flex flex-wrap gap-2">
                            {SPECIALIZATION_OPTIONS.map((s) => (
                                <button
                                    key={s}
                                    type="button"
                                    onClick={() => toggleSpec(s)}
                                    className={`px-3 py-1 rounded-full text-sm font-medium border transition-colors focus:outline-none ${
                                        specializations.includes(s)
                                            ? "bg-[#C66408] text-white border-[#C66408]"
                                            : "bg-white text-[#6B7280] border-gray-300 hover:border-[#C66408] hover:text-[#C66408]"
                                    }`}
                                >
                                    {s}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Document upload */}
                    <div>
                        <label
                            className="block text-sm font-semibold text-[#1F2937] mb-1"
                            htmlFor="document"
                        >
                            Verification Document
                        </label>
                        <input
                            type="file"
                            id="document"
                            accept=".pdf,.jpg,.jpeg,.png"
                            onChange={(e) =>
                                setDocFile(e.target.files?.[0] ?? null)
                            }
                            className="w-full text-sm text-[#6B7280] file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-[#FFEEDB] file:text-[#C66408] hover:file:bg-[#f5dfc4]"
                            required
                        />
                        <p className="text-xs text-[#6B7280] mt-1">
                            Upload your license or certification (PDF, JPG,
                            PNG).
                        </p>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-2.5 rounded-lg bg-[#C66408] text-white font-semibold text-sm hover:bg-[#B35C07] transition-colors disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-[#C66408] focus:ring-offset-2"
                    >
                        {loading
                            ? "Creating account…"
                            : "Create Therapist Account"}
                    </button>
                </form>

                <GoogleAuth mode="signup" userType="therapist" />

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
                    Looking for user signup?{" "}
                    <Link
                        to="/signup/user"
                        className="text-[#C66408] font-semibold hover:underline"
                    >
                        Sign up as User
                    </Link>
                </p>
            </div>
        </div>
    );
};

export default TherapistSignupPage;
