import os
import gspread
import traceback
import shutil
import json
from datetime import datetime
from fastapi import FastAPI, HTTPException, UploadFile, File, Form, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from google.oauth2.service_account import Credentials
import uvicorn

app = FastAPI()

# CORS設定：Webブラウザからの通信を許可
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Vercel環境では書き込み可能な /tmp を使用（クラッシュ防止）
if os.environ.get('VERCEL'):
    IMAGE_FOLDER_NAME = "社員_アルバイト面接書_Images"
    IMAGE_DIR = os.path.join("/tmp", IMAGE_FOLDER_NAME)
else:
    IMAGE_FOLDER_NAME = "社員_アルバイト面接書_Images"
    IMAGE_DIR = os.path.join(BASE_DIR, IMAGE_FOLDER_NAME)

if not os.path.exists(IMAGE_DIR):
    os.makedirs(IMAGE_DIR)

app.mount(f"/{IMAGE_FOLDER_NAME}", StaticFiles(directory=IMAGE_DIR), name="images")

def get_spreadsheet():
    scopes = ['https://www.googleapis.com/auth/spreadsheets', 'https://www.googleapis.com/auth/drive']
    
    # 認証の切り替え（環境変数 or credentials.json）
    env_creds = os.environ.get('GOOGLE_CREDENTIALS')
    if env_creds:
        creds_info = json.loads(env_creds)
        creds = Credentials.from_service_account_info(creds_info, scopes=scopes)
    else:
        creds_path = os.path.join(BASE_DIR, 'credentials.json')
        creds = Credentials.from_service_account_file(creds_path, scopes=scopes)
        
    gc = gspread.authorize(creds)
    # あなたのスプレッドシートID
    sh = gc.open_by_key("1shN859Q_X48rB51l67e_A_V0B7T9Yp-8XWvP3Z_QvS0")
    return sh

@app.get("/search")
async def search_data():
    try:
        sh = get_spreadsheet()
        ws_cast = sh.worksheet("キャストエントリーシート")
        data_cast = ws_cast.get_all_records()
        for d in data_cast: d["シート区分"] = "キャスト"
        
        ws_staff = sh.worksheet("社員/アルバイト面接書")
        data_staff = ws_staff.get_all_records()
        for d in data_staff: d["シート区分"] = "スタッフ"
        
        return {"status": "success", "data": data_cast + data_staff}
    except Exception as e:
        print(traceback.format_exc())
        return JSONResponse(status_code=500, content={"status": "error", "message": str(e)})

@app.post("/update_data")
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
            return JSONResponse(status_code=404, content={"status": "error", "message": "Person not found"})
            
        row_index = name_column_data.index(target_name) + 1
        
        cells_to_update = []
        for key, value in updated_person.items():
            if key in headers and key != "お名前" and key != "シート区分":
                col_index = headers.index(key) + 1
                cells_to_update.append(gspread.Cell(row_index, col_index, value))
        
        if cells_to_update:
            worksheet.update_cells(cells_to_update)
            
        return {"status": "success"}
    except Exception as e:
        print(traceback.format_exc())
        return JSONResponse(status_code=500, content={"status": "error", "message": str(e)})

@app.post("/delete_data")
async def delete_data(request: Request):
    try:
        data = await request.json()
        target_name = data.get("お名前")
        sheet_type = data.get("シート区分")
        
        sh = get_spreadsheet()
        sheet_name = "キャストエントリーシート" if sheet_type == "キャスト" else "社員/アルバイト面接書"
        worksheet = sh.worksheet(sheet_name)
        
        name_column_data = worksheet.col_values(worksheet.row_values(1).index("お名前") + 1)
        
        if target_name in name_column_data:
            row_index = name_column_data.index(target_name) + 1
            worksheet.delete_rows(row_index)
            return {"status": "success"}
        else:
            return JSONResponse(status_code=404, content={"status": "error", "message": "Person not found"})
    except Exception as e:
        print(traceback.format_exc())
        return JSONResponse(status_code=500, content={"status": "error", "message": str(e)})

@app.get("/")
async def root():
    return {"message": "Warp API is running"}
