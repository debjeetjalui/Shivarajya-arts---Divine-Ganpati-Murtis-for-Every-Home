// Claim page JavaScript

document.addEventListener('DOMContentLoaded', function() {
    initializeClaimPage();
});

function initializeClaimPage() {
    if (!currentUser) {
        document.getElementById('loginRequired').style.display = 'block';
        return;
    }

    document.getElementById('claimsSection').style.display = 'block';
    loadUserOrders();
    loadUserProducts();
    loadUserClaims();
    setupEventListeners();
}

function setupEventListeners() {
    document.getElementById('claimForm').addEventListener('submit', handleClaimSubmission);
    
    // Image preview
    setupImagePreview(
        document.getElementById('claimImage'),
        document.getElementById('imagePreview')
    );
}

async function loadUserOrders() {
    try {
        const response = await fetch('php/orders.php?action=get_user_orders');
        const data = await response.json();

        const orderSelect = document.getElementById('orderSelect');
        
        if (data.success && data.orders.length > 0) {
            orderSelect.innerHTML = '<option value="">Select an order...</option>' +
                data.orders.map(order => 
                    `<option value="${order.id}">Order #${order.id} - ${formatDate(order.created_at)} (${formatCurrency(order.total_amount)})</option>`
                ).join('');
        } else {
            orderSelect.innerHTML = '<option value="">No orders found</option>';
        }
    } catch (error) {
        console.error('Error loading orders:', error);
    }
}

async function loadUserProducts() {
    try {
        const response = await fetch('php/products.php?action=get_products');
        const data = await response.json();

        const productSelect = document.getElementById('productSelect');
        
        if (data.success && data.products.length > 0) {
            productSelect.innerHTML = '<option value="">Select a product...</option>' +
                data.products.map(product => 
                    `<option value="${product.id}">${product.name} - ${formatCurrency(product.base_price)}</option>`
                ).join('');
        } else {
            productSelect.innerHTML = '<option value="">No products found</option>';
        }
    } catch (error) {
        console.error('Error loading products:', error);
    }
}

async function loadUserClaims() {
    const claimsList = document.getElementById('claimsList');
    try {
        const response = await fetch('php/claim.php?action=get_user_claims');
        const data = await response.json();


        if (data.success && data.claims.length > 0) {
            claimsList.innerHTML = data.claims.map(claim => `
                <div style="border: 1px solid #e9ecef; border-radius: 15px; padding: 1.5rem; margin-bottom: 1rem;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                        <div>
                            <h4 style="color: #2c3e50; margin-bottom: 0.5rem;">Claim #${claim.id}</h4>
                            <p style="color: #666; font-size: 0.9rem;">${formatDateTime(claim.created_at)}</p>
                        </div>
                        <div style="background: ${getClaimStatusColor(claim.status)}; color: white; padding: 5px 15px; border-radius: 20px; font-size: 0.8rem;">
                            ${claim.status.toUpperCase()}
                        </div>
                    </div>
                    
                    <div style="display: grid; grid-template-columns: 100px 1fr; gap: 1rem; margin-bottom: 1rem;">
                        <img src="${claim.image_path}" alt="Claim Image" 
                             style="width: 100px; height: 100px; object-fit: cover; border-radius: 10px; cursor: pointer;"
                             onclick="window.open('${claim.image_path}', '_blank')">
                        <div>
                            <p style="color: #666; margin-bottom: 0.5rem;"><strong>Description:</strong></p>
                            <p style="color: #333; font-size: 0.9rem;">${claim.description}</p>
                        </div>
                    </div>
                    
                    ${claim.admin_notes ? `
                        <div style="background: #f8f9fa; padding: 10px; border-radius: 10px;">
                            <strong>Admin Response:</strong>
                            <p style="margin: 0.5rem 0 0 0; color: #666;">${claim.admin_notes}</p>
                        </div>
                    ` : ''}
                </div>
            `).join('');
        } else {
            claimsList.innerHTML = `
                <div style="text-align: center; padding: 3rem; color: #666;">
                    <div style="font-size: 3rem; margin-bottom: 1rem;">📸</div>
                    <h3>No Claims Yet</h3>
                    <p>You haven't submitted any claims yet.</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading claims:', error);
        claimsList.innerHTML = `
            <div style="text-align: center; padding: 2rem; color: #dc3545;">
                <p>Failed to load claims. Please try again.</p>
            </div>
        `;
    }
}

async function handleClaimSubmission(e) {
    e.preventDefault();

    const orderId = document.getElementById('orderSelect').value;
    const productId = document.getElementById('productSelect').value;
    const claimImage = document.getElementById('claimImage').files[0];
    const description = document.getElementById('claimDescription').value.trim();

    if (!claimImage) {
        showFlashMessage('Please upload an image of the defective murti', 'error');
        return;
    }

    if (!description) {
        showFlashMessage('Please provide a description of the defect', 'error');
        return;
    }

    // Validate image file
    if (!claimImage.type.startsWith('image/')) {
        showFlashMessage('Please upload a valid image file', 'error');
        return;
    }

    if (claimImage.size > 5 * 1024 * 1024) { // 5MB limit
        showFlashMessage('Image file size should be less than 5MB', 'error');
        return;
    }

    const submitBtn = e.target.querySelector('button[type="submit"]');
    const hideLoading = showLoading(submitBtn);

    try {
        const formData = new FormData();
        formData.append('action', 'submit_claim');
        formData.append('order_id', orderId);
        formData.append('product_id', productId);
        formData.append('claim_image', claimImage);
        formData.append('description', description);

        const response = await fetch('php/claim.php', {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (data.success) {
            showFlashMessage('Claim submitted successfully! We will review it shortly.', 'success');
            
            // Reset form
            document.getElementById('claimForm').reset();
            document.getElementById('imagePreview').style.display = 'none';
            
            // Reload claims list
            loadUserClaims();
        } else {
            const detail = data && data.error ? `: ${data.error}` : '';
            showFlashMessage(`${data.message || 'Failed to submit claim'}${detail}`, 'error');
        }
    } catch (error) {
        console.error('Error submitting claim:', error);
        showFlashMessage('Failed to submit claim. Please try again.', 'error');
    } finally {
        hideLoading();
    }
}

function getClaimStatusColor(status) {
    const colors = {
        'pending': '#ffc107',
        'approved': '#28a745',
        'rejected': '#dc3545'
    };
    return colors[status] || '#6c757d';
}