// Admin page JavaScript

document.addEventListener('DOMContentLoaded', function() {
    initializeAdminPage();
});

function initializeAdminPage() {
    if (!requireAdmin()) return;
    
    document.getElementById('adminDashboard').style.display = 'block';
    loadDashboardStats();
    loadClaims();
    setupEventListeners();
}

function setupEventListeners() {
    // Filter changes
    document.getElementById('claimStatusFilter').addEventListener('change', loadClaims);
    document.getElementById('orderStatusFilter').addEventListener('change', loadOrders);
    
    // Form submissions
    document.getElementById('claimReviewForm').addEventListener('submit', handleClaimReview);
    document.getElementById('orderUpdateForm').addEventListener('submit', handleOrderUpdate);
}

async function loadDashboardStats() {
    try {
        const response = await fetch('php/admin.php?action=get_dashboard_stats');
        const data = await response.json();

        if (data.success) {
            document.getElementById('totalOrders').textContent = data.stats.total_orders;
            document.getElementById('pendingClaims').textContent = data.stats.pending_claims;
            document.getElementById('totalUsers').textContent = data.stats.total_users;
            document.getElementById('totalRevenue').textContent = formatCurrency(data.stats.total_revenue);
        }
    } catch (error) {
        console.error('Error loading dashboard stats:', error);
    }
}

function showAdminTab(tabName) {
    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });

    // Show selected tab
    document.getElementById(tabName + 'Tab').classList.add('active');
    event.target.classList.add('active');

    // Load data for the selected tab
    switch(tabName) {
        case 'claims':
            loadClaims();
            break;
        case 'orders':
            loadOrders();
            break;
        case 'users':
            loadUsers();
            break;
    }
}

