# Immaculearn API

Backend API for the Immaculearn educational platform. This API provides the necessary endpoints for user authentication, course management, and other core functionalities of the Immaculearn application.

## 🚀 Getting Started

### Prerequisites

- Node.js 18 or higher
- npm 10.7.0 or higher
- MySQL 8.0 or higher
- Cloudinary account (for file storage)
- Supabase account (for authentication)
- Firebase Admin SDK credentials (if using Firebase services)

### 📦 Installation

1. Clone the repository:

   ```sh
   git clone [repository-url]
   cd ImmaculearnApi-Template
   ```

2. Install dependencies:

   ```sh
   npm install
   ```

3. Set up environment variables:
   Create a `.env` file in the root directory with the following variables:

   ```env
   # Server Configuration
   PORT=3000
   NODE_ENV=development

   # API Security
   API_KEY=your_public_key
   API_SECRET_KEY=your_private_key
   JWT_SECRET=your_jwt_secret

   # Database Configuration
   DB_HOST=localhost
   DB_PORT=3306
   DB_USER=your_db_user
   DB_PASS=your_db_password
   DB_NAME=immaculearn_db

   # Cloudinary Configuration
   CLOUDINARY_CLOUD_NAME=your_cloud_name
   CLOUDINARY_API_KEY=your_cloudinary_key
   CLOUDINARY_API_SECRET=your_cloudinary_secret

   # Supabase Configuration
   SUPABASE_URL=your_supabase_url
   SUPABASE_KEY=your_supabase_key

   # Firebase Configuration (if applicable)
   FIREBASE_PROJECT_ID=your_project_id
   FIREBASE_PRIVATE_KEY=your_private_key
   FIREBASE_CLIENT_EMAIL=your_client_email
   ```

4. Database Setup:
   - Import the database schema from `db.sql`
   - Make sure your MySQL server is running

### 🛠 Development

Start the development server with hot-reload:

```sh
npm run dev
```

Build the application for production:

```sh
npm run build
```

Start the production server:

```sh
npm start
```

## 📚 API Documentation

### Authentication

All protected routes require an API key and JWT token in the request headers.

### Available Endpoints

#### Authentication

- `POST /v1/account/login` - User login
- `POST /v1/account` - Create new account
- `GET /v1/account` - Get account info

#### Example Request

```sh
curl -X POST http://localhost:3000/v1/account/login \
  -H "apikey: your_public_key" \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser", "password":"password123"}'
```

## 🚀 Deployment

### Production Deployment

1. Build the application:

   ```sh
   npm run build
   ```

2. Start the production server:
   ```sh
   NODE_ENV=production npm start
   ```

### Using PM2 (Recommended for Production)

```sh
npm install -g pm2
pm2 start dist/index.js --name "immaculearn-api"
pm2 save
pm2 startup
```

## 🔒 Environment Security

- Never commit sensitive information to version control
- Use environment variables for all configuration
- Rotate API keys and secrets regularly
- Enable HTTPS in production

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the ISC License - see the [LICENSE](LICENSE) file for details

## Testing API Endpoints

### GET v1

Verify if the application is running.

- Request Method: `GET`

```sh
curl http://localhost:{port}/v1/
```

**Example Response**

```json
{"message":"V1 API is App and Running!","controller":"Home"
```

### GET v1/account/login

Authenticate and sign a JWT for the user's session.

- Request Method: `POST`
- Request Headers:
  - `apikey: {public_key}`
  - `content-type: application/json`
- Body: JSON Payload with `username` and `password`

```sh
curl -XPOST http://localhost:3000/v1/account/login -d '{"username":"juan","password":"tamad"}' -H "apikey: hello" -H "content-type: application/json"
```

**Example Response**

```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6Imp1YW4iLCJpYXQiOjE3MjcwMTMwMjgsImV4cCI6MTcyNzA5OTQyOH0.Knt_g1ChjtV04ysC_uk1NNKEkt7DPj6Xid7Cczrbww8"
  }
}
```

### POST v1/account

Create a new account

- Request Method: `POST`
- Request Headers:
  - `apikey: {public_key}`
  - `content-type: application/json`

```sh
curl -XPOST 'http://localhost:3000/v1/account' -d '{"username":"juan","password":"tamad","fullname":"Juan Tamad"}' -H "apikey: hello" -H 'content-type: application/json'
```

### GET v1/account

Verify JWT token and fetch user information

- Request Method: `GET`
- Request Headers:
  - `apikey: {public_key}`
  - `token: {jwt_token}`

```sh
curl http://localhost:3000/v1/account -H "apikey: hello" -H "token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6Imp1YW4iLCJpYXQiOjE3MjgwNDU0NjIsImV4cCI6MTcyODEzMTg2Mn0.GyrPSfEHJbDIMWnyqR-neGtK4yDPA5rttajBwRCtIsM"
```

**Example Response**

```sh
{"success":true,"data":{"username":"juan","fullname":"Juan Tamad"}
```

tasks
├── task_groups
│ └── task_group_members
├── task_criteria
├── task_form
│ └── task_form_options
└── task_submissions



