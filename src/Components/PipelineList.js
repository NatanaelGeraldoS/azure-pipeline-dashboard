import React, { useState, useEffect } from "react";
import {
    CheckCircle2,
    XCircle,
    Loader2,
    AlertCircle,
    Clock,
    AlertTriangle,
    RefreshCw,
    Workflow,
} from "lucide-react";
import axios from "axios";

const PipelineList = ({ className = "" }) => {
    const [pipelines, setPipelines] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [refreshing, setRefreshing] = useState(false);

    const fetchPipelines = async () => {
        setRefreshing(true);
        const organization = process.env.REACT_APP_AZURE_ORGANIZATION;
        const project = process.env.REACT_APP_AZURE_PROJECT;
        const pat = `Basic ${btoa(`:${process.env.REACT_APP_AZURE_PAT}`)}`;

        const url = `https://dev.azure.com/${organization}/${project}/_apis/build/builds?$top=5&queryOrder=startTimeDescending`;
        const headers = {
            "Content-Type": "application/json",
            Authorization: pat,
        };

        try {
            const response = await axios.get(url, { headers });
            setPipelines(response.data.value);
            setLoading(false);
        } catch (error) {
            console.error("Error fetching pipeline data", error);
            setError("Failed to load pipelines");
            setLoading(false);
        } finally {
            setTimeout(() => {
                setRefreshing(false);
            }, 500);
        }
    };

    useEffect(() => {
        fetchPipelines();
        const intervalId = setInterval(fetchPipelines, 30000);
        return () => clearInterval(intervalId);
    }, []);

    const getStatusIcon = (status, result) => {
        switch (status.toLowerCase()) {
            case "inprogress":
                return (
                    <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
                );
            case "notstarted":
                return <Clock className="w-6 h-6 text-gray-500" />;
            case "completed":
                switch (result?.toLowerCase()) {
                    case "succeeded":
                        return (
                            <CheckCircle2 className="w-6 h-6 text-green-500" />
                        );
                    case "failed":
                        return <XCircle className="w-6 h-6 text-red-500" />;
                    case "canceled":
                        return (
                            <AlertCircle className="w-6 h-6 text-gray-500" />
                        );
                    default:
                        return (
                            <AlertTriangle className="w-6 h-6 text-yellow-500" />
                        );
                }
            default:
                return <AlertTriangle className="w-6 h-6 text-yellow-500" />;
        }
    };

    const getStatusColor = (status, result) => {
        if (status.toLowerCase() === "completed") {
            switch (result?.toLowerCase()) {
                case "succeeded":
                    return "bg-green-100 text-green-800";
                case "failed":
                    return "bg-red-100 text-red-800";
                case "canceled":
                    return "bg-gray-100 text-gray-800";
                default:
                    return "bg-yellow-100 text-yellow-800";
            }
        }
        return status.toLowerCase() === "inprogress"
            ? "bg-blue-100 text-blue-800"
            : "bg-gray-100 text-gray-800";
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center h-64 text-red-500">
                <XCircle className="w-6 h-6 mr-2" />
                {error}
            </div>
        );
    }

    return (
        <div
            className={`w-1/2 max-w-4xl bg-white rounded-lg shadow-lg overflow-hidden ${className}`}
        >
            <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-gray-800 flex items-center space-x-2">
                        <Workflow className="w-6 h-6 text-gray-800" />{" "}
                        <span>CI Status</span>
                    </h2>
                    <div className="flex items-center space-x-2">
                        {refreshing && (
                            <div className="text-blue-500 flex items-center animate-fade-in">
                                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                <span className="text-sm">Refreshing...</span>
                            </div>
                        )}
                        <button
                            onClick={fetchPipelines}
                            disabled={refreshing}
                            className={`p-2 rounded-full hover:bg-gray-100 transition-all duration-200 ${
                                refreshing
                                    ? "opacity-50 cursor-not-allowed"
                                    : ""
                            }`}
                        >
                            <RefreshCw
                                className={`w-5 h-5 text-gray-600 ${
                                    refreshing ? "animate-spin" : "animate-none"
                                }`}
                            />
                        </button>
                    </div>
                </div>
            </div>
            <div className="p-6">
                <div
                    className={`space-y-4 transition-opacity duration-200 ${
                        refreshing ? "opacity-50" : "opacity-100"
                    }`}
                >
                    {pipelines.map((pipeline) => (
                        <div
                            key={pipeline.id}
                            className="flex items-center p-4 bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 ease-in-out"
                        >
                            <div className="flex-shrink-0 mr-4">
                                {getStatusIcon(
                                    pipeline.status,
                                    pipeline.result
                                )}
                            </div>

                            <div className="flex-grow">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="text-lg font-medium text-gray-900">
                                            {pipeline.definition.name} (
                                            {pipeline.buildNumber})
                                        </h3>
                                        <h6>
                                            Triggered by:{" "}
                                            <span className="font-medium">
                                                {
                                                    pipeline.requestedFor
                                                        .displayName
                                                }
                                            </span>
                                        </h6>
                                    </div>
                                    <span
                                        className={`px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(
                                            pipeline.status,
                                            pipeline.result
                                        )}`}
                                    >
                                        {pipeline.status}
                                    </span>
                                </div>

                                <div className="mt-1 text-sm text-gray-500">
                                    Started:{" "}
                                    {new Date(
                                        pipeline.startTime
                                    ).toLocaleString()}
                                </div>
                                {pipeline.finishTime && (
                                    <div className="mt-1 text-sm text-gray-500">
                                        Finished:{" "}
                                        {new Date(
                                            pipeline.finishTime
                                        ).toLocaleString()}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default PipelineList;
