// Replace with your Google Maps API key
const API_KEY = AIzaSyCmqm0mhA4wWwfxigPsVUfSceZ1KufPu4;
const RESULTS_PER_PAGE = 100;

// Business Prospector App
class BusinessProspector {
    constructor() {
        this.businesses = [];
        this.allSearchResults = []; // Store all results from API
        this.currentPage = 1;
        this.nextPageToken = null;
        this.contactStatus = {};
        this.businessNotes = {};
        this.excludedBusinesses = new Set();
        this.currentSearch = { city: '', state: '', category: '' };
        
        this.initElements();
        this.loadFromStorage();
        this.attachEventListeners();
    }

    initElements() {
        this.cityInput = document.getElementById('city');
        this.stateInput = document.getElementById('state');
        this.categoryInput = document.getElementById('category');
        this.searchBtn = document.getElementById('searchBtn');
        this.spinner = document.getElementById('loadingSpinner');
        this.container = document.getElementById('businessesContainer');
        this.filterSelect = document.getElementById('filterStatus');
        this.sortSelect = document.getElementById('sortBy');
        this.exportBtn = document.getElementById('exportBtn');
        this.clearDataBtn = document.getElementById('clearDataBtn');
        this.notesModal = document.getElementById('notesModal');
        this.saveNotesBtn = document.getElementById('saveNotesBtn');
        this.cancelNotesBtn = document.getElementById('cancelNotesBtn');
        this.notesText = document.getElementById('notesText');
        this.loadMoreSection = document.querySelector('.load-more-section');
        this.btnLoadMore = document.querySelector('.btn-load-more');
    }

