# Maharashtra Water Dashboard

## Getting Started with VS Code

This project is configured to run easily in Visual Studio Code. Follow these steps:

1. **Open the project** in VS Code
2. Make sure the .env.local file contains the correct database and OpenAI API credentials
3. Install dependencies by running:
   ```
   npm install
   ```
4. Start the application using one of these methods:
   - Press F5 to launch the debuggable server
   - Use the "Terminal > Run Task..." menu and select "Start App"
   - Run `npm run dev` in the terminal

The application will be accessible at http://localhost:5000

## Features

- Interactive dashboard for Maharashtra water infrastructure
- Regional water scheme visualization
- Voice-enabled chatbot assistant (supports multiple Indian languages)
- Data filtering by region, scheme status, etc.

## Environment Variables

If you need to change any environment variables, edit the .env.local file.

## Chatbot Functionality

The chatbot requires an OpenAI API key to function properly. Make sure the OPENAI_API_KEY 
environment variable is set in your .env.local file.
