<?php
require_once '../config/database.php';

header('Content-Type: application/json');

$action = $_POST['action'] ?? $_GET['action'] ?? '';

// Add debugging
error_log("Products API called with action: " . $action);

switch ($action) {
    case 'get_products':
        handleGetProducts();
        break;
    case 'get_product':
        handleGetProduct();
        break;
    case 'add_to_cart':
        handleAddToCart();
        break;
    case 'get_cart':
        handleGetCart();
        break;
    case 'update_cart':
        handleUpdateCart();
        break;
    case 'remove_from_cart':
        handleRemoveFromCart();
        break;
    case 'clear_cart':
        handleClearCart();
        break;
    default:
        echo json_encode(['success' => false, 'message' => 'Invalid action']);
}

function handleGetProducts() {
    $size = sanitizeInput($_GET['size'] ?? '');
    $material = sanitizeInput($_GET['material'] ?? '');
    $type = sanitizeInput($_GET['type'] ?? '');
    $search = sanitizeInput($_GET['search'] ?? '');
    
    $sql = "SELECT * FROM products WHERE is_active = 1";
    $params = [];
    
    if (!empty($size)) {
        $sql .= " AND size_category = ?";
        $params[] = $size;
    }
    
    if (!empty($material)) {
        $sql .= " AND material_category = ?";
        $params[] = $material;
    }
    
    if (!empty($type)) {
        $sql .= " AND type_category = ?";
        $params[] = $type;
    }
    
    if (!empty($search)) {
        $sql .= " AND (name LIKE ? OR description LIKE ?)";
        $params[] = "%$search%";
        $params[] = "%$search%";
    }
    
    $sql .= " ORDER BY name ASC";
    
    $products = getMultipleRecords($sql, $params);
    
    if ($products !== false) {
        echo json_encode([
            'success' => true,
            'products' => $products
        ]);
    } else {
        echo json_encode(['success' => false, 'message' => 'Failed to fetch products']);
    }
}

function handleGetProduct() {
    $productId = sanitizeInput($_GET['id'] ?? '');
    
    if (empty($productId)) {
        echo json_encode(['success' => false, 'message' => 'Product ID is required']);
        return;
    }
    
    $product = getSingleRecord("SELECT * FROM products WHERE id = ? AND is_active = 1", [$productId]);
    
    if ($product) {
        echo json_encode([
            'success' => true,
            'product' => $product
        ]);
    } else {
        echo json_encode(['success' => false, 'message' => 'Product not found']);
    }
}

function handleAddToCart() {
    error_log("Add to cart called. User logged in: " . (isLoggedIn() ? 'Yes' : 'No'));
    if (!isLoggedIn()) {
        echo json_encode(['success' => false, 'message' => 'Please login to add items to cart']);
        return;
    }
    
    $productId = sanitizeInput($_POST['product_id'] ?? '');
    $quantity = intval($_POST['quantity'] ?? 1);
    $isDecorative = filter_var($_POST['is_decorative'] ?? false, FILTER_VALIDATE_BOOLEAN);
    $userId = getCurrentUserId();
    
    error_log("Add to cart params - User ID: $userId, Product ID: $productId, Quantity: $quantity, Is Decorative: " . ($isDecorative ? 'true' : 'false'));
    
    if (empty($productId) || $quantity <= 0) {
        echo json_encode(['success' => false, 'message' => 'Invalid product or quantity']);
        return;
    }
    
    // Check product exists and has stock
    $product = getSingleRecord("SELECT * FROM products WHERE id = ? AND is_active = 1", [$productId]);
    if (!$product) {
        echo json_encode(['success' => false, 'message' => 'Product not found']);
        return;
    }
    
    if ($product['stock_quantity'] < $quantity) {
        echo json_encode(['success' => false, 'message' => 'Insufficient stock']);
        return;
    }
    
    // Check if item already in cart
    $existingItem = getSingleRecord(
        "SELECT * FROM cart WHERE user_id = ? AND product_id = ? AND is_decorative = ?",
        [$userId, $productId, $isDecorative]
    );
    
    if ($existingItem) {
        $newQuantity = $existingItem['quantity'] + $quantity;
        if ($newQuantity > $product['stock_quantity']) {
            echo json_encode(['success' => false, 'message' => 'Cannot add more items. Stock limit reached.']);
            return;
        }
        
        $updated = modifyRecord(
            "UPDATE cart SET quantity = ? WHERE user_id = ? AND product_id = ? AND is_decorative = ?",
            [$newQuantity, $userId, $productId, $isDecorative]
        );
        
        if ($updated) {
            echo json_encode(['success' => true, 'message' => 'Cart updated successfully']);
        } else {
            echo json_encode(['success' => false, 'message' => 'Failed to update cart']);
        }
    } else {
        $inserted = insertRecord(
            "INSERT INTO cart (user_id, product_id, quantity, is_decorative) VALUES (?, ?, ?, ?)",
            [$userId, $productId, $quantity, $isDecorative]
        );
        
        if ($inserted) {
            echo json_encode(['success' => true, 'message' => 'Item added to cart successfully']);
        } else {
            echo json_encode(['success' => false, 'message' => 'Failed to add item to cart']);
        }
    }
}

