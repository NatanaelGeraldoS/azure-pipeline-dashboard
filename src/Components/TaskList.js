import React, { useState, useEffect } from "react";
import axios from "axios";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import {
    Loader2,
    RefreshCw,
    ChevronDown,
    ChevronUp,
    XCircle,
} from "lucide-react";

const TaskList = ({ className = "" }) => {
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [refreshing, setRefreshing] = useState(false);
    const [expandedCards, setExpandedCards] = useState({});

    // Modern, vibrant color palette
    const COLORS = {
        active: "#6366F1", // Indigo
        closed: "#EC4899", // Pink
        other: "#8B5CF6", // Purple
        bg: "#F8FAFC", // Light slate
        accent: "#14B8A6", // Teal
    };

    const fetchTasks = async () => {
        setRefreshing(true);
        const organization = process.env.REACT_APP_AZURE_ORGANIZATION;
        const pat = `Basic ${btoa(`:${process.env.REACT_APP_AZURE_PAT}`)}`;

        try {
            const response = await axios.get(
                `https://dev.azure.com/${organization}/_apis/work/accountmyworkrecentactivity?api-version=6.0`,
                {
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: pat,
                    },
                }
            );
            setTasks(response.data.value);
            setLoading(false);
        } catch (error) {
            console.error("Error fetching task data", error);
            setError("Failed to load tasks");
            setLoading(false);
        } finally {
            setTimeout(() => setRefreshing(false), 500);
        }
    };

    useEffect(() => {
        fetchTasks();
        const intervalId = setInterval(fetchTasks, 30000);
        return () => clearInterval(intervalId);
    }, []);

    const groupTasksByAssignee = () => {
        return tasks.reduce((groups, task) => {
            const assignee = task.assignedTo?.displayName || "Unassigned";
            if (!groups[assignee]) groups[assignee] = [];
            groups[assignee].push(task);
            return groups;
        }, {});
    };

    const getStatusCounts = (tasks) => {
        const statusCounts = tasks.reduce(
            (counts, task) => {
                counts[task.state.toLowerCase()] =
                    (counts[task.state.toLowerCase()] || 0) + 1;
                return counts;
            },
            { active: 0, closed: 0, other: 0 }
        );
        return [
            {
                name: "Active",
                value: statusCounts.active,
                color: COLORS.active,
            },
            {
                name: "Closed",
                value: statusCounts.closed,
                color: COLORS.closed,
            },
            { name: "Other", value: statusCounts.other, color: COLORS.other },
        ];
    };

    const handleCardClick = (assignee) => {
        setExpandedCards((prev) => ({ ...prev, [assignee]: !prev[assignee] }));
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center h-64 text-rose-500">
                <XCircle className="w-6 h-6 mr-2" />
                {error}
            </div>
        );
    }

    return (
        <div className={`w-1/4 bg-slate-50 rounded-xl shadow-lg ${className}`}>
            {/* Header */}
            <div className="px-6 py-4 bg-white rounded-t-xl border-b border-slate-100">
                <div className="flex justify-between items-center">
                    <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                        Tasks Overview
                    </h2>
                    <button
                        onClick={fetchTasks}
                        disabled={refreshing}
                        className="p-2 rounded-full hover:bg-slate-50 transition-all duration-200 disabled:opacity-50"
                    >
                        <RefreshCw
                            className={`w-5 h-5 text-slate-600 ${
                                refreshing ? "animate-spin" : ""
                            }`}
                        />
                    </button>
                </div>
            </div>

            <div className="overflow-hidden h-[39rem] relative">
                <div className="animate-scroll-vertical hover:pause-scroll space-y-4">
                    {[...Array(2)].map((_, index) => (
                        <React.Fragment key={index}>
                            {Object.entries(groupTasksByAssignee()).map(
                                ([assignee, taskGroup]) => {
                                    const statusData =
                                        getStatusCounts(taskGroup);
                                    const isExpanded = expandedCards[assignee];

                                    return (
                                        <div
                                            key={assignee}
                                            className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200"
                                        >
                                            <div
                                                className="p-4 flex items-center justify-between cursor-pointer"
                                                onClick={() =>
                                                    handleCardClick(assignee)
                                                }
                                            >
                                                <div className="flex-1">
                                                    <h3 className="text-lg font-medium text-slate-700">
                                                        {assignee}
                                                    </h3>
                                                    <p className="text-sm text-slate-500">
                                                        {taskGroup.length} tasks
                                                    </p>
                                                </div>

                                                <div className="w-32 h-32">
                                                    <ResponsiveContainer>
                                                        <PieChart>
                                                            <Pie
                                                                data={
                                                                    statusData
                                                                }
                                                                dataKey="value"
                                                                nameKey="name"
                                                                innerRadius={25}
                                                                outerRadius={40}
                                                            >
                                                                {statusData.map(
                                                                    (entry) => (
                                                                        <Cell
                                                                            key={
                                                                                entry.name
                                                                            }
                                                                            fill={
                                                                                entry.color
                                                                            }
                                                                        />
                                                                    )
                                                                )}
                                                            </Pie>
                                                            <Tooltip />
                                                        </PieChart>
                                                    </ResponsiveContainer>
                                                </div>

                                                {isExpanded ? (
                                                    <ChevronUp className="w-5 h-5 text-slate-400" />
                                                ) : (
                                                    <ChevronDown className="w-5 h-5 text-slate-400" />
                                                )}
                                            </div>
                                            {isExpanded && (
                                                <div className="px-4 pb-4 space-y-2 max-h-44 overflow-x-scroll">
                                                    {taskGroup.map((task) => (
                                                        <div
                                                            key={task.id}
                                                            className="p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors duration-200"
                                                        >
                                                            <div className="flex items-center space-x-3">
                                                                <div
                                                                    className="w-2 h-2 rounded-full"
                                                                    style={{
                                                                        backgroundColor:
                                                                            task.state.toLowerCase() ===
                                                                            "active"
                                                                                ? COLORS.active
                                                                                : task.state.toLowerCase() ===
                                                                                  "closed"
                                                                                ? COLORS.closed
                                                                                : COLORS.other,
                                                                    }}
                                                                />
                                                                <div className="flex-1">
                                                                    <h4 className="text-sm font-medium text-slate-700">
                                                                        {
                                                                            task.title
                                                                        }
                                                                    </h4>
                                                                    <p className="text-xs text-slate-500">
                                                                        {
                                                                            task.state
                                                                        }
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    );
                                }
                            )}
                        </React.Fragment>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default TaskList;
