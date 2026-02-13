import React, { useState } from 'react';
import { Search, FileText, Loader2 } from 'lucide-react';

export default function ArticleAnalyzer() {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [metadata, setMetadata] = useState(null);
  const [error, setError] = useState('');
  const [detectIntensifiers, setDetectIntensifiers] = useState(false);
  const [detectFactives, setDetectFactives] = useState(false);

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
          text: input,
          detectIntensifiers: detectIntensifiers,
          detectFactives: detectFactives
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

  const highlightBias = (text, biasAnalysis) => {
    if (!biasAnalysis) return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br />');

    const markers = [];
    
    // Collect intensifiers
    if (biasAnalysis.subjectiveIntensifiers) {
      ['high', 'medium', 'low'].forEach(level => {
        biasAnalysis.subjectiveIntensifiers[level].forEach(item => {
          markers.push({
            start: item.position,
            end: item.position + item.term.length,
            type: `intensifier-${level}`,
            term: item.term
          });
        });
      });
    }
    
    // Collect factive verbs
    if (biasAnalysis.factiveVerbs) {
      biasAnalysis.factiveVerbs.instances.forEach(item => {
        markers.push({
          start: item.position,
          end: item.position + item.term.length,
          type: 'factive',
          term: item.term
        });
      });
    }

    // Remove overlapping markers
    const uniqueMarkers = [];
    markers.sort((a, b) => a.start - b.start);
    
    for (const marker of markers) {
      const overlaps = uniqueMarkers.some(existing => 
        (marker.start >= existing.start && marker.start < existing.end) ||
        (marker.end > existing.start && marker.end <= existing.end) ||
        (marker.start <= existing.start && marker.end >= existing.end)
      );
      if (!overlaps) {
        uniqueMarkers.push(marker);
      }
    }

    // Sort DESC for reverse insertion
    uniqueMarkers.sort((a, b) => b.start - a.start);

    // Escape HTML first
    let result = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    
    // Apply highlighting
    uniqueMarkers.forEach(marker => {
      let className, title;
      
      if (marker.type.startsWith('intensifier')) {
        const level = marker.type.split('-')[1];
        className = level === 'high' 
          ? 'bg-yellow-300 border-b-2 border-yellow-600'
          : level === 'medium'
          ? 'bg-yellow-200 border-b-2 border-yellow-500'
          : 'bg-yellow-100 border-b-2 border-yellow-400';
        title = `Subjective intensifier (${level} intensity)`;
      } else if (marker.type === 'factive') {
        className = 'bg-green-200 border-b-2 border-green-600';
        title = 'Factive verb (presupposes truth)';
      }
      
      const before = result.substring(0, marker.start);
      const highlighted = result.substring(marker.start, marker.end);
      const after = result.substring(marker.end);
      
      result = `${before}<span class="${className}" title="${title}">${highlighted}</span>${after}`;
    });

    // Convert newlines to <br />
    result = result.replace(/\n/g, '<br />');

    return result;
  };

  const hasBiasAnalysis = metadata?.biasAnalysis && 
    (metadata.biasAnalysis.subjectiveIntensifiers || metadata.biasAnalysis.factiveVerbs);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-800 mb-2">Article Analyzer</h1>
          <p className="text-slate-600">Analyze articles for metadata and linguistic patterns using AI</p>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Left Panel - Article Input */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-bold text-slate-800 mb-4 flex items-center gap-2">
              <FileText size={24} />
              Article Text
            </h2>
            
            {!metadata ? (
              <>
                <textarea
                  placeholder="Paste your article text here..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  className="w-full h-[400px] px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none font-sans text-slate-700"
                />

                {/* Bias Analysis Options */}
                <div className="mt-4 space-y-3">
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={detectIntensifiers}
                        onChange={(e) => setDetectIntensifiers(e.target.checked)}
                        className="mt-1 w-5 h-5 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                      />
                      <div>
                        <span className="font-semibold text-slate-800">Identify intensifiers</span>
                        <p className="text-sm text-slate-600 mt-1">
                          Detects adjectives and adverbs that amplify meaning
                        </p>
                      </div>
                    </label>
                  </div>

                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={detectFactives}
                        onChange={(e) => setDetectFactives(e.target.checked)}
                        className="mt-1 w-5 h-5 text-green-600 border-slate-300 rounded focus:ring-green-500"
                      />
                      <div>
                        <span className="font-semibold text-slate-800">Identify factive verbs</span>
                        <p className="text-sm text-slate-600 mt-1">
                          Detects verbs that presuppose the truth of their statement
                        </p>
                      </div>
                    </label>
                  </div>
                </div>

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
              </>
            ) : (
              <>
                {hasBiasAnalysis && (
                  <div className="mb-4 p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="text-sm font-semibold text-slate-700 mb-2">Highlighting Legend:</div>
                    <div className="flex flex-wrap gap-3 text-xs">
                      {metadata.biasAnalysis.subjectiveIntensifiers && (
                        <>
                          <div className="flex items-center gap-2">
                            <span className="bg-yellow-300 border-b-2 border-yellow-600 px-2 py-1">Dark Yellow</span>
                            <span>High intensity</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="bg-yellow-200 border-b-2 border-yellow-500 px-2 py-1">Medium Yellow</span>
                            <span>Medium intensity</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="bg-yellow-100 border-b-2 border-yellow-400 px-2 py-1">Light Yellow</span>
                            <span>Low intensity</span>
                          </div>
                        </>
                      )}
                      {metadata.biasAnalysis.factiveVerbs && (
                        <div className="flex items-center gap-2">
                          <span className="bg-green-200 border-b-2 border-green-600 px-2 py-1">Green</span>
                          <span>Factive verb</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                <div 
                  className="prose max-w-none text-slate-700 max-h-[450px] overflow-y-auto pr-2 leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: highlightBias(input, metadata.biasAnalysis) }}
                />
                
                <button
                  onClick={() => {
                    setMetadata(null);
                  }}
                  className="mt-4 w-full px-6 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors"
                >
                  Analyze Another Article
                </button>
              </>
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
              <div className="space-y-4 max-h-[650px] overflow-y-auto pr-2">
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

                {/* Bias Analysis Section */}
                {hasBiasAnalysis && (
                  <div className="pt-4 border-t-2 border-slate-300">
                    <h3 className="text-lg font-bold text-slate-700 mb-3">Bias Analysis</h3>
                    
                    <div className="space-y-3">
                      {/* Subjective Intensifiers */}
                      {metadata.biasAnalysis.subjectiveIntensifiers && (
                        <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                          <h4 className="font-semibold text-slate-700 mb-3">
                            Subjective Intensifiers: {metadata.biasAnalysis.subjectiveIntensifiers.total}
                          </h4>
                          <div className="text-sm space-y-2">
                            <div className="flex justify-between">
                              <span className="text-slate-600">High intensity:</span>
                              <strong className="text-yellow-700">
                                {metadata.biasAnalysis.subjectiveIntensifiers.countHigh}
                              </strong>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-600">Medium intensity:</span>
                              <strong className="text-yellow-600">
                                {metadata.biasAnalysis.subjectiveIntensifiers.countMedium}
                              </strong>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-600">Low intensity:</span>
                              <strong className="text-yellow-500">
                                {metadata.biasAnalysis.subjectiveIntensifiers.countLow}
                              </strong>
                            </div>
                          </div>
                          
                          <div className="mt-3 pt-3 border-t border-yellow-300">
                            <p className="text-xs text-slate-600 leading-relaxed">
                              Adjectives and adverbs that amplify or reinforce meaning, potentially swaying readers.
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Factive Verbs */}
                      {metadata.biasAnalysis.factiveVerbs && (
                        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                          <h4 className="font-semibold text-slate-700 mb-3">
                            Factive Verbs: {metadata.biasAnalysis.factiveVerbs.count}
                          </h4>
                          
                          <div className="mt-3 pt-3 border-t border-green-300">
                            <p className="text-xs text-slate-600 leading-relaxed">
                              <strong>What are factive verbs?</strong><br />
                              Verbs like "realize," "discover," "reveal," and "know" that presuppose the truth of what follows. 
                              For example, "Trump revealed that regulations were burdensome" presupposes they ARE burdensome, 
                              whereas "Trump said regulations were burdensome" just reports the statement.
                            </p>
                          </div>
                        </div>
                      )}
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
