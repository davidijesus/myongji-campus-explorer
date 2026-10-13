import type { Language, Localized } from './types';
import { CAMPUS_DIRECTORY_URL, REFERENCE_CAMPUS } from './campus';
import { localize } from './i18n';
import { KNOWLEDGE_ZH } from './knowledge-zh';
import { COMMUNITY_SOURCES } from './community';
import { getYonginPlaceDescription, YONGIN_DESCRIPTION_SOURCE_URLS } from './place-descriptions';
import { SEOUL_KNOWLEDGE_SOURCES, SEOUL_CAMPUS_FOOD, SEOUL_CAMPUS_FACTS, SEOUL_BUS_ROUTES, SEOUL_TRANSPORT_SUMMARY, SEOUL_TRANSPORT_SOURCE_IDS, resolveSeoulClassroomCode, answerSeoulQuestion } from './seoul-knowledge';

/** Reviewed source snapshots. A checked page is not a guarantee of present-day operation. */
export type KnowledgeSource = {
  id: string; title: Localized; url: string | null;
  kind: 'official' | 'student-guide' | 'user-reference';
  checkedAt: string; publishedAt: string | null; status: 'checked' | 'imported'; note: Localized;
};
const l = (en: string, ko: string, zh=KNOWLEDGE_ZH[en]||en): Localized => ({ en, ko, zh });
export const KNOWLEDGE_CHECKED_AT = '2026-09-29';
export const KNOWLEDGE_SOURCES: KnowledgeSource[] = [
  ...([
    ['mju-health-center', 'Myongji · Health Centers', '명지대학교 · 보건의료센터', '明知大学 · 保健医疗中心', YONGIN_DESCRIPTION_SOURCE_URLS.health],
    ['mju-architecture', 'Myongji · College of Architecture', '명지대학교 · 건축대학', '明知大学 · 建筑学院', YONGIN_DESCRIPTION_SOURCE_URLS.architecture],
    ['mju-staff-dining', 'Myongji · Staff cafeteria', '명지대학교 · 교직원식당', '明知大学 · 教职工食堂', YONGIN_DESCRIPTION_SOURCE_URLS.staffDining],
    ['mju-cooperation', 'Myongji · Industry-Academic Cooperation', '명지대학교 · 산학협력단', '明知大学 · 产学合作团', YONGIN_DESCRIPTION_SOURCE_URLS.cooperation],
    ['mju-chaplaincy', 'Myongji · Mission Support', '명지대학교 · 선교지원팀', '明知大学 · 宗教事务支持', YONGIN_DESCRIPTION_SOURCE_URLS.chaplaincy],
    ['mju-structural-testing', 'Myongji · Hybrid Structural Testing Center', '명지대학교 · 하이브리드구조실험센터', '明知大学 · 混合结构试验中心', YONGIN_DESCRIPTION_SOURCE_URLS.structuralTesting],
  ] as const).map(([id,en,ko,zh,url]):KnowledgeSource=>({id,title:l(en,ko,zh),url,kind:'official',checkedAt:'2026-10-06',publishedAt:null,status:'checked',note:l('Building or service location.','건물 또는 시설 위치 안내입니다.','建筑或服务地点。')})),
  ...COMMUNITY_SOURCES.filter(source=>source.sourceType==='official-menu').map(source=>({id:source.id,title:source.title,url:source.url,kind:'official' as const,checkedAt:'2026-10-04',publishedAt:null,status:'checked' as const,note:source.note})),
  { id:'notion-guide-pdf', title:l('Campus guide PDF — pages 1, 2 and 4','캠퍼스 안내 PDF — 1, 2, 4쪽','校园指南 PDF — 第1、2、4页'), url:null, kind:'student-guide', checkedAt:'2026-10-04', publishedAt:null, status:'imported', note:l('Selected facts and Instagram handles read from the supplied guide. Its printed date is not an operational verification date. Stories, menus, prices, hours and walking routes have not been verified as current.','제공된 안내서에서 일부 정보와 Instagram 계정을 확인했습니다. 인쇄 날짜는 운영 정보 확인 날짜가 아닙니다. 스토리, 식단, 가격, 운영 시간 및 보행 경로의 현재 상태는 확인되지 않았습니다.','从用户提供的指南中核对了部分信息和 Instagram 账号。打印日期不代表运营信息核实日期。尚未核实当前快拍、菜单、价格、营业时间或步行路线。') },
  { id:'mju-civil-office', title:l('Myongji — Civil Engineering office location','명지대학교 — 토목공학 사무실 위치','明知大学 — 土木工程办公室位置'), url:'https://gsie.mju.ac.kr/gsie/10829/subview.do', kind:'official', checkedAt:'2026-10-06', publishedAt:null, status:'checked', note:l('The department places its office in Engineering Building 4. This does not identify every class or a walking route.','학과 안내에 사무실 위치가 제4공학관으로 명시되어 있습니다. 모든 수업 장소나 보행 경로를 확인한 것은 아닙니다.','院系网页将办公室标为第四工学馆。这不代表所有课程地点或步行路线。') },
  { id:'mju-oulami', title:l('Myongji — Oulami international exchange club','명지대학교 — 국제교류학생클럽 어우라미','明知大学 — Oulami 国际交流学生社团'), url:'https://www.mju.ac.kr/bbs/mjukr/141/226616/artclView.do', kind:'official', checkedAt:'2026-10-04', publishedAt:'2025-10-22', status:'checked', note:l('The university notice names @o_ulami as the club account. Its old recruitment dates are not current events.','대학 공지에서 동아리 계정 @o_ulami를 확인했습니다. 과거 모집 일정은 현재 행사로 표시하지 않습니다.','大学公告列出了社团账号 @o_ulami。旧招募日期不作为当前活动。') },
  { id:'mju-campus-directory', title:l('Myongji · official campus directory','명지대학교 · 공식 캠퍼스 안내'), url:CAMPUS_DIRECTORY_URL, kind:'official', checkedAt:KNOWLEDGE_CHECKED_AT, publishedAt:null, status:'checked', note:l('Building names and directory markers checked for the illustrated map. Code labels come from the supplied illustration. Footprints, heights and entrances remain unverified.','그림 지도에 사용할 건물명과 목록 표식을 확인했습니다. 코드 표기는 제공된 삽화에서 가져왔습니다. 건물 외곽·높이·출입구는 미확인입니다.') },
  { id:'mju-transport', title:l('Myongji · general transport page (superseded schedule)','명지대학교 · 일반 교통 안내 (이전 시간표)'), url:'https://www.mju.ac.kr/mjukr/506/subview.do', kind:'official', checkedAt:KNOWLEDGE_CHECKED_AT, publishedAt:null, status:'checked', note:l('Its undated timetable is superseded in this app by the dated 2026 second-semester notice and PDF. Do not use this page for current departure times.','이 페이지의 적용일 미상 시간표 대신 2026학년도 2학기 공지와 첨부 PDF를 사용합니다. 현재 출발시간은 최신 공지에서 확인하세요.') },
  { id:'mju-transport-2026-2', title:l('Myongji · 2026 second-semester bus notice','명지대학교 · 2026학년도 2학기 버스 공지'), url:'https://irb.mju.ac.kr/bbs/mjukr/141/234852/artclView.do', kind:'official', checkedAt:'2026-09-30', publishedAt:'2026-08-31', status:'checked', note:l('Applies September 1–December 14, 2026. The notice says seasonal-term and vacation schedules will be announced again in December. No live service confirmation.','2026년 9월 1일~12월 14일 적용입니다. 계절학기와 방학 일정은 12월 재공지 예정이라고 안내합니다. 실시간 운행 확인 자료가 아닙니다.') },
  { id:'mju-transport-2026-2-pdf', title:l('Myongji · attached 2026-2 bus timetable (PDF)','명지대학교 · 2026-2 첨부 운행시간표 (PDF)'), url:'https://irb.mju.ac.kr/bbs/mjukr/141/180048/download.do', kind:'official', checkedAt:'2026-09-30', publishedAt:'2026-08-31', status:'checked', note:l('Page 1: semester station/downtown departures. Page 3: holiday shuttle and Giheung rows. Page 2 seasonal-term rows are not activated because the notice promises a later calendar announcement.','1쪽: 학기 중 명지대역·시내 출발시간. 3쪽: 공휴일 셔틀과 기흥역 운행표. 2쪽 계절학기 표는 운행일 재공지를 기다리므로 적용하지 않습니다.') },
  { id:'mju-welfare', title:l('Myongji · Natural Campus facilities','명지대학교 · 자연캠퍼스 복지시설'), url:'https://www.mju.ac.kr/mjukr/492/subview.do', kind:'official', checkedAt:'2026-10-06', publishedAt:null, status:'checked', note:l('Locations and operators listed by Myongji. Current prices, hours and availability are not provided. English names are translations.','대학에 게시된 위치와 업체명입니다. 현재 가격, 영업시간과 영업 여부는 제공되지 않습니다. 영문 명칭은 번역입니다.') },
  { id:'mju-room-codes', title:l('Myongji · classroom code guide (PDF)','명지대학교 · 강의실 안내 (PDF)'), url:'https://www.mju.ac.kr/bbs/gs/195/174672/download.do', kind:'official', checkedAt:KNOWLEDGE_CHECKED_AT, publishedAt:null, status:'checked', note:l('Building code patterns only. Does not establish a room exists or that a class meets there.','건물 코드 규칙 안내입니다. 특정 강의실의 존재나 수업 배정을 확인하는 자료가 아닙니다.') },
  { id:'mju-facilities-faq', title:l('Myongji · student facilities FAQ','명지대학교 · 교내 시설 FAQ'), url:'https://mjtrans.mju.ac.kr/bbs/mjtrans/1003/215452/artclView.do', kind:'official', checkedAt:'2026-10-06', publishedAt:'2024-09-26', status:'checked', note:l('Department guide updated September 2025. Building entrances can be on different floors because of slopes.','2025년 9월 수정된 학과 안내입니다. 경사로 인해 건물 입구별 층이 다를 수 있습니다.') },
  { id:'notion-guide', title:l('Student Notion guide · supplied snapshot','학생 Notion 안내 · 제공된 사본'), url:'https://app.notion.com/p/Myongji-University-Yongin-Campus-Definitive-Guide-2a396a3f3f60801fa233f911ed15b505', kind:'student-guide', checkedAt:KNOWLEDGE_CHECKED_AT, publishedAt:null, status:'imported', note:l('Read from the supplied text export. The Notion URL could not be read publicly. Undated student guidance; not an official or live feed.','제공된 텍스트 사본을 읽었습니다. Notion 주소는 공개 접근으로 읽을 수 없었습니다. 작성일 미상의 학생 안내이며 공식·실시간 정보가 아닙니다.') },
  { id:'user-campus-reference', title:l('Supplied campus illustration','제공된 캠퍼스 삽화'), url:null, kind:'user-reference', checkedAt:KNOWLEDGE_CHECKED_AT, publishedAt:null, status:'imported', note:l('Reference for building labels and a schematic scene; not a surveyed map or a verified entrance plan.','건물 표기와 개략도 참고 자료입니다. 실측 지도나 검증된 출입구 도면이 아닙니다.') },
];
/** Editorial review age, not a claim that the facts are currently operational. */
export function sourceFreshness(sourceId:string,now:Date=new Date()):'snapshot'|'review-needed'|'imported'|'unknown' {
  const source=[...KNOWLEDGE_SOURCES,...SEOUL_KNOWLEDGE_SOURCES].find(s=>s.id===sourceId);
  if(!source||!Number.isFinite(now.getTime()))return 'unknown';
  if(source.status==='imported')return 'imported';
  const age=now.getTime()-Date.parse(`${source.checkedAt}T00:00:00+09:00`);
  return age<0||age>30*86400000?'review-needed':'snapshot';
}

