import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header";

const BACKEND_URL =
    process.env.REACT_APP_BACKEND_URL || "http://localhost:3000";

type TaskType = "checkmark" | "slider" | "discrete" | "journal";
type Difficulty = "easy" | "medium" | "hard";

interface Task {
    _id: string;
    taskName: string;
    description?: string;
    reasonForCreation?: string;
    taskType: TaskType;
    difficulty?: Difficulty;
    progress: number;
    totalCount?: number;
    completed: boolean;
    completedAt?: string;
    recurringHours: number;
    nextDueAt?: string;
    createdBy: "companion" | "therapist" | "user";
    createdAt: string;
}

function getAuth() {
    try {
        const raw = localStorage.getItem("user");
        if (!raw) return { token: "" };
        return { token: (JSON.parse(raw).token as string) || "" };
    } catch {
        return { token: "" };
    }
}

const difficultyBadge: Record<string, string> = {
    easy: "bg-green-100 text-green-700",
    medium: "bg-yellow-100 text-yellow-700",
    hard: "bg-red-100 text-red-700",
};

function formatCountdown(nextDueAt: string): string {
    const ms = new Date(nextDueAt).getTime() - Date.now();
    if (ms <= 0) return "Ready to repeat!";
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    if (h > 0) return `repeats in ${h}h ${m}m`;
    return `repeats in ${m}m`;
}

function sortTasks(tasks: Task[]): Task[] {
    const notDone = tasks
        .filter((t) => !t.completed)
        .sort(
            (a, b) =>
                new Date(b.createdAt).getTime() -
                new Date(a.createdAt).getTime(),
        );
    const doneRecurring = tasks
        .filter((t) => t.completed && t.recurringHours > 0)
        .sort((a, b) => {
            if (a.nextDueAt && b.nextDueAt)
                return (
                    new Date(a.nextDueAt).getTime() -
                    new Date(b.nextDueAt).getTime()
                );
            return 0;
        });
    const donePermanent = tasks
        .filter((t) => t.completed && t.recurringHours === 0)
        .sort(
            (a, b) =>
                new Date(b.completedAt || b.createdAt).getTime() -
                new Date(a.completedAt || a.createdAt).getTime(),
        );
    return [...notDone, ...doneRecurring, ...donePermanent];
}

