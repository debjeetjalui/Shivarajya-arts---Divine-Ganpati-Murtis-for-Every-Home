#!/usr/bin/env python3
"""
OTP Generation and Email Sending Script
This script generates OTP and sends it via email using SMTP
"""

import smtplib
import random
import sys
import json
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime, timedelta

# Email configuration
SMTP_SERVER = 'smtp.gmail.com'
SMTP_PORT = 587
EMAIL_ADDRESS = 'debjeetjalui897@gmail.com'  # Replace with your email
EMAIL_PASSWORD = 'mzmi tsgb qujw ukad'    # Replace with your app password

def generate_otp():
    """Generate a 6-digit OTP"""
    return str(random.randint(100000, 999999))

def send_otp_email(recipient_email, otp_code, user_name):
    """Send OTP via email"""
    try:
        # Create message
        msg = MIMEMultipart()
        msg['From'] = EMAIL_ADDRESS
        msg['To'] = recipient_email
        msg['Subject'] = "Your OTP for Shivarajya arts - Verification Code"
        
        # Email body
        body = f"""
        <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="text-align: center; margin-bottom: 30px;">
                    <div style="background: linear-gradient(135deg, #ff6b35, #f7931e); color: white; padding: 20px; border-radius: 10px;">
                        <h1 style="margin: 0; font-size: 24px;">🕉️ Shivarajya arts </h1>
                        <p style="margin: 5px 0 0 0; opacity: 0.9;">Divine Blessings for Your Home</p>
                    </div>
                </div>
                
                <div style="background: #f8f9fa; padding: 30px; border-radius: 10px; text-align: center;">
                    <h2 style="color: #ff6b35; margin-bottom: 20px;">Email Verification Required</h2>
                    <p style="font-size: 16px; margin-bottom: 20px;">Dear {user_name},</p>
                    <p style="font-size: 16px; margin-bottom: 30px;">
                        Thank you for registering with Shri Ganpati Murtis. To complete your registration, 
                        please use the following One-Time Password (OTP):
                    </p>
                    
                    <div style="background: white; border: 2px dashed #ff6b35; padding: 20px; margin: 20px 0; border-radius: 10px;">
                        <h1 style="color: #ff6b35; font-size: 36px; margin: 0; letter-spacing: 5px;">{otp_code}</h1>
                    </div>
                    
                    <p style="color: #666; font-size: 14px; margin-top: 20px;">
                        This OTP is valid for 10 minutes only. Please do not share this code with anyone.
                    </p>
                    
                    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
                        <p style="color: #888; font-size: 12px;">
                            If you didn't request this verification, please ignore this email.
                        </p>
                        <p style="color: #ff6b35; font-weight: bold; margin-top: 15px;">
                            गणपति बप्पा मोरया! 🙏
                        </p>
                    </div>
                </div>
                
                <div style="text-align: center; margin-top: 20px; color: #666; font-size: 12px;">
                    <p>© 2024 Shri Ganpati Murtis. All rights reserved.</p>
                    <p>Kumharwada, Mumbai - 400004 | +91 98765 43210</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        msg.attach(MIMEText(body, 'html'))
        
        # Connect to server and send email
        server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
        server.starttls()
        server.login(EMAIL_ADDRESS, EMAIL_PASSWORD)
        text = msg.as_string()
        server.sendmail(EMAIL_ADDRESS, recipient_email, text)
        server.quit()
        
        return True
        
    except Exception as e:
        import sys as _sys
        _sys.stderr.write(f"Error sending email: {str(e)}\n")
        return False

def main():
    """Main function to handle command line arguments"""
    if len(sys.argv) != 3:
        print("Usage: python send_otp.py <email> <name>")
        sys.exit(1)
    
    recipient_email = sys.argv[1]
    user_name = sys.argv[2]
    
    # Generate OTP
    otp_code = generate_otp()
    
    # Send email
    if send_otp_email(recipient_email, otp_code, user_name):
        # Return success response with OTP
        response = {
            'success': True,
            'otp': otp_code,
            'expires': (datetime.now() + timedelta(minutes=10)).isoformat(),
            'message': 'OTP sent successfully'
        }
        print(json.dumps(response))
    else:
        # Return error response
        response = {
            'success': False,
            'message': 'Failed to send OTP'
        }
        print(json.dumps(response))

if __name__ == "__main__":
    main()