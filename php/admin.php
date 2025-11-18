<?php
require_once '../config/database.php';

header('Content-Type: application/json');

// Check admin access for all actions
if (!isAdmin()) {
    echo json_encode(['success' => false, 'message' => 'Admin access required']);
    exit;
}

$action = $_POST['action'] ?? $_GET['action'] ?? '';

switch ($action) {
    case 'get_dashboard_stats':
        handleGetDashboardStats();
        break;
    case 'get_claims':
        handleGetClaims();
        break;
    case 'get_claim':
        handleGetClaim();
        break;
    case 'update_claim':
        handleUpdateClaim();
        break;
    case 'approve_claim':
        handleApproveClaim();
        break;
    case 'get_orders':
        handleGetOrders();
        break;
    case 'get_order':
        handleGetOrder();
        break;
    case 'update_order':
        handleUpdateOrder();
        break;
    case 'get_users':
        handleGetUsers();
        break;
    default:
        echo json_encode(['success' => false, 'message' => 'Invalid action']);
}

function handleGetDashboardStats() {
    try {
        // Get total orders
        $totalOrders = getSingleRecord("SELECT COUNT(*) as count FROM orders");
        
        // Get pending claims
        $pendingClaims = getSingleRecord("SELECT COUNT(*) as count FROM claims WHERE status = 'pending'");
        
        // Get total users
        $totalUsers = getSingleRecord("SELECT COUNT(*) as count FROM users WHERE is_admin = 0");
        
        // Get total revenue
        $totalRevenue = getSingleRecord("SELECT SUM(total_amount) as total FROM orders WHERE status = 'delivered'");
        
        echo json_encode([
            'success' => true,
            'stats' => [
                'total_orders' => $totalOrders['count'] ?? 0,
                'pending_claims' => $pendingClaims['count'] ?? 0,
                'total_users' => $totalUsers['count'] ?? 0,
                'total_revenue' => $totalRevenue['total'] ?? 0
            ]
        ]);
    } catch (Exception $e) {
        error_log("Dashboard stats error: " . $e->getMessage());
        echo json_encode(['success' => false, 'message' => 'Failed to load dashboard stats']);
    }
}

function handleGetClaims() {
    $status = sanitizeInput($_GET['status'] ?? '');
    
    $sql = "SELECT c.*, 
                   CONCAT(u.first_name, ' ', u.last_name) as customer_name,
                   u.email,
                   p.name as product_name,
                   (SELECT COUNT(*) FROM orders o2 WHERE o2.user_id = c.user_id) as user_order_count
            FROM claims c
            JOIN users u ON c.user_id = u.id
            LEFT JOIN products p ON c.product_id = p.id";
    
    $params = [];
    
    if (!empty($status)) {
        $sql .= " WHERE c.status = ?";
        $params[] = $status;
    }
    
    $sql .= " ORDER BY c.created_at DESC";
    
    $claims = getMultipleRecords($sql, $params);
    
    if ($claims !== false) {
        echo json_encode([
            'success' => true,
            'claims' => $claims
        ]);
    } else {
        echo json_encode(['success' => false, 'message' => 'Failed to fetch claims']);
    }
}

function handleApproveClaim() {
    $claimId = sanitizeInput($_POST['claim_id'] ?? '');
    $adminNotes = sanitizeInput($_POST['admin_notes'] ?? '');
    if (empty($claimId)) {
        echo json_encode(['success' => false, 'message' => 'Claim ID is required']);
        return;
    }
    $updated = modifyRecord(
        "UPDATE claims SET status = 'approved', admin_notes = ? WHERE id = ?",
        [$adminNotes, $claimId]
    );
    if ($updated) {
        echo json_encode(['success' => true, 'message' => 'Claim approved']);
    } else {
        echo json_encode(['success' => false, 'message' => 'Failed to approve claim']);
    }
}

function handleGetClaim() {
    $claimId = sanitizeInput($_GET['id'] ?? '');
    
    if (empty($claimId)) {
        echo json_encode(['success' => false, 'message' => 'Claim ID is required']);
        return;
    }
    
    $claim = getSingleRecord(
        "SELECT c.*, 
                CONCAT(u.first_name, ' ', u.last_name) as customer_name,
                u.email,
                p.name as product_name
         FROM claims c
         JOIN users u ON c.user_id = u.id
         LEFT JOIN products p ON c.product_id = p.id
         WHERE c.id = ?",
        [$claimId]
    );
    
    if ($claim) {
        echo json_encode([
            'success' => true,
            'claim' => $claim
        ]);
    } else {
        echo json_encode(['success' => false, 'message' => 'Claim not found']);
    }
}