// ── Shared task card shell ────────────────────────────────────────────────────
function TaskCardShell({
    task,
    onDelete,
    children,
}: {
    task: Task;
    onDelete: (id: string) => void;
    children: React.ReactNode;
}) {
    const statusLabel = task.completed
        ? task.recurringHours > 0 && task.nextDueAt
            ? `Done ✓ — ${formatCountdown(task.nextDueAt)}`
            : "Done ✓"
        : null;

    return (
        <div
            className={`bg-white rounded-xl border shadow-sm p-4 transition-opacity ${
                task.completed && task.recurringHours === 0
                    ? "opacity-60"
                    : "opacity-100"
            }`}
        >
            <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                    <span
                        className={`text-sm font-semibold ${
                            task.completed
                                ? "line-through text-gray-400"
                                : "text-[#1F2937]"
                        }`}
                    >
                        {task.taskName}
                    </span>
                    {task.description && (
                        <p className="text-xs text-[#6B7280] mt-0.5 line-clamp-2">
                            {task.description}
                        </p>
                    )}
                    <div className="flex flex-wrap gap-1 mt-1.5">
                        {task.difficulty && (
                            <span
                                className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                                    difficultyBadge[task.difficulty] || ""
                                }`}
                            >
                                {task.difficulty}
                            </span>
                        )}
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500">
                            {task.taskType}
                        </span>
                        {task.createdBy === "companion" && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-600">
                                AI
                            </span>
                        )}
                    </div>
                    {statusLabel && (
                        <p className="text-xs text-green-600 mt-1 font-medium">
                            {statusLabel}
                        </p>
                    )}
                </div>
                <button
                    onClick={() => onDelete(task._id)}
                    className="text-gray-300 hover:text-red-400 transition-colors text-lg leading-none flex-shrink-0"
                    title="Delete task"
                >
                    ×
                </button>
            </div>
            {children}
        </div>
    );
}

// ── Discrete task card ────────────────────────────────────────────────────────
function DiscreteCard({
    task,
    onUpdate,
    onDelete,
}: {
    task: Task;
    onUpdate: (t: Task) => void;
    onDelete: (id: string) => void;
}) {
    const { token } = getAuth();
    const authHeaders = {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
    };
    const total = task.totalCount ?? 1;
    const pct = Math.min(100, Math.round((task.progress / total) * 100));

    const setProgress = async (val: number) => {
        const res = await fetch(
            `${BACKEND_URL}/api/tasks/${task._id}/progress`,
            {
                method: "PUT",
                headers: authHeaders,
                body: JSON.stringify({ progress: val }),
            },
        );
        if (res.ok) onUpdate(await res.json());
    };

    return (
        <TaskCardShell task={task} onDelete={onDelete}>
            <div className="mt-3">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() =>
                            setProgress(Math.max(task.progress - 1, 0))
                        }
                        disabled={task.progress <= 0}
                        className="w-8 h-8 rounded-full border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30 text-lg font-bold leading-none flex items-center justify-center"
                    >
                        −
                    </button>
                    <span className="text-sm font-semibold text-[#1F2937] min-w-[64px] text-center">
                        {task.progress} / {total}
                    </span>
                    <button
                        onClick={() =>
                            setProgress(Math.min(task.progress + 1, total))
                        }
                        disabled={task.completed}
                        className="w-8 h-8 rounded-full border border-[#C66408] text-[#C66408] hover:bg-orange-50 disabled:opacity-30 text-lg font-bold leading-none flex items-center justify-center"
                    >
                        +
                    </button>
                </div>
                <div className="mt-2 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                        className={`h-full rounded-full transition-all duration-300 ${
                            task.completed ? "bg-green-500" : "bg-[#C66408]"
                        }`}
                        style={{ width: `${pct}%` }}
                    />
                </div>
            </div>
        </TaskCardShell>
    );
}

// ── Slider task card ──────────────────────────────────────────────────────────
function SliderCard({
    task,
    onUpdate,
    onDelete,
}: {
    task: Task;
    onUpdate: (t: Task) => void;
    onDelete: (id: string) => void;
}) {
    const { token } = getAuth();
    const authHeaders = {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
    };
    const [localVal, setLocalVal] = useState(task.progress);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const handleChange = (val: number) => {
        setLocalVal(val);
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(async () => {
            const res = await fetch(
                `${BACKEND_URL}/api/tasks/${task._id}/progress`,
                {
                    method: "PUT",
                    headers: authHeaders,
                    body: JSON.stringify({ progress: val }),
                },
            );
            if (res.ok) onUpdate(await res.json());
        }, 400);
    };

    return (
        <TaskCardShell task={task} onDelete={onDelete}>
            <div className="mt-3 flex items-center gap-3">
                <input
                    type="range"
                    min={0}
                    max={100}
                    value={localVal}
                    disabled={task.completed}
                    onChange={(e) => handleChange(Number(e.target.value))}
                    className="flex-1 accent-[#C66408]"
                />
                <span className="text-sm font-semibold text-[#1F2937] w-10 text-right">
                    {localVal}%
                </span>
            </div>
        </TaskCardShell>
    );
}

// ── Checkmark task card ───────────────────────────────────────────────────────
function CheckmarkCard({
    task,
    onUpdate,
    onDelete,
}: {
    task: Task;
    onUpdate: (t: Task) => void;
    onDelete: (id: string) => void;
}) {
    const { token } = getAuth();
    const authHeaders = {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
    };

    const toggle = async () => {
        const res = await fetch(`${BACKEND_URL}/api/tasks/${task._id}`, {
            method: "PUT",
            headers: authHeaders,
        });
        if (res.ok) onUpdate(await res.json());
    };

    return (
        <TaskCardShell task={task} onDelete={onDelete}>
            <div className="mt-3">
                <button
                    onClick={toggle}
                    className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                        task.completed
                            ? "bg-green-100 text-green-700 hover:bg-green-200"
                            : "bg-[#C66408] text-white hover:bg-[#B35C07]"
                    }`}
                >
                    {task.completed ? "✓ Done — Undo" : "Mark Done"}
                </button>
            </div>
        </TaskCardShell>
    );
}

