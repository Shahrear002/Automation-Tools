let socket = null;
let activeTabId = null;

chrome.runtime.onMessage.addListener((msg, sender) => {
    // 1. Connect to Python when Content Script asks
    if (msg.action === "START_WS") {
        activeTabId = sender.tab.id;
        connectWebSocket();
    }
    
    // 2. Forward Audio Chunks
    if (msg.action === "AUDIO_CHUNK") {
        if (socket && socket.readyState === WebSocket.OPEN) {
            const data = new Float32Array(Object.values(msg.data));
            socket.send(data);
        }
    }
});

function connectWebSocket() {
    if (socket && socket.readyState === WebSocket.OPEN) return;

    console.log("🟡 Connecting to Python...");
    socket = new WebSocket("ws://localhost:8000/ws");

    socket.onopen = () => {
        console.log("✅ Connected!");
        if (activeTabId) chrome.tabs.sendMessage(activeTabId, { action: "STATUS", text: "🟢 AI Listening..." });
    };

    socket.onmessage = (event) => {
        if (activeTabId) chrome.tabs.sendMessage(activeTabId, { action: "SUBTITLE", text: event.data });
    };
    
    socket.onclose = () => { console.log("🔴 Socket Closed"); socket = null; };
}