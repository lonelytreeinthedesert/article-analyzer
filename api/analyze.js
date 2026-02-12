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

  const { text } = req.body;

  if (!text || !text.trim()) {
    return res.status(400).json({ error: 'No text provided' });
  }

  try {
    // Calculate word count immediately - this always works
    const wordCount = text.trim().split(/\s+/).filter(w => w.length > 0).length;
    const readingTime = Math.max(1, Math.ceil(wordCount / 200));

    // Use Claude to: 1) Create summary, 2) Search for source metadata
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 3000,
        tools: [
          {
            type: 'web_search_20250305',
            name: 'web_search'
          }
        ],
        messages: [
          {
            role: 'user',
            content: `Here's an article text. Please:
1. Write a clear 2-3 sentence summary
2. Identify 4-5 key topics (comma-separated)
3. Search the web to find the original source URL, author, and publication date

Article text:
${text.slice(0, 5000)}

Provide your response as JSON:
{
  "summary": "your 2-3 sentence summary here",
  "topics": "topic1, topic2, topic3, topic4",
  "author": "author name if found, otherwise 'Unable to locate'",
  "datePublished": "date if found, otherwise 'Unable to locate'",
  "source": "publication name if found (CNN, NYT, etc.), otherwise 'Unable to locate'",
  "url": "original URL if found, otherwise 'Unable to locate'"
}

Return ONLY the JSON object.`
          }
        ]
      })
    });

    const data = await response.json();
    
    // Extract Claude's response
    let claudeResponse = '';
    if (data.content && Array.isArray(data.content)) {
      claudeResponse = data.content
        .map(item => item.type === 'text' ? item.text : '')
        .filter(Boolean)
        .join('\n');
    }

    // Parse JSON from response
    let metadata;
    try {
      const jsonMatch = claudeResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        metadata = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON in response');
      }
    } catch (parseError) {
      console.error('Parse error:', parseError);
      // Fallback - create basic metadata
      metadata = {
        summary: claudeResponse.slice(0, 300) || 'Summary could not be generated.',
        topics: 'Unable to locate',
        author: 'Unable to locate',
        datePublished: 'Unable to locate',
        source: 'Unable to locate',
        url: 'Unable to locate'
      };
    }

    // Return metadata with guaranteed word count and reading time
    res.status(200).json({
      wordCount,
      readingTime: `${readingTime} minute${readingTime !== 1 ? 's' : ''}`,
      summary: metadata.summary || 'Summary not available',
      topics: metadata.topics || 'Unable to locate',
      author: metadata.author || 'Unable to locate',
      datePublished: metadata.datePublished || 'Unable to locate',
      source: metadata.source || 'Unable to locate',
      url: metadata.url || 'Unable to locate'
    });

  } catch (error) {
    console.error('Analysis error:', error);
    res.status(500).json({ 
      error: 'Failed to analyze article', 
      details: error.message 
    });
  }
}
