import React, { useEffect } from "react";
import { useAuth } from "../state/AuthContext";
import { useApplications } from "../state/AppContext";
import { useNavigate } from "react-router-dom";
import { ApplicationForm } from "../components/ApplicationForm";
import { ApplicationList } from "../components/ApplicationList";
import { ResumeMatcher } from "../components/ResumeMatcher";

export const Dashboard: React.FC = () => {
  const { isAuthed, logout } = useAuth();
  const { fetchApplications } = useApplications();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthed) navigate("/login");
    else fetchApplications().catch(() => {});
  }, [isAuthed, navigate, fetchApplications]);

  return (
    <div className="min-h-screen px-4 py-6 max-w-5xl mx-auto space-y-5">
      <header className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Application Tracker</h1>
        <button className="text-sm text-red-600" onClick={logout}>Logout</button>
      </header>

      <ResumeMatcher />
      <ApplicationForm />
      <ApplicationList />
    </div>
  );
};


