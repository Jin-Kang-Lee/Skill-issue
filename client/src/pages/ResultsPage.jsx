import React, { useContext, useState } from 'react'
import { SuggestionsContext } from '../context/SuggestionsContext'
import { BriefcaseIcon, SparklesIcon } from '@heroicons/react/24/solid'

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

  const [activeIndex, setActiveIndex] = useState(null)
  const [links, setLinks] = useState({})
  const [loadingIndex, setLoadingIndex] = useState(null)

  const handleCardClick = async (index, title) => {
    if (activeIndex === index) {
      setActiveIndex(null)
      return
    }

    setActiveIndex(index)
    setLoadingIndex(index)
    try {
      const res = await fetch(`http://localhost:8000/api/search-links/?role=${encodeURIComponent(title)}`)
      const data = await res.json()
      setLinks((prev) => ({ ...prev, [index]: data }))
    } catch (err) {
      console.error('Failed to load links', err)
    } finally {
      setLoadingIndex(null)
    }
  }

  return (
    <div className="min-h-screen bg-background text-white px-6 py-16">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-4xl font-bold text-center mb-8 flex items-center justify-center gap-3">
          <SparklesIcon className="w-8 h-8 text-tertiary" />
          Job Role Suggestions
        </h2>

        {groupedRoles.length > 0 ? (
          <div className="grid md:grid-cols-2 gap-6">
            {groupedRoles.map((role, idx) => {
              const match = role.job.match(/\*\*(.+?)\*\*:\s*(.+)/)
              const title = match ? match[1] : role.job.trim()
              const description = match ? match[2] : ''

              const isActive = activeIndex === idx
              const roleLinks = links[idx] || []

              return (
                <div
                  key={idx}
                  className="bg-background border border-white/10 hover:border-tertiary p-5 rounded-lg shadow-sm transition"
                >
                  <div
                    className="cursor-pointer flex items-start gap-4"
                    onClick={() => handleCardClick(idx, title)}
                  >
                    <BriefcaseIcon className="w-6 h-6 text-tertiary mt-1" />
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-1">{title}</h3>
                      <p className="text-sm text-gray-300 leading-relaxed mb-2">{description}</p>
                      {role.required && (
                        <p className="text-xs italic text-accent">{role.required}</p>
                      )}
                    </div>
                  </div>

                  {isActive && (
                    <div className="mt-4 border-t border-white/10 pt-4 text-sm">
                      {loadingIndex === idx ? (
                        <p className="text-gray-400">Loading job links...</p>
                      ) : (
                        <>
                          <h4 className="font-semibold text-white mb-2">Search links</h4>
                          <ul className="space-y-1">
                            {roleLinks.map((l, i) => (
                              <li key={i}>
                                <a
                                  href={l.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-tertiary hover:underline"
                                >
                                  🔗 Search on {l.site}
                                </a>
                              </li>
                            ))}
                          </ul>
                        </>
                      )}
                    </div>
                  )}
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
    </div>
  )
}

export default ResultsPage
