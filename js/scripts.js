        // Tab Navigation
        document.querySelectorAll('.tab-btn').forEach(button => {
            button.addEventListener('click', () => {
                document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
                document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
                button.classList.add('active');
                const tabId = button.getAttribute('data-tab');
                document.getElementById(tabId).classList.add('active');
            });
        });

        // Filter tabs (Communication)
        document.querySelectorAll('.filter-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
            });
        });

        // Activity filter chips
        document.querySelectorAll('.filter-chip').forEach(chip => {
            chip.addEventListener('click', () => {
                document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
                chip.classList.add('active');
            });
        });

        // Client filter buttons
        document.querySelectorAll('.filter-btn[data-filter]').forEach(btn => {
            btn.addEventListener('click', () => {
                // Update active button
                document.querySelectorAll('.filter-btn[data-filter]').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                const filter = btn.getAttribute('data-filter');
                const cards = document.querySelectorAll('.client-card[data-status]');
                let visibleCount = 0;

                cards.forEach(card => {
                    if (filter === 'all' || card.getAttribute('data-status') === filter) {
                        card.classList.remove('hidden');
                        visibleCount++;
                    } else {
                        card.classList.add('hidden');
                    }
                });

                // Show/hide empty state
                const emptyState = document.querySelector('.clients-empty-state');
                if (emptyState) {
                    if (visibleCount === 0) {
                        emptyState.classList.add('visible');
                    } else {
                        emptyState.classList.remove('visible');
                    }
                }
            });
        });

        // Client search functionality
        const searchBox = document.querySelector('.search-box input');
        if (searchBox) {
            searchBox.addEventListener('input', (e) => {
                const query = e.target.value.toLowerCase();
                const cards = document.querySelectorAll('.client-card[data-status]');
                const activeFilter = document.querySelector('.filter-btn[data-filter].active');
                const filter = activeFilter ? activeFilter.getAttribute('data-filter') : 'all';

                cards.forEach(card => {
                    const name = card.querySelector('h3').textContent.toLowerCase();
                    const email = card.querySelector('.client-card-email').textContent.toLowerCase();
                    const status = card.getAttribute('data-status');

                    const matchesSearch = name.includes(query) || email.includes(query);
                    const matchesFilter = filter === 'all' || status === filter;

                    if (matchesSearch && matchesFilter) {
                        card.classList.remove('hidden');
                    } else {
                        card.classList.add('hidden');
                    }
                });
            });
        }

        // Recommendation sub-tabs
        document.querySelectorAll('.rec-subtab').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('.rec-subtab').forEach(t => t.classList.remove('active'));
                document.querySelectorAll('.rec-content').forEach(c => c.classList.remove('active'));
                tab.classList.add('active');
                const tabId = tab.getAttribute('data-rec-tab');
                document.getElementById(tabId).classList.add('active');
            });
        });

        // Results sub-tabs
        document.querySelectorAll('.results-subtab').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('.results-subtab').forEach(t => t.classList.remove('active'));
                document.querySelectorAll('.results-tab-content').forEach(c => c.classList.remove('active'));
                tab.classList.add('active');
                const tabId = tab.getAttribute('data-results-tab');
                document.getElementById(tabId).classList.add('active');
            });
        });

        // Edit Client Tabs
        document.querySelectorAll('.edit-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('.edit-tab').forEach(t => t.classList.remove('active'));
                document.querySelectorAll('.edit-tab-content').forEach(c => c.classList.remove('active'));
                tab.classList.add('active');
                const tabId = 'edit-' + tab.getAttribute('data-edit-tab');
                document.getElementById(tabId).classList.add('active');
            });
        });

        // Alert Type Selection
        document.querySelectorAll('.alert-type-option').forEach(option => {
            option.addEventListener('click', () => {
                document.querySelectorAll('.alert-type-option').forEach(o => o.classList.remove('selected'));
                option.classList.add('selected');
            });
        });

        // Stage Selector
        document.querySelectorAll('.stage-option').forEach(option => {
            option.addEventListener('click', () => {
                document.querySelectorAll('.stage-option').forEach(o => o.classList.remove('selected'));
                option.classList.add('selected');
            });
        });

        // Modal Functions
        function openModal(modalId) {
            document.getElementById('modalBackdrop').classList.add('active');
            document.getElementById(modalId).classList.add('active');
            document.body.style.overflow = 'hidden';
        }

        function closeModal(modalId) {
            document.getElementById('modalBackdrop').classList.remove('active');
            document.getElementById(modalId).classList.remove('active');
            document.body.style.overflow = '';
        }

        // Close modal on backdrop click
        document.getElementById('modalBackdrop').addEventListener('click', () => {
            document.querySelectorAll('.modal.active').forEach(modal => {
                modal.classList.remove('active');
            });
            document.getElementById('modalBackdrop').classList.remove('active');
            document.body.style.overflow = '';
        });

        // Close modal on Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                document.querySelectorAll('.modal.active').forEach(modal => {
                    modal.classList.remove('active');
                });
                document.getElementById('modalBackdrop').classList.remove('active');
                document.body.style.overflow = '';
            }
        });

        // Toast Functions
        function showToast(message) {
            const toast = document.getElementById('successToast');
            toast.querySelector('.toast-message').textContent = message;
            toast.classList.add('active');
            setTimeout(() => {
                toast.classList.remove('active');
            }, 4000);
        }

        function hideToast() {
            document.getElementById('successToast').classList.remove('active');
        }

        // Action Functions
        function sendResultAlert() {
            closeModal('resultAlertModal');
            showToast('Result alert sent successfully!');
        }

        function resendInvitation() {
            closeModal('resendInviteModal');
            showToast('Invitation email sent!');
        }

        function saveClientChanges() {
            closeModal('editClientModal');
            showToast('Client information updated!');
        }

        // Approve Increase Functions
        function approveIncrease() {
            closeModal('approveIncreaseModal');
            showToast('Budget increase approved! Changes will take effect on your next billing cycle.');
        }

        // Connect header buttons to modals
        document.addEventListener('DOMContentLoaded', () => {
            const buttons = document.querySelectorAll('.header-actions .btn');
            buttons.forEach(btn => {
                if (btn.textContent.includes('Result Alert')) {
                    btn.onclick = () => openModal('resultAlertModal');
                } else if (btn.textContent.includes('Invitation')) {
                    btn.onclick = () => openModal('resendInviteModal');
                } else if (btn.textContent.includes('Edit Client')) {
                    btn.onclick = () => openModal('editClientModal');
                }
            });

            // Approve Increase checkbox handler
            const approveCheckbox = document.getElementById('approveAgreement');
            const approveBtn = document.getElementById('approveIncreaseBtn');
            if (approveCheckbox && approveBtn) {
                approveCheckbox.addEventListener('change', () => {
                    approveBtn.disabled = !approveCheckbox.checked;
                });
            }
        });
