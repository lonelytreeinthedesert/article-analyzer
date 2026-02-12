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
    let fetchedUrl = null;

    // If URL, try to fetch with web search
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
          max_tokens: 2000,
          tools: [
            {
              type: 'web_search_20250305',
              name: 'web_search'
            }
          ],
          messages: [
            {
              role: 'user',
              content: `Please fetch and return the full text content from this URL: ${input}`
            }
          ]
        })
      });

      const fetchData = await fetchResponse.json();
      articleText = fetchData.content
        .map(item => item.type === 'text' ? item.text : '')
        .join('\n');
      fetchedUrl = input;
    }

    // Analyze the article
    const prompt = inputType === 'url' 
      ? `Analyze this article and extract metadata in JSON format.

Article text:
${articleText}

Please provide a JSON object with these exact fields:
{
  "author": "author name or Unknown",
  "datePublished": "publication date or Unknown",
  "source": "publication name (e.g., Medium, CNBC, etc.) or Unknown",
  "url": "original URL if known",
  "summary": "concise 2-3 sentence summary",
  "topics": "comma-separated key topics/tags",
  "readingTime": "estimated reading time",
  "recentVersions": "info about updates or No updates found"
}

Return ONLY the JSON object, no other text.`
      : `I have this article text. Please search online to find the original source and extract metadata.

Article text:
${input}

Search for this article online and provide a JSON object with these exact fields:
{
  "author": "author name or Unknown",
  "datePublished": "publication date or Unknown", 
  "source": "publication name (e.g., Medium, CNBC, etc.) or Unknown",
  "url": "original URL if found or Unknown",
  "summary": "concise 2-3 sentence summary",
  "topics": "comma-separated key topics/tags",
  "readingTime": "estimated reading time",
  "recentVersions": "info about updates or No updates found"
}

Return ONLY the JSON object, no other text.`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        tools: [
          {
            type: 'web_search_20250305',
            name: 'web_search'
          }
        ],
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      })
    });

    const data = await response.json();
    
    // Extract text response
    const fullResponse = data.content
      .map(item => item.type === 'text' ? item.text : '')
      .filter(Boolean)
      .join('\n');

    // Parse JSON from response
    let metadata;
    try {
      const jsonMatch = fullResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        metadata = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found');
      }
    } catch {
      // Fallback parsing
      metadata = {
        author: 'Unknown',
        datePublished: 'Unknown',
        source: 'Unknown',
        url: fetchedUrl || 'Unknown',
        summary: fullResponse.slice(0, 300),
        topics: 'N/A',
        readingTime: 'N/A',
        recentVersions: 'No updates found'
      };
    }

    // Calculate word count
    const wordCount = (inputType === 'url' ? articleText : input).trim().split(/\s+/).length;

    res.status(200).json({
      text: inputType === 'url' ? articleText : input,
      metadata: {
        ...metadata,
        wordCount,
        url: fetchedUrl || metadata.url || 'Unknown'
      }
    });

  } catch (error) {
    console.error('Analysis error:', error);
    res.status(500).json({ error: 'Failed to analyze article', details: error.message });
  }
}
