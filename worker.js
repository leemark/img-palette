import { GoogleGenerativeAI } from '@google/generative-ai';

// Configuration
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// Cloudflare Worker event handler
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  // Handle CORS preflight requests
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders
    });
  }
  
  // Handle the main request
  if (request.method === 'POST' && request.url.endsWith('/generate-palette')) {
    try {
      return await generatePalette(request);
    } catch (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }
  }
  
  // Default response for other routes
  return new Response('Not found', { status: 404, headers: corsHeaders });
}

async function generatePalette(request) {
  // Check if the request is multipart/form-data
  const contentType = request.headers.get('Content-Type') || '';
  if (!contentType.includes('multipart/form-data')) {
    return new Response(JSON.stringify({ error: 'Content-Type must be multipart/form-data' }), {
      status: 400,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  }
  
  // Parse form data to get the image
  const formData = await request.formData();
  const imageFile = formData.get('image');
  
  if (!imageFile) {
    return new Response(JSON.stringify({ error: 'No image uploaded' }), {
      status: 400,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  }
  
  // Convert image to base64
  const arrayBuffer = await imageFile.arrayBuffer();
  const uint8Array = new Uint8Array(arrayBuffer);
  const imageBase64 = btoa(String.fromCharCode.apply(null, uint8Array));
  
  // Initialize Gemini API
  const API_KEY = GEMINI_API_KEY; // Set in Cloudflare Worker environment variables
  const genAI = new GoogleGenerativeAI(API_KEY);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  
  // Create prompt for Gemini
  const prompt = "Analyze this image and extract a harmonious color palette of 5 colors that represents the key colors in the image. For each color, provide the hex code. Also, suggest a creative name for this palette that evokes the mood or theme of the image. Return the result as JSON in this format: {\"name\": \"Palette Name\", \"colors\": [{\"hex\": \"#XXXXXX\"}, ...]}";
  
  // Call Gemini API
  const result = await model.generateContent([
    prompt,
    {
      inlineData: {
        mimeType: imageFile.type,
        data: imageBase64
      }
    }
  ]);
  
  const response = result.response;
  const text = response.text();
  
  // Extract JSON from response
  let jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) || 
                  text.match(/{[\s\S]*?}/);
                  
  let paletteData;
  if (jsonMatch) {
    try {
      paletteData = JSON.parse(jsonMatch[1] || jsonMatch[0]);
    } catch (e) {
      return new Response(JSON.stringify({ error: 'Could not parse palette data' }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }
  } else {
    return new Response(JSON.stringify({ error: 'Invalid response format' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
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
  
  return new Response(JSON.stringify(paletteData), {
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders
    }
  });
} 