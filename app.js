// Google Maps API Key
const GOOGLE_API_KEY = 'AIzaSyCmqm0mhA4wWwfxigPsVUf-SceZ1KufPu4';

// Rest of your app.js code...


// app.js - LeadFinder Pro Business Scraper
// Complete application logic with phone number display

const API_KEY = 'AIzaSyCmqm0mhA4wWwfxigPsVUf-SceZ1KufPu4';

// ============================================
// Business Management
// ============================================

function displayBusinesses(businesses) {
    const container = document.getElementById('businessResults');
    
    if (!businesses || businesses.length === 0) {
        container.innerHTML = '<p class="no-results">No businesses found. Try a different search.</p>';
        updateStats(0, 0);
        return;
    }

    container.innerHTML = businesses.map((business, index) => {
        const isContacted = isBusinessContacted(business.place_id);
        const isExcluded = isBusinessExcluded(business.place_id);
        const note = getBusinessNote(business.place_id);

        return `
            <div class="business-card ${isContacted ? 'contacted' : ''} ${isExcluded ? 'excluded' : ''}">
                <div class="business-header">
                    <h3>${escapeHtml(business.name)}</h3>
                    ${business.rating ? `<span class="rating">⭐ ${business.rating}</span>` : ''}
                </div>

                ${business.formatted_phone_number ? `
                    <div class="business-phone">
                        📞 <a href="tel:${business.formatted_phone_number}">${business.formatted_phone_number}</a>
                    </div>
                ` : ''}

                <div class="business-details">
                    ${business.formatted_address ? `<p><strong>📍 Address:</strong> ${escapeHtml(business.formatted_address)}</p>` : ''}
                    ${business.website ? `<p><strong>🌐 Website:</strong> <a href="${business.website}" target="_blank">Visit</a></p>` : ''}
                    ${business.opening_hours ? `
                        <p><strong>🕐 Hours:</strong> 
                            ${business.opening_hours.open_now ? '<span class="open">Open</span>' : '<span class="closed">Closed</span>'}
                        </p>
                    ` : ''}
                </div>

                ${note ? `
                    <div class="business-note">
                        <strong>📝 Note:</strong> ${escapeHtml(note)}
                    </div>
                ` : ''}

                <div class="business-buttons">
                    <button class="btn-contact ${isContacted ? 'contacted' : ''}" 
                            onclick="toggleContacted('${business.place_id}', '${escapeHtml(business.name)}')">
                        ${isContacted ? '✓ Contacted' : 'Contact'}
                    </button>
                </div>
            </div>
        `;
    }).join('');

    // Update stats
    const contactedCount = businesses.filter(b => isBusinessContacted(b.place_id)).length;
    updateStats(businesses.length, contactedCount);
}

// ============================================
// Contact Management
// ============================================

function toggleContacted(placeId, businessName) {
    const contacted = getContactedBusinesses();
    
    if (contacted.includes(placeId)) {
        // Remove from contacted
        const index = contacted.indexOf(placeId);
        contacted.splice(index, 1);
    } else {
        // Add to contacted
        contacted.push(placeId);
    }
    
    localStorage.setItem('lf_contacted', JSON.stringify(contacted));
    
    // Re-render to show updated status
    const searchResults = JSON.parse(localStorage.getItem('lf_businesses') || '[]');
    displayBusinesses(searchResults);
    
    // Show feedback
    const isNowContacted = contacted.includes(placeId);
    showNotification(
        isNowContacted 
            ? `✅ Marked "${businessName}" as contacted` 
            : `⟲ Removed "${businessName}" from contacted`,
        isNowContacted ? 'success' : 'info'
    );
}

function getContactedBusinesses() {
    return JSON.parse(localStorage.getItem('lf_contacted') || '[]');
}

function isBusinessContacted(placeId) {
    return getContactedBusinesses().includes(placeId);
}

// ============================================
// Notes Management (Keep for reference, but not displayed in UI)
// ============================================

function getBusinessNote(placeId) {
    const notes = JSON.parse(localStorage.getItem('lf_notes') || '{}');
    return notes[placeId] || '';
}

function setBusinessNote(placeId, note) {
    const notes = JSON.parse(localStorage.getItem('lf_notes') || '{}');
    if (note.trim()) {
        notes[placeId] = note;
    } else {
        delete notes[placeId];
    }
    localStorage.setItem('lf_notes', JSON.stringify(notes));
}

// ============================================
// Exclusion Management (Keep for reference, but not displayed in UI)
// ============================================

function getExcludedBusinesses() {
    return JSON.parse(localStorage.getItem('lf_excluded') || '[]');
}

function isBusinessExcluded(placeId) {
    return getExcludedBusinesses().includes(placeId);
}

function toggleExcluded(placeId, businessName) {
    const excluded = getExcludedBusinesses();
    
    if (excluded.includes(placeId)) {
        const index = excluded.indexOf(placeId);
        excluded.splice(index, 1);
    } else {
        excluded.push(placeId);
    }
    
    localStorage.setItem('lf_excluded', JSON.stringify(excluded));
}

// ============================================
// Statistics Management
// ============================================