export type CampusFood = {
  id:string; name:Localized; kind:'cafe'|'cafeteria'|'restaurant'|'convenience';
  placeCode:string|null; location:Localized; sourceIds:string[]; hours:null; price:null; note:Localized;
};
const food = (id:string, en:string, ko:string, kind:CampusFood['kind'], placeCode:string, enLocation:string, koLocation:string): CampusFood => ({
  id, name:l(en,ko), kind, placeCode, location:l(enLocation,koLocation), sourceIds:['mju-welfare','mju-facilities-faq'], hours:null, price:null,
  note:l('Check current hours and prices before visiting.','방문 전 최신 운영 시간과 가격을 확인하세요.','前往前请确认最新营业时间和价格。'),
});
export const CAMPUS_FOOD:CampusFood[] = [
  food('food-y3','Tam-naneun Table','탐나는식탁','cafeteria','Y3','Myeongjin Hall · basement','명진당 · 지하층'),
  food('food-y1','Tam-naneun Table','탐나는식탁','cafeteria','Y1','Student Hall · 1F','학생회관 · 1층'),
  food('food-y9','Youth Bakery','청년제빵소','restaurant','Y9','Hambak Hall · 3F','함박관 · 3층'),
  food('cafe-y1','Myongji Cafe','명지카페','cafe','Y1','Student Hall · 1F','학생회관 · 1층'),
  food('cafe-y12','CAFEING','CAFEING','cafe','Y12','Design Center · 1F','디자인조형센터 · 1층'),
  food('cafe-y19','GRAZIE','GRAZIE','cafe','Y19','Engineering Building 3 · floor unspecified','제3공학관 · 층 정보 없음'),
  food('cafe-y21','CAFEING','CAFEING','cafe','Y21','Student Welfare Building · 2F','학생복지관 · 2층'),
  food('store-y3','7-Eleven','세븐일레븐','convenience','Y3','Myeongjin Hall · basement','명진당 · 지하층'),
  food('store-y1','7-Eleven','세븐일레븐','convenience','Y1','Student Hall · 1F','학생회관 · 1층'),
  food('store-y9','7-Eleven','세븐일레븐','convenience','Y9','Hambak Hall · 3F','함박관 · 3층'),
  food('store-y19','Emart24','이마트24','convenience','Y19','Engineering Building 3 · basement','제3공학관 · 지하층'),
  food('burger-y1','Burger 307','버거 307','restaurant','Y1','Student Hall · 1F','학생회관 · 1층'),
  food('hotdog-y21','Staff Hotdog','스태프핫도그','restaurant','Y21','Student Welfare Building · 2F','학생복지관 · 2층'),
  food('bakery-y2','Paris Baguette','파리바게트','restaurant','Y2','Changjo Arts Hall · 4F','창조예술관 · 4층'),
];

