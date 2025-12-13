import React from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../state/AuthContext";

export const Navbar: React.FC = () => {
  const { logout } = useAuth();
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="bg-white shadow-md border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-8">
            <Link to="/" className="text-xl font-bold text-indigo-600">
              ATS System
            </Link>
            <div className="flex space-x-4">
              <Link
                to="/resume-match"
                className={`px-3 py-2 rounded-md text-sm font-medium transition ${
                  isActive("/resume-match")
                    ? "bg-indigo-100 text-indigo-700"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                Resume Matching
              </Link>
              <Link
                to="/applications"
                className={`px-3 py-2 rounded-md text-sm font-medium transition ${
                  isActive("/applications")
                    ? "bg-indigo-100 text-indigo-700"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                Application Tracking
              </Link>
            </div>
          </div>
          <button
            onClick={logout}
            className="px-4 py-2 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md transition"
          >
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
};

