import React, { useState } from 'react';
import { Search, FileText, Loader2, ExternalLink } from 'lucide-react';

export default function ArticleAnalyzer() {
  const [inputType, setInputType] = useState('url');
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [articleData, setArticleData] = useState(null);
  const [error, setError] = useState('');

  const analyzeArticle = async () => {
    if (!input.trim()) {
      setError('Please enter a URL or paste some text');
      return;
    }

    setLoading(true);
    setError('');
    setArticleData(null);

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputType,
          input
        })
      });

      if (!response.ok) {
        throw new Error('Failed to analyze article');
      }

      const data = await response.json();
      setArticleData(data);

    } catch (err) {
      setError('Failed to analyze article. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && inputType === 'url' && !e.shiftKey) {
      analyzeArticle();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-800 mb-2">Article Analyzer</h1>
          <p className="text-slate-600">Extract metadata and insights from any article using AI</p>
        </div>

        {/* Input Section */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex gap-4 mb-4">
            <button
              onClick={() => {
                setInputType('url');
                setInput('');
                setError('');
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                inputType === 'url'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <ExternalLink size={18} />
              URL
            </button>
            <button
              onClick={() => {
                setInputType('text');
                setInput('');
                setError('');
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                inputType === 'text'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <FileText size={18} />
              Text
            </button>
          </div>

          {inputType === 'url' ? (
            <input
              type="text"
              placeholder="Enter article URL... (e.g., https://example.com/article)"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          ) : (
            <textarea
              placeholder="Paste article text here..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              rows={6}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          )}

          <button
            onClick={analyzeArticle}
            disabled={loading}
            className="mt-4 flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-slate-400 disabled:cursor-not-allowed"
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
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}
        </div>

        {/* Two Panel Layout */}
        {articleData && (
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Left Panel - Article Text */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-2xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                <FileText size={24} />
                Article
              </h2>
              <div className="prose max-w-none text-slate-700 max-h-[600px] overflow-y-auto pr-2">
                <p className="whitespace-pre-wrap leading-relaxed">{articleData.text}</p>
              </div>
            </div>

            {/* Right Panel - Metadata */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-2xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                <Search size={24} />
                Metadata
              </h2>
              <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                <MetadataItem label="Author" value={articleData.metadata.author} />
                <MetadataItem label="Date Published" value={articleData.metadata.datePublished} />
                <MetadataItem label="Source" value={articleData.metadata.source} />
                <MetadataItem label="Word Count" value={articleData.metadata.wordCount.toLocaleString()} />
                <MetadataItem label="Reading Time" value={articleData.metadata.readingTime} />
                
                {articleData.metadata.url && articleData.metadata.url !== 'N/A' && articleData.metadata.url !== 'Unknown' && (
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-slate-500 uppercase tracking-wide">URL</span>
                    <a 
                      href={articleData.metadata.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline break-all mt-1 flex items-center gap-1"
                    >
                      {articleData.metadata.url}
                      <ExternalLink size={14} />
                    </a>
                  </div>
                )}
                
                <div className="pt-4 border-t border-slate-200">
                  <h3 className="font-semibold text-slate-700 mb-2">Summary</h3>
                  <p className="text-slate-600 text-sm leading-relaxed">
                    {articleData.metadata.summary}
                  </p>
                </div>

                {articleData.metadata.topics && articleData.metadata.topics !== 'N/A' && (
                  <div className="pt-4 border-t border-slate-200">
                    <h3 className="font-semibold text-slate-700 mb-2">Topics</h3>
                    <div className="flex flex-wrap gap-2">
                      {articleData.metadata.topics.split(',').map((topic, i) => (
                        <span key={i} className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm">
                          {topic.trim()}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {articleData.metadata.recentVersions && articleData.metadata.recentVersions !== 'No updates found' && (
                  <div className="pt-4 border-t border-slate-200">
                    <h3 className="font-semibold text-slate-700 mb-2">Recent Versions</h3>
                    <p className="text-slate-600 text-sm">{articleData.metadata.recentVersions}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function MetadataItem({ label, value }) {
  return (
    <div className="flex flex-col">
      <span className="text-sm font-semibold text-slate-500 uppercase tracking-wide">{label}</span>
      <span className="text-slate-800 mt-1">{value}</span>
    </div>
  );
}
