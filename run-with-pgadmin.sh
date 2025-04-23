#!/bin/bash

echo "==================================================="
echo "   Maharashtra Water Dashboard - pgAdmin Edition"
echo "==================================================="
echo ""
echo "This script will start the Maharashtra Water Dashboard application"
echo "configured to use your pgAdmin database:"
echo ""
echo "  Database Name: water_scheme_dashboard"
echo "  Username: postgres"
echo "  Password: Salunke@123"
echo "  Host: localhost"
echo "  Port: 5432"
echo ""
echo "Steps:"
echo "1. Installing dependencies (if needed)"
echo "2. Configuring environment for pgAdmin"
echo "3. Starting the application server"
echo ""
echo "The dashboard will be available at: http://localhost:5000"
echo "Login with: admin / admin123"
echo ""
echo "Press Ctrl+C to stop the server when done."
echo ""
echo "==================================================="
echo ""

# Copy pgAdmin configuration
echo "Setting up pgAdmin configuration..."
cp .env.pgadmin .env.vscode

# Install dependencies
echo "Installing dependencies..."
npm install

# Start the application
echo ""
echo "Starting Maharashtra Water Dashboard with pgAdmin..."
echo ""
npm run dev

# This part will only execute if the application crashes or is closed
echo ""
echo "Application stopped."