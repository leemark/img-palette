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

    // API endpoint - Cloudflare Worker URL
    const API_ENDPOINT = 'https://img-palette-api.leemark.workers.dev/generate-palette';

    // State
    let currentPalette = null;
    let paletteHistoryData = [];

    // Initialize
    initTheme();
    loadPaletteHistory();

    // Event Listeners
    uploadButton.addEventListener('click', () => uploadInput.click());
    uploadInput.addEventListener('change', handleImageUpload);
    removeImageButton.addEventListener('click', removeImage);
    generateButton.addEventListener('click', generatePalette);
    themeToggle.addEventListener('click', toggleTheme);
    copyPaletteButton.addEventListener('click', copyPaletteToClipboard);
    savePaletteButton.addEventListener('click', savePalette);
    sharePaletteButton.addEventListener('click', sharePalette);
    
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
            
            const response = await fetch(API_ENDPOINT, {
                method: 'POST',
                body: formData
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Error generating palette');
            }
            
            const paletteData = await response.json();
            currentPalette = paletteData;
            
            // Hide loading indicator and show palette
            loadingIndicator.style.display = 'none';
            loadingIndicator.hidden = true;
            paletteContainer.hidden = false;
            
            displayPalette(paletteData);
            showToast('Palette generated successfully!', 'success');
            
            // Scroll to the palette container for better UX
            paletteContainer.scrollIntoView({ behavior: 'smooth' });
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
        palette.colors.forEach(color => {
            // Add color swatch
            const swatch = document.createElement('div');
            swatch.className = 'color-swatch';
            swatch.style.backgroundColor = color.hex;
            swatch.setAttribute('data-color', color.hex);
            swatch.addEventListener('click', () => copyColorToClipboard(color.hex));
            
            const colorCode = document.createElement('span');
            colorCode.className = 'color-code';
            colorCode.textContent = color.hex;
            swatch.appendChild(colorCode);
            
            paletteColors.appendChild(swatch);
            
            // Add color code item
            const codeItem = document.createElement('div');
            codeItem.className = 'color-code-item';
            codeItem.setAttribute('data-color', color.hex);
            codeItem.addEventListener('click', () => copyColorToClipboard(color.hex));
            
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
            historyItem.addEventListener('click', () => {
                currentPalette = palette;
                displayPalette(palette);
                paletteContainer.hidden = false;
                resultsSection.hidden = false;
                
                // Scroll to palette container
                paletteContainer.scrollIntoView({ behavior: 'smooth' });
            });
            
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
            
            historyItem.appendChild(historyColors);
            historyItem.appendChild(historyInfo);
            
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
}); 