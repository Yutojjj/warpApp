import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Image,
  KeyboardAvoidingView,
  Linking,
  Modal,
  PanResponder,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

import { Person } from '../types';
import { generatePDF } from '../utils/pdfGenerator';
import EditableRow from './EditableRow';
// ★ 別ファイルにしたスタイルと色を読み込む
import { COLORS, styles } from './PersonDetailModalStyles';

const AGE_OPTIONS = Array.from({length: 60}, (_, i) => String(18 + i));
const YEAR_OPTIONS = Array.from({length: 60}, (_, i) => String(new Date().getFullYear() - 16 - i));
const MONTH_OPTIONS = Array.from({length: 12}, (_, i) => String(i + 1));
const DAY_OPTIONS = Array.from({length: 31}, (_, i) => String(i + 1));
const ZODIAC_OPTIONS = ["ねずみ", "うし", "とら", "うさぎ", "たつ", "へび", "うま", "ひつじ", "さる", "とり", "いぬ", "いのしし"];
const SAKE_OPTIONS = ["飲める", "少し飲める", "飲めない"];
const EXP_OPTIONS = ["あり", "なし"];
const WEEK_OPTIONS = ["1回", "2回", "3回", "4回", "5回", "6回", "7回"];
const GENDER_OPTIONS = ["女性", "男性", "その他"];
const BLOOD_OPTIONS = ["A", "B", "O", "AB", "不明"];
const STATUS_OPTIONS = ["審査中", "体験中", "在籍中", "退店済み", "不採用"];

interface Props {
  visible: boolean;
  person: Person | null;
  initialEditState?: boolean;
  initialPreviewState?: boolean; 
  onClose: () => void;
  onTakePhoto: (person: Person, field?: string) => void; 
  onUpdate?: (updatedPerson: Person | null) => void;
}

const SectionTitle = ({ title }: { title: string }) => (
  <View style={styles.sectionHeader}>
    <Text style={styles.sectionHeaderText}>{title}</Text>
    <View style={styles.sectionHeaderLine} />
  </View>
);

const CATEGORIES = [
  { id: 'Basic', title: '基本情報', icon: 'person', color: '#8B5CF6', sub: '年齢・体型など' },
  { id: 'Contact', title: '連絡先・SNS', icon: 'chatbubbles', color: '#10B981', sub: '電話・LINEなど' },
  { id: 'Work', title: '職歴・条件', icon: 'briefcase', color: '#F59E0B', sub: '希望条件・経験' },
  { id: 'Others', title: 'その他', icon: 'star', color: '#EC4899', sub: '趣味・特技など' },
];

const getCategoryTitle = (id: string) => {
  return CATEGORIES.find(c => c.id === id)?.title || '詳細';
};

