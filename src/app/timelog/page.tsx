"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface Project {
  id_string: string;
  name: string;
}

interface Task {
  key: string;
  name: string;
  tasklist: { name: string };
}

export default function TimelogPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const today = new Date().toISOString().split("T")[0];
  const [form, setForm] = useState({
    projectId: "",
    taskId: "",
    date: today,
    hours: "0",
    minutes: "30",
    notes: "",
    billable: true,
  });

  useEffect(() => {
    fetch("/api/zoho/projects")
      .then((r) => r.json())
      .then((data) => setProjects(data.projects ?? []))
      .catch(() => setError("Failed to load projects. Check your Zoho connection."));
  }, []);

  useEffect(() => {
    if (!form.projectId) return;
    setTasks([]);
    setForm((f) => ({ ...f, taskId: "" }));
    fetch(`/api/zoho/projects/${form.projectId}/tasks`)
      .then((r) => r.json())
      .then((data) => setTasks(data.tasks ?? []));
  }, [form.projectId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    setSuccess(false);

    const res = await fetch("/api/zoho/timelog", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        hours: parseInt(form.hours),
        minutes: parseInt(form.minutes),
      }),
    });

    setSubmitting(false);
    if (res.ok) {
      setSuccess(true);
      setForm((f) => ({ ...f, taskId: "", hours: "0", minutes: "30", notes: "" }));
    } else {
      const data = await res.json();
      setError(data.error ?? "Failed to log time.");
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col items-center justify-start pt-12 p-8">
      <div className="max-w-lg w-full bg-white rounded-2xl shadow-md p-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Log Time</h1>
            <p className="text-gray-500 text-sm mt-0.5">Add a time entry to Zoho Projects</p>
          </div>
          <Link href="/" className="text-sm text-gray-400 hover:text-gray-600">
            ← Back
          </Link>
        </div>

        {error && (
          <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-lg">{error}</div>
        )}
        {success && (
          <div className="bg-green-50 text-green-700 text-sm px-4 py-3 rounded-lg">
            Time logged successfully!
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Project</label>
            <select
              required
              value={form.projectId}
              onChange={(e) => setForm((f) => ({ ...f, projectId: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select a project…</option>
              {projects.map((p) => (
                <option key={p.id_string} value={p.id_string}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Task</label>
            <select
              required
              value={form.taskId}
              onChange={(e) => setForm((f) => ({ ...f, taskId: e.target.value }))}
              disabled={!form.projectId}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            >
              <option value="">Select a task…</option>
              {tasks.map((t) => (
                <option key={t.key} value={t.key}>
                  {t.tasklist?.name ? `[${t.tasklist.name}] ${t.name}` : t.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
            <input
              type="date"
              required
              value={form.date}
              onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Hours</label>
              <input
                type="number"
                min="0"
                max="24"
                required
                value={form.hours}
                onChange={(e) => setForm((f) => ({ ...f, hours: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Minutes</label>
              <input
                type="number"
                min="0"
                max="59"
                required
                value={form.minutes}
                onChange={(e) => setForm((f) => ({ ...f, minutes: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              rows={3}
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              placeholder="What did you work on?"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="billable"
              checked={form.billable}
              onChange={(e) => setForm((f) => ({ ...f, billable: e.target.checked }))}
              className="rounded"
            />
            <label htmlFor="billable" className="text-sm text-gray-700">
              Billable
            </label>
          </div>

          <button
            type="submit"
            disabled={submitting || loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium py-2.5 px-4 rounded-lg transition-colors"
          >
            {submitting ? "Logging…" : "Log Time"}
          </button>
        </form>
      </div>
    </main>
  );
}
