// Main JavaScript file for Ganpati Murti E-commerce Website

// Global variables
let currentUser = null;
let cartItems = [];

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

// Initialize application
function initializeApp() {
    checkAuthStatus();
    loadCartItems();
    updateCartDisplay();
    setupEventListeners();
    showFlashMessage();
    
    // Set up periodic cart sync to handle cross-tab updates
    setInterval(() => {
        updateCartDisplay();
    }, 1000); // Update every second
}

// Check authentication status
function checkAuthStatus() {
    const userData = localStorage.getItem('currentUser');
    if (userData) {
        currentUser = JSON.parse(userData);
        updateAuthDisplay();
        // Load cart from database when user logs in
        loadCartFromDatabase();
    }
}

// Update authentication display
function updateAuthDisplay() {
    const authBtn = document.getElementById('authBtn');
    if (authBtn) {
        if (currentUser) {
            if (currentUser.is_admin) {
                authBtn.textContent = 'Admin';
                authBtn.href = 'admin.html';
            } else {
                authBtn.textContent = currentUser.first_name;
                authBtn.href = 'profile.html';
            }
        } else {
            authBtn.textContent = 'Login';
            authBtn.href = 'login.html';
        }
    }
}

// Load cart items from database
async function loadCartFromDatabase() {
    if (!currentUser) return;
    
    try {
        console.log('Loading cart from database for user:', currentUser.id);
        const response = await fetch('php/products.php?action=get_cart');
        const data = await response.json();
        console.log('Cart data received:', data);
        
        if (data.success) {
            // Convert database cart items to our format
            cartItems = data.cart_items.map(item => ({
                productId: item.product_id,
                productName: item.name,
                price: item.is_decorative ? parseFloat(item.decorative_price) : parseFloat(item.base_price),
                image: item.image_url || 'https://images.pexels.com/photos/4041392/pexels-photo-4041392.jpeg',
                quantity: parseInt(item.quantity),
                isDecorative: item.is_decorative === 1 || item.is_decorative === true
            }));
            
            saveCartItems(); // Save to localStorage as backup
            updateCartDisplay();
            console.log('Cart loaded successfully');
        } else {
            console.log('Failed to load cart:', data.message);
        }
    } catch (error) {
        console.error('Error loading cart from database:', error);
        // Fallback to localStorage
        loadCartItems();
    }
}

// Load cart items from localStorage (fallback)
function loadCartItems() {
    const savedCart = localStorage.getItem('cartItems');
    if (savedCart) {
        cartItems = JSON.parse(savedCart);
    }
}

// Save cart items to localStorage
function saveCartItems() {
    localStorage.setItem('cartItems', JSON.stringify(cartItems));
}

// Update cart display
function updateCartDisplay() {
    // Always load fresh data from localStorage
    const savedCart = localStorage.getItem('cartItems');
    const localCartItems = savedCart ? JSON.parse(savedCart) : [];
    
    const cartCount = document.querySelector('.cart-count');
    if (cartCount) {
        const totalItems = localCartItems.reduce((sum, item) => sum + item.quantity, 0);
        cartCount.textContent = totalItems;
        
        // Show/hide cart count
        if (totalItems > 0) {
            cartCount.style.display = 'block';
        } else {
            cartCount.style.display = 'none';
        }
    }
    
    // Update global cartItems variable to stay in sync
    cartItems = localCartItems;
}