function updateStats(total, contacted) {
    document.getElementById('totalCount').textContent = total;
    document.getElementById('contactedCount').textContent = contacted;
}

// ============================================
// Utilities
// ============================================

function escapeHtml(text) {
    if (!text) return '';
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}

function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    const bgColor = type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6';
    
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        background: ${bgColor};
        color: white;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        z-index: 10000;
        animation: slideIn 0.3s ease;
        max-width: 300px;
        font-weight: 500;
    `;
    
    document.body.appendChild(notification);
    
    // Remove after 3 seconds
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// ============================================
// Search & Map Functions
// ============================================

let map;
let service;
let infoWindow;
let markers = [];

function initializeMap() {
    map = new google.maps.Map(document.getElementById('map'), {
        zoom: 13,
        center: { lat: 40.7128, lng: -74.0060 },
        styles: [
            { elementType: 'geometry', stylers: [{ color: '#f5f5f5' }] },
            { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
            { elementType: 'labels.text.fill', stylers: [{ color: '#616161' }] },
            { 
                featureType: 'water',
                elementType: 'geometry',
                stylers: [{ color: '#e9e9e9' }]
            }
        ]
    });
    
    service = new google.maps.places.PlacesService(map);
    infoWindow = new google.maps.InfoWindow();
}

function searchBusinesses() {
    const searchTerm = document.getElementById('searchInput').value.trim();
    const locationInput = document.getElementById('locationInput').value.trim();
    
    if (!searchTerm || !locationInput) {
        showNotification('Please enter both search term and location', 'error');
        return;
    }

    showNotification('🔍 Searching for businesses...', 'info');

    // Geocode the location
    const geocoder = new google.maps.Geocoder();
    geocoder.geocode({ address: locationInput }, (results, status) => {
        if (status === 'OK') {
            const location = results[0].geometry.location;
            
            // Pan map to location
            map.setCenter(location);
            map.setZoom(13);
            
            // Clear previous markers
            markers.forEach(marker => marker.setMap(null));
            markers = [];
            
            // Search for businesses
            const request = {
                location: location,
                radius: 5000,
                keyword: searchTerm
            };
            
            service.nearbySearch(request, (results, status) => {
                if (status === google.maps.places.PlacesServiceStatus.OK && results.length > 0) {
                    // Get detailed info for each business
                    const businessPromises = results.slice(0, 20).map(place => {
                        return new Promise((resolve) => {
                            service.getDetails({
                                placeId: place.place_id,
                                fields: [
                                    'place_id',
                                    'name',
                                    'formatted_address',
                                    'formatted_phone_number',
                                    'website',
                                    'rating',
                                    'opening_hours',
                                    'geometry'
                                ]
                            }, (details) => {
                                if (details) {
                                    resolve({
                                        place_id: details.place_id,
                                        name: details.name,
                                        formatted_address: details.formatted_address,
                                        rating: details.rating,
                                        opening_hours: details.opening_hours,
                                        formatted_phone_number: details.formatted_phone_number,
                                        website: details.website,
                                        geometry: details.geometry
                                    });
                                } else {
                                    resolve(null);
                                }
                            });
                        });
                    });

                    Promise.all(businessPromises).then(businesses => {
                        const validBusinesses = businesses.filter(b => b !== null);
                        
                        if (validBusinesses.length > 0) {
                            // Save and display
                            localStorage.setItem('lf_businesses', JSON.stringify(validBusinesses));
                            displayBusinesses(validBusinesses);
                            
                            // Add markers to map
                            validBusinesses.forEach(business => {
                                const marker = new google.maps.Marker({
                                    position: business.geometry.location,
                                    map: map,
                                    title: business.name
                                });
                                
                                marker.addListener('click', () => {
                                    infoWindow.setContent(`
                                        <div style="padding: 10px; max-width: 200px;">
                                            <h3 style="margin: 0 0 5px 0; font-size: 1em;">${escapeHtml(business.name)}</h3>
                                            ${business.formatted_phone_number ? `<p style="margin: 5px 0; font-size: 0.9em;">📞 ${business.formatted_phone_number}</p>` : ''}
                                            ${business.rating ? `<p style="margin: 5px 0; font-size: 0.9em;">⭐ ${business.rating}</p>` : ''}
                                        </div>
                                    `);
                                    infoWindow.open(map, marker);
                                });
                                
                                markers.push(marker);
                            });
                            
                            showNotification(`✅ Found ${validBusinesses.length} businesses`, 'success');
                        } else {
                            showNotification('No detailed business information found', 'error');
                        }
                    });
                } else {
                    showNotification('❌ No businesses found. Try a different search.', 'error');
                }
            });
        } else {
            showNotification('❌ Location not found. Please try another address.', 'error');
        }
    });
}

// ============================================
// Event Listeners
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    // Allow Enter key to trigger search
    document.getElementById('searchInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') searchBusinesses();
    });
    
    document.getElementById('locationInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') searchBusinesses();
    });
});

// Initialize on page load
window.addEventListener('load', () => {
    initializeMap();
    
    // Load and display previously saved businesses
    const saved = JSON.parse(localStorage.getItem('lf_businesses') || '[]');
    if (saved.length > 0) {
        displayBusinesses(saved);
    }
});
