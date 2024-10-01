export const saveSnippet = (snippet) => {
    chrome.storage.sync.get({ snippets: [] }, (data) => {
        const snippets = data.snippets;
        snippets.push(snippet);
        chrome.storage.sync.set({ snippets });
    });
};

export const viewSnippets = (outputElement) => {
    chrome.storage.sync.get({ snippets: [] }, (data) => {
        outputElement.textContent = data.snippets.join('\n\n');
    });
};
