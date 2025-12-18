import subprocess
import sys
import os
import config

class PiperTTS:
    def __init__(self, piper_path=config.PIPER_BINARY_PATH, voice_path=config.PIPER_VOICE_PATH):
        self.piper_path = piper_path
        self.voice_path = voice_path
        # Sanity check
        if not os.path.exists(self.piper_path):
            print(f"⚠️ Warning: Piper executable not found at {self.piper_path}")
        if not os.path.exists(self.voice_path):
            print(f"⚠️ Warning: Voice model not found at {self.voice_path}")

    def speak(self, text):
        """
        Synthesizes text and plays it.
        """
        if not text:
            return

        # macOS: Use afplay with temp file
        if sys.platform == "darwin":
            output_file = "tts_output.wav"
            
            # Piper command to write to file
            piper_cmd = [
                self.piper_path,
                "--model", self.voice_path,
                "--output_file", output_file
            ]
            
            try:
                # Generate audio
                process = subprocess.Popen(
                    piper_cmd,
                    stdin=subprocess.PIPE,
                    stdout=subprocess.DEVNULL,
                    stderr=subprocess.PIPE
                )
                stdout, stderr = process.communicate(input=text.encode("utf-8"))
                
                if process.returncode != 0:
                    print(f"❌ Piper Error: {stderr.decode()}")
                    return
                    
                # Play audio
                subprocess.run(["afplay", output_file])
                
                # Cleanup
                if os.path.exists(output_file):
                    os.remove(output_file)
                    
            except Exception as e:
                print(f"Error in TTS: {e}")
                
        else:
            # Windows/Linux: Use MPV with pipe
            # Start MPV to receive audio from stdin
            mpv_cmd = ["mpv", "--no-terminal", "--file=-"]
            # Windows-specific: ensure mpv is in path or usage from root
            # Check if mpv.exe is in the root directory (parent of src)
            mpv_path = os.path.join(config.BASE_DIR, "mpv.exe")
            if os.path.exists(mpv_path):
                mpv_cmd[0] = mpv_path
            
            try:
                mpv_process = subprocess.Popen(
                    mpv_cmd,
                    stdin=subprocess.PIPE,
                    stdout=subprocess.DEVNULL,
                    stderr=subprocess.DEVNULL
                )
            except FileNotFoundError:
                print("❌ MPV not found. Cannot play audio.")
                return
    
            # Start Piper to generate audio to stdout
            piper_cmd = [
                self.piper_path,
                "--model", self.voice_path,
                "--output_file", "-"
            ]
            
            try:
                piper_process = subprocess.Popen(
                    piper_cmd,
                    stdin=subprocess.PIPE,
                    stdout=mpv_process.stdin,
                    stderr=subprocess.PIPE
                )
                
                # Feed text
                piper_process.communicate(input=text.encode("utf-8"))
                
                # Close mpv input to let it finish playing
                mpv_process.stdin.close()
                mpv_process.wait()
                
            except Exception as e:
                print(f"Error in TTS: {e}")
