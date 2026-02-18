import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { GoogleOAuthProvider } from "@react-oauth/google";
import "./App.css";

import HomePage from "./pages/HomePage";
// @ts-ignore
import LoginPage from "./pages/LoginPage";
// @ts-ignore
import UserSignupPage from "./pages/UserSignupPage";
// @ts-ignore
import TherapistSignupPage from "./pages/TherapistSignupPage";
// @ts-ignore
import ProfilePage from "./pages/ProfilePage";
import PetPage from "./pages/PetPage";
import JournalPage from "./pages/JournalPage";
import TaskPage from "./pages/TaskPage";

const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID || "";
const isValidClientId =
    GOOGLE_CLIENT_ID && GOOGLE_CLIENT_ID !== "YOUR_GOOGLE_CLIENT_ID";

const App: React.FC = () => {
    const [showWarning, setShowWarning] = useState(false);

    useEffect(() => {
        if (!isValidClientId) setShowWarning(true);
    }, []);

    return (
        <>
            {showWarning && (
                <div
                    style={{
                        position: "fixed",
                        top: 0,
                        left: 0,
                        right: 0,
                        zIndex: 9999,
                        backgroundColor: "#fff7ed",
                        color: "#92400e",
                        padding: "10px",
                        textAlign: "center",
                        fontSize: "0.8rem",
                        borderBottom: "1px solid #fde68a",
                    }}
                >
                    ⚠️ Google Client ID is not configured. Set{" "}
                    <code>REACT_APP_GOOGLE_CLIENT_ID</code> in your .env file.
                </div>
            )}
            <GoogleOAuthProvider
                clientId={GOOGLE_CLIENT_ID || "dummy-client-id"}
            >
                <Router>
                    <Routes>
                        <Route path="/" element={<HomePage />} />
                        <Route path="/login" element={<LoginPage />} />
                        <Route
                            path="/signup/user"
                            element={<UserSignupPage />}
                        />
                        <Route
                            path="/signup/therapist"
                            element={<TherapistSignupPage />}
                        />
                        <Route path="/profile" element={<ProfilePage />} />
                        <Route path="/pet" element={<PetPage />} />
                        <Route path="/journal" element={<JournalPage />} />
                        <Route path="/tasks" element={<TaskPage />} />
                    </Routes>
                </Router>
            </GoogleOAuthProvider>
        </>
    );
};

export default App;
