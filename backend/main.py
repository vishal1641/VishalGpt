from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from pdf_reader import extract_text_from_pdf
from chatbot import ask_vishalgpt
from fastapi.responses import FileResponse

# =========================
# APP
# =========================

app = FastAPI(
    title="VishalGPT"
)


# =========================
# CORS
# =========================

app.add_middleware(
    CORSMiddleware,

    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        https://vishal-gpt-nu.vercel.app/
    ],

    allow_credentials=True,

    allow_methods=["*"],

    allow_headers=["*"],
)


# =========================
# LOAD RESUME
# =========================

resume_path = "Vishal_Kumar_Tiwari_Resume.pdf"

resume_text = extract_text_from_pdf(
    resume_path
)


print("Resume loaded successfully.")
print("--------------------------------")
print(
    "Resume characters:",
    len(resume_text)
)
print("--------------------------------")


# =========================
# REQUEST MODEL
# =========================

class ChatRequest(BaseModel):

    question: str


# =========================
# HOME
# =========================

@app.get("/")
def home():

    return {
        "message": "VishalGPT API is running"
    }


# =========================
# CHAT
# =========================

@app.post("/chat")
def chat(request: ChatRequest):

    answer = ask_vishalgpt(
        resume_text,
        request.question
    )

    return {
        "answer": answer
    }


@app.get("/download-resume")
def download_resume():
    return FileResponse(
        path="resume.pdf",
        media_type="application/pdf",
        filename="Vishal_Resume.pdf"
    )