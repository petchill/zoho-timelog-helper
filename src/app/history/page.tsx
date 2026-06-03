"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface Project {
  id_string: string;
  name: string;
}

interface TimeLog {
  id: string;
  date: string;
  hours: number;
  minutes: number;
  notes: string;
  task_name: string;
  bill_status: string;
}

function formatDuration(hours: number, minutes: number) {
  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

export default function HistoryPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [logs, setLogs] = useState<TimeLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const today = new Date().toISOString().split("T")[0];
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0];

  const [projectId, setProjectId] = useState("");
  const [fromDate, setFromDate] = useState(weekAgo);
  const [toDate, setToDate] = useState(today);

  useEffect(() => {
    fetch("/api/zoho/projects")
      .then((r) => r.json())
      .then((data) => setProjects(data.projects ?? []))
      .catch(() => setError("Failed to load projects."));
  }, []);

  async function fetchLogs() {
    if (!projectId) return;
    setLoading(true);
    setError("");
    const res = await fetch(
      `/api/zoho/timelog?projectId=${projectId}&fromDate=${fromDate}&toDate=${toDate}`
    );
    setLoading(false);
    if (res.ok) {
      const data = await res.json();
      setLogs(data.timelogs ?? []);
    } else {
      setError("Failed to fetch time logs.");
    }
  }

  const totalMinutes = logs.reduce((acc, l) => acc + l.hours * 60 + l.minutes, 0);

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col items-center justify-start pt-12 p-8">
      <div className="max-w-2xl w-full space-y-6">
        <div className="bg-white rounded-2xl shadow-md p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-gray-900">Time History</h1>
            <Link href="/" className="text-sm text-gray-400 hover:text-gray-600">
              ← Back
            </Link>
          </div>

          <div className="flex flex-wrap gap-3">
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="flex-1 min-w-40 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select project…</option>
              {projects.map((p) => (
                <option key={p.id_string} value={p.id_string}>
                  {p.name}
                </option>
              ))}
            </select>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={fetchLogs}
              disabled={!projectId || loading}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              {loading ? "Loading…" : "Search"}
            </button>
          </div>

          {error && (
            <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-lg">{error}</div>
          )}
        </div>

        {logs.length > 0 && (
          <div className="bg-white rounded-2xl shadow-md overflow-hidden">
            <div className="px-6 py-4 border-b flex justify-between items-center">
              <span className="text-sm text-gray-500">{logs.length} entries</span>
              <span className="text-sm font-semibold text-gray-900">
                Total: {formatDuration(Math.floor(totalMinutes / 60), totalMinutes % 60)}
              </span>
            </div>
            <ul className="divide-y divide-gray-100">
              {logs.map((log) => (
                <li key={log.id} className="px-6 py-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{log.task_name}</p>
                      {log.notes && (
                        <p className="text-sm text-gray-500 mt-0.5">{log.notes}</p>
                      )}
                      <div className="flex gap-2 mt-1">
                        <span className="text-xs text-gray-400">{log.date}</span>
                        <span
                          className={`text-xs px-1.5 py-0.5 rounded ${
                            log.bill_status === "Billable"
                              ? "bg-green-100 text-green-700"
                              : "bg-gray-100 text-gray-500"
                          }`}
                        >
                          {log.bill_status}
                        </span>
                      </div>
                    </div>
                    <span className="text-sm font-semibold text-gray-700 ml-4">
                      {formatDuration(log.hours, log.minutes)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {logs.length === 0 && projectId && !loading && (
          <p className="text-center text-gray-400 text-sm">No time logs found for this range.</p>
        )}
      </div>
    </main>
  );
}
