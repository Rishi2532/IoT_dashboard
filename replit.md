# Maharashtra Water Infrastructure Management Platform

## Overview

This is a comprehensive water infrastructure management platform for Maharashtra, designed to provide intelligent insights into regional water projects through data analysis and multi-block scheme management. The platform features real-time water consumption tracking, scheme management, and AI-powered chatbot assistance, aiming to provide intelligent insights into regional water projects.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions
- **UI Framework**: Shadcn/ui components with Tailwind CSS for styling.
- **Charts & Visualization**: Custom components for data visualization including interactive maps, LPCD filter cards, heatmaps, and circle packing.
- **Color Schemes**: Utilizes green, yellow, orange, and red color schemes for status indicators and data categorization (e.g., LPCD ranges, completion metrics).
- **Design Approach**: Focus on clear, intuitive dashboards with interactive elements and export capabilities.

### Technical Implementations
- **Frontend**: React 18 with TypeScript, built using Vite. Uses TanStack Query for server state management and React Hook Form with Zod for form handling.
- **Backend**: Node.js with Express.js framework, written in TypeScript. Implements a RESTful API and supports Excel/CSV imports using the XLSX library. Uses Express sessions for user authentication.
- **Database**: PostgreSQL with Drizzle ORM for schema management and migrations. Features comprehensive data models for regions, schemes, villages, users, population, and chlorine data.
- **AI Integration**: OpenAI-powered conversational interface for data queries, supporting multi-language communication and natural language processing.
- **Data Import System**: Advanced CSV import system with automatic column mapping for water consumption data (29 columns), intelligent date format parsing (DD-MMM, DD/MM/YYYY, MM/DD/YYYY), and comprehensive error handling for large datasets.
- **Authentication**: User authentication with role-based access control and session management.

### Feature Specifications
- **Regional Management**: Summaries and statistics for regional water infrastructure.
- **Scheme Tracking**: Detailed monitoring of water scheme statuses and completion.
- **Water Consumption**: Village-level LPCD (Liters Per Capita per Day) tracking and analysis with automatic CSV import supporting 29-column format.
- **Population Tracking**: Historical population data storage and analysis.
- **Water Quality**: Chlorine level tracking and water quality monitoring.
- **Interactive Dashboards**: Comprehensive dashboards featuring regional overviews, scheme monitoring, LPCD analysis, and geospatial visualization.
- **Data Export**: Capabilities to export data in various formats.
- **Communication Status**: System to monitor communication status of ESR locations, including real-time sensor connectivity.
- **CSV Import System**: Robust CSV import with automatic column mapping for water consumption data (29 columns) and flexible date format parsing (supports "DD-MMM", "DD/MM/YYYY", etc.).

## External Dependencies

- **Database**: PostgreSQL (can be local or cloud-hosted).
- **Cloud Database Hosting**: Neon Database.
- **AI/NLP**: OpenAI API.
- **Translation**: Google Translate.
- **Runtime**: Node.js 20+.
- **Package Manager**: npm.