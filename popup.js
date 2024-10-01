import { formatJSON } from './scripts/jsonFormatter.js';
import { viewLocalStorage, viewCookies } from './scripts/localStorageViewer.js';
import { saveSnippet, viewSnippets } from './scripts/codeSnippetManager.js';

// Variables for network capturing
let capturing = false;
let capturedRequests = [];

document.addEventListener('DOMContentLoaded', () => {
    // Handle JSON Formatter button click
    const formatJsonButton = document.getElementById('format-json');
    if (formatJsonButton) {
        formatJsonButton.addEventListener('click', () => {
            const jsonInput = document.getElementById('json-input').value;
            const outputElement = document.getElementById('json-output');
            try {
                formatJSON(jsonInput, outputElement);
            } catch (error) {
                outputElement.textContent = 'Error formatting JSON: ' + error.message;
                outputElement.style.color = 'red';
            }
        });
    }

    // Handle LocalStorage Viewer button click
    const localStorageButton = document.getElementById('view-local-storage');
    if (localStorageButton) {
        localStorageButton.addEventListener('click', () => {
            const outputElement = document.getElementById('storage-output');
            try {
                viewLocalStorage(outputElement);
            } catch (error) {
                outputElement.textContent = 'Error viewing LocalStorage: ' + error.message;
                outputElement.style.color = 'red';
            }
        });
    }

    // Handle Cookies Viewer button click
    const cookiesButton = document.getElementById('view-cookies');
    if (cookiesButton) {
        cookiesButton.addEventListener('click', () => {
            const outputElement = document.getElementById('storage-output');
            try {
                viewCookies(outputElement);
            } catch (error) {
                outputElement.textContent = 'Error viewing Cookies: ' + error.message;
                outputElement.style.color = 'red';
            }
        });
    }

    // Handle SessionStorage Viewer button click
    const sessionStorageButton = document.getElementById('view-session-storage');
    if (sessionStorageButton) {
        sessionStorageButton.addEventListener('click', () => {
            const outputElement = document.getElementById('storage-output');
            getActiveTabId((activeTabId) => {
                try {
                    chrome.scripting.executeScript({
                        target: { tabId: activeTabId },
                        func: () => JSON.stringify(window.sessionStorage)
                    }, (results) => {
                        outputElement.textContent = results[0]?.result || 'No SessionStorage data found.';
                    });
                } catch (error) {
                    outputElement.textContent = 'Error viewing SessionStorage: ' + error.message;
                }
            });
        });
    }

    // Handle JS Console Evaluator
    document.getElementById('run-js').addEventListener('click', () => {
        const code = document.getElementById('js-console-input').value;
        if (!code.trim()) {
            document.getElementById('js-console-output').textContent = 'No code to execute.';
            return;
        }
    
        // Send the code to the background script for execution
        chrome.runtime.sendMessage({ type: 'EXECUTE_JS', code: code }, (response) => {
            const outputElement = document.getElementById('js-console-output');
            if (response.error) {
                outputElement.textContent = 'Error: ' + response.error;
                outputElement.style.color = 'red';
            } else {
                outputElement.textContent = response.result || 'No output';
            }
        });
    });

    // Handle Network Requests
    document.getElementById('start-capture').addEventListener('click', () => {
        capturing = true;
        capturedRequests = [];
        chrome.webRequest.onCompleted.addListener((details) => {
            if (capturing) {
                capturedRequests.push({ url: details.url, method: details.method, status: details.statusCode });
                updateNetworkOutput();
                saveCapturedRequests(capturedRequests);  // Save the captured requests
            }
        }, { urls: ["<all_urls>"] });

        document.getElementById('start-capture').disabled = true;
        document.getElementById('stop-capture').disabled = false;
    });

    document.getElementById('stop-capture').addEventListener('click', () => {
        capturing = false;
        document.getElementById('start-capture').disabled = false;
        document.getElementById('stop-capture').disabled = true;
    });

    function updateNetworkOutput() {
        const outputElement = document.getElementById('network-output');
        outputElement.textContent = capturedRequests.length ?
            capturedRequests.map(req => `URL: ${req.url}, Method: ${req.method}, Status: ${req.status}`).join('\n\n') :
            'No requests captured yet.';
    }

    function saveCapturedRequests(requests) {
        chrome.storage.local.set({ capturedRequests: requests }, () => {
            console.log('Captured requests saved.');
        });
    }

    // Load previously captured requests when popup is opened
    chrome.storage.local.get(['capturedRequests'], function (data) {
        if (data.capturedRequests) {
            capturedRequests = data.capturedRequests;
            updateNetworkOutput();
        }
    });

    // Handle Code Snippet Saving button click
    const saveSnippetButton = document.getElementById('save-snippet');
    if (saveSnippetButton) {
        saveSnippetButton.addEventListener('click', () => {
            const snippet = document.getElementById('snippet-input').value;
            if (snippet.trim()) {
                saveSnippet(snippet);
                document.getElementById('snippet-input').value = ''; // Clear input
            } else {
                alert('Snippet cannot be empty!');
            }
        });
    }

    // Handle Viewing Saved Snippets button click
    const viewSnippetsButton = document.getElementById('view-snippets');
    if (viewSnippetsButton) {
        viewSnippetsButton.addEventListener('click', () => {
            const outputElement = document.getElementById('snippet-output');
            try {
                viewSnippets(outputElement);
            } catch (error) {
                outputElement.textContent = 'Error viewing snippets: ' + error.message;
            }
        });
    }

    // Handle Clipboard Management
    document.getElementById('copy-to-clipboard').addEventListener('click', () => {
        const input = document.getElementById('clipboard-input').value;
        navigator.clipboard.writeText(input).then(() => alert('Copied to clipboard'));
    });

    document.getElementById('paste-from-clipboard').addEventListener('click', () => {
        navigator.clipboard.readText().then(text => {
            document.getElementById('clipboard-output').textContent = text;
            document.getElementById('clipboard-input').value = text;
        });
    });

    // Handle User-Agent Switcher
    document.getElementById('set-user-agent').addEventListener('click', () => {
        const customUserAgent = document.getElementById('user-agent-input').value;
        const messageBox = document.getElementById('user-agent-message');

        if (customUserAgent.trim() === "") {
            messageBox.textContent = "Please enter a User-Agent.";
            messageBox.classList.add("error");
            messageBox.classList.remove("success");
            return;
        }

        // Send a message to the background script to change User-Agent dynamically
        chrome.runtime.sendMessage({ type: 'USER_ACTION', action: 'SET_USER_AGENT', userAgent: customUserAgent }, (response) => {
            if (response.status) {
                messageBox.textContent = response.status;  // Display the success message
                messageBox.classList.add("success");
                messageBox.classList.remove("error");

                // Clear the input field
                document.getElementById('user-agent-input').value = "";
                // Save the custom User-Agent persistently
                chrome.storage.sync.set({ userAgent: customUserAgent });
            } else {
                messageBox.textContent = "Error updating User-Agent.";
                messageBox.classList.add("error");
                messageBox.classList.remove("success");
            }
        });
    });

    // Load previously set User-Agent
    chrome.storage.sync.get(['userAgent'], function (data) {
        if (data.userAgent) {
            document.getElementById('user-agent-input').value = data.userAgent;
        }
    });

    // Dark mode toggle
    const darkModeToggle = document.getElementById('dark-mode-toggle');
    if (darkModeToggle) {
        darkModeToggle.addEventListener('change', () => {
            const isDarkMode = darkModeToggle.checked;
            document.body.classList.toggle('dark-mode', isDarkMode);
        });
    }

    // Tab switching logic
    const tabs = document.querySelectorAll('.tab');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            const activeTabId = tab.id.replace('tab', 'content');
            tabContents.forEach(content => content.classList.remove('show'));
            const activeTab = document.getElementById(activeTabId);
            if (activeTab) activeTab.classList.add('show');
        });
    });
});

// Function to get the active tab ID
function getActiveTabId(callback) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs.length > 0) {
            const activeTab = tabs[0];
            callback(activeTab.id);
        } else {
            console.error('No active tab found.');
        }
    });
}
