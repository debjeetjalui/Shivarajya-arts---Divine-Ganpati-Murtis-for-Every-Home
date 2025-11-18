<?php
/**
 * Database Configuration
 * Configure your database connection settings here
 */

// Database connection parameters
$host = 'localhost';
$username = 'root';
$password = '';
$database = 'ganpati_ecommerce';
$port = 3306;

// Create connection
try {
    $pdo = new PDO("mysql:host=$host;port=$port;dbname=$database;charset=utf8mb4", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
} catch(PDOException $e) {
    die("Connection failed: " . $e->getMessage());
}

// Function to get database connection
function getDBConnection() {
    global $pdo;
    return $pdo;
}

// Function to execute query with error handling
$GLOBALS['last_db_error'] = '';
function executeQuery($sql, $params = []) {
    global $pdo;
    try {
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $GLOBALS['last_db_error'] = '';
        return $stmt;
    } catch(PDOException $e) {
        $GLOBALS['last_db_error'] = $e->getMessage();
        error_log("Database error: " . $e->getMessage());
        return false;
    }
}

// Function to get single record
function getSingleRecord($sql, $params = []) {
    $stmt = executeQuery($sql, $params);
    return $stmt ? $stmt->fetch() : false;
}

// Function to get multiple records
function getMultipleRecords($sql, $params = []) {
    $stmt = executeQuery($sql, $params);
    return $stmt ? $stmt->fetchAll() : false;
}

// Function to insert record and return ID
function insertRecord($sql, $params = []) {
    global $pdo;
    $stmt = executeQuery($sql, $params);
    return $stmt ? $pdo->lastInsertId() : false;
}

// Function to update/delete records and return affected rows
function modifyRecord($sql, $params = []) {
    $stmt = executeQuery($sql, $params);
    return $stmt ? $stmt->rowCount() : false;
}

// Helper to access last DB error message
function getLastDbError() {
    return isset($GLOBALS['last_db_error']) ? $GLOBALS['last_db_error'] : '';
}

// Start session if not already started
if (session_status() == PHP_SESSION_NONE) {
    session_start();
}

// Helper function to check if user is logged in
function isLoggedIn() {
    return isset($_SESSION['user_id']);
}

// Helper function to check if user is admin
function isAdmin() {
    return isset($_SESSION['is_admin']) && $_SESSION['is_admin'] == true;
}

// Helper function to get current user ID
function getCurrentUserId() {
    return $_SESSION['user_id'] ?? null;
}

// Helper function to get current user data
function getCurrentUser() {
    if (!isLoggedIn()) {
        return null;
    }
    
    $userId = getCurrentUserId();
    return getSingleRecord("SELECT * FROM users WHERE id = ?", [$userId]);
}

// Helper function to get database connection
function getConnection() {
    global $pdo;
    return $pdo;
}

// Helper function to redirect with message
function redirectWithMessage($url, $message, $type = 'success') {
    $_SESSION['flash_message'] = $message;
    $_SESSION['flash_type'] = $type;
    header("Location: $url");
    exit();
}

// Helper function to display flash messages
function getFlashMessage() {
    if (isset($_SESSION['flash_message'])) {
        $message = $_SESSION['flash_message'];
        $type = $_SESSION['flash_type'] ?? 'info';
        unset($_SESSION['flash_message']);
        unset($_SESSION['flash_type']);
        return ['message' => $message, 'type' => $type];
    }
    return null;
}

// Helper function to sanitize input
function sanitizeInput($input) {
    return htmlspecialchars(strip_tags(trim($input)));
}

// Helper function to validate email
function isValidEmail($email) {
    return filter_var($email, FILTER_VALIDATE_EMAIL) !== false;
}

// Helper function to validate phone
function isValidPhone($phone) {
    return preg_match('/^[\+]?[0-9\s\-\(\)]{10,15}$/', $phone);
}

// Helper function to generate tracking ID
function generateTrackingId() {
    return 'TRK' . strtoupper(uniqid());
}

// Helper function to format currency
function formatCurrency($amount) {
    return '₹' . number_format($amount, 2);
}

// Helper function to format date
function formatDate($date) {
    return date('d M Y', strtotime($date));
}

// Helper function to format datetime
function formatDateTime($datetime) {
    return date('d M Y H:i', strtotime($datetime));
}

// Error reporting for development (disable in production)
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Set timezone
date_default_timezone_set('Asia/Kolkata');
?>