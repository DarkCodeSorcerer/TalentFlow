import React from "react";
import { Navigate } from "react-router-dom";

// Legacy route: redirect to the dedicated login page
export const AuthPage: React.FC = () => <Navigate to="/login" replace />;


