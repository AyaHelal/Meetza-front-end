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
- Group Management: Create and manage academic/medical groups with role-based access (Administrators & Members)
- Meeting Scheduling: Integrated calendar for appointment booking and event management
- Responsive Design: Optimized for both desktop and mobile devices
- Authentication: Secure login/signup with email verification and password recovery
- File Management: Upload and share documents, images, videos, and other media files
- User Roles: Different permissions for administrators and members

## 🛠 Tech Stack

- Frontend: React 19.2.0, React Router DOM 7.9.4
- UI Framework: Bootstrap 5.3.8, React Bootstrap 2.10.10
- Animations: Framer Motion 12.23.22
- Icons: Phosphor Icons, Lucide React, React Icons
- HTTP Client: Axios 1.12.2
- Real-Time Communication: Socket.io Client 4.8.1
- Forms: React Google reCAPTCHA 3.1.0
- Notifications: React Toastify 11.0.5
- Build Tool: Create React App (React Scripts 5.0.1)
- Testing: Jest, React Testing Library

## ⚙️ Setup & Env

### Prerequisites and Dependencies

#### System Requirements

- OS: Windows / macOS / Linux
- RAM: 4GB minimum (8GB recommended)
- Disk: 1GB+ free space

#### Required Software / Tools

- Node.js: **v18+ recommended** (Docker build uses Node 18)
- npm (or yarn)
- Git

#### External Services

This frontend expects a backend API and a socket server:

- API Base URL: `REACT_APP_API_URL` (default `http://localhost:4000/api`)
- Socket URL: `REACT_APP_SOCKET_URL` (default `http://localhost:4000`)

If your backend depends on a database or third‑party services, configure them on the backend and then point this frontend to it using the environment variables below.

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

Optional (depending on your screens/features):

- `REACT_APP_RECAPTCHA_SITE_KEY`

### Environment modes

#### Local Development
Default setup uses local backend:
- http://localhost:4000

#### Production
When deployed, replace with live server URLs in .env:
- API: https://your-domain.com/api
- Socket: https://your-domain.com

## 🔧 Installation

1. Clone the repository

    git clone git@github.com:AyaHelal/Meetza-front-end.git
    cd meetza

2. Install dependencies

    npm install

3. Configure the environment

Make sure environment variables are set before running the app.

Create your .env file from the example:

# Windows
copy .env.example .env

# Mac/Linux
cp .env.example .env

4. Make sure backend is running

## ▶️ Run

### Development

    npm start

Open: http://localhost:3000

### After building (serve `build/`)

    npx serve -s build

## 🏗 Build

    npm run build

Build output will be generated in the `build/` folder.

This project is frontend-only and requires a backend server to function properly.

## 🚀 Deployment

### Docker (included)

This repo includes `Dockerfile`, `nginx.conf`, and `docker-compose.yml`.

    docker compose up --build

Open: http://localhost:3001

### Other common platforms

- Vercel / Netlify: build command `npm run build`, publish directory `build/`, set env vars in the platform
- CI/CD (GitHub Actions / GitLab CI): `npm ci` → `npm test` → `npm run build` → deploy artifacts

## 📖 Usage

### For Administrators:
- Create and manage groups
- Schedule meetings and events
- Oversee group members and content
- Access admin dashboard features

### For Members:
- Join groups created by administrators
- Participate in video meetings
- Send messages and share files
- View group schedules and resources

## 🧪 Testing

npm test

Launches the test runner in interactive watch mode.

## 📦 Pre-built Executable Setup (Optional)

If you provide executables/installer files (optional for web apps), put them under:

- `exe/`

README should then include:

- Download/installation instructions
- How to run the executable
- Any required prerequisites

> Currently, this repository is submitted as **source code** + build/run/deployment instructions above.

## 🔗 Links

- Live Project: [https://meetza-front-end.vercel.app/](https://meetza-front-end.vercel.app/)
- Figma Design: [https://www.figma.com/design/BCnIDNN5fdPOiVv5tXTYXE/Farida-Meetza?node-id=0-1&p=f&t=ehzpvGrgs7fbkPe3-0](https://www.figma.com/design/BCnIDNN5fdPOiVv5tXTYXE/Farida-Meetza?node-id=0-1&p=f&t=ehzpvGrgs7fbkPe3-0)


## 📊 Presentation

- Project Presentation on Canva: https://www.canva.com/design/DAG6wME9m9I/6szllu6C4vuPiD5iRwwTcQ/edit



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
