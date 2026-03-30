import os
import sys
import json
from flask import Flask, request, jsonify
from flask_cors import CORS
import gspread
from google.oauth2 import service_account

# Vercel環境でファイルを正しく読み込むための設定
sys.path.append(os.path.dirname(__file__))

app = Flask(__name__)
CORS(app)

SCOPES = ['https://www.googleapis.com/auth/spreadsheets', 'https://www.googleapis.com/auth/drive']

def get_creds():
    # Vercelの環境変数から取得
    env_creds = os.environ.get('GOOGLE_CREDENTIALS')
    if env_creds:
        try:
            info = json.loads(env_creds)
            return service_account.Credentials.from_service_account_info(info, scopes=SCOPES)
        except Exception as e:
            print(f"JSON Parse Error: {e}")
            return None
    
    # ローカルPC用
    creds_path = os.path.join(os.path.dirname(__file__), 'credentials.json')
    if os.path.exists(creds_path):
        return service_account.Credentials.from_service_account_file(creds_path, scopes=SCOPES)
    return None

try:
    creds = get_creds()
    if creds:
        client = gspread.authorize(creds)
    else:
        client = None
except Exception as e:
    print(f"Auth Error: {e}")
    client = None

@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({"status": "ok", "message": "Backend is running on Vercel"}), 200

# ※ ここにあなたの元の save_data などの関数を「省略せず」続けてください

if __name__ == '__main__':
    app.run(debug=True)
