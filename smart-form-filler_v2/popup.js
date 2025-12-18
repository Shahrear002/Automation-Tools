// 1. Load saved data when popup opens
document.addEventListener('DOMContentLoaded', () => {
    chrome.storage.local.get(['formData'], (result) => {
        if (result.formData) {
            document.getElementById('dataInput').value = result.formData;
        }
    });
});

// --- SCAN BUTTON LOGIC ---
document.getElementById('scanBtn').addEventListener('click', async () => {
    const btn = document.getElementById('scanBtn');
    btn.innerText = "Scanning...";
    
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: scanPageForLabels,
    }, (results) => {
        btn.innerText = "Scan Page & Generate Template";
        
        if (results && results[0] && results[0].result) {
            document.getElementById('dataInput').value = results[0].result;
            document.getElementById('status').innerText = "Template generated!";
            chrome.storage.local.set({ 'formData': results[0].result });
        } else {
            document.getElementById('status').innerText = "No inputs found.";
        }
    });
});

// --- FILL BUTTON LOGIC ---
document.getElementById('fillBtn').addEventListener('click', async () => {
    const textData = document.getElementById('dataInput').value;
    const btn = document.getElementById('fillBtn');
    
    chrome.storage.local.set({ 'formData': textData });

    btn.innerText = "Running...";
    btn.style.backgroundColor = "#95a5a6";

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const dataMap = parseInputData(textData);

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

// --- NEW: CLEAR BUTTON LOGIC ---
document.getElementById('clearBtn').addEventListener('click', () => {
    // Clear the textarea
    document.getElementById('dataInput').value = '';
    // Clear the status
    document.getElementById('status').innerText = "Data cleared.";
    // Remove from storage so it doesn't come back on reload
    chrome.storage.local.remove('formData');
});

// Helper: Convert "Name: John" string into Object
function parseInputData(text) {
    const map = {};
    text.split('\n').forEach(line => {
        if (line.includes(':')) {
            const parts = line.split(':');
            const key = parts[0].trim().toLowerCase(); 
            const val = parts.slice(1).join(':').trim();
            if (key) map[key] = val; 
        }
    });
    return map;
}

// --- CONTENT SCRIPT: SCANNER ---
function scanPageForLabels() {
    const inputs = document.querySelectorAll('input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="search"]):not([type="radio"]):not([type="checkbox"]):not([type="file"]):not([type="reset"]):not([type="image"]), textarea');
    
    let generatedList = [];
    let seenLabels = new Set(); 

    inputs.forEach(input => {
        // Filter 1: Attributes
        const ident = (input.id + ' ' + input.name + ' ' + input.placeholder).toLowerCase();
        if (ident.includes('search') || ident.includes('query') || ident.includes('keyword') || ident.includes('start typing')) {
            return; 
        }

        let labelText = "";

        // Strategy 1: Explicit Label Tag
        if (input.id) {
            const label = document.querySelector(`label[for="${input.id}"]`);
            if (label) labelText = label.innerText;
        }
        // Strategy 2: Placeholder / Title / Aria
        if (!labelText) labelText = input.placeholder || input.title || input.getAttribute('aria-label') || "";

        // Strategy 3: Table Column Headers
        if (!labelText) {
            const parentTd = input.closest('td');
            if (parentTd) {
                const colIndex = parentTd.cellIndex;
                const parentTr = parentTd.closest('tr');
                const prevTr = parentTr.previousElementSibling; 
                
                if (prevTr && prevTr.children[colIndex]) {
                    labelText = prevTr.children[colIndex].innerText;
                }
                if (!labelText) {
                    const table = parentTd.closest('table');
                    if (table) {
                        const headCells = table.querySelectorAll('th');
                        if (headCells[colIndex]) labelText = headCells[colIndex].innerText;
                    }
                }
            }
        }
        // Strategy 4: Nearby Text
        if (!labelText && input.previousElementSibling) {
            labelText = input.previousElementSibling.innerText;
        }

        // Filter 2: Label Text
        if (labelText) {
            const lowerLabel = labelText.toLowerCase();
            if (lowerLabel.includes('search') || lowerLabel.includes('start typing')) {
                return;
            }
        }

        if (labelText) {
            let cleanLabel = labelText.replace(/[:*]/g, '').trim();
            
            if (cleanLabel && !seenLabels.has(cleanLabel)) {
                seenLabels.add(cleanLabel);
                let currentValue = input.value || "";
                generatedList.push(`${cleanLabel} : ${currentValue}`);
            }
        }
    });

    return generatedList.join('\n');
}

// --- CONTENT SCRIPT: FILLER ---
function smartAutofill(dataMap) {
    let count = 0;
    const inputs = document.querySelectorAll('input:not([type="hidden"]):not([type="submit"]):not([type="button"]), textarea');

    inputs.forEach(input => {
        let labelText = "";

        if (input.id) {
            const label = document.querySelector(`label[for="${input.id}"]`);
            if (label) labelText = label.innerText;
        }
        if (!labelText) labelText = input.placeholder || input.title || input.getAttribute('aria-label') || "";

        if (!labelText) {
            const parentTd = input.closest('td');
            if (parentTd) {
                const colIndex = parentTd.cellIndex;
                const parentTr = parentTd.closest('tr');
                const prevTr = parentTr.previousElementSibling;
                if (prevTr && prevTr.children[colIndex]) labelText = prevTr.children[colIndex].innerText;
                if (!labelText) {
                     const table = parentTd.closest('table');
                     if (table) {
                         const headCells = table.querySelectorAll('th');
                         if (headCells[colIndex]) labelText = headCells[colIndex].innerText;
                     }
                }
            }
        }
        if (!labelText && input.previousElementSibling) labelText = input.previousElementSibling.innerText;

        if (labelText) {
            const cleanLabel = labelText.replace(/[:*]/g, '').trim().toLowerCase();
            
            for (const [key, value] of Object.entries(dataMap)) {
                if (cleanLabel === key) {
                    if (input.type === 'checkbox') {
                        input.checked = (value.toLowerCase() === 'yes' || value.toLowerCase() === 'true');
                    } else {
                        input.value = value;
                    }
                    input.dispatchEvent(new Event('input', { bubbles: true }));
                    input.dispatchEvent(new Event('change', { bubbles: true }));
                    input.dispatchEvent(new Event('blur', { bubbles: true }));
                    input.style.backgroundColor = "#fff9c4"; 
                    count++;
                    break; 
                }
            }
        }
    });
    return `Filled ${count} fields!`;
}