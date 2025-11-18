<?php
require_once '../config/database.php';

header('Content-Type: application/json');

$action = $_POST['action'] ?? $_GET['action'] ?? '';

switch ($action) {
    case 'create_order':
        handleCreateOrder();
        break;
    case 'get_user_orders':
        handleGetUserOrders();
        break;
    case 'get_order_details':
        handleGetOrderDetails();
        break;
    default:
        echo json_encode(['success' => false, 'message' => 'Invalid action']);
}

function handleCreateOrder() {
    if (!isLoggedIn()) {
        echo json_encode(['success' => false, 'message' => 'Please login to place orders']);
        return;
    }
    
    $userId = getCurrentUserId();
    $productId = sanitizeInput($_POST['product_id'] ?? '');
    $productName = sanitizeInput($_POST['product_name'] ?? '');
    $quantity = intval($_POST['quantity'] ?? 1);
    $priceOption = sanitizeInput($_POST['price_option'] ?? 'regular');
    $totalAmount = floatval($_POST['total_amount'] ?? 0);
    $paymentMethod = sanitizeInput($_POST['payment_method'] ?? '');
    $shippingAddress = sanitizeInput($_POST['shipping_address'] ?? '');
    $phoneNumber = sanitizeInput($_POST['phone_number'] ?? '');
    $pincode = sanitizeInput($_POST['pincode'] ?? '');
    $upiId = sanitizeInput($_POST['upi_id'] ?? '');
    
    if (empty($productId) || empty($productName) || empty($paymentMethod) || 
        empty($shippingAddress) || empty($phoneNumber)) {
        echo json_encode(['success' => false, 'message' => 'Please fill in all required fields']);
        return;
    }
    
    try {
        // Begin transaction
        $pdo = getDBConnection();
        $pdo->beginTransaction();
        
        // Insert order
        $sql = "INSERT INTO orders (user_id, product_id, product_name, quantity, price_option, 
                total_amount, payment_method, shipping_address, phone_number, pincode) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
        
        $orderId = insertRecord($sql, [
            $userId, $productId, $productName, $quantity, $priceOption,
            $totalAmount, $paymentMethod, $shippingAddress, $phoneNumber, $pincode
        ]);
        
        if (!$orderId) {
            throw new Exception('Failed to create order');
        }
        
        // Commit transaction
        $pdo->commit();
        
        echo json_encode([
            'success' => true,
            'message' => 'Order placed successfully',
            'order_id' => $orderId
        ]);
        
    } catch (Exception $e) {
        // Rollback transaction
        if (isset($pdo) && $pdo->inTransaction()) {
            $pdo->rollback();
        }
        echo json_encode(['success' => false, 'message' => 'Failed to place order: ' . $e->getMessage()]);
    }
}

function handleGetUserOrders() {
    if (!isLoggedIn()) {
        echo json_encode(['success' => false, 'message' => 'Please login to view orders']);
        return;
    }
    
    $userId = getCurrentUserId();
    
    $sql = "SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC";
    $orders = getMultipleRecords($sql, [$userId]);
    
    if ($orders !== false) {
        echo json_encode([
            'success' => true,
            'orders' => $orders
        ]);
    } else {
        echo json_encode(['success' => false, 'message' => 'Failed to fetch orders']);
    }
}

function handleGetOrderDetails() {
    if (!isLoggedIn()) {
        echo json_encode(['success' => false, 'message' => 'Please login to view order details']);
        return;
    }
    
    $orderId = intval($_GET['order_id'] ?? 0);
    $userId = getCurrentUserId();
    
    // Verify order belongs to user
    $order = getSingleRecord("SELECT * FROM orders WHERE id = ? AND user_id = ?", [$orderId, $userId]);
    
    if (!$order) {
        echo json_encode(['success' => false, 'message' => 'Order not found']);
        return;
    }
    
    // Get order items
    $sql = "SELECT oi.*, p.name as product_name, p.image_url 
            FROM order_items oi 
            JOIN products p ON oi.product_id = p.id 
            WHERE oi.order_id = ?";
    $orderItems = getMultipleRecords($sql, [$orderId]);
    
    if ($orderItems !== false) {
        $order['items'] = $orderItems;
        echo json_encode([
            'success' => true,
            'order' => $order
        ]);
    } else {
        echo json_encode(['success' => false, 'message' => 'Failed to fetch order details']);
    }
}
?>