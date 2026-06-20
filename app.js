// ============================================
// Business Prospector - Main Application
// ============================================

class BusinessProspector {
    constructor() {
        this.apiKey = 'YOUR_GOOGLE_MAPS_API_KEY';
        this.businesses = [];
        this.filteredBusinesses = [];
        this.currentFilter = 'all';
        this.currentSort = 'rating-desc';
        this.contactedIds = new Set();
        this.excludedIds = new Set();
        this.notes = new Map();
        this.currentEditingId = null;
        
        this.initializeElements();
        this.attachEventListeners();
        this.loadFromLocalStorage();
    }

    initializeElements() {
        // Search Elements
        this.cityInput = document.getElementById('city');
        this.stateInput = document.getElementById('state');
        this.categoryInput = document.getElementById('category');
        this.searchBtn = document.getElementById('searchBtn');
        this.errorMessage = document.getElementById('errorMessage');

        // Controls Elements
        this.controlsSection = document.getElementById('controlsSection');
        this.resultsSection = document.getElementById('resultsSection');
        this.resultsList = document.getElementById('resultsList');
        this.noResults = document.getElementById('noResults');
        this.loadingMore = document.getElementById('loadingMore');

        // Stats Elements
        this.totalCountEl = document.getElementById('totalCount');
        this.contactedCountEl = document.getElementById('contactedCount');
        this.notContactedCountEl = document.getElementById('notContactedCount');

        // Filter & Sort Elements
        this.filterBtns = document.querySelectorAll('.filter-btn');
        this.sortSelect = document.getElementById('sortBy');
        this.exportBtn = document.getElementById('exportBtn');

        // Modal Elements
        this.noteModal = document.getElementById('noteModal');
        this.noteText = document.getElementById('noteText');
        this.saveNoteBtn = document.getElementById('savNoteBtn');
        this.modalCloseButtons = document.querySelectorAll('.modal-close');
    }

