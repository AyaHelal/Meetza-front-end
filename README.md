# ![Meetza Logo](public/assets/meetza_copy.png)

A comprehensive React-based platform designed for group communication and collaboration. Meetza enables users to connect through secure video meetings, real-time group chat, and efficient group management tools. Currently built as an educational project, it can be adapted for any type of organization in the future.

## 📁 Repository Structure (Required)

```text
/src   → Source code
/exe   → Executable files (if applicable)
README.md
```

## 🚀 Features

- Secure Video Meetings: HD video calls with screen sharing, recording, and meeting notes
- Real-Time Group Chat: Instant messaging with file sharing, emoji support, and notifications
- Group Management: Create and manage educational and workplace groups (such as schools, universities, and companies) with role-based access control for Leaders and Members.
- Meeting Scheduling: Integrated calendar that displays upcoming meetings, helping users track scheduled events, manage their time efficiently, and stay organized.
- Responsive Design: Optimized for both desktop and mobile devices
- Authentication: Secure login/signup with email verification and password recovery
- File Management: Upload and share documents, images, videos, and other media files
- Notifications System:Real-time notifications for platform updates with synchronized email alerts
- Video Sessions System:A content hub for recorded meetingsand leader-uploaded videos with on-demand access to session recordings
  and content
- AI Video & PDF Summarization System: A system that provides structured summaries for video and PDF content with key topics - - language detection,and extracted text or transcripts.

## 🛠 Tech Stack

- Frontend: React 19.2.0, React Router DOM 7.9.4
- UI Framework: Bootstrap 5.3.8, React Bootstrap 2.10.10
- Animations: Framer Motion 12.23.22 and Lottie for smooth, high-quality interactive animations.
- Icons: Phosphor Icons, Lucide React, React Icons
- HTTP Client: Axios 1.12.2
- Real-Time Communication: Socket.io Client 4.8.1
- Forms: React Google reCAPTCHA 3.1.0
- Notifications: React Toastify 11.0.5

## ⚙️ Setup & Env

### Prerequisites and Dependencies

#### Required Software / Tools

- Node.js: **v22.19 recommended** (Docker build uses Node 22.19)
- npm (or yarn)
- Git

#### External Services

This frontend expects a backend API and a socket server:

- API Base URL: `REACT_APP_API_URL` (default `http://localhost:4000/api`)
- Socket URL: `REACT_APP_SOCKET_URL` (default `http://localhost:4000`)

### Environment variables

Create a `.env` file in the project root (you can copy from `.env.example`):

    # Windows
    copy .env.example .env

    # Mac/Linux
    cp .env.example .env

Then update values as needed.

Required variables:

- `REACT_APP_API_URL`
- `REACT_APP_SOCKET_URL`
- `REACT_APP_RECAPTCHA_SITE_KEY`

### Environment modes

#### Local Development

Default setup uses local backend:

- http://localhost:4000

#### Production

When deployed, replace with ngrok URLs in .env:

- API: https://your-ngrok-url/api
- Socket: https://your-ngrok-url/api

## 🔧 Installation

1. Clone the repository

   git clone [git@github.com:AyaHelal/Meetza-front-end.git](https://github.com/AyaHelal/Meetza-front-end.git)
   cd Meetza-front-end

2. Install dependencies

   npm install

3. Configure the environment

Make sure environment variables are set before running the app.

Create your .env file from the example document.

# Windows

copy .env.example .env

# Mac/Linux

cp .env.example .env

Make sure backend is running

## ▶️ Run

### Development

    npm start

Open: http://localhost:3000

### After building (serve `build/`)

    npm install -g serve
    serve -s build

## 🏗 Build

    npm run build

Build output will be generated in the `build/` folder.

This project is frontend-only and requires a backend server to function properly.

## 🚀 Deployment

- Vercel : build command `npm run build`, publish directory `build/`, set env vars in the platform

## 📖 Usage

### For Leaders:

- Create and manage groups
- Schedule meetings and events
- Oversee group members and content
- Access admin dashboard features

### For Members:

- Join groups created by leaders
- Participate in video meetings
- Send messages and share files
- View group schedules and resources

## 🔗 Links

- Live Project: [https://meetza-front-end.vercel.app/](https://meetza-front-end.vercel.app/)
- Figma Design: [https://www.figma.com/design/BCnIDNN5fdPOiVv5tXTYXE/Farida-Meetza?node-id=0-1&p=f&t=ehzpvGrgs7fbkPe3-0](https://www.figma.com/design/BCnIDNN5fdPOiVv5tXTYXE/Farida-Meetza?node-id=0-1&p=f&t=ehzpvGrgs7fbkPe3-0)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (git checkout -b feature/AmazingFeature)
3. Commit your changes (git commit -m 'Add some AmazingFeature')
4. Push to the branch (git push origin feature/AmazingFeature)
5. Open a Pull Request

## 📞 Support

For support or questions, please contact the development team or create an issue in the repository.

## 📝 License

This project is private and proprietary to Meetza.
