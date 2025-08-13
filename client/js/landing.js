// Ultra-lightweight landing page handler
(function() {
    // Generate sample Excel data
    function generateSampleExcel() {
        // Sample employees
        const employees = [
            { ID: 'E001', Name: 'Alice Johnson', Email: 'alice@company.com', 'Max Hours': 40, 'Project Management': 'Expert', 'Data Analysis': 'Advanced', 'Communication': 'Expert' },
            { ID: 'E002', Name: 'Bob Smith', Email: 'bob@company.com', 'Max Hours': 40, 'Financial Auditing': 'Expert', 'Risk Assessment': 'Advanced', 'Excel': 'Expert' },
            { ID: 'E003', Name: 'Carol Williams', Email: 'carol@company.com', 'Max Hours': 35, 'Cybersecurity': 'Advanced', 'Network Admin': 'Intermediate', 'Python': 'Expert' },
            { ID: 'E004', Name: 'David Brown', Email: 'david@company.com', 'Max Hours': 40, 'Software Development': 'Expert', 'JavaScript': 'Expert', 'React': 'Advanced' },
            { ID: 'E005', Name: 'Emma Davis', Email: 'emma@company.com', 'Max Hours': 40, 'UI/UX Design': 'Expert', 'Figma': 'Expert', 'CSS': 'Advanced' }
        ];
        
        // Sample projects
        const projects = [
            { ID: 'P001', Name: 'Q1 Financial Audit', 'Start Date': '2024-01-15', 'End Date': '2024-03-15', Portfolio: 'Finance', 'Required Skills': 'Financial Auditing, Excel' },
            { ID: 'P002', Name: 'Security Assessment', 'Start Date': '2024-02-01', 'End Date': '2024-04-30', Portfolio: 'IT Security', 'Required Skills': 'Cybersecurity, Risk Assessment' },
            { ID: 'P003', Name: 'Customer Portal Redesign', 'Start Date': '2024-01-01', 'End Date': '2024-05-31', Portfolio: 'Product', 'Required Skills': 'UI/UX Design, JavaScript, React' },
            { ID: 'P004', Name: 'Data Migration Project', 'Start Date': '2024-03-01', 'End Date': '2024-06-30', Portfolio: 'IT Infrastructure', 'Required Skills': 'Data Analysis, Python' },
            { ID: 'P005', Name: 'Annual Planning', 'Start Date': '2024-01-01', 'End Date': '2024-02-28', Portfolio: 'Management', 'Required Skills': 'Project Management, Communication' }
        ];
        
        // Sample assignments
        const assignments = [
            { 'Employee ID': 'E001', 'Project ID': 'P005', Hours: 20, Week: 1 },
            { 'Employee ID': 'E002', 'Project ID': 'P001', Hours: 40, Week: 3 },
            { 'Employee ID': 'E003', 'Project ID': 'P002', Hours: 30, Week: 5 },
            { 'Employee ID': 'E004', 'Project ID': 'P003', Hours: 35, Week: 1 },
            { 'Employee ID': 'E005', 'Project ID': 'P003', Hours: 40, Week: 1 }
        ];
        
        // Create workbook
        const wb = XLSX.utils.book_new();
        
        // Add sheets
        const ws1 = XLSX.utils.json_to_sheet(employees);
        XLSX.utils.book_append_sheet(wb, ws1, 'Employees');
        
        const ws2 = XLSX.utils.json_to_sheet(projects);
        XLSX.utils.book_append_sheet(wb, ws2, 'Projects');
        
        const ws3 = XLSX.utils.json_to_sheet(assignments);
        XLSX.utils.book_append_sheet(wb, ws3, 'Assignments');
        
        // Generate and download file
        const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
        const blob = new Blob([wbout], { type: 'application/octet-stream' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'ScheduleSample.xlsx';
        a.click();
        URL.revokeObjectURL(url);
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
        
        // Dynamically load the main app module
        const script = document.createElement('script');
        script.type = 'module';
        script.src = 'js/app.js';
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
        const fileInput = document.getElementById('landingFileInput');
        
        if (uploadBtn) {
            uploadBtn.addEventListener('click', () => fileInput.click());
        }
        
        if (sampleBtn) {
            sampleBtn.addEventListener('click', generateSampleExcel);
        }
        
        if (fileInput) {
            fileInput.addEventListener('change', handleFileUpload);
        }
    });
    
    // Expose for potential use
    window.landingPage = {
        generateSampleExcel,
        loadMainApp
    };
})();