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
    GitMerge,
    UserCheck,
} from "lucide-react";
import axios from "axios";
import { toast } from "react-toastify";

const ApprovalModal = ({ isOpen, onClose, approvals, prTitle }) => {
    if (!isOpen) return null;
    console.log(approvals);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-semibold text-gray-900">
                        Approval Status
                    </h3>
                    <button
                        onClick={onClose}
                        className="text-gray-500 hover:text-gray-700"
                    >
                        <XCircle className="w-6 h-6" />
                    </button>
                </div>
                <h4 className="text-lg text-gray-700 mb-4">{prTitle}</h4>
                <div className="space-y-4">
                    {approvals.map((approval, index) => (
                        <div
                            key={index}
                            className="flex items-center justify-between p-3 border rounded-lg"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                                    <User className="w-5 h-5 text-gray-600" />
                                </div>
                                <div>
                                    <p className="font-medium text-gray-900">
                                        {approval.displayName}
                                    </p>
                                    <p className="text-sm text-gray-500">
                                        {approval.uniqueName}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                {approval.vote === 10 && (
                                    <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm flex items-center gap-1">
                                        <CheckCircle2 className="w-4 h-4" />
                                        Approved
                                    </span>
                                )}
                                {approval.vote === 5 && (
                                    <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm flex items-center gap-1">
                                        <AlertCircle className="w-4 h-4" />
                                        Waiting
                                    </span>
                                )}
                                {approval.vote === -10 && (
                                    <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm flex items-center gap-1">
                                        <XCircle className="w-4 h-4" />
                                        Rejected
                                    </span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

const PullRequestList = ({ className = "" }) => {
    const [activePullRequest, setactivePullRequest] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedPR, setSelectedPR] = useState(null);
    const [modalOpen, setModalOpen] = useState(false);

    const getApprovalCount = (approvers) => {
        if (!approvers) return "0/0";
        const approvedCount = approvers.filter((a) => a.vote === 10).length;
        return `${approvedCount}/${approvers.length}`;
    };

    const getApprovalColor = (approvers) => {
        if (!approvers || approvers.length === 0)
            return "bg-gray-100 hover:bg-gray-200 text-gray-600";
        const approvedCount = approvers.filter((a) => a.vote === 10).length;
        const ratio = approvedCount / approvers.length;

        if (ratio === 1)
            return "bg-green-100 hover:bg-green-200 text-green-700";
        if (ratio === 0) return "bg-gray-100 hover:bg-gray-200 text-gray-600";
        return "bg-yellow-100 hover:bg-yellow-200 text-yellow-700";
    };
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

    const fetchPRDetails = async (prId, repositoryId) => {
        const organization = process.env.REACT_APP_AZURE_ORGANIZATION;
        const project = process.env.REACT_APP_AZURE_PROJECT;
        const pat = `Basic ${btoa(`:${process.env.REACT_APP_AZURE_PAT}`)}`;

        try {
            const url = `https://dev.azure.com/${organization}/${project}/_apis/git/repositories/${repositoryId}/pullrequests/${prId}/reviewers?api-version=7.0`;
            const response = await axios.get(url, {
                headers: {
                    "Content-Type": "application/json",
                    Authorization: pat,
                },
            });
            return response.data.value;
        } catch (error) {
            toast.error("Failed to fetch approval details");
            return [];
        }
    };

    const handleApprovalClick = async (pr) => {
        const approvals = await fetchPRDetails(
            pr.pullRequestId,
            pr.repository.id
        );
        setSelectedPR({ ...pr, approvals });
        setModalOpen(true);
    };

    const fetchactivePullRequest = async () => {
        setRefreshing(true);
        const organization = process.env.REACT_APP_AZURE_ORGANIZATION;
        const project = process.env.REACT_APP_AZURE_PROJECT;
        const pat = `Basic ${btoa(`:${process.env.REACT_APP_AZURE_PAT}`)}`;

        const url = `https://dev.azure.com/${organization}/${project}/_apis/git/pullrequests?api-version=7.0`;
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
        <>
            <div
                className={`max-w-4xl bg-white rounded-lg shadow-lg overflow-hidden ${className}`}
            >
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-200 sticky top-0 left-0 bg-white">
                    <div className="flex justify-between items-center">
                        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                            <GitPullRequest className="w-6 h-6 text-gray-800" />
                            <span>Active Pull Requests</span>
                        </h2>
                        <div className="flex items-center gap-2">
                            {refreshing && (
                                <div className="text-blue-500 flex items-center">
                                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                    <span className="text-sm">
                                        Refreshing...
                                    </span>
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
                                            <p className="text-lg font-semibold text-gray-600">
                                                {pr.title}
                                            </p>
                                        </div>
                                        <div className="mt-2 text-sm text-gray-600 space-y-2">
                                            <div className="flex items-center gap-2">
                                                <User className="w-4 h-4" />
                                                <span>
                                                    {pr.createdBy?.displayName}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <GitMerge className="w-4 h-4" />
                                                <span>
                                                    {pr.sourceRefName.replace(
                                                        "refs/heads/",
                                                        ""
                                                    )}{" "}
                                                    →{" "}
                                                    {pr.targetRefName.replace(
                                                        "refs/heads/",
                                                        ""
                                                    )}
                                                </span>
                                            </div>
                                            <div>
                                                Repository:{" "}
                                                {pr.repository?.name}
                                            </div>
                                            <div>
                                                Created:{" "}
                                                {new Date(
                                                    pr.creationDate
                                                ).toLocaleDateString()}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end gap-2">
                                        <span
                                            className={`px-3 py-1 rounded-full text-sm ${getStatusBadgeStyle(
                                                pr.status
                                            )}`}
                                        >
                                            {pr.status}
                                        </span>
                                        <button
                                            onClick={() =>
                                                handleApprovalClick(pr)
                                            }
                                            className={`flex items-center gap-1 px-3 py-1 text-sm rounded-full transition-colors ${getApprovalColor(
                                                pr.reviewers
                                            )}`}
                                        >
                                            <UserCheck className="w-4 h-4" />
                                            {getApprovalCount(pr.reviewers)}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {selectedPR && (
                <ApprovalModal
                    isOpen={modalOpen}
                    onClose={() => setModalOpen(false)}
                    approvals={selectedPR.reviewers}
                    prTitle={selectedPR.title}
                />
            )}
        </>
    );
};

export default PullRequestList;
