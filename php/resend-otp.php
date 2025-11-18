<?php
require_once '../config/database.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['success' => false, 'message' => 'Invalid request method']);
    exit;
}

$email = sanitizeInput($_POST['email'] ?? '');

if (empty($email)) {
    echo json_encode(['success' => false, 'message' => 'Email is required']);
    exit;
}

// Check if user exists
$user = getSingleRecord("SELECT id, first_name, last_name FROM users WHERE email = ?", [$email]);
if (!$user) {
    echo json_encode(['success' => false, 'message' => 'User not found']);
    exit;
}

$name = $user['first_name'] . ' ' . $user['last_name'];

// Call Python script to send OTP (cross-platform)
$pythonScriptPath = realpath(__DIR__ . '/../python/send_otp.py');
if (!$pythonScriptPath || !file_exists($pythonScriptPath)) {
    echo json_encode(['success' => false, 'message' => 'OTP service not available']);
    exit;
}

$pythonCommands = stripos(PHP_OS_FAMILY, 'Windows') !== false
    ? ['py -3', 'python', 'python3']
    : ['python3', 'python'];

$output = '';
foreach ($pythonCommands as $pythonCmd) {
    $command = $pythonCmd . ' ' . escapeshellarg($pythonScriptPath) . ' ' . escapeshellarg($email) . ' ' . escapeshellarg($name) . ' 2>&1';
    $output = shell_exec($command);
    if (!empty($output)) {
        break;
    }
}

if ($output) {
    $result = json_decode($output, true);
    if ($result && $result['success']) {
        // Store OTP in database
        $otp = $result['otp'];
        $expires = date('Y-m-d H:i:s', strtotime('+10 minutes'));
        
        $sql = "UPDATE users SET otp_code = ?, otp_expires = ? WHERE email = ?";
        $updated = modifyRecord($sql, [$otp, $expires, $email]);
        
        if ($updated) {
            echo json_encode([
                'success' => true, 
                'message' => 'OTP sent successfully to your email'
            ]);
        } else {
            echo json_encode(['success' => false, 'message' => 'Failed to store OTP']);
        }
    } else {
        echo json_encode(['success' => false, 'message' => 'Failed to send OTP: ' . substr((string)$output, 0, 500)]);
    }
} else {
    echo json_encode(['success' => false, 'message' => 'Failed to send OTP: No output from mailer script']);
}
?>