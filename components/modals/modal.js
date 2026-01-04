/* ============================================
   UNIFIED MODAL SYSTEM - JavaScript
   ============================================ */

const ModalSystem = {
    // Track active modals
    activeModals: [],

    // Track loaded modals
    loadedModals: new Set(),

    // Load a modal from external HTML file
    load: async function(modalPath, basePath = '') {
        // Construct full path
        const fullPath = basePath + 'components/modals/' + modalPath;

        // Skip if already loaded
        if (this.loadedModals.has(modalPath)) {
            return Promise.resolve();
        }

        try {
            const response = await fetch(fullPath);
            if (!response.ok) {
                console.warn(`Failed to load modal: ${fullPath}`);
                return;
            }
            const html = await response.text();

            // Create a container and append to body
            const container = document.createElement('div');
            container.innerHTML = html;
            document.body.appendChild(container.firstElementChild);

            this.loadedModals.add(modalPath);
        } catch (error) {
            console.warn(`Error loading modal ${fullPath}:`, error);
        }
    },

    // Load multiple modals
    loadAll: async function(modalPaths, basePath = '') {
        const promises = modalPaths.map(path => this.load(path, basePath));
        await Promise.all(promises);
    },

    // Initialize the modal system
    init: function() {
        // Close modal on escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.activeModals.length > 0) {
                this.close(this.activeModals[this.activeModals.length - 1]);
            }
        });

        // Close modal when clicking overlay (not modal content)
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal-overlay') && e.target.classList.contains('active')) {
                this.close(e.target.id);
            }
        });

        // Note: Welcome modal is shown via toggleClientView(), not automatically on page load
    },

    // Open a modal by ID
    open: function(modalId) {
        const modal = document.getElementById(modalId);
        if (!modal) {
            console.warn(`Modal with id "${modalId}" not found`);
            return;
        }

        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
        this.activeModals.push(modalId);

        // Focus first input if exists
        const firstInput = modal.querySelector('input, select, textarea');
        if (firstInput) {
            setTimeout(() => firstInput.focus(), 100);
        }
    },

    // Close a modal by ID
    close: function(modalId) {
        const modal = document.getElementById(modalId);
        if (!modal) return;

        modal.classList.remove('active');

        // Remove from active modals
        const index = this.activeModals.indexOf(modalId);
        if (index > -1) {
            this.activeModals.splice(index, 1);
        }

        // Restore body scroll if no more modals
        if (this.activeModals.length === 0) {
            document.body.style.overflow = '';
        }
    },

    // Close all modals
    closeAll: function() {
        this.activeModals.forEach(modalId => {
            const modal = document.getElementById(modalId);
            if (modal) {
                modal.classList.remove('active');
            }
        });
        this.activeModals = [];
        document.body.style.overflow = '';
    },

    // Check and show welcome modal if needed
    checkWelcomeModal: function() {
        const welcomeModal = document.getElementById('welcomeModal');
        if (!welcomeModal) return;

        // Set personalized title if first name is available
        const firstName = sessionStorage.getItem('clientFirstName');
        const titleEl = document.getElementById('welcomeTitle');
        if (firstName && titleEl) {
            titleEl.textContent = `Welcome Back, ${firstName}!`;
        }

        // Check if user has dismissed the welcome modal in this session
        const dismissed = sessionStorage.getItem('welcomeModalDismissed');
        if (!dismissed) {
            // Show welcome modal after a brief delay
            setTimeout(() => this.open('welcomeModal'), 500);
        }
    },

    // Dismiss an announcement within the welcome modal
    dismissAnnouncement: function(button) {
        const announcement = button.closest('.welcome-announcement');
        if (announcement) {
            announcement.style.opacity = '0';
            announcement.style.height = announcement.offsetHeight + 'px';
            setTimeout(() => {
                announcement.style.height = '0';
                announcement.style.padding = '0';
                announcement.style.margin = '0';
                announcement.style.overflow = 'hidden';
            }, 150);
            setTimeout(() => {
                announcement.remove();
                // Check if all announcements are dismissed
                const remaining = document.querySelectorAll('.welcome-announcement');
                if (remaining.length === 0) {
                    this.close('welcomeModal');
                    sessionStorage.setItem('welcomeModalDismissed', 'true');
                }
            }, 300);
        }
    },

    // Dismiss entire welcome modal
    dismissWelcome: function() {
        sessionStorage.setItem('welcomeModalDismissed', 'true');
        this.close('welcomeModal');
    }
};

// Initialize on DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => ModalSystem.init());
} else {
    ModalSystem.init();
}

// Global functions for inline onclick handlers
function openModal(modalId) {
    ModalSystem.open(modalId);
}

function closeModal(modalId) {
    ModalSystem.close(modalId);
}

function dismissAnnouncement(button) {
    ModalSystem.dismissAnnouncement(button);
}

function dismissWelcome() {
    ModalSystem.dismissWelcome();
}
