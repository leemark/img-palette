# img-palette

AI-powered color palette generator from images using Google Gemini API.

## Project Structure

- **Frontend**: Hosted on GitHub Pages from the `/docs` directory
- **Backend**: Cloudflare Worker API

## Deployment Instructions

### Frontend (GitHub Pages)

1. Push the code to a GitHub repository
2. Go to repository settings > Pages
3. Select the "main" branch and "/docs" folder as the source
4. Click "Save"
5. Your site will be published at `https://yourusername.github.io/img-palette/`

### Backend (Cloudflare Worker)

1. Install Wrangler CLI:
   ```
   npm install -g wrangler
   ```

2. Log in to your Cloudflare account:
   ```
   wrangler login
   ```

3. Configure your API key:
   ```
   wrangler secret put GEMINI_API_KEY
   ```

4. Deploy the Worker:
   ```
   wrangler publish
   ```

5. Update the API endpoint in `/docs/js/main.js` and `/js/main.js` with your actual Cloudflare Worker URL:
   ```javascript
   const API_ENDPOINT = 'https://img-palette-api.your-subdomain.workers.dev/generate-palette';
   ```

## Local Development

### Worker Development

```
npm install -D wrangler
npx wrangler dev
```

### Frontend Development

Simply open `index.html` in your browser or use a local server:

```
npx http-server
``` 