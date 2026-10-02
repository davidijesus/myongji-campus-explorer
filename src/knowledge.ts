import type { Language, Localized } from './types';
import { CAMPUS_DIRECTORY_URL, REFERENCE_CAMPUS } from './campus';
import { localize } from './i18n';
import { KNOWLEDGE_ZH } from './knowledge-zh';
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
  { id:'mju-campus-directory', title:l('Myongji · official campus directory','명지대학교 · 공식 캠퍼스 안내'), url:CAMPUS_DIRECTORY_URL, kind:'official', checkedAt:KNOWLEDGE_CHECKED_AT, publishedAt:null, status:'checked', note:l('Building names and directory markers checked for the illustrated map. Code labels come from the supplied illustration. Footprints, heights and entrances remain unverified.','그림 지도에 사용할 건물명과 목록 표식을 확인했습니다. 코드 표기는 제공된 삽화에서 가져왔습니다. 건물 외곽·높이·출입구는 미확인입니다.') },
  { id:'mju-transport', title:l('Myongji · general transport page (superseded schedule)','명지대학교 · 일반 교통 안내 (이전 시간표)'), url:'https://www.mju.ac.kr/mjukr/506/subview.do', kind:'official', checkedAt:KNOWLEDGE_CHECKED_AT, publishedAt:null, status:'checked', note:l('Its undated timetable is superseded in this app by the dated 2026 second-semester notice and PDF. Do not use this page for current departure times.','이 페이지의 적용일 미상 시간표 대신 2026학년도 2학기 공지와 첨부 PDF를 사용합니다. 현재 출발시간은 최신 공지에서 확인하세요.') },
  { id:'mju-transport-2026-2', title:l('Myongji · 2026 second-semester bus notice','명지대학교 · 2026학년도 2학기 버스 공지'), url:'https://irb.mju.ac.kr/bbs/mjukr/141/234852/artclView.do', kind:'official', checkedAt:'2026-09-30', publishedAt:'2026-08-31', status:'checked', note:l('Applies September 1–December 14, 2026. The notice says seasonal-term and vacation schedules will be announced again in December. No live service confirmation.','2026년 9월 1일~12월 14일 적용입니다. 계절학기와 방학 일정은 12월 재공지 예정이라고 안내합니다. 실시간 운행 확인 자료가 아닙니다.') },
  { id:'mju-transport-2026-2-pdf', title:l('Myongji · attached 2026-2 bus timetable (PDF)','명지대학교 · 2026-2 첨부 운행시간표 (PDF)'), url:'https://irb.mju.ac.kr/bbs/mjukr/141/180048/download.do', kind:'official', checkedAt:'2026-09-30', publishedAt:'2026-08-31', status:'checked', note:l('Page 1: semester station/downtown departures. Page 3: holiday shuttle and Giheung rows. Page 2 seasonal-term rows are not activated because the notice promises a later calendar announcement.','1쪽: 학기 중 명지대역·시내 출발시간. 3쪽: 공휴일 셔틀과 기흥역 운행표. 2쪽 계절학기 표는 운행일 재공지를 기다리므로 적용하지 않습니다.') },
  { id:'mju-welfare', title:l('Myongji · Natural Campus facilities','명지대학교 · 자연캠퍼스 복지시설'), url:'https://www.mju.ac.kr/mjukr/492/subview.do', kind:'official', checkedAt:KNOWLEDGE_CHECKED_AT, publishedAt:null, status:'checked', note:l('Locations and operators listed by Myongji. Current prices, hours and availability are not provided. English names are translations.','대학에 게시된 위치와 업체명입니다. 현재 가격, 영업시간과 영업 여부는 제공되지 않습니다. 영문 명칭은 번역입니다.') },
  { id:'mju-room-codes', title:l('Myongji · classroom code guide (PDF)','명지대학교 · 강의실 안내 (PDF)'), url:'https://www.mju.ac.kr/bbs/gs/195/174672/download.do', kind:'official', checkedAt:KNOWLEDGE_CHECKED_AT, publishedAt:null, status:'checked', note:l('Building code patterns only. Does not establish a room exists or that a class meets there.','건물 코드 규칙 안내입니다. 특정 강의실의 존재나 수업 배정을 확인하는 자료가 아닙니다.') },
  { id:'mju-facilities-faq', title:l('Myongji · student facilities FAQ','명지대학교 · 교내 시설 FAQ'), url:'https://mjtrans.mju.ac.kr/bbs/mjtrans/1003/215452/artclView.do', kind:'official', checkedAt:KNOWLEDGE_CHECKED_AT, publishedAt:'2024-09-26', status:'checked', note:l('Department guide updated September 2025. Building entrances can be on different floors because of slopes.','2025년 9월 수정된 학과 안내입니다. 경사로 인해 건물 입구별 층이 다를 수 있습니다.') },
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
  note:l('Officially listed location · hours and prices unverified','공식 안내에 등재된 위치 · 영업시간과 가격 미확인'),
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
  { id:'library', text:l('The university places the library in Myeongjin Hall (Y3). The supplied student guide describes a library-app QR code for entry and reservations; confirm current access rules with the library.','대학 안내에 따르면 도서관은 명진당(Y3)에 있습니다. 제공된 학생 안내는 도서관 앱 QR 입장과 좌석 예약을 설명합니다. 현재 이용 규정은 도서관에서 확인하세요.'), keywords:['library','book','borrow','reservation','도서관','책','열람','예약','图书馆','借书','阅览'], placeCodes:['Y3'],sourceIds:['mju-facilities-faq','notion-guide'],status:'limited' },
  { id:'printing',text:l('The official facilities list includes copying rooms at Y3 4F, Engineering Building 1 1F, Y23 4F, Y5 1F and Y19 basement. Current fees and opening hours are unverified.','공식 복지시설 안내에는 명진당 4층, 제1공학관 1층, 차세대과학관 4층, 제5공학관 1층, 제3공학관 지하층 복사실이 있습니다. 현재 요금과 운영시간은 미확인입니다.'),keywords:['print','scan','copy','printer','프린트','인쇄','복사','스캔','打印','复印','扫描'],placeCodes:['Y3','Y_','Y23','Y5','Y19'],sourceIds:['mju-welfare','mju-room-codes'],status:'supported'},
  { id:'bank',text:l('Hana Bank is listed at the Student Welfare Building (Y21), 1F. Hours are unverified.','하나은행은 학생복지관(Y21) 1층에 등재되어 있습니다. 운영시간은 미확인입니다.'),keywords:['bank','atm','은행','현금','银行','取款'],placeCodes:['Y21'],sourceIds:['mju-welfare','mju-facilities-faq'],status:'supported'},
  { id:'post',text:l('The university lists a postal counter in Student Hall (Y1), 1F. Hours are unverified.','대학 안내에 우편취급국은 학생회관(Y1) 1층에 있습니다. 운영시간은 미확인입니다.'),keywords:['post','mail','parcel','우체','우편','택배','邮局','邮寄','快递'],placeCodes:['Y1'],sourceIds:['mju-welfare','mju-facilities-faq'],status:'supported'},
  { id:'health',text:l('The university identifies a health room in Student Hall (Y1). The supplied student guide says 1F. Current hours and services are unverified; contact the center for details.','대학 안내에는 학생회관(Y1)에 보건실이 있습니다. 제공된 학생 안내는 1층으로 설명합니다. 현재 운영시간과 제공 서비스는 미확인이므로 센터에 확인하세요.'),keywords:['health','clinic','sick','nurse','보건','아파','병원','保健','医务','生病'],placeCodes:['Y1'],sourceIds:['mju-facilities-faq','notion-guide'],status:'limited'},
  { id:'guide-nearby',text:l('The supplied Notion snapshot suggests nearby restaurants and cafés, including Cafe Frog and Scoopy. Their current opening, addresses and prices have not been independently checked. Use the source guide links before visiting.','제공된 Notion 사본은 주변 식당과 Cafe Frog, Scoopy 등의 카페를 소개합니다. 현재 영업 여부, 주소, 가격은 별도로 확인되지 않았습니다. 방문 전 원문 안내 링크를 확인하세요.'),keywords:['nearby','outside','off campus','frog','scoopy','주변','교외','附近','校外'],placeCodes:[],sourceIds:['notion-guide'],status:'limited'},
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

