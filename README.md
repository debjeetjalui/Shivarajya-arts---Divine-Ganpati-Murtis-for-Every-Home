# Ganpati Murti E-commerce Website

A complete e-commerce website for selling Ganpati murtis with claim system, user authentication, and admin panel.

## Features

- **User Authentication**: Registration with OTP verification via email
- **Product Catalog**: Browse murtis by size, material, and type (decorative/non-decorative)
- **Claim System**: Upload defective murti photos with descriptions
- **Admin Panel**: Manage claims, orders, and users
- **Shopping Cart**: Add products and checkout with payment
- **Order Tracking**: Users can track their orders
- **Responsive Design**: Works on all devices

## Technology Stack

- **Frontend**: HTML5, CSS3, JavaScript
- **Backend**: PHP 7.4+
- **Database**: MySQL (XAMPP)
- **Email**: Python SMTP for OTP delivery
- **Server**: Apache (XAMPP)

## Installation & Setup

### Prerequisites

1. **XAMPP** - Download and install from [https://www.apachefriends.org/](https://www.apachefriends.org/)
2. **Python 3.x** - Download from [https://www.python.org/](https://www.python.org/)
3. **Text Editor** - VS Code recommended

### Step 1: Setup XAMPP

1. Install XAMPP and start Apache and MySQL services
2. Open phpMyAdmin (http://localhost/phpmyadmin)
3. Create a new database named `ganpati_ecommerce`
4. Import the SQL file (database.sql) provided

### Step 2: Setup Project Files

1. Copy all project files to `C:\xampp\htdocs\ganpati-ecommerce\` (Windows) or `/opt/lampp/htdocs/ganpati-ecommerce/` (Linux)
2. Ensure proper file permissions for uploads folder

### Step 3: Configure Database Connection

1. Open `config/database.php`
2. Update database credentials if needed:
   ```php
   $host = 'localhost';
   $username = 'root';
   $password = '';
   $database = 'ganpati_ecommerce';
   ```

### Step 4: Setup Python for OTP

1. Install required Python packages:
   ```bash
   pip install smtplib email
   ```

2. Configure email settings in `python/send_otp.py`:
   ```python
   SMTP_SERVER = 'smtp.gmail.com'
   SMTP_PORT = 587
   EMAIL_ADDRESS = 'your-email@gmail.com'
   EMAIL_PASSWORD = 'your-app-password'
   ```

### Step 5: Configure Upload Directory

1. Create uploads directory with proper permissions:
   ```bash
   mkdir uploads/claims
   chmod 755 uploads
   chmod 755 uploads/claims
   ```

## File Structure

```
ganpati-ecommerce/
├── index.html              # Homepage
├── login.html              # Login/Registration page
├── products.html           # Products catalog
├── claim.html              # Claim submission
├── profile.html            # User profile
├── cart.html               # Shopping cart
├── admin.html              # Admin panel
├── css/
│   └── style.css           # Main stylesheet
├── js/
│   ├── main.js             # Main JavaScript
│   ├── auth.js             # Authentication functions
│   ├── products.js         # Product management
│   ├── cart.js             # Cart functionality
│   └── admin.js            # Admin functions
├── php/
│   ├── auth.php            # Authentication handlers
│   ├── products.php        # Product operations
│   ├── claims.php          # Claim management
│   ├── orders.php          # Order processing
│   └── admin.php           # Admin operations
├── python/
│   └── send_otp.py         # OTP generation and email
├── config/
│   └── database.php        # Database configuration
├── uploads/
│   └── claims/             # Uploaded claim images
├── database.sql            # Database schema
└── README.md               # This file
```

## Usage

### For Users

1. **Registration**: 
   - Visit the website and click "Login"
   - Choose "Create Account"
   - Fill in details and verify OTP sent to email

2. **Shopping**:
   - Browse products by categories
   - Add items to cart (choose decorative for higher price)
   - Proceed to checkout and payment

3. **Claims**:
   - Login and go to Claims section
   - Upload photo of defective murti
   - Provide description and submit

4. **Profile**:
   - View order history
   - Track order status
   - Update profile information

### For Admins

1. **Access**: Login with admin credentials
2. **Claims Management**: Review and approve/reject claims
3. **Order Management**: View and update order status
4. **User Management**: View registered users

## Database Schema

### Tables

- `users` - User accounts and profiles
- `products` - Product catalog
- `orders` - Customer orders
- `order_items` - Individual order items
- `claims` - Defective murti claims
- `categories` - Product categories

## Security Features

- Password hashing with PHP password_hash()
- SQL injection prevention with prepared statements
- File upload validation and sanitization
- Session management for authentication
- CSRF protection on forms

## Email Configuration

For Gmail SMTP:
1. Enable 2-factor authentication
2. Generate app-specific password
3. Use app password in Python script

## Troubleshooting

### Common Issues

1. **Database Connection Error**:
   - Check XAMPP MySQL is running
   - Verify database credentials in config/database.php

2. **File Upload Issues**:
   - Check uploads folder permissions
   - Verify PHP upload_max_filesize setting

3. **Email Not Sending**:
   - Check Python SMTP configuration
   - Verify email credentials and app password

4. **Session Issues**:
   - Clear browser cookies
   - Check PHP session configuration

## Development

### Adding New Features

1. Create HTML page in root directory
2. Add corresponding PHP handler in php/ directory
3. Update navigation in existing pages
4. Add database tables if needed

### Customization

- Modify CSS in `css/style.css` for styling changes
- Update product categories in database
- Customize email templates in Python script

## Support

For issues and questions:
1. Check this README file
2. Review error logs in XAMPP
3. Test database connections
4. Verify file permissions

## License

This project is for educational and commercial use.