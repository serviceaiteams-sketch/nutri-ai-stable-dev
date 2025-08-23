# NutriAI Oracle - Refined Version

A streamlined, AI-powered nutrition assistant built with Node.js/Express.js backend and React.js frontend.

## 🚀 **Quick Start**

### **Prerequisites**
- Node.js (v16 or higher)
- npm or yarn

### **1. Install Dependencies**
```bash
# Install backend dependencies
npm install

# Install frontend dependencies
cd client && npm install
cd ..
```

### **2. Environment Setup**
```bash
# Copy and configure environment variables
cp env.example .env
```

Edit `.env` file:
```env
NODE_ENV=development
PORT=5001
CLIENT_URL=http://localhost:3000
JWT_SECRET=your-super-secret-jwt-key
OPENAI_API_KEY=your-openai-api-key
```

### **3. Start the Application**
```bash
# Start both frontend and backend
npm run dev

# Or start separately:
npm run server    # Backend on port 5001
npm run client    # Frontend on port 3000
```

## 🌐 **Access Points**
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5001
- **Health Check**: http://localhost:5001/api/health

## ✨ **Core Features**
- **User Authentication** - Secure login/register system
- **Food Recognition** - AI-powered nutrition analysis
- **Meal Tracking** - Daily nutrition logging
- **Health Dashboard** - Personal health metrics
- **User Profiles** - Customizable nutrition goals
- **Basic Analytics** - Nutrition insights and trends

## 🏗️ **Project Structure**
```
nutri-ai-stable-dev/
├── client/                    # React Frontend
│   ├── src/components/        # UI Components
│   ├── src/context/           # React Context
│   └── package.json           # Frontend Dependencies
├── server/                    # Express Backend
│   ├── routes/                # API Routes
│   ├── middleware/            # Authentication
│   ├── config/                # Database Config
│   └── index.js               # Server Entry Point
├── data/                      # SQLite Database
└── package.json               # Backend Dependencies
```

## 🔧 **API Endpoints**
- `POST /api/auth/login` - User authentication
- `POST /api/auth/register` - User registration
- `GET /api/nutrition/*` - Nutrition data
- `POST /api/meals/*` - Meal management
- `GET /api/users/*` - User profiles
- `POST /api/ai/*` - AI features
- `GET /api/workouts/*` - Workout data
- `GET /api/analytics/*` - Analytics data

## 🗄️ **Database**
- **SQLite** database with automatic migrations
- **User management** and authentication
- **Nutrition data** and meal tracking
- **Health metrics** and analytics

## 🎨 **Frontend**
- **React.js** with modern hooks
- **Tailwind CSS** for styling
- **Responsive design** for all devices
- **Real-time updates** and notifications

## 🚀 **Deployment**
```bash
# Build for production
npm run build

# Start production server
npm start
```

## 📝 **Notes**
- This is a refined version with essential features only
- Removed complex/unnecessary routes and dependencies
- Focused on core nutrition and health functionality
- Simplified architecture for easier maintenance

## 🤝 **Support**
For issues or questions, please check the project structure or refer to the API endpoints above.
