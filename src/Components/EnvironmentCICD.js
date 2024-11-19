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
    ChevronRight,
    ChevronDown,
    XIcon,
} from "lucide-react";
import axios from "axios";

const EnvironmentCICD = ({ className = "" }) => {
    const [pipelines, setPipelines] = useState([]);
    const [releases, setReleases] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);
    const [expandedEnvs, setExpandedEnvs] = useState({});

    const ENV_LIST = JSON.parse(process.env.REACT_APP_ENV_LIST);
    const organization = process.env.REACT_APP_AZURE_ORGANIZATION;
    const project = process.env.REACT_APP_AZURE_PROJECT;
    const pat = `Basic ${btoa(`:${process.env.REACT_APP_AZURE_PAT}`)}`;

    const fetchPipelines = async () => {
        const url = `https://dev.azure.com/${organization}/${project}/_apis/build/builds?$top=20&queryOrder=startTimeDescending`;
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
        }
    };

    const fetchReleases = async () => {
        setRefreshing(true);
        const url = `https://vsrm.dev.azure.com/${organization}/${project}/_apis/release/releases?orderBy=%22status%20desc%22&$expand=environments&$top=20`;
        const headers = {
            "Content-Type": "application/json",
            Authorization: pat,
        };

        try {
            const response = await axios.get(url, { headers });
            setReleases(response.data.value);
        } catch (error) {
            console.error("Error fetching release data", error);
            setError("Failed to load releases");
        } finally {
            setTimeout(() => setRefreshing(false), 500);
        }
    };

    const fetchCICDGroup = async () => {
        setRefreshing(true);
        await Promise.all([fetchPipelines(), fetchReleases()]);
        setRefreshing(false);
    };

    useEffect(() => {
        fetchCICDGroup();
        const intervalId = setInterval(fetchCICDGroup, 30000);
        return () => clearInterval(intervalId);
    }, []);

    const getStatusIcon = (status, result, size = 8) => {
        if (!status && !result)
            return (
                <CheckCircle2
                    className={`w-${size} h-${size} text-green-500`}
                />
            );

        switch (status?.toLowerCase()) {
            case "inprogress":
                return (
                    <Loader2
                        className={`w-${size} h-${size} text-blue-500 animate-spin`}
                    />
                );
            case "notstarted":
                return (
                    <Clock className={`w-${size} h-${size} text-gray-500`} />
                );
            case "succeeded":
                return (
                    <CheckCircle2
                        className={`w-${size} h-${size} text-green-500`}
                    />
                );
            case "active":
            case "completed":
                switch (result?.toLowerCase()) {
                    case "succeeded":
                        return (
                            <CheckCircle2
                                className={`w-${size} h-${size} text-green-500`}
                            />
                        );
                    case "failed":
                        return (
                            <XCircle
                                className={`w-${size} h-${size} text-red-500`}
                            />
                        );
                    case "canceled":
                        return (
                            <AlertCircle
                                className={`w-${size} h-${size} text-gray-500`}
                            />
                        );
                    default:
                        return (
                            <AlertTriangle
                                className={`w-${size} h-${size} text-yellow-500`}
                            />
                        );
                }
            default:
                return (
                    <AlertTriangle
                        className={`w-${size} h-${size} text-yellow-500`}
                    />
                );
        }
    };

    const toggleEnvExpansion = (envKey) => {
        setExpandedEnvs((prev) => ({
            ...prev,
            [envKey]: !prev[envKey],
        }));
    };

    const getPipelinesByEnv = (envKey, type = "web") => {
        return pipelines.filter((pipeline) => {
            const name = pipeline.definition.name.toLowerCase();
            if (type === "web") {
                return (
                    name.includes("web") && name.includes(envKey.toLowerCase())
                );
            }
            return !name.includes("web") && name.includes(envKey.toLowerCase());
        });
    };

    const getReleasesByEnv = (envKey, type = "web") => {
        return releases.filter((release) => {
            return release.environments.some((env) => {
                const name = env.releaseDefinition.name.toLowerCase();
                if (type === "web") {
                    return (
                        name.includes("web") &&
                        name.includes(envKey.toLowerCase())
                    );
                }
                return (
                    !name.includes("web") && name.includes(envKey.toLowerCase())
                );
            });
        });
    };

    const PipelineModal = ({ pipeline, onClose }) => {
        if (!pipeline) return null;
        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg w-full max-w-2xl mx-4 relative">
                    <div className="flex justify-between items-center p-4 border-b">
                        <h3 className="text-lg font-semibold">
                            Pipeline Details
                        </h3>
                        <button
                            onClick={onClose}
                            className="p-1 hover:bg-gray-100 rounded-full"
                        >
                            <XIcon className="w-5 h-5" />
                        </button>
                    </div>
                    <div className="p-4 max-h-[70vh] overflow-y-auto">
                        <div className="space-y-4">
                            <div>
                                <p className="font-medium">Name:</p>
                                <p>{pipeline.definition?.name}</p>
                            </div>
                            <div>
                                <p className="font-medium">Status:</p>
                                <div className="flex items-center space-x-2">
                                    {getStatusIcon(
                                        pipeline.status,
                                        pipeline.result
                                    )}
                                    <span>{pipeline.result}</span>
                                </div>
                            </div>
                            <div>
                                <p className="font-medium">Triggered By:</p>
                                <p>{pipeline.requestedFor?.displayName}</p>
                            </div>
                            <div>
                                <p className="font-medium">Start Time:</p>
                                <p>
                                    {new Date(
                                        pipeline.startTime
                                    ).toLocaleString()}
                                </p>
                            </div>
                            {pipeline.finishTime && (
                                <div>
                                    <p className="font-medium">Finish Time:</p>
                                    <p>
                                        {new Date(
                                            pipeline.finishTime
                                        ).toLocaleString()}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const ReleaseModal = ({ release, onClose }) => {
        if (!release) return null;

        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg w-full max-w-2xl mx-4 relative">
                    <div className="flex justify-between items-center p-4 border-b">
                        <h3 className="text-lg font-semibold">
                            Release Details
                        </h3>
                        <button
                            onClick={onClose}
                            className="p-1 hover:bg-gray-100 rounded-full"
                        >
                            <XIcon className="w-5 h-5" />
                        </button>
                    </div>
                    <div className="p-4 max-h-[70vh] overflow-y-auto">
                        <div className="space-y-4">
                            <div>
                                <p className="font-medium">Release Name:</p>
                                <p>{release.name}</p>
                            </div>
                            <div>
                                <p className="font-medium">Created On:</p>
                                <p>
                                    {new Date(
                                        release.createdOn
                                    ).toLocaleString()}
                                </p>
                            </div>
                            <div>
                                <p className="font-medium">Environments:</p>
                                {release.environments.map((env, index) => (
                                    <div
                                        key={index}
                                        className="p-2 border rounded mb-2"
                                    >
                                        <p className="font-medium">
                                            {env.name}
                                        </p>
                                        <div className="flex items-center space-x-2">
                                            {getStatusIcon(env.status)}
                                            <span>{env.status}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
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
        <div className={`w-full bg-white rounded-lg shadow-lg ${className}`}>
            <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-gray-800 flex items-center space-x-2">
                        <Workflow className="w-6 h-6" />
                        <span>Environment Status</span>
                    </h2>
                    <div className="flex items-center space-x-2">
                        {refreshing && (
                            <div className="text-blue-500 flex items-center animate-fade-in">
                                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                <span className="text-sm">Refreshing...</span>
                            </div>
                        )}
                        <button
                            onClick={fetchCICDGroup}
                            disabled={refreshing}
                            className={`p-2 rounded-full hover:bg-gray-100 transition-all duration-200 ${
                                refreshing
                                    ? "opacity-50 cursor-not-allowed"
                                    : ""
                            }`}
                        >
                            <RefreshCw
                                className={`w-5 h-5 ${
                                    refreshing ? "animate-spin" : ""
                                }`}
                            />
                        </button>
                    </div>
                </div>
            </div>

            {/* Environment Cards */}
            <div className="mt-4 p-4 flex space-x-4 overflow-x-scroll marquee-wrapper">
                <div className="marquee-container space-x-4">
                    {[...Array(2)].map((_, index) => (
                        <React.Fragment key={index}>
                            {ENV_LIST.map((env) => {
                                if (env.key.toLowerCase().includes("mobile")) {
                                    const pipelinesListMobile =
                                        getPipelinesByEnv(env.key, "mobile");
                                    const releasesListMobile = getReleasesByEnv(
                                        env.key,
                                        "mobile"
                                    );

                                    const latestPipelineMobile =
                                        pipelinesListMobile[0];
                                    const latestReleaseMobile =
                                        releasesListMobile[0];

                                    return (
                                        <div
                                            key={env.key}
                                            className="border rounded-lg shadow-sm w-[36rem] flex-shrink-0 bg-white hover:animate-pause"
                                        >
                                            <div className="p-4">
                                                <button
                                                    onClick={() =>
                                                        toggleEnvExpansion(
                                                            env.key
                                                        )
                                                    }
                                                    className="w-full flex items-center justify-between mb-4"
                                                >
                                                    <h3 className="text-xl font-bold">
                                                        {env.value}
                                                    </h3>
                                                    {expandedEnvs[env.key] ? (
                                                        <ChevronDown className="w-5 h-5 text-gray-400" />
                                                    ) : (
                                                        <ChevronRight className="w-5 h-5 text-gray-400" />
                                                    )}
                                                </button>

                                                <h3 className="font-bold my-3">
                                                    Mobile
                                                </h3>
                                                <div className="grid grid-cols-2 gap-4">
                                                    {/* CI Status */}
                                                    <button
                                                        onClick={() =>
                                                            latestPipelineMobile &&
                                                            setSelectedItem(
                                                                latestPipelineMobile
                                                            )
                                                        }
                                                        className={`p-4 rounded-lg border flex items-center justify-center space-x-8 
                                                            ${
                                                                latestPipelineMobile
                                                                    ? "hover:bg-gray-50 cursor-pointer"
                                                                    : "cursor-default"
                                                            }`}
                                                    >
                                                        <span className="text-sm font-medium text-gray-500">
                                                            CI
                                                        </span>
                                                        {getStatusIcon(
                                                            latestPipelineMobile?.status,
                                                            latestPipelineMobile?.result
                                                        )}
                                                    </button>

                                                    {/* CD Status */}
                                                    <button
                                                        onClick={() =>
                                                            latestReleaseMobile &&
                                                            setSelectedItem(
                                                                latestReleaseMobile
                                                            )
                                                        }
                                                        className={`p-4 rounded-lg border flex items-center justify-center space-x-8
                                                            ${
                                                                latestReleaseMobile
                                                                    ? "hover:bg-gray-50 cursor-pointer"
                                                                    : "cursor-default"
                                                            }`}
                                                    >
                                                        <span className="text-sm font-medium text-gray-500">
                                                            CD
                                                        </span>
                                                        {getStatusIcon(
                                                            latestReleaseMobile
                                                                ?.environments?.[0]
                                                                ?.status,
                                                            latestReleaseMobile
                                                                ?.environments?.[0]
                                                                ?.status
                                                        )}
                                                    </button>
                                                </div>

                                                {/* Expanded History */}
                                                {expandedEnvs[env.key] && (
                                                    <div className="mt-4 grid grid-cols-2 gap-4">
                                                        {/* CI History */}
                                                        <div className="space-y-2">
                                                            <h4 className="font-medium text-gray-600">
                                                                CI History
                                                            </h4>
                                                            <div className="space-y-2">
                                                                {pipelinesListMobile.map(
                                                                    (
                                                                        pipeline
                                                                    ) => (
                                                                        <button
                                                                            key={
                                                                                pipeline.id
                                                                            }
                                                                            onClick={() =>
                                                                                setSelectedItem(
                                                                                    pipeline
                                                                                )
                                                                            }
                                                                            className="w-full p-3 flex items-center justify-between bg-gray-50 rounded hover:bg-gray-100"
                                                                        >
                                                                            <div className="flex items-center space-x-3">
                                                                                {getStatusIcon(
                                                                                    pipeline.status,
                                                                                    pipeline.result,
                                                                                    5
                                                                                )}
                                                                                <span className="text-sm">
                                                                                    {
                                                                                        pipeline
                                                                                            .definition
                                                                                            .name
                                                                                    }
                                                                                </span>
                                                                            </div>
                                                                            <span className="text-xs text-gray-500">
                                                                                {new Date(
                                                                                    pipeline.startTime
                                                                                ).toLocaleDateString()}
                                                                            </span>
                                                                        </button>
                                                                    )
                                                                )}
                                                            </div>
                                                        </div>

                                                        {/* CD History */}
                                                        <div className="space-y-2">
                                                            <h4 className="font-medium text-gray-600">
                                                                CD History
                                                            </h4>
                                                            <div className="space-y-2">
                                                                {releasesListMobile.map(
                                                                    (
                                                                        release
                                                                    ) => (
                                                                        <button
                                                                            key={
                                                                                release.id
                                                                            }
                                                                            onClick={() =>
                                                                                setSelectedItem(
                                                                                    release
                                                                                )
                                                                            }
                                                                            className="w-full p-3 flex items-center justify-between bg-gray-50 rounded hover:bg-gray-100"
                                                                        >
                                                                            <div className="flex items-center space-x-3">
                                                                                {getStatusIcon(
                                                                                    latestReleaseWeb
                                                                                        ?.environments?.[0]
                                                                                        ?.status,
                                                                                    release
                                                                                        .environments?.[0]
                                                                                        ?.status,
                                                                                    5
                                                                                )}
                                                                                <span className="text-sm">
                                                                                    {
                                                                                        release.name
                                                                                    }
                                                                                </span>
                                                                            </div>
                                                                            <span className="text-xs text-gray-500">
                                                                                {new Date(
                                                                                    release.createdOn
                                                                                ).toLocaleDateString()}
                                                                            </span>
                                                                        </button>
                                                                    )
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                }
                                const pipelinesListWeb = getPipelinesByEnv(
                                    env.key,
                                    "web"
                                );
                                const pipelinesListOthers = getPipelinesByEnv(
                                    env.key,
                                    "others"
                                );
                                const releasesListWeb = getReleasesByEnv(
                                    env.key,
                                    "web"
                                );
                                const releasesListOthers = getReleasesByEnv(
                                    env.key,
                                    "others"
                                );

                                const latestPipelineWeb = getPipelinesByEnv(
                                    env.key,
                                    "web"
                                )[0];
                                const latestPipelineOthers = getPipelinesByEnv(
                                    env.key,
                                    "others"
                                )[0];
                                const latestReleaseWeb = getReleasesByEnv(
                                    env.key,
                                    "web"
                                )[0];
                                const latestReleaseOthers = getReleasesByEnv(
                                    env.key,
                                    "others"
                                )[0];

                                return (
                                    <div
                                        key={env.key}
                                        className="border rounded-lg shadow-sm w-[36rem] flex-shrink-0 bg-white hover:animate-pause"
                                    >
                                        <div className="p-4">
                                            <button
                                                onClick={() =>
                                                    toggleEnvExpansion(env.key)
                                                }
                                                className="w-full flex items-center justify-between mb-4"
                                            >
                                                <h3 className="text-xl font-bold">
                                                    {env.value}
                                                </h3>
                                                {expandedEnvs[env.key] ? (
                                                    <ChevronDown className="w-5 h-5 text-gray-400" />
                                                ) : (
                                                    <ChevronRight className="w-5 h-5 text-gray-400" />
                                                )}
                                            </button>

                                            <h3 className="font-bold my-3 ">
                                                Web
                                            </h3>
                                            <div className="grid grid-cols-2 gap-4">
                                                {/* CI Status */}
                                                <button
                                                    onClick={() =>
                                                        latestPipelineWeb &&
                                                        setSelectedItem(
                                                            latestPipelineWeb
                                                        )
                                                    }
                                                    className={`p-4 rounded-lg border flex items-center justify-center space-x-8 
                                            ${
                                                latestPipelineWeb
                                                    ? "hover:bg-gray-50 cursor-pointer"
                                                    : "cursor-default"
                                            }`}
                                                >
                                                    <span className="text-sm font-medium text-gray-500">
                                                        CI
                                                    </span>
                                                    {getStatusIcon(
                                                        latestPipelineWeb?.status,
                                                        latestPipelineWeb?.result
                                                    )}
                                                </button>

                                                {/* CD Status */}
                                                <button
                                                    onClick={() =>
                                                        latestReleaseWeb &&
                                                        setSelectedItem(
                                                            latestReleaseWeb
                                                        )
                                                    }
                                                    className={`p-4 rounded-lg border flex items-center justify-center space-x-8
                                            ${
                                                latestReleaseWeb
                                                    ? "hover:bg-gray-50 cursor-pointer"
                                                    : "cursor-default"
                                            }`}
                                                >
                                                    <span className="text-sm font-medium text-gray-500">
                                                        CD
                                                    </span>
                                                    {getStatusIcon(
                                                        latestReleaseWeb
                                                            ?.environments?.[0]
                                                            ?.status,
                                                        latestReleaseWeb
                                                            ?.environments?.[0]
                                                            ?.status
                                                    )}
                                                </button>
                                            </div>
                                            {/* Expanded History */}
                                            {expandedEnvs[env.key] && (
                                                <div className="mt-4 grid grid-cols-2 gap-4">
                                                    {/* CI History */}
                                                    <div className="space-y-2">
                                                        <h4 className="font-medium text-gray-600">
                                                            CI History
                                                        </h4>
                                                        <div className="space-y-2">
                                                            {pipelinesListWeb.map(
                                                                (pipeline) => (
                                                                    <button
                                                                        key={
                                                                            pipeline.id
                                                                        }
                                                                        onClick={() =>
                                                                            setSelectedItem(
                                                                                pipeline
                                                                            )
                                                                        }
                                                                        className="w-full p-3 flex items-center justify-between bg-gray-50 rounded hover:bg-gray-100"
                                                                    >
                                                                        <div className="flex items-center space-x-3">
                                                                            {getStatusIcon(
                                                                                pipeline.status,
                                                                                pipeline.result,
                                                                                5
                                                                            )}
                                                                            <span className="text-sm">
                                                                                {
                                                                                    pipeline
                                                                                        .definition
                                                                                        .name
                                                                                }
                                                                            </span>
                                                                        </div>
                                                                        <span className="text-xs text-gray-500">
                                                                            {new Date(
                                                                                pipeline.startTime
                                                                            ).toLocaleDateString()}
                                                                        </span>
                                                                    </button>
                                                                )
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* CD History */}
                                                    <div className="space-y-2">
                                                        <h4 className="font-medium text-gray-600">
                                                            CD History
                                                        </h4>
                                                        <div className="space-y-2">
                                                            {releasesListWeb.map(
                                                                (release) => (
                                                                    <button
                                                                        key={
                                                                            release.id
                                                                        }
                                                                        onClick={() =>
                                                                            setSelectedItem(
                                                                                release
                                                                            )
                                                                        }
                                                                        className="w-full p-3 flex items-center justify-between bg-gray-50 rounded hover:bg-gray-100"
                                                                    >
                                                                        <div className="flex items-center space-x-3">
                                                                            {getStatusIcon(
                                                                                release
                                                                                    ?.environments?.[0]
                                                                                    ?.status,
                                                                                release
                                                                                    .environments?.[0]
                                                                                    ?.status,
                                                                                5
                                                                            )}
                                                                            <span className="text-sm">
                                                                                {
                                                                                    release.name
                                                                                }
                                                                            </span>
                                                                        </div>
                                                                        <span className="text-xs text-gray-500">
                                                                            {new Date(
                                                                                release.createdOn
                                                                            ).toLocaleDateString()}
                                                                        </span>
                                                                    </button>
                                                                )
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            <h3 className="font-bold my-3 ">
                                                API
                                            </h3>

                                            <div className="grid grid-cols-2 gap-4">
                                                {/* CI Status */}
                                                <button
                                                    onClick={() =>
                                                        latestPipelineOthers &&
                                                        setSelectedItem(
                                                            latestPipelineOthers
                                                        )
                                                    }
                                                    className={`p-4 rounded-lg border flex items-center justify-center space-x-8 
                                            ${
                                                latestPipelineOthers
                                                    ? "hover:bg-gray-50 cursor-pointer"
                                                    : "cursor-default"
                                            }`}
                                                >
                                                    <span className="text-sm font-medium text-gray-500">
                                                        CI
                                                    </span>
                                                    {getStatusIcon(
                                                        latestPipelineOthers?.status,
                                                        latestPipelineOthers?.result
                                                    )}
                                                </button>

                                                <button
                                                    onClick={() =>
                                                        latestReleaseOthers &&
                                                        setSelectedItem(
                                                            latestReleaseOthers
                                                        )
                                                    }
                                                    className={`p-4 rounded-lg border flex items-center justify-center space-x-8
                                            ${
                                                latestReleaseOthers
                                                    ? "hover:bg-gray-50 cursor-pointer"
                                                    : "cursor-default"
                                            }`}
                                                >
                                                    <span className="text-sm font-medium text-gray-500">
                                                        CD
                                                    </span>
                                                    {getStatusIcon(
                                                        latestReleaseOthers?.status,
                                                        latestReleaseOthers
                                                            ?.environments?.[0]
                                                            ?.status
                                                    )}
                                                </button>
                                            </div>

                                            {expandedEnvs[env.key] && (
                                                <div className="mt-4 grid grid-cols-2 gap-4">
                                                    <div className="space-y-2">
                                                        <h4 className="font-medium text-gray-600">
                                                            CI History
                                                        </h4>
                                                        <div className="space-y-2">
                                                            {pipelinesListOthers.map(
                                                                (pipeline) => (
                                                                    <button
                                                                        key={
                                                                            pipeline.id
                                                                        }
                                                                        onClick={() =>
                                                                            setSelectedItem(
                                                                                pipeline
                                                                            )
                                                                        }
                                                                        className="w-full p-3 flex items-center justify-between bg-gray-50 rounded hover:bg-gray-100"
                                                                    >
                                                                        <div className="flex items-center space-x-3">
                                                                            {getStatusIcon(
                                                                                pipeline.status,
                                                                                pipeline.result,
                                                                                5
                                                                            )}
                                                                            <span className="text-sm">
                                                                                {
                                                                                    pipeline
                                                                                        .definition
                                                                                        .name
                                                                                }
                                                                            </span>
                                                                        </div>
                                                                        <span className="text-xs text-gray-500">
                                                                            {new Date(
                                                                                pipeline.startTime
                                                                            ).toLocaleDateString()}
                                                                        </span>
                                                                    </button>
                                                                )
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* CD History */}
                                                    <div className="space-y-2">
                                                        <h4 className="font-medium text-gray-600">
                                                            CD History
                                                        </h4>
                                                        <div className="space-y-2">
                                                            {releasesListOthers.map(
                                                                (release) => (
                                                                    <button
                                                                        key={
                                                                            release.id
                                                                        }
                                                                        onClick={() =>
                                                                            setSelectedItem(
                                                                                release
                                                                            )
                                                                        }
                                                                        className="w-full p-3 flex items-center justify-between bg-gray-50 rounded hover:bg-gray-100"
                                                                    >
                                                                        <div className="flex items-center space-x-3">
                                                                            {getStatusIcon(
                                                                                release
                                                                                    .environments?.[0]
                                                                                    ?.status,
                                                                                release
                                                                                    .environments?.[0]
                                                                                    ?.status,
                                                                                5
                                                                            )}
                                                                            <span className="text-sm">
                                                                                {
                                                                                    release.name
                                                                                }
                                                                            </span>
                                                                        </div>
                                                                        <span className="text-xs text-gray-500">
                                                                            {new Date(
                                                                                release.createdOn
                                                                            ).toLocaleDateString()}
                                                                        </span>
                                                                    </button>
                                                                )
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </React.Fragment>
                    ))}
                </div>
            </div>

            {selectedItem && selectedItem.definition && (
                <PipelineModal
                    pipeline={selectedItem}
                    onClose={() => setSelectedItem(null)}
                />
            )}
            {selectedItem && !selectedItem.definition && (
                <ReleaseModal
                    release={selectedItem}
                    onClose={() => setSelectedItem(null)}
                />
            )}
        </div>
    );
};

export default EnvironmentCICD;
