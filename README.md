# img-palette

AI-powered color palette generator from images using Google Gemini API.

## Features

- Upload any image and get a beautiful color palette with descriptive name
- AI-powered palette generation using Google's Gemini API
- Copy colors to clipboard with a single click
- Dark/Light theme toggle with persistent settings
- Save generated palettes to local history
- Responsive design for all device sizes
- Modern UI with smooth animations and transitions

## How It Works

1. User uploads an image through the frontend interface
2. Image is sent to the Cloudflare Worker backend
3. Backend processes the image and sends it to Google Gemini API
4. Gemini analyzes the image and generates a color palette with a descriptive name
5. Results are returned to the frontend and displayed to the user
6. Users can save, copy, or share their generated palettes


## Technologies Used

- **Frontend**: HTML, CSS, JavaScript
- **Backend**: Cloudflare Workers (JavaScript)
- **AI**: Google Gemini API
- **Deployment**: GitHub Pages, Cloudflare Workers

## License

MIT 