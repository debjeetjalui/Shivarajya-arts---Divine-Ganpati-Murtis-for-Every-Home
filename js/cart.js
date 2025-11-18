// Cart page JavaScript

document.addEventListener('DOMContentLoaded', function() {
    initializeCartPage();
});

function initializeCartPage() {
    if (!currentUser) {
        document.getElementById('loginRequired').style.display = 'block';
        return;
    }

    document.getElementById('cartContent').style.display = 'block';
    loadCartItems();
    setupEventListeners();
    
    // Update header cart count to sync with localStorage
    if (typeof updateCartDisplay === 'function') {
        updateCartDisplay();
    }
}

function setupEventListeners() {
    document.getElementById('checkoutBtn').addEventListener('click', openCheckoutModal);
    document.getElementById('clearCartBtn').addEventListener('click', handleClearCart);
    document.getElementById('checkoutForm').addEventListener('submit', handleCheckout);
}

async function loadCartItems() {
    if (!currentUser) {
        document.getElementById('cartContent').style.display = 'none';
        document.getElementById('emptyCart').style.display = 'block';
        return;
    }

    try {
        console.log('Loading cart items from database');
        const response = await fetch('php/products.php?action=get_cart');
        const data = await response.json();
        console.log('Received cart data:', data);
        
        const cartItemsContainer = document.getElementById('cartItems');
        const checkoutBtn = document.getElementById('checkoutBtn');

        if (data.success && data.cart_items.length > 0) {
            displayCartItems(data.cart_items);
            updateOrderSummary(data.total);
            checkoutBtn.disabled = false;
            document.getElementById('emptyCart').style.display = 'none';
            document.getElementById('cartContent').style.display = 'block';
            
            // Save to localStorage as backup
            const localCartItems = data.cart_items.map(item => ({
                productId: item.product_id,
                productName: item.name,
                price: item.is_decorative ? parseFloat(item.decorative_price) : parseFloat(item.base_price),
                image: item.image_url || 'https://images.pexels.com/photos/4041392/pexels-photo-4041392.jpeg',
                quantity: parseInt(item.quantity),
                isDecorative: item.is_decorative === 1 || item.is_decorative === true
            }));
            localStorage.setItem('cartItems', JSON.stringify(localCartItems));
            console.log('Cart items saved to localStorage');
        } else {
            document.getElementById('cartContent').style.display = 'none';
            document.getElementById('emptyCart').style.display = 'block';
            localStorage.removeItem('cartItems');
            console.log('No cart items found or failed to load');
        }
    } catch (error) {
        console.error('Error loading cart:', error);
        showFlashMessage('Failed to load cart items', 'error');
        
        // Fallback to localStorage
        loadCartItemsFromLocalStorage();
    }
}

function loadCartItemsFromLocalStorage() {
    // Load cart items from localStorage (fallback)
    const savedCart = localStorage.getItem('cartItems');
    const localCartItems = savedCart ? JSON.parse(savedCart) : [];

    const cartItemsContainer = document.getElementById('cartItems');
    const checkoutBtn = document.getElementById('checkoutBtn');

    if (localCartItems.length > 0) {
        displayCartItems(localCartItems);
        const total = localCartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        updateOrderSummary(total);
        checkoutBtn.disabled = false;
        document.getElementById('emptyCart').style.display = 'none';
        document.getElementById('cartContent').style.display = 'block';
    } else {
        document.getElementById('cartContent').style.display = 'none';
        document.getElementById('emptyCart').style.display = 'block';
    }
}

