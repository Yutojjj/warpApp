import { Ionicons } from '@expo/vector-icons';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  InteractionManager,
  Linking,
  PanResponder,
  Platform,
  SafeAreaView,
  ScrollView,
  SectionList,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { DateFilterModal, SortModal } from '../components/DateSortModals';
import PersonCard from '../components/PersonCard';
import PersonDetailModal from '../components/PersonDetailModal';
import SearchFilterDrawer from '../components/SearchFilterDrawer';
import { Person } from '../types';
import { generatePDF } from '../utils/pdfGenerator';

const screenWidth = Dimensions.get('window').width;
const STATUS_BAR_HEIGHT = Platform.OS === 'ios' ? 44 : (StatusBar.currentHeight || 0);
const COLORS = { 
  base: '#0A0A0A', 
  surface: '#1A1A1A',
  accent: '#D4AF37', 
  textSecondary: '#8E8E93', 
  border: '#2C2C2E', 
  staffText: '#38BDF8', 
  castText: '#FB7185', 
  staffBg: '#0F172A', 
  castBg: '#2D0A14', 
  mapPin: '#EA4335', 
  danger: '#EF4444',
  statusYellow: '#F2C94C'
};

const HEADER_COLORS = [
  '#FF3B30', '#FF9500', '#FFCC00', '#4CD964', '#5AC8FA', '#007AFF', '#5856D6', '#FF2D55'
];

type DisplayMode = 'list' | 'large' | 'grid' | 'extraLarge';
type SortType = 'interview_new' | 'interview_old' | 'age_asc' | 'age_desc' | 'default';
type TabType = '面接' | '審査中' | '体験' | '不採用' | '在籍' | '退店';
type TypeFilter = 'すべて' | 'キャスト' | 'スタッフ';

interface Props {
  onBack: () => void;
  menuBg: string;
  swipeAnim?: Animated.Value;
}

interface DateFilter {
  targetField: string | null;
  year: string | null;
  month: string | null;
  week: string | null;
}

interface PersonSection {
  title: string;
  data: any[];
}

