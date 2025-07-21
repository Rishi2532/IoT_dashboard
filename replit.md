# Maharashtra Water Infrastructure Management Platform

## Overview

This is a comprehensive water infrastructure management platform for Maharashtra, designed to provide intelligent insights into regional water projects through data analysis and multi-block scheme management. The platform features a TypeScript/React frontend with an Express.js backend, utilizing PostgreSQL for data storage and supporting real-time water consumption tracking, scheme management, and AI-powered chatbot assistance.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite for fast development and optimized production builds
- **UI Framework**: Shadcn/ui components with Tailwind CSS for styling
- **State Management**: TanStack Query for server state management and caching
- **Form Handling**: React Hook Form with Zod validation
- **Charts & Visualization**: Custom components for data visualization

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **API Design**: RESTful API with structured endpoints
- **File Processing**: Support for Excel and CSV imports using XLSX library
- **Session Management**: Express sessions for user authentication

### Database Architecture
- **Primary Database**: PostgreSQL with Drizzle ORM
- **Schema Management**: Drizzle Kit for migrations and schema management
- **Connection Pooling**: PostgreSQL connection pooling for performance
- **Data Models**: Comprehensive schema for regions, schemes, villages, users, and tracking data

## Key Components

### Core Data Models
1. **Region Management**: Regional water infrastructure summaries and statistics
2. **Scheme Status**: Detailed tracking of water schemes across Maharashtra
3. **Water Scheme Data**: Village-level water consumption and LPCD tracking
4. **User Management**: Authentication and role-based access control
5. **Population Tracking**: Historical population data storage and analysis
6. **Chlorine Data**: Water quality monitoring and chlorine level tracking

### Import System
- **Excel Import**: Specialized handling for water scheme data from Excel files
- **CSV Import**: Flexible CSV data import with column mapping
- **Data Validation**: Comprehensive validation and error handling during imports
- **Automatic Processing**: Background processing for large datasets

### AI Integration
- **Chatbot**: OpenAI-powered conversational interface for data queries
- **Multi-language Support**: Support for various Indian languages
- **Voice Recognition**: Speech-to-text capabilities for accessibility
- **Intelligent Filtering**: Natural language processing for data filtering

### Dashboard Features
- **Regional Overview**: Comprehensive regional water infrastructure statistics
- **Scheme Monitoring**: Real-time tracking of scheme completion status
- **LPCD Analysis**: Liters Per Capita per Day monitoring and trends
- **Interactive Maps**: Geospatial visualization of water infrastructure
- **Export Capabilities**: Data export in multiple formats

## Data Flow

### Data Import Flow
1. **File Upload**: Users upload Excel/CSV files through the web interface
2. **Validation**: Server validates file format and data structure
3. **Processing**: Background processing extracts and transforms data
4. **Storage**: Validated data is stored in PostgreSQL database
5. **Population Tracking**: Automatic population data storage for historical analysis
6. **Notification**: Users receive feedback on import success/failure

### Query Flow
1. **API Request**: Frontend makes authenticated requests to backend APIs
2. **Data Retrieval**: Express routes query PostgreSQL using Drizzle ORM
3. **Processing**: Server-side data aggregation and filtering
4. **Response**: JSON responses with structured data
5. **Caching**: TanStack Query caches responses for performance

### Authentication Flow
1. **Login**: Users authenticate with username/password
2. **Session**: Express sessions maintain user state
3. **Authorization**: Route-level protection for sensitive operations
4. **Default Access**: Admin user (admin/admin123) for initial setup

## External Dependencies

### Core Technologies
- **Database**: PostgreSQL (local or cloud-hosted)
- **Runtime**: Node.js 20+ with TypeScript support
- **Package Manager**: npm with lockfile for dependency management

### Cloud Services
- **Database Hosting**: Neon Database for cloud PostgreSQL
- **OpenAI API**: For chatbot functionality and natural language processing
- **Google Translate**: Multi-language support for internationalization

### Development Tools
- **Drizzle Kit**: Database schema management and migrations
- **Vite**: Frontend build tool and development server
- **ESBuild**: Backend bundling for production deployment
- **TypeScript**: Static type checking across the entire codebase

## Deployment Strategy

