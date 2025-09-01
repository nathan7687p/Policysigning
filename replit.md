# Overview

SignPro is a digital policy and job management system designed for equipment repair businesses. The application provides digital signature capture, job card management, customer data handling, and PDF document generation. It follows a full-stack architecture with a React frontend and Express.js backend, implementing user authentication through Replit Auth and utilizing PostgreSQL for data persistence.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
The client uses a modern React application built with TypeScript and Vite. The UI is constructed using shadcn/ui components (Radix UI primitives) with Tailwind CSS for styling. State management is handled through TanStack Query (React Query) for server state and React Hook Form for form validation. The application implements a single-page architecture with wouter for client-side routing.

## Backend Architecture
The server runs on Express.js with TypeScript, providing RESTful API endpoints. Authentication is managed through Replit's OpenID Connect integration with session-based storage. The backend implements a clean separation of concerns with dedicated modules for database operations, authentication middleware, and route handling.

## Database Design
The system uses PostgreSQL with Drizzle ORM for type-safe database interactions. The schema includes tables for users, policies, customers, machines, jobs, and signatures, with proper relationships established between entities. Session data is stored in the database for authentication persistence.

## Authentication System
User authentication is handled via Replit Auth using OpenID Connect protocol. The system maintains user sessions in PostgreSQL and implements middleware for route protection. Users must be authenticated to access the main application features.

## File Storage
The application integrates with Google Cloud Storage for file uploads, particularly for machine photos in job cards. An object storage service with ACL (Access Control List) policies manages file permissions and access control.

## Form Management
Forms throughout the application use React Hook Form with Zod schema validation for type safety and user input validation. This includes job creation forms, policy management, and signature capture interfaces.

## PDF Generation
The system includes PDF generation capabilities for job cards and documentation, allowing users to download formatted documents containing job details, customer information, and policy agreements.

# External Dependencies

## Authentication Services
- Replit Auth (OpenID Connect) - Primary authentication provider
- express-session with connect-pg-simple - Session management and storage

## Database Services
- Neon Database - PostgreSQL hosting service
- Drizzle ORM - Type-safe database toolkit with PostgreSQL dialect

## Cloud Storage
- Google Cloud Storage - File storage for machine photos and documents
- Uppy - File upload interface with dashboard modal

## UI Framework
- Radix UI - Accessible UI primitives for React
- Tailwind CSS - Utility-first CSS framework
- shadcn/ui - Pre-built component library

## Development Tools
- Vite - Build tool and development server
- TypeScript - Type safety across the application
- ESBuild - JavaScript bundler for production builds

## Third-party Libraries
- TanStack Query - Server state management
- React Hook Form - Form handling and validation
- Zod - Schema validation
- Wouter - Lightweight client-side routing