    attachEventListeners() {
        this.searchBtn.addEventListener('click', () => this.newSearch());
        this.filterSelect.addEventListener('change', () => this.render());
        this.sortSelect.addEventListener('change', () => this.render());
        this.exportBtn.addEventListener('click', () => this.exportCSV());
        this.clearDataBtn.addEventListener('click', () => this.clearAllData());
        this.cancelNotesBtn.addEventListener('click', () => this.closeNotesModal());
        this.saveNotesBtn.addEventListener('click', () => this.saveNotes());
        
        document.querySelector('.close-btn').addEventListener('click', () => this.closeNotesModal());
        
        if (this.btnLoadMore) {
            this.btnLoadMore.addEventListener('click', () => this.loadMore());
        }
        
        this.cityInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.newSearch();
        });
        this.stateInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.newSearch();
        });
        this.categoryInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.newSearch();
        });
    }

    newSearch() {
        const city = this.cityInput.value.trim();
        const state = this.stateInput.value.trim();
        const category = this.categoryInput.value.trim();

        if (!city || !state || !category) {
            alert('Please fill in all fields');
            return;
        }

        this.currentSearch = { city, state, category };
        this.currentPage = 1;
        this.allSearchResults = [];
        this.nextPageToken = null;
        this.businesses = [];
        
        this.search();
    }

    search() {
        this.spinner.style.display = 'block';

        try {
            const { city, state, category } = this.currentSearch;
            const service = new google.maps.places.PlacesService(
                document.createElement('div')
            );

            const request = {
                query: `${category} in ${city}, ${state}`,
                type: 'establishment',
            };

            // Add pagination token if available
            if (this.nextPageToken) {
                request.pageToken = this.nextPageToken;
            }

            service.textSearch(request, (results, status, pagination) => {
                this.spinner.style.display = 'none';

                if (status === google.maps.places.PlacesServiceStatus.OK) {
                    // Add results to all search results
                    const processedResults = results.map((place) => ({
                        id: place.place_id,
                        name: place.name,
                        category: category,
                        rating: place.rating || 'N/A',
                        address: place.formatted_address,
                        phone: place.formatted_phone_number || 'Not available',
                        website: place.website || 'No website',
                        placeId: place.place_id,
                    }));

                    this.allSearchResults.push(...processedResults);
                    
                    // Store pagination token for next page
                    if (pagination && pagination.hasNextPage) {
                        this.nextPageToken = pagination.nextPageToken;
                    } else {
                        this.nextPageToken = null;
                    }

                    // Show only first 100 results
                    this.businesses = this.allSearchResults.slice(0, RESULTS_PER_PAGE);
                    this.render();

                } else if (status === google.maps.places.PlacesServiceStatus.ZERO_RESULTS) {
                    alert('No businesses found. Try different search terms.');
                    this.render();
                } else {
                    alert(`Search error: ${status}`);
                }
            });
        } catch (error) {
            this.spinner.style.display = 'none';
            console.error('Search error:', error);
            alert('Error during search. Make sure your API key is valid.');
        }
    }

    loadMore() {
        if (!this.nextPageToken) {
            alert('No more results available');
            return;
        }

        this.btnLoadMore.disabled = true;
        this.btnLoadMore.textContent = 'Loading...';
        
        this.search();
        
        // After search completes, update view
        setTimeout(() => {
            this.businesses = this.allSearchResults.slice(0, this.allSearchResults.length);
            this.render();
            this.btnLoadMore.disabled = false;
            this.btnLoadMore.textContent = `Load More Results (${Math.min(RESULTS_PER_PAGE, this.allSearchResults.length - RESULTS_PER_PAGE)} remaining)`;
        }, 1000);
    }

    render() {
        let filtered = this.businesses.filter(b => !this.excludedBusinesses.has(b.id));

        const status = this.filterSelect.value;
        if (status === 'contacted') {
            filtered = filtered.filter(b => this.contactStatus[b.id]);
        } else if (status === 'not-contacted') {
            filtered = filtered.filter(b => !this.contactStatus[b.id]);
        }

        const sortBy = this.sortSelect.value;
        if (sortBy === 'rating') {
            filtered.sort((a, b) => {
                const ratingA = typeof a.rating === 'number' ? a.rating : 0;
                const ratingB = typeof b.rating === 'number' ? b.rating : 0;
                return ratingB - ratingA;
            });
        } else if (sortBy === 'name') {
            filtered.sort((a, b) => a.name.localeCompare(b.name));
        }

        this.updateStats();
        this.updateLoadMoreSection();

        if (filtered.length === 0) {
            this.container.innerHTML = `
                <div class="empty-message">
                    <div class="empty-message-icon">🔍</div>
                    <p>No businesses found matching your criteria</p>
                </div>
            `;
            return;
        }

        this.container.innerHTML = filtered.map(business => `
            <div class="business-card">
                <div class="business-name">${this.escapeHtml(business.name)}</div>
                <div class="business-category">${this.escapeHtml(business.category)}</div>
                <div class="business-rating">
                    ⭐ ${typeof business.rating === 'number' ? business.rating.toFixed(1) : business.rating}
                    <span>${business.rating !== 'N/A' ? '(Google Reviews)' : ''}</span>
                </div>
                <div class="business-info">
                    <div class="business-contact">
                        <strong>Phone:</strong>
                        <span>${this.escapeHtml(business.phone)}</span>
                    </div>
                    <div class="business-contact">
                        <strong>Website:</strong>
                        ${business.website === 'No website' 
                            ? `<span style="color: #e74c3c;">${business.website}</span>` 
                            : `<a href="${this.escapeHtml(business.website)}" target="_blank">${this.escapeHtml(business.website)}</a>`
                        }
                    </div>
                    <div class="business-address">
                        <strong>Address:</strong>
                        <span>${this.escapeHtml(business.address)}</span>
                    </div>
                    ${this.businessNotes[business.id] ? `
                        <div class="business-notes-display">
                            <strong>📝 Your Notes:</strong>
                            ${this.escapeHtml(this.businessNotes[business.id])}
                        </div>
                    ` : ''}
                </div>
                <div class="business-actions">
                    <button class="action-btn btn-contacted ${this.contactStatus[business.id] ? 'active' : ''}" 
                        onclick="app.toggleContacted('${business.id}')">
                        ${this.contactStatus[business.id] ? '✓ Contacted' : '📞 Mark Contacted'}
                    </button>
                    <button class="action-btn btn-notes" onclick="app.openNotesModal('${business.id}', '${this.escapeHtml(business.name)}')">
                        📝 Notes
                    </button>
                    <button class="action-btn btn-maps" onclick="window.open('https://www.google.com/maps/place/?q=place_id:${business.placeId}', '_blank')">
                        🗺️ Maps
                    </button>
                    <button class="action-btn btn-exclude" onclick="app.excludeBusiness('${business.id}')">
                        ✕ Exclude
                    </button>
                </div>
            </div>
        `).join('');

        // Scroll to businesses
        this.container.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    updateLoadMoreSection() {
        if (!this.loadMoreSection) return;

        const totalLoaded = this.allSearchResults.length;
        const hasMore = this.nextPageToken !== null;

        if (totalLoaded >= RESULTS_PER_PAGE && hasMore) {
            this.loadMoreSection.classList.add('show');
            const remaining = Math.min(RESULTS_PER_PAGE, 
                this.allSearchResults.length + RESULTS_PER_PAGE);
            this.loadMoreSection.innerHTML = `
                <div class="load-more-info">
                    Showing <strong>${Math.min(RESULTS_PER_PAGE, this.allSearchResults.length)}</strong> of <strong>100+</strong> results
                </div>
                <button class="btn-load-more" onclick="app.loadMore()">
                    Load 100 More Results
                </button>
            `;
        } else if (totalLoaded >= RESULTS_PER_PAGE && !hasMore) {
            this.loadMoreSection.classList.add('show');
            this.loadMoreSection.innerHTML = `
                <div class="load-more-info">
                    Showing all <strong>${totalLoaded}</strong> results
                </div>
            `;
        } else {
            this.loadMoreSection.classList.remove('show');
        }
    }

    toggleContacted(businessId) {
        this.contactStatus[businessId] = !this.contactStatus[businessId];
        this.saveToStorage();
        this.render();
    }

    openNotesModal(businessId, businessName) {
        this.currentEditingId = businessId;
        this.notesText.value = this.businessNotes[businessId] || '';
        this.notesModal.classList.add('show');
        document.querySelector('.modal-header h2').textContent = `Notes for ${businessName}`;
        this.notesText.focus();
    }

    closeNotesModal() {
        this.notesModal.classList.remove('show');
    }

    saveNotes() {
        if (this.currentEditingId) {
            const notes = this.notesText.value.trim();
            if (notes) {
                this.businessNotes[this.currentEditingId] = notes;
            } else {
                delete this.businessNotes[this.currentEditingId];
            }
            this.saveToStorage();
            this.closeNotesModal();
            this.render();
        }
    }

    excludeBusiness(businessId) {
        this.excludedBusinesses.add(businessId);
        this.saveToStorage();
        this.render();
    }

    updateStats() {
        const total = this.businesses.filter(b => !this.excludedBusinesses.has(b.id)).length;
        const contacted = this.businesses.filter(
            b => !this.excludedBusinesses.has(b.id) && this.contactStatus[b.id]
        ).length;
        const notContacted = total - contacted;

        document.getElementById('totalCount').textContent = total;
        document.getElementById('contactedCount').textContent = contacted;
        document.getElementById('notContactedCount').textContent = notContacted;
    }

    exportCSV() {
        if (this.allSearchResults.length === 0) {
            alert('No businesses to export');
            return;
        }

        let csv = 'Name,Category,Rating,Phone,Website,Address,Status,Notes\n';

        this.allSearchResults.forEach(business => {
            const status = this.contactStatus[business.id] ? 'Contacted' : 'Not Contacted';
            const notes = (this.businessNotes[business.id] || '').replace(/"/g, '""');
            
            csv += `"${business.name.replace(/"/g, '""')}","${business.category}","${business.rating}","${business.phone}","${business.website}","${business.address}","${status}","${notes}"\n`;
        });

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        
        link.setAttribute('href', url);
        link.setAttribute('download', `businesses-${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    clearAllData() {
        if (confirm('Are you sure you want to clear all data? This cannot be undone.')) {
            this.businesses = [];
            this.allSearchResults = [];
            this.contactStatus = {};
            this.businessNotes = {};
            this.excludedBusinesses.clear();
            this.currentPage = 1;
            this.nextPageToken = null;
            this.currentSearch = { city: '', state: '', category: '' };
            
            this.saveToStorage();
            this.render();
        }
    }

    escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, m => map[m]);
    }

    saveToStorage() {
        localStorage.setItem('businesses', JSON.stringify(this.businesses));
        localStorage.setItem('allSearchResults', JSON.stringify(this.allSearchResults));
        localStorage.setItem('contactStatus', JSON.stringify(this.contactStatus));
        localStorage.setItem('businessNotes', JSON.stringify(this.businessNotes));
        localStorage.setItem('excludedBusinesses', JSON.stringify(Array.from(this.excludedBusinesses)));
        localStorage.setItem('currentSearch', JSON.stringify(this.currentSearch));
        localStorage.setItem('currentPage', this.currentPage);
    }

    loadFromStorage() {
        this.businesses = JSON.parse(localStorage.getItem('businesses') || '[]');
        this.allSearchResults = JSON.parse(localStorage.getItem('allSearchResults') || '[]');
        this.contactStatus = JSON.parse(localStorage.getItem('contactStatus') || '{}');
        this.businessNotes = JSON.parse(localStorage.getItem('businessNotes') || '{}');
        this.excludedBusinesses = new Set(JSON.parse(localStorage.getItem('excludedBusinesses') || '[]'));
        this.currentSearch = JSON.parse(localStorage.getItem('currentSearch') || '{"city":"","state":"","category":""}');
        this.currentPage = parseInt(localStorage.getItem('currentPage') || '1');
    }
}

// Initialize app when DOM is ready
let app;
document.addEventListener('DOMContentLoaded', () => {
    // Check if API key is set
    if (API_KEY === 'YOUR_GOOGLE_MAPS_API_KEY') {
        alert('⚠️ Please set your Google Maps API key in app.js before using this app.\n\nInstructions:\n1. Go to Google Cloud Console (console.cloud.google.com)\n2. Create a new project\n3. Enable these APIs: Places API, Maps JavaScript API, Geocoding API\n4. Create an API Key (Credentials)\n5. Copy the key and replace "YOUR_GOOGLE_MAPS_API_KEY" in app.js\n\nYour key should look like: AIzaSyD...');
        return;
    }
    
    app = new BusinessProspector();
});
