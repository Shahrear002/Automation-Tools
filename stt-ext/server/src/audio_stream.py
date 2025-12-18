import sounddevice as sd
import numpy as np
import queue
import config
from scipy import signal

class AudioInputStream:
    def __init__(self, target_sample_rate=config.SAMPLE_RATE, channels=config.CHANNELS, chunk_samples=config.CHUNK_SIZE):
        self.target_sample_rate = target_sample_rate
        self.channels = channels
        self.chunk_samples = chunk_samples
        self.q = queue.Queue()
        self.stream = None
        self.running = False
        self.native_rate = None

    def _callback(self, indata, frames, time, status):
        """This is called (from a separate thread) for each audio block."""
        if status:
            print(f"⚠️ Audio Status: {status}")
        
        # Resample to target rate (e.g. 48000 -> 16000)
        
        if self.native_rate and self.native_rate != self.target_sample_rate:
            # We enforce the output size to be exactly self.chunk_samples
            # indata length should be close to native_block_size
            
            resampled_data = signal.resample(indata, self.chunk_samples)
            self.q.put(resampled_data.astype(np.float32))
        else:
            self.q.put(indata.copy())

    def start(self):
        """Starts the audio stream."""
        if self.running:
            return
        
        # Find appropriate device
        device_id = None
        try:
            # Prioritize WASAPI on Windows
            devices = sd.query_devices()
            wasapi_inputs = [
                d for d in devices 
                if d['max_input_channels'] > 0 and 'WASAPI' in sd.query_hostapis(d['hostapi'])['name']
            ]
            if wasapi_inputs:
                device_id = wasapi_inputs[0]['index']
                print(f"Using WASAPI Device: {wasapi_inputs[0]['name']}")
        except Exception:
            pass

        # Get device info to determine native rate
        try:
            dev_info = sd.query_devices(device=device_id, kind='input')
            self.native_rate = int(dev_info['default_samplerate'])
            print(f"Device Native Rate: {self.native_rate} Hz (Resampling to {self.target_sample_rate} Hz)")
        except Exception as e:
            print(f"⚠️ Could not query device rate: {e}, using default 48000")
            self.native_rate = 48000

        # Calculate block size in NATIVE samples to match the target chunk size
        # Ratio = native / target
        # native_samples = target_samples * ratio
        native_block_size = int(self.chunk_samples * self.native_rate / self.target_sample_rate)

        try:
            self.stream = sd.InputStream(
                device=device_id,
                samplerate=self.native_rate,
                channels=self.channels,
                blocksize=native_block_size,
                callback=self._callback,
                dtype="float32" 
            )
            self.stream.start()
            self.running = True
            print("🎤 Microphone stream started")
        except Exception as e:
            print(f"❌ Failed to start audio stream: {e}")
            raise e

    def stop(self):
        """Stops the audio stream."""
        if self.stream:
            self.stream.stop()
            self.stream.close()
            self.stream = None
        self.running = False
        print("🎤 Microphone stream stopped")

    def read(self):
        """Generator that yields audio chunks from the queue."""
        while self.running:
            try:
                chunk = self.q.get(timeout=0.5) 
                yield chunk
            except queue.Empty:
                continue

    def get_queue(self):
        return self.q

    def flush(self):
        """Empties the audio queue."""
        with self.q.mutex:
            self.q.queue.clear()
