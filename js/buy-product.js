// Buy Product Page JavaScript
document.addEventListener('DOMContentLoaded', function() {
    initializeBuyPage();
});

function initializeBuyPage() {
    console.log('Initializing buy page');
    // Check if user is logged in
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');
    console.log('Current user:', currentUser);
    if (!currentUser) {
        showFlashMessage('Please login to continue', 'error');
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 2000);
        return;
    }
    
    // Check if coming from products page or cart
    const urlParams = new URLSearchParams(window.location.search);
    const fromProducts = urlParams.get('fromProducts') === 'true';
    const fromCart = urlParams.get('fromCart') === 'true';
    
    console.log('From products:', fromProducts, 'From cart:', fromCart);
    
    if (fromProducts) {
        loadDirectProductData(urlParams);
    } else {
        loadCartData();
    }
    
    setupEventListeners();
    // We'll set up payment method handlers after data is loaded
}

function loadCartData() {
    console.log('Loading cart data');
    // Load cart items from database
    loadCartDataFromDatabase();
}

async function loadCartDataFromDatabase() {
    try {
        const response = await fetch('php/products.php?action=get_cart');
        const data = await response.json();
        
        if (data.success && data.cart_items.length > 0) {
            // Convert database cart items to our format
            const cartItems = data.cart_items.map(item => ({
                productId: item.product_id,
                productName: item.name,
                price: item.is_decorative ? parseFloat(item.decorative_price) : parseFloat(item.base_price),
                quantity: parseInt(item.quantity),
                image: item.image_url || 'https://images.pexels.com/photos/4041392/pexels-photo-4041392.jpeg',
                isDecorative: item.is_decorative === 1 || item.is_decorative === true
            }));
            
            displayCartData(cartItems);
            // Set up payment method handlers after data is loaded
            setupPaymentMethodHandlers();
            
            // Save to localStorage as backup
            localStorage.setItem('cartItems', JSON.stringify(cartItems));
        } else {
            showFlashMessage('No items in cart', 'error');
            setTimeout(() => {
                window.location.href = 'cart.html';
            }, 2000);
        }
    } catch (error) {
        console.error('Error loading cart from database:', error);
        showFlashMessage('Failed to load cart data', 'error');
        setTimeout(() => {
            window.location.href = 'cart.html';
        }, 2000);
    }
}

async function loadDirectProductData(urlParams) {
    console.log('Loading direct product data');
    const productId = urlParams.get('id');
    const option = urlParams.get('option') || 'regular';
    const quantity = parseInt(urlParams.get('quantity')) || 1;
    
    if (!productId) {
        showFlashMessage('No product selected', 'error');
        setTimeout(() => {
            window.location.href = 'products.html';
        }, 2000);
        return;
    }
    
    try {
        // Fetch product from database
        const response = await fetch(`php/products.php?action=get_product&id=${productId}`);
        const data = await response.json();
        
        if (data.success && data.product) {
            const product = data.product;
            const price = option === 'decorative' ? parseFloat(product.decorative_price) : parseFloat(product.base_price);
            
            // Create a single item array for display
            const singleItemData = [{
                productId: product.id,
                productName: product.name,
                price: price,
                quantity: quantity,
                image: product.image_url || 'https://images.pexels.com/photos/4041392/pexels-photo-4041392.jpeg',
                isDecorative: option === 'decorative'
            }];
            
            displayCartData(singleItemData);
            // Set up payment method handlers after data is loaded
            setupPaymentMethodHandlers();
        } else {
            throw new Error('Product not found');
        }
    } catch (error) {
        console.error('Error loading product:', error);
        showFlashMessage('Failed to load product', 'error');
        setTimeout(() => {
            window.location.href = 'products.html';
        }, 2000);
    }
}