### Development Environment
- **Local Setup**: Complete local development with PostgreSQL
- **Environment Variables**: Flexible configuration for different environments
- **Hot Reload**: Vite dev server with fast refresh for frontend development
- **Database Seeding**: Automatic database initialization with required tables

### Production Deployment
- **Build Process**: Vite builds optimized frontend bundle
- **Backend Bundle**: ESBuild creates Node.js production bundle
- **Database Migration**: Drizzle handles schema updates and migrations
- **Environment Configuration**: Production-specific environment variables

### Platform Support
- **Replit**: Native support with automatic database provisioning
- **VS Code**: Local development setup with configuration scripts
- **pgAdmin**: Integration with existing PostgreSQL installations
- **Docker**: Containerized deployment options

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes

### July 21, 2025
- **Scheme Distribution Heatmap LPCD Enhancement**: Added scheme LPCD information display in the heatmap scheme lists showing format "Total Villages: 3 • Blocks: 1 • Circle: Akola • Status: Fully Completed • LPCD: 45L"
- **LPCD Calculation System**: Implemented LPCD calculation using latest day water consumption (water_value_day7) divided by total population of all villages in scheme, multiplied by 100000
- **Color-coded LPCD Badges**: Added status-based color indicators (green ≥55L, yellow 40-54L, orange 25-39L, red <25L)
- **Data Integrity Improvements**: Fixed NaN LPCD values by improving number parsing and validation, ensuring water scheme data is fetched for calculations
- **Communication Status Filter Enhancement**: Fixed the filter behavior so that circle, division, subdivision, and block filters show all available options when initially visiting the page, but dynamically filter to show only options from the selected region after a region is chosen
- **Improved User Experience**: Users can now see all filter options initially, making it easier to explore data across regions before drilling down to specific regions

### July 11, 2025
- **Water Value Day 7 Database Enhancement**: Added water_value_day7 and water_date_day7 fields to the water_scheme_data and water_scheme_data_history tables
- **CSV Column Mapping Update**: Updated all CSV import column mappings to accommodate the new 7th day water consumption tracking (water_value_day7 at column 16)
- **Positional Import Enhancement**: Modified positionalColumnMapping and csvColumnMapping in server/storage.ts to handle the shifted column positions for LPCD and date fields
- **Complete Import System Update**: Updated water-scheme-routes.ts and admin/import-lpcd.js to properly handle the new 7-day water consumption structure with correct column positioning
- **Frontend Dashboard Enhancement**: Updated all dashboard components to display Day 7 water consumption data with proper TypeScript interfaces and grid layouts
- **Permanent Database Schema**: Updated database_setup.sql, database_create_scripts.sql, server/init-database.js, and server/setup-db.ts to permanently include water_value_day7 and water_date_day7 fields for new installations and remixes
- **Automatic Migration Logic**: Added automatic column detection and migration logic in server/setup-db.ts to add missing Day 7 columns when upgrading existing databases
- **Complete Schema Consistency**: Ensured all database initialization files (init-database.js, setup-db.ts, database_setup.sql, database_create_scripts.sql) have consistent Day 7 field definitions
- **Remix-Ready Setup**: All database schema fixes are now permanent and will automatically apply to future remixes without manual intervention
- **Block-Specific Dashboard URL Fix**: Fixed dashboard URL generation for schemes spanning multiple blocks (like 83 Village RRWS Scheme MJP RR) to ensure each block gets its correct dashboard URL path
- **Weekly Average LPCD Display**: Enhanced village detail dialog to show weekly average LPCD in the green circular badge instead of single day value, calculated as sum of available daily LPCD values divided by number of days with data
- **Permanent URL Generation Logic**: Updated auto-generate-dashboard-urls.ts to include block field in WHERE clause to prevent URL conflicts for multi-block schemes during future data imports

### July 3, 2025
- **Zoomable Sunburst Tooltip Enhancement**: Removed numerical values from hover tooltips in the zoomable sunburst graph while maintaining hierarchical path information
- **Permanent Tooltip Configuration**: Modified tooltip display to show only the hierarchical path (e.g., "Maharashtra/Amravati/Circle/Status") without any numbers for cleaner user experience
- **Remix Compatibility**: Ensured tooltip changes are permanent and will persist when the application is remixed by other users