export default function AssignmentSearchScreen({ onBack, menuBg, swipeAnim }: Props) {
  const [results, setResults] = useState<Person[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [isModalEditing, setIsModalEditing] = useState(false);
  
  const [isPreviewMode, setIsPreviewMode] = useState(false);

  const [displayMode, setDisplayMode] = useState<DisplayMode>('grid');
  const [searchText, setSearchText] = useState('');
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  
  // ★ 変更点：デフォルトを「新しい順 (interview_new)」に設定
  const [sortType, setSortType] = useState<SortType>('interview_new');
  
  const [dateFilter, setDateFilter] = useState<DateFilter>({ targetField: null, year: null, month: null, week: null });
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [sortVisible, setSortVisible] = useState(false);
  const [dateVisible, setDateVisible] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('面接');
  const [quickTypeFilter, setQuickTypeFilter] = useState<TypeFilter>('すべて');

  const slideAnim = useRef(new Animated.Value(screenWidth)).current;            
  const fadeAnim = useRef(new Animated.Value(0)).current;            
  const screenSlideAnim = useRef(new Animated.Value(0)).current;
  
  // ★ 修正箇所：末尾のスラッシュを削除し、Webでは自分自身のドメインを自動解決させる
  // ★ 146行目付近の handleSearch の中身をこれに差し替え
const res = await fetch(`${SERVER_URL}/search`, { 
  headers: { 'ngrok-skip-browser-warning': 'true' } 
});

  const yearOptions = useMemo(() => {
    const y = new Date().getFullYear();
    return [0, 1, 2, 3, 4, 5].map(i => String(y - i));
  }, []);

  const filteredData = useMemo(() => {
    let items = [...results];
    const isSearchActive = searchText !== '' || selectedTypes.length > 0 || selectedStatuses.length > 0;

    if (quickTypeFilter !== 'すべて') {
      items = items.filter(p => (p as any)["シート区分"] === quickTypeFilter);
    }

    if (activeTab === '審査中') {
      items = items.filter(p => (p as any)["ステータス"] === "審査中");
    } else if (activeTab === '面接') {
      if (!isSearchActive) {
        const today = new Date();
        const lastWeek = new Date();
        lastWeek.setDate(today.getDate() - 7);
        items = items.filter(p => {
          const dateStr = (p as any)["面接日"];
          if (!dateStr) return false;
          const interviewDate = new Date(dateStr.replace(/[/ー]/g, '-'));
          return !isNaN(interviewDate.getTime()) && interviewDate >= lastWeek && interviewDate <= today;
        });
      }
    } else if (activeTab === '体験') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const nextWeek = new Date(today);
      nextWeek.setDate(today.getDate() + 7);
      items = items.filter(p => {
        if ((p as any)["ステータス"] !== "体験中") return false;
        const dateStr = (p as any)["体験日"];
        if (!dateStr) return false;
        const trialDate = new Date(dateStr.replace(/[/ー]/g, '-'));
        return !isNaN(trialDate.getTime()) && trialDate >= today && trialDate <= nextWeek;
      });
    } else if (activeTab === '不採用') {
      items = items.filter(p => (p as any)["ステータス"] === "不採用");
    } else if (activeTab === '在籍') {
      items = items.filter(p => (p as any)["ステータス"] === "在籍中");
    } else if (activeTab === '退店') {
      items = items.filter(p => (p as any)["ステータス"] === "退店済み");
    }

    if (dateFilter.targetField) {
      items = items.filter(p => {
        const val = (p as any)[dateFilter.targetField!] as string;
        if (!val) return false;
        const dateParts = val.split(/[/ー-]/).map(s => s.trim());
        if (dateParts.length < 3) return false;
        const y = dateParts[0];
        const m = parseInt(dateParts[1], 10);
        const d = parseInt(dateParts[2], 10);
        if (dateFilter.year && y !== dateFilter.year) return false;
        if (dateFilter.month && m !== parseInt(dateFilter.month, 10)) return false;
        if (dateFilter.week) {
          const targetWeek = Math.ceil(d / 7);
          if (targetWeek !== parseInt(dateFilter.week, 10)) return false;
        }
        return true;
      });
    }

    // ★ 並び替えロジック（新しい順をベースに）
    if (activeTab === '審査中' || activeTab === '不採用') {
       items.sort((a, b) => {
         const dateA = String((a as any)["面接日"] || "");
         const dateB = String((b as any)["面接日"] || "");
         // デフォルトで新しい順(B-A)
         return sortType === 'interview_old' ? dateA.localeCompare(dateB) : dateB.localeCompare(dateA);
       });
    } else if (activeTab === '在籍') {
      items.sort((a, b) => {
        const dateA = String((a as any)["入店日"] || "");
        const dateB = String((b as any)["入店日"] || "");
        return sortType === 'interview_old' ? dateA.localeCompare(dateB) : dateB.localeCompare(dateA);
      });
    } else if (activeTab === '退店') {
      items.sort((a, b) => {
        const dateA = String((a as any)["退店日"] || "");
        const dateB = String((b as any)["退店日"] || "");
        return sortType === 'interview_old' ? dateA.localeCompare(dateB) : dateB.localeCompare(dateA);
      });
    } else {
      // 面接・体験タブなどのメインソート
      if (sortType === 'interview_old') {
        items.sort((a, b) => String((a as any)["面接日"] || "9999/99/99").localeCompare(String((b as any)["面接日"] || "9999/99/99")));
      } else if (sortType === 'interview_new' || sortType === 'default') {
        // 新しい順（24日が21日より上）
        items.sort((a, b) => String((b as any)["面接日"] || "").localeCompare(String((a as any)["面接日"] || "")));
      } else if (sortType === 'age_asc') {
        items.sort((a, b) => parseInt((a as any)["年齢"] || "999") - parseInt((b as any)["年齢"] || "999"));
      } else if (sortType === 'age_desc') {
        items.sort((a, b) => parseInt((a as any)["年齢"] || "0") - parseInt((a as any)["年齢"] || "0"));
      }
    }
    return items;
  }, [results, sortType, dateFilter, activeTab, searchText, selectedTypes, selectedStatuses, quickTypeFilter]);

  const sections: PersonSection[] = useMemo(() => {
    let target = dateFilter.targetField;
    if (!target) {
      if (activeTab === '不採用' || activeTab === '体験') target = '体験日';
      else if (activeTab === '在籍') target = '入店日';
      else if (activeTab === '退店') target = '退店日';
      else target = '面接日';
    }
    const groups: { [key: string]: Person[] } = {};
    filteredData.forEach(p => {
      const dateVal = (p as any)[target as string] as string || "日付なし";
      if (!groups[dateVal]) groups[dateVal] = [];
      groups[dateVal].push(p);
    });
    
    // 見出しの日付も新しい順（降順）でソート
    const sortedKeys = Object.keys(groups).sort((a, b) => {
      if (sortType === 'interview_old') return a.localeCompare(b);
      // デフォルトまたは interview_new の場合は新しい日付を上に
      return b.localeCompare(a);
    });
    
    if (displayMode === 'grid') return sortedKeys.map(date => ({ title: date, data: [groups[date]] }));
    return sortedKeys.map(date => ({ title: date, data: groups[date] }));
  }, [filteredData, dateFilter, sortType, displayMode, activeTab]);

  const handleBackAnimated = () => {
    Animated.parallel([
      Animated.timing(screenSlideAnim, { toValue: screenWidth, duration: 250, useNativeDriver: true }),
      ...(swipeAnim ? [Animated.timing(swipeAnim, { toValue: 0, duration: 250, useNativeDriver: true })] : [])
    ]).start(() => {
      InteractionManager.runAfterInteractions(() => { onBack(); });
    });
  };

  const toggleDisplayMode = () => {
    if (displayMode === 'grid') setDisplayMode('large');
    else if (displayMode === 'large') setDisplayMode('extraLarge');
    else if (displayMode === 'extraLarge') setDisplayMode('list');
    else setDisplayMode('grid');
  };

  const getModeIcon = () => {
    if (displayMode === 'list') return 'list';
    if (displayMode === 'large') return 'square';
    if (displayMode === 'extraLarge') return 'tablet-landscape';
    return 'grid';
  };

  const getModeLabel = () => {
    if (displayMode === 'grid') return '中';
    if (displayMode === 'large') return '大';
    if (displayMode === 'extraLarge') return '特大';
    return 'リスト';
  };

  const closeDrawer = () => Animated.parallel([
    Animated.timing(slideAnim, { toValue: screenWidth, duration: 250, useNativeDriver: true }),
    Animated.timing(fadeAnim, { toValue: 0, duration: 250, useNativeDriver: true })
  ]).start(() => setDrawerVisible(false));

  const openDrawer = () => {
    setDrawerVisible(true);
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true })
    ]).start();
  };

  const handleSearch = async (isInitial = false) => {
    if (!isInitial) closeDrawer();
    setLoading(true);
    try {
      const res = await fetch(`${SERVER_URL}/search`, { headers: { 'ngrok-skip-browser-warning': 'true' } });
      const json = await res.json();
      if (json.status === 'success') {
        // フェッチ直後も新しい順でセット
        const sortedData = json.data.sort((a: any, b: any) => {
          const dateA = String(a["面接日"] || "");
          const dateB = String(b["面接日"] || "");
          return dateB.localeCompare(dateA); 
        });
        setResults(sortedData);
      }
    } catch (e) {
      if (!isInitial) Alert.alert("エラー", "通信失敗。");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { handleSearch(true); }, []);

  const handlePDF = async (p: Person) => { await generatePDF(p); };

  const handleTakePhoto = async (person: Person, field: string = "顔写真") => { 
    if (!person) return;
    
    try {
      const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
      const { status: mediaStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (cameraStatus !== 'granted' || mediaStatus !== 'granted') {
        Alert.alert("エラー", "カメラの使用許可が必要です");
        return;
      }

      const isIdPhoto = field.includes("証明書");
      const result = await ImagePicker.launchCameraAsync({ 
        mediaTypes: ImagePicker.MediaTypeOptions.Images, 
        allowsEditing: true, 
        aspect: isIdPhoto ? [16, 10] : [4, 5], 
        quality: 0.8 
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setLoading(true); 
        
        const localUri = result.assets[0].uri; 
        const formData = new FormData();
        formData.append('file', { uri: localUri, name: `${field}.jpg`, type: 'image/jpeg' } as any);
        formData.append('name', (person as any)["お名前"]);
        formData.append('sheet_type', (person as any)["シート区分"]);
        formData.append('field', field); 

        const uploadRes = await fetch(`${SERVER_URL}/upload_image`, { 
          method: 'POST', 
          headers: { 'ngrok-skip-browser-warning': 'true' }, 
          body: formData 
        });
        const uploadJson = await uploadRes.json();

        if (uploadJson.status === 'success') {
          const updatedPerson = { ...person, [field]: uploadJson.image_path };

          const saveRes = await fetch(`${SERVER_URL}/update_data`, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'ngrok-skip-browser-warning': 'true'
            },
            body: JSON.stringify(updatedPerson),
          });
          const saveJson = await saveRes.json();

          if (saveJson.status === 'success') {
            setResults(prev => prev.map(r => 
              (r as any)["お名前"] === (person as any)["お名前"] && 
              (r as any)["シート区分"] === (person as any)["シート区分"] 
              ? updatedPerson : r
            ));
            setSelectedPerson(updatedPerson);
            
            Alert.alert("完了", `${field}を撮影・保存しました`);
          }
        }
      }
    } catch (e) { 
      console.error(e); 
      Alert.alert("エラー", "保存に失敗しました。ネットワークを確認してください。");
    } finally { 
      setLoading(false);
    }
  };

  const handleDelete = (p: Person) => {
    Alert.alert("確認", "削除しますか？", [
      { text: "キャンセル", style: "cancel" },
      { text: "削除", style: "destructive", onPress: async () => {
          try {
            const res = await fetch(`${SERVER_URL}/delete_data`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' }, body: JSON.stringify({ "お名前": (p as any)["お名前"], "シート区分": (p as any)["シート区分"] }) });
            const json = await res.json();
            if (json.status === 'success') setResults(prev => prev.filter(item => (item as any)["お名前"] !== (p as any)["お名前"]));
          } catch (e) { console.error(e); }
      }}
    ]);
  };

  const drawerPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gs) => Math.abs(gs.dx) > 5,
      onPanResponderMove: (_, gs) => { if (gs.dx > 0) slideAnim.setValue(gs.dx); },
      onPanResponderRelease: (_, gs) => { if (gs.dx > screenWidth * 0.2) closeDrawer(); else Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true }).start(); },
    })
  ).current;

  const handleOpenModal = (person: Person, shouldEdit: boolean) => {
    setIsModalEditing(shouldEdit);
    setSelectedPerson(person);
  };

  const toggleQuickFilter = () => {
    if (quickTypeFilter === 'すべて') setQuickTypeFilter('キャスト');
    else if (quickTypeFilter === 'キャスト') setQuickTypeFilter('スタッフ');
    else setQuickTypeFilter('すべて');
  };

  const getQuickFilterIcon = () => {
    if (quickTypeFilter === 'キャスト') return 'woman';
    if (quickTypeFilter === 'スタッフ') return 'man';
    return 'people';
  };

  const getQuickFilterColor = () => {
    if (quickTypeFilter === 'キャスト') return COLORS.castText;
    if (quickTypeFilter === 'スタッフ') return COLORS.staffText;
    return COLORS.accent;
  };

  const handlePreviewInternal = async (p: Person) => {
    setLoading(true);
    let personToPass = { ...p }; 
    try {
      const photoData = (p as any)["顔写真"] || (p as any)["写真"] || (p as any)["画像"];
      if (photoData && typeof photoData === 'string') {
        const fullUrl = (photoData.startsWith('file://') || photoData.startsWith('http'))
          ? photoData
          : `${SERVER_URL}/get_image?image_path=${encodeURIComponent(photoData)}`;
        
        const result = await ImageManipulator.manipulateAsync(
          fullUrl,
          [{ resize: { width: 300 } }],
          { base64: true, format: ImageManipulator.SaveFormat.JPEG }
        );
        
        (personToPass as any).previewImageBase64 = `data:image/jpeg;base64,${result.base64}`;
      }
    } catch (e) {
      console.log("Preview prep error:", e);
    } finally {
      setLoading(false);
      setIsPreviewMode(true);
      setSelectedPerson(personToPass); 
    }
  };

  return (
    <View style={[styles.backgroundRoot, { backgroundColor: menuBg }]}>
      <Animated.View 
        style={[
            styles.container, 
            { transform: [{ translateX: screenSlideAnim }] },
            { shadowOpacity: screenSlideAnim.interpolate({ inputRange: [0, 100], outputRange: [0, 0.4], extrapolate: 'clamp' }) }
        ]}
      >
        <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
        <View style={styles.statusBarPadding} />
        
        <SafeAreaView style={styles.headerBorder}>
          <View style={styles.header}>
            <TouchableOpacity style={styles.headerBackBtn} onPress={handleBackAnimated}>
              <Ionicons name="chevron-back" size={28} color={COLORS.accent} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>配属管理</Text>
            <TouchableOpacity onPress={openDrawer} style={styles.filterBtn}>
              <Ionicons name="filter-circle" size={38} color={COLORS.accent} />
            </TouchableOpacity>
          </View>
        </SafeAreaView>

        <View style={styles.actionBar}>
          <View style={styles.leftInfoGroup}><Text style={styles.resultCountText}>{filteredData.length} 件の結果</Text></View>
          <View style={styles.rightGroup}>
            <TouchableOpacity style={[styles.iconBtn, dateFilter.targetField && {borderColor: COLORS.accent}]} onPress={() => setDateVisible(true)}>
              <Ionicons name="calendar" size={18} color={dateFilter.targetField ? COLORS.accent : COLORS.textSecondary} />
              <Text style={[styles.btnLabel, dateFilter.targetField && {color: COLORS.accent}]}>日付</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconBtn} onPress={() => setSortVisible(true)}>
              <Ionicons name="swap-vertical" size={20} color={COLORS.textSecondary} /><Text style={styles.btnLabel}>順序</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.iconBtn, {borderColor: COLORS.accent}]} onPress={toggleDisplayMode}>
              <Ionicons name={getModeIcon() as any} size={20} color={COLORS.accent} />
              <Text style={[styles.btnLabel, {color: COLORS.accent}]}>{getModeLabel()}</Text>
            </TouchableOpacity>
            <TouchableOpacity 
                style={[styles.iconBtn, {borderColor: getQuickFilterColor(), minWidth: 60}]} 
                onPress={toggleQuickFilter}
            >
              <Ionicons name={getQuickFilterIcon() as any} size={20} color={getQuickFilterColor()} />
              <Text style={[styles.btnLabel, {color: getQuickFilterColor()}]}>{quickTypeFilter}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <SectionList
          sections={sections}
          stickySectionHeadersEnabled={true}
          keyExtractor={(item, index) => {
            if (displayMode === 'grid') return `grid-group-${index}`;
            return `${(item as Person)["お名前"]}-${index}`;
          }}
          contentContainerStyle={{ paddingBottom: 150 }}
          renderSectionHeader={({ section: { title } }) => (
            <View style={styles.stickyHeaderContainer}>
              <View style={styles.fancyDateHeader}>
                <View style={styles.fancyDateLine} />
                <View style={[styles.fancyDateCapsule, { borderColor: COLORS.accent }]}>
                  <Text style={styles.fancyDateText}>{title}</Text>
                </View>
                <View style={styles.fancyDateLine} />
              </View>
            </View>
          )}
          renderItem={({ item }) => {
            if (displayMode === 'grid') {
              const personList = item as Person[];
              return (
                <View style={styles.gridWrapper}>
                  {personList.map((p, i) => (
                    <PersonCard 
                      key={`${(p as any)["お名前"]}-grid-${i}`}
                      person={p} displayMode="grid" colors={COLORS} serverUrl={SERVER_URL} 
                      onPress={(shouldEdit) => {
                        setIsPreviewMode(false);
                        handleOpenModal(p, !!shouldEdit);
                      }} 
                      onPreview={() => handlePreviewInternal(p)}
                      onCall={(num) => num ? Linking.openURL(`tel:${num}`) : null}
                      onSMS={(num) => num ? Linking.openURL(`sms:${num}`) : null}
                      onMap={(addr) => addr ? Linking.openURL(Platform.select({ios:`maps://app?q=${addr}`,android:`geo:0,0?q=${addr}`}) as string) : null}
                      onPDF={handlePDF} onDelete={handleDelete}
                    />
                  ))}
                </View>
              );
            }
            const singlePerson = item as Person;
            return (
              <View style={{ paddingHorizontal: 16 }}>
                <PersonCard 
                  person={singlePerson} displayMode={displayMode} colors={COLORS} serverUrl={SERVER_URL} 
                  onPress={(shouldEdit) => {
                    setIsPreviewMode(false);
                    handleOpenModal(singlePerson, !!shouldEdit);
                  }} 
                  onPreview={() => handlePreviewInternal(singlePerson)}
                  onCall={(num) => num ? Linking.openURL(`tel:${num}`) : null}
                  onSMS={(num) => num ? Linking.openURL(`sms:${num}`) : null}
                  onMap={(addr) => addr ? Linking.openURL(Platform.select({ios:`maps://app?q=${addr}`,android:`geo:0,0?q=${addr}`}) as string) : null}
                  onPDF={handlePDF} onDelete={handleDelete}
                />
              </View>
            );
          }}
          ListEmptyComponent={
            loading ? (
              <View style={styles.loadingPlaceholder}>
                <ActivityIndicator size="large" color={COLORS.accent} />
                <Text style={styles.resultPlaceholderText}>データを読み込み中...</Text>
              </View>
            ) : (
              <TouchableOpacity onPress={openDrawer} activeOpacity={0.7} style={styles.placeholderButton}>
                <Ionicons name="search-outline" size={48} color={COLORS.border} />
                <Text style={styles.resultPlaceholderText}>データがありません</Text>
              </TouchableOpacity>
            )
          }
          ListHeaderComponent={
            dateFilter.targetField ? (
              <View style={{ paddingHorizontal: 16, marginBottom: 10 }}>
                <View style={styles.filterBar}>
                  <Text style={styles.filterBarText}>{dateFilter.targetField}: {dateFilter.year}年 {dateFilter.month ? `${dateFilter.month}月` : ''}</Text>
                  <TouchableOpacity onPress={() => setDateFilter({ targetField: null, year: null, month: null, week: null })}><Ionicons name="close-circle" size={20} color={COLORS.textSecondary} /></TouchableOpacity>
                </View>
              </View>
            ) : null
          }
        />

        <View style={styles.bottomTabBarWrapper}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.bottomTabBarInner}>
            {(['面接', '審査中', '体験', '不採用', '在籍', '退店'] as TabType[]).map((tab) => (
              <TouchableOpacity key={tab} style={[styles.tabBtn, activeTab === tab && styles.tabBtnActive]} onPress={() => setActiveTab(tab)}>
                <Text style={[styles.tabBtnText, activeTab === tab && styles.tabBtnTextActive]}>{tab}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <SearchFilterDrawer visible={drawerVisible} onClose={closeDrawer} fadeAnim={fadeAnim} slideAnim={slideAnim} panHandlers={drawerPanResponder.panHandlers} searchText={searchText} setSearchText={setSearchText} selectedTypes={selectedTypes} setSelectedTypes={setSelectedTypes} selectedStatuses={selectedStatuses} setSelectedStatuses={setSelectedStatuses} handleSearch={() => handleSearch(false)} loading={loading} />
        <SortModal visible={sortVisible} onClose={() => setSortVisible(false)} sortType={sortType} setSortType={setSortType} />
        <DateFilterModal visible={dateVisible} onClose={() => setDateVisible(false)} filter={dateFilter} setFilter={setDateFilter} yearOptions={yearOptions} />
        
        <PersonDetailModal 
          visible={!!selectedPerson} 
          person={selectedPerson} 
          initialEditState={isModalEditing} 
          initialPreviewState={isPreviewMode} 
          onClose={() => { 
            setSelectedPerson(null);
            setIsModalEditing(false); 
            setIsPreviewMode(false); 
          }} 
          onTakePhoto={handleTakePhoto} 
          onUpdate={u => { 
            if (!u) setResults(results.filter(r => (r as any)["お名前"] !== (selectedPerson as any)!["お名前"]));
            else setResults(results.map(r => (r as any)["お名前"] === (u as any)["お名前"] ? u : r)); 
            setSelectedPerson(u);
          }} 
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  backgroundRoot: { flex: 1 },
  container: { flex: 1, backgroundColor: '#0A0A0A' },
  statusBarPadding: { height: STATUS_BAR_HEIGHT },
  headerBorder: { borderBottomWidth: 1, borderBottomColor: '#1A1A1A' },
  header: { height: 60, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 15 },
  headerBackBtn: { position: 'absolute', left: 10, padding: 10 },
  headerTitle: { fontSize: 20, fontWeight: '900', color: '#D4AF37', letterSpacing: 4 },
  filterBtn: { position: 'absolute', right: 10, padding: 5 },
  actionBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, marginTop: 15, marginBottom: 5 },
  leftInfoGroup: { flex: 1 },
  resultCountText: { color: '#8E8E93', fontSize: 13, fontWeight: '600' },
  rightGroup: { flexDirection: 'row', alignItems: 'center' },
  iconBtn: { flexDirection: 'row', alignItems: 'center', padding: 8, paddingHorizontal: 12, borderRadius: 15, borderWidth: 1, borderColor: '#1A1A1A', backgroundColor: '#111', marginLeft: 6 },
  btnLabel: { color: '#8E8E93', fontSize: 11, fontWeight: 'bold', marginLeft: 4 },
  filterBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(212, 175, 55, 0.05)', padding: 10, paddingHorizontal: 15, borderRadius: 12, justifyContent: 'space-between', borderWidth: 1, borderColor: 'rgba(212, 175, 55, 0.2)' },
  filterBarText: { color: '#D4AF37', fontSize: 12, fontWeight: 'bold' },
  stickyHeaderContainer: { backgroundColor: 'rgba(10, 10, 10, 0.9)', paddingVertical: 12, width: '100%' },
  fancyDateHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16 },
  fancyDateLine: { flex: 1, height: 1, backgroundColor: '#1A1A1A' },
  fancyDateCapsule: { backgroundColor: '#161616', paddingVertical: 6, paddingHorizontal: 24, borderRadius: 20, borderWidth: 1, marginHorizontal: 12 },
  fancyDateText: { color: '#E5E5EA', fontSize: 14, fontWeight: '900', textAlign: 'center', letterSpacing: 2 },
  gridWrapper: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, justifyContent: 'flex-start' },
  loadingWrapper: { paddingVertical: 120, alignItems: 'center' },
  loadingPlaceholder: { paddingVertical: 100, alignItems: 'center', justifyContent: 'center' },
  placeholderButton: { paddingVertical: 100, marginHorizontal: 16, alignItems: 'center', justifyContent: 'center', borderStyle: 'dashed', borderWidth: 1, borderColor: '#2C2C2E', borderRadius: 30, backgroundColor: 'rgba(26,26,26,0.4)', marginTop: 20 },
  resultPlaceholderText: { color: '#8E8E93', fontSize: 13, marginTop: 15, fontWeight: '600' },
  bottomTabBarWrapper: { backgroundColor: '#111', borderTopWidth: 1, borderTopColor: '#2C2C2E', paddingBottom: Platform.OS === 'ios' ? 25 : 35, position: 'absolute', bottom: 0, width: '100%', zIndex: 100 },
  bottomTabBarInner: { flexDirection: 'row', paddingVertical: 12, paddingHorizontal: 10, alignItems: 'center', minWidth: '100%', justifyContent: 'space-around' },
  tabBtn: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, marginHorizontal: 4 },
  tabBtnActive: { backgroundColor: COLORS.accent },
  tabBtnText: { color: COLORS.textSecondary, fontSize: 13, fontWeight: 'bold' },
  tabBtnTextActive: { color: '#0A0A0A' },
});
