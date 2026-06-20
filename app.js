// ============================================
// LEADFINDER PRO - MAIN APPLICATION
// ============================================

console.log('LeadFinder Pro v1.0 - Initializing...');

// ============================================
// GLOBAL STATE & CONFIGURATION
// ============================================

const CONFIG = {
    GOOGLE_API_KEY: 'AIzaSyCmqm0mhA4wWwfxigPsVUf-SceZ1KufPu4',
    API_LOAD_DELAY: 2000,
    STORAGE_KEYS: {
        SEARCHES: 'lf_recent_searches',
        BUSINESSES: 'lf_businesses',
        CONTACTED: 'lf_contacted',
        NOTES: 'lf_notes',
        EXCLUDED: 'lf_excluded',
        THEME: 'lf_theme'
    },
    MAX_RESULTS_PER_PAGE: 20,
    MAX_RECENT_SEARCHES: 5
};

let appState = {
    currentSearch: null,
    businesses: [],
    filteredBusinesses: [],
    nextPageToken: null,
    isSearching: false,
    sortBy: 'newest',
    filterNotContacted: false,
    selectedBusinessForNotes: null,
    placesService: null,
    mapsLoaded: false
};

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Escape HTML to prevent XSS attacks
 */
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Generate star rating HTML
 */
function generateStars(rating) {
    if (!rating) return '';
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;
    let stars = '★'.repeat(fullStars);
    if (hasHalfStar) stars += '½';
    return stars;
}

/**
 * Format phone number
 */
function formatPhoneNumber(phone) {
    if (!phone) return '';
    return phone.replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3');
}

/**
 * Extract domain from URL
 */
function extractDomain(url) {
    if (!url) return '';
    try {
        const domain = new URL(url).hostname;
        return domain.replace('www.', '');
    } catch (e) {
        return url;
    }
}

/**
 * Show toast notification
 */
function showToast(message, duration = 3000) {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toastMessage');
    toastMessage.textContent = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), duration);
}

/**
 * Debounce function
 */
function debounce(func, delay) {
    let timeoutId;
    return function (...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func.apply(this, args), delay);
    };
}

/**
 * Format date to readable string
 */
function formatDate(date) {
    return new Date(date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });
}

// ============================================
// LOCAL STORAGE MANAGEMENT
// ============================================

const Storage = {
    getBusinesses() {
        try {
            return JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.BUSINESSES)) || [];
        } catch {
            return [];
        }
    },

    saveBusinesses(businesses) {
        localStorage.setItem(CONFIG.STORAGE_KEYS.BUSINESSES, JSON.stringify(businesses));
    },

    getContacted() {
        try {
            return JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.CONTACTED)) || {};
        } catch {
            return {};
        }
    },

    saveContacted(contacted) {
        localStorage.setItem(CONFIG.STORAGE_KEYS.CONTACTED, JSON.stringify(contacted));
    },

    getNotes() {
        try {
            return JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.NOTES)) || {};
        } catch {
            return {};
        }
    },

    saveNotes(notes) {
        localStorage.setItem(CONFIG.STORAGE_KEYS.NOTES, JSON.stringify(notes));
    },

    getExcluded() {
        try {
            return JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.EXCLUDED)) || new Set();
        } catch {
            return new Set();
        }
    },

    saveExcluded(excluded) {
        localStorage.setItem(CONFIG.STORAGE_KEYS.EXCLUDED, JSON.stringify(Array.from(excluded)));
    },

    getRecentSearches() {
        try {
            return JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.SEARCHES)) || [];
        } catch {
            return [];
        }
    },

    addRecentSearch(search) {
        const searches = this.getRecentSearches();
        const searchStr = `${search.city}, ${search.state} - ${search.category}`;
        const filtered = searches.filter(s => s !== searchStr);
        const updated = [searchStr, ...filtered].slice(0, CONFIG.MAX_RECENT_SEARCHES);
        localStorage.setItem(CONFIG.STORAGE_KEYS.SEARCHES, JSON.stringify(updated));
    },

    getTheme() {
        return localStorage.getItem(CONFIG.STORAGE_KEYS.THEME) || 'light';
    },

    setTheme(theme) {
        localStorage.setItem(CONFIG.STORAGE_KEYS.THEME, theme);
    }
};

