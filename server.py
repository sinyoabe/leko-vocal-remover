import os
import glob
import subprocess
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

os.makedirs("downloads", exist_ok=True)
os.makedirs("separated", exist_ok=True)

class ProcessRequest(BaseModel):
    url: str

@app.post("/process-audio")
def process_audio(req: ProcessRequest):
    url = req.url

    input_wav = os.path.abspath(os.path.join("downloads", "input.wav"))
    if os.path.exists(input_wav):
        try:
            os.remove(input_wav)
        except Exception as e:
            print(f"File input dibersihkan: {e}")

    # Unduh Audio
    cmd_ytdlp = [
        "yt-dlp",
        "--no-playlist",
        "--extractor-args", "youtube:player_client=android,web",
        "-x",
        "--audio-format", "wav",
        "--postprocessor-args", "ffmpeg:-ar 44100 -ac 2",
        "-o", input_wav,
        "--force-overwrites",
        url
    ]

    print(f"Mengunduh audio dari: {url}")
    res_dl = subprocess.run(cmd_ytdlp, capture_output=True, text=True)
    if res_dl.returncode != 0:
        raise HTTPException(status_code=500, detail=f"Download Error: {res_dl.stderr[:300]}")

    # Demucs dengan --two-stems vocals untuk menghasilkan no_vocals.wav secara utuh (Bass + Drum + Other)
    cmd_demucs = [
        "demucs",
        "-n", "htdemucs",
        "--two-stems", "vocals",
        "--shifts", "1",
        "-j", "4",
        "-o", "separated",
        input_wav
    ]

    print("Memproses pemisahan vokal dengan Demucs...")
    res_demucs = subprocess.run(cmd_demucs, capture_output=True, text=True)
    if res_demucs.returncode != 0:
        raise HTTPException(status_code=500, detail=f"Demucs Error: {res_demucs.stderr[:300]}")

    return {"status": "success", "message": "Audio berhasil dipisah!"}

def get_audio_filepath(target_type: str):
    """Mencari lokasi file vokal atau instrumen secara akurat"""
    separated_dir = os.path.abspath("separated")
    
    if target_type == "vocals":
        patterns = ["**/vocals.wav", "**/vocal.wav"]
    else:
        # Hanya mencari no_vocals.wav atau instrumental.wav (menghapus other.wav agar bass/drum tidak terbuang)
        patterns = ["**/no_vocals.wav", "**/instrumental.wav"]

    for pattern in patterns:
        matches = glob.glob(os.path.join(separated_dir, pattern), recursive=True)
        if matches:
            return matches[0]
            
    return None

@app.get("/download/no_vocals.wav")
def get_no_vocals():
    file_path = get_audio_filepath("no_vocals")
    if file_path and os.path.exists(file_path):
        return FileResponse(file_path, media_type="audio/wav", headers={"Accept-Ranges": "bytes"})
    raise HTTPException(status_code=404, detail="File instrumen tidak ditemukan")

@app.get("/download/vocals.wav")
def get_vocals():
    file_path = get_audio_filepath("vocals")
    if file_path and os.path.exists(file_path):
        return FileResponse(file_path, media_type="audio/wav", headers={"Accept-Ranges": "bytes"})
    raise HTTPException(status_code=404, detail="File vokal tidak ditemukan")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=5050)