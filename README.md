# Skill-Issue.AI — AI-Powered Career Recommendation Platform

**Skill-Issue.AI** is an intelligent career guidance platform built for students, fresh graduates, and job seekers. By analyzing uploaded resumes and self-declared skills, it recommends suitable job roles and provides resume feedback — powered by LLMs, hybrid RAG pipelines, and ATS-aware design.

![demo](https://user-images.githubusercontent.com/your-demo.gif)

---

## Features

- **Resume Upload & Parsing**: Accepts PDF/DOCX resumes and extracts relevant content using `pdfplumber` or `python-docx`.
- **Job Role Suggestions**: Uses LLMs (via Ollama + Mistral/Phi) and your extracted resume text to suggest high-level job roles (e.g., *Software Engineer*, not *Software Engineer - Logistics*).
- **RAG-Enhanced Matching**: Integrates FAISS vector store + BM25 retrieval to fetch relevant job description context before LLM generation.
- **Interactive Resume Feedback**: Displays resume in PDF form with hover-based feedback highlighting by section (Work Experience, Skills, Education, etc.).
- **Live Job Listings**: Fetches job postings from platforms like LinkedIn, MyCareersFuture, and JobStreet based on suggested roles.
- **Modern UI**: Built with React (Vite) + HeroIcons + context-aware state management.

---

## 🛠️ Tech Stack

| Category | Stack |
|---------|-------|
| **Frontend** | React, Vite, TailwindCSS, HeroIcons |
| **Backend** | FastAPI, LangChain, FAISS, SentenceTransformers |
| **LLM & Embeddings** | Ollama (Mistral, Phi-3, Nomic), Hybrid BM25 + Embeddings |
| **Resume Parsing** | pdfplumber, python-docx |
| **State & Routing** | React Context API, React Router |
| **Deployment Ready** | Containerizable backend, frontend proxy config, local Ollama setup |

---