// Add item to cart
async function addToCart(productId, productName, price, image, isDecorative = false) {
    if (!currentUser) {
        showFlashMessage('Please login to add items to cart', 'error');
        window.location.href = 'login.html';
        return;
    }

    try {
        const formData = new FormData();
        formData.append('action', 'add_to_cart');
        formData.append('product_id', productId);
        formData.append('quantity', 1);
        formData.append('is_decorative', isDecorative);
        
        const response = await fetch('php/products.php', {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Update local cart
            const existingItem = cartItems.find(item => 
                item.productId === productId && item.isDecorative === isDecorative
            );

            if (existingItem) {
                existingItem.quantity += 1;
            } else {
                cartItems.push({
                    productId: productId,
                    productName: productName,
                    price: price,
                    image: image,
                    quantity: 1,
                    isDecorative: isDecorative
                });
            }

            saveCartItems();
            updateCartDisplay();
            showFlashMessage('Item added to cart successfully!', 'success');
        } else {
            showFlashMessage(data.message || 'Failed to add item to cart', 'error');
        }
    } catch (error) {
        console.error('Error adding to cart:', error);
        showFlashMessage('Failed to add item to cart', 'error');
    }
}

// Remove item from cart
async function removeFromCart(productId, isDecorative = false) {
    if (!currentUser) return;
    
    try {
        const formData = new FormData();
        formData.append('action', 'remove_from_cart');
        formData.append('product_id', productId);
        formData.append('is_decorative', isDecorative);
        
        const response = await fetch('php/products.php', {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (data.success) {
            cartItems = cartItems.filter(item => 
                !(item.productId === productId && item.isDecorative === isDecorative)
            );
            saveCartItems();
            updateCartDisplay();
            showFlashMessage('Item removed from cart', 'info');
        } else {
            showFlashMessage(data.message || 'Failed to remove item from cart', 'error');
        }
    } catch (error) {
        console.error('Error removing from cart:', error);
        showFlashMessage('Failed to remove item from cart', 'error');
    }
}

// Update cart item quantity
async function updateCartQuantity(productId, isDecorative, newQuantity) {
    if (!currentUser) return;
    
    if (newQuantity <= 0) {
        removeFromCart(productId, isDecorative);
        return;
    }

    try {
        const formData = new FormData();
        formData.append('action', 'update_cart');
        formData.append('product_id', productId);
        formData.append('quantity', newQuantity);
        formData.append('is_decorative', isDecorative);
        
        const response = await fetch('php/products.php', {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (data.success) {
            const item = cartItems.find(item => 
                item.productId === productId && item.isDecorative === isDecorative
            );

            if (item) {
                item.quantity = newQuantity;
                saveCartItems();
                updateCartDisplay();
                showFlashMessage('Cart updated successfully', 'success');
            }
        } else {
            showFlashMessage(data.message || 'Failed to update cart', 'error');
        }
    } catch (error) {
        console.error('Error updating cart:', error);
        showFlashMessage('Failed to update cart', 'error');
    }
}

// Get cart total
function getCartTotal() {
    return cartItems.reduce((total, item) => total + (item.price * item.quantity), 0);
}

// Clear cart
async function clearCart() {
    if (!currentUser) return;
    
    try {
        const formData = new FormData();
        formData.append('action', 'clear_cart');
        
        const response = await fetch('php/products.php', {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (data.success) {
            cartItems = [];
            saveCartItems();
            updateCartDisplay();
            showFlashMessage('Cart cleared successfully', 'success');
        } else {
            showFlashMessage(data.message || 'Failed to clear cart', 'error');
        }
    } catch (error) {
        console.error('Error clearing cart:', error);
        showFlashMessage('Failed to clear cart', 'error');
    }
}

// Setup event listeners
function setupEventListeners() {
    // Mobile menu toggle
    const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
    const navMenu = document.querySelector('.nav-menu');
    
    if (mobileMenuBtn && navMenu) {
        mobileMenuBtn.addEventListener('click', function() {
            navMenu.classList.toggle('active');
        });
    }

    // Smooth scrolling for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });

    // Form validation
    const forms = document.querySelectorAll('form');
    forms.forEach(form => {
        form.addEventListener('submit', function(e) {
            if (!validateForm(this)) {
                e.preventDefault();
            }
        });
    });
}

// Form validation
function validateForm(form) {
    let isValid = true;
    const requiredFields = form.querySelectorAll('[required]');
    
    requiredFields.forEach(field => {
        if (!field.value.trim()) {
            showFieldError(field, 'This field is required');
            isValid = false;
        } else {
            clearFieldError(field);
        }
    });

    // Email validation
    const emailFields = form.querySelectorAll('input[type="email"]');
    emailFields.forEach(field => {
        if (field.value && !isValidEmail(field.value)) {
            showFieldError(field, 'Please enter a valid email address');
            isValid = false;
        }
    });

    // Phone validation
    const phoneFields = form.querySelectorAll('input[type="tel"]');
    phoneFields.forEach(field => {
        if (field.value && !isValidPhone(field.value)) {
            showFieldError(field, 'Please enter a valid phone number');
            isValid = false;
        }
    });

    return isValid;
}

// Show field error
function showFieldError(field, message) {
    clearFieldError(field);
    
    const errorDiv = document.createElement('div');
    errorDiv.className = 'field-error';
    errorDiv.textContent = message;
    errorDiv.style.color = '#dc3545';
    errorDiv.style.fontSize = '0.875rem';
    errorDiv.style.marginTop = '0.25rem';
    
    field.parentNode.appendChild(errorDiv);
    field.style.borderColor = '#dc3545';
}

// Clear field error
function clearFieldError(field) {
    const existingError = field.parentNode.querySelector('.field-error');
    if (existingError) {
        existingError.remove();
    }
    field.style.borderColor = '';
}

// Email validation
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Phone validation
function isValidPhone(phone) {
    const phoneRegex = /^[\+]?[0-9\s\-\(\)]{10,15}$/;
    return phoneRegex.test(phone);
}

// Show flash message
function showFlashMessage(message, type = 'info') {
    const flashContainer = document.getElementById('flashMessage');
    if (!flashContainer) return;

    flashContainer.textContent = message;
    flashContainer.className = `flash-message ${type} show`;

    // Auto hide after 5 seconds
    setTimeout(() => {
        flashContainer.classList.remove('show');
    }, 5000);
}

// Format currency
function formatCurrency(amount) {
    return '₹' + parseFloat(amount).toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

// Format date
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

// Format datetime
function formatDateTime(dateString) {
    const date = new Date(dateString);
    return date.toLocaleString('en-IN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Show loading state
function showLoading(element) {
    const originalText = element.textContent;
    element.textContent = '';
    element.innerHTML = '<span class="loading"></span> Loading...';
    element.disabled = true;
    
    return function hideLoading() {
        element.textContent = originalText;
        element.disabled = false;
    };
}

// API call helper
async function apiCall(url, options = {}) {
    try {
        const response = await fetch(url, {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'An error occurred');
        }

        return data;
    } catch (error) {
        console.error('API call failed:', error);
        throw error;
    }
}

// Logout function
function logout() {
    currentUser = null;
    localStorage.removeItem('currentUser');
    clearCart();
    updateAuthDisplay();
    showFlashMessage('Logged out successfully', 'success');
    window.location.href = 'index.html';
}

// Check if user is admin
function isAdmin() {
    return currentUser && currentUser.is_admin;
}

// Redirect if not logged in
function requireAuth() {
    if (!currentUser) {
        showFlashMessage('Please login to access this page', 'error');
        window.location.href = 'login.html';
        return false;
    }
    return true;
}

// Redirect if not admin
function requireAdmin() {
    if (!requireAuth()) return false;
    
    if (!isAdmin()) {
        showFlashMessage('Access denied. Admin privileges required.', 'error');
        window.location.href = 'index.html';
        return false;
    }
    return true;
}

// Image upload preview
function setupImagePreview(inputElement, previewElement) {
    inputElement.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                previewElement.src = e.target.result;
                previewElement.style.display = 'block';
            };
            reader.readAsDataURL(file);
        }
    });
}

// Debounce function for search
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Search functionality
function setupSearch(searchInput, searchFunction) {
    const debouncedSearch = debounce(searchFunction, 300);
    searchInput.addEventListener('input', function(e) {
        debouncedSearch(e.target.value);
    });
}

// Pagination helper
function createPagination(currentPage, totalPages, onPageChange) {
    const paginationContainer = document.createElement('div');
    paginationContainer.className = 'pagination';

    // Previous button
    if (currentPage > 1) {
        const prevBtn = document.createElement('button');
        prevBtn.textContent = 'Previous';
        prevBtn.className = 'btn btn-secondary';
        prevBtn.addEventListener('click', () => onPageChange(currentPage - 1));
        paginationContainer.appendChild(prevBtn);
    }

    // Page numbers
    for (let i = 1; i <= totalPages; i++) {
        const pageBtn = document.createElement('button');
        pageBtn.textContent = i;
        pageBtn.className = `btn ${i === currentPage ? 'btn-primary' : 'btn-secondary'}`;
        pageBtn.addEventListener('click', () => onPageChange(i));
        paginationContainer.appendChild(pageBtn);
    }

    // Next button
    if (currentPage < totalPages) {
        const nextBtn = document.createElement('button');
        nextBtn.textContent = 'Next';
        nextBtn.className = 'btn btn-secondary';
        nextBtn.addEventListener('click', () => onPageChange(currentPage + 1));
        paginationContainer.appendChild(nextBtn);
    }

    return paginationContainer;
}

// Local storage helpers
function setLocalStorage(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
        console.error('Error saving to localStorage:', error);
    }
}

function getLocalStorage(key, defaultValue = null) {
    try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
        console.error('Error reading from localStorage:', error);
        return defaultValue;
    }
}

// Export functions for use in other files
window.GanpatiApp = {
    addToCart,
    removeFromCart,
    updateCartQuantity,
    getCartTotal,
    clearCart,
    showFlashMessage,
    formatCurrency,
    formatDate,
    formatDateTime,
    showLoading,
    apiCall,
    logout,
    isAdmin,
    requireAuth,
    requireAdmin,
    setupImagePreview,
    setupSearch,
    createPagination,
    setLocalStorage,
    getLocalStorage,
    currentUser,
    cartItems
};