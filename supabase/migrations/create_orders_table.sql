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