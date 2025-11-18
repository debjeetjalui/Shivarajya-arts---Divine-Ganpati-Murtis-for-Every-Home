-- Ganpati Murti E-commerce Database Schema
-- Create database and tables for the e-commerce website

CREATE DATABASE IF NOT EXISTS ganpati_ecommerce;
USE ganpati_ecommerce;

-- Users table for customer accounts
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    phone VARCHAR(15) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    is_admin BOOLEAN DEFAULT FALSE,
    is_verified BOOLEAN DEFAULT FALSE,
    otp_code VARCHAR(6) DEFAULT NULL,
    otp_expires DATETIME DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Categories table for product classification
CREATE TABLE categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    type ENUM('size', 'material', 'product_type') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Products table for murti catalog
CREATE TABLE products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    base_price DECIMAL(10,2) NOT NULL,
    decorative_price DECIMAL(10,2) NOT NULL,
    image_url VARCHAR(255),
    size_category VARCHAR(50),
    material_category VARCHAR(50),
    type_category VARCHAR(50),
    stock_quantity INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Orders table for storing customer orders
CREATE TABLE IF NOT EXISTS orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    product_id INT NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    price_option ENUM('regular', 'decorative') DEFAULT 'regular',
    total_amount DECIMAL(10, 2) NOT NULL,
    payment_method VARCHAR(50) NOT NULL,
    shipping_address TEXT NOT NULL,
    phone_number VARCHAR(20) NOT NULL,
    pincode VARCHAR(10),
    status ENUM('pending', 'confirmed', 'shipped', 'delivered', 'cancelled') DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    
    INDEX idx_user_orders (user_id),
    INDEX idx_product_orders (product_id),
    INDEX idx_order_status (status),
    INDEX idx_created_at (created_at)
);

-- Insert sample order statuses for reference
-- pending: Order placed, awaiting confirmation
-- confirmed: Order confirmed by admin
-- shipped: Order has been shipped
-- delivered: Order delivered to customer
-- cancelled: Order cancelled
-- Order items table for individual products in orders

CREATE TABLE order_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    product_id INT NOT NULL,
    quantity INT NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    is_decorative BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- Claims table for defective murti reports
CREATE TABLE claims (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    order_id INT,
    product_id INT,
    image_path VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    admin_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
);

-- Shopping cart table for temporary storage
CREATE TABLE cart (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    product_id INT NOT NULL,
    quantity INT NOT NULL,
    is_decorative BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    UNIQUE KEY unique_cart_item (user_id, product_id, is_decorative)
);

-- Insert default categories
INSERT INTO categories (name, type) VALUES
('Small', 'size'),
('Medium', 'size'),
('Large', 'size'),
('Clay', 'material'),
('Plaster', 'material'),
('Marble', 'material'),
('Metal', 'material'),
('Traditional', 'product_type'),
('Decorative', 'product_type'),
('Eco-Friendly', 'product_type');

-- Insert sample products
INSERT INTO products (name, description, base_price, decorative_price, image_url, size_category, material_category, type_category, stock_quantity) VALUES
('Traditional Clay Ganpati', 'Handcrafted traditional clay Ganpati murti perfect for home worship.', 500.00, 750.00, 'images/clay-ganpati-1.jpg', 'Medium', 'Clay', 'Traditional', 50),
('Eco-Friendly Plaster Ganpati', 'Environment-friendly plaster murti with natural colors.', 800.00, 1200.00, 'images/plaster-ganpati-1.jpg', 'Large', 'Plaster', 'Eco-Friendly', 30),
('Golden Finish Ganpati', 'Beautiful golden finish Ganpati with intricate detailing.', 1200.00, 1800.00, 'images/golden-ganpati-1.jpg', 'Medium', 'Plaster', 'Decorative', 25),
('Small Clay Ganpati', 'Perfect for desktop or small altar worship.', 300.00, 450.00, 'images/small-clay-ganpati.jpg', 'Small', 'Clay', 'Traditional', 100),
('Marble Finish Ganpati', 'Elegant marble finish with premium quality craftsmanship.', 1500.00, 2200.00, 'images/marble-ganpati.jpg', 'Large', 'Marble', 'Decorative', 15),
('Copper Plated Ganpati', 'Premium copper plated murti for special occasions.', 2000.00, 2800.00, 'images/copper-ganpati.jpg', 'Medium', 'Metal', 'Decorative', 10);

