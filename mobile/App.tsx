import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, ActivityIndicator, Alert, AppState, Linking, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import Constants from 'expo-constants';
import { StatusBar } from 'expo-status-bar';
import { requireNativeView } from 'expo';
import PAGE from './generated/page';
import { allowedExternalLink } from './linkPolicy';
import { localize, t } from '../src/i18n';
import { liveSeed } from '../src/data';
import { CAMPUS_ID, destination, locationStatus, naverSearch, naverUrl, parseNativeMessage, safeExternalUrl, usable, validateDataset } from '../src/core';
import type { CampusId, Dataset, Language, NativeMessage, GeoPoint } from '../src/types';
type Marker = {
    id: string;
    lat: number;
    lon: number;
    name: string;
};
type MapPayload = {
    center: {
        lat: number;
        lon: number;
    };
    markers: Marker[];
    selectedId: string | null;
    route: {
        lat: number;
        lon: number;
    }[];
};
type NaverProps = {
    payload: string;
    style: object;
    onPlaceSelected?: (e: {
        nativeEvent: {
            placeId: string;
        };
    }) => void;
    onMapError?: (e: {
        nativeEvent: {
            message: string;
        };
    }) => void;
};
let NaverView: React.ComponentType<NaverProps> | null = null;
try {
    if (Constants.expoConfig?.extra?.naverKeyConfigured) NaverView = requireNativeView<NaverProps>('CampusNaver');
}
catch { /* A generic Expo client lacks this native view. */ }
const APP_ID = (Platform.OS === 'ios' ? Constants.expoConfig?.ios?.bundleIdentifier : Constants.expoConfig?.android?.package) || 'dev.student.myongjiexplorer';
const PREFS = 'mce-preferences-v1', CACHE = 'mce-live-v1';
function Content() {
    const { fontScale } = useWindowDimensions();
    const web = useRef<WebView>(null), live = useRef<Dataset>(liveSeed), active = useRef(true), requestCounter = useRef(0), ready = useRef(false);
    const [map, setMap] = useState<{
        payload: MapPayload;
        language: Language;
        placeId: string | null;
        entranceId?: string;
    } | null>(null);
    const [mapError, setMapError] = useState<string | null>(null), [pageError, setPageError] = useState(false);
    const langRef = useRef<Language>('en');
    const campusRef = useRef<CampusId>('yongin');
    const inject = useCallback((value: unknown) => { const text = JSON.stringify(value).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029'); web.current?.injectJavaScript(`window.MCE && window.MCE.receive(${text}); true;`); }, []);
    useEffect(() => { inject({ type: 'font-scale', scale: fontScale }); }, [fontScale, inject]);
    const say = (en: string, ko: string, l = langRef.current) => inject({ type: 'notice', text: t(en, ko, l) });
    const refresh = async () => {
        // The optional server/cache contract remains Yongin-specific. Seoul is bundled separately.
        if (campusRef.current !== 'yongin') {
            say('Content refresh is not configured for this campus.', '이 캠퍼스의 정보 새로고침은 설정되지 않았습니다.');
            return;
        }
        const url = Constants.expoConfig?.extra?.contentUrl;
        if (typeof url !== 'string' || !safeExternalUrl(url)) {
            say('No HTTPS content server configured. Using saved campus information.', 'HTTPS 콘텐츠 서버가 설정되지 않아 저장된 캠퍼스 정보를 사용합니다.');
            return;
        }
        const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 8000);
        try {
            const r = await fetch(url, { signal: controller.signal, credentials: 'omit' });
            if (!r.ok)
                throw new Error('HTTP');
            const text = await r.text();
            if (text.length > 2000000)
                throw new Error('Oversized response');
            const value = JSON.parse(text);
            if (validateDataset(value, 'live').length || value.campus.id !== CAMPUS_ID || value.version < live.current.version)
                throw new Error('Invalid dataset');
            live.current = value;
            await AsyncStorage.setItem(CACHE, JSON.stringify(value));
            if (campusRef.current === 'yongin') {
                inject({ type: 'content', data: value, cached: false });
                say('Campus content updated.', '캠퍼스 정보가 업데이트되었습니다.');
            }
        }
        catch {
            say('Update unavailable. Cached records still work; check their verification dates.', '업데이트를 사용할 수 없습니다. 저장된 정보의 확인 날짜를 확인하세요.');
        }
        finally {
            clearTimeout(timer);
        }
    };
    useEffect(() => {
        const subscription = AppState.addEventListener('change', state => { active.current = state === 'active'; if (!active.current)
            requestCounter.current++; inject({ type: 'lifecycle', active: active.current }); });
        const reduced = AccessibilityInfo.addEventListener('reduceMotionChanged', enabled => inject({ type: 'reduced-motion', enabled }));
        return () => { subscription.remove(); reduced.remove(); requestCounter.current++; };
    }, [inject]);
    const initialize = async () => {
        if (ready.current)
            return;
        ready.current = true;
        try {
            const [prefs, cache] = await Promise.all([AsyncStorage.getItem(PREFS), AsyncStorage.getItem(CACHE)]);
            if (prefs) {
                const p = JSON.parse(prefs);
                if ((p.language === 'en' || p.language === 'ko' || p.language === 'zh') && Array.isArray(p.favorites)) {
                    langRef.current = p.language;
                    campusRef.current = p.campusId === 'seoul' ? 'seoul' : 'yongin';
                    inject({ type: 'preferences', language: p.language, campusId: campusRef.current, favorites: p.favorites.filter((s: unknown) => typeof s === 'string') });
                }
            }
            if (cache) {
                const d = JSON.parse(cache);
                if (validateDataset(d, 'live').length === 0 && d.campus.id === CAMPUS_ID && d.version >= live.current.version) {
                    live.current = d;
                    if (campusRef.current === 'yongin') inject({ type: 'content', data: d, cached: true });
                }
            }
        }
        catch {
            say('Stored preferences could not be loaded. Browsing is still available.', '저장된 설정을 불러오지 못했습니다. 탐색은 계속 사용할 수 있습니다.');
        }
        inject({ type: 'reduced-motion', enabled: await AccessibilityInfo.isReduceMotionEnabled() });
        inject({ type: 'lifecycle', active: active.current });
        inject({ type: 'font-scale', scale: fontScale });
        inject({ type: 'publisher-info', privacyUrl: Constants.expoConfig?.extra?.privacyUrl || null, supportUrl: Constants.expoConfig?.extra?.supportUrl || null });
        // No automatic location requests. First-party content refresh has no location payload.
        if (Constants.expoConfig?.extra?.contentUrl && campusRef.current === 'yongin')
            void refresh();
    };
    const getLocation = async () => {
        const token = ++requestCounter.current;
        try {
            const permission = await Location.requestForegroundPermissionsAsync();
            if (token !== requestCounter.current || !active.current)
                return;
            if (!permission.granted) {
                inject({ type: 'location', status: 'denied' });
                return;
            }
            let timeout: ReturnType<typeof setTimeout> | undefined;
            const result = await Promise.race([Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }), new Promise<never>((_, reject) => { timeout = setTimeout(() => reject(new Error('timeout')), 12000); })]).finally(() => { if (timeout)
                clearTimeout(timeout); });
            if (token !== requestCounter.current || !active.current)
                return;
            const reading = { lat: result.coords.latitude, lon: result.coords.longitude, accuracyM: result.coords.accuracy, timestamp: result.timestamp };
            inject({ type: 'location', reading, status: locationStatus(reading) });
            // One reading is sent to the UI and not persisted, logged, or added to a history.
        }
        catch {
            if (token === requestCounter.current && active.current)
                inject({ type: 'location', status: 'unavailable' });
        }
    };
    const openNaver = async (action: 'place' | 'walk' | 'search', placeId: string, entranceId: string | undefined, l: Language) => {
        if (campusRef.current !== 'yongin') {
            say('Native map integration is not configured for this campus. Use its official map source.', '이 캠퍼스의 네이티브 지도 연동은 설정되지 않았습니다. 공식 지도 출처를 이용하세요.', l);
            return;
        }
        const p = live.current.places.find(p => p.id === placeId);
        if (!p || !usable(p.evidence, 'live')) {
            say('No verified destination.', '검증된 목적지가 없습니다.', l);
            return;
        }
        const dest = destination(live.current, placeId, entranceId);
        let url: string;
        if (action === 'search')
            url = naverSearch(`${p.name.ko} 명지대학교 자연캠퍼스 용인`, APP_ID);
        else if (dest)
            url = naverUrl(action, dest.point, dest.name, APP_ID);
        else if (action === 'place' && p.point?.frame === 'wgs84' && usable(p.geometryEvidence, 'live'))
            url = naverUrl('place', p.point, p.name.ko, APP_ID);
        else {
            say('A verified entrance coordinate is required for walking directions.', '도보 길찾기에는 검증된 출입구 좌표가 필요합니다.', l);
            return;
        }
        try {
            if (await Linking.canOpenURL(url)) {
                await Linking.openURL(url);
                return;
            }
        }
        catch { /* Show an explicit alternative; do not report a successful handoff. */ }
        const store = Platform.OS === 'ios' ? 'https://apps.apple.com/app/id311867728' : 'https://play.google.com/store/apps/details?id=com.nhn.android.nmap';
        const fallback = 'https://map.naver.com/p/search/' + encodeURIComponent(`${p.name.ko} 명지대학교 자연캠퍼스 용인`);
        Alert.alert(t('Naver Maps is unavailable', '네이버 지도를 사용할 수 없습니다', l), t('Install Naver Maps or open a browser search. A web search is not an entrance-specific walking route.', '네이버 지도를 설치하거나 브라우저에서 검색하세요. 웹 검색은 특정 출입구까지의 보행 경로가 아닙니다.', l), [
            { text: t('Cancel', '취소', l), style: 'cancel' },
            { text: t('Web search', '웹 검색', l), onPress: () => void Linking.openURL(fallback).catch(() => say('Could not open browser.', '브라우저를 열 수 없습니다.', l)) },
            { text: t('Install Naver', '네이버 설치', l), onPress: () => void Linking.openURL(store).catch(() => say('Could not open store.', '스토어를 열 수 없습니다.', l)) }
        ]);
    };
    const showNativeMap = (m: Extract<NativeMessage, {
        type: 'native-map';
    }>) => {
        if (campusRef.current !== 'yongin') {
            say('Native map integration is not configured for this campus. Use its official map source.', '이 캠퍼스의 네이티브 지도 연동은 설정되지 않았습니다. 공식 지도 출처를 이용하세요.');
            return;
        }
        if (m.mode !== 'live') {
            say('Demo geometry is not sent to Naver.', '샘플 지형을 네이버로 보내지 않습니다.');
            return;
        }
        if (!NaverView || !Constants.expoConfig?.extra?.naverKeyConfigured) {
            say('Naver needs a development build and a restricted mobile SDK key. Search remains available.', '네이버는 개발 빌드와 제한된 모바일 SDK 키가 필요합니다. 검색은 계속 사용할 수 있습니다.');
            return;
        }
        const markers: Marker[] = live.current.places.filter(p => usable(p.evidence, 'live') && usable(p.geometryEvidence, 'live') && p.point?.frame === 'wgs84').map(p => ({ id: p.id, lat: (p.point as GeoPoint).lat, lon: (p.point as GeoPoint).lon, name: localize(p.name, m.language) }));
        const entrance = destination(live.current, m.placeId || '', m.entranceId);
        if (entrance && m.placeId) {
            const p = live.current.places.find(p => p.id === m.placeId)!;
            const item = { id: p.id, lat: entrance.point.lat, lon: entrance.point.lon, name: entrance.name };
            const idx = markers.findIndex(v => v.id === p.id);
            if (idx < 0)
                markers.push(item);
            else
                markers[idx] = item;
        }
        const selected = markers.find(p => p.id === m.placeId), origin = live.current.campus.origin;
        const center = selected ? { lat: selected.lat, lon: selected.lon } : origin && usable(live.current.campus.geometryEvidence, 'live') ? { lat: origin.lat, lon: origin.lon } : null;
        if (!center) {
            say('No verified campus map coordinates are available yet. No default Seoul map will be shown.', '검증된 캠퍼스 지도 좌표가 아직 없습니다. 기본 서울 지도를 표시하지 않습니다.');
            return;
        }
        // Route geometry from an untrusted WebView message is never forwarded blindly.
        // Reconstruct only if every supplied edge is actually present, verified and public.
        const routePoints: {
            lat: number;
            lon: number;
        }[] = [];
        if (m.route?.mode === 'live' && Array.isArray(m.route.nodeIds) && Array.isArray(m.route.edgeIds) && m.route.nodeIds.length === m.route.edgeIds.length + 1 && m.route.nodeIds.length <= 10000) {
            let valid = true;
            for (let i = 0; i < m.route.edgeIds.length; i++) {
                const edge = live.current.edges.find(e => e.id === m.route!.edgeIds[i]);
                const f = m.route.nodeIds[i], t = m.route.nodeIds[i + 1];
                if (!edge || edge.access !== 'public' || !usable(edge.evidence, 'live') || !((edge.from === f && edge.to === t) || (edge.bidirectional && edge.from === t && edge.to === f)))
                    valid = false;
            }
            for (const id of m.route.nodeIds) {
                const n = live.current.nodes.find(n => n.id === id);
                if (!n || n.access !== 'public' || !usable(n.evidence, 'live') || n.point.frame !== 'wgs84') {
                    valid = false;
                    break;
                }
                routePoints.push({ lat: n.point.lat, lon: n.point.lon });
            }
            if (!valid)
                routePoints.length = 0;
        }
        setMapError(null);
        setMap({ payload: { center, markers, selectedId: m.placeId, route: routePoints }, language: m.language, placeId: m.placeId, entranceId: m.entranceId });
    };
    const onMessage = (event: WebViewMessageEvent) => {
        if (event.nativeEvent.data.length > 200000)
            return;
        let m: NativeMessage | null;
        try {
            m = parseNativeMessage(JSON.parse(event.nativeEvent.data));
        }
        catch {
            return;
        }
        if (!m)
            return;
        if ('language' in m)
            langRef.current = m.language;
        switch (m.type) {
            case 'ready':
                void initialize();
                break;
            case 'save':
                if (m.campusId) campusRef.current = m.campusId;
                void AsyncStorage.setItem(PREFS, JSON.stringify({ language: m.language, campusId: campusRef.current, favorites: m.favorites })).catch(() => say('Unable to persist preferences.', '설정을 저장할 수 없습니다.'));
                break;
            case 'location':
                void getLocation();
                break;
            case 'refresh':
                void refresh();
                break;
            case 'external':
                if (allowedExternalLink(m.url, [Constants.expoConfig?.extra?.privacyUrl, Constants.expoConfig?.extra?.supportUrl])) {
                    void Linking.openURL(m.url).catch(() => say('Could not open link.', '링크를 열 수 없습니다.'));
                } else {
                    say('This source link is not in the reviewed source list.', '검토된 출처 목록에 없는 링크입니다.');
                }
                break;
            case 'naver':
                if (m.mode === 'live')
                    void openNaver(m.action, m.placeId, m.entranceId, m.language);
                break;
            case 'native-map':
                showNativeMap(m);
                break;
        }
    };
    const closeMap = () => { if (map?.placeId)
        inject({ type: 'select', placeId: map.placeId }); setMap(null); };
    return <SafeAreaView style={styles.root} edges={['top', 'bottom']}><StatusBar style="dark"/>
   {pageError ? <View style={styles.error}><Text style={styles.title}>{t('The app view could not load.', '앱 화면을 불러올 수 없습니다.', langRef.current)}</Text><Pressable style={styles.button} onPress={() => { ready.current = false; setPageError(false); }}><Text style={styles.buttonText}>{t('Reload', '다시 불러오기', langRef.current)}</Text></Pressable></View> :
            <WebView ref={web} source={{ html: PAGE }} style={styles.web} javaScriptEnabled domStorageEnabled originWhitelist={['*']} onMessage={onMessage} onLoadStart={() => { ready.current = false; }} onError={() => setPageError(true)} onContentProcessDidTerminate={() => { ready.current = false; web.current?.reload(); }} onRenderProcessGone={() => { ready.current = false; web.current?.reload(); }} onShouldStartLoadWithRequest={request => request.url === 'about:blank' || request.url.startsWith('about:blank#')} mixedContentMode="never" allowFileAccess={false} allowUniversalAccessFromFileURLs={false} setSupportMultipleWindows={false} geolocationEnabled={false} mediaPlaybackRequiresUserAction textZoom={100} automaticallyAdjustContentInsets={false} startInLoadingState renderLoading={() => <ActivityIndicator style={styles.loading} accessibilityLabel={t('Loading campus explorer', '캠퍼스 탐색기 불러오는 중', langRef.current)}/>}/>} 
   <Modal visible={!!map} onRequestClose={closeMap} animationType="none">
    <SafeAreaView style={styles.root}>
      <View style={styles.mapHeader}><Pressable accessibilityRole="button" style={styles.back} onPress={closeMap}><Text>{t('‹ Back to 3D', '‹ 3D 지도로', map?.language || langRef.current)}</Text></Pressable><Text style={styles.mapTitle}>{t('Naver Maps', '네이버 지도', map?.language || langRef.current)}</Text></View>
      {map && NaverView && !mapError ? <NaverView style={styles.nativeMap} payload={JSON.stringify(map.payload)} onPlaceSelected={event => { const id = event.nativeEvent.placeId; if (!live.current.places.some(p => p.id === id))
            return; const entry = live.current.entrances.find(e => e.placeId === id && usable(e.evidence, 'live')); setMap(prev => prev ? { ...prev, placeId: id, entranceId: entry?.id, payload: { ...prev.payload, selectedId: id } } : prev); }} onMapError={() => setMapError(t('The map could not load. Check the connection and SDK credentials.', '지도를 불러올 수 없습니다. 연결 및 SDK 인증 정보를 확인하세요.', map.language))}/> : <View style={styles.error}><Text>{mapError || t('Map unavailable', '지도를 사용할 수 없습니다', langRef.current)}</Text></View>}
      {map && <ScrollView style={styles.nativeSheet} contentContainerStyle={styles.nativeSheetContent}><Text style={styles.title}>{localize(live.current.places.find(p => p.id === map.placeId)?.name || live.current.campus.name, map.language)}</Text><Text style={styles.caption}>{t('Verified coordinates only. Indoor positioning is not provided.', '검증된 좌표만 표시합니다. 실내 위치는 제공하지 않습니다.', map.language)}</Text><Pressable accessibilityRole="button" style={styles.button} onPress={() => { if (map.placeId)
        void openNaver('walk', map.placeId, map.entranceId, map.language); }}><Text style={styles.buttonText}>{t('Open walking directions', '도보 길찾기 열기', map.language)}</Text></Pressable></ScrollView>}
    </SafeAreaView>
   </Modal>
 </SafeAreaView>;
}
export default function App() { return <SafeAreaProvider><Content /></SafeAreaProvider>; }
const styles = StyleSheet.create({ root: { flex: 1, backgroundColor: '#fbfcf6' }, web: { flex: 1, backgroundColor: '#fbfcf6' }, loading: { position: 'absolute', top: '45%', left: '48%' }, error: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 28, gap: 18 }, title: { fontSize: 22, fontWeight: '600', color: '#223d38' }, caption: { fontSize: 13, lineHeight: 21, color: '#6e7e74', marginVertical: 12 }, button: { backgroundColor: '#236f5e', paddingHorizontal: 18, paddingVertical: 15, borderRadius: 12, minHeight: 48 }, buttonText: { color: '#fff', fontSize: 14, textAlign: 'center' }, mapHeader: { flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: '#e4e8dc' }, back: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 8 }, mapTitle: { marginLeft: 18, fontSize: 16, fontWeight: '600', color: '#223d38' }, nativeMap: { flex: 1 }, nativeSheet: { maxHeight: '28%', backgroundColor: '#fbfcf6' }, nativeSheetContent: { padding: 22 } });
