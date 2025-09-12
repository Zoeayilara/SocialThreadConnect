# EntryFox - Social Platform

## Overview

EntryFox is a full-stack social platform that enables vendors and customers to connect and interact. The application is built with a modern tech stack using React for the frontend, Express.js for the backend, and PostgreSQL with Drizzle ORM for data persistence.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter for client-side routing
- **State Management**: TanStack Query (React Query) for server state management
- **UI Components**: Radix UI primitives with shadcn/ui component library
- **Styling**: Tailwind CSS with CSS variables for theming
- **Form Handling**: React Hook Form with Zod validation
- **Build Tool**: Vite for development and production builds

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **Authentication**: Replit OpenID Connect (OIDC) integration with Passport.js
- **Session Management**: Express sessions stored in PostgreSQL
- **File Uploads**: Multer for handling image uploads
- **Email Service**: Nodemailer for OTP and notification emails

### Database Architecture
- **Database**: Sql 
- **ORM**: Drizzle ORM with type-safe queries
- **Schema Management**: Drizzle migrations for version control
- **Connection**: Neon serverless driver with WebSocket support

## Key Components

### Authentication System
- **Primary Auth**: Replit OIDC for seamless integration in Replit environment
- **Fallback Registration**: Custom registration flow for vendors/students
- **Password Security**: bcrypt.js for password hashing
- **OTP System**: Email-based one-time passwords for password reset

### User Management
- **User Types**: Students (customers) and vendors with different capabilities
- **Profile System**: User profiles with images, university affiliation, and contact info
- **Verification**: Email verification and account status tracking

### Social Features
- **Posts**: Text and image-based posts with engagement metrics
- **Interactions**: Like, comment, and follow functionality
- **Feed**: Chronological social feed with user interactions
- **Media Upload**: Image upload support for posts and profiles

### API Structure
- RESTful API design with Express.js routes
- Standardized error handling and logging middleware
- File upload endpoints for profile pictures and post images
- Authentication-protected routes with session validation

## Data Flow

### Authentication Flow
1. Users can sign in via Replit OIDC (primary method)
2. Fallback registration available for new users (vendors/students)
3. Email OTP verification for password reset functionality
4. Session persistence in PostgreSQL with connect-pg-simple

### Social Interaction Flow
1. Authenticated users create posts with optional images
2. Posts displayed in chronological feed with engagement data
3. Real-time interaction updates (likes, comments) via optimistic updates
4. Follow relationships enable personalized content discovery

### Data Persistence
1. All user data stored in PostgreSQL via Drizzle ORM
2. Type-safe database operations with shared schema definitions
3. Automatic migrations for schema changes
4. Session data persisted for authentication state

## External Dependencies

### Core Framework Dependencies
- **React Ecosystem**: React 18, React DOM, React Hook Form
- **UI Framework**: Radix UI primitives, shadcn/ui components
- **State Management**: TanStack Query for server state
- **Styling**: Tailwind CSS, class-variance-authority for variants

### Backend Dependencies
- **Server**: Express.js with TypeScript support
- **Database**: Drizzle ORM, Neon serverless PostgreSQL driver
- **Authentication**: Passport.js with OpenID Connect strategy
- **File Handling**: Multer for multipart form data
- **Email**: Nodemailer for transactional emails
- **Security**: bcrypt.js for password hashing

### Development Tools
- **Build**: Vite for frontend bundling, esbuild for backend
- **TypeScript**: Full type safety across frontend and backend
- **Validation**: Zod for runtime type validation
- **Development**: Replit-specific plugins for development environment

## Deployment Strategy

### Development Environment
- Vite development server with HMR for frontend
- tsx for TypeScript execution in development
- Replit-specific middleware for development banners and error overlays

### Production Build
1. Frontend built with Vite to static assets in `dist/public`
2. Backend bundled with esbuild to `dist/index.js`
3. Single deployment artifact serving both frontend and API
4. Environment variables for database and email configuration

### Database Strategy
- Neon serverless PostgreSQL for scalable database hosting
- Drizzle migrations for schema version control
- Connection pooling for optimal performance
- Environment-based configuration for different deployment stages

### File Storage
- Local file system storage for uploaded images (development)
- Configurable storage strategy for production scaling
- Image processing and validation in upload middleware