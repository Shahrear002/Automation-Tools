// 1. Load saved data when popup opens
document.addEventListener('DOMContentLoaded', () => {
    chrome.storage.local.get(['formData'], (result) => {
        if (result.formData) {
            document.getElementById('dataInput').value = result.formData;
        }
    });
});

// 2. Save data and Run Script when button clicked
document.getElementById('fillBtn').addEventListener('click', async () => {
    const textData = document.getElementById('dataInput').value;
    const btn = document.getElementById('fillBtn');
    
    // Save to local storage
    chrome.storage.local.set({ 'formData': textData });

    // Visual feedback
    btn.innerText = "Running...";
    btn.style.backgroundColor = "#95a5a6";

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    // Parse the text into a clean object
    const dataMap = parseInputData(textData);

    // Inject the script
    chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: smartAutofill,
        args: [dataMap]
    }, (results) => {
        btn.innerText = "Autofill Form";
        btn.style.backgroundColor = "#27ae60";
        
        if (results && results[0]) {
            document.getElementById('status').innerText = results[0].result;
        }
    });
});

// Helper: Convert "Name: John" string into Object
function parseInputData(text) {
    const map = {};
    text.split('\n').forEach(line => {
        if (line.includes(':')) {
            const parts = line.split(':');
            // Clean the key: remove extra spaces and standardize
            const key = parts[0].trim().toLowerCase(); 
            const val = parts.slice(1).join(':').trim();
            if (key && val) map[key] = val;
        }
    });
    return map;
}

// --- The Core Logic (Injected into Page) ---
function smartAutofill(dataMap) {
    let count = 0;
    
    // RESTRICTION: Only select 'input' and 'textarea'. Exclude 'select' (dropdowns).
    // Also excluding hidden fields and buttons to be safe.
    const inputs = document.querySelectorAll('input:not([type="hidden"]):not([type="submit"]):not([type="button"]), textarea');

    inputs.forEach(input => {
        let labelText = "";

        // --- Strategy 1: Explicit Label Tag ---
        if (input.id) {
            const label = document.querySelector(`label[for="${input.id}"]`);
            if (label) labelText = label.innerText;
        }

        // --- Strategy 2: Placeholder / Title / Aria ---
        if (!labelText) labelText = input.placeholder || input.title || input.getAttribute('aria-label') || "";

        // --- Strategy 3: Table Column Header ---
        if (!labelText) {
            const parentTd = input.closest('td');
            if (parentTd) {
                const colIndex = parentTd.cellIndex;
                const table = parentTd.closest('table');
                
                // Try 3a: Look at the row strictly above
                const parentTr = parentTd.closest('tr');
                const prevTr = parentTr.previousElementSibling;
                if (prevTr && prevTr.children[colIndex]) {
                    labelText = prevTr.children[colIndex].innerText;
                }

                // Try 3b: Look for a <th> in the <thead>
                if (!labelText && table) {
                    const headCells = table.querySelectorAll('th');
                    if (headCells[colIndex]) {
                        labelText = headCells[colIndex].innerText;
                    }
                }
            }
        }

        // --- Strategy 4: Nearby Text ---
        if (!labelText && input.previousElementSibling) {
            labelText = input.previousElementSibling.innerText;
        }

        // --- STRICT MATCHING & FILLING ---
        if (labelText) {
            // Clean the label: Remove colons (:), asterisks (*), and extra spaces
            const cleanLabel = labelText.replace(/[:*]/g, '').trim().toLowerCase();
            
            // Iterate through our data map
            for (const [key, value] of Object.entries(dataMap)) {
                
                // STRICT MATCH: The label must equal the key (case-insensitive)
                // This prevents "Position" from matching "Proposed Position"
                if (cleanLabel === key) {
                    
                    // Handle Checkboxes
                    if (input.type === 'checkbox') {
                        const shouldCheck = (value.toLowerCase() === 'yes' || value.toLowerCase() === 'true');
                        input.checked = shouldCheck;
                    }
                    // Handle Text Inputs / Dates / Numbers / Textarea
                    else {
                        input.value = value;
                    }

                    // TRIGGER EVENTS
                    input.dispatchEvent(new Event('input', { bubbles: true }));
                    input.dispatchEvent(new Event('change', { bubbles: true }));
                    input.dispatchEvent(new Event('blur', { bubbles: true }));

                    // Visual Feedback
                    input.style.backgroundColor = "#fff9c4"; 
                    count++;
                    break; // Stop looking for keys for this input
                }
            }
        }
    });

    return `Filled ${count} input fields (Strict Match)!`;
}