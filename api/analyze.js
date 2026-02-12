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

    // For URL input, use web search to find article info
    if (inputType === 'url') {
      const searchResponse = await fetch('https://api.anthropic.com/v1/messages', {
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
              content: `Search for information about the article at this URL: ${input}
              
I need you to find and tell me about this article. Provide:
- A summary of what the article is about
- The author if you can find it
- The publication date if available
- Any key topics or themes

Don't reproduce the full article text - just provide this metadata and a summary.`
            }
          ]
        })
      });

      const searchData = await searchResponse.json();
      
      // Handle API response format
      if (searchData.content && Array.isArray(searchData.content)) {
        articleText = searchData.content
          .map(item => item.type === 'text' ? item.text : '')
          .filter(Boolean)
          .join('\n');
      } else if (searchData.error) {
        throw new Error(`API Error: ${searchData.error.message || 'Unknown error'}`);
      } else {
        articleText = JSON.stringify(searchData);
      }
    }

    // Analyze and extract metadata
    const analysisPrompt = inputType === 'url'
      ? `Based on your search about the article at ${input}, provide metadata in JSON format.

Your findings:
${articleText}

Extract a JSON object with:
{
  "author": "author name or Unknown",
  "datePublished": "date or Unknown",
  "source": "publication name (CNN, Medium, etc.) or Unknown",
  "url": "${input}",
  "summary": "2-3 sentence summary",
  "topics": "comma-separated topics",
  "readingTime": "estimate like '5 minutes'",
  "recentVersions": "update info or 'No updates found'"
}

Return ONLY valid JSON, nothing else.`
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
      // Fallback: create metadata from text
      metadata = {
        author: 'Unknown',
        datePublished: 'Unknown',
        source: extractSource(input),
        url: fetchedUrl || 'Unknown',
        summary: fullResponse.slice(0, 300) + '...',
        topics: 'General',
        readingTime: estimateReadingTime(input),
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
function extractSource(url) {
  try {
    const hostname = new URL(url).hostname;
    return hostname.replace('www.', '').split('.')[0];
  } catch {
    return 'Unknown';
  }
}

function estimateReadingTime(text) {
  const words = text.trim().split(/\s+/).length;
  const minutes = Math.ceil(words / 200);
  return `${minutes} minute${minutes > 1 ? 's' : ''}`;
}