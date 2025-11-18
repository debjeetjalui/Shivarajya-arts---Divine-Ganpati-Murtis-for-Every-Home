<?php
require_once '../config/database.php';

header('Content-Type: application/json');
// Ensure PHP warnings/notices don't corrupt JSON output
ini_set('display_errors', 0);
if (!function_exists('respondJson')) {
    function respondJson($payload) {
        while (ob_get_level()) { ob_end_clean(); }
        echo json_encode($payload);
    }
}

$action = $_POST['action'] ?? $_GET['action'] ?? '';

switch ($action) {
    case 'submit_claim':
        handleSubmitClaim();
        break;
    case 'get_user_claims':
        handleGetUserClaims();
        break;
    case 'get_claim':
        handleGetClaim();
        break;
    case 'update_claim_status':
        handleUpdateClaimStatus();
        break;
    default:
        echo json_encode(['success' => false, 'message' => 'Invalid action']);
}

function handleSubmitClaim() {
    if (!isLoggedIn()) {
        respondJson(['success' => false, 'message' => 'Please login to submit claim']);
        return;
    }
    
    $userId = getCurrentUserId();
    $orderId = sanitizeInput($_POST['order_id'] ?? '');
    $productId = sanitizeInput($_POST['product_id'] ?? '');
    $description = sanitizeInput($_POST['description'] ?? '');
    
    if (empty($description)) {
        respondJson(['success' => false, 'message' => 'Description is required']);
        return;
    }
    
    if (!isset($_FILES['claim_image']) || $_FILES['claim_image']['error'] !== UPLOAD_ERR_OK) {
        respondJson(['success' => false, 'message' => 'Please upload an image']);
        return;
    }
    
    $uploadedFile = $_FILES['claim_image'];
    
    // Validate file type
    $allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!in_array($uploadedFile['type'], $allowedTypes)) {
        respondJson(['success' => false, 'message' => 'Invalid file type. Please upload an image.']);
        return;
    }
    
    // Validate file size (5MB max)
    if ($uploadedFile['size'] > 5 * 1024 * 1024) {
        respondJson(['success' => false, 'message' => 'File size too large. Maximum 5MB allowed.']);
        return;
    }
    
    // Create uploads directory if it doesn't exist
    $uploadDir = '../uploads/claims/';
    $logBase = realpath(__DIR__ . '/..');
    $logDir = ($logBase ? $logBase : __DIR__) . '/logs';
    if (!is_dir($logDir)) {
        @mkdir($logDir, 0755, true);
    }
    $logFile = $logDir . '/claims.log';
    if (!is_dir($uploadDir)) {
        mkdir($uploadDir, 0755, true);
    }
    
    // Generate unique filename
    $fileExtension = pathinfo($uploadedFile['name'], PATHINFO_EXTENSION);
    $fileName = 'claim_' . $userId . '_' . time() . '.' . $fileExtension;
    $filePath = $uploadDir . $fileName;
    $relativePath = 'uploads/claims/' . $fileName;
    
    // Move uploaded file
    if (!move_uploaded_file($uploadedFile['tmp_name'], $filePath)) {
        @file_put_contents($logFile, '[' . date('Y-m-d H:i:s') . "] move_uploaded_file failed to $filePath\n", FILE_APPEND);
        respondJson(['success' => false, 'message' => 'Failed to upload image']);
        return;
    }
    @file_put_contents($logFile, '[' . date('Y-m-d H:i:s') . "] Uploaded to $filePath, relative $relativePath\n", FILE_APPEND);
    
    // Validate order belongs to user if provided
    if (!empty($orderId)) {
        $order = getSingleRecord("SELECT id FROM orders WHERE id = ? AND user_id = ?", [$orderId, $userId]);
        if (!$order) {
            respondJson(['success' => false, 'message' => 'Invalid order selected']);
            return;
        }
    }
    
    // Validate product exists if provided
    if (!empty($productId)) {
        $product = getSingleRecord("SELECT id FROM products WHERE id = ? AND is_active = 1", [$productId]);
        if (!$product) {
            respondJson(['success' => false, 'message' => 'Invalid product selected']);
            return;
        }
    }
    
    // Insert claim
    $claimId = insertRecord(
        "INSERT INTO claims (user_id, order_id, product_id, image_path, description) VALUES (?, ?, ?, ?, ?)",
        [
            $userId,
            !empty($orderId) ? $orderId : null,
            !empty($productId) ? $productId : null,
            $relativePath,
            $description
        ]
    );
    
    if ($claimId) {
        respondJson([
            'success' => true,
            'message' => 'Claim submitted successfully',
            'claim_id' => $claimId
        ]);
    } else {
        $dbError = function_exists('getLastDbError') ? getLastDbError() : '';
        @file_put_contents($logFile, '[' . date('Y-m-d H:i:s') . "] DB insert failed: {$dbError} for user {$userId}, order {$orderId}, product {$productId}, path {$relativePath}\n", FILE_APPEND);
        // Delete uploaded file if database insert failed
        if (file_exists($filePath)) {
            unlink($filePath);
        }
        respondJson(['success' => false, 'message' => 'Failed to submit claim', 'error' => $dbError]);
    }
}

function handleGetUserClaims() {
    if (!isLoggedIn()) {
        echo json_encode(['success' => false, 'message' => 'Please login to view claims']);
        return;
    }
    
    $userId = getCurrentUserId();
    
    $claims = getMultipleRecords(
        "SELECT c.*, p.name as product_name, o.id as order_number
         FROM claims c
         LEFT JOIN products p ON c.product_id = p.id
         LEFT JOIN orders o ON c.order_id = o.id
         WHERE c.user_id = ?
         ORDER BY c.created_at DESC",
        [$userId]
    );
    
    if ($claims !== false) {
        echo json_encode([
            'success' => true,
            'claims' => $claims
        ]);
    } else {
        echo json_encode(['success' => false, 'message' => 'Failed to fetch claims']);
    }
}

function handleGetClaim() {
    $claimId = sanitizeInput($_GET['id'] ?? '');
    $userId = getCurrentUserId();
    
    if (empty($claimId)) {
        echo json_encode(['success' => false, 'message' => 'Claim ID is required']);
        return;
    }
    
    // Check if user owns the claim or is admin
    $whereClause = isAdmin() ? "c.id = ?" : "c.id = ? AND c.user_id = ?";
    $params = isAdmin() ? [$claimId] : [$claimId, $userId];
    
    $claim = getSingleRecord(
        "SELECT c.*, 
                CONCAT(u.first_name, ' ', u.last_name) as customer_name,
                u.email,
                p.name as product_name,
                o.id as order_number
         FROM claims c
         JOIN users u ON c.user_id = u.id
         LEFT JOIN products p ON c.product_id = p.id
         LEFT JOIN orders o ON c.order_id = o.id
         WHERE $whereClause",
        $params
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

function handleUpdateClaimStatus() {
    if (!isAdmin()) {
        echo json_encode(['success' => false, 'message' => 'Admin access required']);
        return;
    }
    
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
?>