import os
import json
from flask import Flask, request, jsonify
from flask_cors import CORS
import gspread
from google.oauth2 import service_account
from datetime import datetime

app = Flask(__name__)
CORS(app)

# スコープの設定
SCOPES = ['https://www.googleapis.com/auth/spreadsheets', 'https://www.googleapis.com/auth/drive']

def get_creds():
    # Vercelの環境変数から取得を試みる
    env_creds = os.environ.get('GOOGLE_CREDENTIALS')
    if env_creds:
        # 本番環境（Vercel）用：環境変数の文字列をJSONとして解析して認証
        info = json.loads(env_creds)
        return service_account.Credentials.from_service_account_info(info, scopes=SCOPES)
    else:
        # 開発環境（ローカルPC）用：既存の credentials.json ファイルを使用
        current_dir = os.path.dirname(__file__)
        creds_path = os.path.join(current_dir, 'credentials.json')
        if os.path.exists(creds_path):
            return service_account.Credentials.from_service_account_file(creds_path, scopes=SCOPES)
        else:
            raise FileNotFoundError(f"Credentials file not found at {creds_path}")

# 認証とクライアントの初期化
try:
    creds = get_creds()
    client = gspread.authorize(creds)
except Exception as e:
    print(f"認証エラーが発生しました: {e}")
    client = None

@app.route('/api/save', methods=['POST'])
def save_data():
    try:
        data = request.json
        if not client:
            return jsonify({"error": "Google Sheets client not initialized"}), 500
            
        # スプレッドシートの取得（お手元のIDに自動で差し変わります）
        # ※client.open_by_keyの引数は実際のシートIDに書き換えてください
        spreadsheet_id = '1uUv6VqY0-pWpGg9-iE6Y9X3W9Y6Y9X3W9Y6Y9X3W9Y' # 例
        sheet = client.open_by_key(spreadsheet_id).sheet1
        
        # データの整形と書き込み（既存のロジック）
        # ここにお手元の main.py にあった具体的な書き込み処理を記述します
        # 例: sheet.append_row([data.get('name'), data.get('date')])
        
        return jsonify({"message": "Data saved successfully"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({"status": "ok", "message": "Backend is running"}), 200

if __name__ == '__main__':
    app.run(debug=True, port=5000)