function displayCartData(cartItems) {
    console.log('Displaying cart data:', cartItems);
    // Calculate totals from all cart items
    let subtotal = 0;
    let totalQuantity = 0;
    
    cartItems.forEach(item => {
        subtotal += item.price * item.quantity;
        totalQuantity += item.quantity;
    });
    
    const shipping = 50;
    const tax = subtotal * 0.18; // 18% GST
    const total = subtotal + shipping + tax;
    
    // Show first item as representative (or combine all items)
    const firstItem = cartItems[0];
    
    // Update product display
    document.getElementById('productImage').src = firstItem.image || 'https://images.pexels.com/photos/4041392/pexels-photo-4041392.jpeg';
    document.getElementById('productName').textContent = cartItems.length > 1 ? `${firstItem.productName} + ${cartItems.length - 1} more items` : firstItem.productName;
    document.getElementById('productType').textContent = firstItem.isDecorative ? 'Decorative Version' : 'Regular Version';
    document.getElementById('productQuantity').textContent = totalQuantity;
    document.getElementById('productPrice').textContent = subtotal.toFixed(2);
    
    // Update totals
    document.getElementById('subtotalAmount').textContent = subtotal.toFixed(2);
    document.getElementById('taxAmount').textContent = tax.toFixed(2);
    document.getElementById('totalAmount').textContent = total.toFixed(2);
    document.getElementById('qrAmount').textContent = total.toFixed(2);
    
    console.log('Cart data displayed');
}

function setupEventListeners() {
    document.getElementById('payNowBtn').addEventListener('click', handlePayment);
}

function setupPaymentMethodHandlers() {
    console.log('Setting up payment method handlers');
    const paymentOptions = document.querySelectorAll('input[name="paymentMethod"]');
    console.log('Found payment options:', paymentOptions.length);
    
    paymentOptions.forEach((option, index) => {
        console.log('Setting up option', index, 'with value:', option.value);
        option.addEventListener('change', function() {
            console.log('Payment method changed to:', this.value);
            // Hide all payment forms
            document.querySelectorAll('.payment-form').forEach(form => {
                form.style.display = 'none';
            });
            
            // Remove selected class from all payment options
            document.querySelectorAll('.payment-option').forEach(opt => {
                opt.classList.remove('selected');
            });
            
            // Add selected class to parent payment option
            this.closest('.payment-option').classList.add('selected');
            
            // Show selected payment form
            const selectedMethod = this.value;
            let formId;
            
            if (selectedMethod === 'card') {
                formId = 'cardDetailsForm';
            } else if (selectedMethod === 'upi') {
                formId = 'upiDetailsForm';
                generateUPIQRCode();
                setupUPIVerification();
                // Check if there's already a verified UPI ID
                checkExistingUPIVerification();
            } else if (selectedMethod === 'netbanking') {
                formId = 'netbankingDetailsForm';
            } else if (selectedMethod === 'cod') {
                // No form for COD
                return;
            }
            
            const form = document.getElementById(formId);
            console.log('Showing form:', formId, form);
            if (form) {
                form.style.display = 'block';
            }
        });
    });
    
    // Trigger change event on the default selected option
    // Add a small delay to ensure DOM is fully ready
    setTimeout(() => {
        const defaultOption = document.querySelector('input[name="paymentMethod"]:checked');
        console.log('Default option:', defaultOption);
        if (defaultOption) {
            console.log('Default option value:', defaultOption.value);
            defaultOption.dispatchEvent(new Event('change'));
            
            // If UPI is the default selected method, also set up UPI verification
            if (defaultOption.value === 'upi') {
                console.log('Setting up UPI verification');
                setupUPIVerification();
                // Check if there's already a verified UPI ID
                checkExistingUPIVerification();
            }
        } else {
            console.log('No default option found');
        }
    }, 100);
    
    // Ensure UPI form is visible if it's the default
    const defaultOption = document.querySelector('input[name="paymentMethod"]:checked');
    if (defaultOption && defaultOption.value === 'upi') {
        const upiForm = document.getElementById('upiDetailsForm');
        if (upiForm) {
            upiForm.style.display = 'block';
            console.log('Made UPI form visible');
        }
    }
}

function checkExistingUPIVerification() {
    const upiForm = document.getElementById('upiDetailsForm');
    const verifiedUpi = upiForm.dataset.verifiedUpi;
    const upiIdInput = document.getElementById('upiId');
    
    // If there's a verified UPI ID, show the verified section
    if (verifiedUpi) {
        document.getElementById('upiVerifiedSection').style.display = 'block';
        // Also populate the UPI ID field if it's empty
        if (!upiIdInput.value) {
            upiIdInput.value = verifiedUpi;
        }
    }
}

function setupUPIVerification() {
    const verifyBtn = document.getElementById('verifyUpiBtn');
    if (verifyBtn) {
        // Remove any existing event listeners to prevent duplicates
        const newVerifyBtn = verifyBtn.cloneNode(true);
        verifyBtn.parentNode.replaceChild(newVerifyBtn, verifyBtn);
        newVerifyBtn.addEventListener('click', verifyUPIId);
    }
}

