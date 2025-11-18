// Product Overview Page JavaScript

let currentProduct = null;
let selectedPricingOption = 'regular';
let currentQuantity = 1;
let currentImageIndex = 0;
let productImages = [];
let selectedPaymentMethod = 'upi';

document.addEventListener('DOMContentLoaded', function() {
    initializeProductOverview();
});

function initializeProductOverview() {
    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get('id');
    
    if (!productId) {
        window.location.href = 'products.html';
        return;
    }
    
    loadProductDetails(productId);
}

async function loadProductDetails(productId) {
    try {
        const response = await fetch(`php/products.php?action=get_product&id=${productId}`);
        const data = await response.json();
        
        if (data.success) {
            currentProduct = data.product;
            displayProductDetails();
        } else {
            showFlashMessage('Product not found', 'error');
            setTimeout(() => window.location.href = 'products.html', 2000);
        }
    } catch (error) {
        console.error('Error loading product details:', error);
        showFlashMessage('Failed to load product details', 'error');
    } finally {
        document.getElementById('loadingState').style.display = 'none';
    }
}

function displayProductDetails() {
    // Update breadcrumb
    document.getElementById('productBreadcrumb').textContent = currentProduct.name;
    
    // Setup product images
    setupProductImages();
    
    // Update product title
    document.getElementById('productTitle').textContent = currentProduct.name;
    
    // Update description
    document.getElementById('productDescription').textContent = currentProduct.description;
    
    // Update categories
    const categoriesContainer = document.getElementById('productCategories');
    categoriesContainer.innerHTML = `
        <span style="background: #ff6b35; color: white; padding: 5px 12px; border-radius: 15px; font-size: 0.8rem; font-weight: 600;">
            ${currentProduct.size_category}
        </span>
        <span style="background: #f8f9fa; color: #666; padding: 5px 12px; border-radius: 15px; font-size: 0.8rem;">
            ${currentProduct.material_category}
        </span>
        <span style="background: #f8f9fa; color: #666; padding: 5px 12px; border-radius: 15px; font-size: 0.8rem;">
            ${currentProduct.type_category}
        </span>
    `;
    
    // Update stock status
    const stockContainer = document.getElementById('stockStatus');
    if (currentProduct.stock_quantity > 0) {
        stockContainer.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px; padding: 10px; background: #d4edda; border-radius: 10px; color: #155724;">
                <span style="font-size: 1.2rem;">✅</span>
                <span style="font-weight: 600;">${currentProduct.stock_quantity} items in stock</span>
            </div>
        `;
    } else {
        stockContainer.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px; padding: 10px; background: #f8d7da; border-radius: 10px; color: #721c24;">
                <span style="font-size: 1.2rem;">❌</span>
                <span style="font-weight: 600;">Out of stock</span>
            </div>
        `;
        
        // Disable buttons
        document.getElementById('addToCartBtn').disabled = true;
    }
    
    // Update prices
    document.getElementById('regularPrice').textContent = formatCurrency(currentProduct.base_price);
    document.getElementById('decorativePrice').textContent = formatCurrency(currentProduct.decorative_price);
    
    // Update vendor and SKU
    document.getElementById('vendorName').textContent = 'Shri Ganpati';
    document.getElementById('productSku').textContent = `GM${currentProduct.id}`;
    
    // Update viewers count (random number for demo)
    const viewers = Math.floor(Math.random() * 15) + 5;
    document.getElementById('viewersCount').textContent = `${viewers} customers are viewing this product`;
    
    // Update reward points based on price
    const rewardPoints = Math.floor(currentProduct.base_price / 10);
    document.getElementById('rewardPoints').textContent = `You'll get ${rewardPoints} Reward Points`;
    
    // Select regular pricing option by default
    selectPricingOption('regular');
    
    // Show product details
    document.getElementById('productDetails').style.display = 'block';
}

function setupProductImages() {
    // For demo, we'll use multiple variations of the same image
    const baseImage = currentProduct.image_url || 'https://images.pexels.com/photos/4041392/pexels-photo-4041392.jpeg';
    
    productImages = [
        baseImage,
        'https://images.pexels.com/photos/6896166/pexels-photo-6896166.jpeg',
        'https://images.pexels.com/photos/7045933/pexels-photo-7045933.jpeg',
        'https://images.pexels.com/photos/6896158/pexels-photo-6896158.jpeg'
    ];
    
    // Set main image
    document.getElementById('mainProductImage').src = productImages[0];
    document.getElementById('mainProductImage').alt = currentProduct.name;
    
    // Create thumbnails
    const thumbnailContainer = document.querySelector('.thumbnail-container');
    thumbnailContainer.innerHTML = productImages.map((image, index) => `
        <img src="${image}" alt="${currentProduct.name}" class="thumbnail ${index === 0 ? 'active' : ''}" 
             onclick="selectImage(${index})">
    `).join('');
}

