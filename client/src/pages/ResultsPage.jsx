import React, { useContext } from 'react'
import { SuggestionsContext } from '../context/SuggestionsContext'
import { SparklesIcon, BriefcaseIcon } from '@heroicons/react/24/solid'

function ResultsPage() {
  // 1) Grab the suggestions from context instead of location.state
  const { suggestions } = useContext(SuggestionsContext)

  return (
    <div className="min-h-screen bg-background text-white py-16 px-6">
      <div className="max-w-4xl mx-auto text-center">
        <h2 className="text-4xl font-bold text-white mb-4 flex items-center justify-center gap-3">
          <SparklesIcon className="w-8 h-8 text-tertiary" />
          Job Role Suggestions
        </h2>
        <p className="text-secondary mb-10">
          Based on your skills and experience, here are some roles you might be interested in
        </p>

        {suggestions ? (
          <div className="grid md:grid-cols-2 gap-6">
            {suggestions.split('\n').map((suggestion, index) => (
              <div
                key={index}
                className="bg-white bg-opacity-90 backdrop-blur-sm p-6 rounded-xl shadow-md hover:shadow-lg transition-all border border-white/10 hover:border-accent"
              >
                <div className="flex items-center gap-3 mb-2">
                  <BriefcaseIcon className="w-6 h-6 text-tertiary" />
                  <h3 className="text-lg font-semibold text-background">
                    {suggestion}
                  </h3>
                </div>
                <p className="text-sm text-background/80">
                  Explore opportunities and see how this aligns with your profile
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center text-white mt-12">
            <p className="text-lg">No suggestions available</p>
            <p className="text-sm">Try uploading your resume or entering your skills again</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default ResultsPage
