import os
import json
import gspread
import traceback
from datetime import datetime
from fastapi import FastAPI, HTTPException, UploadFile, File, Form, Request
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from google.oauth2.service_account import Credentials

app = FastAPI()

# CORS設定：Webブラウザからのアクセスを許可
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# フォルダ設定
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
# Vercelでは一時フォルダ /tmp しか書き込み権限がないため、アップロード用には注意が必要
IMAGE_FOLDER_NAME = "Images"
IMAGE_DIR = os.path.join("/tmp", IMAGE_FOLDER_NAME) if os.environ.get('VERCEL') else os.path.join(BASE_DIR, IMAGE_FOLDER_NAME)

if not os.path.exists(IMAGE_DIR):
    os.makedirs(IMAGE_DIR)

def get_spreadsheet():
    scopes = ['https://www.googleapis.com/auth/spreadsheets', 'https://www.googleapis.com/auth/drive']
    # Vercelの環境変数 GOOGLE_CREDENTIALS からJSONを読み込む
    env_creds = os.environ.get('GOOGLE_CREDENTIALS')
    if env_creds:
        creds_info = json.loads(env_creds)
        creds = Credentials.from_service_account_info(creds_info, scopes=scopes)
    else:
        # ローカル開発用
        creds_path = os.path.join(BASE_DIR, 'credentials.json')
        creds = Credentials.from_service_account_file(creds_path, scopes=scopes)
    
    gc = gspread.authorize(creds)
    # あなたのスプレッドシートIDをここに入れてください
    sh = gc.open_by_key("1s...あなたのスプレッドシートID...")
    return sh

@app.get("/api/search")
async def search_data():
    try:
        sh = get_spreadsheet()
        # キャストシート
        ws_cast = sh.worksheet("キャストエントリーシート")
        data_cast = ws_cast.get_all_records()
        for d in data_cast: d["シート区分"] = "キャスト"
        
        # スタッフシート
        ws_staff = sh.worksheet("社員/アルバイト面接書")
        data_staff = ws_staff.get_all_records()
        for d in data_staff: d["シート区分"] = "スタッフ"
        
        return {"status": "success", "data": data_cast + data_staff}
    except Exception as e:
        print(traceback.format_exc())
        return JSONResponse(status_code=500, content={"status": "error", "message": str(e)})

@app.get("/api/get_image")
async def get_image(image_path: str):
    # 画像が絶対パスか相対パスかを確認して返すロジック
    if not image_path:
        raise HTTPException(status_code=404)
    # ここに画像返却ロジックを実装
    return {"message": "Image path received", "path": image_path}

@app.post("/api/update_data")
async def update_data(request: Request):
    try:
        updated_person = await request.json()
        target_name = updated_person.get("お名前")
        sheet_type = updated_person.get("シート区分")
        
        sh = get_spreadsheet()
        sheet_name = "キャストエントリーシート" if sheet_type == "キャスト" else "社員/アルバイト面接書"
        worksheet = sh.worksheet(sheet_name)
        
        headers = worksheet.row_values(1)
        name_col_index = headers.index("お名前") + 1
        name_column_data = worksheet.col_values(name_col_index)
        
        if target_name not in name_column_data:
            raise HTTPException(status_code=404, detail="Person not found")
            
        row_index = name_column_data.index(target_name) + 1
        
        cells_to_update = []
        for key, value in updated_person.items():
            if key in headers and key not in ["お名前", "シート区分"]:
                col_index = headers.index(key) + 1
                cells_to_update.append(gspread.Cell(row_index, col_index, value))
        
        if cells_to_update:
            worksheet.update_cells(cells_to_update)
            
        return {"status": "success"}
    except Exception as e:
        return JSONResponse(status_code=500, content={"status": "error", "message": str(e)})

# Vercel用ハンドラー（Flaskライクな動作が必要な場合のみ）
# app = app
