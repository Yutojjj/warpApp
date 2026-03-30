import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Person } from '../types';
import EditableRow from './EditableRow';

interface Props {
  editedData: Person;
  isEditing: boolean;
  onChange: (key: string, value: string) => void;
}

const SectionTitle = ({ title }: { title: string }) => (
  <View style={styles.sectionHeader}>
    <Text style={styles.sectionHeaderText}>{title}</Text>
    <View style={styles.sectionHeaderLine} />
  </View>
);

export default function PersonDetailForm({ editedData, isEditing, onChange }: Props) {
  const isCast = editedData["シート区分"] === "キャスト";

  // 項目を簡潔に記述するためのヘルパー関数
  const Row = ({ label, fieldKey, options }: { label: string, fieldKey: string, options?: string[] }) => (
    <EditableRow 
      label={label} 
      fieldKey={fieldKey} 
      value={editedData[fieldKey]} 
      isEditing={isEditing} 
      onChange={onChange} 
      options={options} 
    />
  );

  return (
    <View>
      <SectionTitle title="📋 管理・システム" />
      {Row({ label: "送信日時", fieldKey: "送信日時" })}
      {Row({ label: "ステータス", fieldKey: "ステータス", options: ["審査中", "体験中", "在籍中", "退店済み", "不採用"] })}
      {isCast && Row({ label: "面接者", fieldKey: "面接者" })}
      {isCast && Row({ label: "担当名", fieldKey: "担当名" })}
      {Row({ label: "面接日", fieldKey: "面接日" })}
      {Row({ label: "体験日", fieldKey: "体験日" })}
      {Row({ label: "採用日", fieldKey: "採用日" })}
      {Row({ label: "退店日", fieldKey: "退店日" })}
      {Row({ label: "重要事項表示", fieldKey: "重要事項表示" })}
      {Row({ label: "証明書(表)URL", fieldKey: "証明書写真(表)" })}
      {Row({ label: "証明書(裏)URL", fieldKey: "証明書写真(裏)" })}
      {Row({ label: "本人サインURL", fieldKey: "本人サイン" })}
      {Row({ label: "PDF発行", fieldKey: "PDF発行" })}
      {Row({ label: "PDF URL", fieldKey: "PDF" })}

      <SectionTitle title="💰 お金・条件設定" />
      {isCast && Row({ label: "時給", fieldKey: "時給" })}
      {isCast && Row({ label: "税", fieldKey: "税" })}
      {isCast && Row({ label: "厚生費", fieldKey: "厚生費" })}
      {isCast && Row({ label: "保証時給", fieldKey: "保証時給" })}
      {isCast && Row({ label: "保証期間", fieldKey: "保証期間" })}
      {Row({ label: "その他金額", fieldKey: "その他金額" })}
      {Row({ label: "特殊条件", fieldKey: "特殊条件" })}

      <SectionTitle title="👤 基本プロフィール" />
      {Row({ label: "お名前", fieldKey: "お名前" })}
      {isCast && Row({ label: "源氏名", fieldKey: "源氏名" })}
      {Row({ label: "かな", fieldKey: "かな" })}
      {isCast && Row({ label: "スぺ値", fieldKey: "スぺ値" })}
      {!isCast && Row({ label: "性別", fieldKey: "性別", options: ["男性", "女性", "その他"] })}
      {Row({ label: "生年月日", fieldKey: "生年月日" })}
      {Row({ label: "生年月日(年)", fieldKey: "生年月日(年)" })}
      {Row({ label: "生年月日(月)", fieldKey: "生年月日(月)" })}
      {Row({ label: "生年月日(日)", fieldKey: "生年月日(日)" })}
      {Row({ label: "年齢", fieldKey: "年齢" })}
      {isCast && Row({ label: "年齢(正誤)", fieldKey: "年齢(正誤)" })}
      {Row({ label: "干支", fieldKey: "干支" })}
      {isCast && Row({ label: "干支(正誤)", fieldKey: "干支(正誤)" })}
      {Row({ label: "血液型", fieldKey: "血液型" })}
      {Row({ label: "身長", fieldKey: "身長" })}
      {Row({ label: "体重", fieldKey: "体重" })}

      {isCast && (
        <>
          <SectionTitle title="✨ ビジュアル・パーソナル (キャスト)" />
          {Row({ label: "カップ", fieldKey: "カップ" })}
          {Row({ label: "B", fieldKey: "B" })}
          {Row({ label: "W", fieldKey: "W" })}
          {Row({ label: "H", fieldKey: "H" })}
          {Row({ label: "お酒", fieldKey: "お酒", options: ["飲める", "飲めない"] })}
          {Row({ label: "売上目標", fieldKey: "売上目標" })}
          {Row({ label: "体験時レンタル", fieldKey: "体験時レンタル" })}
          {Row({ label: "撮影/掲載", fieldKey: "撮影/掲載" })}
          {Row({ label: "掲載媒体", fieldKey: "掲載媒体" })}
          {Row({ label: "バースデー", fieldKey: "バースデー" })}
          {Row({ label: "同伴・アフター", fieldKey: "同伴・アフター" })}
          {Row({ label: "同伴不可の理由", fieldKey: "理由(同伴不可)" })}
          {Row({ label: "借金", fieldKey: "借金" })}
          {Row({ label: "借金(詳細)", fieldKey: "借金(詳細)" })}
          {Row({ label: "持病", fieldKey: "持病" })}
          {Row({ label: "持病(詳細)", fieldKey: "持病(詳細)" })}
          {Row({ label: "タトゥー", fieldKey: "タトゥー" })}
        </>
      )}

      <SectionTitle title="📱 連絡先・住所" />
      {Row({ label: "携帯番号", fieldKey: "携帯番号" })}
      {Row({ label: "現住所", fieldKey: "現住所" })}
      {Row({ label: "本籍地(選択)", fieldKey: "本籍地(選択)" })}
      {Row({ label: "本籍地(詳細)", fieldKey: "本籍地(詳細)" })}
      {Row({ label: "お住まい", fieldKey: "お住まい" })}
      {Row({ label: "お住まい(詳細)", fieldKey: "お住まい(詳細)" })}

      <SectionTitle title="🚗 送り・交通" />
      {isCast ? (
        <>
          {Row({ label: "交通手段", fieldKey: "交通手段" })}
          {Row({ label: "交通手段(詳細)", fieldKey: "交通手段(詳細)" })}
          {Row({ label: "送り先表示", fieldKey: "送り先表示" })}
          {Row({ label: "体験時エリア", fieldKey: "送り先エリア(体験時・選択)" })}
          {Row({ label: "体験時エリア詳細", fieldKey: "送り先エリア(体験時・詳細)" })}
          {Row({ label: "入店後エリア", fieldKey: "送り先エリア(入店後・選択)" })}
          {Row({ label: "入店後エリア詳細", fieldKey: "送り先エリア(入店後・詳細)" })}
        </>
      ) : (
        <>
          {Row({ label: "送りの有無", fieldKey: "送りの有無", options: ["あり", "なし"] })}
          {Row({ label: "送りの場所", fieldKey: "送りの場所" })}
          {Row({ label: "送り先住所の詳細", fieldKey: "送り先住所の詳細" })}
        </>
      )}

      <SectionTitle title="💼 昼職・学歴・スキル" />
      {Row({ label: "現在の職業", fieldKey: isCast ? "現在の職業[昼職]" : "現在の職業(昼)" })}
      {!isCast && Row({ label: "稼働状況", fieldKey: "現職業の稼働状況" })}
      {Row({ label: "会社名/店名", fieldKey: "現在の会社名/店名" })}
      {Row({ label: "業種", fieldKey: "業種" })}
      {Row({ label: "給与", fieldKey: isCast ? "月収/給与" : "現在の給与" })}
      {Row({ label: "在籍期間", fieldKey: "在籍期間" })}
      {!isCast && Row({ label: "最終学歴", fieldKey: "学校名・学年/最終学歴" })}
      {Row({ label: "語学", fieldKey: "語学" })}
      {Row({ label: "語学(詳細)", fieldKey: "語学(詳細)" })}
      {isCast && Row({ label: "趣味", fieldKey: "趣味" })}
      {isCast && Row({ label: "特技", fieldKey: "特技" })}
      {Row({ label: "資格", fieldKey: isCast ? "保有資格" : "資格" })}

      <SectionTitle title="📝 応募・勤務希望" />
      {Row({ label: "応募方法", fieldKey: "応募方法" })}
      {Row({ label: "応募方法(詳細)", fieldKey: "応募方法(詳細)" })}
      {Row({ label: "紹介者名", fieldKey: "紹介者名" })}
      {isCast ? (
        <>
          {Row({ label: "志望動機", fieldKey: "志望動機(選択)" })}
          {Row({ label: "志望動機(詳細)", fieldKey: "志望動機(詳細理由)" })}
          {Row({ label: "お探しの条件", fieldKey: "お探しの条件" })}
          {Row({ label: "希望時給", fieldKey: "希望時給" })}
          {Row({ label: "体験時時間", fieldKey: "体験時時間(選択)" })}
          {Row({ label: "体験時時間(詳細)", fieldKey: "体験時時間(詳細)" })}
          {Row({ label: "入店後時間", fieldKey: "入店後時間(選択)" })}
          {Row({ label: "入店後時間(詳細)", fieldKey: "入店後時間(詳細)" })}
        </>
      ) : (
        <>
          {Row({ label: "雇用形態", fieldKey: "雇用形態" })}
          {Row({ label: "志望動機", fieldKey: "志望動機" })}
          {Row({ label: "勤務時間", fieldKey: "勤務時間(選択)" })}
          {Row({ label: "具体的な時間", fieldKey: "具体的な勤務時間(その他)" })}
        </>
      )}
      {Row({ label: "週何回入れるか", fieldKey: "週何回入れますか" })}
      {Row({ label: "何曜日入れるか", fieldKey: "何曜日入れますか" })}

      <SectionTitle title="🏢 夜職歴" />
      {Row({ label: "夜職経験の有無", fieldKey: isCast ? "水商売の経験" : "夜職の経験" })}
      
      {/* キャストは最大5件、スタッフは最大3件 */}
      {[...Array(isCast ? 5 : 3)].map((_, i) => {
        const num = i + 1;
        return (
          <View key={`night-${num}`} style={{ marginBottom: 15 }}>
            <Text style={styles.historySubTitle}>夜職歴 {num}</Text>
            {Row({ label: "店舗名", fieldKey: isCast ? `夜職歴${num}:店舗名` : `夜職歴${num}:店名` })}
            {Row({ label: "時給/給与", fieldKey: isCast ? `夜職歴${num}:時給` : `夜職歴${num}:給与` })}
            {isCast && Row({ label: "月平均売上", fieldKey: `夜職歴${num}:月平均売上` })}
            {Row({ label: "期間", fieldKey: `夜職歴${num}:期間` })}
            {Row({ label: "退職日", fieldKey: `夜職歴${num}:退職日` })}
            {Row({ label: "退職理由", fieldKey: isCast ? `夜職歴${num}:退職理由` : `夜職歴${num}:理由` })}
          </View>
        );
      })}

      {!isCast && (
        <>
          <SectionTitle title="🏢 昼職歴 (スタッフのみ)" />
          {/* スタッフは最大3件 */}
          {[1, 2, 3].map(num => (
            <View key={`day-${num}`} style={{ marginBottom: 15 }}>
              <Text style={styles.historySubTitle}>昼職歴 {num}</Text>
              {Row({ label: "社名", fieldKey: `昼職歴${num}:社名` })}
              {Row({ label: "給与", fieldKey: `昼職歴${num}:給与` })}
              {Row({ label: "期間", fieldKey: `昼職歴${num}:期間` })}
              {Row({ label: "退職日", fieldKey: `昼職歴${num}:退職日` })}
              {Row({ label: "退職理由", fieldKey: `昼職歴${num}:理由` })}
            </View>
          ))}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  sectionHeader: { marginTop: 30, marginBottom: 15, paddingHorizontal: 4 },
  sectionHeaderText: { fontWeight: '900', color: '#D4AF37', fontSize: 13, letterSpacing: 1, marginBottom: 8 },
  sectionHeaderLine: { height: 1, backgroundColor: '#2C2C2E', width: '100%' },
  historySubTitle: { color: '#8E8E93', fontSize: 12, fontWeight: 'bold', marginLeft: 10, marginTop: 10, marginBottom: 5 }
});