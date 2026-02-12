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
    let rawHtml = '';
    const fetchedUrl = inputType === 'url' ? input : null;

    // Step 1: If URL, fetch the actual HTML using a CORS proxy
    if (inputType === 'url') {
      try {
        // Use a public CORS proxy to fetch the page
        const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(input)}`;
        const htmlResponse = await fetch(proxyUrl);
        rawHtml = await htmlResponse.text();
        
        // Basic HTML parsing - extract text content
        // Remove scripts, styles, and HTML tags
        let cleanText = rawHtml
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
          .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
          .replace(/<[^>]+>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
        
        articleText = cleanText;
      } catch (fetchError) {
        console.error('Fetch error:', fetchError);
        return res.status(500).json({ 
          error: 'Failed to fetch URL', 
          details: 'Unable to access the article. Try pasting the text instead.' 
        });
      }
    }

    // Step 2: Use Claude to analyze the text and extract metadata
    const analysisResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 3000,
        messages: [
          {
            role: 'user',
            content: inputType === 'url' 
              ? `I scraped this article from ${input}. Here's the extracted text:

${articleText.slice(0, 6000)}

Please analyze it and provide metadata in JSON format:
{
  "author": "extract author name or 'Unknown'",
  "datePublished": "extract date or 'Unknown'",
  "source": "${extractSourceName(input)}",
  "title": "extract headline/title",
  "summary": "2-3 sentence summary of main points",
  "topics": "comma-separated key topics (4-5)",
  "cleanArticleText": "the main article content, cleaned up and formatted"
}

Return ONLY the JSON object.`
              : `Here's article text to analyze:

${input.slice(0, 6000)}

Provide metadata in JSON:
{
  "author": "Unknown",
  "datePublished": "Unknown",
  "source": "Unknown",
  "title": "Extract or create a title",
  "summary": "2-3 sentence summary",
  "topics": "comma-separated topics",
  "cleanArticleText": "${input}"
}

Return ONLY JSON.`
          }
        ]
      })
    });

    const analysisData = await analysisResponse.json();
    
    let analysisText = '';
    if (analysisData.content && Array.isArray(analysisData.content)) {
      analysisText = analysisData.content
        .map(item => item.type === 'text' ? item.text : '')
        .filter(Boolean)
        .join('\n');
    }

    // Parse JSON response
    let metadata;
    let finalArticleText = articleText;
    
    try {
      const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        
        // Use cleaned article text if provided
        if (parsed.cleanArticleText) {
          finalArticleText = parsed.cleanArticleText;
        }
        
        // Calculate word count from actual article text
        const wordCount = finalArticleText.trim().split(/\s+/).filter(w => w.length > 0).length;
        const readingTime = Math.max(1, Math.ceil(wordCount / 200));
        
        metadata = {
          author: parsed.author || 'Unknown',
          datePublished: parsed.datePublished || 'Unknown',
          source: parsed.source || (fetchedUrl ? extractSourceName(fetchedUrl) : 'Unknown'),
          url: fetchedUrl || 'Unknown',
          summary: parsed.summary || 'No summary available',
          topics: parsed.topics || 'General',
          readingTime: `${readingTime} minute${readingTime !== 1 ? 's' : ''}`,
          recentVersions: 'No updates found',
          wordCount
        };
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('Parse error:', parseError);
      // Fallback metadata
      const wordCount = finalArticleText.trim().split(/\s+/).filter(w => w.length > 0).length;
      metadata = {
        author: 'Unknown',
        datePublished: 'Unknown',
        source: fetchedUrl ? extractSourceName(fetchedUrl) : 'Unknown',
        url: fetchedUrl || 'Unknown',
        summary: analysisText.slice(0, 300) + '...',
        topics: 'General',
        readingTime: `${Math.max(1, Math.ceil(wordCount / 200))} minutes`,
        recentVersions: 'No updates found',
        wordCount
      };
    }

    // Return clean article text (not JSON) for display
    res.status(200).json({
      text: finalArticleText,
      metadata
    });

  } catch (error) {
    console.error('Analysis error:', error);
    res.status(500).json({ 
      error: 'Failed to analyze article', 
      details: error.message 
    });
  }
}

function extractSourceName(url) {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.replace('www.', '');
    
    const sourceMap = {
      'cnn.com': 'CNN',
      'bbc.com': 'BBC',
      'bbc.co.uk': 'BBC',
      'nytimes.com': 'The New York Times',
      'washingtonpost.com': 'The Washington Post',
      'theguardian.com': 'The Guardian',
      'guardian.co.uk': 'The Guardian',
      'medium.com': 'Medium',
      'techcrunch.com': 'TechCrunch',
      'wired.com': 'Wired',
      'arstechnica.com': 'Ars Technica',
      'theverge.com': 'The Verge',
      'reuters.com': 'Reuters',
      'bloomberg.com': 'Bloomberg',
      'forbes.com': 'Forbes',
      'wsj.com': 'Wall Street Journal',
      'ft.com': 'Financial Times',
      'apnews.com': 'Associated Press',
      'npr.org': 'NPR'
    };
    
    return sourceMap[hostname] || hostname.split('.')[0].charAt(0).toUpperCase() + hostname.split('.')[0].slice(1);
  } catch {
    return 'Unknown';
  }
}
