from app import app, init_db
import logging

# 初始化資料庫
init_db()

# 設定日誌
logging.basicConfig(level=logging.INFO)

# 啟動伺服器（關閉 debug）
if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8000, debug=False, threaded=True)
