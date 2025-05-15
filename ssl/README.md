# SSL Certificate Setup Guide

This directory is where you should place your SSL certificates to enable HTTPS for your application.

## Required Certificate Files

1. **privatekey.pem** - Your private SSL key
2. **certificate.pem** - Your SSL certificate

## How to Use SSL with This Application

1. Place the two required files in this directory.
2. Restart the server.
3. The application will automatically detect the SSL certificates and start in HTTPS mode.

## Running in VS Code

When running the application in VS Code:

1. Copy your SSL certificate files to this directory.
2. Start the application normally through VS Code.
3. The server will automatically detect and use the SSL certificates.
4. Access the application via https://localhost:5000 instead of http://localhost:5000.

## Certificate Format

The certificates should be in PEM format, which is a base64 encoded text format with begin/end markers:

```
-----BEGIN CERTIFICATE-----
(base64 encoded data)
-----END CERTIFICATE-----
```

## Getting SSL Certificates

### For Development:
You can generate a self-signed certificate for development using OpenSSL:

```bash
# Generate a private key
openssl genrsa -out privatekey.pem 2048

# Generate a self-signed certificate
openssl req -new -x509 -key privatekey.pem -out certificate.pem -days 365
```

**Note**: Self-signed certificates will cause browser warnings. These are fine for development but not for production.

### For Production:
For production use, obtain a proper SSL certificate from a Certificate Authority (CA) like:
- Let's Encrypt (free)
- DigiCert
- Comodo
- GlobalSign

## Troubleshooting

- Ensure both files are readable by the application process
- Verify that the certificate and private key match
- Check that the certificate is not expired
- For production, ensure the certificate is issued for the correct domain name