function handleGetCart() {
    error_log("Get cart called. User logged in: " . (isLoggedIn() ? 'Yes' : 'No'));
    if (!isLoggedIn()) {
        echo json_encode(['success' => false, 'message' => 'Please login to view cart']);
        return;
    }
    
    $userId = getCurrentUserId();
    error_log("Getting cart for user ID: $userId");
    
    $sql = "SELECT c.*, p.name, p.description, p.base_price, p.decorative_price, p.image_url, p.stock_quantity
            FROM cart c
            JOIN products p ON c.product_id = p.id
            WHERE c.user_id = ? AND p.is_active = 1
            ORDER BY c.created_at DESC";
    
    $cartItems = getMultipleRecords($sql, [$userId]);
    
    if ($cartItems !== false) {
        error_log("Found " . count($cartItems) . " cart items");
        // Calculate totals
        $total = 0;
        foreach ($cartItems as &$item) {
            $price = $item['is_decorative'] ? $item['decorative_price'] : $item['base_price'];
            $item['price'] = $price;
            $item['subtotal'] = $price * $item['quantity'];
            $total += $item['subtotal'];
        }
        
        echo json_encode([
            'success' => true,
            'cart_items' => $cartItems,
            'total' => $total,
            'item_count' => count($cartItems)
        ]);
    } else {
        error_log("Failed to fetch cart items");
        echo json_encode(['success' => false, 'message' => 'Failed to fetch cart']);
    }
}

function handleUpdateCart() {
    if (!isLoggedIn()) {
        echo json_encode(['success' => false, 'message' => 'Please login to update cart']);
        return;
    }
    
    $productId = sanitizeInput($_POST['product_id'] ?? '');
    $quantity = intval($_POST['quantity'] ?? 0);
    $isDecorative = filter_var($_POST['is_decorative'] ?? false, FILTER_VALIDATE_BOOLEAN);
    $userId = getCurrentUserId();
    
    if (empty($productId)) {
        echo json_encode(['success' => false, 'message' => 'Product ID is required']);
        return;
    }
    
    if ($quantity <= 0) {
        // Remove item from cart
        $deleted = modifyRecord(
            "DELETE FROM cart WHERE user_id = ? AND product_id = ? AND is_decorative = ?",
            [$userId, $productId, $isDecorative]
        );
        
        if ($deleted) {
            echo json_encode(['success' => true, 'message' => 'Item removed from cart']);
        } else {
            echo json_encode(['success' => false, 'message' => 'Failed to remove item']);
        }
    } else {
        // Check stock
        $product = getSingleRecord("SELECT stock_quantity FROM products WHERE id = ? AND is_active = 1", [$productId]);
        if (!$product || $product['stock_quantity'] < $quantity) {
            echo json_encode(['success' => false, 'message' => 'Insufficient stock']);
            return;
        }
        
        // Update quantity
        $updated = modifyRecord(
            "UPDATE cart SET quantity = ? WHERE user_id = ? AND product_id = ? AND is_decorative = ?",
            [$quantity, $userId, $productId, $isDecorative]
        );
        
        if ($updated) {
            echo json_encode(['success' => true, 'message' => 'Cart updated successfully']);
        } else {
            echo json_encode(['success' => false, 'message' => 'Failed to update cart']);
        }
    }
}

function handleRemoveFromCart() {
    if (!isLoggedIn()) {
        echo json_encode(['success' => false, 'message' => 'Please login to remove items']);
        return;
    }
    
    $productId = sanitizeInput($_POST['product_id'] ?? '');
    $isDecorative = filter_var($_POST['is_decorative'] ?? false, FILTER_VALIDATE_BOOLEAN);
    $userId = getCurrentUserId();
    
    if (empty($productId)) {
        echo json_encode(['success' => false, 'message' => 'Product ID is required']);
        return;
    }
    
    $deleted = modifyRecord(
        "DELETE FROM cart WHERE user_id = ? AND product_id = ? AND is_decorative = ?",
        [$userId, $productId, $isDecorative]
    );
    
    if ($deleted) {
        echo json_encode(['success' => true, 'message' => 'Item removed from cart']);
    } else {
        echo json_encode(['success' => false, 'message' => 'Failed to remove item']);
    }
}

function handleClearCart() {
    if (!isLoggedIn()) {
        echo json_encode(['success' => false, 'message' => 'Please login to clear cart']);
        return;
    }
    
    $userId = getCurrentUserId();
    
    $deleted = modifyRecord("DELETE FROM cart WHERE user_id = ?", [$userId]);
    
    if ($deleted !== false) {
        echo json_encode(['success' => true, 'message' => 'Cart cleared successfully']);
    } else {
        echo json_encode(['success' => false, 'message' => 'Failed to clear cart']);
    }
}
?>