function displayCartItems(items) {
    const cartItemsContainer = document.getElementById('cartItems');
    
    // Check if items are from database or localStorage
    const isDatabaseItems = items.length > 0 && items[0].hasOwnProperty('product_id');
    
    cartItemsContainer.innerHTML = items.map((item, index) => {
        // Extract data based on source
        const productId = isDatabaseItems ? item.product_id : item.productId;
        const productName = isDatabaseItems ? item.name : item.productName;
        const isDecorative = isDatabaseItems ? (item.is_decorative === 1 || item.is_decorative === true) : item.isDecorative;
        const price = isDatabaseItems ? 
            (isDecorative ? parseFloat(item.decorative_price) : parseFloat(item.base_price)) : 
            item.price;
        const quantity = isDatabaseItems ? parseInt(item.quantity) : item.quantity;
        const image = isDatabaseItems ? 
            (item.image_url || 'https://images.pexels.com/photos/4041392/pexels-photo-4041392.jpeg') : 
            item.image;
        
        return `
            <div class="cart-item" data-product-id="${productId}" data-is-decorative="${isDecorative}">
                <img src="${image}" 
                     alt="${productName}" class="cart-item-image">
                
                <div class="cart-item-info">
                    <h4 class="cart-item-title">${productName}</h4>
                    <p style="color: #666; font-size: 0.9rem; margin-bottom: 0.5rem;">
                        ${isDecorative ? 'Decorative' : 'Regular'} Version
                    </p>
                    <div class="cart-item-price">${formatCurrency(price)}</div>
                </div>
                
                <div class="quantity-controls">
                    <button class="quantity-btn" onclick="updateCartItemQuantity('${productId}', ${isDecorative}, ${quantity - 1})">-</button>
                    <span class="quantity-display">${quantity}</span>
                    <button class="quantity-btn" onclick="updateCartItemQuantity('${productId}', ${isDecorative}, ${quantity + 1})">+</button>
                </div>
                
                <div style="text-align: right;">
                    <div style="font-weight: 700; color: #ff6b35; margin-bottom: 0.5rem;">
                        ${formatCurrency(price * quantity)}
                    </div>
                    <button onclick="removeCartItem('${productId}', ${isDecorative})" 
                            class="btn btn-danger" style="padding: 5px 10px; font-size: 0.8rem;">
                        Remove
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

function updateOrderSummary(subtotal) {
    const shipping = 50; // Fixed shipping cost
    const total = subtotal + shipping;
    
    document.getElementById('subtotal').textContent = formatCurrency(subtotal);
    document.getElementById('total').textContent = formatCurrency(total);
    document.getElementById('checkoutSubtotal').textContent = formatCurrency(subtotal);
    document.getElementById('checkoutTotal').textContent = formatCurrency(total);
}

async function updateCartItemQuantity(productId, isDecorative, newQuantity) {
    if (newQuantity <= 0) {
        removeCartItem(productId, isDecorative);
        return;
    }

    if (!currentUser) return;

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
            // Reload cart display
            loadCartItems();
            
            // Update header cart count
            if (typeof updateCartDisplay === 'function') {
                updateCartDisplay();
            }
            
            showFlashMessage('Quantity updated', 'success');
        } else {
            showFlashMessage(data.message || 'Failed to update quantity', 'error');
        }
    } catch (error) {
        console.error('Error updating cart item:', error);
        showFlashMessage('Failed to update quantity', 'error');
    }
}

async function removeCartItem(productId, isDecorative) {
    if (!confirm('Are you sure you want to remove this item from cart?')) {
        return;
    }

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
            // Reload cart display
            loadCartItems();
            
            // Update header cart count
            if (typeof updateCartDisplay === 'function') {
                updateCartDisplay();
            }
            
            showFlashMessage('Item removed from cart', 'success');
        } else {
            showFlashMessage(data.message || 'Failed to remove item', 'error');
        }
    } catch (error) {
        console.error('Error removing cart item:', error);
        showFlashMessage('Failed to remove item', 'error');
    }
}

async function handleClearCart() {
    if (!confirm('Are you sure you want to clear your entire cart?')) {
        return;
    }

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
            // Update display
            document.getElementById('cartContent').style.display = 'none';
            document.getElementById('emptyCart').style.display = 'block';
            
            // Update header cart count
            if (typeof updateCartDisplay === 'function') {
                updateCartDisplay();
            }
            
            // Clear localStorage
            localStorage.removeItem('cartItems');
            
            showFlashMessage('Cart cleared successfully', 'success');
        } else {
            showFlashMessage(data.message || 'Failed to clear cart', 'error');
        }
    } catch (error) {
        console.error('Error clearing cart:', error);
        showFlashMessage('Failed to clear cart', 'error');
    }
}

function openCheckoutModal() {
    // Instead of opening modal, redirect to buy-product page with cart data
    const savedCart = localStorage.getItem('cartItems');
    const cartItems = savedCart ? JSON.parse(savedCart) : [];
    
    if (cartItems.length === 0) {
        showFlashMessage('Your cart is empty', 'error');
        return;
    }
    
    // For now, redirect with the first item (can be enhanced for multiple items)
    const firstItem = cartItems[0];
    const params = new URLSearchParams({
        id: firstItem.productId,
        option: firstItem.isDecorative ? 'decorative' : 'regular',
        quantity: firstItem.quantity,
        fromCart: 'true'
    });
    
    window.location.href = `buy-product.html?${params.toString()}`;
}

function closeCheckoutModal() {
    document.getElementById('checkoutModal').style.display = 'none';
}

async function handleCheckout(e) {
    e.preventDefault();

    const shippingAddress = document.getElementById('shippingAddress').value.trim();
    const phoneNumber = document.getElementById('phoneNumber').value.trim();
    const paymentMethod = document.getElementById('paymentMethod').value;

    if (!shippingAddress || !phoneNumber || !paymentMethod) {
        showFlashMessage('Please fill in all required fields', 'error');
        return;
    }

    const submitBtn = e.target.querySelector('button[type="submit"]');
    const hideLoading = showLoading(submitBtn);

    try {
        const formData = new FormData();
        formData.append('action', 'create_order');
        formData.append('shipping_address', shippingAddress);
        formData.append('phone', phoneNumber);
        formData.append('payment_method', paymentMethod);

        const response = await fetch('php/orders.php', {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (data.success) {
            showFlashMessage('Order placed successfully!', 'success');
            closeCheckoutModal();
            
            // Clear local cart
            localStorage.removeItem('cartItems');
                    
            // Update cart display
            if (typeof updateCartDisplay === 'function') {
                updateCartDisplay();
            }
            
            // Redirect to profile page to view order
            setTimeout(() => {
                window.location.href = 'profile.html';
            }, 2000);
        } else {
            showFlashMessage(data.message, 'error');
        }
    } catch (error) {
        console.error('Error placing order:', error);
        showFlashMessage('Failed to place order. Please try again.', 'error');
    } finally {
        hideLoading();
    }
}

// Close modals when clicking outside
document.addEventListener('click', function(e) {
    if (e.target.classList.contains('modal')) {
        e.target.style.display = 'none';
    }
});

// Handle escape key to close modals
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.style.display = 'none';
        });
    }
});