#!/usr/bin/env python3
"""
Standalone Kanban Server
Runs without debug mode, more stable for production-like use
"""
from app import app, init_db
import logging
import os

# 設定日誌
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# 初始化資料庫
init_db()
logger.info("Database initialized")

# 啟動伺服器
if __name__ == '__main__':
    logger.info("Starting Kanban Board server on port 8000")
    app.run(
        host='0.0.0.0',
        port=8000,
        debug=False,
        threaded=True,
        use_reloader=False  # 關閉自動重載，避免程序重啟
    )