// ============================================
// DOM ELEMENTS
// ============================================

const DOM = {
    // Form
    searchForm: document.getElementById('searchForm'),
    cityInput: document.getElementById('cityInput'),
    stateInput: document.getElementById('stateInput'),
    categoryInput: document.getElementById('categoryInput'),
    searchBtn: document.getElementById('searchBtn'),
    resetBtn: document.getElementById('resetBtn'),
    
    // Sections
    emptyState: document.getElementById('emptyState'),
    noResultsState: document.getElementById('noResultsState'),
    resultsSection: document.getElementById('resultsSection'),
    resultsGrid: document.getElementById('resultsGrid'),
    filtersSection: document.getElementById('filtersSection'),
    
    // Stats
    totalStat: document.getElementById('totalStat'),
    contactedStat: document.getElementById('contactedStat'),
    pendingStat: document.getElementById('pendingStat'),
    resultsCount: document.getElementById('resultsCount'),
    
    // Controls
    sortSelect: document.getElementById('sortSelect'),
    contactedFilter: document.getElementById('contactedFilter'),
    clearFiltersBtn: document.getElementById('clearFiltersBtn'),
    exportBtn: document.getElementById('exportBtn'),
    themeToggle: document.getElementById('themeToggle'),
    
    // Loading
    loadingOverlay: document.getElementById('loadingOverlay'),
    paginationSection: document.getElementById('paginationSection'),
    loadMoreBtn: document.getElementById('loadMoreBtn'),
    
    // Modal
    notesModal: document.getElementById('notesModal'),
    notesTextarea: document.getElementById('notesTextarea'),
    notesBusinessName: document.getElementById('notesBusinessName'),
    notesBusinessAddress: document.getElementById('notesBusinessAddress'),
    saveNotesBtn: document.getElementById('saveNotesBtn'),
    cancelNotesBtn: document.getElementById('cancelNotesBtn'),
    closeModal: document.getElementById('closeModal'),
    modalOverlay: document.getElementById('modalOverlay'),
    
    // Confirm Modal
    confirmModal: document.getElementById('confirmModal'),
    confirmMessage: document.getElementById('confirmMessage'),
    confirmActionBtn: document.getElementById('confirmActionBtn'),
    confirmCancelBtn: document.getElementById('confirmCancelBtn'),
    confirmOverlay: document.getElementById('confirmOverlay'),
    
    // Recent searches
    recentSearches: document.getElementById('recentSearches'),
    recentItems: document.getElementById('recentItems')
};

// ============================================
// GOOGLE MAPS API
// ============================================

function initGoogleMaps() {
    console.log('Initializing Google Maps API...');
    
    setTimeout(() => {
        if (typeof google !== 'undefined' && google.maps) {
            console.log('Google Maps API loaded successfully');
            
            // Create a dummy map element for PlacesService
            const mapContainer = document.createElement('div');
            mapContainer.style.display = 'none';
            document.body.appendChild(mapContainer);
            
            const map = new google.maps.Map(mapContainer);
            appState.placesService = new google.maps.places.PlacesService(map);
            appState.mapsLoaded = true;
            
            console.log('PlacesService initialized');
        } else {
            console.error('Google Maps API not loaded');
            showToast('Error: Google Maps API failed to load');
        }
    }, CONFIG.API_LOAD_DELAY);
}

// ============================================
// SEARCH FUNCTIONALITY
// ============================================

function validateSearchInputs() {
    const city = DOM.cityInput.value.trim();
    const state = DOM.stateInput.value.trim();
    const category = DOM.categoryInput.value.trim();
    
    let isValid = true;
    
    // Clear previous errors
    document.querySelectorAll('.error-message').forEach(el => el.classList.remove('show'));
    document.querySelectorAll('.form-input').forEach(el => el.classList.remove('error'));
    
    if (!city) {
        showInputError('cityInput', 'cityError', 'City is required');
        isValid = false;
    }
    if (!state) {
        showInputError('stateInput', 'stateError', 'State is required');
        isValid = false;
    }
    if (!category) {
        showInputError('categoryInput', 'categoryError', 'Business category is required');
        isValid = false;
    }
    
    return isValid;
}