// ── Journal task card ─────────────────────────────────────────────────────────
function JournalCard({
    task,
    onDelete,
    navigate,
}: {
    task: Task;
    onDelete: (id: string) => void;
    navigate: (to: string) => void;
}) {
    return (
        <TaskCardShell task={task} onDelete={onDelete}>
            <div className="mt-3">
                <button
                    onClick={() => navigate(`/journal?taskId=${task._id}`)}
                    className="px-4 py-1.5 rounded-lg text-sm font-semibold bg-purple-600 text-white hover:bg-purple-700 transition-colors"
                >
                    {task.completed ? "📖 View Journal" : "📝 Write Journal"}
                </button>
            </div>
        </TaskCardShell>
    );
}

// ── Add task form ─────────────────────────────────────────────────────────────
function AddTaskForm({ onAdd }: { onAdd: (task: Task) => void }) {
    const { token } = getAuth();
    const authHeaders = {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
    };
    const [open, setOpen] = useState(false);
    const [taskName, setTaskName] = useState("");
    const [description, setDescription] = useState("");
    const [taskType, setTaskType] = useState<TaskType>("checkmark");
    const [difficulty, setDifficulty] = useState<Difficulty>("easy");
    const [recurringHours, setRecurringHours] = useState(0);
    const [totalCount, setTotalCount] = useState(5);
    const [saving, setSaving] = useState(false);

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!taskName.trim()) return;
        setSaving(true);
        try {
            const body: Record<string, unknown> = {
                taskName: taskName.trim(),
                description: description.trim(),
                taskType,
                difficulty,
                recurringHours,
                createdBy: "user",
            };
            if (taskType === "discrete") body.totalCount = totalCount;
            const res = await fetch(`${BACKEND_URL}/api/tasks`, {
                method: "POST",
                headers: authHeaders,
                body: JSON.stringify(body),
            });
            if (res.ok) {
                onAdd(await res.json());
                setTaskName("");
                setDescription("");
                setTaskType("checkmark");
                setDifficulty("easy");
                setRecurringHours(0);
                setTotalCount(5);
                setOpen(false);
            }
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="mt-6">
            {!open ? (
                <button
                    onClick={() => setOpen(true)}
                    className="w-full py-3 rounded-xl border-2 border-dashed border-[#C66408] text-[#C66408] text-sm font-semibold hover:bg-orange-50 transition-colors"
                >
                    + Add Task
                </button>
            ) : (
                <form
                    onSubmit={submit}
                    className="bg-white rounded-xl border shadow-sm p-4 space-y-3"
                >
                    <h3 className="text-sm font-bold text-[#1F2937]">
                        New Task
                    </h3>
                    <input
                        type="text"
                        placeholder="Task name"
                        value={taskName}
                        onChange={(e) => setTaskName(e.target.value)}
                        className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#C66408]"
                        required
                    />
                    <textarea
                        placeholder="Description (optional)"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        rows={2}
                        className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#C66408] resize-none"
                    />
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs text-gray-500 mb-1 block">
                                Type
                            </label>
                            <select
                                value={taskType}
                                onChange={(e) =>
                                    setTaskType(e.target.value as TaskType)
                                }
                                className="w-full border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#C66408]"
                            >
                                <option value="checkmark">Checkmark</option>
                                <option value="slider">Slider (0–100%)</option>
                                <option value="discrete">
                                    Discrete (count)
                                </option>
                                <option value="journal">Journal</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-xs text-gray-500 mb-1 block">
                                Difficulty
                            </label>
                            <select
                                value={difficulty}
                                onChange={(e) =>
                                    setDifficulty(e.target.value as Difficulty)
                                }
                                className="w-full border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#C66408]"
                            >
                                <option value="easy">Easy</option>
                                <option value="medium">Medium</option>
                                <option value="hard">Hard</option>
                            </select>
                        </div>
                    </div>
                    {taskType === "discrete" && (
                        <div>
                            <label className="text-xs text-gray-500 mb-1 block">
                                Total count
                            </label>
                            <input
                                type="number"
                                min={1}
                                value={totalCount}
                                onChange={(e) =>
                                    setTotalCount(Number(e.target.value))
                                }
                                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#C66408]"
                            />
                        </div>
                    )}
                    <div>
                        <label className="text-xs text-gray-500 mb-1 block">
                            Recurring every (hours, 0 = never)
                        </label>
                        <input
                            type="number"
                            min={0}
                            value={recurringHours}
                            onChange={(e) =>
                                setRecurringHours(Number(e.target.value))
                            }
                            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#C66408]"
                        />
                    </div>
                    <div className="flex gap-2 pt-1">
                        <button
                            type="submit"
                            disabled={saving || !taskName.trim()}
                            className="flex-1 py-2 rounded-lg bg-[#C66408] text-white text-sm font-semibold hover:bg-[#B35C07] disabled:opacity-40 transition-colors"
                        >
                            {saving ? "Saving…" : "Add Task"}
                        </button>
                        <button
                            type="button"
                            onClick={() => setOpen(false)}
                            className="px-4 py-2 rounded-lg border text-sm text-gray-500 hover:bg-gray-50 transition-colors"
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            )}
        </div>
    );
}

