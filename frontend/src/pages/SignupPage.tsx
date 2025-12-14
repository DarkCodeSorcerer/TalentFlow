import React from "react";
import { AuthForm } from "../components/AuthForm";

export const SignupPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center">
      <div className="max-w-6xl mx-auto w-full px-6 py-10 grid md:grid-cols-2 gap-10 items-center">
        <div className="space-y-6 order-last md:order-first">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-sm font-semibold">
            TalentFlow · Get started
          </span>
          <div className="space-y-3">
            <h1 className="text-4xl font-bold text-slate-900 leading-tight">Join and manage your job hunt in one place</h1>
            <p className="text-slate-600 text-lg">Sign up to create, track, and shortlist applications with confidence.</p>
          </div>
          <ul className="space-y-2 text-slate-700">
            <li className="flex items-start gap-3">
              <span className="w-2 h-2 mt-2 rounded-full bg-blue-500" />
              <span>Create applications with notes and statuses.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-2 h-2 mt-2 rounded-full bg-blue-500" />
              <span>Filter, export, and stay organised effortlessly.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-2 h-2 mt-2 rounded-full bg-blue-500" />
              <span>Built-in resume to JD fit check to prioritise roles.</span>
            </li>
          </ul>
        </div>
        <AuthForm mode="signup" />
      </div>
    </div>
  );
};