function showInputError(inputId, errorId, message) {
    document.getElementById(inputId).classList.add('error');
    const errorEl = document.getElementById(errorId);
    errorEl.textContent = message;
    errorEl.classList.add('show');
}

async function searchBusinesses(query, pageToken = null) {
    if (!appState.mapsLoaded) {
        showToast('Google Maps API is still loading. Please try again.');
        console.warn('PlacesService not ready');
        return;
    }
    
    appState.isSearching = true;
    DOM.loadingOverlay.style.display = 'flex';
    
    console.log('Starting business search:', { query, pageToken });
    
    const request = {
        query: query,
        fields: ['name', 'formatted_address', 'formatted_phone_number', 'website', 'rating', 'user_ratings_total', 'photos', 'place_id', 'opening_hours'],
        pageToken: pageToken || undefined
    };
    
    appState.placesService.textSearch(request, (results, status, pagination) => {
        console.log('Search status:', status, 'Results count:', results ? results.length : 0);
        
        DOM.loadingOverlay.style.display = 'none';
        appState.isSearching = false;
        
        if (status === google.maps.places.PlacesServiceStatus.OK && results) {
            console.log('Search successful. Results:', results.length);
            
            const excluded = Storage.getExcluded();
            const filtered = results.filter(r => !excluded.has(r.place_id));
            
            if (!pageToken) {
                appState.businesses = filtered;
            } else {
                appState.businesses = [...appState.businesses, ...filtered];
            }
            
            // Save businesses to localStorage
            Storage.saveBusinesses(appState.businesses);
            
            appState.nextPageToken = pagination?.hasNextPage ? pagination.nextPageToken : null;
            
            displayResults();
            updateStats();
            showToast(`Found ${appState.businesses.length} businesses`);
        } else if (status === google.maps.places.PlacesServiceStatus.ZERO_RESULTS) {
            console.log('No results found');
            if (!pageToken) {
                appState.businesses = [];
            }
            DOM.noResultsState.style.display = 'block';
            DOM.resultsSection.style.display = 'none';
            showToast('No businesses found. Try adjusting your search.');
        } else {
            console.error('Search error:', status);
            const errorMessages = {
                'OVER_QUERY_LIMIT': 'API quota exceeded. Please try again later.',
                'REQUEST_DENIED': 'Search request was denied. Check API configuration.',
                'INVALID_REQUEST': 'Invalid search request.',
                'UNKNOWN_ERROR': 'An unknown error occurred.'
            };
            const message = errorMessages[status] || `Search error: ${status}`;
            showToast(message);
        }
    });
}

// ============================================
// RESULTS DISPLAY
// ============================================

function displayResults() {
    DOM.noResultsState.style.display = 'none';
    DOM.emptyState.style.display = 'none';
    DOM.resultsSection.style.display = 'block';
    DOM.filtersSection.style.display = 'block';
    
    filterAndSortResults();
    renderBusinessCards();
    
    // Update pagination
    if (appState.nextPageToken) {
        DOM.paginationSection.style.display = 'block';
    } else {
        DOM.paginationSection.style.display = 'none';
    }
}

function filterAndSortResults() {
    let filtered = [...appState.businesses];
    
    // Apply filters
    if (appState.filterNotContacted) {
        const contacted = Storage.getContacted();
        filtered = filtered.filter(b => !contacted[b.place_id]);
    }
    
    // Apply sorting
    filtered.sort((a, b) => {
        switch (appState.sortBy) {
            case 'rating-high':
                return (b.rating || 0) - (a.rating || 0);
            case 'rating-low':
                return (a.rating || 0) - (b.rating || 0);
            case 'reviews':
                return (b.user_ratings_total || 0) - (a.user_ratings_total || 0);
            case 'newest':
            default:
                return 0;
        }
    });
    
    appState.filteredBusinesses = filtered;
}