export type ChatAnswer = {answer:string;citations:string[];placeCodes:string[];status:'supported'|'limited'|'unknown'};
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
export function answerQuestion(query:string,language:Language='en',campus:'yongin'|'seoul'='yongin'):ChatAnswer {
  if(campus==='seoul')return answerSeoulQuestion(query,language);
  const q=query.normalize('NFKC').toLowerCase().slice(0,2000);
  const t=(en:string,ko:string,zh=KNOWLEDGE_ZH[en]||en)=>language==='ko'?ko:language==='zh'?zh:en;
  const unknown=():ChatAnswer=>({answer:t('I do not have a verified answer in the saved sources. Ask about a building code, classroom code, food, coffee, buses, the library or printing. For a class, paste its building and full room code from your timetable; I cannot access your class schedule.','저장된 출처에서 확인된 답을 찾지 못했습니다. 건물·강의실 코드, 식사, 커피, 버스, 도서관, 인쇄에 대해 질문해 주세요. 수업은 본인 시간표의 건물과 전체 강의실 코드를 입력해 주세요. 개인 시간표에는 접근할 수 없습니다.'),citations:[],placeCodes:[],status:'unknown'});
  if(!q.trim())return unknown();
  if(/(?:^|[^a-z0-9])s\d+(?=$|[^a-z0-9])/i.test(q))return {answer:t('This is the Yongin campus guide. Switch to Seoul before asking about an S building or classroom code; I will not apply Yongin room rules to it.','현재 용인캠퍼스 안내입니다. S 건물·강의실 코드는 서울캠퍼스로 전환한 후 질문하세요. 용인 코드 규칙을 적용하지 않습니다.','当前选择的是龙仁校区。查询S开头的建筑或教室编号前请切换至首尔；不会将龙仁编号规则套用于首尔。'),citations:[],placeCodes:[],status:'unknown'};
  if(has(q,['bus','buses','shuttle','giheung','station','버스','셔틀','기흥','명지대역','校车','公交','巴士','班车','接驳','器兴','地铁']))return {answer:t('Open Buses for the university’s dated 2026 second-semester timetable, valid September 1–December 14. It lists 54 station and 10 downtown campus departures on non-holiday weekdays, and 10 weekend / holiday shuttle trips. Giheung does not operate on weekends or public holidays. Extra station ↔ Myeongjin Hall shuttles are announced for 08:30–10:50 and 15:00–17:30, without individual departure times. Times use Seoul time and the stated origin. Today’s operation, public-holiday calendar and live arrivals are unconfirmed. Check a newer notice for seasonal terms or vacations.','버스 탭에서 2026학년도 2학기 공식 시간표(9월 1일~12월 14일)를 확인하세요. 공휴일을 제외한 평일 교내 출발은 명지대역 54회, 시내 10회이며 주말·공휴일 셔틀은 10회입니다. 기흥역 버스는 주말과 공휴일에 운행하지 않습니다. 08:30~10:50 및 15:00~17:30에 명지대역 ↔ 명진당 추가 운행이 있으나 개별 출발시각은 명시되지 않았습니다. 시간은 표시된 출발지 기준 한국 시간입니다. 오늘 실제 운행, 공휴일 달력과 실시간 도착정보는 미확인입니다. 계절학기와 방학은 새 공지를 확인하세요.'),citations:['mju-transport-2026-2','mju-transport-2026-2-pdf'],placeCodes:[],status:'limited'};
  // Sensitive operational details must be explicitly unknown before generic food retrieval.
  if(has(q,['open now','opening','hours','close','price','cost','cheap','budget','vegan','halal','allergy','allergen','gluten','영업','몇 시','가격','얼마','저렴','채식','할랄','알레르기','营业','几点','价格','多少钱','便宜','预算','素食','清真','过敏','无麸质']))return {answer:t('Current opening hours, prices and dietary/allergen suitability are not verified in this app. The Notion snapshot contains undated hours and prices, so I cannot say they apply today. Check the venue or the university source before relying on them.','이 앱에는 현재 영업시간, 가격, 식이·알레르기 적합성에 대한 검증된 정보가 없습니다. Notion 사본의 시간과 가격은 작성일 미상이라 오늘도 적용된다고 안내할 수 없습니다. 매장 또는 대학 출처에 확인하세요.'),citations:['mju-welfare','notion-guide'],placeCodes:[],status:'unknown'};
  const coffee=has(q,['coffee','cafe','cafes','café','cafés','커피','카페','咖啡']);
  const eating=has(q,['eat','food','lunch','dinner','breakfast','restaurant','restaurants','cafeteria','식사','밥','식당','먹','점심','저녁','吃','餐厅','食堂','午餐','晚餐','早餐']);
  const store=has(q,['convenience','snack','snacks','store','stores','편의점','간식','便利店','零食','商店']);
  const codes=(q.toUpperCase().match(/(?:^|[^A-Z0-9])Y\d*(?=$|[^A-Z0-9])/g)||[]).map(s=>s.replace(/^[^Y]*/,''));
  const resolved=codes.map(code=>resolveClassroomCode(code)).filter((v):v is NonNullable<typeof v>=>v!==null);
  if(resolved.length&&!coffee&&!eating&&!store) {
    const text=resolved.map(r=>`${r.roomCode||r.building.code} → ${localize(r.building.name,language)} (${r.building.code})`).join('\n');
    return {answer:`${text}\n\n${t('This identifies the building using the official code guide. It does not verify room existence, floor, entrance, or your class assignment. Confirm your full room code with your timetable or instructor.','공식 코드 안내로 건물을 식별했습니다. 해당 호실의 존재, 층, 출입구나 본인 수업 배정을 확인한 것은 아닙니다. 전체 강의실 코드를 시간표 또는 담당 교수에게 확인하세요.')}`,citations:unique(resolved.map(r=>r.sourceId)),placeCodes:unique(resolved.map(r=>mapCode(r.building.code))),status:resolved.some(r=>r.roomCode)?'limited':'supported'};
  }
  const reference=REFERENCE_CAMPUS.features.find(f=>(f.code&&codes.includes(f.code))||q.includes(f.name.en.toLowerCase())||q.includes(f.name.ko)||(!!f.name.zh&&q.includes(f.name.zh)));
  if(reference&&!coffee&&!eating&&!store)return {answer:`${localize(reference.name,language)}${reference.code?' · '+reference.code:''}\n${(reference.note?localize(reference.note,language):null)||(reference.marker?t('The building name is in the campus directory; the code is from the supplied map. Select it on the schematic map. Entrances and paths are not surveyed.','건물명은 캠퍼스 안내, 코드는 제공된 지도에서 확인했습니다. 개략도에서 선택하세요. 출입구와 경로는 실측되지 않았습니다.'):t('This label comes from the supplied campus illustration and is not independently confirmed in the official directory. Its placement is approximate; entrances and paths are not surveyed.','이 표기는 제공된 캠퍼스 삽화에서 가져왔으며 공식 목록에서 별도로 확인되지 않았습니다. 배치는 근사치이며 출입구와 경로는 실측되지 않았습니다.'))}`,citations:reference.marker?['mju-campus-directory','user-campus-reference']:['user-campus-reference'],placeCodes:reference.code?[reference.code]:[],status:'limited'};
  if((codes.length&&!resolved.length)||has(q,['class','classroom','lecture','room','강의','수업','호실','上课','教室','课程','课表']))return {answer:t('Please provide the complete classroom code from your timetable, such as Y9228, or a building name plus room number. I cannot infer where a course meets from its subject, your major or your name. Unrecognized codes are not guessed.','시간표의 전체 강의실 코드(예: Y9228) 또는 건물명과 호수를 알려주세요. 과목명, 전공, 이름으로 수업 장소를 추정할 수 없습니다. 확인되지 않은 코드는 추측하지 않습니다.'),citations:['mju-room-codes'],placeCodes:[],status:'unknown'};
  if(coffee||eating||store){
    const venues=CAMPUS_FOOD.filter(v=>(coffee?v.kind==='cafe':store?v.kind==='convenience':v.kind==='cafeteria'||v.kind==='restaurant')&&(!resolved.length||resolved.some(r=>r.building.code===v.placeCode))).slice(0,6);
    if(!venues.length)return {answer:t('I do not have a sourced matching venue for that building. This does not mean none exists. Browse Food for the places listed by the university.','그 건물에서 요청한 종류의 매장을 출처로 확인하지 못했습니다. 매장이 없다는 뜻은 아닙니다. 음식 탭에서 대학에 등재된 장소를 확인하세요.'),citations:['mju-welfare'],placeCodes:unique(resolved.map(r=>mapCode(r.building.code))),status:'unknown'};
    return {answer:`${t('The university lists these places:','대학 안내에 등재된 장소입니다:')}\n${venues.map(v=>`${localize(v.name,language)} · ${localize(v.location,language)} (${v.placeCode})`).join('\n')}\n\n${t('Hours, prices and current availability are unverified. English names are translations.','영업시간, 가격과 현재 영업 여부는 미확인입니다. 영문 명칭은 번역입니다.')}`,citations:unique(venues.flatMap(v=>v.sourceIds)),placeCodes:unique(venues.map(v=>v.placeCode).filter((v):v is string=>v!==null)),status:'supported'};
  }
  const fact=CAMPUS_FACTS.find(f=>has(q,f.keywords));
  if(fact)return {answer:localize(fact.text,language),citations:fact.sourceIds,placeCodes:fact.placeCodes,status:fact.status};
  const building=allKnownBuildings.find(b=>q.includes(b.name.en.toLowerCase())||q.includes(b.name.ko)||(!!b.name.zh&&q.includes(b.name.zh)));
  if(building)return {answer:`${localize(building.name,language)} · ${building.code}\n${t('Select the building on the schematic map. Entrances and walking routes are not surveyed.','개략도에서 건물을 선택하세요. 출입구와 도보 경로는 실측되지 않았습니다.')}`,citations:[otherBuildings.includes(building)?'mju-facilities-faq':'mju-room-codes'],placeCodes:[mapCode(building.code)],status:'supported'};
  return unknown();
}

