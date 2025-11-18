// Products page JavaScript

let allProducts = [];
let filteredProducts = [];
let currentFilters = {
    size: '',
    material: '',
    type: ''
};

document.addEventListener('DOMContentLoaded', function() {
    initializeProductsPage();
});

function initializeProductsPage() {
    setupFilters();
    loadProducts();
}

function setupFilters() {
    // Filter option clicks
    document.querySelectorAll('.filter-option').forEach(option => {
        option.addEventListener('click', function() {
            const filterType = this.dataset.filter;
            const filterValue = this.dataset.value;
            
            // Update active state
            document.querySelectorAll(`[data-filter="${filterType}"]`).forEach(opt => {
                opt.classList.remove('active');
            });
            this.classList.add('active');
            
            // Update filter
            currentFilters[filterType] = filterValue;
            applyFilters();
        });
    });

    // Clear filters
    document.getElementById('clearFilters').addEventListener('click', function() {
        currentFilters = { size: '', material: '', type: '' };
        
        // Reset active states
        document.querySelectorAll('.filter-option').forEach(option => {
            option.classList.remove('active');
            if (option.dataset.value === '') {
                option.classList.add('active');
            }
        });
        
        applyFilters();
    });

    // Set initial active states
    document.querySelectorAll('.filter-option[data-value=""]').forEach(option => {
        option.classList.add('active');
    });
}

async function loadProducts() {
    try {
        const response = await fetch('php/products.php?action=get_products');
        const data = await response.json();
        
        if (data.success) {
            allProducts = data.products;
            filteredProducts = [...allProducts];
            displayProducts();
            updateProductCount();
        } else {
            showFlashMessage('Failed to load products', 'error');
        }
    } catch (error) {
        console.error('Error loading products:', error);
        showFlashMessage('Failed to load products', 'error');
    } finally {
        document.getElementById('loadingSpinner').style.display = 'none';
    }
}

function applyFilters() {
    filteredProducts = allProducts.filter(product => {
        return (
            (currentFilters.size === '' || product.size_category === currentFilters.size) &&
            (currentFilters.material === '' || product.material_category === currentFilters.material) &&
            (currentFilters.type === '' || product.type_category === currentFilters.type)
        );
    });
    
    displayProducts();
    updateProductCount();
}

function displayProducts() {
    const productsGrid = document.getElementById('productsGrid');
    const noProductsFound = document.getElementById('noProductsFound');
    
    if (filteredProducts.length === 0) {
        productsGrid.style.display = 'none';
        noProductsFound.style.display = 'block';
        return;
    } else {
        productsGrid.style.display = 'grid';
        noProductsFound.style.display = 'none';
    }
    
    productsGrid.innerHTML = filteredProducts.map(product => `
        <div class="product-card" onclick="openProductDetails('${product.id}')">
            <div class="product-image-container">
                <img src="${product.image_url || 'https://images.pexels.com/photos/4041392/pexels-photo-4041392.jpeg'}" 
                     alt="${product.name}" class="product-image" loading="lazy">
                <div class="product-badge">
                    ${product.size_category}
                </div>
                ${product.stock_quantity <= 0 ? '<div class="out-of-stock-overlay"><span>Out of Stock</span></div>' : ''}
            </div>
            
            <div class="product-info">
                <h3 class="product-title">${product.name}</h3>
                <p class="product-description">${product.description.substring(0, 80)}...</p>
                
                <div class="product-tags">
                    <span class="product-tag">
                        ${product.material_category}
                    </span>
                    <span class="product-tag">
                        ${product.type_category}
                    </span>
                </div>
                
                <div class="product-pricing">
                    <div class="price-display">
                        <span class="current-price">${formatCurrency(product.base_price)}</span>
                        <span class="price-label">Starting from</span>
                    </div>
                </div>
                
                <div class="product-stock">
                    ${product.stock_quantity > 0 ? 
                        `<span class="in-stock">✅ ${product.stock_quantity} in stock</span>` : 
                        `<span class="out-of-stock">❌ Out of stock</span>`
                    }
                </div>
                
                <button onclick="event.stopPropagation(); openProductDetails('${product.id}')" 
                        class="btn btn-primary view-details-btn" ${product.stock_quantity <= 0 ? 'disabled' : ''}>
                    View Details
                </button>
            </div>
        </div>
    `).join('');
}

function openProductDetails(productId) {
    window.location.href = `product-overview.html?id=${productId}`;
}

function updateProductCount() {
    const productCount = document.getElementById('productCount');
    productCount.textContent = `${filteredProducts.length} products found`;
}

function addToCartHandler(productId, productName, price, image, isDecorative) {
    if (!currentUser) {
        showFlashMessage('Please login to add items to cart', 'error');
        window.location.href = 'login.html';
        return;
    }
    
    // Find the product to check stock
    const product = allProducts.find(p => p.id === productId);
    if (!product || product.stock_quantity <= 0) {
        showFlashMessage('Product is out of stock', 'error');
        return;
    }
    
    // Check if item already in cart
    const existingItem = cartItems.find(item => 
        item.productId === productId && item.isDecorative === isDecorative
    );
    
    if (existingItem && existingItem.quantity >= product.stock_quantity) {
        showFlashMessage('Cannot add more items. Stock limit reached.', 'warning');
        return;
    }
    
    addToCart(productId, productName, price, image, isDecorative);
}

// Search functionality
function setupProductSearch() {
    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.placeholder = 'Search products...';
    searchInput.className = 'form-control';
    searchInput.style.marginBottom = '1rem';
    
    const productsSection = document.querySelector('main .container > div > div:last-child');
    productsSection.insertBefore(searchInput, productsSection.firstChild);
    
    setupSearch(searchInput, function(searchTerm) {
        if (searchTerm.trim() === '') {
            filteredProducts = allProducts.filter(product => {
                return (
                    (currentFilters.size === '' || product.size_category === currentFilters.size) &&
                    (currentFilters.material === '' || product.material_category === currentFilters.material) &&
                    (currentFilters.type === '' || product.type_category === currentFilters.type)
                );
            });
        } else {
            filteredProducts = allProducts.filter(product => {
                const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                    product.description.toLowerCase().includes(searchTerm.toLowerCase());
                const matchesFilters = (
                    (currentFilters.size === '' || product.size_category === currentFilters.size) &&
                    (currentFilters.material === '' || product.material_category === currentFilters.material) &&
                    (currentFilters.type === '' || product.type_category === currentFilters.type)
                );
                return matchesSearch && matchesFilters;
            });
        }
        
        displayProducts();
        updateProductCount();
    });
}

// Initialize search after products are loaded
setTimeout(setupProductSearch, 1000);