function renderBusinessCards() {
    DOM.resultsGrid.innerHTML = '';
    DOM.resultsCount.textContent = `${appState.filteredBusinesses.length} results`;
    
    const contacted = Storage.getContacted();
    const notes = Storage.getNotes();
    
    appState.filteredBusinesses.forEach(business => {
        const isContacted = contacted[business.place_id] || false;
        const businessNotes = notes[business.place_id] || '';
        
        const card = document.createElement('div');
        card.className = 'business-card';
        
        // Build image HTML
        let imageHtml = '';
        if (business.photos && business.photos.length > 0) {
            const photoUrl = business.photos[0].getUrl({ maxWidth: 400, maxHeight: 300 });
            imageHtml = `<img src="${photoUrl}" alt="${escapeHtml(business.name)}" class="business-image" loading="lazy">`;
        } else {
            imageHtml = '<div class="business-image placeholder">🏢</div>';
        }
        
        // Build rating HTML
        let ratingHtml = '';
        if (business.rating) {
            ratingHtml = `
                <div class="business-rating">
                    <span class="stars">${generateStars(business.rating)}</span>
                    <span class="rating-text">${business.rating.toFixed(1)} (${business.user_ratings_total || 0})</span>
                </div>
            `;
        }
        
        // Build phone HTML
        let phoneHtml = '';
        if (business.formatted_phone_number) {
            phoneHtml = `
                <div class="business-phone">
                    <a href="tel:${business.formatted_phone_number.replace(/\D/g, '')}">${escapeHtml(business.formatted_phone_number)}</a>
                </div>
            `;
        }
        
        // Build website HTML
        let websiteHtml = '';
        if (business.website) {
            const domain = extractDomain(business.website);
            websiteHtml = `
                <div class="business-website">
                    <a href="${escapeHtml(business.website)}" target="_blank" rel="noopener noreferrer">${escapeHtml(domain)}</a>
                </div>
            `;
        }
        
        // Build hours HTML
        let hoursHtml = '';
        if (business.opening_hours) {
            const isOpen = business.opening_hours.isOpen();
            const status = isOpen ? '✅ Open' : '❌ Closed';
            hoursHtml = `<div class="business-hours">${status}</div>`;
        }
        
        card.innerHTML = `
            ${imageHtml}
            <div class="business-content">
                <div class="business-header">
                    <h3 class="business-name">${escapeHtml(business.name)}</h3>
                    ${ratingHtml}
                </div>
                <div class="business-address">${escapeHtml(business.formatted_address || 'Address not available')}</div>
                <div class="business-info">
                    ${phoneHtml}
                    ${websiteHtml}
                </div>
                ${hoursHtml}
                <div class="business-actions">
                    <button class="action-btn contact-btn ${isContacted ? 'contacted' : ''}" data-place-id="${business.place_id}">
                        ${isContacted ? '✅ Contacted' : '⭕ Mark Contacted'}
                    </button>
                    <button class="action-btn notes-btn" data-place-id="${business.place_id}" title="Add/Edit notes">
                        ${businessNotes ? '📝 Notes' : '📄 Add Note'}
                    </button>
                    <button class="action-btn exclude-btn" data-place-id="${business.place_id}" title="Exclude from results">
                        🗑️ Exclude
                    </button>
                </div>
            </div>
        `;
        
        DOM.resultsGrid.appendChild(card);
    });
    
    attachCardEventListeners();
}

function attachCardEventListeners() {
    // Contact buttons
    document.querySelectorAll('.contact-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const placeId = this.dataset.placeId;
            toggleContacted(placeId);
        });
    });
    
    // Notes buttons
    document.querySelectorAll('.notes-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const placeId = this.dataset.placeId;
            openNotesModal(placeId);
        });
    });
    
    // Exclude buttons
    document.querySelectorAll('.exclude-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const placeId = this.dataset.placeId;
            excludeBusiness(placeId);
        });
    });
}

// ============================================
// BUSINESS ACTIONS
// ============================================

function toggleContacted(placeId) {
    const contacted = Storage.getContacted();
    contacted[placeId] = !contacted[placeId];
    Storage.saveContacted(contacted);
    updateStats();
    renderBusinessCards();
    showToast(contacted[placeId] ? 'Marked as contacted' : 'Marked as not contacted');
    console.log(`Toggled contacted status for ${placeId}`);
}

function openNotesModal(placeId) {
    const business = appState.businesses.find(b => b.place_id === placeId);
    if (!business) return;
    
    appState.selectedBusinessForNotes = placeId;
    DOM.notesBusinessName.textContent = business.name;
    DOM.notesBusinessAddress.textContent = business.formatted_address || '';
    
    const notes = Storage.getNotes();
    DOM.notesTextarea.value = notes[placeId] || '';
    
    DOM.notesModal.classList.add('active');
    DOM.notesTextarea.focus();
}

