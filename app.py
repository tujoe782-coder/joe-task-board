import os
from flask import Flask, render_template, request, jsonify, send_from_directory
from datetime import datetime
import sqlite3
import json

# Get the directory containing this file
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

app = Flask(__name__, 
    static_folder=os.path.join(BASE_DIR, 'static'),
    static_url_path='/static'
)

# Configuration for production
app.config['JSON_AS_ASCII'] = False

# Database path - use environment variable for Render compatibility
DB_PATH = os.environ.get('DATABASE_URL', 'kanban.db')

# Database initialization
def init_db():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    
    # Tasks table
    c.execute('''
        CREATE TABLE IF NOT EXISTS tasks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            description TEXT,
            status TEXT DEFAULT 'todo',
            priority TEXT DEFAULT 'medium',
            assignee TEXT DEFAULT 'user',
            due_date TEXT,
            tags TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Activities/comments table
    c.execute('''
        CREATE TABLE IF NOT EXISTS activities (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            task_id INTEGER,
            author TEXT DEFAULT 'user',
            content TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (task_id) REFERENCES tasks (id)
        )
    ''')
    
    conn.commit()
    conn.close()

# Get all tasks
@app.route('/api/tasks', methods=['GET'])
def get_tasks():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('SELECT * FROM tasks ORDER BY created_at DESC')
    tasks = []
    for row in c.fetchall():
        tasks.append({
            'id': row[0],
            'title': row[1],
            'description': row[2],
            'status': row[3],
            'priority': row[4],
            'assignee': row[5],
            'due_date': row[6],
            'tags': json.loads(row[7]) if row[7] else [],
            'created_at': row[8],
            'updated_at': row[9]
        })
    conn.close()
    return jsonify(tasks)

# Create new task
@app.route('/api/tasks', methods=['POST'])
def create_task():
    data = request.json
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('''
        INSERT INTO tasks (title, description, status, priority, assignee, due_date, tags)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    ''', (
        data.get('title'),
        data.get('description'),
        data.get('status', 'todo'),
        data.get('priority', 'medium'),
        data.get('assignee', 'user'),
        data.get('due_date'),
        json.dumps(data.get('tags', []))
    ))
    task_id = c.lastrowid
    conn.commit()
    conn.close()
    return jsonify({'id': task_id, 'message': 'Task created successfully'})

# Update task
@app.route('/api/tasks/<int:task_id>', methods=['PUT'])
def update_task(task_id):
    data = request.json
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('''
        UPDATE tasks 
        SET title=?, description=?, status=?, priority=?, assignee=?, due_date=?, tags=?, updated_at=CURRENT_TIMESTAMP
        WHERE id=?
    ''', (
        data.get('title'),
        data.get('description'),
        data.get('status'),
        data.get('priority'),
        data.get('assignee'),
        data.get('due_date'),
        json.dumps(data.get('tags', [])),
        task_id
    ))
    conn.commit()
    conn.close()
    return jsonify({'message': 'Task updated successfully'})

# Delete task
@app.route('/api/tasks/<int:task_id>', methods=['DELETE'])
def delete_task(task_id):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('DELETE FROM tasks WHERE id=?', (task_id,))
    c.execute('DELETE FROM activities WHERE task_id=?', (task_id,))
    conn.commit()
    conn.close()
    return jsonify({'message': 'Task deleted successfully'})

# Move task (change status)
@app.route('/api/tasks/<int:task_id>/move', methods=['POST'])
def move_task(task_id):
    data = request.json
    new_status = data.get('status')
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('UPDATE tasks SET status=?, updated_at=CURRENT_TIMESTAMP WHERE id=?', 
              (new_status, task_id))
    conn.commit()
    conn.close()
    return jsonify({'message': f'Task moved to {new_status}'})

# Get activities for a task
@app.route('/api/activities/<int:task_id>', methods=['GET'])
def get_activities(task_id):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('SELECT * FROM activities WHERE task_id=? ORDER BY created_at', (task_id,))
    activities = []
    for row in c.fetchall():
        activities.append({
            'id': row[0],
            'task_id': row[1],
            'author': row[2],
            'content': row[3],
            'created_at': row[4]
        })
    conn.close()
    return jsonify(activities)

# Add new activity/comment
@app.route('/api/activities', methods=['POST'])
def create_activity():
    data = request.json
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('INSERT INTO activities (task_id, author, content) VALUES (?, ?, ?)',
              (data.get('task_id'), data.get('author', 'user'), data.get('content')))
    conn.commit()
    conn.close()
    return jsonify({'message': 'Activity added successfully'})

# Main page
@app.route('/')
def index():
    return render_template('index.html')

# Serve static files explicitly for Render
@app.route('/static/css/<path:filename>')
def serve_css(filename):
    return send_from_directory(os.path.join(BASE_DIR, 'static', 'css'), filename)

@app.route('/static/js/<path:filename>')
def serve_js(filename):
    return send_from_directory(os.path.join(BASE_DIR, 'static', 'js'), filename)

if __name__ == '__main__':
    init_db()
    # Use PORT environment variable for Render compatibility
    port = int(os.environ.get('PORT', 8000))
    app.run(host='0.0.0.0', port=port, debug=False)
