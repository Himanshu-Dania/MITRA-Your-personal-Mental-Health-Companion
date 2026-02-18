import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";

const Header: React.FC = () => {
    const navigate = useNavigate();
    const [user, setUser] = useState<any>(null);
    const [showMenu, setShowMenu] = useState(false);

    useEffect(() => {
        try {
            const raw = localStorage.getItem("user");
            if (raw) {
                const u = JSON.parse(raw);
                if (u?.token) setUser(u);
            }
        } catch {
            localStorage.removeItem("user");
        }
    }, []);

    const handleLogout = () => {
        localStorage.removeItem("user");
        setUser(null);
        navigate("/login");
    };

    return (
        <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-50">
            <div className="max-w-5xl mx-auto px-6 py-3 flex items-center justify-between">
                {/* Logo */}
                <Link
                    to="/"
                    className="text-2xl font-bold text-[#C66408] tracking-tight select-none"
                >
                    MITRA
                </Link>

                {/* Right side */}
                <div className="flex items-center gap-3">
                    {user ? (
                        <div className="relative">
                            <button
                                onClick={() => setShowMenu((v) => !v)}
                                className="flex items-center gap-2 focus:outline-none rounded-full p-1 hover:bg-[#FFEEDB] transition-colors"
                                aria-label="Account menu"
                            >
                                <img
                                    src={`https://ui-avatars.com/api/?name=${encodeURIComponent(user.username || user.name || "U")}&background=C66408&color=fff&rounded=true`}
                                    alt="avatar"
                                    className="h-8 w-8 rounded-full"
                                />
                            </button>
                            {showMenu && (
                                <div className="absolute right-0 mt-2 w-44 bg-white border border-gray-100 rounded-xl shadow-lg py-1 z-50">
                                    <Link
                                        to="/profile"
                                        onClick={() => setShowMenu(false)}
                                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-[#FFEEDB] hover:text-[#C66408] transition-colors"
                                    >
                                        My Profile
                                    </Link>
                                    <hr className="my-1 border-gray-100" />
                                    <button
                                        onClick={handleLogout}
                                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-[#FFEEDB] hover:text-[#C66408] transition-colors"
                                    >
                                        Logout
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <>
                            <Link
                                to="/login"
                                className="text-sm font-semibold text-[#C66408] hover:underline"
                            >
                                Login
                            </Link>
                            <Link
                                to="/signup/user"
                                className="text-sm font-semibold px-4 py-2 rounded-lg bg-[#C66408] text-white hover:bg-[#B35C07] transition-colors"
                            >
                                Sign Up
                            </Link>
                        </>
                    )}
                </div>
            </div>
        </header>
    );
};

export default Header;
