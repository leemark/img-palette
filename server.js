const express = require('express');
const multer = require('multer');
const path = require('path');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
const port = process.env.PORT || 3000;

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only images are allowed'), false);
        }
    }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Initialize Gemini API
const API_KEY = process.env.GEMINI_API_KEY; // Set this in your environment variables
const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// Routes
app.post('/api/generate-palette', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No image uploaded' });
        }

        // Convert image to base64
        const imageData = req.file.buffer.toString('base64');
        
        // Create Gemini API prompt
        const prompt = "Analyze this image and extract a harmonious color palette of 5 colors that represents the key colors in the image. For each color, provide the hex code. Also, suggest a creative name for this palette that evokes the mood or theme of the image. Return the result as JSON in this format: {\"name\": \"Palette Name\", \"colors\": [{\"hex\": \"#XXXXXX\"}, ...]}";
        
        // Call Gemini API with the image
        const result = await model.generateContent([
            prompt,
            {
                inlineData: {
                    mimeType: req.file.mimetype,
                    data: imageData
                }
            }
        ]);

        const response = result.response;
        const text = response.text();
        
        // Extract JSON from the response
        let jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) || 
                        text.match(/{[\s\S]*?}/);
                        
        let paletteData;
        if (jsonMatch) {
            try {
                paletteData = JSON.parse(jsonMatch[1] || jsonMatch[0]);
            } catch (e) {
                console.error('Error parsing JSON from Gemini response:', e);
                console.log('Raw response:', text);
                return res.status(500).json({ error: 'Could not parse palette data' });
            }
        } else {
            console.error('No JSON found in response:', text);
            return res.status(500).json({ error: 'Invalid response format' });
        }
        
        // Add RGB values for each color
        paletteData.colors = paletteData.colors.map(color => {
            const hex = color.hex;
            const r = parseInt(hex.slice(1, 3), 16);
            const g = parseInt(hex.slice(3, 5), 16);
            const b = parseInt(hex.slice(5, 7), 16);
            return {
                ...color,
                rgb: `rgb(${r}, ${g}, ${b})`
            };
        });
        
        res.json(paletteData);
    } catch (error) {
        console.error('Error processing image:', error);
        res.status(500).json({ error: 'Error processing image' });
    }
});

// Start server
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
}); 