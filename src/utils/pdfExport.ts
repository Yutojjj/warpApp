import * as Print from 'expo-print';
import { Alert } from 'react-native';
import { Person } from '../types';

export const previewPersonPDF = async (personData: Person) => {
  try {
    let tableHtml = '';
    const excludeKeys = ["顔写真", "シート区分"]; 
    
    for (const key in personData) {
      if (!excludeKeys.includes(key) && personData[key]) {
        tableHtml += `
          <tr>
            <th style="text-align:left; border:1px solid #cbd5e1; padding:10px; background-color:#f8fafc; width:30%; font-size:12px;">${key}</th>
            <td style="border:1px solid #cbd5e1; padding:10px; font-size:14px;">${personData[key]}</td>
          </tr>
        `;
      }
    }

    const html = `
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
          <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 20px; color: #334155; }
            .header { text-align: center; border-bottom: 2px solid #2c79d0; padding-bottom: 10px; margin-bottom: 20px; }
            h1 { color: #1e293b; margin: 0; font-size: 24px; }
            table { width: 100%; border-collapse: collapse; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>面接書: ${personData["お名前"] || "未設定"}</h1>
          </div>
          <table>
            ${tableHtml}
          </table>
        </body>
      </html>
    `;

    await Print.printAsync({ html });
    
  } catch (error) {
    Alert.alert("エラー", "PDFのプレビューに失敗しました。");
  }
};