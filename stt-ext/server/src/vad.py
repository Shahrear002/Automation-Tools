import torch
import numpy as np
import config

class SileroVAD:
    def __init__(self, threshold=config.VAD_THRESHOLD):
        self.threshold = threshold
        print("Loading VAD model from Torch Hub...")
        try:
            self.model, utils = torch.hub.load(repo_or_dir='snakers4/silero-vad',
                                          model='silero_vad',
                                          force_reload=False,
                                          onnx=False)
            (get_speech_timestamps, _, _, VADIterator, _) = utils
            self.vad_iterator = VADIterator(self.model, threshold=threshold)
            self.speaking = False
            print("✅ Silero VAD Loaded (Torch Hub).")
        except Exception as e:
            print(f"❌ Failed to load VAD model: {e}")
            raise e

    def reset_states(self):
        self.vad_iterator.reset_states()
        self.speaking = False

    def is_speech(self, audio_chunk):
        """
        Input: audio_chunk (numpy array, float32)
        Returns: (bool, float) -> (is_speech, probability)
        """
        # Convert numpy to torch tensor
        audio_tensor = torch.from_numpy(audio_chunk)
        
        # Flatten to 1D first (handle (N, 1) from sounddevice)
        if len(audio_tensor.shape) > 1:
            audio_tensor = audio_tensor.flatten()
            
        # Ensure input is (1, N)
        audio_tensor = audio_tensor.unsqueeze(0) # (1, N)

        # Check for minimum size (512 samples for 16kHz)
        # 16000 / 512 = 31.25. Model throws error if sr/size > 31.25
        if audio_tensor.shape[1] < 512:
            # Pad with zeros
            pad_size = 512 - audio_tensor.shape[1]
            audio_tensor = torch.nn.functional.pad(audio_tensor, (0, pad_size))
            # Optional: print warning
            # print(f"⚠️ Padding chunk from {audio_tensor.shape[1]-pad_size} to 512")
            
        # VADIterator returns dict if state changes
        speech_dict = self.vad_iterator(audio_tensor, return_seconds=True)
        
        if speech_dict:
            if 'start' in speech_dict:
                self.speaking = True
            if 'end' in speech_dict:
                self.speaking = False
                
        # Return binary probability since we don't have raw prob
        prob = 1.0 if self.speaking else 0.0
        return self.speaking, prob
