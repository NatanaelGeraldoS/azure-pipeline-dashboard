import React, { useEffect, useState } from "react";
import { PublicClientApplication } from "@azure/msal-browser";

// https://techcommunity.microsoft.com/blog/azurepaasblog/how-to-send-an-azure-rest-api-request/3815890
// MSAL Configuration
const msalConfig = {
    auth: {
        clientId: process.env.REACT_APP_CLIENT_ID, // Replace with your client ID
        authority: `https://login.microsoftonline.com/${process.env.REACT_APP_TENANT_ID}`, // Replace with your tenant ID
        redirectUri: "http://localhost:3000", // Replace with your redirect URI
    },
};
console.log(msalConfig);

const msalInstance = new PublicClientApplication(msalConfig);

const AzureApiComponent = () => {
    const [apiData, setApiData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [initialized, setInitialized] = useState(false);
    useEffect(() => {
        const initializeMsal = async () => {
            try {
                await msalInstance.initialize(); // Ensure initialization
                setInitialized(true);
            } catch (error) {
                console.error("Initialization error:", error);
            }
        };

        initializeMsal();
    }, []);

    const loginRequest = {
        scopes: ["https://management.azure.com/.default"], // Request access to Azure Management API
    };

    const loginAndGetToken = async () => {
        try {
            const response = await msalInstance.loginPopup(loginRequest);
            const account = response.account;
            const tokenResponse = await msalInstance.acquireTokenSilent({
                account: account,
                scopes: ["https://management.azure.com/.default"],
            });

            return tokenResponse.accessToken;
        } catch (error) {
            console.error("Authentication error:", error);
        }
    };

    const callAzureAPI = async () => {
        setLoading(true);
        const token = await loginAndGetToken();
        if (token) {
            try {
                const response = await fetch(
                    "https://management.azure.com/subscriptions/YOUR_SUBSCRIPTION_ID/resourceGroups/YOUR_RESOURCE_GROUP/providers/Microsoft.Sql/servers/YOUR_SERVER_NAME/recommendedElasticPools?api-version=2014-04-01",
                    {
                        method: "GET",
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                    }
                );

                const data = await response.json();
                setApiData(data);
            } catch (error) {
                console.error("API request error:", error);
            }
        }
        setLoading(false);
    };

    return (
        <div>
            <h1>Azure SQL Recommended Elastic Pools</h1>
            <button onClick={callAzureAPI}>Get Data</button>
            {loading && <p>Loading...</p>}
            {apiData && (
                <div>
                    <h3>API Data:</h3>
                    <pre>{JSON.stringify(apiData, null, 2)}</pre>
                </div>
            )}
        </div>
    );
};

export default AzureApiComponent;
