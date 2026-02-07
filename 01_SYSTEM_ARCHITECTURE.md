# System Architecture Document
## HR Self-Service AI Platform

### 1. System Overview

**Platform Name**: HR Self-Service AI Platform  
**Primary Goal**: Automate new hire onboarding with AI-powered voice interaction and intelligent document generation

### 2. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        PRESENTATION LAYER                       │
├──────────────────────────────┬──────────────────────────────────┤
│   New Hire Voice Interface   │   HR Employee Dashboard          │
│   (ElevenLabs Voice AI)      │   (React/Next.js Web App)        │
└──────────────────────────────┴──────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                      APPLICATION LAYER                          │
│                     (FastAPI Backend)                           │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │
│  │ Voice Agent  │  │  Document    │  │  Analytics   │           │
│  │  Service     │  │  Generator   │  │  Service     │           │
│  └──────────────┘  └──────────────┘  └──────────────┘           │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │
│  │ Question     │  │ Translation  │  │ Notification │           │
│  │ Manager      │  │  Service     │  │  Service     │           │
│  └──────────────┘  └──────────────┘  └──────────────┘           │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                      INTEGRATION LAYER                          │
├──────────────────────────────┬──────────────────────────────────┤
│    AI Services               │    External Services             │
│  • ElevenLabs Voice API      │  • AWS S3 (Documents)            │
│  • OpenAI GPT-4 (Document    │  • AWS SES (Email)               │
│    Generation)               │  • AWS CloudWatch (Monitoring)   │
│  • OpenAI Whisper (Speech    │                                  │
│    Recognition)              │                                  │
└──────────────────────────────┴──────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                        DATA LAYER                               │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              PostgreSQL Database                         │   │
│  │  • New Hires        • Contracts      • Questions         │   │
│  │  • Conversations    • Templates      • Audit Logs        │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              AWS S3 (Object Storage)                     │   │
│  │  • Generated PDFs   • Audio Files    • Template Files    │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### 3. Core Components

#### 3.1 New Hire Voice Interface
- **Technology**: ElevenLabs Conversational AI
- **Purpose**: Interactive voice agent for new hire onboarding
- **Features**:
  - Multilingual voice interaction (English, Arabic)
  - Offer presentation and explanation
  - Benefits overview with excitement-building
  - Legal terms explanation in simple language
  - Question collection and submission to HR
  - Real-time conversation state management

#### 3.2 HR Employee Dashboard
- **Technology**: React/Next.js
- **Purpose**: Central management interface for HR staff
- **Features**:
  - Statistics cards (total new hires, completion rate, pending actions)
  - Searchable/filterable data grid
  - Detailed new hire profiles
  - Document preview and download
  - Question inbox with response capability
  - AI-powered document generation interface

#### 3.3 Backend Services (FastAPI)

**Voice Agent Service**
- Manages ElevenLabs integration
- Handles conversation flow and state
- Stores conversation transcripts
- Processes questions from new hires

**Document Generator Service**
- OpenAI GPT-4 integration for content generation
- Template management and customization
- PDF generation from templates
- Multi-jurisdiction support
- Version control for contracts

**Analytics Service**
- Real-time statistics calculation
- Progress tracking per new hire
- Completion rate metrics
- Time-to-complete analytics

**Question Manager**
- Stores new hire questions
- Routes questions to appropriate HR staff
- Manages question status (pending, answered, resolved)
- Notification system for new questions

**Translation Service**
- Multilingual support (English, Arabic)
- Legal term translation and simplification
- Context-aware translation for benefits and contracts

### 4. Data Flow

#### 4.1 New Hire Onboarding Flow
```
1. HR creates new hire record → System generates unique session ID
2. New hire receives invitation link with session ID
3. New hire clicks link → Voice interface loads
4. ElevenLabs agent greets in preferred language
5. Agent presents offer with enthusiasm
6. Agent explains benefits step-by-step
7. Agent explains legal terms in simple language
8. New hire can ask questions → Stored for HR review
9. New hire verbally accepts or requests changes
10. System updates status → HR notified
```

#### 4.2 Document Generation Flow
```
1. HR employee enters basic info (role, salary, benefits)
2. HR provides prompts to AI agent
3. AI agent generates complete offer letter
4. AI agent generates employment contract
5. AI agent generates benefits summary
6. HR reviews and approves documents
7. Documents stored in S3, links in PostgreSQL
8. Documents available to voice agent for presentation
```

#### 4.3 Question Handling Flow
```
1. New hire asks question to voice agent
2. Voice agent acknowledges and records question
3. Question stored in database with transcript
4. HR dashboard shows notification
5. HR employee views question in context
6. HR employee responds (via dashboard or direct contact)
7. Response status updated in system
```

### 5. Technology Stack Details

