import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { HomeIcon, SparklesIcon, DocumentTextIcon } from '@heroicons/react/24/outline'

function Navbar() {
  const location = useLocation()

  const linkClasses = (path) =>
    `flex items-center gap-1 px-3 py-2 rounded-md transition text-sm font-medium ${
      location.pathname === path
        ? 'text-accent bg-accent/10'
        : 'text-gray-600 hover:text-accent hover:bg-gray-100'
    }`

  return (
    <nav className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="text-2xl font-bold text-heading">
            Skill<span className="text-accent">Issue</span><span className="text-paragraph">.AI</span>
          </Link>
          <div className="flex space-x-4">
            <Link to="/" className={linkClasses('/')}>
              <HomeIcon className="w-5 h-5" />
              Home
            </Link>
            <Link to="/results" className={linkClasses('/results')}>
              <SparklesIcon className="w-5 h-5" />
              Results
            </Link>
            <Link to="/resume-feedback" className={linkClasses('/resume-feedback')}>
              <DocumentTextIcon className="w-5 h-5" />
              Resume Feedback
            </Link>
          </div>
        </div>
      </div>
    </nav>
  )
}

export default Navbar