export type CampusFact = { id:string; text:Localized; keywords:string[]; placeCodes:string[]; sourceIds:string[]; status:'supported'|'limited' };
export const CAMPUS_FACTS:CampusFact[] = [
  { id:'civil-office', text:l('The Civil Engineering office is in Engineering Building 4 (Y13).','토목공학 사무실은 제4공학관(Y13)에 있습니다.','土木工程办公室位于第四工学馆（Y13）。'), keywords:['civil engineering','civil','토목','土木'], placeCodes:['Y13'], sourceIds:['mju-civil-office'], status:'limited' },
  { id:'library', text:l('The library, reading rooms and study rooms are in Myongjin Hall (Y3). Check the library for current entry and seat-reservation rules.','도서관, 열람실과 스터디룸은 명진당(Y3)에 있습니다. 입장 및 좌석 예약 방법은 도서관에서 확인하세요.','图书馆、阅览室和自习室位于明进堂（Y3）。入馆及座位预约规则请向图书馆确认。'), keywords:['library','book','borrow','reservation','도서관','책','열람','예약','图书馆','借书','阅览'], placeCodes:['Y3'],sourceIds:['mju-facilities-faq'],status:'limited' },
  { id:'printing',text:l('Copy rooms: Myongjin Hall (Y3) 4F, Engineering Building 1 1F, Next Generation Science Hall (Y23) 4F, Engineering Building 5 (Y5) 1F and Engineering Building 3 (Y19) basement.','복사실: 명진당(Y3) 4층, 제1공학관 1층, 차세대과학관(Y23) 4층, 제5공학관(Y5) 1층, 제3공학관(Y19) 지하층.','复印室：明进堂（Y3）4层、第一工学馆1层、次世代科学馆（Y23）4层、第五工学馆（Y5）1层及第三工学馆（Y19）地下层。'),keywords:['print','scan','copy','printer','프린트','인쇄','복사','스캔','打印','复印','扫描'],placeCodes:['Y3','Y_','Y23','Y5','Y19'],sourceIds:['mju-welfare'],status:'supported'},
  { id:'bank',text:l('Hana Bank is on 1F of Student Welfare Hall (Y21). An ATM is outside the bus office.','하나은행은 학생복지관(Y21) 1층에 있습니다. 버스관리사무소 앞에도 ATM이 있습니다.','韩亚银行位于学生福利馆（Y21）1层，公交管理办公室前另设有ATM。'),keywords:['bank','atm','은행','현금','银行','取款'],placeCodes:['Y21'],sourceIds:['mju-welfare'],status:'supported'},
  { id:'post',text:l('The postal counter is on 1F of Student Union (Y1).','우편취급국은 학생회관(Y1) 1층에 있습니다.','邮政代办所位于学生会馆（Y1）1层。'),keywords:['post','mail','parcel','우체','우편','택배','邮局','邮寄','快递'],placeCodes:['Y1'],sourceIds:['mju-welfare'],status:'supported'},
  { id:'health',text:l('The Health Center is on 1F of Student Union (Y1).','보건의료센터는 학생회관(Y1) 1층에 있습니다.','保健医疗中心位于学生会馆（Y1）1层。'),keywords:['health','clinic','sick','nurse','보건','아파','병원','保健','医务','生病'],placeCodes:['Y1'],sourceIds:['mju-health-center'],status:'supported'},
  { id:'guide-nearby',text:l('The student guide suggests nearby restaurants and cafés, including Cafe Frog and Scoopy. Check the address and current hours before visiting.','학생 안내서는 Cafe Frog, Scoopy 등 주변 식당과 카페를 소개합니다. 방문 전 주소와 최신 운영 시간을 확인하세요.','学生指南推荐了Cafe Frog、Scoopy等校外餐厅和咖啡店。前往前请确认地址及当前营业时间。'),keywords:['nearby','outside','off campus','frog','scoopy','주변','교외','附近','校外'],placeCodes:[],sourceIds:['notion-guide'],status:'limited'},
];

