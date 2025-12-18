import os

# Paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODELS_DIR = os.path.join(BASE_DIR, "models")
SRC_DIR = os.path.join(BASE_DIR, "src")

# Audio Settings
SAMPLE_RATE = 16000
CHANNELS = 1
# Silero VAD (v4/v5) typically requires 512, 1024, 1536 samples at 16kHz
# 30ms = 480 samples (Not supported)
# 32ms = 512 samples (Supported)
CHUNK_DURATION_MS = 32 
CHUNK_SIZE = 512

# VAD Settings
VAD_THRESHOLD = 0.2
SILENCE_DURATION_MS = 700  # End of speech detection

# Models
# Silero VAD local path or use 'silero_vad' from torch.hub if allowed, 
# but for production we often want a local ONNX file to avoid downloads.
# For this setup, we'll try to load it via torch hub or onnx if available.
VAD_MODEL_PATH = os.path.join(MODELS_DIR, "silero_vad.onnx") 

# Faster Whisper
WHISPER_MODEL_SIZE = "base" # or 'medium', 'large-v3'
WHISPER_DEVICE = "cpu" # 'cuda' if GPU available
WHISPER_COMPUTE_TYPE = "int8"

# Ollama
OLLAMA_URL = "http://localhost:11434/api/generate" # or /api/chat
OLLAMA_MODEL = "llama3"

# Piper TTS
import platform

# Piper TTS
if platform.system() == "Windows":
    PIPER_BINARY_PATH = os.path.join(BASE_DIR, "piper", "piper.exe")
else:
    # On Mac/Linux, assume 'piper' is in the piper folder or PATH
    # Adjust this if you place the mac binary in a specific folder
    PIPER_BINARY_PATH = os.path.join(BASE_DIR, "voice-ag-env", "bin", "piper") 

# Fallback checking
if not os.path.exists(PIPER_BINARY_PATH):
    # Try global path
    PIPER_BINARY_PATH = "piper"

PIPER_VOICE_PATH = os.path.join(BASE_DIR, "en_US-lessac-medium.onnx")
