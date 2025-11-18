// Authentication JavaScript

document.addEventListener('DOMContentLoaded', function() {
    initializeAuthPage();
});

let isLoginMode = true;
let currentEmail = '';
let currentName = '';

function initializeAuthPage() {
    setupFormToggle();
    setupFormSubmissions();
    
    // Redirect if already logged in
    if (currentUser) {
        if (currentUser.is_admin) {
            window.location.href = 'admin.html';
        } else {
            window.location.href = 'profile.html';
        }
    }
}

function setupFormToggle() {
    const toggleBtn = document.getElementById('toggleForm');
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const otpForm = document.getElementById('otpForm');
    const formTitle = document.getElementById('formTitle');
    const formSubtitle = document.getElementById('formSubtitle');

    toggleBtn.addEventListener('click', function() {
        isLoginMode = !isLoginMode;
        
        if (isLoginMode) {
            // Switch to login
            loginForm.style.display = 'block';
            registerForm.style.display = 'none';
            otpForm.style.display = 'none';
            formTitle.textContent = 'Welcome Back';
            formSubtitle.textContent = 'Sign in to your account';
            toggleBtn.textContent = "Don't have an account? Sign up";
        } else {
            // Switch to register
            loginForm.style.display = 'none';
            registerForm.style.display = 'block';
            otpForm.style.display = 'none';
            formTitle.textContent = 'Create Account';
            formSubtitle.textContent = 'Join our spiritual journey';
            toggleBtn.textContent = 'Already have an account? Sign in';
        }
    });
}

function setupFormSubmissions() {
    // Login form
    document.getElementById('loginForm').addEventListener('submit', handleLogin);
    
    // Register form
    document.getElementById('registerForm').addEventListener('submit', handleRegister);
    
    // OTP form
    document.getElementById('otpForm').addEventListener('submit', handleOTPVerification);
    
    // Resend OTP
    document.getElementById('resendOtp').addEventListener('click', handleResendOTP);
}

async function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    
    if (!email || !password) {
        showFlashMessage('Please fill in all fields', 'error');
        return;
    }
    
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const hideLoading = showLoading(submitBtn);
    
    try {
        const formData = new FormData();
        formData.append('action', 'login');
        formData.append('email', email);
        formData.append('password', password);
        
        const response = await fetch('php/auth.php', {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Store user data
            localStorage.setItem('currentUser', JSON.stringify(data.user));
            currentUser = data.user;
            
            showFlashMessage('Login successful!', 'success');
            
            // Redirect after short delay
            setTimeout(() => {
                window.location.href = currentUser.is_admin ? 'admin.html' : 'index.html';
            }, 1000);
        } else {
            showFlashMessage(data.message, 'error');
        }
    } catch (error) {
        console.error('Login error:', error);
        showFlashMessage('Login failed. Please try again.', 'error');
    } finally {
        hideLoading();
    }
}

async function handleRegister(e) {
    e.preventDefault();
    
    const firstName = document.getElementById('firstName').value.trim();
    const lastName = document.getElementById('lastName').value.trim();
    const email = document.getElementById('registerEmail').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const password = document.getElementById('registerPassword').value;
    
    // Validation
    if (!firstName || !lastName || !email || !phone || !password) {
        showFlashMessage('Please fill in all fields', 'error');
        return;
    }
    
    if (password.length < 6) {
        showFlashMessage('Password must be at least 6 characters', 'error');
        return;
    }
    
    if (!isValidEmail(email)) {
        showFlashMessage('Please enter a valid email address', 'error');
        return;
    }
    
    if (!isValidPhone(phone)) {
        showFlashMessage('Please enter a valid phone number', 'error');
        return;
    }
    
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const hideLoading = showLoading(submitBtn);
    
    try {
        const formData = new FormData();
        formData.append('action', 'register');
        formData.append('first_name', firstName);
        formData.append('last_name', lastName);
        formData.append('email', email);
        formData.append('phone', phone);
        formData.append('password', password);
        
        const response = await fetch('php/auth.php', {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Store email and name for OTP
            currentEmail = email;
            currentName = `${firstName} ${lastName}`;
            
            showFlashMessage('Registration successful! Sending OTP...', 'success');
            
            // Send OTP
            await sendOTP();
        } else {
            showFlashMessage(data.message, 'error');
        }
    } catch (error) {
        console.error('Registration error:', error);
        showFlashMessage('Registration failed. Please try again.', 'error');
    } finally {
        hideLoading();
    }
}

async function sendOTP() {
    try {
        const formData = new FormData();
        formData.append('action', 'send_otp');
        formData.append('email', currentEmail);
        formData.append('name', currentName);
        
        const response = await fetch('php/auth.php', {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Show OTP form
            document.getElementById('registerForm').style.display = 'none';
            document.getElementById('otpForm').style.display = 'block';
            document.getElementById('otpEmail').textContent = currentEmail;
            document.getElementById('formTitle').textContent = 'Verify Your Email';
            document.getElementById('formSubtitle').textContent = 'Enter the OTP sent to your email';
            
            showFlashMessage('OTP sent to your email!', 'success');
        } else {
            showFlashMessage(data.message, 'error');
        }
    } catch (error) {
        console.error('OTP sending error:', error);
        showFlashMessage('Failed to send OTP. Please try again.', 'error');
    }
}

async function handleOTPVerification(e) {
    e.preventDefault();
    
    const otpCode = document.getElementById('otpCode').value.trim();
    
    if (!otpCode || otpCode.length !== 6) {
        showFlashMessage('Please enter a valid 6-digit OTP', 'error');
        return;
    }
    
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const hideLoading = showLoading(submitBtn);
    
    try {
        const formData = new FormData();
        formData.append('action', 'verify_otp');
        formData.append('email', currentEmail);
        formData.append('otp', otpCode);
        
        const response = await fetch('php/auth.php', {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Store user data
            localStorage.setItem('currentUser', JSON.stringify(data.user));
            currentUser = data.user;
            
            showFlashMessage('Email verified successfully!', 'success');
            
            // Redirect after short delay
            setTimeout(() => {
                window.location.href = currentUser.is_admin ? 'admin.html' : 'index.html';
            }, 1000);
        } else {
            showFlashMessage(data.message, 'error');
        }
    } catch (error) {
        console.error('OTP verification error:', error);
        showFlashMessage('Verification failed. Please try again.', 'error');
    } finally {
        hideLoading();
    }
}

async function handleResendOTP() {
    const resendBtn = document.getElementById('resendOtp');
    const hideLoading = showLoading(resendBtn);
    
    try {
        await sendOTP();
    } finally {
        hideLoading();
    }
}

// Auto-format OTP input
document.getElementById('otpCode').addEventListener('input', function(e) {
    // Only allow numbers
    e.target.value = e.target.value.replace(/[^0-9]/g, '');
});

// Auto-format phone input
document.getElementById('phone').addEventListener('input', function(e) {
    let value = e.target.value.replace(/[^0-9+\-\s\(\)]/g, '');
    e.target.value = value;
});