export type BusRoute = {
  id:string; name:Localized; service:Localized; origin:Localized; destination:Localized;
  times:string[]; sourceIds:string[]; note:Localized; timeZone:'Asia/Seoul'; calendarVerified:false;
  validFrom:string; validThrough:string; serviceDays:'weekdays-except-holidays'|'weekends-and-holidays';
};
const busNote=l('2026 second-semester published timetable, September 1–December 14. Not live arrivals. Confirm public holidays and any service changes in university notices; road conditions can delay departures by 5–10 minutes.','2026학년도 2학기 공개 시간표로 9월 1일~12월 14일 적용입니다. 실시간 도착정보가 아닙니다. 공휴일과 운행 변경은 대학 공지에서 확인하세요. 도로 상황에 따라 5~10분 지연될 수 있습니다.');
const semester=l('Sep 1–Dec 14, 2026 · weekdays except public holidays','2026.9.1.~12.14. · 공휴일 제외 평일');
const bus=(id:string,name:Localized,service:Localized,origin:Localized,destination:Localized,times:string[],serviceDays:BusRoute['serviceDays']='weekdays-except-holidays'):BusRoute=>({id,name,service,origin,destination,times,sourceIds:['mju-transport-2026-2','mju-transport-2026-2-pdf'],note:busNote,timeZone:'Asia/Seoul',calendarVerified:false,validFrom:'2026-09-01',validThrough:'2026-12-14',serviceDays});
export const BUS_ROUTES:BusRoute[] = [
  bus('station-semester',l('Myongji Univ. Station loop','명지대역 순환'),semester,l('Campus bus office (in front of chapel)','버스관리사무소 정류장 (채플관 앞)'),l('Myongji Univ. Station → campus','명지대역 → 교내'),['08:00','08:15','08:20','08:25','08:35','08:45','08:50','09:00','09:15','09:25','09:30','09:35','09:40','09:55','10:00','10:20','10:30','10:40','10:45','11:00','11:25','11:30','11:45','11:55','12:05','12:20','12:30','12:45','13:00','13:25','13:40','14:00','14:10','14:15','14:30','14:50','15:00','15:10','15:25','15:30','15:55','16:10','16:25','16:30','16:50','17:00','17:10','17:20','17:30','17:45','18:00','19:00','19:20','19:30']),
  bus('downtown-semester',l('Downtown / Yongin CGV loop','시내 / 용인CGV 순환'),semester,l('Campus bus office (in front of chapel)','버스관리사무소 정류장 (채플관 앞)'),l('Yongin CGV → campus','용인CGV → 교내'),['08:05','08:55','10:10','11:20','13:10','14:20','15:40','16:35','18:10','20:00']),
  // Stable ID retained for saved selections; the public label and validity no longer promise vacation service.
  bus('downtown-vacation',l('Downtown / station · weekend or holiday','시내 / 명지대역 · 주말 또는 공휴일'),l('Sep 1–Dec 14, 2026 · weekends and public holidays','2026.9.1.~12.14. · 주말 및 공휴일'),l('Myeonghyeon residence hall','생활관 명현관'),l('Downtown / station → residence hall','시내 / 명지대역 → 생활관'),['08:20','09:20','10:20','11:20','12:20','13:20','15:20','16:20','17:20','18:00'],'weekends-and-holidays'),
  bus('giheung-outbound',l('Campus → Giheung Station','교내 → 기흥역'),semester,l('Campus bus office (in front of chapel)','버스관리사무소 정류장 (채플관 앞)'),l('Giheung Station exit 5','기흥역 5번 출구'),['09:05','09:10','10:00','10:05','12:00','13:00','14:00','15:15','16:15','17:15','18:15','19:15']),
  bus('giheung-inbound',l('Giheung Station → campus','기흥역 → 교내'),semester,l('Giheung Station exit 5','기흥역 5번 출구'),l('Campus · return stop not specified','교내 · 도착 정류장 미명시'),['08:15','08:20','09:15','09:20','10:15','10:20','12:15','13:15','14:15','15:30','16:30','17:30','18:30']),
];
BUS_ROUTES[0]!.note=l('54 campus departures are listed in the 2026-2 PDF. After 18:00, the route ends at Myeongjin Hall (Y3). Extra station ↔ Y3 shuttles run during 08:30–10:50 and 15:00–17:30; individual extra departures are not specified. Today’s service is unconfirmed.','2026-2 PDF에 교내 출발 54회가 있습니다. 18시 이후에는 명진당(Y3)까지만 운행합니다. 08:30~10:50 및 15:00~17:30에 명지대역 ↔ 명진당 추가 운행이 있으나 개별 출발시각은 명시되지 않았습니다. 오늘 운행은 미확인입니다.');
BUS_ROUTES[1]!.note=l('10 campus departures are listed in the 2026-2 PDF. After 18:00, the route ends at Engineering Building 1. Today’s service is unconfirmed.','2026-2 PDF에 교내 출발 10회가 있습니다. 18시 이후에는 제1공학관까지만 운행합니다. 오늘 운행은 미확인입니다.');
BUS_ROUTES[2]!.note=l('The semester notice confirms 10 trips on weekends and public holidays. The origin is Myeonghyeon residence hall, not the campus bus office. Vacation dates are not activated: a new December notice is required. Today’s operation is unconfirmed.','학기 중 공지에는 주말과 공휴일 10회가 안내되어 있습니다. 출발지는 버스관리사무소가 아닌 생활관 명현관입니다. 방학 운행일은 12월 새 공지 확인 전까지 적용하지 않습니다. 오늘 운행은 미확인입니다.');
BUS_ROUTES[3]!.note=l('The PDF lists 12 campus departure slots, beginning 09:05; the first two Giheung-only rows have no campus departure. The stated 30 daily runs do not mean 30 distinct departure times. Full buses may leave early. Today’s service is unconfirmed.','PDF에는 교내 출발시각이 09:05부터 12개 있습니다. 처음 두 행은 기흥역 출발만 있고 교내 출발은 없습니다. 공지의 하루 30회는 서로 다른 출발시각 30개를 뜻하지 않습니다. 만차 시 조기 출발할 수 있습니다. 오늘 운행은 미확인입니다.');
BUS_ROUTES[4]!.note=l('Times are the PDF’s expected Giheung departures, not live arrivals. The final 19:30 station row has no campus return time, so this app does not offer it as a confirmed campus-bound trip. Full buses may leave early. Today’s service is unconfirmed.','PDF의 기흥역 출발 예정시각이며 실시간 도착정보가 아닙니다. 마지막 19:30 기흥역 행은 학교 도착시각이 없어 이 앱에서 확인된 교내행 편으로 제공하지 않습니다. 만차 시 조기 출발할 수 있습니다. 오늘 운행은 미확인입니다.');

