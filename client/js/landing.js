// Ultra-lightweight landing page handler
(function() {
    // Download the actual sample Excel file from public folder
    function downloadSampleExcel() {
        const link = document.createElement('a');
        link.href = '/public/ScheduleSample.xlsx';
        link.download = 'ScheduleSample.xlsx';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
    
    // Load sample data automatically for "Try Now" functionality
    async function loadSampleData() {
        try {
            // Show loading state
            document.getElementById('landingContent').innerHTML = `
                <div class="loading-container" style="text-align: center; padding: 4rem;">
                    <div class="loading"></div>
                    <p style="margin-top: 1rem; color: var(--text-secondary);">Loading sample data...</p>
                </div>
            `;
            
            // Fetch the sample file
            const response = await fetch('/public/ScheduleSample.xlsx');
            if (!response.ok) {
                throw new Error('Failed to load sample data');
            }
            
            const blob = await response.blob();
            
            // Convert blob to data URL for sessionStorage
            const reader = new FileReader();
            reader.onload = function(e) {
                // Store the file data
                sessionStorage.setItem('scheduleFile', e.target.result);
                sessionStorage.setItem('scheduleFileName', 'ScheduleSample.xlsx');
                sessionStorage.setItem('isSampleData', 'true');
                
                // Load the main app
                setTimeout(() => {
                    window.location.hash = '#app';
                    loadMainApp();
                }, 500);
            };
            reader.readAsDataURL(blob);
            
        } catch (error) {
            console.error('Error loading sample data:', error);
            alert('Failed to load sample data. Please try uploading a file instead.');
            // Restore the landing page
            window.location.reload();
        }
    }
    
    // Handle file upload
    function handleFileUpload(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        // Store file in sessionStorage for the app to use
        const reader = new FileReader();
        reader.onload = function(e) {
            // Show loading state
            document.getElementById('landingContent').innerHTML = `
                <div class="loading-container">
                    <div class="spinner"></div>
                    <p>Loading scheduler...</p>
                </div>
            `;
            
            // Store the file data
            sessionStorage.setItem('scheduleFile', e.target.result);
            sessionStorage.setItem('scheduleFileName', file.name);
            
            // Load the main app
            setTimeout(() => {
                window.location.hash = '#app';
                loadMainApp();
            }, 500);
        };
        reader.readAsDataURL(file);
    }
    
    // Load main application
    function loadMainApp() {
        // Replace landing content with app content
        document.getElementById('landing').style.display = 'none';
        document.getElementById('app').style.display = 'block';
        
        // Check if app.js is already loaded
        if (window.appLoaded) {
            return;
        }
        
        // Dynamically load the main app module
        const script = document.createElement('script');
        script.type = 'module';
        script.src = 'js/app.js';
        script.onload = () => {
            window.appLoaded = true;
        };
        script.onerror = (e) => {
            console.error('Failed to load app script:', e);
            alert('Failed to load application. Please refresh the page.');
        };
        document.body.appendChild(script);
    }
    
    // Initialize landing page
    document.addEventListener('DOMContentLoaded', function() {
        // Make sure landing is visible by default
        const landing = document.getElementById('landing');
        const app = document.getElementById('app');
        
        // Check if returning user with data
        if (window.location.hash === '#app' && sessionStorage.getItem('scheduleFile')) {
            loadMainApp();
            return;
        }
        
        // Ensure landing is shown and app is hidden
        if (landing) landing.style.display = 'flex';
        if (app) app.style.display = 'none';
        
        // Setup landing page event listeners
        const uploadBtn = document.getElementById('landingUploadBtn');
        const sampleBtn = document.getElementById('downloadSampleBtn');
        const tryNowBtn = document.getElementById('tryNowBtn');
        const fileInput = document.getElementById('landingFileInput');
        
        if (uploadBtn) {
            uploadBtn.addEventListener('click', () => fileInput.click());
        }
        
        if (sampleBtn) {
            sampleBtn.addEventListener('click', downloadSampleExcel);
        }
        
        if (tryNowBtn) {
            tryNowBtn.addEventListener('click', loadSampleData);
        }
        
        if (fileInput) {
            fileInput.addEventListener('change', handleFileUpload);
        }
    });
    
    // Expose for potential use
    window.landingPage = {
        downloadSampleExcel,
        loadSampleData,
        loadMainApp
    };
})();