function saveNotes() {
    const placeId = appState.selectedBusinessForNotes;
    if (!placeId) return;
    
    const notes = Storage.getNotes();
    notes[placeId] = DOM.notesTextarea.value;
    Storage.saveNotes(notes);
    
    closeNotesModal();
    renderBusinessCards();
    showToast('Notes saved successfully');
    console.log(`Saved notes for ${placeId}`);
}

function closeNotesModal() {
    DOM.notesModal.classList.remove('active');
    appState.selectedBusinessForNotes = null;
    DOM.notesTextarea.value = '';
}

function excludeBusiness(placeId) {
    openConfirmModal('Are you sure you want to exclude this business?', () => {
        const excluded = Storage.getExcluded();
        excluded.add(placeId);
        Storage.saveExcluded(excluded);
        
        appState.businesses = appState.businesses.filter(b => b.place_id !== placeId);
        Storage.saveBusinesses(appState.businesses);
        
        displayResults();
        updateStats();
        showToast('Business excluded');
        console.log(`Excluded business ${placeId}`);
    });
}

// ============================================
// STATISTICS
// ============================================

function updateStats() {
    const contacted = Storage.getContacted();
    const contactedCount = appState.businesses.filter(b => contacted[b.place_id]).length;
    const total = appState.businesses.length;
    const notContacted = total - contactedCount;
    
    DOM.totalStat.textContent = total;
    DOM.contactedStat.textContent = contactedCount;
    DOM.pendingStat.textContent = notContacted;
    
    console.log('Stats updated:', { total, contacted: contactedCount, pending: notContacted });
}

// ============================================
// MODALS
// ============================================

function openConfirmModal(message, onConfirm) {
    DOM.confirmMessage.textContent = message;
    DOM.confirmModal.classList.add('active');
    
    const handler = () => {
        onConfirm();
        closeConfirmModal();
        DOM.confirmActionBtn.removeEventListener('click', handler);
    };
    
    DOM.confirmActionBtn.addEventListener('click', handler);
}

function closeConfirmModal() {
    DOM.confirmModal.classList.remove('active');
}

// ============================================
// EXPORT FUNCTIONALITY
// ============================================

