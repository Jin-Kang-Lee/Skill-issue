from fastapi import Request, FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
import traceback
from fastapi.responses import PlainTextResponse
import pdfplumber
import docx
import os
import requests
from dotenv import load_dotenv
# from RAG_engine import retrieve_context, generate_answer
import json
from sentence_transformers import SentenceTransformer
import urllib.parse
import re



# Load environment variables from .env
dotenv_path = os.path.join(os.path.dirname(__file__), '.env')
load_dotenv(dotenv_path)

# Ollama local API endpoint (change via .env if needed)
# OLLAMA_URL = os.getenv("OLLAMA_URL", "http://127.0.0.1:11434/v1/chat/completions")

# Together.ai API config
TOGETHER_API_KEY = os.getenv("TOGETHER_API_KEY")
TOGETHER_MODEL = os.getenv("TOGETHER_MODEL", "mistralai/Mistral-7B-Instruct-v0.1")
TOGETHER_API_URL = os.getenv("TOGETHER_API_URL", "https://api.together.xyz/v1/completions")


app = FastAPI()

origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://skill-issueai.netlify.app"
]


# Allow frontend to talk to this backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,  # include Netlify here
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def catch_exceptions_middleware(request: Request, call_next):
    try:
        return await call_next(request)
    except Exception as e:
        tb = traceback.format_exc()
        print("[✖] Error in request:", tb)
        return PlainTextResponse("Internal server error", status_code=500)
    
    
    
@app.post("/ats-score/")
async def ats_score(
    role: str = Form(...),
    resume_text: str = Form(...),
    skills_csv: str = Form(...)
):
    required_skills = [s.strip() for s in skills_csv.split(",") if s.strip()]
    resume_text = resume_text.lower()

    matched = [s for s in required_skills if s.lower() in resume_text]
    missing = [s for s in required_skills if s.lower() not in resume_text]
    score = round((len(matched) / len(required_skills)) * 100) if required_skills else 0

    return {
        "score": score,
        "matched_skills": matched,
        "missing_skills": missing
    }



# Utility function to read PDF content
def extract_text_from_pdf(file_path: str) -> str:
    with pdfplumber.open(file_path) as pdf:
        return "\n".join([page.extract_text() for page in pdf.pages if page.extract_text()])

# Utility function to read DOCX content
def extract_text_from_docx(file_path: str) -> str:
    document = docx.Document(file_path)
    return "\n".join([para.text for para in document.paragraphs])

# Function to generate job roles using Ollama
def suggest_jobs(user_input: str) -> str:
    system_prompt = (
        "You are CareerBot, an expert career advisor.\n"
        "Given a user's resume, suggest exactly 3–5 job roles in the strict format below.\n\n"
        "Each job MUST follow this format exactly:\n"
        "**<Job Title>**\n"
        "Job Description: <1–2 sentence description of the role>\n"
        "Why Suggested: <1–2 sentence reason based on user resume>\n"
        "Required Skills: skill1, skill2, skill3, ...\n\n"
        "Rules:\n"
        "- Use ** for job titles\n"
        "- Keep labels exactly as shown (e.g., 'Job Description:')\n"
        "- No extra explanations, headers, or blank lines\n"
        "- No bullet points or numbering\n"
        "- Return only job blocks in the above format, nothing else"
    )

    few_shot_example = (
        "**Machine Learning Engineer**\n"
        "Job Description: Builds machine learning models to solve business problems using data.\n"
        "Why Suggested: You have strong Python skills and experience with predictive modeling.\n"
        "Required Skills: Python, Scikit-learn, NumPy, Pandas, AWS"
    )

    user_prompt = (
        f"Here is the user's resume or skill input:\n\n"
        f"{user_input}\n\n"
        f"Now return 3–5 jobs using the exact format and rules above."
    )

    full_prompt = f"{system_prompt}\n\n{few_shot_example}\n\n{user_prompt}"

    payload = {
        "model": TOGETHER_MODEL,
        "prompt": full_prompt,
        "temperature": 0.7,
        "max_tokens": 512
    }

    headers = {
        "Authorization": f"Bearer {TOGETHER_API_KEY}",
        "Content-Type": "application/json"
    }

    try:
        response = requests.post(TOGETHER_API_URL, headers=headers, json=payload)
        response.raise_for_status()
        data = response.json()
        full_response = data["choices"][0]["text"].strip()

        if not full_response or "**" not in full_response:
            print("[❌] Invalid or empty suggestions")
            return None

        print("[✅] Suggestions OK:\n", full_response[:300])
        return full_response

    except requests.RequestException as e:
        print("[❌] Together.ai request failed:", str(e))
        return None






