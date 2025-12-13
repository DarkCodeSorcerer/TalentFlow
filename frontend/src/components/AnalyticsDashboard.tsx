import React, { useEffect } from "react";
import { useApplications } from "../state/AppContext";

export const AnalyticsDashboard: React.FC = () => {
  const { analytics, fetchAnalytics, loading } = useApplications();
  const [error, setError] = React.useState<string | null>(null);

  useEffect(() => {
    fetchAnalytics().catch((err: any) => {
      console.error("Failed to fetch analytics:", err);
      // Don't show error for 401 (unauthorized) - user will be redirected to login
      if (err.response?.status !== 401) {
        setError("Failed to load analytics");
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only fetch once on mount - fetchAnalytics is stable now

  if (loading && !analytics) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-center text-gray-500">Loading analytics...</div>
      </div>
    );
  }

  if (error || !analytics) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-center text-red-500">
          {error || "Failed to load analytics"}
        </div>
      </div>
    );
  }

  const { total, recent, byStatus } = analytics;
  const interviewRate = total > 0 ? ((byStatus.interview / total) * 100).toFixed(1) : "0";
  const offerRate = total > 0 ? ((byStatus.offer / total) * 100).toFixed(1) : "0";

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Application Analytics</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <div className="text-sm text-blue-600 font-medium">Total Applications</div>
          <div className="text-3xl font-bold text-blue-700 mt-2">{total}</div>
        </div>
        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
          <div className="text-sm text-green-600 font-medium">Recent (30 days)</div>
          <div className="text-3xl font-bold text-green-700 mt-2">{recent}</div>
        </div>
        <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
          <div className="text-sm text-purple-600 font-medium">Interview Rate</div>
          <div className="text-3xl font-bold text-purple-700 mt-2">{interviewRate}%</div>
        </div>
        <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
          <div className="text-sm text-yellow-600 font-medium">Offer Rate</div>
          <div className="text-3xl font-bold text-yellow-700 mt-2">{offerRate}%</div>
        </div>
      </div>
      <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="text-center p-3 bg-gray-50 rounded">
          <div className="text-sm text-gray-600">Applied</div>
          <div className="text-2xl font-bold text-gray-800">{byStatus.applied}</div>
        </div>
        <div className="text-center p-3 bg-blue-50 rounded">
          <div className="text-sm text-blue-600">Interview</div>
          <div className="text-2xl font-bold text-blue-700">{byStatus.interview}</div>
        </div>
        <div className="text-center p-3 bg-green-50 rounded">
          <div className="text-sm text-green-600">Offer</div>
          <div className="text-2xl font-bold text-green-700">{byStatus.offer}</div>
        </div>
        <div className="text-center p-3 bg-red-50 rounded">
          <div className="text-sm text-red-600">Rejected</div>
          <div className="text-2xl font-bold text-red-700">{byStatus.rejected}</div>
        </div>
      </div>
    </div>
  );
};