#### 5.1 Backend
- **Framework**: FastAPI 0.109+
- **Language**: Python 3.11+
- **Key Libraries**:
  - SQLAlchemy (ORM)
  - Pydantic (Data validation)
  - OpenAI Python SDK
  - ElevenLabs Python SDK
  - boto3 (AWS integration)
  - WeasyPrint (PDF generation)
  - python-multipart (File uploads)
  - python-jose (JWT authentication)

#### 5.2 Database
- **Primary**: PostgreSQL 15+
- **Features Used**:
  - JSONB for flexible conversation storage
  - Full-text search for questions
  - Row-level security for multi-tenant support
  - Triggers for audit logging

#### 5.3 Frontend
- **Framework**: Next.js 14+ (React 18+)
- **UI Library**: Tailwind CSS + shadcn/ui
- **State Management**: Zustand or React Query
- **Key Libraries**:
  - TanStack Table (Data grid)
  - Recharts (Analytics visualization)
  - React Hook Form (Forms)
  - Axios (API calls)
  - Socket.io client (Real-time updates)

#### 5.4 AI Services
- **Voice AI**: ElevenLabs Conversational AI
- **LLM**: OpenAI GPT-4 Turbo
- **Speech Recognition**: OpenAI Whisper (fallback)
- **Translation**: OpenAI GPT-4 (context-aware)

#### 5.5 Cloud Infrastructure (AWS)
- **Compute**: ECS Fargate or EC2
- **Storage**: S3 (documents, audio files)
- **Email**: SES (notifications)
- **Monitoring**: CloudWatch
- **CDN**: CloudFront (for frontend)
- **DNS**: Route 53

### 6. Security Architecture

#### 6.1 Authentication & Authorization
- JWT-based authentication for HR dashboard
- Session-based authentication for new hire voice interface
- Role-based access control (RBAC)
- Multi-factor authentication for HR users

#### 6.2 Data Security
- Encryption at rest (PostgreSQL + S3)
- Encryption in transit (TLS 1.3)
- PII data anonymization in logs
- GDPR-compliant data retention policies

#### 6.3 API Security
- Rate limiting per endpoint
- CORS configuration
- Input validation and sanitization
- SQL injection prevention via ORM

### 7. Scalability Considerations

- Horizontal scaling via containerization
- Database connection pooling
- Caching layer (Redis) for frequent queries
- Asynchronous task processing (Celery) for document generation
- CDN for static assets and audio files

### 8. Monitoring & Observability

- Application metrics (response time, error rate)
- Business metrics (completion rate, time-to-hire)
- User interaction analytics
- Error tracking and alerting
- Conversation quality monitoring

### 9. Deployment Architecture

```
┌───────────────────────────────────────────────────────────────────┐
│                         AWS CLOUD                                 │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐     │
│  │                    CloudFront CDN                        │     │
│  │              (Frontend Static Assets)                    │     │
│  └──────────────────────────────────────────────────────────┘     │
│                              │                                    │
│  ┌───────────────────────────┴───────────────────────────────┐    │
│  │                                                           │    │
│  ▼                                                           ▼    │
│  ┌─────────────────────┐                    ┌─────────────────┐   │
│  │  S3 Bucket          │                    │  Application    │   │
│  │  (Next.js Static)   │                    │  Load Balancer  │   │
│  └─────────────────────┘                    └────────┬────────┘   │
│                                                      │            │
│                                             ┌────────┴────────┐   │
│                                             │                 │   │
│                                    ┌────────▼────────┐ ┌──────▼─┐ │
│                                    │  ECS Fargate    │ │  ECS   │ │
│                                    │  FastAPI        │ │ FastAPI│ │
│                                    │  Container 1    │ │ Cont 2 │ │
│                                    └────────┬────────┘ └───┬────┘ │
│                                             │              │      │
│                                    ┌────────┴──────────────┘      │
│                                    │                              │
│  ┌─────────────────────┐           ▼                              │
│  │  S3 Bucket          │   ┌──────────────────┐                   │
│  │  (Documents/Audio)  │◄──│   PostgreSQL     │                   │
│  └─────────────────────┘   │   RDS Instance   │                   │
│                            └──────────────────┘                   │
│                                                                   │
│  External Services:                                               │
│  • ElevenLabs API                                                 │
│  • OpenAI API                                                     │
└───────────────────────────────────────────────────────────────────┘
```

### 10. Development Workflow

1. **Local Development**: Docker Compose for all services
2. **Version Control**: Git with feature branch workflow
3. **CI/CD**: GitHub Actions → AWS ECR → ECS
4. **Testing**: Pytest (backend), Jest (frontend)
5. **Documentation**: OpenAPI/Swagger for APIs

### 11. Success Metrics

- New hire completion rate > 90%
- Average onboarding time < 15 minutes
- Question response time < 2 hours
- Document generation accuracy > 95%
- Voice agent conversation success rate > 85%
- HR time saved per new hire > 2 hours
