# img-palette

AI-powered color palette generator that creates beautiful, cohesive color schemes from your images using Google's Gemini API.

## 🎨 Features

### Core Functionality
- Upload any image and get a beautiful color palette with descriptive name
- AI-powered palette generation using Google's Gemini API
- Client-side image resizing for faster uploads and processing
- Modern, responsive interface that works on all devices

### Color Management
- View colors in multiple formats (HEX, RGB, HSL, CMYK)
- Detailed color information with accessibility metrics (contrast ratios, WCAG compliance)
- One-click color copying to clipboard
- Manual color adjustment with visual color picker
- Color lock feature to maintain selected colors when regenerating
- Color harmony suggestions based on color theory (complementary, analogous, triadic, etc.)
- Visual color sampling directly from uploaded images

### User Experience
- Dark/Light theme toggle with persistent settings
- Save generated palettes to local history
- Delete unwanted palettes from history
- Toast notifications for user feedback
- Smooth animations and transitions throughout the interface
- Auto-scrolling to results after generation

## 🚀 Live Demo

Try it now: [https://leemark.github.io/img-palette/](https://leemark.github.io/img-palette/)

## 🔍 How It Works

1. **Upload an Image**: Select or drag-and-drop an image onto the interface
2. **Image Processing**: The image is automatically resized client-side if needed
3. **AI Analysis**: The image is securely sent to a Cloudflare Worker backend
4. **Palette Generation**: The backend uses Google's Gemini API to analyze the image and generate a thoughtful color palette
5. **Results Display**: The generated palette is returned and displayed with a descriptive name
6. **Interaction**: Adjust, save, copy, or generate harmony variations from your palette

## 🔮 Upcoming Features

- **Export Options**
  - Export to CSS, SCSS, and design tool formats
  - Downloadable swatches for Adobe/Sketch/Figma
  
- **Accessibility Improvements**
  - Enhanced keyboard navigation
  - Screen reader descriptions for colors
  - High contrast mode option
  
- **Offline Support**
  - Progressive Web App features
  - Offline access to saved palettes

## 💻 Technologies Used

- **Frontend**:
  - HTML5, CSS3, Vanilla JavaScript
  - Modern ES6+ features
  - LocalStorage for user preferences and history
  - Canvas API for image processing
  - Font Awesome for icons

- **Backend**:
  - Cloudflare Workers (serverless JavaScript)
  - Google Gemini API for AI-powered color analysis

- **Deployment**:
  - GitHub Pages for frontend hosting
  - Cloudflare Workers for backend API

## 🛠️ Development

### Local Setup
```bash
# Clone the repository
git clone https://github.com/leemark/img-palette.git
cd img-palette

# Install dependencies
npm install

# Start the development server
npm run dev
```

### Deployment
```bash
# Deploy the backend Cloudflare Worker
npx wrangler deploy

# The frontend is automatically deployed to GitHub Pages on push to main
```

## 📝 License

MIT License

## 🙏 Acknowledgements

- Google Gemini API for powering the AI color analysis
- Cloudflare Workers for serverless backend hosting
- GitHub Pages for frontend hosting 