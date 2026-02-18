import React, { useState } from "react";
import { Link } from "react-router-dom";
import Header from "../components/Header";

interface Task {
    id: string;
    text: string;
    done: boolean;
}

const SAMPLE_TASKS: Task[] = [
    { id: "1", text: "Take a 5-minute walk outside", done: false },
    { id: "2", text: "Drink a glass of water", done: false },
    { id: "3", text: "Write one thing you're grateful for", done: false },
];

const TaskPage: React.FC = () => {
    const [tasks, setTasks] = useState<Task[]>(SAMPLE_TASKS);
    const [newTask, setNewTask] = useState("");

    const toggle = (id: string) =>
        setTasks((t) =>
            t.map((x) => (x.id === id ? { ...x, done: !x.done } : x)),
        );

    const addTask = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTask.trim()) return;
        setTasks((t) => [
            ...t,
            { id: Date.now().toString(), text: newTask.trim(), done: false },
        ]);
        setNewTask("");
    };

    const removeTask = (id: string) =>
        setTasks((t) => t.filter((x) => x.id !== id));

    const done = tasks.filter((t) => t.done).length;

    return (
        <div className="min-h-screen bg-[#F9FAFB]">
            <Header />
            <main className="max-w-2xl mx-auto px-4 py-12">
                <div className="mb-6 flex items-end justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-[#1F2937]">
                            Tasks
                        </h1>
                        <p className="text-sm text-[#6B7280] mt-1">
                            Gentle goals for today.
                        </p>
                    </div>
                    {tasks.length > 0 && (
                        <span className="text-sm text-[#6B7280]">
                            {done} / {tasks.length} done
                        </span>
                    )}
                </div>

                {/* Progress bar */}
                {tasks.length > 0 && (
                    <div className="bg-gray-100 rounded-full h-2 mb-6 overflow-hidden">
                        <div
                            className="h-2 rounded-full bg-[#C66408] transition-all duration-500"
                            style={{ width: `${(done / tasks.length) * 100}%` }}
                        />
                    </div>
                )}

                {/* Task list */}
                <div className="space-y-3 mb-6">
                    {tasks.map((task) => (
                        <div
                            key={task.id}
                            className={`bg-white rounded-xl shadow-sm border p-4 flex items-center gap-3 transition-all ${
                                task.done
                                    ? "border-green-200 opacity-70"
                                    : "border-gray-100"
                            }`}
                        >
                            <button
                                onClick={() => toggle(task.id)}
                                className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors focus:outline-none focus:ring-2 focus:ring-[#C66408] ${
                                    task.done
                                        ? "border-[#22C55E] bg-[#22C55E]"
                                        : "border-gray-300 hover:border-[#C66408]"
                                }`}
                                aria-label="Toggle task"
                            >
                                {task.done && (
                                    <svg
                                        className="w-3 h-3 text-white"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                        strokeWidth={3}
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            d="M5 13l4 4L19 7"
                                        />
                                    </svg>
                                )}
                            </button>
                            <span
                                className={`flex-1 text-sm ${task.done ? "line-through text-[#9CA3AF]" : "text-[#1F2937]"}`}
                            >
                                {task.text}
                            </span>
                            <button
                                onClick={() => removeTask(task.id)}
                                className="text-gray-300 hover:text-red-400 transition-colors text-lg leading-none focus:outline-none"
                                aria-label="Remove task"
                            >
                                ×
                            </button>
                        </div>
                    ))}
                    {tasks.length === 0 && (
                        <p className="text-sm text-center text-[#9CA3AF] py-8">
                            No tasks yet. Add one below!
                        </p>
                    )}
                </div>

                {/* Add task */}
                <form onSubmit={addTask} className="flex gap-3">
                    <input
                        value={newTask}
                        onChange={(e) => setNewTask(e.target.value)}
                        placeholder="Add a new task…"
                        className="flex-1 px-4 py-2.5 rounded-lg border border-gray-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#C66408]"
                    />
                    <button
                        type="submit"
                        disabled={!newTask.trim()}
                        className="px-5 py-2.5 rounded-lg bg-[#C66408] text-white font-semibold text-sm hover:bg-[#B35C07] transition-colors disabled:opacity-40 focus:outline-none focus:ring-2 focus:ring-[#C66408] focus:ring-offset-2"
                    >
                        Add
                    </button>
                </form>

                <div className="mt-8 text-center">
                    <Link
                        to="/"
                        className="text-sm text-[#6B7280] hover:text-[#C66408] transition-colors"
                    >
                        ← Back to Home
                    </Link>
                </div>
            </main>
        </div>
    );
};

export default TaskPage;