function selectImage(index) {
    currentImageIndex = index;
    document.getElementById('mainProductImage').src = productImages[index];
    
    // Update thumbnail active state
    document.querySelectorAll('.thumbnail').forEach((thumb, i) => {
        thumb.classList.toggle('active', i === index);
    });
}

function previousImage() {
    currentImageIndex = (currentImageIndex - 1 + productImages.length) % productImages.length;
    selectImage(currentImageIndex);
}

function nextImage() {
    currentImageIndex = (currentImageIndex + 1) % productImages.length;
    selectImage(currentImageIndex);
}

function selectPricingOption(option) {
    selectedPricingOption = option;
    
    // Update UI
    document.querySelectorAll('.pricing-option').forEach((opt) => {
        opt.classList.remove('selected');
        opt.querySelector('input[type="radio"]').checked = false;
    });
    
    if (option === 'regular') {
        document.querySelector('.regular-option').classList.add('selected');
        document.querySelector('input[value="regular"]').checked = true;
    } else {
        document.querySelector('.decorative-option').classList.add('selected');
        document.querySelector('input[value="decorative"]').checked = true;
    }
}

function updateQuantity(change) {
    const newQuantity = currentQuantity + change;
    
    if (newQuantity < 1) return;
    if (newQuantity > currentProduct.stock_quantity) {
        showFlashMessage(`Only ${currentProduct.stock_quantity} items available`, 'warning');
        return;
    }
    
    currentQuantity = newQuantity;
    document.getElementById('quantityDisplay').textContent = currentQuantity;
}

function addProductToCart() {
    if (!currentUser) {
        showFlashMessage('Please login to add items to cart', 'error');
        window.location.href = 'login.html';
        return;
    }
    
    if (currentProduct.stock_quantity <= 0) {
        showFlashMessage('Product is out of stock', 'error');
        return;
    }
    
    const price = selectedPricingOption === 'decorative' ? currentProduct.decorative_price : currentProduct.base_price;
    const isDecorative = selectedPricingOption === 'decorative';
    
    // Add multiple quantities
    for (let i = 0; i < currentQuantity; i++) {
        addToCartHandler(
            currentProduct.id,
            currentProduct.name,
            price,
            currentProduct.image_url || 'https://images.pexels.com/photos/4041392/pexels-photo-4041392.jpeg',
            isDecorative
        );
    }
    
    showFlashMessage(`${currentQuantity} item(s) added to cart!`, 'success');
}

function addToCartHandler(productId, productName, price, image, isDecorative) {
    // Check if item already in cart
    const existingItem = cartItems.find(item => 
        item.productId == productId && item.isDecorative === isDecorative
    );
    
    if (existingItem && existingItem.quantity >= currentProduct.stock_quantity) {
        showFlashMessage('Cannot add more items. Stock limit reached.', 'warning');
        return;
    }
    
    // Use the global addToCart function from main.js
    if (typeof window.addToCart === 'function') {
        window.addToCart(productId, productName, price, image, isDecorative);
    } else {
        // Fallback implementation
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
    }
}

function addToWishlist() {
    if (!currentUser) {
        showFlashMessage('Please login to add to wishlist', 'error');
        window.location.href = 'login.html';
        return;
    }
    
    showFlashMessage('Added to wishlist!', 'success');
}

function shareProduct() {
    if (navigator.share) {
        navigator.share({
            title: currentProduct.name,
            text: `Check out this ${currentProduct.name} from Shri Ganpati Murtis`,
            url: window.location.href
        });
    } else {
        // Fallback to copy to clipboard
        navigator.clipboard.writeText(window.location.href);
        showFlashMessage('Product link copied to clipboard!', 'success');
    }
}

// Close modal when clicking outside
document.addEventListener('click', function(e) {
    if (e.target.classList.contains('payment-modal')) {
        closePaymentPortal();
    }
});

// Handle escape key to close modal
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        closePaymentPortal();
    }
});

// Initialize payment method selection
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        selectPaymentMethod('upi');
    }, 500);
});