@app.post("/upload-resume/")
async def upload_resume(file: UploadFile = File(None), skills: str = Form(None)):
    user_input = ""

    if file:
        temp_path = f"temp_{file.filename}"
        with open(temp_path, "wb") as f:
            f.write(await file.read())

        if file.filename.lower().endswith(".pdf"):
            user_input = extract_text_from_pdf(temp_path)
        elif file.filename.lower().endswith(".docx"):
            user_input = extract_text_from_docx(temp_path)
        else:
            os.remove(temp_path)
            return {"error": "Unsupported file format. Only PDF or DOCX allowed."}

        os.remove(temp_path)

    elif skills:
        user_input = skills.strip()
    else:
        return {"error": "No input provided. Please upload a resume or enter skills."}

    suggestions = suggest_jobs(user_input)

    # ✅ Ensure suggestions are valid
    if not suggestions or "No job suggestions found" in suggestions:
        print("[❌] Returning empty job_suggestions to frontend")
        return {
            "job_suggestions": "",
            "resume_text": user_input,
            "error": "No suggestions could be generated."
        }

    print("[✅] Suggestions received:\n", suggestions)
    return {
        "job_suggestions": suggestions,
        "resume_text": user_input
    }


@app.post("/resume-feedback/")
async def resume_feedback(file: UploadFile = File(...)):
    temp_path = f"temp_{file.filename}"
    with open(temp_path, "wb") as f:
        f.write(await file.read())

    if file.filename.lower().endswith(".pdf"):
        resume_text = extract_text_from_pdf(temp_path)
    elif file.filename.lower().endswith(".docx"):
        resume_text = extract_text_from_docx(temp_path)
    else:
        os.remove(temp_path)
        return {"error": "Unsupported file format. Only PDF or DOCX allowed."}

    os.remove(temp_path)

    # Generate feedback
    feedback = generate_resume_feedback(resume_text)
    return {"feedback": feedback}


@app.post("/role-info/")
async def role_info(
    role: str = Form(...),
    skills: str = Form(...)
):
    prompt = f"""
    You are CareerBot. Given the job role and user's skills below, respond ONLY in **valid JSON** using this format:

    {{
    "description": "A 2–3 sentence overview of the role.",
    "faqs": [
        {{
        "question": "First common question",
        "answer": "Answer to the first question"
        }},
        {{
        "question": "Second common question",
        "answer": "Answer to the second question"
        }},
        {{
        "question": "Third common question",
        "answer": "Answer to the third question"
        }}
    ]
    }}

    Do NOT include any explanation outside the JSON. Role: {role} — User Skills: {skills}
    """


    payload = {
        "model": TOGETHER_MODEL,
        "prompt": prompt,
        "temperature": 0.7,
        "max_tokens": 512
    }

    headers = {
        "Authorization": f"Bearer {TOGETHER_API_KEY}",
        "Content-Type": "application/json"
    }

    try:
        response = requests.post(TOGETHER_API_URL, headers=headers, json=payload)
        response.raise_for_status()
        return response.json()["choices"][0]["text"].strip()
    except requests.RequestException as e:
        print("[❌] Together.ai role_info request failed:", str(e))
        return {"error": "Unable to generate role information."}








#SETTING JOB POSTING LOCATIONS
LOCATION = "Singapore"

#NORMALIZING JOB ROLES
def normalize_role(role: str) -> str:
    parts = re.split(r'\s+(for|in|at|on|within)\b', role, flags=re.IGNORECASE)
    return parts[0].strip()

#PROVIDE LINKS FOR JOB POSTINGS
def build_search_urls(role: str):
    simple = normalize_role(role)
    q = urllib.parse.quote_plus(simple)
    base_urls = {
      "Indeed": f"https://sg.indeed.com/jobs?q={q}&l={LOCATION}&fromage=1",
      "LinkedIn": f"https://www.linkedin.com/jobs/search/?keywords={q}&location={LOCATION}&f_TPR=r86400",
      "JobStreet": f"https://www.jobstreet.com.sg/en/job-search/{q}-jobs-in-Singapore",
      "MyCareersFuture": f"https://www.mycareersfuture.gov.sg/search?search={q}&sortBy=relevancy&page=0"
    }
    return base_urls

@app.get("/api/search-links/")
async def search_links(role: str):
    urls = build_search_urls(role)
    return [{"site": s, "url": u} for s, u in urls.items()]





#GENERATE FEEDBACK FOR RESUME
def generate_resume_feedback(resume_text: str) -> str:
    prompt = f"""
    You are an expert resume reviewer. Analyze the resume below and return feedback split into labeled sections.

    Required structure (use these exact labels if present):
    - Summary
    - Work Experience
    - Skills
    - Education
    - Formatting & Structure
    - Overall Suggestions

    For each section:
    - Mention strengths (if any)
    - Point out weaknesses
    - Suggest 1–2 improvements
    - Be concise and professional

    IMPORTANT:
    - Use bullet points if listing
    - Return sections in order
    - Do NOT add commentary outside these sections

    Resume:
    \"\"\"{resume_text}\"\"\"
    """

    payload = {
        "model": TOGETHER_MODEL,
        "prompt": prompt,
        "temperature": 0.7,
        "max_tokens": 768
    }

    headers = {
        "Authorization": f"Bearer {TOGETHER_API_KEY}",
        "Content-Type": "application/json"
    }

    try:
        response = requests.post(TOGETHER_API_URL, headers=headers, json=payload)
        response.raise_for_status()

        data = response.json()
        full_content = data["choices"][0]["text"].strip()
        return full_content

    except requests.RequestException as e:
        print("[❌] Together.ai feedback request failed:", str(e))
        return "Error generating feedback."

