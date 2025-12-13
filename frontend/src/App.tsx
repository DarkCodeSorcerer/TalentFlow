import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { AuthPage } from "./pages/AuthPage";
import { useAuth } from "./state/AuthContext";
import { LoginPage } from "./pages/LoginPage";
import { SignupPage } from "./pages/SignupPage";
import { ResumeMatchPage } from "./pages/ResumeMatchPage";
import { ApplicationTrackingPage } from "./pages/ApplicationTrackingPage";

const Protected: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthed } = useAuth();
  return isAuthed ? <>{children}</> : <Navigate to="/login" replace />;
};

const PublicOnly: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthed } = useAuth();
  return isAuthed ? <Navigate to="/resume-match" replace /> : <>{children}</>;
};

const App: React.FC = () => {
  return (
    <Routes>
      <Route path="/auth" element={<AuthPage />} />
      <Route
        path="/login"
        element={
          <PublicOnly>
            <LoginPage />
          </PublicOnly>
        }
      />
      <Route
        path="/signup"
        element={
          <PublicOnly>
            <SignupPage />
          </PublicOnly>
        }
      />
      <Route
        path="/resume-match"
        element={
          <Protected>
            <ResumeMatchPage />
          </Protected>
        }
      />
      <Route
        path="/applications"
        element={
          <Protected>
            <ApplicationTrackingPage />
          </Protected>
        }
      />
      <Route
        path="/"
        element={<Navigate to="/resume-match" replace />}
      />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
};

export default App;


