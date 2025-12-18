// --- CONFIGURATION ---
const WIDGET_ID = 'whisper-floating-widget';
let socket = null;
let stream = null;
let audioContext = null;
let processor = null;

// --- 1. LISTEN FOR LAUNCH COMMAND ---
chrome.runtime.onMessage.addListener((request) => {
    if (request.action === "INIT_UI") createFloatingWidget();
    if (request.action === "SUBTITLE") updateTranscript(request.text);
    if (request.action === "STATUS") updateStatus(request.text);
});

// --- 2. CREATE THE DRAGGABLE WIDGET ---
function createFloatingWidget() {
    if (document.getElementById(WIDGET_ID)) return;

    const widget = document.createElement('div');
    widget.id = WIDGET_ID;
    
    // HTML Structure (Header + Body + Footer)
    widget.innerHTML = `
        <div id="whisper-header">
            <span>🎧 AI Listener</span>
            <button id="whisper-close">×</button>
        </div>
        <div id="whisper-body">
            <div id="whisper-status">Ready to connect...</div>
            <div id="whisper-transcript"></div>
        </div>
        <div id="whisper-footer">
            <button id="whisper-start-btn">Start</button>
        </div>
    `;

    // INJECT CSS STYLES
    const style = document.createElement('style');
    style.textContent = `
        #${WIDGET_ID} {
            position: fixed; top: 20px; right: 20px; width: 400px;
            background: #fff; border-radius: 8px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.2);
            font-family: 'Segoe UI', sans-serif; z-index: 2147483647;
            overflow: hidden; border: 1px solid #ddd;
        }
        #whisper-header {
            background: #4CAF50; color: white; padding: 8px 12px;
            font-size: 14px; font-weight: bold; cursor: move; /* DRAGGABLE HANDLE */
            display: flex; justify-content: space-between; align-items: center;
        }
        #whisper-close {
            background: none; border: none; color: white; font-size: 18px; cursor: pointer;
        }
        #whisper-body {
            padding: 10px; background: #f9f9f9;
        }
        #whisper-status {
            font-size: 11px; color: #666; margin-bottom: 5px;
        }
        #whisper-transcript {
            height: 100px; overflow-y: auto; background: #fff;
            border: 1px solid #eee; padding: 5px; font-size: 12px; color: #333;
        }
        #whisper-footer {
            padding: 8px 10px; background: #fff; border-top: 1px solid #eee; text-align: right;
        }
        /* SMALLER BUTTON STYLE */
        #whisper-start-btn {
            background: #4CAF50; color: white; border: none;
            padding: 6px 12px; border-radius: 4px; font-size: 12px;
            cursor: pointer; font-weight: bold; transition: background 0.2s;
        }
        #whisper-start-btn:hover { background: #45a049; }
        #whisper-start-btn.stop { background: #f44336; }
    `;
    
    document.head.appendChild(style);
    document.body.appendChild(widget);

    // --- ADD EVENT LISTENERS ---
    
    // 1. Drag Logic
    const header = widget.querySelector('#whisper-header');
    let isDragging = false, offsetX, offsetY;
    
    header.addEventListener('mousedown', (e) => {
        isDragging = true;
        offsetX = e.clientX - widget.getBoundingClientRect().left;
        offsetY = e.clientY - widget.getBoundingClientRect().top;
    });

    document.addEventListener('mousemove', (e) => {
        if (isDragging) {
            widget.style.left = (e.clientX - offsetX) + 'px';
            widget.style.top = (e.clientY - offsetY) + 'px';
            widget.style.right = 'auto'; // Disable 'right' once moved
        }
    });

    document.addEventListener('mouseup', () => isDragging = false);

    // 2. Button Logic
    document.getElementById('whisper-start-btn').onclick = toggleCapture;
    document.getElementById('whisper-close').onclick = () => {
        stopCapture();
        widget.remove();
    };
}

// --- CAPTURE LOGIC ---
async function toggleCapture() {
    if (stream) {
        stopCapture();
    } else {
        startCapture();
    }
}

async function startCapture() {
    try {
        const btn = document.getElementById('whisper-start-btn');
        updateStatus("Select Tab & Share Audio...");
        
        // stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
        // UPDATE THIS BLOCK
        stream = await navigator.mediaDevices.getDisplayMedia({
            video: true,
            audio: true,
            selfBrowserSurface: "include", // <--- THIS SHOWS THE CURRENT TAB
            systemAudio: "include",
            preferCurrentTab: true         // <--- Tries to highlight it
        });
        
        // Check Audio
        if (stream.getAudioTracks().length === 0) {
            alert("⚠️ No Audio! Did you forget to check 'Share tab audio'?");
            stopCapture();
            return;
        }

        // Connect
        chrome.runtime.sendMessage({ action: "START_WS" });
        updateStatus("🟢 Connected");
        btn.innerText = "Stop";
        btn.classList.add("stop");

        // Audio Process
        audioContext = new AudioContext({ sampleRate: 16000 });
        const source = audioContext.createMediaStreamSource(stream);
        processor = audioContext.createScriptProcessor(4096, 1, 1);
        
        source.connect(processor);
        processor.connect(audioContext.destination);

        processor.onaudioprocess = (e) => {
            const inputData = e.inputBuffer.getChannelData(0);

            // 1. CALCULATE VOLUME (Root Mean Square)
            let sum = 0;
            for (let i = 0; i < inputData.length; i++) {
                sum += inputData[i] * inputData[i];
            }
            const volume = Math.sqrt(sum / inputData.length);

            // 2. SILENCE GATE (Threshold)
            // 0.01 is a good starting point for browser audio. 
            // If it's still printing "you" during silence, increase to 0.02.
            if (volume < 0.01) { 
                return; // 🛑 Too quiet? Don't send anything!
            }

            chrome.runtime.sendMessage({ action: "AUDIO_CHUNK", data: { ...inputData } });
        };

        stream.getVideoTracks()[0].onended = stopCapture;

    } catch (err) {
        console.error(err);
        updateStatus("Error: " + err.message);
    }
}

function stopCapture() {
    if (audioContext) audioContext.close();
    if (stream) stream.getTracks().forEach(t => t.stop());
    stream = null;
    
    const btn = document.getElementById('whisper-start-btn');
    if (btn) {
        btn.innerText = "Start";
        btn.classList.remove("stop");
    }
    updateStatus("🔴 Disconnected");
}

function updateStatus(text) {
    const el = document.getElementById('whisper-status');
    if (el) el.innerText = text;
}

function updateTranscript(text) {
    const el = document.getElementById('whisper-transcript');
    if (el) {
        el.innerText += text + " ";
        el.scrollTop = el.scrollHeight; // Auto-scroll
    }
}