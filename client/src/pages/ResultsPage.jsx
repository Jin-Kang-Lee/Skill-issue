import React, { useContext, useState} from 'react'
import { SuggestionsContext } from '../context/SuggestionsContext'
import { BriefcaseIcon, SparklesIcon, XMarkIcon } from '@heroicons/react/24/solid'

function ResultsPage() {
  const { suggestions } = useContext(SuggestionsContext)

  // Parse suggestions into lines and group job entries
  // const lines = suggestions ? suggestions.split('\n').filter(Boolean) : []
  const roleLines = suggestions ? suggestions.split('\n').filter(Boolean) : []
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

  // State for side panel
  const [activeRole, setActiveRole] = useState(null)
  const [roleInfo, setRoleInfo] = useState({ faqs: [], description: '' })
  const [loadingInfo, setLoadingInfo] = useState(false)

  // Handle card click to fetch role info
  const handleCardClick = async (title) => {
    setActiveRole(title)
    setLoadingInfo(true)
    try {
      const res = await fetch('http://127.0.0.1:8000/role-info/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ role: title, skills: suggestions })
      })
      const text = await res.text()
      const data = JSON.parse(text)
      setRoleInfo({
        description: data.description || '',
        faqs: Array.isArray(data.faqs) ? data.faqs : []
      })
    } catch (err) {
      console.error('Failed to load role info', err)
      setRoleInfo({ description: 'Failed to load info.', faqs: [] })
    } finally {
      setLoadingInfo(false)
    }
  }

  // If you want to prefetch all role info on mount, uncomment:
  // useEffect(() => {
  //   groupedRoles.forEach(role => handleCardClick(role.job.match(/\*\*(.*?)\*\*/)?.[1]));
  // }, [])

  return (
    <div className="min-h-screen bg-background text-white px-6 py-16 relative">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-4xl font-bold text-white text-center mb-4 flex items-center justify-center gap-3">
          <SparklesIcon className="w-8 h-8 text-tertiary" />
          Job Role Suggestions
        </h2>
        {/* <p className="text-secondary text-center text-lg mb-12">{introText}</p> */}

        {groupedRoles.length > 0 ? (
          <div className="grid md:grid-cols-2 gap-6">
            {groupedRoles.map((role, index) => {
              const match = role.job.match(/\*\*(.+?)\*\*:\s*(.+)/)
              const title = match ? match[1] : role.job.trim()
              const description = match ? match[2] : ''

              // const skillsList = role.required
            ? role.required
                .split(':')[1]        // get the “ Excel, SQL, Python” part
                .split(',')           // [ " Excel", " SQL", " Python" ]
                .map(s => s.trim())   // [ "Excel", "SQL", "Python" ]
            : []

              return (
                <div
                  key={index}
                  onClick={() => handleCardClick(title)}
                  className="cursor-pointer bg-background border border-white/10 hover:border-tertiary hover:bg-white/5 transition p-5 rounded-lg shadow-sm"
                >
                  <div className="flex items-start gap-4">
                    <BriefcaseIcon className="w-6 h-6 text-tertiary flex-shrink-0 mt-1" />
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-1">{title}</h3>
                      <p className="text-sm text-gray-300 leading-relaxed mb-2">{description}</p>
                      {role.required && (
                        <p className="text-xs text-accent italic">
                          {role.required}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center text-white mt-12">
            <p className="text-lg">No suggestions available</p>
            <p className="text-sm">Try uploading your resume or entering your skills again</p>
          </div>
        )}
      </div>

      {/* Side panel drawer */}
      {activeRole && (
        <aside className="fixed right-0 top-0 h-full w-80 bg-background/90 p-6 shadow-lg overflow-auto">
          <button
            onClick={() => setActiveRole(null)}
            className="absolute top-4 right-4 text-gray-400 hover:text-white"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
          {loadingInfo ? (
            <p className="text-white mt-8 text-center">Loading...</p>
          ) : (
            <>
              <h3 className="text-2xl font-bold text-white mb-4">{activeRole}</h3>
              <p className="text-gray-300 mb-6">{roleInfo.description}</p>
              <h4 className="text-white font-semibold mb-2">FAQs</h4>
              <ul className="list-disc list-inside text-sm text-gray-200 space-y-2">
                {roleInfo.faqs.map((f, i) => (
                  <li key={i}>
                    <strong>{f.question}</strong><br />
                    {f.answer}
                  </li>
                ))}
              </ul>
            </>
          )}
        </aside>
      )}
    </div>
  )
}

export default ResultsPage
