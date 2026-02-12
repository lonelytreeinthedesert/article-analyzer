import React, { useState } from 'react';
import { Search, FileText, Loader2 } from 'lucide-react';

export default function ArticleAnalyzer() {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [metadata, setMetadata] = useState(null);
  const [error, setError] = useState('');

  const analyzeArticle = async () => {
    if (!input.trim()) {
      setError('Please paste article text');
      return;
    }

    setLoading(true);
    setError('');
    setMetadata(null);

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: input
        })
      });

      if (!response.ok) {
        throw new Error('Failed to analyze article');
      }

      const data = await response.json();
      setMetadata(data);

    } catch (err) {
      setError('Failed to analyze article. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-800 mb-2">Article Analyzer</h1>
          <p className="text-slate-600">Paste article text to extract metadata and insights using AI</p>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Left Panel - Article Input */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-bold text-slate-800 mb-4 flex items-center gap-2">
              <FileText size={24} />
              Article Text
            </h2>
            
            <textarea
              placeholder="Paste your article text here..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="w-full h-[500px] px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none font-sans text-slate-700"
            />

            <button
              onClick={analyzeArticle}
              disabled={loading || !input.trim()}
              className="mt-4 w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-slate-400 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={18} />
                  Analyzing...
                </>
              ) : (
                <>
                  <Search size={18} />
                  Analyze Article
                </>
              )}
            </button>

            {error && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}
          </div>

          {/* Right Panel - Metadata */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Search size={24} />
              Metadata
            </h2>

            {!metadata && !loading && (
              <div className="flex items-center justify-center h-[500px] text-slate-400">
                <p className="text-center">
                  Paste article text and click<br />"Analyze Article" to see metadata
                </p>
              </div>
            )}

            {metadata && (
              <div className="space-y-4 max-h-[580px] overflow-y-auto pr-2">
                <MetadataItem label="Author" value={metadata.author} />
                <MetadataItem label="Date Published" value={metadata.datePublished} />
                <MetadataItem label="Source" value={metadata.source} />
                <MetadataItem label="Word Count" value={metadata.wordCount?.toLocaleString()} />
                <MetadataItem label="Reading Time" value={metadata.readingTime} />
                
                {metadata.url && metadata.url !== 'Unable to locate' && (
                  <MetadataItem label="URL" value={metadata.url} />
                )}
                
                <div className="pt-4 border-t border-slate-200">
                  <h3 className="font-semibold text-slate-700 mb-2">Summary</h3>
                  <p className="text-slate-600 text-sm leading-relaxed">
                    {metadata.summary}
                  </p>
                </div>

                {metadata.topics && metadata.topics !== 'Unable to locate' && (
                  <div className="pt-4 border-t border-slate-200">
                    <h3 className="font-semibold text-slate-700 mb-2">Topics</h3>
                    <div className="flex flex-wrap gap-2">
                      {metadata.topics.split(',').map((topic, i) => (
                        <span key={i} className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm">
                          {topic.trim()}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function MetadataItem({ label, value }) {
  return (
    <div className="flex flex-col">
      <span className="text-sm font-semibold text-slate-500 uppercase tracking-wide">{label}</span>
      <span className="text-slate-800 mt-1">{value || 'Unable to locate'}</span>
    </div>
  );
}