export default function PersonDetailModal({ 
  visible, 
  person, 
  initialEditState = false, 
  initialPreviewState = false, 
  onClose, 
  onTakePhoto, 
  onUpdate 
}: Props) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState<Person | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isActionMenuOpen, setIsActionMenuOpen] = useState(false);

  const [isPreviewVisible, setIsPreviewVisible] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const panY = useRef(new Animated.Value(0)).current;

  // ★ 修正箇所：Web版は空文字にして自分自身を参照させる（末尾スラッシュなし）
  const SERVER_URL = Platform.OS === 'web' ? '' : 'https://warp-app-three.vercel.app';

  useEffect(() => {
    if (person && visible) {
      setEditedData({ ...person });
      setIsEditing(initialEditState);
      setIsPreviewVisible(initialPreviewState); 
      setIsActionMenuOpen(false);
      setSelectedCategory(null);
      panY.setValue(0);
    } else {
      setEditedData(null);
      setIsPreviewVisible(false);
    }
  }, [person, visible, initialEditState, initialPreviewState]);

  const handleCall = (phone?: string) => {
    if (!phone) return Alert.alert("エラー", "番号が登録されていません");
    Linking.openURL(`tel:${phone}`);
  };

  const handleSMS = (phone?: string) => {
    if (!phone) return Alert.alert("エラー", "番号が登録されていません");
    Linking.openURL(`sms:${phone}`);
  };

  const handleOpenMap = (address?: string) => {
    if (!address) return Alert.alert("エラー", "住所が登録されていません");
    const encodedAddress = encodeURIComponent(address);
    const url = Platform.select({ ios: `maps://app?q=${encodedAddress}`, android: `geo:0,0?q=${encodedAddress}` });
    if (url) Linking.openURL(url);
  };

  const handleInputChange = useCallback((key: string, value: string) => {
    setEditedData((prev: any) => {
      if (!prev) return null;
      return { ...prev, [key]: value };
    });
  }, []);

  const handleSave = async () => {
    if (!editedData) return;
    setIsSaving(true);
    try {
      // SERVER_URL の後に / を付けて繋ぐ（SERVER_URLが空でも /update_data になる）
      const response = await fetch(`${SERVER_URL}/update_data`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
        body: JSON.stringify(editedData),
      });
      const json = await response.json();
      if (json.status === 'success') {
        Alert.alert('完了', '情報を更新しました');
        setIsEditing(false);
        if (onUpdate) onUpdate(editedData);
      }
    } catch (error) {
      Alert.alert('エラー', '保存に失敗しました');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = () => {
    if (!editedData) return;
    Alert.alert("削除の確認", `${(editedData as any)["お名前"]} さんのデータを完全に削除しますか？`, [
      { text: "キャンセル", style: "cancel" },
      { text: "削除する", style: "destructive", onPress: async () => {
          setIsSaving(true);
          try {
            const response = await fetch(`${SERVER_URL}/delete_data`, {
              method: 'POST',
              headers: { 
                'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
              body: JSON.stringify({ "お名前": (editedData as any)["お名前"], "シート区分": (editedData as any)["シート区分"] }),
            });
            const json = await response.json();
            if (json.status === 'success') {
              Alert.alert('完了', 'データを削除しました');
              onClose();
              if (onUpdate) onUpdate(null);
            }
          } catch (error) { Alert.alert('エラー', '削除に失敗しました'); } finally { setIsSaving(false); }
      }}
    ]);
  };

  const handlePrintPdf = async () => {
    if (!editedData) return;
    try { 
      await generatePDF(editedData); 
      setIsActionMenuOpen(false); 
    } catch (error) { 
      Alert.alert("エラー", "印刷に失敗しました"); 
    }
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gs) => gs.dy > 5,
      onPanResponderMove: (_, gs) => { if (gs.dy > 0) panY.setValue(gs.dy); },
      onPanResponderRelease: (_, gs) => {
        const screenHeight = Platform.OS === 'ios' ? 800 : 900; 
        if (gs.dy > 120 || gs.vy > 0.8) { Animated.timing(panY, { toValue: screenHeight, duration: 250, useNativeDriver: true }).start(() => onClose()); }
        else { Animated.spring(panY, { toValue: 0, friction: 8, useNativeDriver: true }).start(); }
      },
    })
  ).current;

  const getCategoryKeys = (category: string) => {
    if (!editedData) return [];
    const allKeys = Object.keys(editedData).filter(k => 
      !["顔写真", "シート区分", "証明書写真(表)", "証明書写真(裏)", "お名前", "源氏名", "ステータス", "かな", "送信日時", "previewImageBase64"].includes(k)
    );
    
    const basicKeywords = ['年齢', '生年月日', '血液型', '身長', '体重', 'カップ', 'B', 'W', 'H', '現住所', '本籍地', '干支', '趣味', '特技', 'タトゥー', '持病', '資格', 'パートナー', '家族', 'お住まい'];
    const contactKeywords = ['携帯番号', 'LINE', 'Instagram', 'TikTok', 'X', 'Twitter', '緊急連絡先'];
    const workKeywords = ['面接日', '採用日', '退店日', '担当名', '時給', '保証', '売上', '金額', '同伴', 'アフター', '理由', '週何回', '曜日', '時間', '動機', '条件', '交通手段', '職業', '会社名', '店名', '月収', '給与', '在籍', '水商売', '体験', '夜職', '職歴', 'レンタル', '応募方法', '紹介者', '承諾', '撮影/掲載'];
    
    if (category === 'Basic') return allKeys.filter(k => basicKeywords.some(kw => k.includes(kw)));
    if (category === 'Contact') return allKeys.filter(k => contactKeywords.some(kw => k.includes(kw)));
    if (category === 'Work') return allKeys.filter(k => workKeywords.some(kw => k.includes(kw)) && !basicKeywords.some(kw => k.includes(kw)));
    
    return allKeys.filter(k => !basicKeywords.some(kw => k.includes(kw)) && !contactKeywords.some(kw => k.includes(kw)) && !workKeywords.some(kw => k.includes(kw)));
  };

  if (!visible || !editedData) return null;

  const getImageSource = (path?: string) => {
    if (!path) return null;
    if (path.startsWith('data:') || path.startsWith('file://')) return { uri: path };
    if (path.startsWith('http')) return { uri: path, headers: { 'ngrok-skip-browser-warning': 'true' } };
    return { 
      uri: `${SERVER_URL}/get_image?image_path=${encodeURIComponent(path)}`,
      headers: { 'ngrok-skip-browser-warning': 'true' }
    };
  };

  const imageSource = (person as any).previewImageBase64 
    ? { uri: (person as any).previewImageBase64 }
    : getImageSource((editedData as any)["顔写真"]);

  const displaySafeName = editedData ? ((editedData as any)["源氏名"] || (editedData as any)["お名前"] || "未入力") : "未入力";
  const allKeys = Object.keys(editedData);

  const categorizedKeys = new Set([
    "お名前", "源氏名", "かな", "シート区分", "顔写真", "ステータス", "送信日時", "面接日", "体験日", "採用日", "退店日", "担当名",
    "年齢", "生年月日(年)", "生年月日(月)", "生年月日(日)", "干支", "血液型", "身長", "体重", "カップ", "B", "W", "H",
    "携帯番号", "現住所", "LINE ID", "Instagram ID", "緊急連絡先:氏名", "緊急連絡先:続柄(選択)", "previewImageBase64"
  ]);

  const otherKeys = allKeys.filter(k => !categorizedKeys.has(k));

  const getDynamicOptions = (key: string) => {
    if (key === '性別') return GENDER_OPTIONS;
    if (key === 'お酒') return SAKE_OPTIONS;
    if (key === '週何回入れますか') return WEEK_OPTIONS;
    if (key === '水商売の経験' || key.includes('経験')) return EXP_OPTIONS;
    return undefined;
  };

  const getDynamicType = (key: string): 'text' | 'date' => {
    if (key.includes('日') && (key.includes('体験日') || key.includes('退店日') || key.includes('退職日') || key.includes('採用日'))) return 'date';
    return 'text';
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true}>
      <Animated.View style={[{ flex: 1, backgroundColor: COLORS.base }, { transform: [{ translateY: panY }] }]}>
        <SafeAreaView style={styles.modalContainer}>
          <StatusBar barStyle="light-content" />
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
            
            <View style={styles.modalHeader} {...panResponder.panHandlers}>
              <TouchableOpacity onPress={onClose} style={styles.headerSideButton}><Text style={styles.closeButtonText}>閉じる</Text></TouchableOpacity>
              <View style={{ alignItems: 'center', flex: 1 }}>
                <View style={styles.swipeIndicator} />
                <Text style={styles.modalTitle}>詳細プロフィール</Text>
              </View>
              <View style={styles.headerSideButton}>
                {isEditing ? (
                  <TouchableOpacity onPress={handleSave} style={styles.saveButton}>
                    {isSaving ? <ActivityIndicator size="small" color="#000" /> : <Text style={styles.saveButtonText}>保存</Text>}
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity onPress={() => setIsEditing(true)}><Text style={styles.editButtonText}>編集</Text></TouchableOpacity>
                )}
              </View>
            </View>

            <ScrollView style={styles.modalScroll} keyboardShouldPersistTaps="handled">
              <View style={styles.profileHeader}>
                <View style={styles.profileTextContainer}>
                  <Text style={styles.genjiName}>{displaySafeName}</Text>
                  {(editedData as any)["源氏名"] && <Text style={styles.realName}>本名: {(editedData as any)["お名前"]}</Text>}
                  <View style={styles.statusBadge}><Text style={styles.statusBadgeText}>{(editedData as any)["ステータス"] || "未設定"}</Text></View>
                </View>
                <View style={styles.photoFrame}>
                  {imageSource ? (
                    <TouchableOpacity style={{ flex: 1 }} onPress={() => onTakePhoto(editedData!, "顔写真")}>
                      <Image source={imageSource} style={styles.photo} resizeMode="cover" />
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity style={styles.cameraButton} onPress={() => onTakePhoto(editedData!, "顔写真")}>
                      <Ionicons name="camera" size={32} color={COLORS.border} /><Text style={styles.cameraText}>写真を追加</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              <SectionTitle title="🪪 本人確認書類" />
              <View style={{ flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 10 }}>
                {["証明書写真(表)", "証明書写真(裏)"].map((field) => {
                  const idSource = getImageSource((editedData as any)[field]);
                  return (
                    <View key={field} style={{ alignItems: 'center', width: '45%' }}>
                      <Text style={{ color: '#8E8E93', fontSize: 12, marginBottom: 5 }}>{field.includes("(表)") ? "表面" : "裏面"}</Text>
                      <TouchableOpacity 
                        style={{ width: '100%', height: 100, backgroundColor: '#1A1A1A', borderRadius: 10, overflow: 'hidden', borderWidth: 1, borderColor: '#333', justifyContent: 'center', alignItems: 'center' }}
                        onPress={() => onTakePhoto(editedData!, field)}
                      >
                        {idSource ? (
                          <Image source={idSource} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                        ) : (
                          <Ionicons name="card-outline" size={30} color="#333" />
                        )}
                        {isEditing && (
                          <View style={{ position: 'absolute', bottom: 5, right: 5, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 12, padding: 4 }}>
                            <Ionicons name="camera" size={16} color="#FFF" />
                          </View>
                        )}
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </View>

              <SectionTitle title="📋 管理情報・状態" />
              <EditableRow label="ステータス" fieldKey="ステータス" value={(editedData as any)["ステータス"]} isEditing={isEditing} options={STATUS_OPTIONS} onChange={handleInputChange} isDark={true} />
              <EditableRow label="面接日" fieldKey="面接日" value={(editedData as any)["面接日"]} isEditing={isEditing} type="date" onChange={handleInputChange} isDark={true} />
              <EditableRow label="体験日" fieldKey="体験日" value={(editedData as any)["体験日"]} isEditing={isEditing} type="date" onChange={handleInputChange} isDark={true} />
              <EditableRow label="採用日" fieldKey="採用日" value={(editedData as any)["採用日"]} isEditing={isEditing} type="date" onChange={handleInputChange} isDark={true} />
              <EditableRow label="退店日" fieldKey="退店日" value={(editedData as any)["退店日"]} isEditing={isEditing} type="date" onChange={handleInputChange} isDark={true} />
              <EditableRow label="担当名" fieldKey="担当名" value={(editedData as any)["担当名"]} isEditing={isEditing} onChange={handleInputChange} isDark={true} />

              <SectionTitle title="👤 基本情報" />
              <EditableRow label="年齢" fieldKey="年齢" value={(editedData as any)["年齢"]} isEditing={isEditing} options={AGE_OPTIONS} onChange={handleInputChange} isDark={true} />
              <EditableRow label="生年月日(年)" fieldKey="生年月日(年)" value={(editedData as any)["生年月日(年)"]} isEditing={isEditing} options={YEAR_OPTIONS} onChange={handleInputChange} isDark={true} />
              <EditableRow label="生年月日(月)" fieldKey="生年月日(月)" value={(editedData as any)["生年月日(月)"]} isEditing={isEditing} options={MONTH_OPTIONS} onChange={handleInputChange} isDark={true} />
              <EditableRow label="生年月日(日)" fieldKey="生年月日(日)" value={(editedData as any)["生年月日(日)"]} isEditing={isEditing} options={DAY_OPTIONS} onChange={handleInputChange} isDark={true} />
              <EditableRow label="干支" fieldKey="干支" value={(editedData as any)["干支"]} isEditing={isEditing} options={ZODIAC_OPTIONS} onChange={handleInputChange} isDark={true} />
              <EditableRow label="血液型" fieldKey="血液型" value={(editedData as any)["血液型"]} isEditing={isEditing} options={BLOOD_OPTIONS} onChange={handleInputChange} isDark={true} />
              <EditableRow label="身長" fieldKey="身長" value={(editedData as any)["身長"]} isEditing={isEditing} onChange={handleInputChange} isDark={true} />
              <EditableRow label="体重" fieldKey="体重" value={(editedData as any)["体重"]} isEditing={isEditing} onChange={handleInputChange} isDark={true} />
              <EditableRow label="カップ" fieldKey="カップ" value={(editedData as any)["カップ"]} isEditing={isEditing} onChange={handleInputChange} isDark={true} />
              <EditableRow label="B" fieldKey="B" value={(editedData as any)["B"]} isEditing={isEditing} onChange={handleInputChange} isDark={true} />
              <EditableRow label="W" fieldKey="W" value={(editedData as any)["W"]} isEditing={isEditing} onChange={handleInputChange} isDark={true} />
              <EditableRow label="H" fieldKey="H" value={(editedData as any)["H"]} isEditing={isEditing} onChange={handleInputChange} isDark={true} />

              <SectionTitle title="📱 連絡先・住所" />
              <View style={styles.actionRowContainer}>
                <View style={{ flex: 1 }}><EditableRow label="携帯番号" fieldKey="携帯番号" value={(editedData as any)["携帯番号"]} isEditing={isEditing} onChange={handleInputChange} isDark={true} /></View>
                {!isEditing && (editedData as any)["携帯番号"] && (
                  <View style={styles.sideActionGroup}>
                    <TouchableOpacity style={styles.sideActionButton} onPress={() => handleCall((editedData as any)["携帯番号"])}><Ionicons name="call" size={20} color={COLORS.actionBlue} /></TouchableOpacity>
                    <TouchableOpacity style={styles.sideActionButton} onPress={() => handleSMS((editedData as any)["携帯番号"])}><Ionicons name="chatbubble" size={20} color={COLORS.accent} /></TouchableOpacity>
                  </View>
                )}
              </View>
              <EditableRow label="LINE ID" fieldKey="LINE ID" value={(editedData as any)["LINE ID"]} isEditing={isEditing} onChange={handleInputChange} isDark={true} />
              <EditableRow label="Instagram ID" fieldKey="Instagram ID" value={(editedData as any)["Instagram ID"]} isEditing={isEditing} onChange={handleInputChange} isDark={true} />
              <EditableRow label="現住所" fieldKey="現住所" value={(editedData as any)["現住所"]} isEditing={isEditing} onChange={handleInputChange} isDark={true} />
              {!isEditing && (editedData as any)["現住所"] && (
                  <TouchableOpacity style={[styles.sideActionButton, {alignSelf:'flex-start', marginLeft:15}]} onPress={() => handleOpenMap((editedData as any)["現住所"])}><Ionicons name="map" size={20} color={COLORS.success} /></TouchableOpacity>
              )}

              {otherKeys.map(key => (
                <EditableRow 
                  key={key} 
                  label={key} 
                  fieldKey={key} 
                  value={(editedData as any)[key]} 
                  isEditing={isEditing} 
                  type={getDynamicType(key)}
                  options={getDynamicOptions(key)}
                  onChange={handleInputChange} 
                  isDark={true} 
                />
              ))}
              <View style={{ height: 160 }} />
            </ScrollView>

            <View style={styles.fabWrapper}>
              {isActionMenuOpen && (
                <View style={styles.fabMenu}>
                  <TouchableOpacity style={styles.fabMenuItem} onPress={() => { setIsPreviewVisible(true); setIsActionMenuOpen(false); }}>
                    <Ionicons name="document-text" size={20} color={COLORS.actionBlue} />
                    <Text style={styles.fabMenuText}>履歴書プレビュー</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.fabMenuItem} onPress={handlePrintPdf}>
                    <Ionicons name="print" size={20} color={COLORS.accent} />
                    <Text style={styles.fabMenuText}>面接書PDFを作成</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.fabMenuItem, { borderBottomWidth: 0 }]} onPress={() => { setIsActionMenuOpen(false); handleDelete(); }}>
                    <Ionicons name="trash" size={20} color={COLORS.danger} />
                    <Text style={styles.fabMenuText}>削除</Text>
                  </TouchableOpacity>
                </View>
              )}
              <TouchableOpacity style={[styles.fabMainButton, { backgroundColor: isEditing ? COLORS.success : COLORS.actionBlue, marginBottom: 15 }]} onPress={isEditing ? handleSave : () => setIsEditing(true)}>
                <Ionicons name={isEditing ? "checkmark" : "pencil"} size={24} color="#000" />
                <Text style={styles.fabMainText}>{isEditing ? "保存" : "編集"}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.fabMainButton} onPress={() => setIsActionMenuOpen(!isActionMenuOpen)}>
                <Ionicons name={isActionMenuOpen ? "close" : "ellipsis-vertical"} size={24} color="#000" />
                <Text style={styles.fabMainText}>メニュー</Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>

        {isPreviewVisible && (
          <View style={[StyleSheet.absoluteFill, styles.appPreviewBackdrop, { zIndex: 1000 }]}>
            <SafeAreaView style={{ flex: 1 }}>
              <View style={styles.appPreviewHeader}>
                <TouchableOpacity onPress={() => setIsPreviewVisible(false)} style={{ padding: 10 }}>
                  <Ionicons name="chevron-back" size={28} color="#FFF" />
                </TouchableOpacity>
                <Text style={styles.appHeaderTitle}>デジタル履歴書</Text>
                <TouchableOpacity onPress={handlePrintPdf} style={{ padding: 10 }}>
                  <Ionicons name="print" size={24} color={COLORS.accent} />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}>
                <View style={styles.appProfileTop}>
                  <View style={styles.appPhotoRing}>
                    {imageSource ? <Image source={imageSource} style={styles.appPhoto} /> : <Ionicons name="person" size={60} color="#555" />}
                  </View>
                  
                  <Text style={styles.appSubName}>
                    {((editedData as any)["お名前"] && !(editedData as any)["お名前"].startsWith('data:image')) ? (editedData as any)["お名前"] : ''}
                  </Text>

                  <View style={styles.appNameRow}>
                    <Text style={styles.appMainName}>{displaySafeName}</Text>
                    <View style={styles.appStatusBadge}>
                      <Text style={styles.appStatusText}>{(editedData as any)["ステータス"] || '未設定'}</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.appDashRow}>
                  <View style={styles.appBasicCard}>
                    <Text style={styles.appCardTitle}>基本情報</Text>
                    <View style={styles.appBasicIcons}>
                      <View style={styles.appIconStat}><Text style={styles.appIconEmoji}>🎂</Text><Text style={styles.appIconText}>{(editedData as any)["年齢"] || '--'}</Text></View>
                      <View style={styles.appIconStat}><Text style={styles.appIconEmoji}>📏</Text><Text style={styles.appIconText}>{(editedData as any)["身長"] || '--'}cm</Text></View>
                      <View style={styles.appIconStat}><Text style={styles.appIconEmoji}>⚖️</Text><Text style={styles.appIconText}>{(editedData as any)["体重"] || '--'}kg</Text></View>
                    </View>
                  </View>
                  <View style={styles.appContactCard}>
                    <Text style={styles.appCardTitleGold}>連絡先</Text>
                    <View style={styles.appContactIcons}>
                      <TouchableOpacity style={styles.appContactBtn} onPress={() => handleCall((editedData as any)["携帯番号"])}>
                        <Ionicons name="call" size={22} color="#A78BFA" /><Text style={styles.appContactLabel}>電話</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.appContactBtn} onPress={() => handleSMS((editedData as any)["携帯番号"])}>
                        <Ionicons name="chatbubble" size={22} color="#FBBF24" /><Text style={styles.appContactLabel}>SMS</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.appContactBtn} onPress={() => Alert.alert('LINE ID', (editedData as any)["LINE ID"] || '未登録')}>
                        <Ionicons name="chatbubble-ellipses" size={22} color="#22C55E" /><Text style={styles.appContactLabel}>LINE</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>

                <Text style={styles.appSectionLabel}>詳細カテゴリー</Text>
                <View style={styles.categoryGrid}>
                  {CATEGORIES.map(cat => (
                    <TouchableOpacity key={cat.id} style={styles.categoryCard} onPress={() => setSelectedCategory(cat.id)}>
                      <View style={[styles.categoryIconBg, { backgroundColor: cat.color + '33' }]}>
                        <Ionicons name={cat.icon as any} size={24} color={cat.color} />
                      </View>
                      <Text style={styles.categoryTitle}>{cat.title}</Text>
                      <Text style={styles.categorySub}>{cat.sub}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </SafeAreaView>

            {selectedCategory && (
              <View style={styles.detailPopupOverlay}>
                <Animated.View style={styles.detailPopupCard}>
                  <View style={styles.detailPopupHeader}>
                    <Text style={styles.detailPopupTitle}>{getCategoryTitle(selectedCategory)} の詳細</Text>
                    <TouchableOpacity onPress={() => setSelectedCategory(null)}>
                      <Ionicons name="close-circle" size={30} color={COLORS.accent} />
                    </TouchableOpacity>
                  </View>
                  <ScrollView contentContainerStyle={styles.detailPopupContent} showsVerticalScrollIndicator={false}>
                    {getCategoryKeys(selectedCategory).length === 0 ? (
                      <Text style={styles.noDataText}>登録データがありません。</Text>
                    ) : (
                      getCategoryKeys(selectedCategory).map(key => {
                        const val = (editedData as any)[key];
                        
                        if (typeof val === 'string' && val.startsWith('data:image')) return null;

                        const valStr = val ? String(val) : '未入力';
                        const isLong = valStr.length > 15 || key.includes('住所') || key.includes('動機') || key.includes('理由') || key.includes('詳細') || key.includes('経験') || key.includes('交通手段');
                        
                        return (
                          <View key={key} style={[styles.detailPopupRow, isLong ? styles.detailPopupRowFull : styles.detailPopupRowHalf]}>
                            <Text style={styles.detailPopupLabel}>{key}</Text>
                            <Text style={styles.detailPopupValue}>{valStr}</Text>
                          </View>
                        );
                      })
                    )}
                  </ScrollView>
                </Animated.View>
              </View>
            )}
          </View>
        )}
      </Animated.View>
    </Modal>
  );
}
