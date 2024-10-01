export const viewLocalStorage = (outputElement) => {
    // Query for the current active tab
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs.length === 0) {
            outputElement.textContent = 'No active tab found.';
            return;
        }

        const activeTab = tabs[0];
        const url = activeTab.url;

        // Check if the URL is restricted (e.g., chrome://, about:, file://)
        if (isRestrictedUrl(url)) {
            outputElement.textContent = 'No LocalStorage data found.';
            // console.warn('Restricted URL:', url);
            return;  // Prevent further execution if the URL is restricted
        }

        // Try to execute the script on the current active tab
        try {
            chrome.scripting.executeScript({
                target: { tabId: activeTab.id },
                func: () => JSON.stringify(window.localStorage)
            }, (results) => {
                if (chrome.runtime.lastError) {
                    console.error('Script execution failed:', chrome.runtime.lastError.message);
                    outputElement.textContent = 'Error accessing LocalStorage: ' + chrome.runtime.lastError.message;
                    return;
                }

                if (results && results.length > 0 && results[0].result) {
                    const localStorageData = results[0].result;
                    outputElement.textContent = localStorageData;
                    outputElement.style.color = 'blue';
                } else {
                    outputElement.textContent = 'No LocalStorage data found.';
                    outputElement.style.color = 'red';
                }
            });
        } catch (error) {
            console.error('Unexpected error:', error);
            outputElement.textContent = 'Unexpected error: ' + error.message;
        }
    });
};

export const viewCookies = (outputElement) => {
    chrome.cookies.getAll({}, (cookies) => {
        if (chrome.runtime.lastError) {
            console.error(chrome.runtime.lastError.message);
            outputElement.textContent = "Error: " + chrome.runtime.lastError.message;
            return;
        }

        const cookieList = cookies.map(cookie => `${cookie.name}: ${cookie.value}`).join('\n');
        outputElement.textContent = cookieList;
        outputElement.style.color = 'blue';
    });
};

// Function to check for restricted URLs (e.g., chrome://, about:, file://)
function isRestrictedUrl(url) {
    return url.startsWith('chrome://') || url.startsWith('about:') || url.startsWith('file://');
}
