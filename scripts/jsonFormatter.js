export const formatJSON = (jsonInput, outputElement) => {
    try {
        const parsed = JSON.parse(jsonInput);
        const formatted = JSON.stringify(parsed, null, 4);
        outputElement.textContent = formatted;
        outputElement.style.color = 'green';
    } catch (error) {
        outputElement.textContent = `Invalid JSON: ${error.message}`;
        outputElement.style.color = 'red';
    }
};
