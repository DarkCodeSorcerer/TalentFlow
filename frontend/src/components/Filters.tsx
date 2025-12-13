import React, { useState, useEffect } from "react";
import { useApplications } from "../state/AppContext";

export const Filters: React.FC = () => {
  const { fetchApplications } = useApplications();
  const [status, setStatus] = useState<string>("");
  const [search, setSearch] = useState<string>("");

  // Auto-apply filters when status changes
  useEffect(() => {
    if (status || search) {
      fetchApplications({ status: status || undefined, search: search || undefined });
    } else {
      fetchApplications();
    }
  }, [status]); // Auto-apply when status changes

  // Apply filter when search changes (with debounce)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (status || search) {
        fetchApplications({ status: status || undefined, search: search || undefined });
      } else {
        fetchApplications();
      }
    }, 500); // Debounce for search

    return () => clearTimeout(timeoutId);
  }, [search, status, fetchApplications]);

  const apply = () => {
    if (status || search) {
      fetchApplications({ status: status || undefined, search: search || undefined });
    } else {
      fetchApplications();
    }
  };

  const clearFilters = () => {
    setStatus("");
    setSearch("");
    fetchApplications();
  };

  const hasActiveFilters = status || search;

  return (
    <div className="bg-white p-4 rounded shadow">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-700">Filters</h3>
        {hasActiveFilters && (
          <span className="text-xs text-indigo-600 bg-indigo-50 px-2 py-1 rounded">
            Filters Active
          </span>
        )}
      </div>
      <div className="flex flex-col md:flex-row gap-2 items-center">
        <select 
          className="border p-2 rounded w-full md:w-48 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500" 
          value={status} 
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">All statuses</option>
          <option value="applied">Applied</option>
          <option value="interview">Interview</option>
          <option value="offer">Offer</option>
          <option value="rejected">Rejected</option>
        </select>
        <input 
          className="border p-2 rounded w-full focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500" 
          placeholder="Search company or position..." 
          value={search} 
          onChange={(e) => setSearch(e.target.value)} 
          onKeyPress={(e) => e.key === 'Enter' && apply()} 
        />
        <button 
          className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 transition font-medium" 
          onClick={apply}
        >
          Apply Filter
        </button>
        {hasActiveFilters && (
          <button 
            className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 transition font-medium" 
            onClick={clearFilters}
          >
            Clear All
          </button>
        )}
      </div>
      {hasActiveFilters && (
        <div className="mt-3 pt-3 border-t text-xs text-gray-600">
          <span>Active filters: </span>
          {status && <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded mr-1">Status: {status}</span>}
          {search && <span className="px-2 py-1 bg-green-100 text-green-700 rounded">Search: {search}</span>}
        </div>
      )}
    </div>
  );
};


