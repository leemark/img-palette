import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';

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
      console.error('Worker error:', error);
      return new Response(JSON.stringify({ 
        error: error.message,
        stack: error.stack,
        name: error.name
      }), {
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

async function uploadToGemini(arrayBuffer, mimeType, displayName, apiKey) {
  console.log(`Attempting to upload file: ${displayName}, Size: ${arrayBuffer.byteLength}, Type: ${mimeType}`);
  
  try {
    // Step 1: Initiate the resumable upload session
    const uploadUrl = 'https://generativelanguage.googleapis.com/upload/v1beta/files';
    console.log(`Using upload URL for initiating resumable upload: ${uploadUrl}`);
    
    // Start the resumable upload
    const initiateResponse = await fetch(`${uploadUrl}?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Upload-Protocol': 'resumable',
        'X-Goog-Upload-Command': 'start',
        'X-Goog-Upload-Header-Content-Length': arrayBuffer.byteLength.toString(),
        'X-Goog-Upload-Header-Content-Type': mimeType,
      },
      body: JSON.stringify({
        file: {
          display_name: displayName
        }
      })
    });
    
    if (!initiateResponse.ok) {
      const errorText = await initiateResponse.text();
      console.error('Upload initiation failed:', errorText);
      console.error('Response status:', initiateResponse.status);
      console.error('Response headers:', JSON.stringify(Object.fromEntries([...initiateResponse.headers])));
      throw new Error(`Failed to initiate upload: ${initiateResponse.status} ${errorText}`);
    }
    
    // Get the upload URL from the response headers
    const uploadSessionUrl = initiateResponse.headers.get('X-Goog-Upload-URL');
    if (!uploadSessionUrl) {
      console.error('No upload URL in response headers:', JSON.stringify(Object.fromEntries([...initiateResponse.headers])));
      throw new Error('Failed to get upload URL from response headers');
    }
    
    console.log('Received upload session URL, proceeding with upload');
    
    // Step 2: Upload the file content
    const uploadFileResponse = await fetch(uploadSessionUrl, {
      method: 'POST',
      headers: {
        'Content-Length': arrayBuffer.byteLength.toString(),
        'X-Goog-Upload-Offset': '0',
        'X-Goog-Upload-Command': 'upload, finalize'
      },
      body: new Blob([arrayBuffer], { type: mimeType })
    });
    
    if (!uploadFileResponse.ok) {
      const errorText = await uploadFileResponse.text();
      console.error('File content upload failed:', errorText);
      console.error('Response status:', uploadFileResponse.status);
      console.error('Response headers:', JSON.stringify(Object.fromEntries([...uploadFileResponse.headers])));
      throw new Error(`Failed to upload file content: ${uploadFileResponse.status} ${errorText}`);
    }
    
    // Parse the response to get the file info
    const uploadResult = await uploadFileResponse.json();
    console.log('Upload response:', JSON.stringify(uploadResult));
    
    // Extract URI with fallbacks for different response formats
    const fileUri = uploadResult.file?.uri || 
                   uploadResult.uri || 
                   `files/${uploadResult.file?.name}` || 
                   `files/${uploadResult.name}`;
    
    if (!fileUri) {
      console.error('No file URI found in response:', JSON.stringify(uploadResult));
      throw new Error('File upload succeeded but no URI was returned');
    }
    
    console.log('Using file URI:', fileUri);
    
    return {
      mimeType: mimeType,
      uri: fileUri
    };
  } catch (error) {
    console.error('Error in uploadToGemini:', error.message);
    throw error;
  }
}

async function generatePalette(request) {
  try {
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
    
    console.log('Image file received:', imageFile.name, 'Size:', imageFile.size, 'Type:', imageFile.type);
    
    // Get image array buffer
    const arrayBuffer = await imageFile.arrayBuffer();
    
    // Convert ArrayBuffer to Base64 for direct inline usage - more reliable method
    const uint8Array = new Uint8Array(arrayBuffer);
    const chunks = [];
    const chunkSize = 0x8000; // 32KB chunks to avoid memory issues
    
    for (let i = 0; i < uint8Array.length; i += chunkSize) {
      chunks.push(String.fromCharCode.apply(null, uint8Array.subarray(i, i + chunkSize)));
    }
    
    const base64Data = btoa(chunks.join(""));
    
    // Initialize Gemini API
    const API_KEY = GEMINI_API_KEY; // Set in Cloudflare Worker environment variables
    if (!API_KEY) {
      throw new Error('GEMINI_API_KEY is not set in environment variables');
    }
    
    const genAI = new GoogleGenerativeAI(API_KEY);
    
    // Set up generation configuration according to the documentation
    const generationConfig = {
      temperature: 1,
      topP: 0.95,
      topK: 40,
      maxOutputTokens: 8192,
    };
    
    // Set up safety settings
    const safetySettings = [
      {
        category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_HARASSMENT,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
      },
    ];
    
    // Use the gemini-2.0-flash-lite model as specified
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.0-flash-lite",
    });
    
    // Create prompt for Gemini
    const prompt = "Analyze this image and extract a harmonious color palette of 5 colors that represents the key colors in the image. For each color, provide the hex code. Also, suggest a creative name for this palette that evokes the mood or theme of the image. Additionally, write a brief, lyrical and poetic description (1-2 sentences) that captures the essence of the palette and relates to the theme or content of the source image. Return the result as JSON in this format: {\"name\": \"Palette Name\", \"description\": \"Your poetic description here\", \"colors\": [{\"hex\": \"#XXXXXX\"}, ...]}";
    
    console.log('Preparing image for Gemini API...');
    
    // Create a chat session with the model
    const chatSession = model.startChat({
      generationConfig,
      safetySettings,
      history: []
    });
    
    // Send message with inline image data
    const result = await chatSession.sendMessage([
      {
        inlineData: {
          mimeType: imageFile.type,
          data: base64Data
        }
      },
      { text: prompt }
    ]);
    
    console.log('Gemini API response received');
    
    const text = result.response.text();
    
    console.log('Response text:', text.substring(0, 100) + '...');
    
    // Extract JSON from response
    let jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) || 
                    text.match(/{[\s\S]*?}/);
                    
    let paletteData;
    if (jsonMatch) {
      try {
        paletteData = JSON.parse(jsonMatch[1] || jsonMatch[0]);
        console.log('Successfully parsed palette data');
      } catch (e) {
        console.error('Error parsing JSON:', e);
        console.log('Raw response:', text);
        return new Response(JSON.stringify({ 
          error: 'Could not parse palette data',
          parseError: e.message,
          rawResponse: text.substring(0, 500) + '...'
        }), {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        });
      }
    } else {
      console.error('No JSON found in response');
      return new Response(JSON.stringify({ 
        error: 'Invalid response format',
        rawResponse: text.substring(0, 500) + '...'
      }), {
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
  } catch (error) {
    console.error('Error in generatePalette:', error);
    throw error; // Re-throw to be caught by the main handler
  }
} 