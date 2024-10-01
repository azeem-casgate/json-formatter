let customUserAgent = "";

// When the extension is installed or updated
chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === 'install') {
        console.log('Developer Productivity Tools extension installed for the first time.');
    } else if (details.reason === 'update') {
        const thisVersion = chrome.runtime.getManifest().version;
        console.log(`Developer Productivity Tools extension updated to version ${thisVersion}`);
    }
});

// Listen for messages from the popup or other parts of the extension
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'USER_ACTION' && message.action === 'SET_USER_AGENT') {
        customUserAgent = message.userAgent;

        // Remove existing dynamic rules and add a new rule for custom User-Agent
        chrome.declarativeNetRequest.updateDynamicRules({
            removeRuleIds: [1],  // Remove existing User-Agent modification rule (if exists)
            addRules: [
                {
                    id: 1,  // Unique ID for this rule
                    priority: 1,
                    action: {
                        type: "modifyHeaders",
                        requestHeaders: [
                            { header: "User-Agent", operation: "set", value: customUserAgent }
                        ]
                    },
                    condition: {
                        urlFilter: "*",  // Apply to all URLs
                        resourceTypes: ["main_frame", "sub_frame"]  // Modify only for main frames and subframes
                    }
                }
            ]
        }, () => {
            if (chrome.runtime.lastError) {
                console.error("Error updating User-Agent: ", chrome.runtime.lastError.message);
                sendResponse({ status: 'failed', message: chrome.runtime.lastError.message });
            } else {
                console.log(`User-Agent updated to: ${customUserAgent}`);
                sendResponse({ status: 'success', message: 'User-Agent updated successfully' });
            }
        });

        // Return true to indicate that the response is asynchronous
        return true;
    }
});

// Logging network requests (non-blocking, just for monitoring traffic)
chrome.webRequest.onBeforeSendHeaders.addListener(
    (details) => {
        console.log(`Request made to: ${details.url}`);
        return { requestHeaders: details.requestHeaders };
    },
    { urls: ["<all_urls>"] }  // Capture all network requests
);

// Additional background functionality for executing JavaScript securely
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'EXECUTE_JS') {
        const code = message.code;

        // Get the active tab
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs.length > 0) {
                const activeTabId = tabs[0].id;

                // Securely execute the provided JavaScript code in the active tab
                chrome.scripting.executeScript({
                    target: { tabId: activeTabId },
                    func: (userCode) => {
                        try {
                            // Use safer methods like Function constructor instead of eval
                            return { success: true, result: new Function(userCode)() };
                        } catch (error) {
                            return { success: false, error: error.message };
                        }
                    },
                    args: [code] // Pass the user code as an argument
                }, (results) => {
                    const result = results[0]?.result;

                    if (result.success) {
                        sendResponse({ result: result.result });
                    } else {
                        sendResponse({ error: result.error });
                    }
                });
            }
        });

        // Return true to indicate that the response will be sent asynchronously
        return true;
    }
});
