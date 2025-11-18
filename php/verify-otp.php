<?php
require_once '../config/database.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['success' => false, 'message' => 'Invalid request method']);
    exit;
}

$email = sanitizeInput($_POST['email'] ?? '');
$otp = sanitizeInput($_POST['otp'] ?? '');

if (empty($email) || empty($otp)) {
    echo json_encode(['success' => false, 'message' => 'Email and OTP are required']);
    exit;
}

// Get user with OTP
$user = getSingleRecord(
    "SELECT id, first_name, last_name, email, phone, is_admin, otp_code, otp_expires 
     FROM users WHERE email = ?", 
    [$email]
);

if (!$user) {
    echo json_encode(['success' => false, 'message' => 'User not found']);
    exit;
}

// Check OTP
if ($user['otp_code'] !== $otp) {
    echo json_encode(['success' => false, 'message' => 'Invalid OTP']);
    exit;
}

// Check expiry
if (strtotime($user['otp_expires']) < time()) {
    echo json_encode(['success' => false, 'message' => 'OTP has expired']);
    exit;
}

// Mark user as verified and clear OTP
$updated = modifyRecord(
    "UPDATE users SET is_verified = 1, otp_code = NULL, otp_expires = NULL WHERE email = ?",
    [$email]
);

if ($updated) {
    // Start session
    session_start();
    $_SESSION['user_id'] = $user['id'];
    $_SESSION['email'] = $user['email'];
    $_SESSION['first_name'] = $user['first_name'];
    $_SESSION['last_name'] = $user['last_name'];
    $_SESSION['is_admin'] = $user['is_admin'];

    echo json_encode([
        'success' => true, 
        'message' => 'Email verified successfully',
        'user' => [
            'id' => $user['id'],
            'first_name' => $user['first_name'],
            'last_name' => $user['last_name'],
            'email' => $user['email'],
            'phone' => $user['phone'],
            'is_admin' => $user['is_admin']
        ]
    ]);
} else {
    echo json_encode(['success' => false, 'message' => 'Verification failed']);
}
?>