async function loadClaims() {
    const status = document.getElementById('claimStatusFilter').value;
    
    try {
        const url = `php/admin.php?action=get_claims${status ? '&status=' + status : ''}`;
        const response = await fetch(url);
        const data = await response.json();

        const claimsList = document.getElementById('claimsList');

        if (data.success && data.claims.length > 0) {
            claimsList.innerHTML = data.claims.map(claim => `
                <div style="border: 1px solid #e9ecef; border-radius: 15px; padding: 1.5rem; margin-bottom: 1rem;">
                    <div style="display: grid; grid-template-columns: 150px 1fr auto; gap: 1rem; align-items: start;">
                        <div>
                            <img src="${claim.image_path}" alt="Claim Image" 
                                 style="width: 150px; height: 150px; object-fit: cover; border-radius: 10px; cursor: pointer;"
                                 onclick="window.open('${claim.image_path}', '_blank')">
                        </div>
                        
                        <div>
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                                <div>
                                    <h4 style="color: #2c3e50; margin-bottom: 0.5rem;">Claim #${claim.id}</h4>
                                    <p style="color: #666; font-size: 0.9rem;">
                                        By: ${claim.customer_name} (${claim.email})
                                    </p>
                                    <p style="color: #666; font-size: 0.9rem;">
                                        ${formatDateTime(claim.created_at)}
                                    </p>
                                </div>
                                <div style="background: ${getClaimStatusColor(claim.status)}; color: white; padding: 5px 15px; border-radius: 20px; font-size: 0.8rem;">
                                    ${claim.status.toUpperCase()}
                                </div>
                            </div>
                            
                            <div style="margin-bottom: 1rem;">
                                <strong>Description:</strong>
                                <p style="color: #666; margin-top: 0.5rem;">${claim.description}</p>
                            </div>
                            
                            ${claim.product_name ? `
                                <div style="margin-bottom: 1rem;">
                                    <strong>Product:</strong> ${claim.product_name}
                                </div>
                            ` : ''}
                            
                            ${claim.admin_notes ? `
                                <div style="background: #f8f9fa; padding: 10px; border-radius: 10px; margin-bottom: 1rem;">
                                    <strong>Admin Notes:</strong> ${claim.admin_notes}
                                </div>
                            ` : ''}
                        </div>
                        
                        <div>
                            <button onclick="openClaimModal(${claim.id})" class="btn btn-primary" style="width: 100px;">
                                Review
                            </button>
                        </div>
                    </div>
                </div>
            `).join('');
        } else {
            claimsList.innerHTML = `
                <div style="text-align: center; padding: 3rem; color: #666;">
                    <div style="font-size: 3rem; margin-bottom: 1rem;">📸</div>
                    <h3>No Claims Found</h3>
                    <p>No claims match the selected criteria.</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading claims:', error);
        document.getElementById('claimsList').innerHTML = `
            <div style="text-align: center; padding: 2rem; color: #dc3545;">
                <p>Failed to load claims. Please try again.</p>
            </div>
        `;
    }
}

async function loadOrders() {
    const status = document.getElementById('orderStatusFilter').value;
    
    try {
        const url = `php/admin.php?action=get_orders${status ? '&status=' + status : ''}`;
        const response = await fetch(url);
        const data = await response.json();

        const ordersList = document.getElementById('ordersList');

        if (data.success && data.orders.length > 0) {
            ordersList.innerHTML = data.orders.map(order => `
                <div style="border: 1px solid #e9ecef; border-radius: 15px; padding: 1.5rem; margin-bottom: 1rem;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                        <div>
                            <h4 style="color: #2c3e50; margin-bottom: 0.5rem;">Order #${order.id}</h4>
                            <p style="color: #666; font-size: 0.9rem;">
                                Customer: ${order.customer_name} (${order.email})
                            </p>
                            <p style="color: #666; font-size: 0.9rem;">
                                ${formatDateTime(order.created_at)}
                            </p>
                        </div>
                        <div style="text-align: right;">
                            <div style="background: ${getOrderStatusColor(order.status)}; color: white; padding: 5px 15px; border-radius: 20px; font-size: 0.8rem; margin-bottom: 0.5rem;">
                                ${order.status.toUpperCase()}
                            </div>
                            <div style="font-weight: 700; color: #ff6b35;">${formatCurrency(order.total_amount)}</div>
                        </div>
                    </div>
                    
                    <div style="display: grid; grid-template-columns: 1fr auto; gap: 1rem; align-items: end;">
                        <div>
                            <div style="margin-bottom: 0.5rem;">
                                <strong>Items:</strong> ${order.item_count} item(s)
                            </div>
                            <div style="margin-bottom: 0.5rem;">
                                <strong>Phone:</strong> ${order.phone}
                            </div>
                            <div style="margin-bottom: 0.5rem;">
                                <strong>Address:</strong> ${order.shipping_address}
                            </div>
                            ${order.tracking_id ? `
                                <div style="background: #f8f9fa; padding: 10px; border-radius: 10px;">
                                    <strong>Tracking ID:</strong> ${order.tracking_id}
                                </div>
                            ` : ''}
                        </div>
                        
                        <div>
                            <button onclick="openOrderModal(${order.id})" class="btn btn-primary" style="width: 100px;">
                                Update
                            </button>
                        </div>
                    </div>
                </div>
            `).join('');
        } else {
            ordersList.innerHTML = `
                <div style="text-align: center; padding: 3rem; color: #666;">
                    <div style="font-size: 3rem; margin-bottom: 1rem;">📦</div>
                    <h3>No Orders Found</h3>
                    <p>No orders match the selected criteria.</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading orders:', error);
        document.getElementById('ordersList').innerHTML = `
            <div style="text-align: center; padding: 2rem; color: #dc3545;">
                <p>Failed to load orders. Please try again.</p>
            </div>
        `;
    }
}

async function loadUsers() {
    try {
        const response = await fetch('php/admin.php?action=get_users');
        const data = await response.json();

        const usersList = document.getElementById('usersList');

        if (data.success && data.users.length > 0) {
            usersList.innerHTML = data.users.map(user => `
                <div style="border: 1px solid #e9ecef; border-radius: 15px; padding: 1.5rem; margin-bottom: 1rem;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <h4 style="color: #2c3e50; margin-bottom: 0.5rem;">
                                ${user.first_name} ${user.last_name}
                                ${user.is_admin ? '<span style="background: #ff6b35; color: white; padding: 2px 8px; border-radius: 10px; font-size: 0.7rem; margin-left: 10px;">ADMIN</span>' : ''}
                            </h4>
                            <p style="color: #666; font-size: 0.9rem; margin-bottom: 0.5rem;">
                                📧 ${user.email}
                            </p>
                            <p style="color: #666; font-size: 0.9rem; margin-bottom: 0.5rem;">
                                📞 ${user.phone || 'Not provided'}
                            </p>
                            <p style="color: #666; font-size: 0.9rem;">
                                Joined: ${formatDate(user.created_at)}
                            </p>
                        </div>
                        <div style="text-align: right;">
                            <div style="background: ${user.is_verified ? '#28a745' : '#ffc107'}; color: white; padding: 5px 15px; border-radius: 20px; font-size: 0.8rem; margin-bottom: 0.5rem;">
                                ${user.is_verified ? 'VERIFIED' : 'PENDING'}
                            </div>
                            <div style="color: #666; font-size: 0.8rem;">
                                Orders: ${user.order_count || 0}
                            </div>
                        </div>
                    </div>
                </div>
            `).join('');
        } else {
            usersList.innerHTML = `
                <div style="text-align: center; padding: 3rem; color: #666;">
                    <div style="font-size: 3rem; margin-bottom: 1rem;">👥</div>
                    <h3>No Users Found</h3>
                    <p>No users registered yet.</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading users:', error);
        document.getElementById('usersList').innerHTML = `
            <div style="text-align: center; padding: 2rem; color: #dc3545;">
                <p>Failed to load users. Please try again.</p>
            </div>
        `;
    }
}

async function openClaimModal(claimId) {
    try {
        const response = await fetch(`php/admin.php?action=get_claim&id=${claimId}`);
        const data = await response.json();

        if (data.success) {
            const claim = data.claim;
            
            document.getElementById('claimId').value = claim.id;
            document.getElementById('claimStatus').value = claim.status;
            document.getElementById('adminNotes').value = claim.admin_notes || '';
            
            document.getElementById('claimDetails').innerHTML = `
                <div style="display: grid; grid-template-columns: 200px 1fr; gap: 1rem; margin-bottom: 1.5rem; padding-bottom: 1.5rem; border-bottom: 1px solid #eee;">
                    <img src="${claim.image_path}" alt="Claim Image" 
                         style="width: 200px; height: 200px; object-fit: cover; border-radius: 10px;">
                    <div>
                        <h4 style="margin-bottom: 1rem;">Claim #${claim.id}</h4>
                        <p><strong>Customer:</strong> ${claim.customer_name} (${claim.email})</p>
                        <p><strong>Date:</strong> ${formatDateTime(claim.created_at)}</p>
                        ${claim.product_name ? `<p><strong>Product:</strong> ${claim.product_name}</p>` : ''}
                        <p><strong>Description:</strong></p>
                        <p style="color: #666; background: #f8f9fa; padding: 10px; border-radius: 5px;">${claim.description}</p>
                    </div>
                </div>
            `;
            
            document.getElementById('claimModal').style.display = 'flex';
        }
    } catch (error) {
        console.error('Error loading claim details:', error);
        showFlashMessage('Failed to load claim details', 'error');
    }
}

async function openOrderModal(orderId) {
    try {
        const response = await fetch(`php/admin.php?action=get_order&id=${orderId}`);
        const data = await response.json();

        if (data.success) {
            const order = data.order;
            
            document.getElementById('orderId').value = order.id;
            document.getElementById('orderStatus').value = order.status;
            document.getElementById('trackingId').value = order.tracking_id || '';
            
            document.getElementById('orderModal').style.display = 'flex';
        }
    } catch (error) {
        console.error('Error loading order details:', error);
        showFlashMessage('Failed to load order details', 'error');
    }
}

function closeClaimModal() {
    document.getElementById('claimModal').style.display = 'none';
}

function closeOrderModal() {
    document.getElementById('orderModal').style.display = 'none';
}

async function handleClaimReview(e) {
    e.preventDefault();

    const claimId = document.getElementById('claimId').value;
    const status = document.getElementById('claimStatus').value;
    const adminNotes = document.getElementById('adminNotes').value;

    const submitBtn = e.target.querySelector('button[type="submit"]');
    const hideLoading = showLoading(submitBtn);

    try {
        const formData = new FormData();
        formData.append('action', 'update_claim');
        formData.append('claim_id', claimId);
        formData.append('status', status);
        formData.append('admin_notes', adminNotes);

        const response = await fetch('php/admin.php', {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (data.success) {
            showFlashMessage('Claim updated successfully!', 'success');
            closeClaimModal();
            loadClaims();
            loadDashboardStats();
        } else {
            showFlashMessage(data.message, 'error');
        }
    } catch (error) {
        console.error('Error updating claim:', error);
        showFlashMessage('Failed to update claim. Please try again.', 'error');
    } finally {
        hideLoading();
    }
}

async function handleOrderUpdate(e) {
    e.preventDefault();

    const orderId = document.getElementById('orderId').value;
    const status = document.getElementById('orderStatus').value;
    const trackingId = document.getElementById('trackingId').value;

    const submitBtn = e.target.querySelector('button[type="submit"]');
    const hideLoading = showLoading(submitBtn);

    try {
        const formData = new FormData();
        formData.append('action', 'update_order');
        formData.append('order_id', orderId);
        formData.append('status', status);
        formData.append('tracking_id', trackingId);

        const response = await fetch('php/admin.php', {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (data.success) {
            showFlashMessage('Order updated successfully!', 'success');
            closeOrderModal();
            loadOrders();
            loadDashboardStats();
        } else {
            showFlashMessage(data.message, 'error');
        }
    } catch (error) {
        console.error('Error updating order:', error);
        showFlashMessage('Failed to update order. Please try again.', 'error');
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

function getOrderStatusColor(status) {
    const colors = {
        'pending': '#ffc107',
        'processing': '#17a2b8',
        'shipped': '#007bff',
        'delivered': '#28a745',
        'cancelled': '#dc3545'
    };
    return colors[status] || '#6c757d';
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