export type ScheduledDepartures = {routeId:string;localDate:string;localTime:string;serviceStatus:'unconfirmed';times:string[];note:Localized;availability:'conditional'|'outside-period'|'wrong-day'|'holiday-unconfirmed';eligibilityNote:Localized};
/** Returns conditional timetable candidates only inside the notice period and day group.
 * Weekday public holidays and live operations are unverified. Never predicts arrivals,
 * rolls to a fabricated tomorrow service, or declares that a service actually runs today. */
export function scheduledDepartures(routeId:string, now:Date=new Date(), campus:'yongin'|'seoul'='yongin'):ScheduledDepartures {
  const route=getCampusKnowledge(campus).busRoutes.find(r=>r.id===routeId);
  if(!route) throw new Error('Unknown bus route');
  if(!Number.isFinite(now.getTime())) throw new Error('Invalid date');
  const parts=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(now);
  const get=(name:string)=>parts.find(p=>p.type===name)?.value||'';
  const localTime=`${get('hour')}:${get('minute')}`;
  const localDate=`${get('year')}-${get('month')}-${get('day')}`;
  const day=new Date(`${localDate}T00:00:00Z`).getUTCDay();
  const weekend=day===0||day===6;
  let availability:ScheduledDepartures['availability']='conditional';
  let eligibilityNote=l('Conditional times for a non-holiday weekday. Public holidays and service changes are unverified; confirm today’s service with the university.','공휴일이 아닌 평일에 해당하는 조건부 시간입니다. 공휴일과 운행 변경은 미확인이므로 오늘 운행을 대학에 확인하세요.');
  if(localDate<route.validFrom||localDate>route.validThrough){availability='outside-period';eligibilityNote=l('This date is outside the September 1–December 14, 2026 notice period. No upcoming times are shown; check a newer university notice.','이 날짜는 2026년 9월 1일~12월 14일 공지 적용기간 밖입니다. 예정시각을 표시하지 않습니다. 새 대학 공지를 확인하세요.');}
  else if(weekend&&route.serviceDays==='weekdays-except-holidays'){availability='wrong-day';eligibilityNote=l('This weekday timetable does not apply on weekends. Choose the weekend / holiday shuttle; Giheung has no weekend service in this notice.','평일 시간표는 주말에 적용되지 않습니다. 주말·공휴일 셔틀을 선택하세요. 이 공지에서 기흥역 버스는 주말에 운행하지 않습니다.');}
  else if(!weekend&&route.serviceDays==='weekends-and-holidays'){availability='holiday-unconfirmed';eligibilityNote=l('This is a weekday, and its public-holiday status is not verified. No upcoming times are shown for this weekend / holiday timetable.','평일이며 공휴일 여부는 확인되지 않았습니다. 이 주말·공휴일 시간표의 예정시각을 표시하지 않습니다.');}
  else if(weekend){eligibilityNote=l('The notice lists this timetable for weekends within its semester dates. Today’s actual operation and service changes remain unconfirmed.','공지에는 학기 적용기간 중 주말에 이 시간표를 운행한다고 나옵니다. 오늘 실제 운행과 변경사항은 미확인입니다.');}
  const seconds=Number(get('hour'))*3600+Number(get('minute'))*60+Number(get('second'));
  return {routeId,localDate,localTime,serviceStatus:'unconfirmed',times:availability==='conditional'?route.times.filter(t=>Number(t.slice(0,2))*3600+Number(t.slice(3))*60>=seconds):[],note:route.note,availability,eligibilityNote};
}

