// Logic for the "Fill Dropdowns" button
document.getElementById('fillBtn').addEventListener('click', async () => {
    const targetValue = document.getElementById('valueInput').value;
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: autofillDropdowns,
      args: [targetValue]
    }, (results) => {
        // Show status after script runs
        const count = results[0].result;
        document.getElementById('status').innerText = `Updated ${count} items!`;
    });
});

// Logic for the "Close" button
document.getElementById('closeBtn').addEventListener('click', () => {
    window.close();
});
  
// This function is injected into the page
function autofillDropdowns(valueToFind) {
    const dropdowns = document.querySelectorAll('select');
    let count = 0;
  
    dropdowns.forEach(select => {
      for (let i = 0; i < select.options.length; i++) {
        const optionText = select.options[i].text.trim();
        
        // Case-insensitive comparison
        if (optionText.toLowerCase() === valueToFind.toLowerCase()) {
          select.selectedIndex = i;
          // Trigger change event to ensure page calculations update
          select.dispatchEvent(new Event('change', { bubbles: true }));
          count++;
          break; 
        }
      }
    });
    return count;
}