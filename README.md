# Zoho Timelog

A Next.js web app for logging time entries to [Zoho Projects](https://www.zoho.com/projects/) via the Zoho API.

## Features

- **OAuth authentication** — connect your Zoho account with one click
- **Log Time (Form)** — pick a project and task, set hours/minutes, add notes, mark billable
- **Weekly Calendar** — visual week view for browsing and logging time
- **View History** — filter time logs by project and date range

## Tech Stack

- [Next.js 16](https://nextjs.org/) (App Router)
- [React 19](https://react.dev/)
- [Tailwind CSS 4](https://tailwindcss.com/)
- TypeScript

## Getting Started

### Prerequisites

- Node.js 18+
- A [Zoho API client](https://api-console.zoho.com/) with OAuth credentials

### Setup

1. Clone the repo and install dependencies:

   ```bash
   git clone https://github.com/your-username/zoho-timelog.git
   cd zoho-timelog
   npm install
   ```

2. Create a `.env.local` file in the project root:

   ```env
   ZOHO_CLIENT_ID=your_client_id
   ZOHO_CLIENT_SECRET=your_client_secret
   ZOHO_REDIRECT_URI=http://localhost:3000/api/zoho/auth/callback
   ```

3. Start the dev server:

   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) and click **Connect Zoho account** to authenticate.

## Project Structure

```
src/app/
├── page.tsx          # Home / navigation
├── timelog/          # Time entry form
├── calendar/         # Weekly calendar view
├── history/          # Time log history
└── api/zoho/
    ├── auth/         # OAuth flow
    ├── projects/     # List projects & tasks
    └── timelog/      # Create & fetch time logs
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm start` | Run production build |
| `npm run lint` | Lint the codebase |

## License

MIT