    attachEventListeners() {
        this.searchBtn.addEventListener('click', () => this.handleSearch());
        this.cityInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.handleSearch();
        });
        this.stateInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.handleSearch();
        });
        this.categoryInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.handleSearch();
        });

        // Filter buttons
        this.filterBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.filterBtns.forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.currentFilter = e.target.dataset.filter;
                this.applyFiltersAndSort();
            });
        });

        // Sort select
        this.sortSelect.addEventListener('change', (e) => {
            this.currentSort = e.target.value;
            this.applyFiltersAndSort();
        });

        // Export button
        this.exportBtn.addEventListener('click', () => this.exportToCSV());

        // Modal close buttons
        this.modalCloseButtons.forEach(btn => {
            btn.addEventListener('click', () => this.closeModal());
        });

        this.saveNoteBtn.addEventListener('click', () => this.saveNote());
        
        // Close modal when clicking outside
        this.noteModal.addEventListener('click', (e) => {
            if (e.target === this.noteModal) {
                this.closeModal();
            }
        });
    }

    async handleSearch() {
        const city = this.cityInput.value.trim();
        const state = this.stateInput.value.trim().toUpperCase();
        const category = this.categoryInput.value.trim();

        // Validation
        if (!city || !state || !category) {
            this.showError('Please fill in all fields');
            return;
        }

        if (state.length !== 2) {
            this.showError('Please enter a valid 2-letter state code');
            return;
        }

        this.clearError();
        this.setSearchLoading(true);

        try {
            const query = `${category} in ${city}, ${state}`;
            await this.searchBusinesses(query);
            this.updateStats();
            this.applyFiltersAndSort();
            this.showResults();
        } catch (error) {
            this.showError(`Search failed: ${error.message}`);
            console.error('Search error:', error);
        } finally {
            this.setSearchLoading(false);
        }
    }

    async searchBusinesses(query) {
        // Simulated API call - In production, use Google Maps Places API
        // This is a mock implementation for demonstration
        
        return new Promise((resolve) => {
            // Simulate API delay
            setTimeout(() => {
                this.businesses = this.generateMockBusinesses(query);
                resolve();
            }, 1500);
        });
    }

    generateMockBusinesses(query) {
        // Mock data generation for demonstration
        const mockBusinesses = [
            {
                id: '1',
                name: 'Premier Contracting Solutions',
                category: 'General Contractor',
                phone: '+1 (908) 555-0101',
                address: '123 Main St, Elizabeth, NJ 07201',
                rating: 4.8,
                reviews: 47,
                website: null,
                mapsUrl: 'https://maps.google.com/?q=Premier+Contracting',
                hasWebsite: false
            },
            {
                id: '2',
                name: 'Elite Plumbing & HVAC',
                category: 'Plumbing',
                phone: '+1 (908) 555-0102',
                address: '456 Oak Ave, Elizabeth, NJ 07202',
                rating: 4.6,
                reviews: 32,
                website: null,
                mapsUrl: 'https://maps.google.com/?q=Elite+Plumbing',
                hasWebsite: false
            },
            {
                id: '3',
                name: 'Quality Electrical Services',
                category: 'Electrical',
                phone: '+1 (908) 555-0103',
                address: '789 Pine Rd, Elizabeth, NJ 07203',
                rating: 4.9,
                reviews: 56,
                website: null,
                mapsUrl: 'https://maps.google.com/?q=Quality+Electrical',
                hasWebsite: false
            },
            {
                id: '4',
                name: 'Thompson Construction Co',
                category: 'General Contractor',
                phone: '+1 (908) 555-0104',
                address: '321 Elm St, Elizabeth, NJ 07201',
                rating: 4.5,
                reviews: 28,
                website: null,
                mapsUrl: 'https://maps.google.com/?q=Thompson+Construction',
                hasWebsite: false
            },
            {
                id: '5',
                name: 'Swift Roofing & Repair',
                category: 'Roofing',
                phone: '+1 (908) 555-0105',
                address: '654 Cedar Ln, Elizabeth, NJ 07204',
                rating: 4.7,
                reviews: 41,
                website: null,
                mapsUrl: 'https://maps.google.com/?q=Swift+Roofing',
                hasWebsite: false
            },
            {
                id: '6',
                name: 'Modern Home Renovations',
                category: 'Home Renovation',
                phone: '+1 (908) 555-0106',
                address: '987 Birch Dr, Elizabeth, NJ 07205',
                rating: 4.4,
                reviews: 19,
                website: null,
                mapsUrl: 'https://maps.google.com/?q=Modern+Home+Renovations',
                hasWebsite: false
            }
        ];

        return mockBusinesses;
    }

    updateStats() {
        const total = this.businesses.length;
        const contacted = Array.from(this.contactedIds).filter(id => 
            this.businesses.some(b => b.id === id)
        ).length;
        const notContacted = total - contacted;

        this.totalCountEl.textContent = total;
        this.contactedCountEl.textContent = contacted;
        this.notContactedCountEl.textContent = notContacted;
    }

    applyFiltersAndSort() {
        // Filter
        this.filteredBusinesses = this.businesses.filter(business => {
            if (this.excludedIds.has(business.id)) return false;
            
            if (this.currentFilter === 'contacted') {
                return this.contactedIds.has(business.id);
            } else if (this.currentFilter === 'not-contacted') {
                return !this.contactedIds.has(business.id);
            }
            return true;
        });

        // Sort
        this.filteredBusinesses.sort((a, b) => {
            switch (this.currentSort) {
                case 'rating-desc':
                    return b.rating - a.rating;
                case 'rating-asc':
                    return a.rating - b.rating;
                case 'name-asc':
                    return a.name.localeCompare(b.name);
                case 'name-desc':
                    return b.name.localeCompare(a.name);
                default:
                    return 0;
            }
        });

        this.renderResults();
    }

    renderResults() {
        this.resultsList.innerHTML = '';

        if (this.filteredBusinesses.length === 0) {
            this.noResults.classList.remove('hidden');
            return;
        }

        this.noResults.classList.add('hidden');

        this.filteredBusinesses.forEach(business => {
            const card = this.createBusinessCard(business);
            this.resultsList.appendChild(card);
        });
    }

    createBusinessCard(business) {
        const div = document.createElement('div');
        div.className = 'business-card';
        div.dataset.businessId = business.id;

        const isContacted = this.contactedIds.has(business.id);
        const note = this.notes.get(business.id) || '';

        div.innerHTML = `
            <div class="business-header">
                <div class="business-title">
                    <div class="business-name">${this.escapeHtml(business.name)}</div>
                    <div class="business-category">${this.escapeHtml(business.category)}</div>
                </div>
                <div class="rating-badge">
                    ⭐ ${business.rating} (${business.reviews})
                </div>
            </div>

            <div class="business-details">
                <div class="detail-item">
                    <div class="detail-icon">📱</div>
                    <div class="detail-content">
                        <div class="detail-label">Phone Number</div>
                        <div class="detail-text">
                            <a href="tel:${business.phone}" class="phone-link">${business.phone}</a>
                            <button class="copy-btn" data-copy="${business.phone}" title="Copy phone">📋</button>
                        </div>
                    </div>
                </div>

                <div class="detail-item">
                    <div class="detail-icon">📍</div>
                    <div class="detail-content">
                        <div class="detail-label">Address</div>
                        <div class="detail-text">${this.escapeHtml(business.address)}</div>
                    </div>
                </div>

                ${note ? `
                <div class="detail-item">
                    <div class="detail-icon">📝</div>
                    <div class="detail-content">
                        <div class="detail-label">Your Notes</div>
                        <div class="detail-text">${this.escapeHtml(note)}</div>
                    </div>
                </div>
                ` : ''}
            </div>

            <div style="display: flex; align-items: center; gap: 20px; margin-bottom: 16px; flex-wrap: wrap;">
                <label class="contact-checkbox">
                    <input type="checkbox" class="contact-check" ${isContacted ? 'checked' : ''}>
                    <span>Contacted</span>
                </label>
                ${note ? `<span style="font-size: 0.85rem; color: var(--text-secondary);">Has notes</span>` : ''}
            </div>

            <div class="business-actions">
                <a href="${business.mapsUrl}" target="_blank" class="action-btn">
                    🗺️ View on Maps
                </a>
                <button class="action-btn note-btn">
                    📝 ${note ? 'Edit' : 'Add'} Notes
                </button>
                <button class="action-btn delete">
                    🗑️ Remove
                </button>
            </div>
        `;

        // Event listeners
        const contactCheck = div.querySelector('.contact-check');
        contactCheck.addEventListener('change', () => {
            this.toggleContactStatus(business.id);
        });

        const noteBtn = div.querySelector('.note-btn');
        noteBtn.addEventListener('click', () => {
            this.openNoteModal(business.id);
        });

        const deleteBtn = div.querySelector('.action-btn.delete');
        deleteBtn.addEventListener('click', () => {
            this.removeBusiness(business.id);
        });

        const copyBtns = div.querySelectorAll('[data-copy]');
        copyBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                this.copyToClipboard(btn.dataset.copy);
            });
        });

        return div;
    }

    toggleContactStatus(businessId) {
        if (this.contactedIds.has(businessId)) {
            this.contactedIds.delete(businessId);
        } else {
            this.contactedIds.add(businessId);
        }
        this.saveToLocalStorage();
        this.updateStats();
    }

    removeBusiness(businessId) {
        if (confirm('Are you sure you want to remove this business?')) {
            this.excludedIds.add(businessId);
            this.saveToLocalStorage();
            this.applyFiltersAndSort();
            this.updateStats();
        }
    }

    openNoteModal(businessId) {
        this.currentEditingId = businessId;
        this.noteText.value = this.notes.get(businessId) || '';
        this.noteModal.classList.remove('hidden');
        this.noteText.focus();
    }

    closeModal() {
        this.noteModal.classList.add('hidden');
        this.currentEditingId = null;
    }

    saveNote() {
        if (this.currentEditingId) {
            const note = this.noteText.value.trim();
            if (note) {
                this.notes.set(this.currentEditingId, note);
            } else {
                this.notes.delete(this.currentEditingId);
            }
            this.saveToLocalStorage();
            this.applyFiltersAndSort();
            this.closeModal();
        }
    }

    copyToClipboard(text) {
        navigator.clipboard.writeText(text).then(() => {
            // Show temporary feedback
            const originalText = event.target.textContent;
            event.target.textContent = '✓ Copied!';
            setTimeout(() => {
                event.target.textContent = originalText;
            }, 1500);
        }).catch(() => {
            alert('Failed to copy to clipboard');
        });
    }

    exportToCSV() {
        if (this.filteredBusinesses.length === 0) {
            alert('No businesses to export');
            return;
        }

        const headers = ['Name', 'Category', 'Phone', 'Address', 'Rating', 'Website Status', 'Contacted', 'Notes', 'Google Maps URL'];
        const rows = this.filteredBusinesses.map(business => [
            business.name,
            business.category,
            business.phone,
            business.address,
            business.rating,
            business.hasWebsite ? 'Has Website' : 'No Website',
            this.contactedIds.has(business.id) ? 'Yes' : 'No',
            this.notes.get(business.id) || '',
            business.mapsUrl
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map(row => 
                row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
            )
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        
        link.setAttribute('href', url);
        link.setAttribute('download', `business-prospector-${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    showResults() {
        this.controlsSection.classList.remove('hidden');
        this.resultsSection.classList.remove('hidden');
    }

    showError(message) {
        this.errorMessage.textContent = message;
        this.errorMessage.classList.remove('hidden');
    }

    clearError() {
        this.errorMessage.classList.add('hidden');
    }

    setSearchLoading(isLoading) {
        this.searchBtn.disabled = isLoading;
        const loader = this.searchBtn.querySelector('.loader');
        const btnText = this.searchBtn.querySelector('.btn-text');
        
        if (isLoading) {
            loader.classList.remove('hidden');
            btnText.textContent = 'Searching...';
        } else {
            loader.classList.add('hidden');
            btnText.textContent = 'Search Businesses';
        }
    }

    saveToLocalStorage() {
        const data = {
            contacted: Array.from(this.contactedIds),
            excluded: Array.from(this.excludedIds),
            notes: Object.fromEntries(this.notes)
        };
        localStorage.setItem('businessProspectorData', JSON.stringify(data));
    }

    loadFromLocalStorage() {
        const stored = localStorage.getItem('businessProspectorData');
        if (stored) {
            try {
                const data = JSON.parse(stored);
                this.contactedIds = new Set(data.contacted || []);
                this.excludedIds = new Set(data.excluded || []);
                this.notes = new Map(Object.entries(data.notes || {}));
            } catch (error) {
                console.error('Error loading from localStorage:', error);
            }
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize the application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new BusinessProspector();
});
