# NutriAI Oracle - AI-Powered Nutrition Assistant

NutriAI Oracle is a comprehensive AI-powered nutrition assistant that uses image recognition to identify foods from photos and provides instant nutritional analysis, personalized recommendations, and health tracking.

## 🚀 Features

### Core Features
- **AI Food Recognition**: Upload food photos and get instant nutritional breakdown
- **Nutritional Analysis**: Detailed calorie, macro, and micronutrient information
- **Health Classification**: Automatic healthy/junk food classification
- **Meal Tracking**: Daily, weekly, and monthly nutrition tracking
- **Personalized Recommendations**: AI-driven dietary and workout suggestions
- **Health Warnings**: Proactive health alerts based on eating patterns
- **User Profiles**: Personalized nutrition goals and health metrics

### Technical Features
- **Cross-Platform**: Web application with mobile-responsive design
- **Real-time Analysis**: Fast AI-powered food recognition
- **Secure Authentication**: JWT-based user authentication
- **Data Persistence**: SQLite database with comprehensive schema
- **Modern UI**: Beautiful, intuitive interface with animations
- **API-First**: RESTful API architecture

## 🛠️ Technology Stack

### Backend
- **Node.js** with Express.js
- **SQLite** database
- **JWT** authentication
- **Multer** for file uploads
- **Sharp** for image processing
- **Helmet** for security

### Frontend
- **React.js** with hooks
- **React Router** for navigation
- **Tailwind CSS** for styling
- **Framer Motion** for animations
- **React Dropzone** for file uploads
- **Recharts** for data visualization
- **React Hot Toast** for notifications

### AI & APIs
- **Simulated AI** food recognition (ready for YOLO integration)
- **Nutrition database** integration
- **Health guidelines** implementation

## 📦 Installation

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn

### Backend Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd nutriai-oracle
   ```

2. **Install backend dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp env.example .env
   ```
   Edit `.env` file with your configuration:
   ```env
   NODE_ENV=development
   PORT=5000
   CLIENT_URL=http://localhost:3000
   JWT_SECRET=your-super-secret-jwt-key
   OPENAI_API_KEY=your-openai-api-key
   ```

4. **Start the backend server**
   ```bash
   npm run server
   ```

### Frontend Setup

1. **Navigate to client directory**
   ```bash
   cd client
   ```

2. **Install frontend dependencies**
   ```bash
   npm install
   ```

3. **Start the React development server**
   ```bash
   npm start
   ```

### Complete Setup

Run both servers simultaneously:
```bash
# From root directory
npm run dev
```

## 🗄️ Database Schema

The application uses SQLite with the following main tables:

- **users**: User profiles and authentication
- **meals**: Meal logging and nutrition data
- **food_items**: Detailed food breakdown
- **workout_recommendations**: Exercise suggestions
- **health_warnings**: Health alerts and warnings
- **nutrition_goals**: Personalized nutrition targets

## 🔧 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/profile` - Get user profile

### AI & Food Recognition
- `POST /api/ai/recognize-food` - Analyze food image
- `POST /api/ai/classify-meal` - Classify meal health

### Meal Management
- `POST /api/meals/log` - Log a meal
- `GET /api/meals/daily/:date` - Get daily meals
- `GET /api/meals/summary/:date` - Get nutrition summary
- `GET /api/meals/weekly-summary` - Get weekly summary

### Workout Recommendations
- `GET /api/workouts/recommendations` - Get personalized workouts
- `GET /api/workouts/weekly-plan` - Get weekly workout plan
- `POST /api/workouts/log` - Log completed workout

### Health & Nutrition
- `GET /api/nutrition/health-warnings` - Get health warnings
- `GET /api/nutrition/dietary-recommendations` - Get dietary advice
- `POST /api/nutrition/goals` - Set nutrition goals

### User Management
- `GET /api/users/profile` - Get user profile
- `PUT /api/users/profile` - Update profile
- `GET /api/users/health-metrics` - Calculate BMI and metrics
- `GET /api/users/stats` - Get user statistics

## 🎯 Usage

### Getting Started

1. **Register an account** with your email and basic information
2. **Complete your profile** with health goals and preferences
3. **Upload food photos** to get instant nutritional analysis
4. **Track your meals** and view daily/weekly summaries
5. **Get personalized recommendations** for diet and exercise
6. **Monitor health warnings** and dietary suggestions

### Key Workflows

#### Food Recognition
1. Navigate to "Food Recognition"
2. Upload or drag & drop a food image
3. Wait for AI analysis (2-5 seconds)
4. Review recognized foods and nutrition data
5. Log the meal to your diary

#### Meal Tracking
1. View your daily nutrition summary
2. Track calories, macros, and micronutrients
3. Compare against personalized goals
4. View trends and patterns

#### Health Monitoring
1. Check health warnings regularly
2. Review dietary recommendations
3. Monitor nutrition goals
4. Track progress over time

## 🔮 Future Enhancements

### AI Improvements
- **Real YOLO Model**: Integrate actual YOLOv8 for food recognition
- **Portion Estimation**: AI-based portion size detection
- **Recipe Recognition**: Identify complex dishes and recipes
- **Barcode Scanning**: Scan packaged food barcodes

### Features
- **Mobile App**: React Native or Flutter mobile application
- **Social Features**: Share meals and achievements
- **Wearable Integration**: Connect with fitness trackers
- **Voice Commands**: Voice-based meal logging
- **Meal Planning**: AI-powered meal planning
- **Shopping Lists**: Generate shopping lists from meal plans

### Integrations
- **Nutrition APIs**: Edamam, USDA FoodData Central
- **Fitness APIs**: Strava, Apple Health, Google Fit
- **Recipe APIs**: Spoonacular, Edamam Recipe API
- **Health APIs**: Integration with health providers

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **YOLO Model**: For food recognition capabilities
- **Nutrition Databases**: For comprehensive food data
- **Health Guidelines**: WHO and CDC recommendations
- **UI/UX**: Modern design principles and accessibility

## 📞 Support

For support, email support@nutriai-oracle.com or create an issue in the repository.

---

**NutriAI Oracle** - Empowering healthier choices through AI-powered nutrition assistance.