function verifyUPIId() {
    const upiInput = document.getElementById('upiId');
    const upiId = upiInput.value.trim();
    const statusDiv = document.getElementById('upiVerificationStatus');
    const verifiedSection = document.getElementById('upiVerifiedSection');
    
    // Reset previous states
    statusDiv.style.display = 'none';
    verifiedSection.style.display = 'none';
    
    if (!upiId) {
        showUPIVerificationStatus('Please enter your UPI ID', 'error');
        return;
    }
    
    // Basic UPI ID validation
    const upiPattern = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+$/;
    if (!upiPattern.test(upiId)) {
        showUPIVerificationStatus('Please enter a valid UPI ID (e.g., name@bank)', 'error');
        return;
    }
    
    // Simulate verification process
    showUPIVerificationStatus('Verifying UPI ID...', 'info');
    
    // Simulate API call delay
    setTimeout(() => {
        // For demo purposes, we'll accept any valid format
        // In a real application, you would verify with a backend service
        showUPIVerificationStatus('UPI ID verified successfully!', 'success');
        verifiedSection.style.display = 'block';
        
        // Store verified UPI ID in a data attribute for later use
        document.getElementById('upiDetailsForm').dataset.verifiedUpi = upiId;
    }, 1500);
}

function showUPIVerificationStatus(message, type) {
    const statusDiv = document.getElementById('upiVerificationStatus');
    statusDiv.textContent = message;
    statusDiv.style.display = 'block';
    
    // Reset classes
    statusDiv.className = '';
    statusDiv.classList.add('upi-verification-status');
    
    // Add type-specific styling
    switch(type) {
        case 'error':
            statusDiv.style.backgroundColor = '#f8d7da';
            statusDiv.style.color = '#721c24';
            statusDiv.style.borderColor = '#f5c6cb';
            break;
        case 'success':
            statusDiv.style.backgroundColor = '#d4edda';
            statusDiv.style.color = '#155724';
            statusDiv.style.borderColor = '#c3e6cb';
            break;
        case 'info':
        default:
            statusDiv.style.backgroundColor = '#d1ecf1';
            statusDiv.style.color = '#0c5460';
            statusDiv.style.borderColor = '#bee5eb';
            break;
    }
}

function generateUPIQRCode() {
    const canvas = document.getElementById('upiQRCode');
    if (!canvas) return;
    
    const amount = parseFloat(document.getElementById('totalAmount').textContent);
    const merchantUPI = 'merchant@okaxis'; // Replace with your actual UPI ID
    const merchantName = 'Shri Ganpati Murtis';
    const transactionId = 'TXN' + Date.now();
    
    const upiUrl = `upi://pay?pa=${merchantUPI}&pn=${encodeURIComponent(merchantName)}&am=${amount}&cu=INR&tn=${encodeURIComponent('Order Payment')}&tr=${transactionId}`;
    
    QRCode.toCanvas(canvas, upiUrl, {
        width: 200,
        height: 200,
        margin: 2,
        color: {
            dark: '#000000',
            light: '#ffffff'
        }
    });
}

