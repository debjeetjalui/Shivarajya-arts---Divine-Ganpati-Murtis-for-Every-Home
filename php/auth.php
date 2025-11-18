<?php
require_once '../config/database.php';

header('Content-Type: application/json');

$action = $_POST['action'] ?? $_GET['action'] ?? '';

switch ($action) {
    case 'register':
        handleRegister();
        break;
    case 'send_otp':
        handleSendOTP();
        break;
    case 'verify_otp':
        handleVerifyOTP();
        break;
    case 'login':
        handleLogin();
        break;
    case 'logout':
        handleLogout();
        break;
    case 'check_session':
        handleCheckSession();
        break;
    default:
        echo json_encode(['success' => false, 'message' => 'Invalid action']);
}

function handleRegister() {
    $firstName = sanitizeInput($_POST['first_name'] ?? '');
    $lastName = sanitizeInput($_POST['last_name'] ?? '');
    $email = sanitizeInput($_POST['email'] ?? '');
    $phone = sanitizeInput($_POST['phone'] ?? '');
    $password = $_POST['password'] ?? '';

    // Validation
    if (empty($firstName) || empty($lastName) || empty($email) || empty($phone) || empty($password)) {
        echo json_encode(['success' => false, 'message' => 'All fields are required']);
        return;
    }

    if (!isValidEmail($email)) {
        echo json_encode(['success' => false, 'message' => 'Invalid email format']);
        return;
    }

    if (!isValidPhone($phone)) {
        echo json_encode(['success' => false, 'message' => 'Invalid phone number format']);
        return;
    }

    if (strlen($password) < 6) {
        echo json_encode(['success' => false, 'message' => 'Password must be at least 6 characters']);
        return;
    }

    // Check if email already exists
    $existingUser = getSingleRecord("SELECT id FROM users WHERE email = ?", [$email]);
    if ($existingUser) {
        echo json_encode(['success' => false, 'message' => 'Email already registered']);
        return;
    }

    // Hash password
    $passwordHash = password_hash($password, PASSWORD_DEFAULT);

    // Check if admin email
    if ($email === 'admin@ganpati.com' && $password === 'admin123') {
    // Bypass database and log in as admin
    $_SESSION['is_admin'] = true;
    $_SESSION['first_name'] = "Admin";
    echo json_encode(['success' => true, 'message' => 'Admin login successful', 'redirect' => 'admin.php']);
    exit;
}


    // Insert user
    $isAdmin = 0;
    $sql = "INSERT INTO users (first_name, last_name, email, phone, password_hash, is_admin) VALUES (?, ?, ?, ?, ?, ?)";
    $userId = insertRecord($sql, [$firstName, $lastName, $email, $phone, $passwordHash, $isAdmin]);

    if ($userId) {
        echo json_encode([
            'success' => true, 
            'message' => 'Registration successful. Please verify your email.',
            'user_id' => $userId
        ]);
    } else {
        echo json_encode(['success' => false, 'message' => 'Registration failed']);
    }
}

