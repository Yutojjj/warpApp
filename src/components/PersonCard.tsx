import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
    Dimensions,
    ImageBackground,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { Person } from '../types';

const { width: screenWidth } = Dimensions.get('window');
const GRID_SPACING = 12;
const GRID_WIDTH = (screenWidth - 32 - (GRID_SPACING * 2)) / 3;

interface Props {
    person: Person;
    displayMode: 'list' | 'large' | 'grid' | 'extraLarge';
    onPress: (isEdit?: boolean) => void;
    onPreview?: () => void;
    onCall: (phone?: string) => void;
    onSMS: (phone?: string) => void;
    onMap: (address?: string) => void;
    onPDF: (person: Person) => void;
    onDelete: (person: Person) => void;
    colors: any;
    serverUrl: string;
}

const DEFAULT_AVATAR_URI = 'https://via.placeholder.com/150/1E293B/94A3B8?text=No+Photo';

/**
 * ★ 年の削除ロジック（最終強化版）
 * どんな記号で区切られていても、先頭4文字が数字なら確実に削除します。
 */
const formatShortDate = (dateStr?: string | number, isResignationDate: boolean = false) => {
    if (!dateStr) return '';
    let str = String(dateStr).trim();
    
    // 退店日は年を省略しない
    if (isResignationDate) return str; 

    // 先頭の「4桁の数字」と「その直後の1文字（記号）」を確実に削除
    // 例: "2026/03/24" -> "03/24", "２０２６：０３" -> "０３"
    str = str.replace(/^[0-9０-９]{4}[/.\-／．－年：:\s]?/, '');
    
    // 最後に「日」があれば削除
    str = str.replace(/日$/, '');
    
    return str;
};

