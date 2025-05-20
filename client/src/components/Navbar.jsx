import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { HomeIcon, SparklesIcon } from '@heroicons/react/24/outline'

function Navbar() {
  const location = useLocation()

  const linkClasses = (path) =>
    `flex items-center gap-1 px-3 py-1 rounded-md transition ${
      location.pathname === path
        ? 'text-tertiary font-semibold bg-tertiary/10'
        : 'text-white hover:text-accent hover:bg-white/10'
    }`

  return (
    <nav className="sticky top-0 z-50 bg-background backdrop-blur-md border-b border-white/10 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="text-2xl font-bold text-tertiary">
            SkillIssue<span className="text-white">.AI</span>
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
          </div>
        </div>
      </div>
    </nav>
  )
}

export default Navbar