-- Insert default admin user (password: admin123)
INSERT INTO users (first_name, last_name, email, phone, password_hash, is_admin, is_verified) VALUES
('Admin', 'User', 'admin@ganpati.com', '+91 98765 43210', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', TRUE, TRUE);

-- Create indexes for better performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_products_category ON products(size_category, material_category, type_category);
CREATE INDEX idx_orders_user ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_claims_user ON claims(user_id);
CREATE INDEX idx_claims_status ON claims(status);
CREATE INDEX idx_cart_user ON cart(user_id);

-- Create views for common queries
CREATE VIEW product_details AS
SELECT 
    p.*,
    CASE 
        WHEN p.stock_quantity > 0 THEN 'In Stock'
        ELSE 'Out of Stock'
    END as stock_status
FROM products p
WHERE p.is_active = TRUE;

CREATE VIEW order_summary AS
SELECT 
    o.id,
    o.user_id,
    CONCAT(u.first_name, ' ', u.last_name) as customer_name,
    u.email,
    o.total_amount,
    o.status,
    o.created_at,
    COUNT(oi.id) as item_count
FROM orders o
JOIN users u ON o.user_id = u.id
LEFT JOIN order_items oi ON o.id = oi.order_id
GROUP BY o.id;

CREATE VIEW claim_details AS
SELECT 
    c.*,
    CONCAT(u.first_name, ' ', u.last_name) as customer_name,
    u.email,
    p.name as product_name
FROM claims c
JOIN users u ON c.user_id = u.id
LEFT JOIN products p ON c.product_id = p.id;

-- Stored procedures for common operations

DELIMITER //

-- Procedure to add item to cart
CREATE PROCEDURE AddToCart(
    IN p_user_id INT,
    IN p_product_id INT,
    IN p_quantity INT,
    IN p_is_decorative BOOLEAN
)
BEGIN
    DECLARE existing_quantity INT DEFAULT 0;
    
    -- Check if item already exists in cart
    SELECT quantity INTO existing_quantity
    FROM cart 
    WHERE user_id = p_user_id 
    AND product_id = p_product_id 
    AND is_decorative = p_is_decorative;
    
    IF existing_quantity > 0 THEN
        -- Update existing item
        UPDATE cart 
        SET quantity = existing_quantity + p_quantity
        WHERE user_id = p_user_id 
        AND product_id = p_product_id 
        AND is_decorative = p_is_decorative;
    ELSE
        -- Insert new item
        INSERT INTO cart (user_id, product_id, quantity, is_decorative)
        VALUES (p_user_id, p_product_id, p_quantity, p_is_decorative);
    END IF;
END //

-- Procedure to create order from cart
CREATE PROCEDURE CreateOrderFromCart(
    IN p_user_id INT,
    IN p_shipping_address TEXT,
    IN p_phone VARCHAR(15),
    OUT p_order_id INT
)
BEGIN
    DECLARE total_amount DECIMAL(10,2) DEFAULT 0;
    DECLARE done INT DEFAULT FALSE;
    DECLARE cart_product_id INT;
    DECLARE cart_quantity INT;
    DECLARE cart_is_decorative BOOLEAN;
    DECLARE product_price DECIMAL(10,2);
    
    DECLARE cart_cursor CURSOR FOR
        SELECT product_id, quantity, is_decorative
        FROM cart
        WHERE user_id = p_user_id;
    
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;
    
    -- Calculate total amount
    SELECT SUM(
        CASE 
            WHEN c.is_decorative THEN p.decorative_price * c.quantity
            ELSE p.base_price * c.quantity
        END
    ) INTO total_amount
    FROM cart c
    JOIN products p ON c.product_id = p.id
    WHERE c.user_id = p_user_id;
    
    -- Create order
    INSERT INTO orders (user_id, total_amount, shipping_address, phone)
    VALUES (p_user_id, total_amount, p_shipping_address, p_phone);
    
    SET p_order_id = LAST_INSERT_ID();
    
    -- Add order items
    OPEN cart_cursor;
    read_loop: LOOP
        FETCH cart_cursor INTO cart_product_id, cart_quantity, cart_is_decorative;
        IF done THEN
            LEAVE read_loop;
        END IF;
        
        -- Get product price
        SELECT 
            CASE 
                WHEN cart_is_decorative THEN decorative_price
                ELSE base_price
            END INTO product_price
        FROM products
        WHERE id = cart_product_id;
        
        -- Insert order item
        INSERT INTO order_items (order_id, product_id, quantity, price, is_decorative)
        VALUES (p_order_id, cart_product_id, cart_quantity, product_price, cart_is_decorative);
        
        -- Update product stock
        UPDATE products
        SET stock_quantity = stock_quantity - cart_quantity
        WHERE id = cart_product_id;
        
    END LOOP;
    CLOSE cart_cursor;
    
    -- Clear cart
    DELETE FROM cart WHERE user_id = p_user_id;
    
END //

DELIMITER ;

-- Triggers for audit trail
CREATE TABLE audit_log (
    id INT AUTO_INCREMENT PRIMARY KEY,
    table_name VARCHAR(50) NOT NULL,
    operation VARCHAR(10) NOT NULL,
    record_id INT NOT NULL,
    old_values JSON,
    new_values JSON,
    user_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

DELIMITER //

CREATE TRIGGER orders_audit_insert
AFTER INSERT ON orders
FOR EACH ROW
BEGIN
    INSERT INTO audit_log (table_name, operation, record_id, new_values, user_id)
    VALUES ('orders', 'INSERT', NEW.id, JSON_OBJECT('total_amount', NEW.total_amount, 'status', NEW.status), NEW.user_id);
END //

CREATE TRIGGER orders_audit_update
AFTER UPDATE ON orders
FOR EACH ROW
BEGIN
    INSERT INTO audit_log (table_name, operation, record_id, old_values, new_values, user_id)
    VALUES ('orders', 'UPDATE', NEW.id, 
        JSON_OBJECT('status', OLD.status, 'total_amount', OLD.total_amount),
        JSON_OBJECT('status', NEW.status, 'total_amount', NEW.total_amount),
        NEW.user_id);
END //

DELIMITER ;