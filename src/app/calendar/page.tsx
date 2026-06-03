"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import Link from "next/link";

const HOUR_HEIGHT = 64; // px per hour
const START_HOUR = 7;
const END_HOUR = 21;
const TOTAL_HOURS = END_HOUR - START_HOUR;
const SNAP_MINUTES = 15;
const GUTTER_WIDTH = 56;

interface Project { id_string: string; name: string; }
interface Task { id: string; prefix: string; name: string; tasklist: { name: string; id: string }; subtask: { level: string }; is_closed: boolean; }

interface DraftLog {
  id: string;
  date: string;
  startMinutes: number;
  endMinutes: number;
  projectId: string;
  taskId: string;
  notes: string;
  billable: boolean;
}

interface DragState {
  dayIndex: number;
  startMinutes: number;
  currentMinutes: number;
}

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function getWeekDates(offset: number): Date[] {
  const today = new Date();
  const day = today.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(today);
  monday.setDate(today.getDate() + diff + offset * 7);
  monday.setHours(0, 0, 0, 0);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

function toDateStr(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function minutesToTime(m: number) {
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

function snapTo(minutes: number) {
  return Math.round(minutes / SNAP_MINUTES) * SNAP_MINUTES;
}

export default function CalendarPage() {
  const [weekOffset, setWeekOffset] = useState(0);
  const weekDates = useMemo(() => getWeekDates(weekOffset), [weekOffset]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [taskProjectId, setTaskProjectId] = useState("");
  const [drafts, setDrafts] = useState<DraftLog[]>([]);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [taskDropdownOpen, setTaskDropdownOpen] = useState(false);
  const [taskSearch, setTaskSearch] = useState("");
  const gridRef = useRef<HTMLDivElement>(null);
  const taskDropdownRef = useRef<HTMLDivElement>(null);


  useEffect(() => {
    fetch("/api/zoho/projects")
      .then(r => r.json())
      .then(data => setProjects(data.projects ?? []));
  }, []);

  useEffect(() => {
    if (!taskProjectId) return;
    fetch(`/api/zoho/projects/${taskProjectId}/tasks`)
      .then(r => r.json())
      .then(data => setTasks(Array.isArray(data) ? data : (data.tasks ?? [])));
  }, [taskProjectId]);

  const yToMinutes = useCallback((clientY: number): number => {
    if (!gridRef.current) return START_HOUR * 60;
    const rect = gridRef.current.getBoundingClientRect();
    const relY = clientY - rect.top + gridRef.current.scrollTop;
    const raw = (relY / HOUR_HEIGHT) * 60 + START_HOUR * 60;
    return Math.max(START_HOUR * 60, Math.min(END_HOUR * 60, snapTo(raw)));
  }, []);

  const xToDayIndex = useCallback((clientX: number): number => {
    if (!gridRef.current) return 0;
    const rect = gridRef.current.getBoundingClientRect();
    const relX = clientX - rect.left - GUTTER_WIDTH;
    const dayWidth = (rect.width - GUTTER_WIDTH) / 7;
    return Math.max(0, Math.min(6, Math.floor(relX / dayWidth)));
  }, []);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    // Don't start drag if clicking on an existing draft
    if ((e.target as HTMLElement).closest("[data-draft]")) return;
    e.preventDefault();
    const start = yToMinutes(e.clientY);
    const dayIndex = xToDayIndex(e.clientX);
    setDrag({ dayIndex, startMinutes: start, currentMinutes: start + 60 });
  }, [yToMinutes, xToDayIndex]);

  const onMouseMove = useCallback((e: MouseEvent) => {
    if (!drag) return;
    setDrag(prev => prev ? { ...prev, currentMinutes: yToMinutes(e.clientY) } : null);
  }, [drag, yToMinutes]);

  const onMouseUp = useCallback(() => {
    if (!drag) return;
    const start = Math.min(drag.startMinutes, drag.currentMinutes);
    const end = Math.max(drag.startMinutes, drag.currentMinutes);
    if (end - start >= SNAP_MINUTES && weekDates[drag.dayIndex]) {
      const draft: DraftLog = {
        id: crypto.randomUUID(),
        date: toDateStr(weekDates[drag.dayIndex]),
        startMinutes: start,
        endMinutes: end,
        projectId: "",
        taskId: "",
        notes: "",
        billable: false,
      };
      setDrafts(prev => [...prev, draft]);
      setEditingId(draft.id);
      setTaskDropdownOpen(false);
    }
    setDrag(null);
  }, [drag, weekDates]);

  useEffect(() => {
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [onMouseMove, onMouseUp]);

  useEffect(() => {
    if (!taskDropdownOpen) return;
    function handleClick(e: MouseEvent) {
      if (taskDropdownRef.current && !taskDropdownRef.current.contains(e.target as Node)) {
        setTaskDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [taskDropdownOpen]);


  function blockStyle(startMinutes: number, endMinutes: number) {
    const top = ((startMinutes - START_HOUR * 60) / 60) * HOUR_HEIGHT;
    const height = Math.max(((endMinutes - startMinutes) / 60) * HOUR_HEIGHT, 16);
    return { top, height };
  }

  function updateDraft(id: string, patch: Partial<DraftLog>) {
    setDrafts(prev => prev.map(d => d.id === id ? { ...d, ...patch } : d));
  }

  function deleteDraft(id: string) {
    setDrafts(prev => prev.filter(d => d.id !== id));
    if (editingId === id) setEditingId(null);
  }

  async function saveAll() {
    setSaving(true);
    setSaveError("");
    const results = await Promise.allSettled(
      drafts.map(d => {
        const total = d.endMinutes - d.startMinutes;
        return fetch("/api/zoho/timelog", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            projectId: d.projectId,
            taskId: d.taskId,
            date: d.date,
            hours: Math.floor(total / 60),
            minutes: total % 60,
            notes: d.notes,
            billable: d.billable,
          }),
        });
      })
    );
    setSaving(false);
    const failed = results.filter(r => r.status === "rejected").length;
    if (failed) {
      setSaveError(`${failed} log(s) failed to save.`);
    } else {
      setDrafts([]);
      setEditingId(null);
    }
  }

  const editingDraft = drafts.find(d => d.id === editingId) ?? null;
  const today = toDateStr(new Date());
  const draftsByDate = drafts.reduce<Record<string, DraftLog[]>>((acc, d) => {
    (acc[d.date] ??= []).push(d);
    return acc;
  }, {});
  const canSave = drafts.length > 0 && drafts.every(d => d.projectId && d.taskId);

  return (
    <div className="flex flex-col h-screen bg-white select-none">
      {/* Top bar */}
      <div className="flex items-center gap-4 px-4 py-2 border-b shrink-0">
        <Link href="/" className="text-sm text-gray-400 hover:text-gray-600">← Back</Link>
        <span className="text-base font-semibold text-gray-900">Weekly Timelog</span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setWeekOffset(0)}
            className="text-xs px-3 py-1.5 rounded border border-gray-200 hover:bg-gray-50 text-gray-600"
          >
            Today
          </button>
          <button onClick={() => setWeekOffset(w => w - 1)} className="p-1.5 rounded hover:bg-gray-100 text-gray-600 text-lg leading-none">‹</button>
          <button onClick={() => setWeekOffset(w => w + 1)} className="p-1.5 rounded hover:bg-gray-100 text-gray-600 text-lg leading-none">›</button>
          {weekDates.length > 0 && (
            <span className="text-sm text-gray-500 ml-1">
              {weekDates[0]?.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              {" – "}
              {weekDates[6]?.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </span>
          )}
        </div>
        <div className="ml-auto flex items-center gap-3">
          {saveError && <span className="text-xs text-red-500">{saveError}</span>}
          {drafts.length > 0 && (
            <span className="text-xs text-gray-400">{drafts.length} unsaved</span>
          )}
          <button
            onClick={saveAll}
            disabled={!canSave || saving}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-sm font-medium px-4 py-1.5 rounded-lg transition-colors"
          >
            {saving ? "Saving…" : "Save All"}
          </button>
        </div>
      </div>

      {/* Day headers */}
      <div className="flex border-b shrink-0 bg-white z-10">
        <div style={{ width: GUTTER_WIDTH }} className="shrink-0" />
        {weekDates.map((date, i) => {
          const isToday = toDateStr(date) === today;
          return (
            <div key={i} className="flex-1 py-1.5 text-center">
              <div className="text-xs text-gray-400 uppercase tracking-wide">{DAYS[i]}</div>
              <div className={`text-sm font-semibold mx-auto w-7 h-7 flex items-center justify-center rounded-full mt-0.5 ${isToday ? "bg-blue-600 text-white" : "text-gray-800"}`}>
                {date.getDate()}
              </div>
            </div>
          );
        })}
      </div>

      {/* Scrollable grid */}
      <div
        ref={gridRef}
        className="flex-1 overflow-y-auto overflow-x-hidden cursor-crosshair"
        onMouseDown={onMouseDown}
      >
        <div style={{ height: TOTAL_HOURS * HOUR_HEIGHT }} className="relative flex">
          {/* Time gutter */}
          <div style={{ width: GUTTER_WIDTH }} className="shrink-0 relative">
            {Array.from({ length: TOTAL_HOURS }, (_, i) => (
              <div
                key={i}
                style={{ top: i * HOUR_HEIGHT }}
                className="absolute w-full flex justify-end pr-2"
              >
                <span className="text-xs text-gray-300 -translate-y-2">
                  {String(START_HOUR + i).padStart(2, "0")}:00
                </span>
              </div>
            ))}
          </div>

          {/* Day columns area */}
          <div className="flex-1 relative grid grid-cols-7">
            {/* Horizontal hour lines */}
            {Array.from({ length: TOTAL_HOURS + 1 }, (_, i) => (
              <div
                key={i}
                style={{ top: i * HOUR_HEIGHT }}
                className="absolute inset-x-0 border-t border-gray-100 pointer-events-none"
              />
            ))}
            {/* Half-hour dashed lines */}
            {Array.from({ length: TOTAL_HOURS }, (_, i) => (
              <div
                key={`h${i}`}
                style={{ top: i * HOUR_HEIGHT + HOUR_HEIGHT / 2 }}
                className="absolute inset-x-0 border-t border-dashed border-gray-100 pointer-events-none"
              />
            ))}

            {weekDates.map((date, dayIndex) => {
              const dateStr = toDateStr(date);
              const dayDrafts = draftsByDate[dateStr] ?? [];
              const isDraggingHere = drag?.dayIndex === dayIndex;
              const dragStart = drag ? Math.min(drag.startMinutes, drag.currentMinutes) : 0;
              const dragEnd = drag ? Math.max(drag.startMinutes, drag.currentMinutes) : 0;

              return (
                <div key={dayIndex} className="relative border-l border-gray-100 h-full">
                  {/* Draft blocks */}
                  {dayDrafts.map(draft => {
                    const { top, height } = blockStyle(draft.startMinutes, draft.endMinutes);
                    const isEditing = editingId === draft.id;
                    const missing = !draft.projectId || !draft.taskId;
                    return (
                      <div
                        key={draft.id}
                        data-draft="true"
                        style={{ top, height, left: 2, right: 2 }}
                        className={`absolute rounded-md px-1.5 py-0.5 cursor-pointer border transition-all z-10 ${
                          missing
                            ? "bg-orange-50 border-orange-300"
                            : isEditing
                            ? "bg-blue-100 border-blue-500"
                            : "bg-blue-50 border-blue-300"
                        }`}
                        onClick={e => {
                          e.stopPropagation();
                          setEditingId(draft.id);
                          setTaskDropdownOpen(false);
                          if (draft.projectId) setTaskProjectId(draft.projectId);
                        }}
                      >
                        <p className="text-xs font-semibold text-blue-800 truncate leading-tight">
                          {draft.projectId
                            ? (projects.find(p => p.id_string === draft.projectId)?.name ?? "…")
                            : "Assign project"}
                        </p>
                        {height > 28 && (
                          <p className="text-xs text-blue-500 leading-tight">
                            {minutesToTime(draft.startMinutes)}–{minutesToTime(draft.endMinutes)}
                          </p>
                        )}
                      </div>
                    );
                  })}

                  {/* Drag preview */}
                  {isDraggingHere && dragEnd > dragStart && (
                    <div
                      style={{
                        ...blockStyle(dragStart, dragEnd),
                        left: 2, right: 2,
                      }}
                      className="absolute rounded-md bg-blue-200 border-2 border-blue-400 pointer-events-none z-20 px-1.5 py-0.5"
                    >
                      <p className="text-xs text-blue-800">
                        {minutesToTime(dragStart)}–{minutesToTime(dragEnd)}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Edit panel (slide-in from right) */}
      {editingDraft && (
        <div className="fixed inset-0 z-50 flex" onClick={() => setEditingId(null)}>
          <div className="flex-1" />
          <div
            className="w-80 bg-white shadow-2xl border-l flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <div>
                <p className="font-semibold text-gray-900 text-sm">Edit Log</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {editingDraft.date} · {minutesToTime(editingDraft.startMinutes)}–{minutesToTime(editingDraft.endMinutes)}
                  {" "}({Math.floor((editingDraft.endMinutes - editingDraft.startMinutes) / 60)}h {(editingDraft.endMinutes - editingDraft.startMinutes) % 60}m)
                </p>
              </div>
              <button
                onClick={() => deleteDraft(editingDraft.id)}
                className="text-red-400 hover:text-red-600 text-xs px-2 py-1 rounded hover:bg-red-50"
              >
                Delete
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Project</label>
                <select
                  value={editingDraft.projectId}
                  onChange={e => {
                    updateDraft(editingDraft.id, { projectId: e.target.value, taskId: "" });
                    setTaskProjectId(e.target.value);
                  }}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select project…</option>
                  {projects.map(p => <option key={p.id_string} value={p.id_string}>{p.name}</option>)}
                </select>
              </div>

              <div ref={taskDropdownRef}>
                <label className="block text-xs font-medium text-gray-600 mb-1">Task</label>
                {/* Trigger button */}
                <button
                  type="button"
                  disabled={!editingDraft.projectId}
                  onClick={() => { setTaskDropdownOpen(o => !o); setTaskSearch(""); }}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-left focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-40 flex items-center justify-between bg-white"
                >
                  <span className={editingDraft.taskId ? "text-gray-900 truncate" : "text-gray-400"}>
                    {editingDraft.taskId
                      ? (tasks.find(t => t.id === editingDraft.taskId)?.name ?? "Select task…")
                      : "Select task…"}
                  </span>
                  <svg className="w-3.5 h-3.5 text-gray-400 shrink-0 ml-2" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                  </svg>
                </button>

                {/* Inline dropdown panel */}
                {taskDropdownOpen && editingDraft.projectId && (
                  <div className="mt-1 border border-gray-200 rounded-xl shadow-lg bg-white overflow-hidden">
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100">
                      <span className="text-sm font-semibold text-gray-900">Tasks</span>
                      <span className="text-xs text-gray-500 border border-gray-200 rounded px-2 py-0.5 flex items-center gap-1 cursor-default">
                        All
                        <svg className="w-3 h-3" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                        </svg>
                      </span>
                    </div>

                    {/* Search */}
                    <div className="px-3 py-2 border-b border-gray-100">
                      <div className="flex items-center gap-2 px-2.5 py-1.5 bg-gray-50 rounded-lg border border-gray-200 focus-within:border-blue-400 focus-within:bg-white transition-colors">
                        <svg className="w-3.5 h-3.5 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
                        </svg>
                        <input
                          autoFocus
                          type="text"
                          placeholder="Search..."
                          value={taskSearch}
                          onChange={e => setTaskSearch(e.target.value)}
                          className="bg-transparent flex-1 text-sm outline-none text-gray-700 placeholder-gray-400"
                        />
                      </div>
                    </div>

                    {/* Task list grouped by tasklist */}
                    <div className="max-h-64 overflow-y-auto">
                      {(() => {
                        const draft = editingDraft;

                        const q = taskSearch.toLowerCase();
                        const filtered = tasks.filter(t =>
                          !q ||
                          t.name.toLowerCase().includes(q) ||
                          t.prefix.toLowerCase().includes(q)
                        );
                        const groups = filtered.reduce<Record<string, Task[]>>((acc, t) => {
                          const g = t.tasklist?.name ?? "Tasks";
                          (acc[g] ??= []).push(t);
                          return acc;
                        }, {});
                        if (filtered.length === 0) {
                          return <p className="px-4 py-6 text-xs text-gray-400 text-center">No tasks found</p>;
                        }
                        return Object.entries(groups).map(([listName, listTasks]) => (
                          <div key={listName}>
                            <div className="flex items-center gap-1.5 px-4 pt-3 pb-1">
                              <svg className="w-3.5 h-3.5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                                <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 010 2H4a1 1 0 01-1-1zM3 16a1 1 0 011-1h6a1 1 0 010 2H4a1 1 0 01-1-1z" />
                              </svg>
                              <span className="text-xs font-semibold text-gray-800">{listName}</span>
                            </div>
                            {listTasks.map(task => {
                              const isSelected = task.id === draft.taskId;
                              const isSubtask = parseInt(task.subtask?.level ?? "0", 10) > 0;
                              const circleColor = isSelected
                                ? "border-blue-500 bg-blue-100"
                                : isSubtask
                                ? "border-green-500"
                                : "border-orange-400";
                              return (
                                <button
                                  key={task.id}
                                  type="button"
                                  onClick={() => { updateDraft(draft.id, { taskId: task.id }); setTaskDropdownOpen(false); }}
                                  className={`w-full flex items-center gap-2.5 px-4 py-2 text-left hover:bg-gray-50 transition-colors ${isSelected ? "bg-blue-50" : ""}`}
                                >
                                  <span className={`w-4 h-4 rounded-full border-2 shrink-0 ${circleColor} ${task.is_closed ? "opacity-40" : ""}`} />
                                  <span className={`text-xs shrink-0 font-mono ${task.is_closed ? "text-gray-300 line-through" : "text-gray-400"}`}>{task.prefix}</span>
                                  <span className={`text-sm truncate ${task.is_closed ? "text-gray-300 line-through" : "text-gray-800"}`}>{task.name}</span>
                                </button>
                              );
                            })}
                          </div>
                        ));
                      })()}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
                <textarea
                  rows={3}
                  value={editingDraft.notes}
                  onChange={e => updateDraft(editingDraft.id, { notes: e.target.value })}
                  placeholder="What did you work on?"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="billable-panel"
                  checked={editingDraft.billable}
                  onChange={e => updateDraft(editingDraft.id, { billable: e.target.checked })}
                  className="rounded"
                />
                <label htmlFor="billable-panel" className="text-sm text-gray-700">Billable</label>
              </div>
            </div>

            <div className="px-5 pb-5">
              <button
                onClick={() => setEditingId(null)}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 rounded-lg transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
