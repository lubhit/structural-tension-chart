/*
 * Configuration object to be passed to MSAL instance on creation. 
 */
export const msalConfig = {
    auth: {
        // REPLACE this with your actual Application (client) ID from Azure Portal
        clientId: "2fee8d3c-efac-479e-ad0a-e4e9272dc080", 
        
        // Use "consumers" for personal Microsoft accounts (Outlook, Hotmail, etc.)
        authority: "https://login.microsoftonline.com/consumers", 
        
        // This dynamically detects if you are on localhost:5173 or https://your-gcp-url.run.app
        redirectUri: window.location.origin,
        
        // Ensures the user is sent back to the main page after logging out
        postLogoutRedirectUri: window.location.origin,
        
        // Recommended for Single Page Apps (SPA)
        navigateToLoginRequestUrl: true,
    },
    cache: {
        cacheLocation: "sessionStorage", // This prefers session storage over cookies
        storeAuthStateInCookie: false,   // Set to true if you face issues on IE11 or Safari
    }
};

/**
 * Scopes you add here will be prompted for user consent during sign-in.
 */
export const loginRequest = {
    scopes: ["User.Read"]
};
