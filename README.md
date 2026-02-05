# Joe Task Board - Kanban Application

A professional business-style task management board with dashboard and kanban views.

## Features

- 📊 Dashboard with statistics overview
- 🎯 Kanban board (To Do / In Progress / Done)
- 📝 Task creation, editing, and deletion
- 🏷️ Priority levels and tags
- 👤 Assign tasks to User or Joe
- 💬 Comments and activity tracking
- 📅 Due date management
- 🎨 Professional business-style UI

## Deployment to Render

### Step 1: Create GitHub Repository

1. Go to https://github.com/new
2. Create a new repository (e.g., `joe-task-board`)
3. Make it public or private

### Step 2: Push Code to GitHub

```bash
# In your local terminal (after SSH into server)
cd ~/workspace/kanban-board

# Initialize git (if not already)
git init
git add .
git commit -m "Initial commit - Kanban Board"

# Add your GitHub repo as remote
git remote add origin https://github.com/YOUR_USERNAME/joe-task-board.git

# Push to GitHub
git push -u origin main
```

### Step 3: Deploy on Render

1. Go to https://render.com and sign up/login
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Configure the service:

   | Setting | Value |
   |---------|-------|
   | Name | `joe-task-board` |
   | Environment | `Python 3` |
   | Build Command | `pip install -r requirements.txt` |
   | Start Command | `gunicorn app:app` |

5. Click "Create Web Service"
6. Wait for deployment (usually 2-3 minutes)

### Step 4: Access Your App

Once deployed, Render will provide you with a URL like:
```
https://joe-task-board.onrender.com
```

## Local Development

```bash
# Install dependencies
pip install -r requirements.txt

# Initialize database
python3 -c "from app import init_db; init_db()"

# Run locally
python3 app.py

# Access at http://localhost:8000
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `8000` |
| `DATABASE_URL` | Database path | `kanban.db` |

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/tasks` | Get all tasks |
| POST | `/api/tasks` | Create new task |
| PUT | `/api/tasks/{id}` | Update task |
| DELETE | `/api/tasks/{id}` | Delete task |
| POST | `/api/tasks/{id}/move` | Move task status |
| GET | `/api/activities/{task_id}` | Get task activities |
| POST | `/api/activities` | Add comment |

## File Structure

```
kanban-board/
├── app.py                 # Flask backend
├── requirements.txt       # Python dependencies
├── Procfile              # Render start command
├── render.yaml           # Render configuration
├── kanban.db             # SQLite database
├── static/
│   ├── css/
│   │   └── style.css     # Styles
│   └── js/
│       └── app.js        # Frontend logic
└── templates/
    └── index.html        # Main page
```

## License

MIT License
