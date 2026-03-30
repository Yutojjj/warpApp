import os
import json
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
import gspread
from google.oauth2.service_account import Credentials
from typing import List, Dict, Any

app = FastAPI()

# ★ CORS設定（Web版React Nativeからのアクセスを許可）
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- 設定項目 ---
# ブラウザでスプレッドシートを開いた時のURLにある .../d/(ここ)/edit の文字列を入れてください
SPREADSHEET_ID = "1s-MMS9JhIzOie3GfRA_DFkQ-1KphszhB0sQDf47ZG6s"

def get_gspread_client():
    """Vercelの環境変数からGoogle認証を行い、クライアントを返す"""
    creds_json = os.environ.get("GOOGLE_CREDENTIALS")
    if not creds_json:
        raise Exception("Vercelの環境変数 'GOOGLE_CREDENTIALS' が設定されていません。")
    
    # 環境変数の文字列をJSON(辞書)に変換
    info = json.loads(creds_json)
    scopes = [
        "https://www.googleapis.com/auth/spreadsheets",
        "https://www.googleapis.com/auth/drive"
    ]
    creds = Credentials.from_service_account_info(info, scopes=scopes)
    return gspread.authorize(creds)

@app.get("/search")
async def search_data():
    """全データを取得するエンドポイント"""
    try:
        client = get_gspread_client()
        # 「キャスト」という名前のワークシートを開く
        sheet = client.open_by_key(SPREADSHEET_ID).worksheet("キャスト")
        data = sheet.get_all_records()
        return {"status": "success", "data": data}
    except Exception as e:
        print(f"Error in /search: {str(e)}")
        return {"status": "error", "message": str(e)}

@app.post("/update_data")
async def update_data(request: Request):
    """データを更新するエンドポイント"""
    try:
        updated_person = await request.json()
        client = get_gspread_client()
        sheet = client.open_by_key(SPREADSHEET_ID).worksheet("キャスト")
        
        # 「お名前」をキーにして行を特定
        name = updated_person.get("お名前")
        if not name:
            return {"status": "error", "message": "お名前が指定されていません。"}
            
        cell = sheet.find(name)
        if not cell:
            return {"status": "error", "message": f"{name} さんが見つかりません。"}

        # ヘッダー行（1行目）を取得して、どの項目が何列目か特定
        headers = sheet.row_values(1)
        
        # データの更新処理
        update_list = []
        for key, value in updated_person.items():
            if key in headers:
                col_index = headers.index(key) + 1
                sheet.update_cell(cell.row, col_index, value)
        
        return {"status": "success"}
    except Exception as e:
        print(f"Error in /update_data: {str(e)}")
        return {"status": "error", "message": str(e)}

@app.post("/delete_data")
async def delete_data(request: Request):
    """データを削除するエンドポイント"""
    try:
        params = await request.json()
        name = params.get("お名前")
        client = get_gspread_client()
        sheet = client.open_by_key(SPREADSHEET_ID).worksheet("キャスト")
        
        cell = sheet.find(name)
        if cell:
            sheet.delete_rows(cell.row)
            return {"status": "success"}
        return {"status": "error", "message": "見つかりませんでした。"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

# Vercelデプロイ用
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
