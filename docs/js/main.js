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
    const historySection = document.getElementById('history-section');
    const paletteHistory = document.getElementById('palette-history');
    const themeToggle = document.getElementById('theme-toggle');
    const toastContainer = document.getElementById('toast-container');
    const copyPaletteButton = document.getElementById('copy-palette');
    const savePaletteButton = document.getElementById('save-palette');
    const sharePaletteButton = document.getElementById('share-palette');
    const deleteConfirmationModal = document.getElementById('delete-confirmation-modal');
    const cancelDeleteButton = document.getElementById('cancel-delete');
    const confirmDeleteButton = document.getElementById('confirm-delete');
    const header = document.querySelector('header');
    
    // Color format elements
    const colorFormatSelect = document.getElementById('color-format');
    
    // Color picker elements
    const colorPickerModal = document.getElementById('color-picker-modal');
    const closeColorPickerButton = document.getElementById('close-color-picker');
    const cancelColorEditButton = document.getElementById('cancel-color-edit');
    const applyColorEditButton = document.getElementById('apply-color-edit');
    const hexInput = document.getElementById('hex-input');
    const rInput = document.getElementById('r-input');
    const gInput = document.getElementById('g-input');
    const bInput = document.getElementById('b-input');
    const samplerImage = document.getElementById('sampler-image');
    const samplerOverlay = document.querySelector('.image-sampler-overlay');
    
    // Color info modal elements
    const colorInfoModal = document.getElementById('color-info-modal');
    const closeColorInfoButton = document.getElementById('close-color-info');
    const closeColorInfoBtn = document.getElementById('close-color-info-btn');
    const editInColorPickerButton = document.getElementById('edit-in-color-picker');
    const addToLockedButton = document.getElementById('add-to-locked');
    const infoColorSwatch = document.getElementById('info-color-swatch');
    const infoColorLabel = document.getElementById('info-color-label');
    const infoHexValue = document.getElementById('info-hex-value');
    const infoRgbValue = document.getElementById('info-rgb-value');
    const infoHslValue = document.getElementById('info-hsl-value');
    const infoCmykValue = document.getElementById('info-cmyk-value');
    const copyValueButtons = document.querySelectorAll('.copy-value-btn');
    
    // API endpoint - Cloudflare Worker URL
    const API_ENDPOINT = 'https://img-palette-api.leemark.workers.dev/generate-palette';

    // Image resize settings
    const resizeSettings = {
        maxWidth: 1200,        // Maximum width in pixels
        maxHeight: 1200,       // Maximum height in pixels
        quality: 0.85,         // JPEG/WebP quality (0-1)
        format: 'auto',        // 'auto', 'jpeg', 'png', 'webp'
        sizeThreshold: 1024 * 1024  // Only resize images larger than 1MB
    };

    // State
    let currentPalette = null;
    let paletteHistoryData = [];
    let paletteToDelete = null;
    let colorPickerInstance = null;
    let currentEditingColor = {
        index: null,
        originalHex: null,
        element: null,
        codeElement: null,
        resetToOriginal: true
    };
    let lockedColors = [];
    let currentHarmonyType = null;
    let currentHarmonyBaseColor = null;
    let harmonyPalette = [];
    let currentColorFormat = 'hex'; // Track the selected color format
    let currentInfoColor = null; // Track the current color being displayed in the info modal

    // Initialize
    initTheme();
    initColorPicker();
    initColorFormat();
    initStickyHeader();
    loadPaletteHistory();
    displayPaletteHistory();

    // Event Listeners
    uploadButton.addEventListener('click', () => uploadInput.click());
    uploadInput.addEventListener('change', handleImageUpload);
    removeImageButton.addEventListener('click', removeImage);
    generateButton.addEventListener('click', generatePalette);
    themeToggle.addEventListener('click', toggleTheme);
    copyPaletteButton.addEventListener('click', copyPaletteToClipboard);
    savePaletteButton.addEventListener('click', savePalette);
    sharePaletteButton.addEventListener('click', sharePalette);
    cancelDeleteButton.addEventListener('click', hideDeleteConfirmation);
    confirmDeleteButton.addEventListener('click', confirmDeletePalette);
    
    // Color picker event listeners
    closeColorPickerButton.addEventListener('click', hideColorPicker);
    cancelColorEditButton.addEventListener('click', hideColorPicker);
    applyColorEditButton.addEventListener('click', applyColorEdit);
    
    // Input event listeners for color values
    hexInput.addEventListener('input', updateFromHexInput);
    rInput.addEventListener('input', updateFromRgbInput);
    gInput.addEventListener('input', updateFromRgbInput);
    bInput.addEventListener('input', updateFromRgbInput);
    
    // Image sampler event listener
    samplerOverlay.addEventListener('click', function(e) {
        // Get actual color from the image at click position
        const samplerRect = samplerImage.getBoundingClientRect();
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        
        // Set canvas size to match image
        canvas.width = samplerImage.naturalWidth;
        canvas.height = samplerImage.naturalHeight;
        
        // Draw image to canvas
        context.drawImage(samplerImage, 0, 0, canvas.width, canvas.height);
        
        // Calculate relative position of click on the image
        const scaleX = samplerImage.naturalWidth / samplerRect.width;
        const scaleY = samplerImage.naturalHeight / samplerRect.height;
        
        // Get click coordinates relative to image content
        const x = Math.max(0, Math.min(Math.floor((e.clientX - samplerRect.left) * scaleX), canvas.width - 1));
        const y = Math.max(0, Math.min(Math.floor((e.clientY - samplerRect.top) * scaleY), canvas.height - 1));
        
        // Get pixel data
        try {
            const pixelData = context.getImageData(x, y, 1, 1).data;
            const hexColor = rgbToHex(pixelData[0], pixelData[1], pixelData[2]);
            updateColorPicker(hexColor);
            
            // Show visual feedback of where user clicked
            const feedback = document.createElement('div');
            feedback.style.position = 'absolute';
            feedback.style.width = '10px';
            feedback.style.height = '10px';
            feedback.style.borderRadius = '50%';
            feedback.style.backgroundColor = 'white';
            feedback.style.border = '1px solid black';
            feedback.style.left = `${e.clientX - samplerRect.left - 5}px`;
            feedback.style.top = `${e.clientY - samplerRect.top - 5}px`;
            feedback.style.pointerEvents = 'none';
            
            // Add and then remove the feedback element
            samplerOverlay.parentNode.appendChild(feedback);
            setTimeout(() => feedback.remove(), 500);
            
        } catch (error) {
            console.error('Error picking color:', error);
            // Fallback to random color if there's an error
            const randomColor = '#' + Math.floor(Math.random()*16777215).toString(16);
            updateColorPicker(randomColor);
        }
    });
    
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

    // Color format selector event listener
    colorFormatSelect.addEventListener('change', () => {
        currentColorFormat = colorFormatSelect.value;
        updateColorCodesDisplay();
        
        // Store preference in localStorage
        localStorage.setItem('preferredColorFormat', currentColorFormat);
        
        showToast(`Changed color format to ${currentColorFormat.toUpperCase()}`, 'info');
    });
    
    // Color info modal event listeners
    closeColorInfoButton.addEventListener('click', hideColorInfoModal);
    closeColorInfoBtn.addEventListener('click', hideColorInfoModal);
    editInColorPickerButton.addEventListener('click', editColorFromInfoModal);
    addToLockedButton.addEventListener('click', lockColorFromInfoModal);
    
    // Copy value buttons in color info modal
    copyValueButtons.forEach(button => {
        button.addEventListener('click', () => {
            const format = button.getAttribute('data-value');
            copyColorValueToClipboard(format);
        });
    });

    // Functions
    function initTheme() {
        const savedTheme = localStorage.getItem('theme') || 'dark';
        document.documentElement.setAttribute('data-theme', savedTheme);
        updateThemeIcon(savedTheme);
    }

    function toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        
        updateThemeIcon(newTheme);
        showToast(`Switched to ${newTheme} mode`, 'info');
    }

    function updateThemeIcon(theme) {
        const icon = themeToggle.querySelector('i');
        if (theme === 'dark') {
            icon.className = 'fas fa-sun';
            themeToggle.setAttribute('aria-label', 'Toggle light mode');
        } else {
            icon.className = 'fas fa-moon';
            themeToggle.setAttribute('aria-label', 'Toggle dark mode');
        }
    }

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
        loadingIndicator.style.display = 'flex'; // Explicitly set display to flex to ensure it's visible
        paletteContainer.hidden = true;
        
        // Clear any previous error messages
        const existingError = resultsSection.querySelector('.error-message');
        if (existingError) {
            existingError.remove();
        }
        
        try {
            const file = uploadInput.files[0];
            if (!file) {
                throw new Error('No image selected');
            }
            
            // Resize the image before sending to the API
            const resizedImageFile = await resizeImageIfNeeded(file);
            
            const formData = new FormData();
            formData.append('image', resizedImageFile);
            
            // Add locked colors to the request if any
            if (lockedColors.length > 0) {
                const lockedColorsJson = JSON.stringify(lockedColors);
                formData.append('lockedColors', lockedColorsJson);
            }
            
            // Update generate button text based on locked colors
            const generateButtonText = lockedColors.length > 0 ? 
                `<i class="fas fa-paint-brush"></i> Regenerate with ${lockedColors.length} locked color${lockedColors.length > 1 ? 's' : ''}` : 
                `<i class="fas fa-paint-brush"></i> Generate Palette`;
            generateButton.innerHTML = generateButtonText;
            
            // Call the API
            fetch(API_ENDPOINT, {
                method: 'POST',
                body: formData
            })
            .then(response => {
                if (!response.ok) {
                    return response.json().then(data => {
                        throw new Error(data.error || 'Error generating palette');
                    });
                }
                return response.json();
            })
            .then(paletteData => {
                // If we have locked colors, preserve them in the response
                if (lockedColors.length > 0) {
                    // Merge locked colors with the new palette
                    lockedColors.forEach(lockedColor => {
                        if (paletteData.colors[lockedColor.index]) {
                            paletteData.colors[lockedColor.index] = { hex: lockedColor.hex };
                        }
                    });
                }
                
                currentPalette = paletteData;
                
                // Hide loading indicator and show palette
                loadingIndicator.style.display = 'none';
                loadingIndicator.hidden = true;
                paletteContainer.hidden = false;
                
                displayPalette(paletteData);
                showToast('Palette generated successfully!', 'success');
                
                // Scroll to the palette container for better UX
                paletteContainer.scrollIntoView({ behavior: 'smooth' });
            })
            .catch(error => {
                console.error('Error generating palette:', error);
                loadingIndicator.style.display = 'none';
                loadingIndicator.hidden = true;
                
                // Show error message
                const errorMessage = document.createElement('div');
                errorMessage.className = 'error-message';
                errorMessage.textContent = `Error: ${error.message}`;
                resultsSection.appendChild(errorMessage);
                
                showToast(`Failed to generate palette: ${error.message}`, 'error');
            });
        } catch (error) {
            console.error('Error generating palette:', error);
            loadingIndicator.style.display = 'none';
            loadingIndicator.hidden = true;
            
            // Show error message
            const errorMessage = document.createElement('div');
            errorMessage.className = 'error-message';
            errorMessage.textContent = `Error: ${error.message}`;
            resultsSection.appendChild(errorMessage);
            
            showToast(`Failed to generate palette: ${error.message}`, 'error');
        }
    }

    /**
     * Resizes an image if it exceeds the maximum dimensions
     * @param {File} imageFile - The original image file
     * @param {Object} options - Resize options
     * @param {number} options.maxWidth - Maximum width in pixels (default: 1200)
     * @param {number} options.maxHeight - Maximum height in pixels (default: 1200)
     * @param {number} options.quality - JPEG quality from 0 to 1 (default: 0.85)
     * @param {string} options.format - Output format ('jpeg', 'png', 'webp') (default: 'jpeg')
     * @param {number} options.sizeThreshold - Only resize images larger than this size in bytes
     * @returns {Promise<File>} - Resized image as a File object
     */
    async function resizeImageIfNeeded(imageFile, options = {}) {
        // Use settings from resizeSettings with any provided overrides
        const { 
            maxWidth = resizeSettings.maxWidth, 
            maxHeight = resizeSettings.maxHeight, 
            quality = resizeSettings.quality, 
            format = resizeSettings.format,
            sizeThreshold = resizeSettings.sizeThreshold
        } = options;
        
        // Skip resizing if image is smaller than the size threshold
        if (imageFile.size <= sizeThreshold) {
            console.log(`Image size (${(imageFile.size / 1024).toFixed(1)}KB) is under threshold, skipping resize`);
            return imageFile;
        }
        
        // Determine the best format
        let outputFormat = format.toLowerCase();
        if (outputFormat === 'auto') {
            // Check if the browser supports WebP
            const supportsWebP = (() => {
                const canvas = document.createElement('canvas');
                if (!canvas || !canvas.getContext) return false;
                return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
            })();
            
            // Use WebP when supported for better compression
            outputFormat = supportsWebP ? 'webp' : 'jpeg';
            console.log(`Auto-detected format: ${outputFormat} (WebP support: ${supportsWebP})`);
        }
        
        // Read the image file
        return new Promise((resolve, reject) => {
            // Create a FileReader to read the file
            const reader = new FileReader();
            
            reader.onload = function(event) {
                // Create an image element to get the original dimensions
                const img = new Image();
                
                img.onload = function() {
                    // If the image is already smaller than maxWidth and maxHeight, return the original
                    if (img.width <= maxWidth && img.height <= maxHeight) {
                        resolve(imageFile);
                        return;
                    }
                    
                    // Calculate new dimensions while maintaining aspect ratio
                    let newWidth = img.width;
                    let newHeight = img.height;
                    
                    if (newWidth > maxWidth) {
                        newHeight = Math.round(newHeight * (maxWidth / newWidth));
                        newWidth = maxWidth;
                    }
                    
                    if (newHeight > maxHeight) {
                        newWidth = Math.round(newWidth * (maxHeight / newHeight));
                        newHeight = maxHeight;
                    }
                    
                    // Create a canvas element to draw the resized image
                    const canvas = document.createElement('canvas');
                    canvas.width = newWidth;
                    canvas.height = newHeight;
                    
                    // Draw the resized image on the canvas
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, newWidth, newHeight);
                    
                    // Get the mime type and extension based on format
                    let mimeType, fileExtension;
                    switch (outputFormat) {
                        case 'png':
                            mimeType = 'image/png';
                            fileExtension = 'png';
                            break;
                        case 'webp':
                            mimeType = 'image/webp';
                            fileExtension = 'webp';
                            break;
                        case 'jpeg':
                        case 'jpg':
                        default:
                            mimeType = 'image/jpeg';
                            fileExtension = 'jpg';
                            break;
                    }
                    
                    // Convert canvas to blob
                    canvas.toBlob((blob) => {
                        if (!blob) {
                            reject(new Error('Failed to create blob from canvas'));
                            return;
                        }
                        
                        // Create a new File from the blob
                        const resizedFile = new File(
                            [blob], 
                            `resized-${Date.now()}.${fileExtension}`, 
                            { type: mimeType }
                        );
                        
                        // Log the size reduction
                        const originalSize = imageFile.size / 1024; // KB
                        const newSize = resizedFile.size / 1024; // KB
                        const reduction = ((originalSize - newSize) / originalSize * 100).toFixed(1);
                        
                        console.log(`Image resized from ${img.width}x${img.height} to ${newWidth}x${newHeight}`);
                        console.log(`Size reduced from ${originalSize.toFixed(1)}KB to ${newSize.toFixed(1)}KB (${reduction}% reduction)`);
                        
                        if (newSize < originalSize) {
                            // Show a toast notification with the size reduction
                            showToast(`Image optimized: ${reduction}% size reduction`, 'info');
                        } else {
                            // If the new size is larger (can happen with PNG), keep the original
                            console.log('Resized image is larger, using original');
                            resolve(imageFile);
                            return;
                        }
                        
                        resolve(resizedFile);
                    }, mimeType, quality);
                };
                
                img.onerror = function() {
                    reject(new Error('Failed to load image'));
                };
                
                // Set the image source to the FileReader result
                img.src = event.target.result;
            };
            
            reader.onerror = function() {
                reject(new Error('Failed to read image file'));
            };
            
            // Read the file as a data URL
            reader.readAsDataURL(imageFile);
        });
    }

    function displayPalette(palette) {
        // Set palette name
        paletteName.textContent = palette.name;
        
        // Set palette description if available
        const paletteDescription = document.getElementById('palette-description');
        if (palette.description) {
            paletteDescription.textContent = palette.description;
            paletteDescription.style.display = 'block';
        } else {
            paletteDescription.style.display = 'none';
        }
        
        // Clear previous palette
        paletteColors.innerHTML = '';
        colorCodes.innerHTML = '';
        
        // Add color swatches with circular control buttons and 
        // color code items with only info buttons (no edit buttons)
        palette.colors.forEach((color, index) => {
            // Add color swatch
            const swatch = document.createElement('div');
            swatch.className = 'color-swatch';
            swatch.style.backgroundColor = color.hex;
            swatch.setAttribute('data-color', color.hex);
            swatch.setAttribute('data-index', index);
            
            // Check if this color is locked
            const isLocked = lockedColors.some(lc => lc.index === index);
            if (isLocked) {
                swatch.classList.add('locked');
            }
            
            // Add click event for copying
            swatch.addEventListener('click', () => copyColorToClipboard(color.hex));
            
            // Add double-click event for editing
            swatch.addEventListener('dblclick', (e) => {
                e.stopPropagation();
                showColorPicker(index, color.hex, swatch);
            });
            
            const colorCode = document.createElement('span');
            colorCode.className = 'color-code';
            colorCode.textContent = color.hex;
            swatch.appendChild(colorCode);
            
            // Add lock button
            const lockButton = document.createElement('button');
            lockButton.className = isLocked ? 'color-lock-button locked' : 'color-lock-button';
            lockButton.innerHTML = isLocked ? '<i class="fas fa-lock"></i>' : '<i class="fas fa-unlock"></i>';
            lockButton.title = isLocked ? 'Unlock color' : 'Lock color';
            lockButton.setAttribute('aria-label', isLocked ? 'Unlock color' : 'Lock color');
            lockButton.addEventListener('click', (e) => {
                e.stopPropagation();
                toggleColorLock(index, color.hex, lockButton, swatch);
            });
            swatch.appendChild(lockButton);
            
            // Add edit button to swatch
            const editButton = document.createElement('button');
            editButton.className = 'color-edit-button';
            editButton.innerHTML = '<i class="fas fa-edit"></i>';
            editButton.title = 'Edit color';
            editButton.addEventListener('click', (e) => {
                e.stopPropagation();
                showColorPicker(index, color.hex, swatch);
            });
            swatch.appendChild(editButton);
            
            // Add info button to swatch
            const infoButton = document.createElement('button');
            infoButton.className = 'color-info-button';
            infoButton.innerHTML = '<i class="fas fa-info-circle"></i>';
            infoButton.title = 'Color information';
            infoButton.addEventListener('click', (e) => {
                e.stopPropagation();
                showColorInfoModal(index, color.hex);
            });
            swatch.appendChild(infoButton);
            
            // Add harmony button (after lock button creation)
            const harmonyButton = document.createElement('button');
            harmonyButton.className = 'harmony-button';
            harmonyButton.innerHTML = '<i class="fas fa-magic"></i>';
            harmonyButton.title = 'Generate color harmonies from this color';
            harmonyButton.addEventListener('click', () => {
                showHarmonyModal(color.hex, index);
            });
            swatch.appendChild(harmonyButton);
            
            paletteColors.appendChild(swatch);
            
            // Add color code item
            const codeItem = document.createElement('div');
            codeItem.className = 'color-code-item';
            codeItem.setAttribute('data-color', color.hex);
            codeItem.setAttribute('data-index', index);
            codeItem.addEventListener('click', () => copyColorToClipboard(color.hex));
            
            const colorDot = document.createElement('span');
            colorDot.className = 'color-dot';
            colorDot.style.backgroundColor = color.hex;
            
            const codeText = document.createElement('span');
            codeText.textContent = formatColorValue(color.hex, currentColorFormat);
            
            // Add locked indicator to code item if needed
            if (isLocked) {
                const lockedBadge = document.createElement('span');
                lockedBadge.className = 'color-locked-badge';
                lockedBadge.innerHTML = '<i class="fas fa-lock"></i>';
                codeItem.appendChild(lockedBadge);
            }
            
            // Add info button to code item
            const infoButtonCode = document.createElement('button');
            infoButtonCode.className = 'color-info-button-small';
            infoButtonCode.innerHTML = '<i class="fas fa-info-circle"></i>';
            infoButtonCode.title = 'Color information';
            infoButtonCode.addEventListener('click', (e) => {
                e.stopPropagation();
                showColorInfoModal(index, color.hex);
            });
            
            codeItem.appendChild(colorDot);
            codeItem.appendChild(codeText);
            codeItem.appendChild(infoButtonCode);
            colorCodes.appendChild(codeItem);
        });
        
        // Add regenerate info if colors are locked
        if (lockedColors.length > 0) {
            const regenerateInfo = document.createElement('div');
            regenerateInfo.className = 'regenerate-info';
            regenerateInfo.innerHTML = `
                <i class="fas fa-info-circle"></i>
                <span>You have ${lockedColors.length} locked color${lockedColors.length > 1 ? 's' : ''}. Click "Regenerate" to create a new palette while keeping these colors.</span>
            `;
            colorCodes.appendChild(regenerateInfo);
        }
        
        // Add CSS for buttons
        if (!document.getElementById('swatch-button-styles')) {
            const styleElement = document.createElement('style');
            styleElement.id = 'swatch-button-styles';
            styleElement.textContent = `
                .color-swatch {
                    position: relative;
                }
                .color-edit-button,
                .color-info-button,
                .harmony-button,
                .color-lock-button {
                    position: absolute;
                    background-color: rgba(0, 0, 0, 0.6);
                    color: white;
                    border-radius: 50%;
                    width: 36px;
                    height: 36px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border: none;
                    cursor: pointer;
                    opacity: 0;
                    transition: all 0.3s ease;
                    font-size: 14px;
                    padding: 0;
                    margin: 0;
                    line-height: 1;
                }
                .color-edit-button {
                    top: 14px;
                    right: 14px;
                }
                .color-info-button {
                    top: 14px;
                    right: 58px;
                }
                .harmony-button {
                    top: 14px;
                    right: 102px;
                }
                .color-lock-button {
                    top: 14px;
                    left: 14px;
                }
                .color-swatch:hover .color-edit-button,
                .color-swatch:hover .color-info-button,
                .color-swatch:hover .harmony-button,
                .color-swatch:hover .color-lock-button {
                    opacity: 0.8;
                }
                .color-edit-button:hover,
                .color-info-button:hover,
                .harmony-button:hover,
                .color-lock-button:hover {
                    opacity: 1 !important;
                    transform: scale(1.1);
                }
                .color-info-button-small {
                    background: none;
                    border: none;
                    color: var(--text-secondary);
                    cursor: pointer;
                    opacity: 0.7;
                    transition: all 0.2s ease;
                    padding: 6px;
                    margin-left: 8px;
                    font-size: 16px;
                }
                .color-info-button-small:hover {
                    opacity: 1;
                    color: var(--primary-color);
                    transform: scale(1.2);
                }
            `;
            document.head.appendChild(styleElement);
        }
    }

    function copyColorToClipboard(color) {
        navigator.clipboard.writeText(color)
            .then(() => {
                showToast(`Copied ${color} to clipboard`, 'success');
            })
            .catch(err => {
                console.error('Failed to copy color: ', err);
                showToast('Failed to copy color', 'error');
            });
    }

    function copyPaletteToClipboard() {
        if (!currentPalette) return;
        
        const colorValues = currentPalette.colors.map(color => color.hex).join(', ');
        navigator.clipboard.writeText(colorValues)
            .then(() => {
                showToast('All colors copied to clipboard', 'success');
            })
            .catch(err => {
                console.error('Failed to copy palette: ', err);
                showToast('Failed to copy palette', 'error');
            });
    }

    function savePalette() {
        if (!currentPalette) return;
        
        // Add timestamp to palette
        const paletteToSave = {
            ...currentPalette,
            timestamp: new Date().toISOString()
        };
        
        // Add to history
        paletteHistoryData.unshift(paletteToSave);
        
        // Keep only the latest 9 palettes
        if (paletteHistoryData.length > 9) {
            paletteHistoryData = paletteHistoryData.slice(0, 9);
        }
        
        // Save to localStorage
        localStorage.setItem('paletteHistory', JSON.stringify(paletteHistoryData));
        
        // Update history display
        displayPaletteHistory();
        
        showToast('Palette saved to history', 'success');
    }

    function sharePalette() {
        if (!currentPalette) return;
        
        // In a real app, we'd generate a shareable link or show social sharing options
        // For now, we'll just show a toast
        showToast('Sharing functionality coming soon!', 'info');
        
        // Alternative: Copy a text representation of the palette
        const shareText = `Check out this color palette '${currentPalette.name}': ${currentPalette.colors.map(c => c.hex).join(', ')}`;
        navigator.clipboard.writeText(shareText)
            .then(() => {
                showToast('Palette description copied to clipboard for sharing', 'success');
            });
    }

    function loadPaletteHistory() {
        const savedHistory = localStorage.getItem('paletteHistory');
        if (savedHistory) {
            try {
                paletteHistoryData = JSON.parse(savedHistory);
                displayPaletteHistory();
            } catch (e) {
                console.error('Error loading palette history:', e);
            }
        }
    }

    function displayPaletteHistory() {
        if (paletteHistoryData.length === 0) {
            historySection.hidden = true;
            return;
        }
        
        // Show history section
        historySection.hidden = false;
        
        // Clear current history
        paletteHistory.innerHTML = '';
        
        // Add history items
        paletteHistoryData.forEach((palette, index) => {
            const historyItem = document.createElement('div');
            historyItem.className = 'history-item';
            historyItem.setAttribute('data-index', index);
            
            // History colors display
            const historyColors = document.createElement('div');
            historyColors.className = 'history-colors';
            
            palette.colors.forEach(color => {
                const colorBlock = document.createElement('div');
                colorBlock.className = 'history-color';
                colorBlock.style.backgroundColor = color.hex;
                historyColors.appendChild(colorBlock);
            });
            
            // History info
            const historyInfo = document.createElement('div');
            historyInfo.className = 'history-info';
            
            const historyTitle = document.createElement('h3');
            historyTitle.className = 'history-title';
            historyTitle.textContent = palette.name;
            
            const historyDate = document.createElement('p');
            historyDate.className = 'history-date';
            historyDate.textContent = formatDate(palette.timestamp);
            
            historyInfo.appendChild(historyTitle);
            historyInfo.appendChild(historyDate);
            
            // Delete button
            const deleteButton = document.createElement('button');
            deleteButton.className = 'delete-palette-btn';
            deleteButton.innerHTML = '<i class="fas fa-trash-alt"></i>';
            deleteButton.setAttribute('aria-label', 'Delete palette');
            deleteButton.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent triggering the parent click event
                showDeleteConfirmation(index);
            });
            
            // Add click event to the history item (not including the delete button)
            historyItem.addEventListener('click', () => {
                currentPalette = palette;
                displayPalette(palette);
                
                // Hide loading indicator and show palette container
                loadingIndicator.hidden = true;
                paletteContainer.hidden = false;
                resultsSection.hidden = false;
                
                // Scroll to palette container
                paletteContainer.scrollIntoView({ behavior: 'smooth' });
            });
            
            historyItem.appendChild(historyColors);
            historyItem.appendChild(historyInfo);
            historyItem.appendChild(deleteButton);
            
            paletteHistory.appendChild(historyItem);
        });
    }

    function formatDate(isoString) {
        try {
            const date = new Date(isoString);
            return date.toLocaleDateString(undefined, { 
                year: 'numeric', 
                month: 'short', 
                day: 'numeric' 
            });
        } catch (e) {
            return 'Unknown date';
        }
    }

    function showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        
        const iconMap = {
            success: 'check-circle',
            error: 'exclamation-circle',
            info: 'info-circle'
        };
        
        toast.innerHTML = `
            <i class="fas fa-${iconMap[type]} toast-icon"></i>
            <span class="toast-message">${message}</span>
            <button class="toast-close">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        // Add to container
        toastContainer.appendChild(toast);
        
        // Make visible
        setTimeout(() => {
            toast.classList.add('show');
        }, 10);
        
        // Add close button functionality
        const closeButton = toast.querySelector('.toast-close');
        closeButton.addEventListener('click', () => {
            toast.classList.remove('show');
            setTimeout(() => {
                toast.remove();
            }, 300);
        });
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (toast.parentElement) {
                toast.classList.remove('show');
                setTimeout(() => {
                    if (toast.parentElement) {
                        toast.remove();
                    }
                }, 300);
            }
        }, 5000);
    }

    function showDeleteConfirmation(index) {
        paletteToDelete = index;
        deleteConfirmationModal.hidden = false;
        setTimeout(() => {
            deleteConfirmationModal.classList.add('show');
        }, 10);
    }

    function hideDeleteConfirmation() {
        deleteConfirmationModal.classList.remove('show');
        setTimeout(() => {
            deleteConfirmationModal.hidden = true;
            paletteToDelete = null;
        }, 300);
    }

    function confirmDeletePalette() {
        if (paletteToDelete === null) return;
        
        // Find the element to animate
        const historyItem = document.querySelector(`.history-item[data-index="${paletteToDelete}"]`);
        if (historyItem) {
            // Animate removal
            historyItem.style.transition = 'all 0.3s ease';
            historyItem.style.transform = 'translateY(20px)';
            historyItem.style.opacity = '0';
            
            setTimeout(() => {
                // Remove from data array
                paletteHistoryData.splice(paletteToDelete, 1);
                
                // Save to localStorage
                localStorage.setItem('paletteHistory', JSON.stringify(paletteHistoryData));
                
                // Update display
                displayPaletteHistory();
                
                showToast('Palette deleted successfully', 'success');
                
                // Hide modal
                hideDeleteConfirmation();
            }, 300);
        } else {
            // Fallback if element not found
            paletteHistoryData.splice(paletteToDelete, 1);
            localStorage.setItem('paletteHistory', JSON.stringify(paletteHistoryData));
            displayPaletteHistory();
            showToast('Palette deleted successfully', 'success');
            hideDeleteConfirmation();
        }
    }

    function initColorPicker() {
        // Initialize colorPickerInstance only once when needed
        if (!colorPickerInstance) {
            colorPickerInstance = new iro.ColorPicker('#color-picker', {
                width: 250,
                color: "#ffffff",
                layout: [
                    { 
                        component: iro.ui.Wheel,
                        options: {}
                    },
                    { 
                        component: iro.ui.Slider,
                        options: {
                            sliderType: 'value'
                        }
                    }
                ]
            });
            
            // Add colorPickerInstance change event
            colorPickerInstance.on('color:change', updateColorInputs);
        }
    }

    function showColorPicker(index, hexColor, swatchElement, codeElement = null) {
        // If image is available, copy it to sampler
        if (uploadInput.files.length > 0 && imagePreview.src) {
            samplerImage.src = imagePreview.src;
        } else {
            // Fallback
            samplerImage.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"%3E%3Crect width="200" height="200" fill="%23CCCCCC"/%3E%3Ctext x="50%25" y="50%25" font-size="14" text-anchor="middle" fill="%23666666"%3ENo image available%3C/text%3E%3C/svg%3E';
        }
        
        // Store current editing state
        currentEditingColor = {
            index: index,
            originalHex: hexColor,
            element: swatchElement,
            codeElement: codeElement,
            resetToOriginal: true
        };
        
        // Update color picker
        updateColorPicker(hexColor);
        
        // Show modal
        colorPickerModal.hidden = false;
        setTimeout(() => {
            colorPickerModal.classList.add('show');
        }, 10);
    }

    function hideColorPicker() {
        // Hide modal
        colorPickerModal.classList.remove('show');
        setTimeout(() => {
            colorPickerModal.hidden = true;
            
            // Only reset color to original if canceled - not when applied
            if (currentEditingColor.resetToOriginal && currentEditingColor.element) {
                currentEditingColor.element.style.backgroundColor = currentEditingColor.originalHex;
                
                // Also update code element if exists
                if (currentEditingColor.codeElement) {
                    const colorDot = currentEditingColor.codeElement.querySelector('.color-dot');
                    if (colorDot) {
                        colorDot.style.backgroundColor = currentEditingColor.originalHex;
                    }
                }
            }
            
            // Reset state
            currentEditingColor = {
                index: null,
                originalHex: null,
                element: null,
                codeElement: null,
                resetToOriginal: true
            };
        }, 300);
    }

    function updateColorPicker(hexColor) {
        // Ensure the color is a valid hex format
        if (!hexColor.startsWith('#')) {
            hexColor = '#' + hexColor;
        }
        
        // Normalize to 6 character hex (in case of shorthand like #f00)
        if (hexColor.length === 4) {
            const r = hexColor[1];
            const g = hexColor[2];
            const b = hexColor[3];
            hexColor = `#${r}${r}${g}${g}${b}${b}`;
        }
        
        console.log('Updating color picker to:', hexColor); // Debug logging
        
        // Update the color picker component
        if (colorPickerInstance) {
            colorPickerInstance.color.hexString = hexColor;
            
            // Make sure the inputs are updated even if the event doesn't fire
            updateColorInputs(colorPickerInstance.color);
        }
    }

    function updateColorInputs(color) {
        // Extract the hexString from the color object
        const hexColor = color.hexString;
        console.log('Updating color inputs with:', hexColor); // Debug logging
        
        // Update text inputs
        hexInput.value = hexColor.substring(1); // Remove # prefix
        rInput.value = Math.round(color.rgb.r);
        gInput.value = Math.round(color.rgb.g);
        bInput.value = Math.round(color.rgb.b);
        
        // Update visual preview in the swatch element
        if (currentEditingColor.element) {
            // Update the actual background color
            currentEditingColor.element.style.backgroundColor = hexColor;
            
            // Also update the color code text inside the swatch
            const colorCode = currentEditingColor.element.querySelector('.color-code');
            if (colorCode) {
                colorCode.textContent = hexColor;
            }
            
            // Also update code element if exists
            if (currentEditingColor.codeElement) {
                // Update the color dot
                const colorDot = currentEditingColor.codeElement.querySelector('.color-dot');
                if (colorDot) {
                    colorDot.style.backgroundColor = hexColor;
                }
                
                // Update the text content
                const codeText = currentEditingColor.codeElement.querySelector('span:not(.color-dot):not(.color-locked-badge)');
                if (codeText) {
                    codeText.textContent = hexColor;
                }
            }
        }
    }

    function updateFromHexInput() {
        if (hexInput.value.length === 6) {
            try {
                const hexColor = '#' + hexInput.value;
                updateColorPicker(hexColor);
            } catch (e) {
                console.error('Invalid hex color', e);
            }
        }
    }

    function updateFromRgbInput() {
        if (rInput.value !== '' && gInput.value !== '' && bInput.value !== '') {
            try {
                const r = Math.min(255, Math.max(0, parseInt(rInput.value)));
                const g = Math.min(255, Math.max(0, parseInt(gInput.value)));
                const b = Math.min(255, Math.max(0, parseInt(bInput.value)));
                const hexColor = rgbToHex(r, g, b);
                updateColorPicker(hexColor);
            } catch (e) {
                console.error('Invalid RGB values', e);
            }
        }
    }

    function rgbToHex(r, g, b) {
        return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
    }

    function applyColorEdit() {
        if (currentEditingColor.index === null) return;
        
        // Get the current color from colorPickerInstance (this ensures we get the most up-to-date value)
        const newColor = colorPickerInstance.color.hexString;
        console.log('Applying new color:', newColor); // Debug logging
        
        // Set flag to prevent resetting to original color when hiding
        currentEditingColor.resetToOriginal = false;
        
        // Update palette data
        if (currentPalette && currentPalette.colors[currentEditingColor.index]) {
            // Update the color in the palette data
            currentPalette.colors[currentEditingColor.index].hex = newColor;
            
            // Update UI elements
            const swatch = currentEditingColor.element;
            if (swatch) {
                // Update the background color
                swatch.style.backgroundColor = newColor;
                swatch.setAttribute('data-color', newColor);
                
                // Update color code text
                const colorCode = swatch.querySelector('.color-code');
                if (colorCode) {
                    colorCode.textContent = newColor;
                }
            }
            
            // Update code item in the color codes section
            const codeElement = document.querySelector(`.color-code-item[data-index="${currentEditingColor.index}"]`);
            if (codeElement) {
                codeElement.setAttribute('data-color', newColor);
                
                // Update the color dot
                const colorDot = codeElement.querySelector('.color-dot');
                if (colorDot) {
                    colorDot.style.backgroundColor = newColor;
                }
                
                // Update the text content
                const codeText = codeElement.querySelector('span:not(.color-dot):not(.color-locked-badge)');
                if (codeText) {
                    codeText.textContent = newColor;
                }
            }
            
            // Update locked colors if this color is locked
            const lockedColorIndex = lockedColors.findIndex(lc => lc.index === currentEditingColor.index);
            if (lockedColorIndex !== -1) {
                lockedColors[lockedColorIndex].hex = newColor;
            }
            
            showToast('Color updated successfully', 'success');
        }
        
        // Hide modal
        hideColorPicker();
    }

    function toggleColorLock(index, hexColor, lockButton, swatch) {
        const lockedColorIndex = lockedColors.findIndex(lc => lc.index === index);
        
        if (lockedColorIndex === -1) {
            // Lock the color
            lockedColors.push({ index, hex: hexColor });
            lockButton.innerHTML = '<i class="fas fa-lock"></i>';
            lockButton.title = 'Unlock color';
            lockButton.setAttribute('aria-label', 'Unlock color');
            lockButton.classList.add('locked');
            swatch.classList.add('locked');
            
            // Add locked badge to the color code item
            const codeItem = document.querySelector(`.color-code-item[data-index="${index}"]`);
            if (codeItem && !codeItem.querySelector('.color-locked-badge')) {
                const lockedBadge = document.createElement('span');
                lockedBadge.className = 'color-locked-badge';
                lockedBadge.innerHTML = '<i class="fas fa-lock"></i>';
                codeItem.insertBefore(lockedBadge, codeItem.firstChild.nextSibling);
            }
            
            showToast(`Color ${hexColor} locked for next generation`, 'success');
        } else {
            // Unlock the color
            lockedColors.splice(lockedColorIndex, 1);
            lockButton.innerHTML = '<i class="fas fa-unlock"></i>';
            lockButton.title = 'Lock color';
            lockButton.setAttribute('aria-label', 'Lock color');
            lockButton.classList.remove('locked');
            swatch.classList.remove('locked');
            
            // Remove locked badge from the color code item
            const codeItem = document.querySelector(`.color-code-item[data-index="${index}"]`);
            if (codeItem) {
                const badge = codeItem.querySelector('.color-locked-badge');
                if (badge) {
                    badge.remove();
                }
            }
            
            showToast(`Color ${hexColor} unlocked`, 'info');
        }
        
        // Update regenerate info
        const existingRegenerateInfo = document.querySelector('.regenerate-info');
        if (existingRegenerateInfo) {
            existingRegenerateInfo.remove();
        }
        
        if (lockedColors.length > 0) {
            const regenerateInfo = document.createElement('div');
            regenerateInfo.className = 'regenerate-info';
            regenerateInfo.innerHTML = `
                <i class="fas fa-info-circle"></i>
                <span>You have ${lockedColors.length} locked color${lockedColors.length > 1 ? 's' : ''}. Click "Regenerate" to create a new palette while keeping these colors.</span>
            `;
            colorCodes.appendChild(regenerateInfo);
        }
        
        // Update generate button text
        const generateButtonText = lockedColors.length > 0 ? 
            `<i class="fas fa-paint-brush"></i> Regenerate with ${lockedColors.length} locked color${lockedColors.length > 1 ? 's' : ''}` : 
            `<i class="fas fa-paint-brush"></i> Generate Palette`;
        generateButton.innerHTML = generateButtonText;
    }

    // Color Harmony Functions
    function showHarmonyModal(baseColor, colorIndex) {
        currentHarmonyBaseColor = baseColor;
        
        // Clear any previous selection
        document.querySelectorAll('.harmony-type').forEach(el => {
            el.classList.remove('selected');
        });
        
        // Initialize harmony previews
        initHarmonyPreviews(baseColor);
        
        // Show the modal
        const harmonyModal = document.getElementById('harmony-modal');
        harmonyModal.hidden = false;
        setTimeout(() => {
            harmonyModal.classList.add('show');
        }, 10);
        
        // Add event listeners for harmony types
        document.querySelectorAll('.harmony-type').forEach(harmonyType => {
            harmonyType.addEventListener('click', () => {
                // Remove selected class from all types
                document.querySelectorAll('.harmony-type').forEach(el => {
                    el.classList.remove('selected');
                });
                
                // Add selected class to clicked type
                harmonyType.classList.add('selected');
                
                // Get the harmony type
                currentHarmonyType = harmonyType.getAttribute('data-type');
                
                // Generate the harmony palette
                harmonyPalette = generateHarmonyPalette(baseColor, currentHarmonyType);
                
                // Update the preview
                updateHarmonyPreview(harmonyPalette);
            });
        });
        
        // Initialize with complementary harmony
        document.querySelector('.harmony-type[data-type="complementary"]').click();
        
        // Add event listeners for modal buttons
        document.getElementById('close-harmony').addEventListener('click', hideHarmonyModal);
        document.getElementById('cancel-harmony').addEventListener('click', hideHarmonyModal);
        document.getElementById('apply-harmony').addEventListener('click', applyHarmony);
    }

    function hideHarmonyModal() {
        const harmonyModal = document.getElementById('harmony-modal');
        harmonyModal.classList.remove('show');
        setTimeout(() => {
            harmonyModal.hidden = true;
        }, 300);
    }

    function initHarmonyPreviews(baseColor) {
        // Convert hex to HSL for easier harmony calculations
        const hsl = hexToHSL(baseColor);
        
        // Complementary preview
        const complementaryColors = [
            baseColor,
            hslToHex((hsl.h + 180) % 360, hsl.s, hsl.l)
        ];
        updateHarmonyTypePreview('complementary', complementaryColors);
        
        // Analogous preview
        const analogousColors = [
            hslToHex((hsl.h - 30 + 360) % 360, hsl.s, hsl.l),
            baseColor,
            hslToHex((hsl.h + 30) % 360, hsl.s, hsl.l)
        ];
        updateHarmonyTypePreview('analogous', analogousColors);
        
        // Triadic preview
        const triadicColors = [
            baseColor,
            hslToHex((hsl.h + 120) % 360, hsl.s, hsl.l),
            hslToHex((hsl.h + 240) % 360, hsl.s, hsl.l)
        ];
        updateHarmonyTypePreview('triadic', triadicColors);
        
        // Tetradic preview
        const tetradicColors = [
            baseColor,
            hslToHex((hsl.h + 90) % 360, hsl.s, hsl.l),
            hslToHex((hsl.h + 180) % 360, hsl.s, hsl.l),
            hslToHex((hsl.h + 270) % 360, hsl.s, hsl.l)
        ];
        updateHarmonyTypePreview('tetradic', tetradicColors);
        
        // Monochromatic preview
        const monochromaticColors = [
            baseColor,
            hslToHex(hsl.h, hsl.s, Math.max(hsl.l - 30, 0)),
            hslToHex(hsl.h, hsl.s, Math.min(hsl.l + 30, 100)),
            hslToHex(hsl.h, Math.max(hsl.s - 30, 0), hsl.l)
        ];
        updateHarmonyTypePreview('monochromatic', monochromaticColors);
    }
    
    function updateHarmonyTypePreview(type, colors) {
        const preview = document.querySelector(`.${type}-preview`);
        const colorElements = preview.querySelectorAll('.harmony-color');
        
        for (let i = 0; i < colorElements.length; i++) {
            if (i < colors.length) {
                colorElements[i].style.backgroundColor = colors[i];
            }
        }
    }
    
    function generateHarmonyPalette(baseColor, type) {
        const hsl = hexToHSL(baseColor);
        let palette = [];
        
        switch(type) {
            case 'complementary':
                palette = [
                    baseColor,
                    hslToHex((hsl.h + 180) % 360, hsl.s, hsl.l),
                    hslToHex(hsl.h, Math.max(hsl.s - 25, 0), Math.min(hsl.l + 15, 100)),
                    hslToHex((hsl.h + 180) % 360, Math.max(hsl.s - 25, 0), Math.min(hsl.l + 15, 100)),
                    hslToHex(hsl.h, Math.min(hsl.s + 5, 100), Math.max(hsl.l - 30, 0))
                ];
                break;
                
            case 'analogous':
                palette = [
                    hslToHex((hsl.h - 40 + 360) % 360, hsl.s, hsl.l),
                    hslToHex((hsl.h - 20 + 360) % 360, hsl.s, hsl.l),
                    baseColor,
                    hslToHex((hsl.h + 20) % 360, hsl.s, hsl.l),
                    hslToHex((hsl.h + 40) % 360, hsl.s, hsl.l)
                ];
                break;
                
            case 'triadic':
                palette = [
                    baseColor,
                    hslToHex((hsl.h + 120) % 360, hsl.s, hsl.l),
                    hslToHex((hsl.h + 240) % 360, hsl.s, hsl.l),
                    hslToHex(hsl.h, Math.max(hsl.s - 30, 0), Math.min(hsl.l + 15, 100)),
                    hslToHex((hsl.h + 120) % 360, Math.max(hsl.s - 30, 0), Math.min(hsl.l + 15, 100))
                ];
                break;
                
            case 'tetradic':
                palette = [
                    baseColor,
                    hslToHex((hsl.h + 90) % 360, hsl.s, hsl.l),
                    hslToHex((hsl.h + 180) % 360, hsl.s, hsl.l),
                    hslToHex((hsl.h + 270) % 360, hsl.s, hsl.l),
                    hslToHex(hsl.h, Math.max(hsl.s - 30, 0), Math.min(hsl.l + 15, 100))
                ];
                break;
                
            case 'monochromatic':
                palette = [
                    baseColor,
                    hslToHex(hsl.h, hsl.s, Math.max(hsl.l - 40, 0)),
                    hslToHex(hsl.h, hsl.s, Math.max(hsl.l - 20, 0)),
                    hslToHex(hsl.h, hsl.s, Math.min(hsl.l + 20, 100)),
                    hslToHex(hsl.h, hsl.s, Math.min(hsl.l + 40, 100))
                ];
                break;
        }
        
        return palette;
    }
    
    function updateHarmonyPreview(palette) {
        const previewElement = document.getElementById('harmony-result-preview');
        previewElement.innerHTML = '';
        
        palette.forEach(color => {
            const colorDiv = document.createElement('div');
            colorDiv.style.flex = 1;
            colorDiv.style.backgroundColor = color;
            previewElement.appendChild(colorDiv);
        });
    }
    
    function applyHarmony() {
        if (!harmonyPalette.length) return;
        
        // Replace the current palette with the harmony palette
        currentPalette = {
            ...currentPalette,
            colors: harmonyPalette.map(color => ({ hex: color }))
        };
        
        // Update the displayed palette
        displayPalette(currentPalette);
        
        // Hide the modal
        hideHarmonyModal();
        
        // Show success toast
        showToast(`Applied ${currentHarmonyType} harmony to palette`, 'success');
    }
    
    function hexToHSL(hex) {
        // Remove # if present
        hex = hex.replace(/^#/, '');
        
        // Parse the hex values
        let r = parseInt(hex.substring(0, 2), 16) / 255;
        let g = parseInt(hex.substring(2, 4), 16) / 255;
        let b = parseInt(hex.substring(4, 6), 16) / 255;
        
        // Find min and max
        let max = Math.max(r, g, b);
        let min = Math.min(r, g, b);
        
        // Calculate lightness
        let l = (max + min) / 2;
        
        let h, s;
        
        if (max === min) {
            // Achromatic
            h = 0;
            s = 0;
        } else {
            // Calculate saturation
            s = l > 0.5 ? (max - min) / (2 - max - min) : (max - min) / (max + min);
            
            // Calculate hue
            switch (max) {
                case r:
                    h = (g - b) / (max - min) + (g < b ? 6 : 0);
                    break;
                case g:
                    h = (b - r) / (max - min) + 2;
                    break;
                case b:
                    h = (r - g) / (max - min) + 4;
                    break;
            }
            h /= 6;
        }
        
        // Convert to degrees, percentage
        h = Math.round(h * 360);
        s = Math.round(s * 100);
        l = Math.round(l * 100);
        
        return { h, s, l };
    }
    
    function hslToHex(h, s, l) {
        // Convert to fractions
        h /= 360;
        s /= 100;
        l /= 100;
        
        let r, g, b;
        
        if (s === 0) {
            // Achromatic
            r = g = b = l;
        } else {
            const hue2rgb = (p, q, t) => {
                if (t < 0) t += 1;
                if (t > 1) t -= 1;
                if (t < 1/6) return p + (q - p) * 6 * t;
                if (t < 1/2) return q;
                if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
                return p;
            };
            
            const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
            const p = 2 * l - q;
            
            r = hue2rgb(p, q, h + 1/3);
            g = hue2rgb(p, q, h);
            b = hue2rgb(p, q, h - 1/3);
        }
        
        // Convert to hex
        const toHex = x => {
            const hex = Math.round(x * 255).toString(16);
            return hex.length === 1 ? '0' + hex : hex;
        };
        
        return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
    }

    // Color Format Functions
    function initColorFormat() {
        // Load saved preference if available
        const savedFormat = localStorage.getItem('preferredColorFormat');
        if (savedFormat) {
            currentColorFormat = savedFormat;
            colorFormatSelect.value = savedFormat;
        }
    }
    
    function updateColorCodesDisplay() {
        if (!currentPalette) return;
        
        const colorItems = colorCodes.querySelectorAll('.color-code-item');
        
        colorItems.forEach((item, index) => {
            const colorHex = item.getAttribute('data-color');
            const codeText = item.querySelector('span:not(.color-dot):not(.color-locked-badge)');
            
            if (codeText) {
                codeText.textContent = formatColorValue(colorHex, currentColorFormat);
            }
        });
    }
    
    function formatColorValue(hexColor, format) {
        // Ensure hexColor is valid
        if (!hexColor || typeof hexColor !== 'string') {
            return 'Invalid color';
        }
        
        // Normalize hex color to ensure it has the # prefix
        if (!hexColor.startsWith('#')) {
            hexColor = '#' + hexColor;
        }
        
        // Format based on specified format
        switch (format) {
            case 'hex':
                return hexColor;
                
            case 'rgb':
                const rgb = hexToRgb(hexColor);
                return `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
                
            case 'hsl':
                const hsl = hexToHSL(hexColor);
                return `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`;
                
            case 'cmyk':
                const cmyk = hexToCMYK(hexColor);
                return `cmyk(${cmyk.c}%, ${cmyk.m}%, ${cmyk.y}%, ${cmyk.k}%)`;
                
            default:
                return hexColor;
        }
    }
    
    function hexToRgb(hex) {
        // Remove # if present
        hex = hex.replace(/^#/, '');
        
        // Parse hex values
        let r, g, b;
        
        if (hex.length === 3) {
            // Short notation (e.g. #F00)
            r = parseInt(hex.charAt(0) + hex.charAt(0), 16);
            g = parseInt(hex.charAt(1) + hex.charAt(1), 16);
            b = parseInt(hex.charAt(2) + hex.charAt(2), 16);
        } else {
            // Standard notation (e.g. #FF0000)
            r = parseInt(hex.substring(0, 2), 16);
            g = parseInt(hex.substring(2, 4), 16);
            b = parseInt(hex.substring(4, 6), 16);
        }
        
        return { r, g, b };
    }
    
    function hexToCMYK(hex) {
        // Convert hex to RGB first
        const rgb = hexToRgb(hex);
        
        // Convert RGB to CMYK
        let c, m, y, k;
        
        // Normalize RGB values to range 0-1
        const r = rgb.r / 255;
        const g = rgb.g / 255;
        const b = rgb.b / 255;
        
        k = 1 - Math.max(r, g, b);
        
        if (k === 1) {
            // Pure black
            c = m = y = 0;
        } else {
            c = (1 - r - k) / (1 - k);
            m = (1 - g - k) / (1 - k);
            y = (1 - b - k) / (1 - k);
        }
        
        // Convert to percentages
        c = Math.round(c * 100);
        m = Math.round(m * 100);
        y = Math.round(y * 100);
        k = Math.round(k * 100);
        
        return { c, m, y, k };
    }
    
    // Color info modal functions
    function showColorInfoModal(index, hexColor) {
        if (!hexColor) return;
        
        currentInfoColor = {
            index: index,
            hex: hexColor
        };
        
        // Update the swatch and label
        infoColorSwatch.style.backgroundColor = hexColor;
        infoColorLabel.textContent = hexColor;
        
        // Update color values
        infoHexValue.textContent = hexColor;
        
        const rgb = hexToRgb(hexColor);
        infoRgbValue.textContent = `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
        
        const hsl = hexToHSL(hexColor);
        infoHslValue.textContent = `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`;
        
        const cmyk = hexToCMYK(hexColor);
        infoCmykValue.textContent = `cmyk(${cmyk.c}%, ${cmyk.m}%, ${cmyk.y}%, ${cmyk.k}%)`;
        
        // Generate color variations
        const variations = document.querySelectorAll('.color-variation');
        
        // Lighter 50%
        variations[0].style.backgroundColor = getLighterColor(hexColor, 0.5);
        // Lighter 25%
        variations[1].style.backgroundColor = getLighterColor(hexColor, 0.25);
        // Original
        variations[2].style.backgroundColor = hexColor;
        // Darker 25%
        variations[3].style.backgroundColor = getDarkerColor(hexColor, 0.25);
        // Darker 50%
        variations[4].style.backgroundColor = getDarkerColor(hexColor, 0.5);
        
        // Calculate contrast
        calculateContrast(hexColor);
        
        // Update lock/unlock button text based on whether the color is locked
        const isLocked = lockedColors.some(lc => lc.index === index);
        if (isLocked) {
            addToLockedButton.textContent = 'Unlock Color';
        } else {
            addToLockedButton.textContent = 'Lock Color';
        }
        
        // Show the modal
        colorInfoModal.hidden = false;
        setTimeout(() => {
            colorInfoModal.classList.add('show');
        }, 10);
    }
    
    function hideColorInfoModal() {
        colorInfoModal.classList.remove('show');
        setTimeout(() => {
            colorInfoModal.hidden = true;
            currentInfoColor = null;
        }, 300);
    }
    
    function editColorFromInfoModal() {
        if (!currentInfoColor) return;
        
        // Hide the info modal
        hideColorInfoModal();
        
        // Get the swatch element
        const swatch = document.querySelector(`.color-swatch[data-index="${currentInfoColor.index}"]`);
        
        // Show the color picker modal with this color
        if (swatch) {
            const codeItem = document.querySelector(`.color-code-item[data-index="${currentInfoColor.index}"]`);
            showColorPicker(currentInfoColor.index, currentInfoColor.hex, swatch, codeItem);
        }
    }
    
    function lockColorFromInfoModal() {
        if (!currentInfoColor) return;
        
        const lockButton = document.querySelector(`.color-swatch[data-index="${currentInfoColor.index}"] .color-lock-button`);
        const swatch = document.querySelector(`.color-swatch[data-index="${currentInfoColor.index}"]`);
        
        if (lockButton && swatch) {
            toggleColorLock(currentInfoColor.index, currentInfoColor.hex, lockButton, swatch);
            
            // Update the button text
            const isLocked = lockedColors.some(lc => lc.index === currentInfoColor.index);
            addToLockedButton.textContent = isLocked ? 'Unlock Color' : 'Lock Color';
        }
    }
    
    function calculateContrast(hexColor) {
        // Get the contrast ratio with white and black
        const whiteContrast = getContrastRatio(hexColor, '#FFFFFF');
        const blackContrast = getContrastRatio(hexColor, '#000000');
        
        // Update the contrast samples
        const whiteText = document.querySelector('#contrast-on-white .contrast-sample-inner');
        const blackText = document.querySelector('#contrast-on-black .contrast-sample-inner');
        
        if (whiteText) whiteText.style.color = hexColor;
        if (blackText) blackText.style.color = hexColor;
        
        // Update the contrast values with visual accessibility indicators
        const whiteWcagStatus = getWcagStatus(whiteContrast);
        const blackWcagStatus = getWcagStatus(blackContrast);
        
        document.getElementById('contrast-white-value').innerHTML = 
            `${whiteContrast.toFixed(2)}:1 ${getWcagStatusIcon(whiteWcagStatus)}`;
        document.getElementById('contrast-black-value').innerHTML = 
            `${blackContrast.toFixed(2)}:1 ${getWcagStatusIcon(blackWcagStatus)}`;
            
        // Apply status class for styling
        document.getElementById('contrast-white-value').className = 
            `contrast-value ${getWcagStatusClass(whiteWcagStatus)}`;
        document.getElementById('contrast-black-value').className = 
            `contrast-value ${getWcagStatusClass(blackWcagStatus)}`;
        
        // Determine the best option (highest contrast)
        const bestOption = whiteContrast > blackContrast ? 'white' : 'black';
        const highestContrast = Math.max(whiteContrast, blackContrast);
        
        // Set overall WCAG status
        let wcagText = '';
        if (highestContrast >= 7) {
            wcagText = 'AAA (Enhanced)';
        } else if (highestContrast >= 4.5) {
            wcagText = 'AA (Standard)';
        } else if (highestContrast >= 3) {
            wcagText = 'AA Large (Large Text Only)';
        } else {
            wcagText = 'Fails WCAG Requirements';
        }
        
        document.getElementById('wcag-value').textContent = 
            `Best on ${bestOption}: ${wcagText}`;
        
        // Add indicator for best choice
        document.getElementById(`contrast-on-${bestOption}`).classList.add('recommended');
        document.getElementById(`contrast-on-${bestOption === 'white' ? 'black' : 'white'}`).classList.remove('recommended');
    }
    
    // Helper function to determine WCAG status level from contrast ratio
    function getWcagStatus(contrastRatio) {
        if (contrastRatio >= 7) {
            return 'aaa';
        } else if (contrastRatio >= 4.5) {
            return 'aa';
        } else if (contrastRatio >= 3) {
            return 'aa-large';
        } else {
            return 'fail';
        }
    }
    
    // Helper function to generate status icon based on WCAG level
    function getWcagStatusIcon(status) {
        switch (status) {
            case 'aaa':
                return '<span class="wcag-icon wcag-pass"><i class="fas fa-check-circle"></i> AAA</span>';
            case 'aa':
                return '<span class="wcag-icon wcag-pass"><i class="fas fa-check-circle"></i> AA</span>';
            case 'aa-large':
                return '<span class="wcag-icon wcag-partial"><i class="fas fa-exclamation-circle"></i> AA Large</span>';
            default:
                return '<span class="wcag-icon wcag-fail"><i class="fas fa-times-circle"></i> Fail</span>';
        }
    }
    
    // Helper function to get CSS class for contrast value styling
    function getWcagStatusClass(status) {
        switch (status) {
            case 'aaa':
                return 'wcag-aaa';
            case 'aa':
                return 'wcag-aa';
            case 'aa-large':
                return 'wcag-aa-large';
            default:
                return 'wcag-fail';
        }
    }
    
    function getContrastRatio(color1, color2) {
        // Convert colors to luminance values
        const lum1 = getLuminance(color1);
        const lum2 = getLuminance(color2);
        
        // Calculate contrast ratio
        const lightest = Math.max(lum1, lum2);
        const darkest = Math.min(lum1, lum2);
        
        return (lightest + 0.05) / (darkest + 0.05);
    }
    
    function getLuminance(hexColor) {
        const rgb = hexToRgb(hexColor);
        
        // Convert RGB to linear values
        let r = rgb.r / 255;
        let g = rgb.g / 255;
        let b = rgb.b / 255;
        
        // Apply gamma correction
        r = r <= 0.03928 ? r / 12.92 : Math.pow((r + 0.055) / 1.055, 2.4);
        g = g <= 0.03928 ? g / 12.92 : Math.pow((g + 0.055) / 1.055, 2.4);
        b = b <= 0.03928 ? b / 12.92 : Math.pow((b + 0.055) / 1.055, 2.4);
        
        // Calculate luminance (per WCAG 2.0)
        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    }
    
    function getLighterColor(hexColor, amount) {
        const hsl = hexToHSL(hexColor);
        const newL = Math.min(100, hsl.l + (100 - hsl.l) * amount);
        return hslToHex(hsl.h, hsl.s, newL);
    }
    
    function getDarkerColor(hexColor, amount) {
        const hsl = hexToHSL(hexColor);
        const newL = Math.max(0, hsl.l - (hsl.l * amount));
        return hslToHex(hsl.h, hsl.s, newL);
    }
    
    function copyColorValueToClipboard(format) {
        if (!currentInfoColor) return;
        
        let valueToCopy;
        
        switch (format) {
            case 'hex':
                valueToCopy = infoHexValue.textContent;
                break;
            case 'rgb':
                valueToCopy = infoRgbValue.textContent;
                break;
            case 'hsl':
                valueToCopy = infoHslValue.textContent;
                break;
            case 'cmyk':
                valueToCopy = infoCmykValue.textContent;
                break;
            default:
                valueToCopy = currentInfoColor.hex;
        }
        
        navigator.clipboard.writeText(valueToCopy)
            .then(() => {
                showToast(`Copied ${format.toUpperCase()} value to clipboard`, 'success');
            })
            .catch(err => {
                console.error('Failed to copy: ', err);
                showToast('Failed to copy color value', 'error');
            });
    }

    // Initialize sticky header
    function initStickyHeader() {
        // Initial check on page load
        checkScrollPosition();
        
        // Add scroll event listener with throttling to improve performance
        let lastScrollTime = 0;
        let lastScrollY = window.scrollY;
        const scrollThrottle = 100; // Increased throttle to reduce frequency of checks
        let isInTransition = false;
        let transitionTimeout = null;
        
        window.addEventListener('scroll', () => {
            const now = Date.now();
            if (now - lastScrollTime >= scrollThrottle && !isInTransition) {
                lastScrollTime = now;
                checkScrollPosition();
            }
        });

        // Prevent scroll events from triggering during header transitions
        header.addEventListener('transitionstart', () => {
            isInTransition = true;
            if (transitionTimeout) clearTimeout(transitionTimeout);
        });

        header.addEventListener('transitionend', () => {
            // Add a little delay after the transition completes before allowing scroll events again
            if (transitionTimeout) clearTimeout(transitionTimeout);
            transitionTimeout = setTimeout(() => {
                isInTransition = false;
                // Check once more after transition completes
                checkScrollPosition();
            }, 100);
        });
    }
    
    // Check scroll position and toggle sticky class
    function checkScrollPosition() {
        const scrollPosition = window.scrollY;
        const isSticky = header.classList.contains('sticky');
        
        // Use different thresholds for adding vs removing the sticky class
        // This creates a buffer zone to prevent oscillation at the threshold
        const addThreshold = 80;
        const removeThreshold = 20;
        
        if (!isSticky && scrollPosition > addThreshold) {
            // Only add sticky class if we're not already sticky and above the add threshold
            document.body.style.paddingTop = header.offsetHeight + 'px';
            header.classList.add('sticky');
        } else if (isSticky && scrollPosition <= removeThreshold) {
            // Only remove sticky class if we're currently sticky and below the remove threshold
            header.classList.remove('sticky');
            // Use a timeout to remove the padding after the header has fully transitioned
            setTimeout(() => {
                document.body.style.paddingTop = '0px';
            }, 250); // Match this with the transition duration in CSS
        }
    }

});
