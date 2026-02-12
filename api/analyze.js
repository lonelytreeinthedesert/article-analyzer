export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { inputType, input } = req.body;

  if (!input) {
    return res.status(400).json({ error: 'No input provided' });
  }

  try {
    let articleText = input;
    let fetchedUrl = inputType === 'url' ? input : null;

    // For URL input, fetch the page and extract metadata
    if (inputType === 'url') {
      const fetchResponse = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 4000,
          tools: [
            {
              type: 'web_search_20250305',
              name: 'web_search'
            }
          ],
          messages: [
            {
              role: 'user',
              content: `Look up this article URL: ${input}

Extract the following metadata from the page:
1. Author name (look for author meta tags, byline, or article credits)
2. Publication date (look for published date, article:published_time meta tag)
3. Article title/headline
4. Main content/text of the article
5. Source/publication name

Provide this information clearly so I can parse it.`
            }
          ]
        })
      });

      const fetchData = await fetchResponse.json();
      
      // Handle API response format
      if (fetchData.content && Array.isArray(fetchData.content)) {
        articleText = fetchData.content
          .map(item => item.type === 'text' ? item.text : '')
          .filter(Boolean)
          .join('\n');
      } else if (fetchData.error) {
        throw new Error(`API Error: ${fetchData.error.message || 'Unknown error'}`);
      } else {
        articleText = JSON.stringify(fetchData);
      }
    }

    // Analyze and extract metadata
    const analysisPrompt = inputType === 'url'
      ? `I fetched content from ${input}. Here's what I found:

${articleText}

Now extract precise metadata into JSON format. Use the information provided above to fill in these fields accurately:

{
  "author": "extract the author name from the content above, or 'Unknown' if not found",
  "datePublished": "extract the publication date from the content above (format as readable date), or 'Unknown'",
  "source": "extract the publication/website name from the URL or content (e.g., 'CNN', 'Medium', 'TechCrunch'), or extract from domain",
  "url": "${input}",
  "summary": "write a clear 2-3 sentence summary of the article's main points based on the content above",
  "topics": "identify 3-5 key topics as comma-separated values based on the article content",
  "readingTime": "estimate reading time based on content length (e.g., '5 minutes')",
  "recentVersions": "if any update information was found mention it, otherwise 'No updates found'"
}

Be precise - only use information that was actually found in the content above. Return ONLY the JSON object.`
      : `I have article text. Search online to find the source and extract metadata.

Text snippet:
${input.slice(0, 1000)}...

Provide JSON:
{
  "author": "author or Unknown",
  "datePublished": "date or Unknown",
  "source": "publication or Unknown",
  "url": "URL if found or Unknown",
  "summary": "2-3 sentence summary",
  "topics": "comma-separated topics",
  "readingTime": "estimate",
  "recentVersions": "update info or 'No updates found'"
}

Return ONLY valid JSON.`;

    const analysisResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        tools: inputType === 'text' ? [
          {
            type: 'web_search_20250305',
            name: 'web_search'
          }
        ] : [],
        messages: [
          {
            role: 'user',
            content: analysisPrompt
          }
        ]
      })
    });

    const analysisData = await analysisResponse.json();
    
    // Handle API response format
    let fullResponse = '';
    if (analysisData.content && Array.isArray(analysisData.content)) {
      fullResponse = analysisData.content
        .map(item => item.type === 'text' ? item.text : '')
        .filter(Boolean)
        .join('\n');
    } else if (analysisData.error) {
      throw new Error(`API Error: ${analysisData.error.message || 'Unknown error'}`);
    } else {
      fullResponse = JSON.stringify(analysisData);
    }

    // Parse JSON from response
    let metadata;
    try {
      // Try to find JSON in the response
      const jsonMatch = fullResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        metadata = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found');
      }
    } catch (parseError) {
      // Fallback: extract what we can from the text
      const lines = fullResponse.split('\n');
      metadata = {
        author: extractField(fullResponse, 'author') || 'Unknown',
        datePublished: extractField(fullResponse, 'date') || extractField(fullResponse, 'published') || 'Unknown',
        source: extractSourceFromUrl(fetchedUrl || input),
        url: fetchedUrl || 'Unknown',
        summary: fullResponse.slice(0, 300).trim() + (fullResponse.length > 300 ? '...' : ''),
        topics: extractField(fullResponse, 'topics') || extractField(fullResponse, 'tags') || 'General',
        readingTime: estimateReadingTime(fullResponse),
        recentVersions: 'No updates found'
      };
    }

    // Calculate word count from input
    const wordCount = input.trim().split(/\s+/).length;

    res.status(200).json({
      text: inputType === 'url' ? `Article from: ${input}\n\n${fullResponse}` : input,
      metadata: {
        ...metadata,
        wordCount,
        url: fetchedUrl || metadata.url || 'Unknown'
      }
    });

  } catch (error) {
    console.error('Analysis error:', error);
    res.status(500).json({ 
      error: 'Failed to analyze article', 
      details: error.message || 'Unknown error'
    });
  }
}

// Helper functions
function extractSourceFromUrl(url) {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.replace('www.', '');
    
    // Map common domains to readable names
    const sourceMap = {
      'cnn.com': 'CNN',
      'bbc.com': 'BBC',
      'nytimes.com': 'The New York Times',
      'washingtonpost.com': 'The Washington Post',
      'theguardian.com': 'The Guardian',
      'medium.com': 'Medium',
      'techcrunch.com': 'TechCrunch',
      'wired.com': 'Wired',
      'arstechnica.com': 'Ars Technica',
      'theverge.com': 'The Verge',
      'reuters.com': 'Reuters',
      'bloomberg.com': 'Bloomberg',
      'forbes.com': 'Forbes',
      'wsj.com': 'Wall Street Journal'
    };
    
    return sourceMap[hostname] || hostname.split('.')[0].charAt(0).toUpperCase() + hostname.split('.')[0].slice(1);
  } catch {
    return 'Unknown';
  }
}

function extractField(text, fieldName) {
  const patterns = [
    new RegExp(`${fieldName}[:\\s-]+([^\\n]+)`, 'i'),
    new RegExp(`"${fieldName}"[:\\s]+"([^"]+)"`, 'i'),
    new RegExp(`${fieldName}[:\\s]+(.+?)(?=\\n|$)`, 'i')
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  return null;
}

function extractSource(url) {
  return extractSourceFromUrl(url);
}

function estimateReadingTime(text) {
  const words = text.trim().split(/\s+/).length;
  const minutes = Math.ceil(words / 200);
  return `${minutes} minute${minutes > 1 ? 's' : ''}`;
}