import React, { useState, useContext } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  DocumentArrowUpIcon,
  ClipboardDocumentListIcon
} from '@heroicons/react/24/solid'
import { SuggestionsContext } from '../context/SuggestionsContext'

function HomePage() {
  //Grab setSuggestions from context
  const { setSuggestions, setFeedback } = useContext(SuggestionsContext)
  const [file, setFile] = useState(null)
  const [skills, setSkills] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleFileChange = (e) => {
    setFile(e.target.files[0])
  }

  const handleSkillsChange = (e) => {
    setSkills(e.target.value)
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData();

    if (file) {
      formData.append('file', file);
    } else if (skills.trim()) {
      formData.append('skills', skills);
    } else {
      alert('Please upload a resume or enter your skills.');
      setLoading(false);
      return;
    }

    try {
      // 📤 Upload resume or skills
      const res = await fetch('http://127.0.0.1:8000/upload-resume/', {
        method: 'POST',
        body: formData
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Resume upload failed');
      }

      // ✅ Store resume text for ATS
      if (data.resume_text) {
        localStorage.setItem("resume_text", data.resume_text);
        console.log("📄 Resume Text Preview:", data.resume_text.slice(0, 200));
      }

      // ✅ Store job suggestions
      if (
        data.error || 
        !data.job_suggestions || 
        data.job_suggestions.trim() === "" || 
        data.job_suggestions.includes("No job suggestions")
      ) {
        console.warn("⚠️ Invalid job suggestions:", data.error || data.job_suggestions);
        setSuggestions("");
      } else {
        console.log("✅ Valid job suggestions received");
        setSuggestions(data.job_suggestions);
      }

      // ✅ Only fetch resume feedback if a file was uploaded
      if (file) {
        const feedbackForm = new FormData();
        feedbackForm.append('file', file);

        const feedbackRes = await fetch('http://127.0.0.1:8000/resume-feedback/', {
          method: 'POST',
          body: feedbackForm
        });

        const feedbackData = await feedbackRes.json();

        if (!feedbackRes.ok) {
          throw new Error(feedbackData.error || 'Resume feedback failed');
        }

        if (feedbackData.feedback) {
          console.log("📝 Resume feedback received");
          setFeedback(feedbackData.feedback);
        }
      }

      navigate('/results');
    } catch (err) {
      console.error('❌ Upload failed:', err);
      alert('Something went wrong.');
    } finally {
      setLoading(false);
    }
  };



  return (
    <div className="min-h-screen bg-background px-4 py-4">
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
        {/* Left text */}
        <div className="mt-8 md:mt-16 max-w-xl">
          <h1 className="text-5xl font-extrabold mb-6 leading-tight">
            <span className="text-heading">AI-Powered Career Sidekick </span>
            <span className="text-accent font-semibold italic block">
              Land your dream job
            </span>
          </h1>
          <p className="text-lg text-heading">
            Struggling to tailor your resume or figure out which jobs suit you best?
            Our AI-powered platform analyzes your resume or skills and delivers instant, personalized career paths and improvement tips — all in real time.
          </p>
          <button
            onClick={() => {
              document.getElementById('upload-section')?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="mt-6 px-5 py-3 bg-accent text-white font-medium rounded-lg hover:bg-tertiary transition"
          >
            Start Now!
          </button>
        </div>

        {/* Right SVG */}
        <div className="flex justify-center md:justify-end">
          <img src="Design.svg" alt="Illustration" className="w-full max-w-sm md:max-w-md" />
        </div>
      </div>


      {/* Features Section - Card Boxes */}
      <div className="mt-24 px-4">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-12">
          {/* Card 1 */}
          <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100 hover:shadow-lg transition">
            <h3 className="text-lg font-bold text-[#1D1D4E] mb-2">Smart Matching</h3>
            <p className="text-md text-[#4A4A68]">Instantly discover job roles that align with your resume or listed skills using our intelligent engine.</p>
            <a
              href="https://github.com/Jin-Kang-Lee/Skill-issue"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-block text-[#6C63FF] font-medium text-sm hover:underline"
            >
              View on GitHub →
            </a>
          </div>

          {/* Card 2 */}
          <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100 hover:shadow-lg transition">
            <h3 className="text-lg font-bold text-[#1D1D4E] mb-2">Resume Analysis</h3>
            <p className="text-md text-[#4A4A68]">Analyze your resume instantly to uncover key strengths, areas for improvement, and how it stacks up against in-demand job listings.</p>
            <a
              href="https://github.com/Jin-Kang-Lee/Skill-issue"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-block text-[#6C63FF] font-medium text-sm hover:underline"
            >
              View on GitHub →
            </a>
          </div>

          {/* Card 3 */}
          <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100 hover:shadow-lg transition">
            <h3 className="text-lg font-bold text-[#1D1D4E] mb-2">Live Suggestions</h3>
            <p className="text-md text-[#4A4A68]">Browse a curated selection of real-time job openings, carefully matched to your unique skills, experience, and career aspirations.</p>
            <a
              href="https://github.com/Jin-Kang-Lee/Skill-issue"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-block text-[#6C63FF] font-medium text-sm hover:underline"
            >
              View on GitHub →
            </a>
          </div>
        </div>
      </div>
      
      
      {/* Upload Section Wrapper */}
      <div className="flex flex-col lg:flex-row justify-between items-start gap-10 max-w-7xl mx-auto px-4" style={{ marginTop: '10rem' }}>
            {/* Upload Form */}
        <div id="upload-section" className=" bg-white shadow-lg border border-gray-200 rounded-2xl w-full lg:w-2/3 p-10"> 
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-accent">Get Personalized Job Suggestions</h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* File Upload */}
            <div className="border-2 border-dashed border-accent rounded-lg px-6 py-6 text-center hover:border-tertiary transition duration-200">
              <DocumentArrowUpIcon className="w-8 h-8 text-accent mx-auto mb-2" />
              <p className="text-sm text-paragraph">Drag & drop your resume here</p>
              <p className="text-sm text-paragraph mb-3">or</p>
              
              <label
                htmlFor="fileInput"
                className="inline-block px-4 py-2 bg-accent text-white rounded-md hover:bg-tertiary transition cursor-pointer"
              >
                Browse Files
                <input
                  id="fileInput"
                  type="file"
                  accept=".pdf,.docx"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            </div>

            {/* Skills Field */}
            <div>
              <label className="block text-sm font-medium text-heading mb-2">
                <div className="flex items-center gap-2">
                  <ClipboardDocumentListIcon className="w-5 h-5 text-primary" />
                  Or Enter Skills
                </div>
              </label>
              <textarea
                value={skills}
                onChange={handleSkillsChange}
                placeholder="e.g. React, Python, Communication, Data Analysis"
                rows="3"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent placeholder-gray-400"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className={`w-full py-3 rounded-lg font-semibold flex justify-center items-center transition ${
                loading ? 'bg-primary text-white cursor-not-allowed' : 'bg-accent hover:bg-tertiary text-white'
              }`}
            >
              {loading ? (
                <svg className="animate-spin h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
              ) : (
                'Get Suggestions'
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-paragraph">
            We do not store your data. Your information is used only to generate suggestions.
          </p>
        </div>

        {/* Instruction Section – Right Side of Form */}
        <div className="max-w-md mt-10 lg:mt-0">
          <h2 className="text-3xl font-extrabold leading-snug mb-4 text-heading">
            <span>How it works,</span>
            <span className="text-accent italic block">in just 3 steps</span>
          </h2>
          <p className="text-heading text-base mb-6">
            Upload your resume or enter your skills. And we'll scans your profile,
            finds the most relevant job roles, and gives you clear feedback on how to improve.
          </p>
          <ul className="text-md text-paragraph space-y-3 list-disc list-inside">
            <li>1. Drop in your resume or type in your skills manually</li>
            <li>2. Get instant feedback and job suggestions tailored to you</li>
            <li>3. 100% private — nothing is stored</li>
          </ul>
        </div>
      </div>
        
    </div>
  )

}

export default HomePage
