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
    let metadata = {};
    const fetchedUrl = inputType === 'url' ? input : null;

    if (inputType === 'url') {
      // Step 1: Fetch the actual page with web_fetch
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 8000,
          messages: [
            {
              role: 'user',
              content: `Fetch this URL and extract metadata and content: ${input}

Please provide:
1. The article's full text content (main body only, no ads/navigation)
2. Author name (if available)
3. Publication date (if available)
4. Article headline/title
5. Any meta description or summary

Format your response clearly so I can parse it.`
            }
          ]
        })
      });

      const data = await response.json();
      
      let fetchedContent = '';
      if (data.content && Array.isArray(data.content)) {
        fetchedContent = data.content
          .map(item => item.type === 'text' ? item.text : '')
          .filter(Boolean)
          .join('\n');
      }

      // Step 2: Ask Claude to structure the metadata as JSON
      const structureResponse = await fetch('https://api.anthropic.com/v1/messages', {
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
              content: `Here's content I fetched from ${input}:

${fetchedContent}

Now create a JSON object with this exact structure (extract from the content above):
{
  "author": "extract author name or 'CNN Staff' if not found",
  "datePublished": "extract publication date in readable format or 'Unknown'",
  "source": "${extractSourceName(input)}",
  "title": "extract article headline/title",
  "summary": "write a clear 2-3 sentence summary",
  "topics": "list 4-5 key topics as comma-separated",
  "articleText": "the main article text you found"
}

Return ONLY the JSON object, nothing else.`
            }
          ]
        })
      });

      const structuredData = await structureResponse.json();
      let structuredContent = '';
      
      if (structuredData.content && Array.isArray(structuredData.content)) {
        structuredContent = structuredData.content
          .map(item => item.type === 'text' ? item.text : '')
          .filter(Boolean)
          .join('\n');
      }

      // Parse the JSON
      try {
        const jsonMatch = structuredContent.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          articleText = parsed.articleText || fetchedContent;
          
          // Calculate accurate word count from actual text
          const wordCount = articleText.trim().split(/\s+/).filter(w => w.length > 0).length;
          const readingTime = Math.max(1, Math.ceil(wordCount / 200));
          
          metadata = {
            author: parsed.author || 'Unknown',
            datePublished: parsed.datePublished || 'Unknown',
            source: parsed.source || extractSourceName(input),
            url: input,
            summary: parsed.summary || 'Summary not available',
            topics: parsed.topics || 'News',
            readingTime: `${readingTime} minute${readingTime !== 1 ? 's' : ''}`,
            recentVersions: 'No updates found',
            wordCount
          };
        }
      } catch (e) {
        console.error('JSON parse error:', e);
        // Fallback
        const wordCount = fetchedContent.trim().split(/\s+/).filter(w => w.length > 0).length;
        metadata = {
          author: 'Unknown',
          datePublished: 'Unknown',
          source: extractSourceName(input),
          url: input,
          summary: fetchedContent.slice(0, 300) + '...',
          topics: 'News',
          readingTime: `${Math.max(1, Math.ceil(wordCount / 200))} minutes`,
          recentVersions: 'No updates found',
          wordCount
        };
        articleText = fetchedContent;
      }

    } else {
      // Text input - search for source
      articleText = input;
      const wordCount = input.trim().split(/\s+/).filter(w => w.length > 0).length;
      const readingTime = Math.max(1, Math.ceil(wordCount / 200));
      
      metadata = {
        author: 'Unknown',
        datePublished: 'Unknown',
        source: 'Unknown',
        url: 'Unknown',
        summary: input.slice(0, 300) + '...',
        topics: 'General',
        readingTime: `${readingTime} minute${readingTime !== 1 ? 's' : ''}`,
        recentVersions: 'No updates found',
        wordCount
      };
    }

    res.status(200).json({
      text: articleText,
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
      'medium.com': 'Medium',
      'techcrunch.com': 'TechCrunch',
      'wired.com': 'Wired',
      'arstechnica.com': 'Ars Technica',
      'theverge.com': 'The Verge',
      'reuters.com': 'Reuters',
      'bloomberg.com': 'Bloomberg',
      'forbes.com': 'Forbes',
      'wsj.com': 'Wall Street Journal',
      'ft.com': 'Financial Times'
    };
    
    return sourceMap[hostname] || hostname.split('.')[0].charAt(0).toUpperCase() + hostname.split('.')[0].slice(1);
  } catch {
    return 'Unknown';
  }
}
