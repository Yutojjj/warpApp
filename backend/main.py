import os
import json
import sys
from flask import Flask, request, jsonify
from flask_cors import CORS
import gspread
from google.oauth2 import service_account

# パス設定
sys.path.append(os.path.dirname(__file__))

app = Flask(__name__)
CORS(app)

SCOPES = ['https://www.googleapis.com/auth/spreadsheets', 'https://www.googleapis.com/auth/drive']

def get_creds():
    env_creds = os.environ.get('GOOGLE_CREDENTIALS')
    if env_creds:
        info = json.loads(env_creds)
        return service_account.Credentials.from_service_account_info(info, scopes=SCOPES)
    else:
        creds_path = os.path.join(os.path.dirname(__file__), 'credentials.json')
        return service_account.Credentials.from_service_account_file(creds_path, scopes=SCOPES)

# 認証
creds = get_creds()
client = gspread.authorize(creds)

# --- ここにあなたの元の save_data などのロジックをすべて「省略せず」記述してください ---

@app.route('/api/health')
def health():
    return jsonify({"status": "ok"})

if __name__ == '__main__':
    app.run(debug=True)