function handleSendOTP() {
    $email = sanitizeInput($_POST['email'] ?? '');
    $name = sanitizeInput($_POST['name'] ?? '');

    if (empty($email) || empty($name)) {
        echo json_encode(['success' => false, 'message' => 'Email and name are required']);
        return;
    }

    // Check if user exists
    $user = getSingleRecord("SELECT id FROM users WHERE email = ?", [$email]);
    if (!$user) {
        echo json_encode(['success' => false, 'message' => 'User not found']);
        return;
    }

    // Call Python script to send OTP (cross-platform)
    $pythonScriptPath = realpath(__DIR__ . '/../python/send_otp.py');
    if (!$pythonScriptPath || !file_exists($pythonScriptPath)) {
        echo json_encode(['success' => false, 'message' => 'OTP service not available']);
        return;
    }

    $pythonCommands = stripos(PHP_OS_FAMILY, 'Windows') !== false
        ? ['py -3', 'python', 'python3']
        : ['python3', 'python'];

    $output = '';
    $logDir = realpath(__DIR__ . '/..');
    $logFile = ($logDir ? $logDir : __DIR__) . '/logs/otp.log';
    if (!is_dir(($logDir ? $logDir : __DIR__) . '/logs')) {
        @mkdir(($logDir ? $logDir : __DIR__) . '/logs', 0755, true);
    }

    foreach ($pythonCommands as $pythonCmd) {
        $command = $pythonCmd . ' ' . escapeshellarg($pythonScriptPath) . ' ' . escapeshellarg($email) . ' ' . escapeshellarg($name) . ' 2>&1';
        $output = shell_exec($command);
        @file_put_contents($logFile, "[" . date('Y-m-d H:i:s') . "] Command: $command\nOutput: $output\n\n", FILE_APPEND);
        if (!empty($output)) {
            break;
        }
    }

    if (!empty($output)) {
        $result = json_decode($output, true);
        if (is_array($result) && isset($result['success']) && $result['success']) {
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
}

function handleVerifyOTP() {
    $email = sanitizeInput($_POST['email'] ?? '');
    $otp = sanitizeInput($_POST['otp'] ?? '');

    if (empty($email) || empty($otp)) {
        echo json_encode(['success' => false, 'message' => 'Email and OTP are required']);
        return;
    }

    // Get user with OTP
    $user = getSingleRecord(
        "SELECT id, first_name, last_name, email, phone, is_admin, otp_code, otp_expires 
         FROM users WHERE email = ?", 
        [$email]
    );

    if (!$user) {
        echo json_encode(['success' => false, 'message' => 'User not found']);
        return;
    }

    // Check OTP
    if ($user['otp_code'] !== $otp) {
        echo json_encode(['success' => false, 'message' => 'Invalid OTP']);
        return;
    }

    // Check expiry
    if (strtotime($user['otp_expires']) < time()) {
        echo json_encode(['success' => false, 'message' => 'OTP has expired']);
        return;
    }

    // Mark user as verified and clear OTP
    $sql = "UPDATE users SET is_verified = 1, otp_code = NULL, otp_expires = NULL WHERE email = ?";
    $updated = modifyRecord($sql, [$email]);

    if ($updated) {
        // Start session
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
}

function handleLogin() {
    $email = sanitizeInput($_POST['email'] ?? '');
    $password = $_POST['password'] ?? '';

    if (empty($email) || empty($password)) {
        echo json_encode(['success' => false, 'message' => 'Email and password are required']);
        return;
    }

    // Get user
    $user = getSingleRecord(
        "SELECT id, first_name, last_name, email, phone, password_hash, is_admin, is_verified 
         FROM users WHERE email = ?", 
        [$email]
    );

    if (!$user) {
        echo json_encode(['success' => false, 'message' => 'Invalid email or password']);
        return;
    }

    // Verify password
    if (!password_verify($password, $user['password_hash'])) {
        echo json_encode(['success' => false, 'message' => 'Invalid email or password']);
        return;
    }

    // Check if verified
    if (!$user['is_verified']) {
        echo json_encode(['success' => false, 'message' => 'Please verify your email first']);
        return;
    }

    // Start session
    $_SESSION['user_id'] = $user['id'];
    $_SESSION['email'] = $user['email'];
    $_SESSION['first_name'] = $user['first_name'];
    $_SESSION['last_name'] = $user['last_name'];
    $_SESSION['is_admin'] = $user['is_admin'];

    echo json_encode([
        'success' => true, 
        'message' => 'Login successful',
        'user' => [
            'id' => $user['id'],
            'first_name' => $user['first_name'],
            'last_name' => $user['last_name'],
            'email' => $user['email'],
            'phone' => $user['phone'],
            'is_admin' => $user['is_admin']
        ]
    ]);
}

function handleLogout() {
    session_destroy();
    echo json_encode(['success' => true, 'message' => 'Logged out successfully']);
}

function handleCheckSession() {
    if (isLoggedIn()) {
        $user = getSingleRecord(
            "SELECT id, first_name, last_name, email, phone, is_admin 
             FROM users WHERE id = ?", 
            [getCurrentUserId()]
        );
        
        echo json_encode([
            'success' => true, 
            'logged_in' => true,
            'user' => $user
        ]);
    } else {
        echo json_encode([
            'success' => true, 
            'logged_in' => false
        ]);
    }
}
?>