export type ChatAnswer = {answer:string;citations:string[];placeCodes:string[];placeIds?:string[];status:'supported'|'limited'|'unknown'};
type BuildingCode={code:string;name:Localized};
export const CLASSROOM_BUILDINGS:BuildingCode[]=[
  {code:'Y',name:l('Engineering Building 1','제1공학관')},{code:'Y2',name:l('Changjo Arts Hall','창조예술관')},{code:'Y3',name:l('Myeongjin Hall','명진당')},{code:'Y5',name:l('Engineering Building 5','제5공학관')},{code:'Y6',name:l('Sports and Culture Hall','체육문화관')},{code:'Y8',name:l('Engineering Building 2','제2공학관')},{code:'Y9',name:l('Hambak Hall','함박관')},{code:'Y12',name:l('Design Center','디자인조형센터')},{code:'Y13',name:l('Engineering Building 4','제4공학관')},{code:'Y19',name:l('Engineering Building 3','제3공학관')},{code:'Y23',name:l('Next-generation Science Hall','차세대과학관')},
];
const otherBuildings:BuildingCode[]=[{code:'Y1',name:l('Student Hall','학생회관')},{code:'Y21',name:l('Student Welfare Building','학생복지관')}];
const allKnownBuildings=[...CLASSROOM_BUILDINGS,...otherBuildings];
export type CampusKnowledge={sources:KnowledgeSource[];food:CampusFood[];busRoutes:BusRoute[];facts:CampusFact[];transportSummary?:Localized;transportSourceIds?:string[]};
/** Campus selection is authoritative. Sources and venues never fall back across campuses. */
export function getCampusKnowledge(campus:'yongin'|'seoul'='yongin'):CampusKnowledge {
  if(campus==='seoul')return {sources:SEOUL_KNOWLEDGE_SOURCES,food:SEOUL_CAMPUS_FOOD,busRoutes:SEOUL_BUS_ROUTES,facts:SEOUL_CAMPUS_FACTS,transportSummary:SEOUL_TRANSPORT_SUMMARY,transportSourceIds:SEOUL_TRANSPORT_SOURCE_IDS};
  return {sources:KNOWLEDGE_SOURCES,food:CAMPUS_FOOD,busRoutes:BUS_ROUTES,facts:CAMPUS_FACTS};
}
/** Exact known building codes, or the official code pattern + exactly three room digits.
 * Y123 means Engineering 1; Y12345 means Y12. No floor/room existence is inferred. */
export function resolveClassroomCode(input:string,campus:'yongin'|'seoul'='yongin'):{building:BuildingCode;roomCode:string|null;sourceId:string}|null {
  if(campus==='seoul')return resolveSeoulClassroomCode(input);
  const token=input.trim().toUpperCase();
  const exact=allKnownBuildings.find(b=>b.code===token);
  if(exact) return {building:exact,roomCode:null,sourceId:otherBuildings.includes(exact)?'mju-facilities-faq':'mju-room-codes'};
  for(const b of [...CLASSROOM_BUILDINGS].sort((a,b)=>b.code.length-a.code.length)) {
    if(new RegExp(`^${b.code}\\d{3}$`).test(token)) return {building:b,roomCode:token,sourceId:'mju-room-codes'};
  }
  return null;
}
const has=(q:string,words:string[])=>words.some(w=>/^[a-z0-9 ]+$/i.test(w)?new RegExp(`(?:^|[^a-z])${w}(?:$|[^a-z])`,'i').test(q):q.includes(w));
const unique=(items:string[])=>[...new Set(items)];
const mapCode=(code:string)=>code==='Y'?'Y_':code;
const placeDescriptionSources=(placeId:string):string[]=>{
  const description=getYonginPlaceDescription(placeId);
  return description?description.sourceUrls.flatMap(url=>KNOWLEDGE_SOURCES.filter(source=>source.url===url).map(source=>source.id)):[];
};
function referenceAnswer(reference:typeof REFERENCE_CAMPUS.features[number],language:Language):ChatAnswer {
  const description=getYonginPlaceDescription(reference.id);
  const note=reference.code==='Y32'&&reference.note?localize(reference.note,language):'';
  return {answer:[localize(reference.name,language)+(reference.code?' · '+reference.code:''),description?localize(description.description,language):'',note].filter(Boolean).join('\n'),citations:unique([...placeDescriptionSources(reference.id),...(reference.marker?['mju-campus-directory']:[]),...(reference.code==='Y32'||!reference.marker?['user-campus-reference']:[])]),placeCodes:reference.code?[reference.code]:[],placeIds:[reference.id],status:reference.marker&&reference.code!=='Y32'?'supported':'limited'};
}

