// Engineering Collaboration App - Frontend Interaction Script
// Includes role switching, modals, data loading, etc.

// Sample data
const sampleData = {
    projects: [
        {
            id: 1,
            name: "Commercial Complex Electrical Engineering",
            location: "Pudong New Area, Shanghai",
            progress: 75,
            status: "In Progress",
            members: 3,
            image: "https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=400&h=200&fit=crop"
        },
        {
            id: 2,
            name: "Smart Office Building Retrofit",
            location: "Chaoyang District, Beijing",
            progress: 0,
            status: "Not Started",
            members: 1,
            image: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=400&h=200&fit=crop"
        }
    ],
    
    userRoles: {
        leader: {
            name: "Team Leader",
            permissions: ["Manage Members", "Upload Files", "Delete Messages", "Edit Project"]
        },
        member: {
            name: "Member",
            permissions: ["Send Messages", "Upload Images", "View Documents"]
        },
        ceo: {
            name: "Project Manager",
            permissions: ["All Permissions"]
        }
    }
};

// Role switching
function switchRole(role) {
    console.log(`Switched to ${role} role`);
    // Show/hide feature buttons based on role
    updateUIBasedOnRole(role);
}

// Update UI based on role
function updateUIBasedOnRole(role) {
    const permissions = sampleData.userRoles[role].permissions;
    
    // Update permission buttons on the group settings page
    const permissionButtons = document.querySelectorAll('[data-role-required]');
    permissionButtons.forEach(btn => {
        const requiredRole = btn.getAttribute('data-role-required');
        if (!permissions.includes(requiredRole)) {
            btn.disabled = true;
            btn.classList.add('opacity-50', 'cursor-not-allowed');
        }
    });
}

// Simulate AI document generation
function generateAIDocument(type, description) {
    console.log(`Generate ${type} document: ${description}`);
    
    // Show loading animation
    const loadingEl = document.getElementById('loadingIndicator');
    if (loadingEl) loadingEl.classList.remove('hidden');
    
    // Simulate API call
    setTimeout(() => {
        if (loadingEl) loadingEl.classList.add('hidden');
        const resultEl = document.getElementById('resultPreview');
        if (resultEl) resultEl.classList.remove('hidden');
    }, 2000);
}

// File upload progress
function uploadFile(file) {
    console.log(`Upload file: ${file.name}`);
    
    // Simulate upload progress
    let progress = 0;
    const interval = setInterval(() => {
        progress += 10;
        console.log(`Upload progress: ${progress}%`);
        
        if (progress >= 100) {
            clearInterval(interval);
            console.log('Upload complete');
        }
    }, 200);
}

// Initialization
document.addEventListener('DOMContentLoaded', function() {
    console.log('Engineering Collaboration App loaded');
    
    // Bind role selector event
    const roleSelector = document.getElementById('roleSelector');
    if (roleSelector) {
        roleSelector.addEventListener('change', (e) => {
            switchRole(e.target.value);
        });
    }
});