export default function PersonCard({
    person,
    displayMode,
    onPress,
    onPreview,
    onCall,
    onSMS,
    onMap,
    onPDF,
    onDelete,
    colors,
    serverUrl
}: Props) {
    const p = person as any;
    let imageUrl = DEFAULT_AVATAR_URI;
    if (p["顔写真"]) {
        const photoPath = String(p["顔写真"]);
        if (photoPath.startsWith('http') || photoPath.startsWith('data:')) {
            imageUrl = photoPath;
        } else if (!photoPath.startsWith('file://')) {
            imageUrl = `${serverUrl}/get_image?image_path=${encodeURIComponent(photoPath)}`;
        }
    }

    const isStaff = p["シート区分"] === 'スタッフ';
    const accentColor = isStaff ? colors.staffText : colors.castText;
    const cardBg = isStaff ? colors.staffBg : colors.castBg;

    const statusChar = p["ステータス"] ? String(p["ステータス"]).charAt(0) : '';

    // --- 日付の構築 ---
    const dateList = [];
    if (p["面接日"]) dateList.push(`面:${formatShortDate(p["面接日"])}`);
    if (p["体験日"]) dateList.push(`体:${formatShortDate(p["体験日"])}`);
    if (p["採用日"]) dateList.push(`採:${formatShortDate(p["採用日"])}`);
    if (p["退店日"]) dateList.push(`退:${formatShortDate(p["退店日"], true)}`);
    const datesStr = dateList.join(' | ');

    if (displayMode === 'grid') {
        return (
            <TouchableOpacity style={[styles.gridCard, { backgroundColor: cardBg }]} onPress={() => onPress(false)}>
                <ImageBackground source={{ uri: imageUrl }} style={styles.avatarGrid}>
                    {statusChar ? (
                        <View style={[styles.gridTopRightBadge, { borderColor: accentColor }]}>
                            <Text style={[styles.gridTopRightText, { color: accentColor }]}>{statusChar}</Text>
                        </View>
                    ) : null}
                </ImageBackground>
                <View style={styles.gridInfo}>
                    <Text style={styles.gridName} numberOfLines={1}>{p["お名前"] || p["源氏名"] || "No Name"}</Text>
                </View>
                {/* ★ グリッド内の文字を大きく太く */}
                {datesStr ? (
                    <Text style={styles.gridDatesText} numberOfLines={2}>{datesStr}</Text>
                ) : null}
            </TouchableOpacity>
        );
    }

    if (displayMode === 'list') {
        return (
            <View style={styles.listCardWrapper}>
                <TouchableOpacity style={styles.listTouchArea} onPress={() => onPress(false)}>
                    <ImageBackground source={{ uri: imageUrl }} style={styles.avatarList} imageStyle={{ borderRadius: 12 }}>
                        {statusChar ? (
                            <View style={[styles.listTopRightBadge, { borderColor: accentColor }]}>
                                <Text style={[styles.listTopRightText, { color: accentColor }]}>{statusChar}</Text>
                            </View>
                        ) : null}
                    </ImageBackground>
                    <View style={styles.infoList}>
                        <View style={styles.listMainRow}>
                            <Text style={styles.listNameText} numberOfLines={1}>{p["お名前"] || p["源氏名"]}</Text>
                            <Text style={[styles.listAgeText, { color: accentColor }]}>{p["年齢"]}歳</Text>
                        </View>
                        {/* ★ リスト内の日付を巨大化 */}
                        <Text style={styles.listDatesText}>{datesStr || '日付未登録'}</Text>
                    </View>
                </TouchableOpacity>
                <View style={styles.listActionArea}>
                    <TouchableOpacity style={styles.listIconSquare} onPress={onPreview}>
                        <Ionicons name="id-card-outline" size={20} color={colors.accent} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.listIconSquare} onPress={() => onCall(p["携帯番号"])}>
                        <Ionicons name="call" size={19} color={colors.staffText} />
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    const isEx = displayMode === 'extraLarge';

    return (
        <TouchableOpacity 
            activeOpacity={0.9}
            style={[
                isEx ? styles.exCardWrapper : styles.largeCardWrapper, 
                { backgroundColor: cardBg }
            ]} 
            onPress={() => onPress(false)}
        >
            <ImageBackground 
                source={{ uri: imageUrl }} 
                style={isEx ? styles.exHeroImage : styles.largeHeroImage} 
                imageStyle={isEx ? undefined : { borderRadius: 24 }}
            >
                {statusChar ? (
                    <View style={[isEx ? styles.exTopRightBadge : styles.largeTopRightBadge, { borderColor: accentColor }]}>
                        <Text style={[isEx ? styles.exTopRightText : styles.largeTopRightText, { color: accentColor }]}>{statusChar}</Text>
                    </View>
                ) : null}

                <View style={isEx ? styles.exOverlayBox : styles.largeOverlayBox}>
                    <View style={styles.overlayInfoContainer}>
                        <View style={styles.overlayTopRow}>
                            <View style={[styles.overlayBadge, { backgroundColor: accentColor }]}>
                                <Text style={styles.overlayBadgeText}>{p["シート区分"]}</Text>
                            </View>
                            <Text style={styles.overlaySubText}>{p["年齢"]}歳</Text>
                        </View>
                        <Text style={styles.overlayNameText} numberOfLines={1}>
                            {p["お名前"] || p["源氏名"]}
                        </Text>
                        {/* ★ オーバーレイ内の日付を最大級に */}
                        {datesStr ? (
                            <Text style={styles.overlayDatesText} numberOfLines={1} adjustsFontSizeToFit>
                                {datesStr}
                            </Text>
                        ) : null}
                    </View>

                    <TouchableOpacity 
                        style={[styles.previewIconButton, { borderColor: colors.accent }]} 
                        onPress={onPreview}
                    >
                        <Ionicons name="id-card" size={isEx ? 32 : 28} color={colors.accent} />
                        <Text style={[styles.previewIconText, { color: colors.accent }]}>履歴書</Text>
                    </TouchableOpacity>
                </View>
            </ImageBackground>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    // --- Grid Mode ---
    gridCard: { width: GRID_WIDTH, marginBottom: GRID_SPACING, borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: '#2C2C2E' },
    avatarGrid: { width: '100%', height: GRID_WIDTH * 1.25, backgroundColor: '#111' },
    gridInfo: { paddingHorizontal: 8, paddingTop: 8, paddingBottom: 4 },
    gridName: { fontSize: 13, fontWeight: 'bold', color: '#FFF' },
    // ★ グリッド内の日付（大きく、色を強調）
    gridDatesText: { fontSize: 11, color: '#D4AF37', paddingHorizontal: 8, paddingBottom: 10, fontWeight: '900', lineHeight: 14 },
    gridTopRightBadge: { position: 'absolute', top: 6, right: 6, width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(0,0,0,0.75)', borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
    gridTopRightText: { fontSize: 14, fontWeight: '900' },

    // --- List Mode ---
    listCardWrapper: { flexDirection: 'row', backgroundColor: '#1A1A1A', marginBottom: 12, borderRadius: 18, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: '#2C2C2E', marginHorizontal: 16 },
    listTouchArea: { flex: 1, flexDirection: 'row', alignItems: 'center' },
    avatarList: { width: 60, height: 60, borderRadius: 14, backgroundColor: '#2C2C2E' },
    listTopRightBadge: { position: 'absolute', top: -8, right: -8, width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(0,0,0,0.85)', borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
    listTopRightText: { fontSize: 16, fontWeight: '900' },
    infoList: { flex: 1, marginLeft: 16 },
    listMainRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4, paddingRight: 10 },
    listNameText: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' },
    listAgeText: { fontSize: 14, marginLeft: 10, fontWeight: '900' },
    // ★ リスト内の日付（サイズ16、太字）
    listDatesText: { color: '#D4AF37', fontSize: 16, fontWeight: '900', marginTop: 4 },
    listActionArea: { flexDirection: 'row', alignItems: 'center', borderLeftWidth: 1, borderLeftColor: '#333', paddingLeft: 10 },
    listIconSquare: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginLeft: 6, backgroundColor: 'rgba(255,255,255,0.06)' },

    // --- Large Mode (大アイコン) ---
    largeCardWrapper: { marginHorizontal: 16, marginBottom: 25, borderRadius: 28, overflow: 'hidden', borderWidth: 1, borderColor: '#2C2C2E' },
    largeHeroImage: { width: '100%', height: 450, backgroundColor: '#111' },
    largeTopRightBadge: { position: 'absolute', top: 20, right: 20, width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(0,0,0,0.7)', borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
    largeTopRightText: { fontSize: 32, fontWeight: '900' },
    largeOverlayBox: {
        position: 'absolute', bottom: 16, left: 16, right: 16,
        backgroundColor: 'rgba(10, 10, 10, 0.8)',
        borderRadius: 24, padding: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.12)'
    },

    // --- Extra Large Mode (特大アイコン) ---
    exCardWrapper: { width: screenWidth, marginBottom: 35, borderBottomWidth: 1, borderColor: '#2C2C2E' },
    exHeroImage: { width: screenWidth, height: screenWidth * 1.5, backgroundColor: '#000' },
    exTopRightBadge: { position: 'absolute', top: 24, right: 24, width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(0,0,0,0.75)', borderWidth: 3, alignItems: 'center', justifyContent: 'center' },
    exTopRightText: { fontSize: 42, fontWeight: '900' },
    exOverlayBox: {
        position: 'absolute', bottom: 30, left: 20, right: 20,
        backgroundColor: 'rgba(10, 10, 10, 0.9)',
        borderRadius: 28, padding: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.18)'
    },

    // --- Overlay Shared ---
    overlayInfoContainer: { flex: 1, marginRight: 20 },
    overlayTopRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
    overlayBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, marginRight: 10 },
    overlayBadgeText: { color: '#000', fontWeight: '900', fontSize: 12 },
    overlaySubText: { color: '#FFF', fontSize: 15, fontWeight: '900' },
    overlayNameText: { color: '#FFF', fontSize: 30, fontWeight: '900', letterSpacing: 1.2 },
    // ★ 写真上の日付（特大サイズ20、極太）
    overlayDatesText: { color: '#D4AF37', fontSize: 20, fontWeight: '900', marginTop: 10, letterSpacing: 0.5 },

    previewIconButton: {
        alignItems: 'center', justifyContent: 'center',
        backgroundColor: 'rgba(212, 175, 55, 0.2)',
        paddingVertical: 14, paddingHorizontal: 20,
        borderRadius: 18, borderWidth: 1.5,
    },
    previewIconText: { fontSize: 12, fontWeight: '900', marginTop: 6 },
});