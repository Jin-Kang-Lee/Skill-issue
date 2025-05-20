import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  DocumentArrowUpIcon,
  SparklesIcon,
  ClipboardDocumentListIcon
} from '@heroicons/react/24/solid'

function HomePage() {
  const [file, setFile] = useState(null)
  const [skills, setSkills] = useState('')
  const navigate = useNavigate()

  const handleFileChange = (e) => {
    setFile(e.target.files[0])
  }

  const handleSkillsChange = (e) => {
    setSkills(e.target.value)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    const formData = new FormData()

    if (file) {
      formData.append('file', file)
    } else if (skills.trim()) {
      formData.append('skills', skills)
    } else {
      alert('Please upload a resume or enter your skills.')
      return
    }

    try {
      const res = await fetch('http://127.0.0.1:8000/upload-resume/', {
        method: 'POST',
        body: formData
      })

      if (!res.ok) {
        throw new Error('Server error')
      }

      const data = await res.json()

      if (data.job_suggestions) {
        navigate('/results', { state: { suggestions: data.job_suggestions } })
      } else {
        alert('No job suggestions received.')
      }
    } catch (err) {
      console.error('❌ Upload failed:', err)
      alert('Something went wrong.')
    }
  }

  return (
    <div className="relative min-h-screen bg-background text-white px-6  pb-12 flex items-center justify-center overflow-hidden">
      {/* SVG background wave */}
      <img
        src="/homepage-waves.svg"
        alt="wave"
        className="absolute bottom-0 left-0 w-full pointer-events-none z-0"
      />

      {/* Main content above SVG */}
      <div className="relative z-10 w-full max-w-6xl grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
        {/* LEFT SIDE – Text content */}
        <div className="mt-[-100px]">
          <h1 className="text-4xl font-extrabold text-primary mb-4">
            Unlock Your Career Potential with AI
          </h1>
          <p className="text-white text-lg leading-relaxed">
            Harness the power of artificial intelligence to analyze your resume or listed skills,
            providing personalized job role suggestions and current listings tailored to your unique profile.
          </p>
        </div>

        {/* RIGHT SIDE – Form box */}
        <div className="bg-white bg-opacity-90 backdrop-blur-md border border-gray-200 shadow-xl rounded-2xl p-8 text-background">
          <div className="text-center mb-6">
            <SparklesIcon className="w-8 h-8 mx-auto text-tertiary mb-1" />
            <h2 className="text-xl font-bold text-tertiary">
              Get Personalized Job Suggestions
            </h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-background mb-2">
                <div className="flex items-center gap-2">
                  <DocumentArrowUpIcon className="w-5 h-5 text-primary" />
                  Upload Resume (PDF or DOCX)
                </div>
              </label>
              <input
                type="file"
                accept=".pdf,.docx"
                onChange={handleFileChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-background mb-2">
                <div className="flex items-center gap-2">
                  <ClipboardDocumentListIcon className="w-5 h-5 text-primary" />
                  Or Enter Skills
                </div>
              </label>
              <textarea
                value={skills}
                onChange={handleSkillsChange}
                placeholder="e.g. React, Python, Communication, Data Analysis"
                rows="4"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-accent hover:bg-primary text-white font-semibold rounded-lg transition-all"
            >
              Get Suggestions
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-500">
            We do not store your data. Your information is used only to generate suggestions.
          </div>
        </div>
      </div>
    </div>
  )
}

export default HomePage
