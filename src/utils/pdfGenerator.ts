import * as ImageManipulator from 'expo-image-manipulator';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Alert } from 'react-native';

export interface Person {
  [key: string]: any;
}

export const generatePDF = async (p: Person) => {
  try {
    const SERVER_URL = 'https://kisha-arthrodial-norene.ngrok-free.dev';
    const isCast = p["シート区分"] === "キャスト";
    
    // カラー設定
    const themeColor = isCast ? "#D81B60" : "#0F284F"; 
    const thBgColor = isCast ? "#FCE4EC" : "#E0F2FE"; 
    const borderColor = isCast ? "#F48FB1" : "#93C5FD"; 
    
    // 空欄対応ヘルパー
    const val = (key: string) => {
      const v = p[key] ?? p[key.trim()] ?? p[key + " "] ?? p[" " + key + " "];
      return (v !== undefined && v !== null && v !== "") ? String(v) : "　";
    };

    // 詳細結合ヘルパー1 (カッコで結合)
    const valWithDetail = (key: string, detailKey: string) => {
      const v1 = val(key);
      const v2 = val(detailKey);
      if (v1 === "　" && v2 === "　") return "　";
      if (v2 === "　") return v1;
      if (v1 === "　") return `(${v2})`;
      return `${v1} (${v2})`;
    };

    // 詳細結合ヘルパー2 (任意の文字で結合 - 職歴用に追加)
    const combine = (key1: string, key2: string, separator: string = " / ") => {
      const v1 = val(key1);
      const v2 = val(key2);
      if (v1 === "　" && v2 === "　") return "　";
      if (v1 === "　") return v2;
      if (v2 === "　") return v1;
      return `${v1}${separator}${v2}`;
    };

    // --- 年齢と干支の整合性チェック ---
    let ageZodiacHtml = `${val("年齢")} 歳 / ${val("干支")}`;
    const inputZodiac = val("干支");
    if (inputZodiac !== "　") {
      const zodiacList = ["ねずみ", "うし", "とら", "うさぎ", "たつ", "へび", "うま", "ひつじ", "さる", "とり", "いぬ", "いのしし"];
      const userZodiacIndex = zodiacList.findIndex(z => inputZodiac.includes(z));
      
      if (userZodiacIndex !== -1) {
        let possibleYears: number[] = [];
        const inputYear = parseInt(val("生年月日(年)"), 10);
        const inputAge = parseInt(val("年齢"), 10);
        const currentYear = new Date().getFullYear();

        if (!isNaN(inputYear)) {
          possibleYears.push(inputYear);
        } else if (!isNaN(inputAge)) {
          possibleYears.push(currentYear - inputAge);
          possibleYears.push(currentYear - inputAge - 1);
        }

        if (possibleYears.length > 0) {
          const isMatch = possibleYears.some(year => {
            const calcIndex = ((year - 4) % 12 + 12) % 12;
            return calcIndex === userZodiacIndex;
          });
          if (!isMatch) {
            ageZodiacHtml = `<span style="color: #E11D48; font-weight: bold;">${val("年齢")} 歳 / ${val("干支")} (※確認)</span>`;
          }
        }
      }
    }

    // --- 身長 - 体重の自動計算 ---
    let memoHtml = val("メモ欄");
    const h = parseFloat(val("身長"));
    const w = parseFloat(val("体重"));
    if (!isNaN(h) && !isNaN(w)) {
      const diff = Math.round((h - w) * 10) / 10;
      const diffBadge = `<span style="color: ${themeColor}; font-weight: bold; background: ${thBgColor}; padding: 2px 5px; border-radius: 3px; border: 0.5px solid ${borderColor}; margin-right: 5px; font-size: 9px;">${diff}</span>`;
      memoHtml = memoHtml === "　" ? diffBadge : diffBadge + memoHtml;
    }

    // --- 顔写真の処理 (iPhone空白対策 ＆ はみ出さないサイズに調整) ---
    let photoData = p["顔写真"] || p["写真"] || p["画像"];
    let photoHtml = '';
    if (photoData && typeof photoData === 'string' && photoData.trim().length > 0) {
      try {
        let fullImageUrl = (photoData.startsWith('file://') || photoData.startsWith('http'))
          ? photoData
          : `${SERVER_URL}/get_image?image_path=${encodeURIComponent(photoData)}`;

        let targetUri = fullImageUrl;

        if (fullImageUrl.startsWith('http')) {
          const response = await fetch(fullImageUrl, { headers: { 'ngrok-skip-browser-warning': 'true' } });
          const blob = await response.blob();
          const fetchedBase64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
          targetUri = fetchedBase64;
        }

        let finalBase64 = "";
        try {
          const manipResult = await ImageManipulator.manipulateAsync(
            targetUri,
            [{ resize: { width: 300 } }],
            { base64: true, format: ImageManipulator.SaveFormat.JPEG, compress: 0.8 }
          );
          finalBase64 = `data:image/jpeg;base64,${manipResult.base64}`;
        } catch (manipError) {
          if (targetUri.startsWith('data:')) {
            finalBase64 = targetUri;
          } else {
            throw manipError;
          }
        }

        // iPhoneではみ出さないよう、高さを105pxに微調整（比率は維持）
        photoHtml = `<img src="${finalBase64}" style="width: 80px; height: 105px; object-fit: cover; border-radius: 4px;" />`;
      } catch (error) {
        console.error("Photo Error:", error);
        photoHtml = `<div style="width: 80px; height: 105px; background-color: #eee; display: flex; align-items: center; justify-content: center; font-size: 11px; color: #999;">画像エラー</div>`;
      }
    } else {
      photoHtml = `<div style="width: 80px; height: 105px; border: 1px dashed ${borderColor}; display: flex; align-items: center; justify-content: center; font-size: 11px; color: #999;">写真貼付欄</div>`;
    }

    // ★ ご指定いただいた見やすいデザインのCSS設定をそのまま使用します
    const styles = `
      @page { size: A4 portrait; margin: 5mm; }
      body { 
        font-family: 'Helvetica', 'Arial', sans-serif; 
        font-size: 11px; color: #111; margin: 0; line-height: 1.3; 
        -webkit-print-color-adjust: exact; 
        print-color-adjust: exact; 
      }
      h1 { text-align: center; font-size: 19px; margin: 3px 0 6px 0; letter-spacing: 4px; color: ${themeColor}; border-bottom: 2px solid ${themeColor}; padding-bottom: 4px; }
      .section-title { font-size: 11.5px; font-weight: bold; color: ${themeColor}; margin: 6px 0 3px 0; padding-left: 6px; border-left: 4px solid ${themeColor}; }
      table { width: 100%; border-collapse: collapse; margin-bottom: 5px; table-layout: fixed; }
      th, td { border: 1px solid ${borderColor}; padding: 4px 5px; vertical-align: middle; word-wrap: break-word; }
      th { background-color: ${thBgColor} !important; font-size: 9.5px; font-weight: bold; color: #333; text-align: left; }
      td { background-color: #FFFFFF !important; font-size: 11px; color: #000; }
      .text-center { text-align: center; }
      .highlight-name { font-size: 14px; font-weight: bold; letter-spacing: 1px; }
    `;

    let htmlContent = '';
    let jobHtml = '';

    if (isCast) {
      // キャスト側のHTMLは一切変更していません
      htmlContent = `
        <h1>キャスト面接書</h1>
        <div class="section-title">■ 管理情報</div>
        <table>
          <tr>
            <th width="12%">面接日</th><td width="21%">${val("面接日")}</td>
            <th width="12%">店名</th><td width="21%">WARP</td>
            <th width="12%">社外部</th><td width="22%">${val("社外部")}</td>
          </tr>
          <tr>
            <th>体験日</th><td>${val("体験日")}</td>
            <th>採用日</th><td>${val("採用日")}</td>
            <th>退店日</th><td>${val("退店日")}</td>
          </tr>
          <tr>
            <th>ステータス</th><td>${val("ステータス")}</td>
            <th>紹介者名</th><td>${val("紹介者名")}</td>
            <th>メモ欄</th><td>${memoHtml}</td>
          </tr>
        </table>
        <div class="section-title">■ 基本プロフィール</div>
        <table>
          <tr>
            <td rowspan="5" style="width: 90px; text-align: center; padding: 4px;">${photoHtml}</td>
            <th width="12%">名前(かな)</th><td colspan="3">${val("かな")}</td>
            <th width="12%">源氏名</th><td>${val("源氏名")}</td>
          </tr>
          <tr>
            <th>本名</th><td colspan="5" class="highlight-name">${val("お名前")}</td>
          </tr>
          <tr>
            <th>生年月日</th><td colspan="3">${val("生年月日(年)")}年 ${val("生年月日(月)")}月 ${val("生年月日(日)")}日</td>
            <th>年齢 / 干支</th><td>${ageZodiacHtml}</td>
          </tr>
          <tr>
            <th>血液型</th><td>${val("血液型")}</td>
            <th>お酒</th><td>${val("お酒")}</td>
            <th>携帯番号</th><td>${val("携帯番号")}</td>
          </tr>
          <tr>
            <th>現住所</th><td colspan="5">${val("現住所")}</td>
          </tr>
          <tr>
            <th>本籍地</th><td colspan="3">${valWithDetail("本籍地(選択)", "本籍地(詳細)")}</td>
            <th>お住まい</th><td colspan="2">${valWithDetail("お住まい", "お住まい(詳細)")}</td>
          </tr>
        </table>
        <div class="section-title">■ 勤務条件・希望</div>
        <table>
          <tr>
            <th width="14%">希望時給</th><td width="19%">${val("希望時給")}</td>
            <th width="14%">保証時給/期間</th><td width="19%">${val("保証時給")} / ${val("保証期間")}</td>
            <th width="14%">売上目標</th><td width="20%">${val("売上目標")}</td>
          </tr>
          <tr>
            <th>週何日 / 曜日</th><td colspan="2">週 ${val("週何回入れますか")}回 (希望: ${val("何曜日入れますか")})</td>
            <th>その他金額</th><td colspan="2">${val("その他金額")}</td>
          </tr>
          <tr>
            <th>あがり(体験時)</th><td>${val("体験時時間(選択)")}</td>
            <th>あがり(入店後)</th><td colspan="3">${valWithDetail("入店後時間(選択)", "入店後時間(詳細)")}</td>
          </tr>
          <tr>
            <th>同伴・アフター</th><td colspan="5">${valWithDetail("同伴・アフター", "理由(同伴不可)")}</td>
          </tr>
          <tr>
            <th>志望動機</th><td colspan="5">${valWithDetail("志望動機(選択)", "志望動機(詳細理由)")}</td>
          </tr>
          <tr>
            <th>お探しの条件</th><td colspan="2">${val("お探しの条件")}</td>
            <th>特殊条件</th><td colspan="2">${val("特殊条件")}</td>
          </tr>
        </table>
        <div class="section-title">■ SNS・パーソナル情報</div>
        <table>
          <tr>
            <th width="14%">Instagram</th><td width="36%">${val("Instagram ID")} (フォロワー: ${val("Instagramフォロワー")})</td>
            <th width="14%">TikTok</th><td width="36%">${val("TikTok ID")} (フォロワー: ${val("TikTokフォロワー")})</td>
          </tr>
          <tr>
            <th>X(Twitter)</th><td>${val("X(Twitter) ID")} (フォロワー: ${val("Xフォロワー")})</td>
            <th>撮影/掲載媒体</th><td>${val("撮影/掲載")} (媒体: ${val("掲載媒体")})</td>
          </tr>
          <tr>
            <th>借金</th><td>${valWithDetail("借金", "借金(詳細)")}</td>
            <th>持病</th><td>${valWithDetail("持病", "持病(詳細)")}</td>
          </tr>
          <tr>
            <th>タトゥー・刺青</th><td>${valWithDetail("タトゥー・刺青", "タトゥー(詳細)")}</td>
            <th>交通手段</th><td>${valWithDetail("交通手段", "交通手段(詳細)")}</td>
          </tr>
          <tr>
            <th>趣味 / 特技</th><td>${combine("趣味", "特技", " / ")}</td>
            <th>資格 / バースデー</th><td>${combine("保有資格", "バースデー", " / ")}</td>
          </tr>
          <tr>
            <th>家族・パートナー</th><td>${valWithDetail("家族構成・パートナー", "お子様の詳細")}</td>
            <th>親・彼氏の承諾</th><td>${val("親・彼氏の承諾")}</td>
          </tr>
          <tr>
            <th>応募方法</th><td colspan="3">${valWithDetail("応募方法", "応募方法(詳細)")}</td>
          </tr>
        </table>
        <div class="section-title">■ 身体サイズ・経験・緊急連絡先</div>
        <table>
          <tr>
            <th width="12%">身長/体重</th><td width="21%">${val("身長")} cm / ${val("体重")} kg</td>
            <th width="12%">スリーサイズ</th><td width="21%">B:${val("B")} / W:${val("W")} / H:${val("H")}</td>
            <th width="12%">カップ数</th><td width="22%">${val("カップ")}</td>
          </tr>
          <tr>
            <th>水商売経験</th><td>${val("水商売の経験")}</td>
            <th>レンタル</th><td>${val("レンタル")}</td>
            <th>語学</th><td>${val("語学")}</td>
          </tr>
          <tr>
            <th>緊急連絡先</th>
            <td colspan="5">
              氏名: ${val("緊急連絡先:氏名")} (${val("緊急連絡先:続柄(選択)")}) 　/　 電話番号: ${val("緊急連絡先:電話番号")}<br>
              住所: ${val("緊急連絡先:住所")}
            </td>
          </tr>
        </table>
      `;

      let castJobRows = '';
      for (let i = 1; i <= 5; i++) {
        castJobRows += `
          <tr>
            <th class="text-center">夜職歴 ${i}</th>
            <td>${val(`夜職歴${i}:店舗名`)}</td>
            <td>${combine(`夜職歴${i}:時給`, `夜職歴${i}:月平均売上`, " / 売上:")}</td>
            <td>${combine(`夜職歴${i}:期間`, `夜職歴${i}:退職日`, " / 退:")}</td>
            <td>${val(`夜職歴${i}:退職理由`)}</td>
          </tr>
        `;
      }

      jobHtml = `
        <div class="section-title">■ 職歴（現在の職業・過去の経歴）</div>
        <table>
          <tr>
            <th width="12%" class="text-center">区分</th>
            <th width="24%" class="text-center">店舗名 / 会社名</th>
            <th width="24%" class="text-center">時給 / 月平均売上</th>
            <th width="20%" class="text-center">期間 / 退職日</th>
            <th width="20%" class="text-center">退職理由</th>
          </tr>
          <tr>
            <th class="text-center">現在の昼職</th>
            <td>${combine("現在の会社名/店名", "現在の職業[昼職]", " ")}</td>
            <td>${val("月収/給与")}</td>
            <td>${val("在籍期間")}</td>
            <td class="text-center">-</td>
          </tr>
          ${castJobRows}
        </table>
      `;

    } else {
      // いただいた全項目を網羅し、同じCSSのまま1枚に美しく収まるよう構造を最適化したスタッフ用HTML
      htmlContent = `
        <h1>アルバイト/社員面接書</h1>
        <div class="section-title">■ 管理情報</div>
        <table>
          <tr>
            <th width="12%">面接日</th><td width="21%">${val("面接日")}</td>
            <th width="12%">店名</th><td width="21%">WARP</td>
            <th width="12%">体験日</th><td width="21%">${val("体験日")}</td>
            <th width="12%">採用日</th><td width="22%">${val("採用日")}</td>
          </tr>
          <tr>
            <th>退店日</th><td>${val("退店日")}</td>
            <th>ステータス</th><td>${val("ステータス")}</td>
            <th>雇用形態</th><td>${val("雇用形態")}</td>
          </tr>
          <tr>
            <th>紹介者名</th><td>${val("紹介者名")}</td>
            <th>メモ欄</th><td colspan="3">${memoHtml}</td>
          </tr>
        </table>

        <div class="section-title">■ 基本プロフィール</div>
        <table>
          <tr>
            <td rowspan="5" style="width: 90px; text-align: center; padding: 4px;">${photoHtml}</td>
            <th width="12%">名前(かな)</th><td colspan="3">${val("かな")}</td>
            <th width="12%">性別</th><td>${val("性別")}</td>
          </tr>
          <tr>
            <th>本名</th><td colspan="5" class="highlight-name">${val("お名前")}</td>
          </tr>
          <tr>
            <th>生年月日</th><td colspan="3">${val("生年月日(年)")}年 ${val("生年月日(月)")}月 ${val("生年月日(日)")}日</td>
            <th>年齢 / 干支</th><td>${ageZodiacHtml}</td>
          </tr>
          <tr>
            <th>血液型</th><td>${val("血液型")}</td>
            <th>身長 / 体重</th><td>${val("身長")} cm / ${val("体重")} kg</td>
            <th>携帯番号</th><td>${val("携帯番号")}</td>
          </tr>
          <tr>
            <th>現住所</th><td colspan="5">${val("現住所")}</td>
          </tr>
          <tr>
            <th>本籍地</th><td colspan="3">${valWithDetail("本籍地(選択)", "本籍地(詳細)")}</td>
            <th>お住まい</th><td colspan="2">${valWithDetail("お住まい", "お住まい(詳細)")}</td>
          </tr>
        </table>

        <div class="section-title">■ 連絡先・SNS・条件</div>
        <table>
          <tr>
            <th width="15%">Mail / PC</th><td width="35%">${combine("メールアドレス", "PCアドレス", " / ")}</td>
            <th width="15%">LINE / Insta</th><td width="35%">${combine("LINE ID", "Instagram ID", " / ")}</td>
          </tr>
          <tr>
            <th>FB / X</th><td>${combine("Facebook ID", "X(Twitter) ID", " / ")}</td>
            <th>勤務希望</th><td>週 ${val("週何回入れますか")}回 (${val("何曜日入れますか")})</td>
          </tr>
          <tr>
            <th>勤務時間</th><td>${valWithDetail("勤務時間(選択)", "具体的な勤務時間(その他)")}</td>
            <th>お探しの条件</th><td>${val("お探しのお店の条件")}</td>
          </tr>
          <tr>
            <th>志望動機</th><td colspan="3">${val("志望動機")}</td>
          </tr>
          <tr>
            <th>送りの有無</th><td>${valWithDetail("送りの有無", "送りの場所")}</td>
            <th>送り先詳細</th><td>${val("送り先住所の詳細")}</td>
          </tr>
          <tr>
            <th>交通手段</th><td>${valWithDetail("交通手段", "交通手段(詳細)")}</td>
            <th>その他条件</th><td>${combine("特殊条件", "その他金額", " / ")}</td>
          </tr>
          <tr>
            <th>応募方法</th><td colspan="3">${valWithDetail("応募方法", "応募方法(詳細)")}</td>
          </tr>
        </table>

        <div class="section-title">■ パーソナル情報・経歴</div>
        <table>
          <tr>
            <th width="15%">現在の職業(昼)</th><td width="35%">${valWithDetail("現在の職業(昼)", "現職業の稼働状況")}</td>
            <th width="15%">会社名/業種</th><td width="35%">${combine("現在の会社名/店名", "業種", " / ")}</td>
          </tr>
          <tr>
            <th>最終学歴</th><td colspan="3">${val("学校名・学年/最終学歴")}</td>
          </tr>
          <tr>
            <th>趣味 / 特技</th><td>${combine("趣味", "特技", " / ")}</td>
            <th>語学 / 資格</th><td>${valWithDetail("語学", "語学(詳細)")} / ${val("保有資格")}</td>
          </tr>
          <tr>
            <th>借金 / 持病</th><td>${valWithDetail("借金", "借金(詳細)")} / ${valWithDetail("持病の有無", "持病(詳細)")}</td>
            <th>タトゥー / 家族</th><td>${valWithDetail("タトゥー", "タトゥー(詳細)")} / ${valWithDetail("家族構成・パートナー", "家族構成詳細")}</td>
          </tr>
          <tr>
            <th>夜職経験</th><td>${val("夜職の経験")}</td>
            <th>緊急連絡先</th>
            <td>
              氏名: ${val("緊急連絡先:氏名")} (${valWithDetail("緊急連絡先:続柄(選択)", "緊急連絡先:続柄(詳細)")})<br>
              電話: ${val("緊急連絡先:電話番号")} / 住所: ${valWithDetail("緊急連絡先:住所(選択)", "緊急連絡先:住所(詳細)")}
            </td>
          </tr>
        </table>
      `;

      let staffDayRows = '';
      for (let i = 1; i <= 3; i++) {
        staffDayRows += `
          <tr>
            <th class="text-center">昼職歴 ${i}</th>
            <td>${val(`昼職歴${i}:社名`)}</td>
            <td>${val(`昼職歴${i}:給与`)}</td>
            <td>${val(`昼職歴${i}:期間`)}</td>
            <td>${val(`昼職歴${i}:退職日`)}</td>
            <td>${val(`昼職歴${i}:理由`)}</td>
          </tr>
        `;
      }
      let staffNightRows = '';
      for (let i = 1; i <= 3; i++) {
        staffNightRows += `
          <tr>
            <th class="text-center">夜職歴 ${i}</th>
            <td>${val(`夜職歴${i}:店名`)}</td>
            <td>${val(`夜職歴${i}:給与`)}</td>
            <td>${val(`夜職歴${i}:期間`)}</td>
            <td>${val(`夜職歴${i}:退職日`)}</td>
            <td>${val(`夜職歴${i}:理由`)}</td>
          </tr>
        `;
      }

      jobHtml = `
        <div class="section-title">■ 職歴</div>
        <table>
          <tr>
            <th width="12%" class="text-center">区分</th>
            <th width="24%" class="text-center">会社名 / 店名</th>
            <th width="14%" class="text-center">給与</th>
            <th width="16%" class="text-center">期間</th>
            <th width="16%" class="text-center">退職日</th>
            <th width="18%" class="text-center">退職理由</th>
          </tr>
          <tr>
            <th class="text-center">現在の職業</th>
            <td>${combine("現在の会社名/店名", "業種", " / ")}</td>
            <td>${val("現在の給与")}</td>
            <td>${val("在籍期間")}</td>
            <td class="text-center">-</td>
            <td class="text-center">-</td>
          </tr>
          ${staffDayRows}
          ${staffNightRows}
        </table>
      `;
    }

    const finalHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>${styles}</style>
        </head>
        <body>
          ${htmlContent}
          ${jobHtml}
          <div style="text-align: right; margin-top: 5px; font-size: 8px; color: #64748B;">
            出力日時: ${new Date().toLocaleString('ja-JP')} / WARP MANAGEMENT
          </div>
        </body>
      </html>
    `;

    // --- 出力部分修正 (iPhoneで確実に表示させるための書き方) ---
    const { uri } = await Print.printToFileAsync({ html: finalHtml });
    await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });

  } catch (e) {
    console.error("PDF Generate Error:", e);
    Alert.alert("エラー", "PDF生成に失敗しました");
  }
};