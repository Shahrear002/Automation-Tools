// let socket;
// let mediaRecorder;
// let audioContext;
// let processor;
// let isRunning = false;

// const btn = document.getElementById("toggleBtn");
// const status = document.getElementById("status");
// const transcriptDiv = document.getElementById("transcript");

// btn.addEventListener("click", async () => {
//   if (!isRunning) {
//     startCapture();
//   } else {
//     stopCapture();
//   }
// });

// async function startCapture() {
//   try {
//     // 1. Ask user to select tab
//     const stream = await navigator.mediaDevices.getDisplayMedia({
//       video: true, // Required to capture tab, we ignore video later
//       audio: true
//     });

//     // 2. Connect to Python
//     socket = new WebSocket("ws://localhost:8000/ws");
    
//     socket.onopen = () => {
//       status.innerText = "Connected to Python Whisper";
//       btn.innerText = "Stop Listening";
//       btn.classList.add("stop");
//       isRunning = true;
//     };

//     socket.onmessage = (event) => {
//       const text = event.data;
//       transcriptDiv.innerHTML += `<p>${text}</p>`;
//       transcriptDiv.scrollTop = transcriptDiv.scrollHeight; // Auto-scroll
//     };

//     // 3. Process Audio (Downsample to 16kHz for Whisper)
//     audioContext = new AudioContext({ sampleRate: 16000 });
//     const source = audioContext.createMediaStreamSource(stream);
    
//     // Create a processor node (buffer size 4096)
//     processor = audioContext.createScriptProcessor(4096, 1, 1);
    
//     source.connect(processor);
//     processor.connect(audioContext.destination);

//     processor.onaudioprocess = (e) => {
//       if (socket.readyState === WebSocket.OPEN) {
//         // Get left channel float data
//         const inputData = e.inputBuffer.getChannelData(0);
//         // Send raw Float32 array to Python
//         socket.send(inputData);
//       }
//     };

//     // Handle stream stop (user clicks "Stop Sharing" in Chrome bar)
//     stream.getVideoTracks()[0].onended = stopCapture;

//   } catch (err) {
//     console.error(err);
//     status.innerText = "Error: " + err.message;
//   }
// }

// function stopCapture() {
//   if (socket) socket.close();
//   if (audioContext) audioContext.close();
  
//   isRunning = false;
//   btn.innerText = "Start Listening";
//   btn.classList.remove("stop");
//   status.innerText = "Disconnected";
// }

document.getElementById("toggleBtn").addEventListener("click", async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    // Inject logic
    await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ["content.js"]
    });

    // Tell page to show the Widget
    chrome.tabs.sendMessage(tab.id, { action: "INIT_UI" });
    
    window.close(); // Close the popup immediately
});