export function answerQuestion(query:string,language:Language='en',campus:'yongin'|'seoul'='yongin'):ChatAnswer {
  if(campus==='seoul')return answerSeoulQuestion(query,language);
  const q=query.normalize('NFKC').toLowerCase().slice(0,2000);
  const t=(en:string,ko:string,zh=KNOWLEDGE_ZH[en]||en)=>language==='ko'?ko:language==='zh'?zh:en;
  const unknown=():ChatAnswer=>({answer:t('Try a building name or code, food, buses, library or printing. For a classroom, enter the full code from your timetable, such as Y9228.','건물 이름이나 코드, 식사, 버스, 도서관 또는 인쇄에 대해 질문하세요. 강의실은 시간표의 전체 코드(예: Y9228)를 입력하세요.','可以询问建筑名称或编号、餐饮、校车、图书馆或打印。查找教室时，请输入课表中的完整编号，例如Y9228。'),citations:[],placeCodes:[],status:'unknown'});
  if(!q.trim())return unknown();
  const exactReference=REFERENCE_CAMPUS.features.find(f=>(!!f.code&&q.trim()===f.code.toLowerCase())||(['en','ko','zh'] as Language[]).some(lang=>q.trim()===localize(f.name,lang).normalize('NFKC').toLowerCase()));
  if(exactReference)return referenceAnswer(exactReference,language);
  if(/(?:^|[^a-z0-9])s\d+(?=$|[^a-z0-9])/i.test(q))return {answer:t('Switch to Seoul to look up an S building or classroom code.','S 건물·강의실 코드는 서울캠퍼스로 전환해 검색하세요.','请切换至首尔校区查询S开头的建筑或教室编号。'),citations:[],placeCodes:[],status:'unknown'};
  // A named destination can contain "bus"; location questions still need its map action.
  if(has(q,['where','location','locate','find','어디','위치','찾','哪里','在哪','位置'])&&!has(q,['hours','time','schedule','price','cost','open','close','영업','운행','시간','가격','时刻','时间','营业','价格'])){
    const destination=REFERENCE_CAMPUS.features.find(f=>f.id==='mju-bus-office'&&(['en','ko','zh'] as Language[]).some(lang=>q.includes(localize(f.name,lang).normalize('NFKC').toLowerCase())));
    if(destination)return referenceAnswer(destination,language);
  }
  if(has(q,['bus','buses','shuttle','giheung','station','버스','셔틀','기흥','명지대역','校车','公交','巴士','班车','接驳','器兴','地铁']))return {answer:t('Open Buses for the university’s dated 2026 second-semester timetable, valid September 1–December 14. It lists 54 station and 10 downtown campus departures on non-holiday weekdays, and 10 weekend / holiday shuttle trips. Giheung does not operate on weekends or public holidays. Extra station ↔ Myeongjin Hall shuttles are announced for 08:30–10:50 and 15:00–17:30, without individual departure times. Times use Seoul time and the stated origin. Today’s operation, public-holiday calendar and live arrivals are unconfirmed. Check a newer notice for seasonal terms or vacations.','버스 탭에서 2026학년도 2학기 공식 시간표(9월 1일~12월 14일)를 확인하세요. 공휴일을 제외한 평일 교내 출발은 명지대역 54회, 시내 10회이며 주말·공휴일 셔틀은 10회입니다. 기흥역 버스는 주말과 공휴일에 운행하지 않습니다. 08:30~10:50 및 15:00~17:30에 명지대역 ↔ 명진당 추가 운행이 있으나 개별 출발시각은 명시되지 않았습니다. 시간은 표시된 출발지 기준 한국 시간입니다. 오늘 실제 운행, 공휴일 달력과 실시간 도착정보는 미확인입니다. 계절학기와 방학은 새 공지를 확인하세요.'),citations:['mju-transport-2026-2','mju-transport-2026-2-pdf'],placeCodes:[],status:'limited'};
  // Sensitive operational details must be explicitly unknown before generic food retrieval.
  if(has(q,['open now','opening','hours','close','price','cost','cheap','budget','vegan','halal','allergy','allergen','gluten','영업','몇 시','가격','얼마','저렴','채식','할랄','알레르기','营业','几点','价格','多少钱','便宜','预算','素食','清真','过敏','无麸质']))return {answer:t('Current hours, prices and dietary or allergen suitability are not verified. Confirm these with the venue before visiting.','현재 운영 시간, 가격, 식이·알레르기 적합성은 미확인입니다. 방문 전 매장에 확인하세요.','当前营业时间、价格及特殊饮食或过敏原适用性尚未核实，请在前往前向店家确认。'),citations:['mju-welfare'],placeCodes:[],status:'unknown'};
  const coffee=has(q,['coffee','cafe','cafes','café','cafés','커피','카페','咖啡']);
  const eating=has(q,['eat','food','lunch','dinner','breakfast','restaurant','restaurants','cafeteria','식사','밥','식당','먹','점심','저녁','吃','餐厅','食堂','午餐','晚餐','早餐']);
  const store=has(q,['convenience','snack','snacks','store','stores','편의점','간식','便利店','零食','商店']);
  const codes=(q.toUpperCase().match(/(?:^|[^A-Z0-9])Y\d*(?=$|[^A-Z0-9])/g)||[]).map(s=>s.replace(/^[^Y]*/,''));
  if(has(q,['instagram','stories','story','menu','menus','oulami','o_ulami','mjhs_lounge','mju_lounge','mj_bokji_foodist','인스타그램','인스타','스토리','식단','메뉴','어우라미','菜单','快拍']))return {answer:t('Open Food for official weekly menus and saved menu updates. The student guide lists @mjhs_lounge, @mju_lounge and @mj_bokji_foodist for cafeteria menus in Stories, and @O_ulami for international student activities. Profiles open in your browser. Check the menu date before visiting.','음식 탭에서 공식 주간 식단과 저장된 식단 소식을 확인하세요. 학생 안내서는 식당 스토리 계정 @mjhs_lounge, @mju_lounge, @mj_bokji_foodist와 국제 학생 활동 계정 @O_ulami를 소개합니다. 계정은 브라우저에서 열립니다. 방문 전 식단 날짜를 확인하세요.','在餐饮页查看官方每周菜单及已保存的菜单更新。学生指南列出的食堂快拍账号为@mjhs_lounge、@mju_lounge和@mj_bokji_foodist，国际学生活动账号为@O_ulami。账号将在浏览器中打开，前往前请确认菜单日期。'),citations:['mju-menu-library','mju-menu-student','mju-menu-dorm','notion-guide-pdf','mju-oulami'],placeCodes:[],status:'limited'};
  const resolved=codes.map(code=>resolveClassroomCode(code)).filter((v):v is NonNullable<typeof v>=>v!==null);
  if(resolved.length&&!coffee&&!eating&&!store) {
    const text=resolved.map(r=>{
      const place=REFERENCE_CAMPUS.features.find(f=>f.code===mapCode(r.building.code));
      const description=place?getYonginPlaceDescription(place.id):undefined;
      const heading=r.roomCode?r.roomCode+' → '+localize(r.building.name,language)+' ('+r.building.code+')':localize(place?.name||r.building.name,language)+' · '+mapCode(r.building.code);
      return heading+(!r.roomCode&&description?'\n'+localize(description.description,language):'');
    }).join('\n\n');
    const hasRoom=resolved.some(r=>r.roomCode);
    const roomNote=hasRoom?t('This identifies the building but does not verify room existence, floor or your class assignment. Confirm the full room code on your timetable or with your instructor.','건물은 식별되지만 해당 호실의 존재, 층이나 수업 배정은 확인되지 않습니다. 전체 강의실 코드는 시간표나 담당 교수에게 확인하세요.','此编号可识别建筑，但不确认教室的存在、楼层或课程安排。请通过课表或任课教师确认完整教室编号。'):'';
    return {answer:[text,roomNote].filter(Boolean).join('\n\n'),citations:unique(resolved.flatMap(r=>{
      const place=REFERENCE_CAMPUS.features.find(f=>f.code===mapCode(r.building.code));
      return [r.sourceId,...(!r.roomCode&&place?placeDescriptionSources(place.id):[])];
    })),placeCodes:unique(resolved.map(r=>mapCode(r.building.code))),status:hasRoom?'limited':'supported'};
  }
  const reference=REFERENCE_CAMPUS.features.find(f=>(f.code&&codes.includes(f.code))||(['en','ko','zh'] as Language[]).some(lang=>q.includes(localize(f.name,lang).normalize('NFKC').toLowerCase())));
  if(reference&&!coffee&&!eating&&!store)return referenceAnswer(reference,language);
  if((codes.length&&!resolved.length)||has(q,['class','classroom','lecture','room','강의','수업','호실','上课','教室','课程','课表']))return {answer:t('Enter the full classroom code from your timetable, such as Y9228, or a building name and room number. A course or major alone does not identify your classroom.','시간표의 전체 강의실 코드(예: Y9228) 또는 건물 이름과 호수를 입력하세요. 과목이나 전공만으로 강의실을 찾을 수는 없습니다.','请输入课表中的完整教室编号，例如Y9228，或建筑名称和房间号。仅凭课程或专业无法确定教室。'),citations:['mju-room-codes'],placeCodes:[],status:'unknown'};
  if(coffee||eating||store){
    const venues=CAMPUS_FOOD.filter(v=>(coffee?v.kind==='cafe':store?v.kind==='convenience':v.kind==='cafeteria'||v.kind==='restaurant')&&(!resolved.length||resolved.some(r=>r.building.code===v.placeCode))).slice(0,6);
    if(!venues.length)return {answer:t('No matching venue is saved for this building. Open Food to browse the campus options.','이 건물에 해당하는 매장 정보가 저장되어 있지 않습니다. 음식 탭에서 교내 매장을 확인하세요.','尚未保存该建筑内符合条件的店家信息，请在餐饮页浏览校内地点。'),citations:['mju-welfare'],placeCodes:unique(resolved.map(r=>mapCode(r.building.code))),status:'unknown'};
    return {answer:venues.map(v=>localize(v.name,language)+' · '+localize(v.location,language)+' ('+v.placeCode+')').join('\n')+'\n\n'+t('Check current hours and prices before visiting.','방문 전 최신 운영 시간과 가격을 확인하세요.','前往前请确认最新营业时间和价格。'),citations:unique(venues.flatMap(v=>v.sourceIds)),placeCodes:unique(venues.map(v=>v.placeCode).filter((v):v is string=>v!==null)),status:'supported'};
  }
  const fact=CAMPUS_FACTS.find(f=>has(q,f.keywords));
  if(fact)return {answer:localize(fact.text,language),citations:fact.sourceIds,placeCodes:fact.placeCodes,status:fact.status};
  const building=allKnownBuildings.find(b=>q.includes(b.name.en.toLowerCase())||q.includes(b.name.ko)||(!!b.name.zh&&q.includes(b.name.zh)));
  if(building){
    const reference=REFERENCE_CAMPUS.features.find(f=>f.code===mapCode(building.code));
    const description=reference?getYonginPlaceDescription(reference.id):undefined;
    return {answer:[localize(building.name,language)+' · '+mapCode(building.code),description?localize(description.description,language):''].filter(Boolean).join('\n'),citations:unique([otherBuildings.includes(building)?'mju-facilities-faq':'mju-room-codes',...(reference?placeDescriptionSources(reference.id):[])]),placeCodes:[mapCode(building.code)],status:'supported'};
  }
  return unknown();
}
