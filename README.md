# MillionFlats - Premium Luxury Real Estate Platform

A modern, full-stack real estate platform built with Next.js, TypeScript, and Tailwind CSS. This platform connects discerning buyers and investors with premium luxury properties worldwide.

## Features

- 🏠 **Property Listings**: Browse and search luxury properties with advanced filters
- 🔍 **Smart Search**: Search by location, property type, price range, and more
- 📱 **Responsive Design**: Fully responsive UI that works on all devices
- 🔐 **Authentication**: Separate authentication systems for users (OTP-based) and agents (password-based)
- 📸 **Image Optimization**: Automatic image optimization using Next.js Image component
- 🎨 **Modern UI**: Clean, modern interface matching the original design
- ⚡ **Performance**: Optimized for speed and SEO

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Authentication**: JWT with secure cookies
- **Image Handling**: Next.js Image Optimization
- **Backend**: Next.js API Routes

## Project Structure

```
millionflats/
├── app/                    # Next.js app directory
│   ├── (landing)/         # Landing page
│   ├── properties/        # Property listing and detail pages
│   ├── user/             # User authentication and dashboard
│   ├── agent/            # Agent authentication and dashboard
│   ├── about/            # About page
│   ├── contact/          # Contact page
│   ├── layout.tsx        # Root layout
│   └── globals.css       # Global styles
├── components/            # React components
├── lib/                   # Utilities and mock data
├── pages/
│   └── api/              # API routes
│       ├── properties/   # Property endpoints
│       └── auth/         # Authentication endpoints
└── public/                # Static assets
```

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   cd millionflats
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables** (optional for development)
   Create a `.env.local` file:
   ```env
   JWT_SECRET=your-secret-key-here
   NEXT_PUBLIC_BASE_URL=http://localhost:3000
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint

## Pages & Routes

### Public Pages
- `/` - Homepage with hero section and featured properties
- `/properties` - Property listings with filters
- `/properties/[id]` - Individual property detail page
- `/about` - About page with company information
- `/contact` - Contact form and information

### User Routes
- `/user/login` - User login (OTP-based)
- `/user/register` - User registration
- `/user/verify` - OTP verification
- `/user/dashboard` - User dashboard

### Agent Routes
- `/agent/login` - Agent login (password-based)
- `/agent/register` - Agent registration
- `/agent/dashboard` - Agent dashboard

## API Endpoints

### Properties
- `GET /api/properties` - Get all properties (with filters)
- `GET /api/properties/[id]` - Get property by ID

### Authentication
- `POST /api/auth/register` - Register user or agent
- `POST /api/auth/login` - Login user or agent
- `POST /api/auth/verify` - Verify OTP (users only)

### Contact
- `POST /api/contact` - Submit contact form

## Mock Data

The application uses mock data stored in `lib/mockData.ts`. In production, you would replace this with a real database connection.

## Authentication

### Users
- Registration: Email + OTP verification
- Login: Email + OTP sent to email
- Sessions: JWT tokens stored in secure HTTP-only cookies

### Agents
- Registration: Email + Password + License Number
- Login: Email + Password
- Sessions: JWT tokens stored in secure HTTP-only cookies

## Image Optimization

All images are optimized using Next.js Image component with:
- Automatic format optimization (WebP, AVIF)
- Responsive images
- Lazy loading
- Proper sizing

## Production Deployment

1. **Build the application**
   ```bash
   npm run build
   ```

2. **Start production server**
   ```bash
   npm start
   ```

Or deploy to platforms like:
- Vercel (recommended for Next.js)
- Netlify
- AWS
- Any Node.js hosting platform

## Environment Variables

For production, set these environment variables:

- `JWT_SECRET` - Secret key for JWT tokens
- `NEXT_PUBLIC_BASE_URL` - Base URL of your application
- Database connection strings (when implementing real database)

## Notes

- Currently uses mock data - replace with real database in production
- OTP is logged to console in development - implement email service for production
- Contact form submissions are logged - implement email service for production
- Map integration uses placeholder - implement real map service (Google Maps, Mapbox) for production

## License



## Support

For questions or issues, please contact support@millionflats.com

