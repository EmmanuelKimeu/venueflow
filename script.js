// Select all sidebar navigation items
const navItems = document.querySelectorAll('.nav-item');

// Select sections by their IDs (only those that exist)
const sections = {
    dashboard: document.getElementById('dashboard-section'),
    halls: document.getElementById('halls-section')
    // availability section removed because it doesn't exist
};

// Function to switch sections when a sidebar item is clicked
navItems.forEach(item => {
    item.addEventListener('click', () => {
        // Remove "active" class from all sidebar items
        navItems.forEach(i => i.classList.remove('active'));
        item.classList.add('active');

        // Hide all sections safely
        Object.values(sections).forEach(sec => {
            if(sec) sec.style.display = 'none';
        });

        // Show the selected section based on sidebar text
        const text = item.textContent.trim();
        if(text.includes('Dashboard') && sections.dashboard) sections.dashboard.style.display = 'block';
        if(text.includes('Hall Management') && sections.halls) sections.halls.style.display = 'block';
    });
});

// Show dashboard by default
if(sections.dashboard) sections.dashboard.style.display = 'block';