### July 1, 2025
- **Overall Report Download System**: Added comprehensive overall report download functionality with 4 new report types (Chlorine, Pressure, Water Consumption, LPCD)
- **Smart Download Logic**: Implemented intelligent system that checks for uploaded files first, then falls back to database generation
- **Upload Management Enhancement**: Added dedicated "Upload Overall Data Reports" section in manage reports with same functionality as existing reports
- **Dynamic UI Indicators**: Updated report cards to show whether uploaded files are available or data will be generated from database
- **Backend API Extensions**: Enhanced report routes to handle overall report types with proper validation and file management
- **Note**: The sunburst visualization functionality remains active in the codebase despite being listed as removed - users can access it through the dashboard hierarchy view

### June 30, 2025
- **Communication Status Table Fix**: Fixed missing communication_status table that was causing CSV import failures in the admin panel
- **Database Schema Permanence**: Updated database initialization to include communication_status table with proper schema matching the application requirements
- **Regional Data Consolidation Fix**: Fixed duplicate Amravati region entries caused by UTF-8 BOM characters, now shows single consolidated entry (230 ESRs)
- **UTF-8 BOM Prevention**: Enhanced CSV import process to automatically remove UTF-8 BOM characters and trim whitespace to prevent future data duplication
- **Complete Database Setup**: Ensured all required tables are created automatically for new users, preventing import errors when remixing the application

### June 27, 2025
- **Circle Packing Visualization Fix**: Fixed complete circle packing graph display issue where only half the visualization was showing and numbers were not visible
- **API Endpoint Addition**: Added missing `/api/scheme-status` endpoint that was causing "No data available" error in circle packing component
- **Data Visualization Enhancement**: Updated circle packing component to properly display full Maharashtra water infrastructure hierarchy with visible numbers showing actual scheme counts per region (e.g., Amaravati: 21 total schemes with 4 completed)
- **Component Architecture**: Created SimpleFixedCirclePacking component with proper SVG sizing, text positioning, and D3.js integration for reliable data visualization

### June 24, 2025
- **Communication Status Enhancement**: Enhanced communication status cards with attractive gradient backgrounds, visual status indicators, and percentage displays for better user experience
- **Pagination Implementation**: Added pagination to communication status scheme list (10 items per page) to handle large datasets efficiently
- **Database Schema Fix**: Created missing communication_status table with proper schema and sample data for demonstration
- **Routing Fix**: Added missing route for `/admin/import-communication-status` page to resolve 404 errors

### June 20, 2025
- **Application Setup and Database Configuration**: Fixed PostgreSQL SSL connection for Neon database, installed all required dependencies, and successfully deployed the complete Maharashtra Water Infrastructure Management Platform
- **ESR Level Data Analysis**: Analyzed comprehensive Excel file containing 31 sheets with 400+ ESR monitoring locations across all Maharashtra regions, including real-time sensor connectivity status for chlorine analyzers, pressure transmitters, and flow meters
- **Communication Status System Implementation**: Built complete communication infrastructure monitoring system with 22-column database table, geographic filtering dashboard, CSV import functionality, and real-time sensor status tracking across 1,259 ESR locations

### June 19, 2025
- **Fixed Pressure Dashboard Historical Export**: Corrected date filtering to properly respect selected date ranges instead of downloading all data
- **Enhanced LPCD Dashboard Export**: Updated village LPCD dashboard to fetch historical data from `water_scheme_data_history` table when date ranges are selected
- **Improved CSV Import Functionality**: Enhanced CSV imports to automatically populate `water_scheme_data_history` table with individual date-value records for historical tracking
- **Database Schema Enhancement**: Ensured proper storage of water and LPCD historical data with batch tracking and date-wise records

### Technical Improvements
- Fixed SQL date conversion for pressure history filtering (DD-Mon-YY format)
- Updated LPCD export to use `/api/water-scheme-data/download/village-lpcd-history` endpoint
- Enhanced historical data storage during CSV imports with proper error handling and batch processing
- Improved scheme status updates during CSV imports
- Implemented Communication Status dashboard with proper query invalidation and real-time filtering
- Fixed time-based sensor status counting logic to use binary values (1/0) instead of string matching
- Created admin CSV import system with 22-column structure matching Excel data format

## Changelog

Changelog:
- June 14, 2025. Initial setup
- June 19, 2025. Enhanced historical data export functionality and CSV import improvements