function exportToCSV() {
    if (appState.businesses.length === 0) {
        showToast('No data to export');
        return;
    }
    
    const contacted = Storage.getContacted();
    const notes = Storage.getNotes();
    
    // Define CSV headers
    const headers = ['Business Name', 'Address', 'Phone', 'Website', 'Rating', 'Reviews', 'Status', 'Notes'];
    
    // Create CSV rows
    const rows = appState.businesses.map(business => [
        `"${business.name.replace(/"/g, '""')}"`,
        `"${(business.formatted_address || '').replace(/"/g, '""')}"`,
        `"${(business.formatted_phone_number || '').replace(/"/g, '""')}"`,
        `"${(business.website || '').replace(/"/g, '""')}"`,
        business.rating || '',
        business.user_ratings_total || '',
        contacted[business.place_id] ? 'Contacted' : 'Not Contacted',
        `"${(notes[business.place_id] || '').replace(/"/g, '""')}"`
    ]);
    
    // Combine headers and rows
    const csv = [
        headers.join(','),
        ...rows.map(row => row.join(','))
    ].join('\n');
    
    // Download CSV
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `leadfinder_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    
    showToast('CSV exported successfully');
    console.log('CSV exported with', appState.businesses.length, 'businesses');
}

// ============================================
// THEME TOGGLE
// ============================================

function toggleTheme() {
    const isDark = document.body.classList.toggle('dark-mode');
    Storage.setTheme(isDark ? 'dark' : 'light');
    updateThemeIcon();
    console.log('Theme toggled to:', isDark ? 'dark' : 'light');
}

function updateThemeIcon() {
    const icon = DOM.themeToggle.querySelector('.theme-icon');
    const isDark = document.body.classList.contains('dark-mode');
    icon.textContent = isDark ? '☀️' : '🌙';
}

// ============================================
// RECENT SEARCHES
// ============================================

function updateRecentSearches() {
    const searches = Storage.getRecentSearches();
    if (searches.length === 0) {
        DOM.recentSearches.style.display = 'none';
        return;
    }
    
    DOM.recentSearches.style.display = 'block';
    DOM.recentItems.innerHTML = '';
    
    searches.forEach(search => {
        const item = document.createElement('button');
        item.className = 'recent-item';
        item.textContent = search;
        item.type = 'button';
        item.addEventListener('click', () => {
            const [location, category] = search.split(' - ');
            const [city, state] = location.split(', ');
            DOM.cityInput.value = city;
            DOM.stateInput.value = state;
            DOM.categoryInput.value = category;
            DOM.searchForm.dispatchEvent(new Event('submit'));
        });
        DOM.recentItems.appendChild(item);
    });
}

// ============================================
// EVENT LISTENERS
// ============================================

// Search form
DOM.searchForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    if (!validateSearchInputs()) return;
    
    const city = DOM.cityInput.value.trim();
    const state = DOM.stateInput.value.trim();
    const category = DOM.categoryInput.value.trim();
    
    appState.currentSearch = { city, state, category };
    Storage.addRecentSearch({ city, state, category });
    updateRecentSearches();
    
    const query = `${category} in ${city}, ${state}`;
    console.log('Search initiated:', query);
    
    appState.nextPageToken = null;
    searchBusinesses(query);
});

DOM.resetBtn.addEventListener('click', () => {
    DOM.cityInput.value = '';
    DOM.stateInput.value = '';
    DOM.categoryInput.value = '';
    appState.businesses = [];
    appState.filteredBusinesses = [];
    DOM.resultsSection.style.display = 'none';
    DOM.filtersSection.style.display = 'none';
    DOM.noResultsState.style.display = 'none';
    DOM.emptyState.style.display = 'block';
    updateStats();
});

// Filters
DOM.sortSelect.addEventListener('change', (e) => {
    appState.sortBy = e.target.value;
    displayResults();
});

DOM.contactedFilter.addEventListener('change', (e) => {
    appState.filterNotContacted = e.target.checked;
    displayResults();
});

DOM.clearFiltersBtn.addEventListener('click', () => {
    DOM.sortSelect.value = 'newest';
    DOM.contactedFilter.checked = false;
    appState.sortBy = 'newest';
    appState.filterNotContacted = false;
    displayResults();
});

// Load More
DOM.loadMoreBtn.addEventListener('click', () => {
    if (appState.nextPageToken && !appState.isSearching) {
        const query = `${appState.currentSearch.category} in ${appState.currentSearch.city}, ${appState.currentSearch.state}`;
        searchBusinesses(query, appState.nextPageToken);
    }
});

// Export
DOM.exportBtn.addEventListener('click', exportToCSV);

// Theme
DOM.themeToggle.addEventListener('click', toggleTheme);

// Modal controls
DOM.closeModal.addEventListener('click', closeNotesModal);
DOM.cancelNotesBtn.addEventListener('click', closeNotesModal);
DOM.saveNotesBtn.addEventListener('click', saveNotes);
DOM.modalOverlay.addEventListener('click', closeNotesModal);

DOM.confirmCancelBtn.addEventListener('click', closeConfirmModal);
DOM.confirmOverlay.addEventListener('click', closeConfirmModal);

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeNotesModal();
        closeConfirmModal();
    }
    if (e.key === 'Enter' && e.ctrlKey) {
        if (DOM.notesModal.classList.contains('active')) {
            saveNotes();
        }
    }
});

// ============================================
// INITIALIZATION
// ============================================

function initApp() {
    console.log('Initializing LeadFinder Pro...');
    
    // Load theme preference
    const theme = Storage.getTheme();
    if (theme === 'dark') {
        document.body.classList.add('dark-mode');
    }
    updateThemeIcon();
    
    // Initialize Google Maps
    initGoogleMaps();
    
    // Load and display recent searches
    updateRecentSearches();
    
    // Initialize stats
    updateStats();
    
    // Restore previous search if exists
    const saved = Storage.getBusinesses();
    if (saved.length > 0) {
        appState.businesses = saved;
        appState.filteredBusinesses = saved;
    }
    
    console.log('LeadFinder Pro initialized successfully');
}

// Start the app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}

// ============================================
// END OF APPLICATION
// ============================================
