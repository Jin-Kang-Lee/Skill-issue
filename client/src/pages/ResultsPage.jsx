import React, { useContext, useState } from 'react'
import { SuggestionsContext } from '../context/SuggestionsContext'
import { BriefcaseIcon, XMarkIcon, SparklesIcon } from '@heroicons/react/24/solid'

function ResultsPage() {
  const { suggestions } = useContext(SuggestionsContext)
  const roleLines = suggestions?.split('\n').filter(Boolean) || []
  const groupedRoles = []
  for (let i = 0; i < roleLines.length; i++) {
    const current = roleLines[i]
    const next = roleLines[i + 1]
    if (/^Required Skills:/i.test(next)) {
      groupedRoles.push({ job: current, required: next })
      i++
    } else {
      groupedRoles.push({ job: current })
    }
  }

  // NEW STATE for links
  const [activeRole, setActiveRole] = useState(null)
  const [links, setLinks] = useState([])
  const [loadingLinks, setLoadingLinks] = useState(false)

  // NEW: fetch search URLs for clicked role
  const handleCardClick = async (title) => {
    setActiveRole(title)
    setLinks([])
    setLoadingLinks(true)
    try {
      const res = await fetch(`http://localhost:8000/api/search-links/?role=${encodeURIComponent(title)}`)
      const data = await res.json()
      setLinks(data)
    } catch (err) {
      console.error('Failed to load links', err)
    } finally {
      setLoadingLinks(false)
    }
  }

  return (
    <div className="min-h-screen bg-background text-white px-6 py-16 relative">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-4xl font-bold text-center mb-4 flex items-center justify-center gap-3">
          <SparklesIcon className="w-8 h-8 text-tertiary" />
          Job Role Suggestions
        </h2>

        {groupedRoles.length > 0 ? (
          <div className="grid md:grid-cols-2 gap-6">
            {groupedRoles.map((role, idx) => {
              const match = role.job.match(/\*\*(.+?)\*\*:\s*(.+)/)
              const title = match ? match[1] : role.job.trim()
              const description = match ? match[2] : ''
              return (
                <div
                  key={idx}
                  onClick={() => handleCardClick(title)}
                  className="cursor-pointer bg-background border border-white/10 hover:border-tertiary p-5 rounded-lg shadow-sm transition"
                >
                  <div className="flex items-start gap-4">
                    <BriefcaseIcon className="w-6 h-6 text-tertiary mt-1" />
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-1">{title}</h3>
                      <p className="text-sm text-gray-300 leading-relaxed mb-2">{description}</p>
                      {role.required && (
                        <p className="text-xs italic text-accent">{role.required}</p>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center mt-12 text-white">
            <p className="text-lg">No suggestions available</p>
            <p className="text-sm">Try uploading your resume or entering your skills again.</p>
          </div>
        )}
      </div>

      {/* Side panel */}
      {activeRole && (
        <aside className="fixed right-0 top-0 h-full w-80 bg-background/90 p-6 shadow-lg overflow-auto">
          <button
            onClick={() => setActiveRole(null)}
            className="absolute right-4 top-4 text-gray-400 hover:text-white"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
          <h3 className="text-2xl font-bold mb-4">{activeRole}</h3>

          {loadingLinks ? (
            <p className="text-center text-white mt-8">Loading job links...</p>
          ) : (
            links.length > 0 && (
              <>
                <h4 className="text-white font-semibold mt-4">Search links</h4>
                <ul className="list-disc list-inside text-sm text-gray-200 space-y-1">
                  {links.map((l, i) => (
                    <li key={i}>
                      <a
                        href={l.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-tertiary hover:underline"
                      >
                        Search on {l.site}
                      </a>
                    </li>
                  ))}
                </ul>
              </>
            )
          )}
        </aside>
      )}
    </div>
  )
}

export default ResultsPage
