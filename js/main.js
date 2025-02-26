document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const uploadContainer = document.getElementById('upload-container');
    const uploadInput = document.getElementById('image-upload');
    const uploadButton = document.querySelector('.upload-button');
    const imagePreviewContainer = document.getElementById('image-preview-container');
    const imagePreview = document.getElementById('image-preview');
    const removeImageButton = document.getElementById('remove-image');
    const generateButton = document.getElementById('generate-palette');
    const resultsSection = document.getElementById('results-section');
    const loadingIndicator = document.getElementById('loading-indicator');
    const paletteContainer = document.getElementById('palette-container');
    const paletteName = document.getElementById('palette-name');
    const paletteColors = document.getElementById('palette-colors');
    const colorCodes = document.getElementById('color-codes');

    // API endpoint - Cloudflare Worker URL
    const API_ENDPOINT = 'https://img-palette-api.leemark.workers.dev/generate-palette';

    // Event Listeners
    uploadButton.addEventListener('click', () => uploadInput.click());
    uploadInput.addEventListener('change', handleImageUpload);
    removeImageButton.addEventListener('click', removeImage);
    generateButton.addEventListener('click', generatePalette);
    
    // Drag and drop functionality
    uploadContainer.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadContainer.classList.add('dragover');
    });
    
    uploadContainer.addEventListener('dragleave', () => {
        uploadContainer.classList.remove('dragover');
    });
    
    uploadContainer.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadContainer.classList.remove('dragover');
        if (e.dataTransfer.files.length) {
            uploadInput.files = e.dataTransfer.files;
            handleImageUpload({ target: uploadInput });
        }
    });

    // Functions
    function handleImageUpload(event) {
        const file = event.target.files[0];
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = function(e) {
                imagePreview.src = e.target.result;
                imagePreviewContainer.hidden = false;
                document.querySelector('.upload-content').hidden = true;
                generateButton.disabled = false;
            };
            reader.readAsDataURL(file);
        }
    }

    function removeImage() {
        uploadInput.value = '';
        imagePreviewContainer.hidden = true;
        document.querySelector('.upload-content').hidden = false;
        generateButton.disabled = true;
        
        // Hide results if they're showing
        resultsSection.hidden = true;
    }

    async function generatePalette() {
        // Show loading state
        resultsSection.hidden = false;
        loadingIndicator.hidden = false;
        paletteContainer.hidden = true;
        
        try {
            const file = uploadInput.files[0];
            if (!file) {
                throw new Error('No image selected');
            }
            
            const formData = new FormData();
            formData.append('image', file);
            
            const response = await fetch(API_ENDPOINT, {
                method: 'POST',
                body: formData
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Error generating palette');
            }
            
            const paletteData = await response.json();
            
            // Hide loading indicator
            loadingIndicator.hidden = true;
            paletteContainer.hidden = false;
            
            displayPalette(paletteData);
        } catch (error) {
            console.error('Error generating palette:', error);
            loadingIndicator.hidden = true;
            
            // Show error message
            const errorMessage = document.createElement('div');
            errorMessage.className = 'error-message';
            errorMessage.textContent = `Error: ${error.message}`;
            resultsSection.appendChild(errorMessage);
        }
    }

    function displayPalette(palette) {
        // Set palette name
        paletteName.textContent = palette.name;
        
        // Clear previous palette
        paletteColors.innerHTML = '';
        colorCodes.innerHTML = '';
        
        // Add color swatches
        palette.colors.forEach(color => {
            // Add color swatch
            const swatch = document.createElement('div');
            swatch.className = 'color-swatch';
            swatch.style.backgroundColor = color.hex;
            
            const colorCode = document.createElement('span');
            colorCode.className = 'color-code';
            colorCode.textContent = color.hex;
            swatch.appendChild(colorCode);
            
            paletteColors.appendChild(swatch);
            
            // Add color code item
            const codeItem = document.createElement('div');
            codeItem.className = 'color-code-item';
            
            const colorDot = document.createElement('span');
            colorDot.className = 'color-dot';
            colorDot.style.backgroundColor = color.hex;
            
            const codeText = document.createElement('span');
            codeText.textContent = color.hex;
            
            codeItem.appendChild(colorDot);
            codeItem.appendChild(codeText);
            colorCodes.appendChild(codeItem);
        });
    }
}); 