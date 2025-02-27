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

    // API endpoint - Cloudflare Worker URL
    const API_ENDPOINT = 'https://img-palette-api.leemark.workers.dev/generate-palette';

    // State
    let currentPalette = null;
    let paletteHistoryData = [];
    let paletteToDelete = null;
    let colorPickerInstance = null;
    let currentEditingColor = {
        index: null,
        originalHex: null,
        element: null,
        codeElement: null
    };
    let lockedColors = [];
    let currentHarmonyType = null;
    let currentHarmonyBaseColor = null;
    let harmonyPalette = [];

    // Initialize
    initTheme();
    loadPaletteHistory();
    initColorPicker();

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
        // This would normally get color at click position
        // For simplicity, we'll just use a random color for demo
        const randomColor = '#' + Math.floor(Math.random()*16777215).toString(16);
        updateColorPicker(randomColor);
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
            
            const formData = new FormData();
            formData.append('image', file);
            
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

    function displayPalette(palette) {
        // Set palette name
        paletteName.textContent = palette.name;
        
        // Clear previous palette
        paletteColors.innerHTML = '';
        colorCodes.innerHTML = '';
        
        // Add color swatches
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
            codeText.textContent = color.hex;
            
            // Add locked indicator to code item if needed
            if (isLocked) {
                const lockedBadge = document.createElement('span');
                lockedBadge.className = 'color-locked-badge';
                lockedBadge.innerHTML = '<i class="fas fa-lock"></i>';
                codeItem.appendChild(lockedBadge);
            }
            
            // Add edit button to code item
            const editButtonCode = document.createElement('button');
            editButtonCode.className = 'color-edit-button-small';
            editButtonCode.innerHTML = '<i class="fas fa-edit"></i>';
            editButtonCode.title = 'Edit color';
            editButtonCode.addEventListener('click', (e) => {
                e.stopPropagation();
                showColorPicker(index, color.hex, swatch, codeItem);
            });
            
            codeItem.appendChild(colorDot);
            codeItem.appendChild(codeText);
            codeItem.appendChild(editButtonCode);
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
        
        // Add CSS for edit buttons
        if (!document.getElementById('edit-button-styles')) {
            const styleElement = document.createElement('style');
            styleElement.id = 'edit-button-styles';
            styleElement.textContent = `
                .color-swatch {
                    position: relative;
                }
                .color-edit-button {
                    position: absolute;
                    top: 14px;
                    right: 14px;
                    background-color: rgba(0, 0, 0, 0.6);
                    color: white;
                    border-radius: 50%;
                    width: 32px;
                    height: 32px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border: none;
                    cursor: pointer;
                    opacity: 0;
                    transition: all 0.3s ease;
                    font-size: 14px;
                }
                .color-swatch:hover .color-edit-button {
                    opacity: 0.8;
                }
                .color-edit-button:hover {
                    opacity: 1 !important;
                    transform: scale(1.1);
                }
                .color-edit-button-small {
                    background: none;
                    border: none;
                    color: var(--text-secondary);
                    cursor: pointer;
                    margin-left: auto;
                    opacity: 0.6;
                    transition: all 0.2s ease;
                    padding: 4px;
                }
                .color-edit-button-small:hover {
                    opacity: 1;
                    color: var(--primary-color);
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
        currentEditingColor.index = index;
        currentEditingColor.originalHex = hexColor;
        currentEditingColor.element = swatchElement;
        currentEditingColor.codeElement = codeElement;
        
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
            
            // Reset color to original if canceled
            if (currentEditingColor.element) {
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
                codeElement: null
            };
        }, 300);
    }

    function updateColorPicker(hexColor) {
        if (colorPickerInstance) {
            colorPickerInstance.color.hexString = hexColor;
            updateColorInputs(colorPickerInstance.color);
        }
    }

    function updateColorInputs(color) {
        // Update text inputs
        hexInput.value = color.hexString.substring(1); // Remove # prefix
        rInput.value = Math.round(color.rgb.r);
        gInput.value = Math.round(color.rgb.g);
        bInput.value = Math.round(color.rgb.b);
        
        // Update preview
        if (currentEditingColor.element) {
            currentEditingColor.element.style.backgroundColor = color.hexString;
            
            // Also update code element if exists
            if (currentEditingColor.codeElement) {
                const colorDot = currentEditingColor.codeElement.querySelector('.color-dot');
                if (colorDot) {
                    colorDot.style.backgroundColor = color.hexString;
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
        
        const newColor = colorPickerInstance.color.hexString;
        
        // Update palette data
        if (currentPalette && currentPalette.colors[currentEditingColor.index]) {
            currentPalette.colors[currentEditingColor.index].hex = newColor;
            
            // Update UI elements
            const swatch = currentEditingColor.element;
            if (swatch) {
                swatch.style.backgroundColor = newColor;
                swatch.setAttribute('data-color', newColor);
                
                // Update color code text
                const colorCode = swatch.querySelector('.color-code');
                if (colorCode) {
                    colorCode.textContent = newColor;
                }
            }
            
            // Update code item
            const codeElement = document.querySelector(`.color-code-item[data-index="${currentEditingColor.index}"]`);
            if (codeElement) {
                codeElement.setAttribute('data-color', newColor);
                
                const colorDot = codeElement.querySelector('.color-dot');
                if (colorDot) {
                    colorDot.style.backgroundColor = newColor;
                }
                
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

});