function handleUpdateClaim() {
    $claimId = sanitizeInput($_POST['claim_id'] ?? '');
    $status = sanitizeInput($_POST['status'] ?? '');
    $adminNotes = sanitizeInput($_POST['admin_notes'] ?? '');
    
    if (empty($claimId) || empty($status)) {
        echo json_encode(['success' => false, 'message' => 'Claim ID and status are required']);
        return;
    }
    
    $validStatuses = ['pending', 'approved', 'rejected'];
    if (!in_array($status, $validStatuses)) {
        echo json_encode(['success' => false, 'message' => 'Invalid status']);
        return;
    }
    
    $updated = modifyRecord(
        "UPDATE claims SET status = ?, admin_notes = ? WHERE id = ?",
        [$status, $adminNotes, $claimId]
    );
    
    if ($updated) {
        echo json_encode(['success' => true, 'message' => 'Claim updated successfully']);
    } else {
        echo json_encode(['success' => false, 'message' => 'Failed to update claim']);
    }
}

function handleGetOrders() {
    $status = sanitizeInput($_GET['status'] ?? '');
    
    $sql = "SELECT o.*, 
                   CONCAT(u.first_name, ' ', u.last_name) as customer_name,
                   u.email,
                   COUNT(oi.id) as item_count
            FROM orders o
            JOIN users u ON o.user_id = u.id
            LEFT JOIN order_items oi ON o.id = oi.order_id";
    
    $params = [];
    
    if (!empty($status)) {
        $sql .= " WHERE o.status = ?";
        $params[] = $status;
    }
    
    $sql .= " GROUP BY o.id ORDER BY o.created_at DESC";
    
    $orders = getMultipleRecords($sql, $params);
    
    if ($orders !== false) {
        echo json_encode([
            'success' => true,
            'orders' => $orders
        ]);
    } else {
        echo json_encode(['success' => false, 'message' => 'Failed to fetch orders']);
    }
}

function handleGetOrder() {
    $orderId = sanitizeInput($_GET['id'] ?? '');
    
    if (empty($orderId)) {
        echo json_encode(['success' => false, 'message' => 'Order ID is required']);
        return;
    }
    
    $order = getSingleRecord(
        "SELECT o.*, 
                CONCAT(u.first_name, ' ', u.last_name) as customer_name,
                u.email
         FROM orders o
         JOIN users u ON o.user_id = u.id
         WHERE o.id = ?",
        [$orderId]
    );
    
    if ($order) {
        // Get order items
        $orderItems = getMultipleRecords(
            "SELECT oi.*, p.name, p.image_url
             FROM order_items oi
             JOIN products p ON oi.product_id = p.id
             WHERE oi.order_id = ?",
            [$orderId]
        );
        
        $order['items'] = $orderItems ?: [];
        
        echo json_encode([
            'success' => true,
            'order' => $order
        ]);
    } else {
        echo json_encode(['success' => false, 'message' => 'Order not found']);
    }
}

function handleUpdateOrder() {
    $orderId = sanitizeInput($_POST['order_id'] ?? '');
    $status = sanitizeInput($_POST['status'] ?? '');
    $trackingId = sanitizeInput($_POST['tracking_id'] ?? '');
    
    if (empty($orderId) || empty($status)) {
        echo json_encode(['success' => false, 'message' => 'Order ID and status are required']);
        return;
    }
    
    $validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
    if (!in_array($status, $validStatuses)) {
        echo json_encode(['success' => false, 'message' => 'Invalid status']);
        return;
    }
    
    $sql = "UPDATE orders SET status = ?";
    $params = [$status];
    
    if (!empty($trackingId)) {
        $sql .= ", tracking_id = ?";
        $params[] = $trackingId;
    }
    
    $sql .= " WHERE id = ?";
    $params[] = $orderId;
    
    $updated = modifyRecord($sql, $params);
    
    if ($updated) {
        echo json_encode(['success' => true, 'message' => 'Order updated successfully']);
    } else {
        echo json_encode(['success' => false, 'message' => 'Failed to update order']);
    }
}

function handleGetUsers() {
    $users = getMultipleRecords(
        "SELECT u.*, 
                COUNT(o.id) as order_count
         FROM users u
         LEFT JOIN orders o ON u.id = o.user_id
         GROUP BY u.id
         ORDER BY u.created_at DESC"
    );
    
    if ($users !== false) {
        echo json_encode([
            'success' => true,
            'users' => $users
        ]);
    } else {
        echo json_encode(['success' => false, 'message' => 'Failed to fetch users']);
    }
}
?>