// ── Main page ─────────────────────────────────────────────────────────────────
const TaskPage: React.FC = () => {
    const { token } = getAuth();
    const navigate = useNavigate();
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const authHeaders = {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
    };

    const fetchTasks = useCallback(async () => {
        if (!token) {
            setLoading(false);
            return;
        }
        try {
            const res = await fetch(`${BACKEND_URL}/api/tasks`, {
                headers: authHeaders,
            });
            if (res.ok) setTasks(await res.json());
        } finally {
            setLoading(false);
        }
    }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        fetchTasks();
    }, [fetchTasks]);

    const handleUpdate = (updated: Task) =>
        setTasks((t) => t.map((x) => (x._id === updated._id ? updated : x)));

    const handleDelete = async (id: string) => {
        const res = await fetch(`${BACKEND_URL}/api/tasks/${id}`, {
            method: "DELETE",
            headers: authHeaders,
        });
        if (res.ok) setTasks((t) => t.filter((x) => x._id !== id));
    };

    const sorted = sortTasks(tasks);

    const renderTask = (task: Task) => {
        switch (task.taskType) {
            case "discrete":
                return (
                    <DiscreteCard
                        key={task._id}
                        task={task}
                        onUpdate={handleUpdate}
                        onDelete={handleDelete}
                    />
                );
            case "slider":
                return (
                    <SliderCard
                        key={task._id}
                        task={task}
                        onUpdate={handleUpdate}
                        onDelete={handleDelete}
                    />
                );
            case "journal":
                return (
                    <JournalCard
                        key={task._id}
                        task={task}
                        onDelete={handleDelete}
                        navigate={navigate}
                    />
                );
            default:
                return (
                    <CheckmarkCard
                        key={task._id}
                        task={task}
                        onUpdate={handleUpdate}
                        onDelete={handleDelete}
                    />
                );
        }
    };

    return (
        <div className="min-h-screen bg-[#F9FAFB]">
            <Header />
            <main className="max-w-xl mx-auto px-4 py-10">
                <div className="mb-6 flex items-center justify-between">
                    <h1 className="text-2xl font-bold text-[#1F2937]">Tasks</h1>
                    {!loading && (
                        <span className="text-xs text-gray-400">
                            {tasks.filter((t) => !t.completed).length} remaining
                        </span>
                    )}
                </div>

                {loading ? (
                    <div className="text-center py-16 text-[#9CA3AF] text-sm">
                        Loading…
                    </div>
                ) : tasks.length === 0 ? (
                    <div className="text-center py-16">
                        <p className="text-[#9CA3AF] text-sm">No tasks yet.</p>
                        <p className="text-xs text-gray-400 mt-1">
                            Your companion will create tasks during sessions, or
                            add one manually.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-3">{sorted.map(renderTask)}</div>
                )}

                <AddTaskForm onAdd={(t) => setTasks((prev) => [t, ...prev])} />
            </main>
        </div>
    );
};

export default TaskPage;
