# Numa AI Therapist

A compassionate AI-powered therapy companion designed to provide emotional support, guidance, and mental health assistance through intelligent conversations and personalized care.

## 🌟 Overview

Numa AI Therapist is a comprehensive mental health platform that combines artificial intelligence with evidence-based therapeutic approaches to provide accessible, personalized mental health support. The platform offers real-time emotional analysis, session tracking, goal management, and continuous progress monitoring.

## 🚀 Features

### Core Functionality
- **AI-Powered Conversations**: Intelligent, empathetic responses using advanced language models
- **Emotional State Analysis**: Real-time emotion detection and mood tracking
- **Session Management**: Comprehensive therapy session recording and analysis
- **Goal Setting & Tracking**: Personalized mental health goals with progress monitoring
- **Context-Aware Responses**: AI maintains conversation context and user history
- **Privacy-First Design**: End-to-end encryption and secure data handling

### Advanced Features
- **Progress Analytics**: Detailed insights into mental health journey
- **Personalized Recommendations**: AI-driven suggestions based on user patterns
- **Crisis Detection**: Automated identification of mental health emergencies
- **Multi-Modal Support**: Text, voice, and future video interaction capabilities
- **Therapeutic Techniques**: Integration of CBT, DBT, and mindfulness practices

## 🏗️ Architecture

### Project Structure
```
numa/
├── frontend/                 # React-based user interface
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   ├── pages/          # Application pages
│   │   ├── hooks/          # Custom React hooks
│   │   ├── utils/          # Utility functions
│   │   └── types/          # TypeScript type definitions
│   ├── public/             # Static assets
│   └── package.json
├── backend/                 # Node.js/Express API server
│   ├── src/
│   │   ├── database/       # Database schema and repositories
│   │   ├── routes/         # API route handlers
│   │   ├── services/       # Business logic services
│   │   ├── middleware/     # Express middleware
│   │   └── utils/          # Server utilities
│   └── package.json
├── .kiro/                  # Kiro IDE configuration
│   ├── specs/             # Feature specifications
│   └── settings/          # IDE settings
└── docs/                  # Documentation
```

### Technology Stack

#### Frontend
- **React 18** - Modern UI framework with hooks and concurrent features
- **TypeScript** - Type-safe JavaScript development
- **Tailwind CSS** - Utility-first CSS framework
- **Vite** - Fast build tool and development server
- **React Router** - Client-side routing
- **Zustand** - Lightweight state management

#### Backend
- **Node.js** - JavaScript runtime environment
- **Express.js** - Web application framework
- **TypeScript** - Type-safe server development
- **Supabase** - Backend-as-a-Service with PostgreSQL
- **HuggingFace** - AI/ML model integration
- **JWT** - Authentication and authorization

#### Database
- **PostgreSQL** (via Supabase) - Relational database
- **Row Level Security** - Fine-grained access control
- **Real-time subscriptions** - Live data updates
- **Automated backups** - Data protection and recovery

#### AI & ML
- **HuggingFace Transformers** - Natural language processing
- **Sentiment Analysis** - Emotion detection and classification
- **Context Management** - Conversation memory and continuity

## 🛠️ Installation & Setup

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn package manager
- Supabase account
- HuggingFace API key

### Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/BlackHawk74/numa.git
   cd numa
   ```

2. **Install dependencies**
   ```bash
   npm run install:all
   ```

3. **Environment Configuration**
   
   **Backend Setup:**
   ```bash
   cd backend
   cp .env.example .env
   ```
   
   Edit `backend/.env` with your configuration:
   ```env
   PORT=3001
   NODE_ENV=development
   
   # Supabase Configuration
   SUPABASE_URL=your_supabase_project_url
   SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   
   # HuggingFace API
   HUGGINGFACE_API_KEY=your_huggingface_api_key
   
   # CORS Configuration
   FRONTEND_URL=http://localhost:3000
   ```
   
   **Frontend Setup:**
   ```bash
   cd frontend
   cp .env.example .env
   ```
   
   Edit `frontend/.env` with your configuration:
   ```env
   REACT_APP_API_URL=http://localhost:3001
   REACT_APP_SUPABASE_URL=your_supabase_project_url
   REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Database Setup**
   ```bash
   cd backend
   npm run db:setup
   ```
   Follow the instructions to create database tables in Supabase.

5. **Start Development Servers**
   ```bash
   npm run dev
   ```
   This starts both frontend (http://localhost:3000) and backend (http://localhost:3001).

6. **Access the Application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:3001
   - Health Check: http://localhost:3001/health

## 📊 Database Schema

### Tables Overview
- **users**: User profiles and preferences
- **sessions**: Therapy session records and transcripts
- **goals**: Personal mental health goals and progress tracking

### Key Features
- UUID primary keys for security
- Row Level Security (RLS) for data protection
- Automatic timestamps and triggers
- Foreign key relationships for data integrity
- Indexes for optimal query performance

## 🧪 Testing

### Backend Testing
```bash
cd backend
npm run db:test      # Test database functionality
npm run db:health    # Check database connection
npm test            # Run unit tests (when implemented)
```

### Frontend Testing
```bash
cd frontend
npm test            # Run component tests (when implemented)
npm run test:e2e    # Run end-to-end tests (when implemented)
```

## 🚀 Deployment

### Production Environment Variables
Ensure all environment variables are properly configured for production:
- Use production Supabase project
- Set NODE_ENV=production
- Configure proper CORS origins
- Use secure API keys

### Build Commands
```bash
# Build all packages
npm run build

# Start production server
npm start
```

## 📈 Development Roadmap

### Phase 1: Core Platform ✅
- [x] Database schema and API foundation
- [x] User authentication and session management
- [x] Basic AI conversation capabilities
- [x] Goal tracking system

### Phase 2: Enhanced AI Features (In Progress)
- [ ] Advanced emotion detection
- [ ] Personalized response generation
- [ ] Crisis intervention protocols
- [ ] Therapeutic technique integration

### Phase 3: Advanced Analytics
- [ ] Progress visualization
- [ ] Predictive mental health insights
- [ ] Personalized recommendations
- [ ] Integration with wearable devices

### Phase 4: Platform Expansion
- [ ] Mobile applications (iOS/Android)
- [ ] Voice interaction capabilities
- [ ] Multi-language support
- [ ] Healthcare provider integration

## 🤝 Contributing

This is a proprietary project. Contributions are by invitation only. Please contact the project owner for collaboration opportunities.

## 📞 Support

For technical support or questions:
- Create an issue in this repository
- Contact: [Your contact information]

## 🔒 Security

Security is paramount in mental health applications. This project implements:
- End-to-end encryption for sensitive data
- Row Level Security in the database
- Secure API authentication
- Regular security audits and updates

Report security vulnerabilities privately to: [Your security contact]

## 📄 License

**Proprietary License - All Rights Reserved**

This software and associated documentation files (the "Software") are the exclusive property of the owner. Unauthorized copying, distribution, modification, or use of this Software is strictly prohibited.

See [LICENSE](LICENSE) file for complete terms and conditions.

---

**Numa AI Therapist** - Compassionate AI for Mental Wellness
© 2025 All Rights Reserved