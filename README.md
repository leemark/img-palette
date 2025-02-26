# img-palette

AI-powered color palette generator from images using Google Gemini API.

![img-palette demo](docs/images/demo-preview.png)

## Features

- Upload any image and get a beautiful color palette with descriptive name
- AI-powered palette generation using Google's Gemini API
- Copy colors to clipboard with a single click
- Dark/Light theme toggle with persistent settings
- Save generated palettes to local history
- Responsive design for all device sizes
- Modern UI with smooth animations and transitions

## Project Structure

- **Frontend**: Hosted on GitHub Pages from the `/docs` directory
- **Backend**: Cloudflare Worker API that integrates with Google Gemini API

## How It Works

1. User uploads an image through the frontend interface
2. Image is sent to the Cloudflare Worker backend
3. Backend processes the image and sends it to Google Gemini API
4. Gemini analyzes the image and generates a color palette with a descriptive name
5. Results are returned to the frontend and displayed to the user
6. Users can save, copy, or share their generated palettes

## Deployment Instructions

### Frontend (GitHub Pages)

The frontend is automatically deployed from the `/docs` directory when changes are pushed to the main branch.

1. Push code to the GitHub repository
2. GitHub Pages settings should be configured to use:
   - Source: Deploy from a branch
   - Branch: main
   - Folder: /docs
3. Your site will be published at `https://yourusername.github.io/img-palette/`

### Backend (Cloudflare Worker)

Backend deployment is handled manually using Wrangler CLI:

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
   wrangler deploy
   ```

5. Update the API endpoint in `/docs/js/main.js` with your actual Cloudflare Worker URL:
   ```javascript
   const API_ENDPOINT = 'https://img-palette-api.your-subdomain.workers.dev/generate-palette';
   ```

## Local Development

### Worker Development

```
npm install
npm install -D wrangler
npx wrangler dev
```

### Frontend Development

Simply open `docs/index.html` in your browser or use a local server:

```
cd docs
npx http-server
```

## Technologies Used

- **Frontend**: HTML, CSS, JavaScript
- **Backend**: Cloudflare Workers (JavaScript)
- **AI**: Google Gemini API
- **Deployment**: GitHub Pages, Cloudflare Workers

## Configuration

The project uses the following configuration files:
- `wrangler.toml`: Cloudflare Worker configuration
- `.github/workflows/deploy.yml`: GitHub Pages deployment settings (automatic deployment only)

## License

MIT 