# Email Templates

This directory contains HTML email templates for the ChatBot application.

## Templates

### `base_email.html`
Base template with common styling and structure for all emails.

### `otp_verification.html`
Template for OTP (One-Time Password) email verification.
- Displays a 6-digit verification code
- Includes security warnings
- Modern black and white design

### `token_verification.html`
Template for token-based email verification.
- Contains a clickable verification button
- Shows the verification link as fallback text
- Includes step-by-step instructions
- Modern black and white design

## Design Features

- **Color Scheme**: Black and white only (#000000, #ffffff, #f8f8f8, #e0e0e0, #333333, #666666)
- **Typography**: Clean, modern fonts (Segoe UI, sans-serif)
- **Layout**: Responsive design with max-width container
- **Security**: Includes security notices and warnings
- **Accessibility**: Proper contrast ratios and semantic HTML

## Usage

Templates are loaded and rendered by the `app.email` module:

```python
from app.email import send_otp_verification_email, send_token_verification_email

# Send OTP verification
send_otp_verification_email("user@example.com", "123456")

# Send token verification
send_token_verification_email("user@example.com", "https://example.com/verify?token=abc123")
```