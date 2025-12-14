import React from "react";
import { AuthForm } from "../components/AuthForm";

export const LoginPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-blue-50 flex items-center">
      <div className="max-w-6xl mx-auto w-full px-6 py-10 grid md:grid-cols-2 gap-10 items-center">
        <div className="space-y-6">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-100 text-indigo-700 text-sm font-semibold">
            TalentFlow · Secure access
          </span>
          <div className="space-y-3">
            <h1 className="text-4xl font-bold text-slate-900 leading-tight">Welcome back to your TalentFlow workspace</h1>
            <p className="text-slate-600 text-lg">Track applications, keep notes, and shortlist roles with smarter matching.</p>
          </div>
          <ul className="space-y-2 text-slate-700">
            <li className="flex items-start gap-3">
              <span className="w-2 h-2 mt-2 rounded-full bg-indigo-500" />
              <span>See every application with status at a glance.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-2 h-2 mt-2 rounded-full bg-indigo-500" />
              <span>Secure JWT login keeps your data protected.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-2 h-2 mt-2 rounded-full bg-indigo-500" />
              <span>Resume vs job description matching included.</span>
            </li>
          </ul>
        </div>
        <AuthForm mode="login" />
      </div>
    </div>
  );
};

