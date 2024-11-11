import React, { useState, useEffect } from "react";
import {
    CheckCircle2,
    XCircle,
    Loader2,
    AlertCircle,
    Clock,
    AlertTriangle,
    RefreshCw,
    GitPullRequest,
    User,
} from "lucide-react";
import axios from "axios";

const PullRequestList = ({ className = "" }) => {
    const [activePullRequest, setactivePullRequest] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [refreshing, setRefreshing] = useState(false);

    const getStatusIcon = (status) => {
        switch (status?.toLowerCase()) {
            case "active":
                return <Clock className="w-5 h-5 text-blue-500" />;
            case "completed":
                return <CheckCircle2 className="w-5 h-5 text-green-500" />;
            case "abandoned":
                return <XCircle className="w-5 h-5 text-red-500" />;
            case "conflict":
                return <AlertTriangle className="w-5 h-5 text-orange-500" />;
            default:
                return <AlertCircle className="w-5 h-5 text-gray-500" />;
        }
    };

    const getStatusBadgeStyle = (status) => {
        switch (status?.toLowerCase()) {
            case "active":
                return "bg-blue-100 text-blue-800";
            case "completed":
                return "bg-green-100 text-green-800";
            case "abandoned":
                return "bg-red-100 text-red-800";
            default:
                return "bg-gray-100 text-gray-800";
        }
    };

    const fetchactivePullRequest = async () => {
        setRefreshing(true);
        const organization = process.env.REACT_APP_AZURE_ORGANIZATION;
        const project = process.env.REACT_APP_AZURE_PROJECT;
        const pat = `Basic ${btoa(`:${process.env.REACT_APP_AZURE_PAT}`)}`;

        const url = `https://dev.azure.com/${organization}/${project}/_apis/git/pullrequests`;
        const headers = {
            "Content-Type": "application/json",
            Authorization: pat,
        };

        try {
            const response = await axios.get(url, { headers });
            setactivePullRequest(response.data.value);
            setLoading(false);
        } catch (error) {
            console.error("Error fetching pullRequest data", error);
            setError("Failed to load activePullRequest");
            setLoading(false);
        } finally {
            setTimeout(() => {
                setRefreshing(false);
            }, 500);
        }
    };

    useEffect(() => {
        fetchactivePullRequest();
        const intervalId = setInterval(fetchactivePullRequest, 120000);
        return () => clearInterval(intervalId);
    }, []);

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
            className={`max-w-4xl bg-white rounded-lg shadow-lg overflow-hidden ${className}`}
        >
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200 sticky top-0 left-0 bg-white">
                <div className="flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <GitPullRequest className="w-6 h-6 text-gray-800" />
                        <span>Active Pull Requests</span>
                    </h2>
                    <div className="flex items-center gap-2">
                        {refreshing && (
                            <div className="text-blue-500 flex items-center">
                                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                <span className="text-sm">Refreshing...</span>
                            </div>
                        )}
                        <button
                            onClick={fetchactivePullRequest}
                            disabled={refreshing}
                            className={`p-2 rounded-full hover:bg-gray-100 transition-colors duration-200 ${
                                refreshing
                                    ? "opacity-50 cursor-not-allowed"
                                    : ""
                            }`}
                        >
                            <RefreshCw
                                className={`w-5 h-5 text-gray-600 ${
                                    refreshing ? "animate-spin" : ""
                                }`}
                            />
                        </button>
                    </div>
                </div>
            </div>

            {/* Pull Request List */}
            <div className="p-6">
                <div
                    className={`space-y-4 ${
                        refreshing ? "opacity-50" : "opacity-100"
                    } transition-opacity duration-200`}
                >
                    {activePullRequest.map((pr) => (
                        <div
                            key={pr.pullRequestId}
                            className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow duration-200"
                        >
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        {getStatusIcon(pr.status)}
                                        {/* <a
                                            href={pr.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-lg font-semibold text-blue-600 hover:text-blue-800 hover:underline"
                                        > */}
                                        <p className="text-lg font-semibold text-gray-600">
                                            {pr.title}
                                        </p>
                                        {/* </a> */}
                                    </div>
                                    <div className="mt-2 text-sm text-gray-600">
                                        <div className="flex items-center gap-2">
                                            <User className="w-4 h-4" />
                                            <span>
                                                {pr.createdBy?.displayName}
                                            </span>
                                        </div>
                                        <div className="mt-1">
                                            Repository: {pr.repository?.name}
                                        </div>
                                        <div className="mt-1">
                                            Created:{" "}
                                            {new Date(
                                                pr.creationDate
                                            ).toLocaleDateString()}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center">
                                    <span
                                        className={`px-3 py-1 rounded-full text-sm ${getStatusBadgeStyle(
                                            pr.status
                                        )}`}
                                    >
                                        {pr.status}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default PullRequestList;
