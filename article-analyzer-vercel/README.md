# Article Analyzer 📝

AI-powered article metadata extraction tool built with React, Vite, and Claude AI.

## Features

- 🔗 **URL Analysis** - Paste any article URL to extract metadata
- 📄 **Text Analysis** - Paste article text and AI will find the source
- 🤖 **AI-Powered** - Uses Claude Sonnet 4 with web search capabilities
- 📊 **Rich Metadata** - Extracts author, date, source, word count, summary, topics, and more
- 🎨 **Clean UI** - Two-panel layout with modern Tailwind design

## Deploy to Vercel (Recommended)

### Option 1: Quick Deploy (5 minutes)

1. **Fork/Clone this repo to GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/article-analyzer.git
   git push -u origin main
   ```

2. **Go to [Vercel](https://vercel.com)**
   - Sign up/login with GitHub
   - Click "Add New Project"
   - Import your GitHub repository

3. **Add Environment Variable**
   - In Vercel project settings, go to "Environment Variables"
   - Add: `ANTHROPIC_API_KEY` = `your-api-key-here`
   - Get your API key from: https://console.anthropic.com/

4. **Deploy!**
   - Click "Deploy"
   - Your app will be live at `https://your-project.vercel.app`

### Option 2: Deploy with Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Follow prompts and add ANTHROPIC_API_KEY when asked
```

## Local Development

```bash
# Install dependencies
npm install

# Add your API key to .env.local
echo "ANTHROPIC_API_KEY=your-api-key-here" > .env.local

# Run development server
npm run dev

# Build for production
npm run build
```

## How It Works

1. **Frontend** (`src/App.jsx`)
   - React app with two-panel layout
   - Handles user input (URL or text)
   - Displays article and metadata

2. **Backend** (`api/analyze.js`)
   - Vercel serverless function
   - Calls Claude API securely (API key never exposed to client)
   - Uses web search to fetch articles and find sources

3. **API Flow**
   ```
   User Input → Frontend → /api/analyze → Claude API → Response → Frontend
   ```

## Tech Stack

- **Frontend**: React 18, Vite, Tailwind CSS
- **Backend**: Vercel Serverless Functions
- **AI**: Claude Sonnet 4 (Anthropic API)
- **Icons**: Lucide React

## Environment Variables

Required:
- `ANTHROPIC_API_KEY` - Your Anthropic API key

## Project Structure

```
article-analyzer-vercel/
├── api/
│   └── analyze.js          # Serverless function for Claude API
├── src/
│   ├── App.jsx            # Main React component
│   ├── main.jsx           # React entry point
│   └── index.css          # Tailwind styles
├── index.html             # HTML template
├── package.json           # Dependencies
├── vite.config.js         # Vite configuration
├── tailwind.config.js     # Tailwind configuration
└── README.md             # This file
```

## Customization

### Add More Metadata Fields

Edit `api/analyze.js` and modify the prompt to request additional fields:

```javascript
const prompt = `...
Please provide a JSON object with these exact fields:
{
  "author": "...",
  "yourNewField": "...",
  ...
}`;
```

### Change AI Model

In `api/analyze.js`, change the model:

```javascript
model: 'claude-opus-4-5-20251101'  // For more powerful analysis
```

### Styling

Edit `src/App.jsx` and modify Tailwind classes or add custom CSS to `src/index.css`.

## Troubleshooting

**API Key Issues:**
- Make sure `ANTHROPIC_API_KEY` is set in Vercel environment variables
- Redeploy after adding environment variables

**CORS Errors:**
- The API route handles CORS automatically
- Make sure you're calling `/api/analyze` (relative path)

**Build Errors:**
- Run `npm install` to ensure all dependencies are installed
- Check Node version (requires 18+)

## License

MIT

## Credits

Built with ❤️ using Claude AI
