import sys
import os
import numpy as np
from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

# Add 'src' to path so we can import your existing modules
sys.path.append(os.path.join(os.path.dirname(__file__), 'src'))
from stt import STT  # Your existing Whisper Wrapper

app = FastAPI()

# 1. ALLOW ALL ORIGINS (Fixes CORS/CORB issues)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Whisper once on startup
print("🚀 Loading Whisper...")
stt_engine = STT() 
print("✅ Whisper Ready")

@app.websocket("/ws")
async def audio_stream(websocket: WebSocket):
    await websocket.accept()
    print("🔵 Browser Connected!")
    
    buffer = []
    
    try:
        while True:
            # 1. Receive raw audio bytes from browser (Float32)
            data = await websocket.receive_bytes()
            
            # 2. Convert bytes to Numpy Float32
            audio_chunk = np.frombuffer(data, dtype=np.float32)
            buffer.append(audio_chunk)
            
            # 3. Transcribe every ~3 seconds of audio
            # (Assuming 16kHz, 3 seconds = 48000 samples)
            current_buffer_len = sum(len(c) for c in buffer)
            
            if current_buffer_len > 48000: 
                full_audio = np.concatenate(buffer)
                
                # Transcribe (Force Bangla if needed, or use "en")
                text = stt_engine.transcribe(full_audio)
                
                if len(text.strip()) > 0:
                    print(f"📝 Transcribed: {text}")
                    await websocket.send_text(text)
                
                # Clear buffer (or keep last second for context if you want strictly continuous)
                buffer = []
                
    except Exception as e:
        print(f"🔴 Connection Closed: {e}")

if __name__ == "__main__":
    # Run server on localhost:8000
    uvicorn.run(app, host="0.0.0.0", port=8000)