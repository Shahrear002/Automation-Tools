from faster_whisper import WhisperModel
import config

class STT:
    def __init__(self, model_size=config.WHISPER_MODEL_SIZE, device=config.WHISPER_DEVICE, compute_type=config.WHISPER_COMPUTE_TYPE):
        print(f"🚀 Loading Whisper Model ({model_size}) on {device}...")
        self.model = WhisperModel(model_size, device=device, compute_type=compute_type)
        print("✅ Whisper loaded.")

    def transcribe(self, audio_data):
        """
        audio_data: np.ndarray (float32)
        Returns: text string
        """
        # faster-whisper accepts numpy array
        if len(audio_data.shape) > 1:
            audio_data = audio_data.flatten()
            
        segments, info = self.model.transcribe(audio_data, beam_size=5)
        
        # Join segments
        text = " ".join([segment.text for segment in segments]).strip()
        return text