async function handlePayment() {
    const selectedPaymentMethod = document.querySelector('input[name="paymentMethod"]:checked');
    if (!selectedPaymentMethod) {
        showFlashMessage('Please select a payment method', 'error');
        return;
    }
    
    const fullAddress = document.getElementById('fullAddress').value.trim();
    const phoneNumber = document.getElementById('phoneNumber').value.trim();
    const pincode = document.getElementById('pincode').value.trim();
    
    if (!fullAddress || !phoneNumber || !pincode) {
        showFlashMessage('Please fill in all shipping details', 'error');
        return;
    }
    
    // Validate pincode (6 digits)
    if (!/^\d{6}$/.test(pincode)) {
        showFlashMessage('Please enter a valid 6-digit pincode', 'error');
        return;
    }
    
    // Validate phone number (10 digits with optional country code)
    if (!/^(\+91|91)?[6-9]\d{9}$/.test(phoneNumber.replace(/\s/g, ''))) {
        showFlashMessage('Please enter a valid Indian phone number', 'error');
        return;
    }
    
    // For UPI payment, check if UPI ID is verified
    if (selectedPaymentMethod.value === 'upi') {
        const upiForm = document.getElementById('upiDetailsForm');
        const verifiedUpi = upiForm.dataset.verifiedUpi;
        const upiId = document.getElementById('upiId').value.trim();
        
        // Either UPI should be verified or user should have entered a UPI ID
        if (!verifiedUpi && !upiId) {
            showFlashMessage('Please enter and verify your UPI ID', 'error');
            return;
        }
        
        // If UPI ID is entered but not verified, show warning but allow proceeding
        if (upiId && !verifiedUpi) {
            if (!confirm('UPI ID is not verified. Do you want to proceed with payment?')) {
                return;
            }
        }
    }
    
    const payNowBtn = document.getElementById('payNowBtn');
    const originalText = payNowBtn.textContent;
    payNowBtn.disabled = true;
    payNowBtn.textContent = 'Processing...';
    
    try {
        // Check if it's a direct product purchase or cart purchase
        const urlParams = new URLSearchParams(window.location.search);
        const fromProducts = urlParams.get('fromProducts') === 'true';
        const fromCart = urlParams.get('fromCart') === 'true';
        
        // Prepare order data
        const formData = new FormData();
        formData.append('action', 'create_order');
        formData.append('payment_method', selectedPaymentMethod.value);
        formData.append('shipping_address', fullAddress);
        formData.append('phone_number', phoneNumber);
        formData.append('pincode', pincode);
        
        if (selectedPaymentMethod.value === 'upi') {
            const upiForm = document.getElementById('upiDetailsForm');
            const verifiedUpi = upiForm.dataset.verifiedUpi;
            const upiId = document.getElementById('upiId').value.trim();
            formData.append('upi_id', verifiedUpi || upiId);
        }
        
        if (fromProducts) {
            // Direct product purchase
            const productId = urlParams.get('id');
            const option = urlParams.get('option') || 'regular';
            const quantity = parseInt(urlParams.get('quantity')) || 1;
            
            // Get current product data from display
            const productName = document.getElementById('productName').textContent;
            const totalAmount = parseFloat(document.getElementById('totalAmount').textContent);
            
            formData.append('product_id', productId);
            formData.append('product_name', productName);
            formData.append('quantity', quantity);
            formData.append('price_option', option);
            formData.append('total_amount', totalAmount);
        } else {
            // Cart purchase - get data from localStorage as fallback
            const savedCart = localStorage.getItem('cartItems');
            const cartItems = savedCart ? JSON.parse(savedCart) : [];
            
            if (cartItems.length === 0) {
                throw new Error('No items to order');
            }
            
            // For simplicity, process first item (can be enhanced for multiple items)
            const item = cartItems[0];
            const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
            const tax = subtotal * 0.18;
            const total = subtotal + 50 + tax; // Add shipping
            
            formData.append('product_id', item.productId);
            formData.append('product_name', item.productName);
            formData.append('quantity', item.quantity);
            formData.append('price_option', item.isDecorative ? 'decorative' : 'regular');
            formData.append('total_amount', total);
        }
        
        // Send order to server
        const response = await fetch('php/orders.php', {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Clear cart only if it was a cart purchase
            if (fromCart) {
                localStorage.removeItem('cartItems');
                // Also clear cart from database
                const clearCartData = new FormData();
                clearCartData.append('action', 'clear_cart');
                await fetch('php/products.php', {
                    method: 'POST',
                    body: clearCartData
                });
            }
            
            // Generate order ID
            const orderId = data.order_id || 'ORD' + Math.floor(100000 + Math.random() * 900000);
            document.getElementById('orderId').textContent = orderId;
            
            // Show success modal
            document.getElementById('successModal').style.display = 'block';
        } else {
            throw new Error(data.message || 'Failed to place order');
        }
        
    } catch (error) {
        console.error('Payment error:', error);
        showFlashMessage(error.message || 'Payment failed. Please try again.', 'error');
    } finally {
        payNowBtn.disabled = false;
        payNowBtn.textContent = originalText;
    }
}

function closeSuccessModal() {
    document.getElementById('successModal').style.display = 'none';
    window.location.href = 'profile.html';
}

function showFlashMessage(message, type = 'info') {
    const flashContainer = document.getElementById('flashMessage');
    if (!flashContainer) return;
    
    flashContainer.className = `flash-message ${type}`;
    flashContainer.textContent = message;
    flashContainer.style.display = 'block';
    
    setTimeout(() => {
        flashContainer.style.display = 'none';
    }, 3000);
}