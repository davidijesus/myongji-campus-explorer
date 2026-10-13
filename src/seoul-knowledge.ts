import type { Language, Localized } from './types';
import type { KnowledgeSource, CampusFood, CampusFact, BusRoute, ChatAnswer } from './knowledge';
import { SEOUL_DIRECTORY_URL, SEOUL_REFERENCE_FEATURES, SEOUL_BUILDING_CONTENT, SEOUL_BUILDING_SOURCES, SEOUL_CONTENT_CHECKED } from './seoul';
import { localize } from './i18n';

const l=(en:string,ko:string,zh:string):Localized=>({en,ko,zh});
export const SEOUL_KNOWLEDGE_CHECKED_AT='2026-10-01';
const source=(id:string,title:Localized,url:string,note:Localized,publishedAt:string|null=null,checkedAt=SEOUL_KNOWLEDGE_CHECKED_AT):KnowledgeSource=>({id,title,url,note,publishedAt,kind:'official',status:'checked',checkedAt});
const buildingSourceNotes:Record<string,Localized>={
  'seoul-college-offices':l('College academic administration locations.','단과대학 교학팀 위치 안내.','各学院教务办公室位置。'),
  'seoul-student-affairs':l('Student support, disability support and counseling locations.','학생지원팀, 장애학생지원센터 및 상담센터 위치 안내.','学生支援、残障学生支援及咨询中心位置。'),
  'seoul-health-center':l('Health Center location and services.','보건의료센터 위치와 서비스 안내.','保健医疗中心位置与服务。'),
  'seoul-international-affairs':l('International Exchange Support Team location.','국제교류지원팀 위치 안내.','国际交流支援组位置。'),
  'seoul-residence':l('Humanities Campus housing and shared facilities.','인문생활관 및 공용시설 소개.','人文校区宿舍与公共设施介绍。'),
  'seoul-facility-locations':l('Student Union café and post office locations. Other historical entries are not used.','학생회관 카페와 우체국 위치. 다른 과거 항목은 사용하지 않습니다.','学生活动馆咖啡厅和邮局位置，未采用其他历史条目。'),
  'seoul-library-introduction':l('2023 library introduction; used for the building’s library identity.','2023년 도서관 소개로 건물의 도서관 용도만 사용합니다.','2023年图书馆介绍，仅用于确认建筑的图书馆用途。'),
  'seoul-mcc-facilities':l('Veritas Hall educational facilities and Koinonia Hall shops and services.','베리타스홀 교육시설 및 코이노니아홀 상업·복지시설 소개.','Veritas Hall教学设施与Koinonia Hall商业和服务设施介绍。'),
  'seoul-graduate-office':l('Graduate administration directions to Veritas Hall.','베리타스홀 대학원교학팀 찾아오는 길.','前往Veritas Hall研究生院教务组的地址。'),
};
export const SEOUL_KNOWLEDGE_SOURCES:KnowledgeSource[]=[
  ...SEOUL_BUILDING_SOURCES.map(s=>source(s.id,s.title,s.url,buildingSourceNotes[s.id]!,s.id==='seoul-library-introduction'?'2023-05-17':null,SEOUL_CONTENT_CHECKED)),
  source('seoul-directory',l('Myongji · Seoul campus directory','명지대학교 · 인문캠퍼스 안내','明知大学 · 首尔校区目录'),SEOUL_DIRECTORY_URL,l('Official names and directory markers, not surveyed footprints, entrances or classroom assignments.','공식 이름과 목록 표식이며 실측 외곽·출입구·강의실 배정 자료가 아닙니다.','官方名称和目录标记，不是实测建筑轮廓、入口或教室安排。')),
  source('seoul-welfare',l('Myongji · Humanities Campus facilities','명지대학교 · 인문캠퍼스 복지시설','明知大学 · 人文校区生活设施'),'https://www.mju.ac.kr/mjukr/489/subview.do',l('University facility list without an effective date. Some building labels are historical; current hours and prices are not supplied.','적용일이 없는 대학 시설 목록입니다. 일부 건물명은 이전 명칭이며 현재 운영시간과 가격은 제공하지 않습니다.','大学设施表未注明生效日期。部分建筑使用旧称，未提供当前营业时间或价格。'),null,SEOUL_CONTENT_CHECKED),
  source('seoul-directions',l('Myongji · public transport to Seoul campus','명지대학교 · 인문캠퍼스 교통 안내','明知大学 · 首尔校区公共交通'),'https://www.mju.ac.kr/mjukr/508/subview.do',l('Official bus-route and subway-transfer list; no departure timetable or live arrivals. The page warns routes can change without notice.','공식 시내버스 노선과 지하철 환승 안내입니다. 출발 시간표나 실시간 도착정보가 아니며 예고 없이 변경될 수 있다고 안내합니다.','官方公交线路和地铁换乘列表，不含发车时刻或实时到站信息。页面提示线路可能不经预告变更。')),
  source('seoul-shuttle-ended',l('Myongji · trial shuttle ends October 1, 2026','명지대학교 · 2026년 10월 1일 시범 셔틀 종료','明知大学 · 试运行校车于2026年10月1日结束'),'https://www.mju.ac.kr/bbs/mjukr/141/235890/artclView.do',l('Ends the September trial between the two campuses and the Sadang–Natural Campus trial. Does not cancel the separate regular Yongin station/downtown/Giheung timetable.','9월 시범운행한 캠퍼스 간 노선과 사당역–자연캠퍼스 노선의 종료 공지입니다. 별도 정규 용인 명지대역·시내·기흥역 시간표를 취소하는 공지가 아닙니다.','结束9月试运行的两校区间线路及舍堂站—自然校区线路，不涉及另行公布的龙仁车站、市区及器兴站常规时刻表。'),'2026-09-30'),
  source('seoul-classroom-guide',l('Myongji · classroom guide and conflicting MCC entry','명지대학교 · 강의실 안내와 MCC 표기 차이','明知大学 · 教室指南及MCC编号差异'),'https://www.mju.ac.kr/bbs/gs/195/174672/download.do',l('Lists S1 General Hall, S3 Mirae Hall and S4 International Hall. Its undated S11 MCC entry conflicts with dated 2026 S10 examples; S11 is not automatically resolved.','S1 종합관, S3 미래관, S4 국제관을 안내합니다. 적용일 미상 S11 MCC 표기는 2026년 공지의 S10 예시와 달라 S11을 자동 해석하지 않습니다.','列明S1综合馆、S3未来馆及S4国际馆。未注明日期的S11 MCC条目与2026年公告的S10示例冲突，因此不自动解析S11。')),
  source('seoul-classroom-2026',l('Myongji · 2026 classroom-code explanation','명지대학교 · 2026년 강의실 번호 안내','明知大学 · 2026年教室编号说明'),'https://www.mju.ac.kr/bbs/mjukr/466/234268/artclView.do',l('Explicit example: S10303 means S10 (MCC), floor 3, room 03. This explains the numbering; it does not verify a student’s class assignment or every possible room.','S10303은 S10(MCC관) 3층 03호라는 예시입니다. 번호 규칙 안내이며 학생 개인 수업 배정이나 가능한 모든 호실의 존재를 확인하지 않습니다.','明确示例：S10303为S10（MCC）3层03室。这是编号说明，不确认学生的课程安排，也不确认所有可能编号的教室都存在。'),'2026-08-07'),
  source('seoul-building-numbers',l('Myongji · 2024 Seoul building-number guide','명지대학교 · 2024년 인문 건물번호 안내','明知大学 · 2024年首尔建筑编号指南'),'https://www.mju.ac.kr/bbs/ice1/1157/156902/download.do',l('Historical guide for building numbers 1, 2, 3, 4, 5, 8, 9 and 10. Building selection is distinct from confirming a room or its current use.','1·2·3·4·5·8·9·10번 건물을 설명하는 2024년 안내입니다. 건물 선택은 호실의 존재나 현재 용도 확인과 다릅니다.','2024年指南介绍1、2、3、4、5、8、9、10号楼。识别建筑并不确认某房间的存在或当前用途。')),
  source('seoul-breakfast-2026',l('Myongji · 2026-2 Seoul breakfast programme','명지대학교 · 2026-2 인문 천원의 아침밥','明知大学 · 2026年第二学期首尔早餐项目'),'https://www.mju.ac.kr/bbs/mjukr/141/235827/artclView.do',l('Dated breakfast programme at Student Union 3F; these are programme hours, not all-day cafeteria hours.','학생회관 3층 조식 운영계획이며 식당 전체 영업시간이 아닙니다.','学生活动馆3楼的早餐项目安排；项目时间并非食堂全天营业时间。'),'2026-09-29',SEOUL_CONTENT_CHECKED),
];

const food=(id:string,name:Localized,kind:CampusFood['kind'],placeCode:string|null,location:Localized):CampusFood=>({id,name,kind,placeCode,location,sourceIds:['seoul-welfare'],hours:null,price:null,note:l('','','')});
export const SEOUL_CAMPUS_FOOD:CampusFood[]=[
  food('seoul-student-cafeteria',l('Student cafeteria','학생식당','学生食堂'),'cafeteria','S2',l('Student Union · 3F','학생회관 · 3층','学生活动馆 · 3层')),
  food('seoul-student-cafe',l('Student Union coffee shop','학생회관 커피전문점','学生活动馆咖啡店'),'cafe','S2',l('Student Union · 3F','학생회관 · 3층','学生活动馆 · 3楼')),
  food('seoul-main-store',l('Main Building shop','본관 매점','本馆商店'),'convenience',null,l('Main Building (본관) · 4F','본관 · 4층','本馆（본관）· 4楼')),
  food('seoul-admin-store',l('Administration convenience store','행정동 편의점','行政楼便利店'),'convenience','S5',l('Administration Building · 1F','행정동 · 1층','行政楼 · 1层')),
];
SEOUL_CAMPUS_FOOD[0]!.sourceIds.push('seoul-breakfast-2026');
SEOUL_CAMPUS_FOOD[1]!.sourceIds.push('seoul-facility-locations');

export const SEOUL_TRANSPORT_SUMMARY=l(
  'The Seoul–Yongin trial shuttle ended on October 1, 2026. City buses: 7017, 7019, 7021, 7611, 7612 and 7713. From Jeungsan Station (Line 6), exit 2, take 7019, 7021 or 7611; from Hongik Univ. Station (Line 2), take 7612. Check current routes and arrivals before travelling.',
  '인문–자연캠퍼스 시범 셔틀은 2026년 10월 1일 종료되었습니다. 시내버스는 7017·7019·7021·7611·7612·7713입니다. 6호선 증산역 2번 출구에서 7019·7021·7611, 2호선 홍대입구역에서 7612로 환승하세요. 출발 전 현재 노선과 도착정보를 확인하세요.',
  '首尔—龙仁校区试运行接驳车已于2026年10月1日结束。市内公交：7017、7019、7021、7611、7612、7713。从6号线缯山站2号出口换乘7019、7021或7611；从2号线弘大入口站换乘7612。出发前请查询当前线路和到站信息。');
export const SEOUL_TRANSPORT_SOURCE_IDS=['seoul-shuttle-ended','seoul-directions'];
/** City route numbers are not departure timetables. The intercampus trial has ended. */
export const SEOUL_BUS_ROUTES:BusRoute[]=[];
export const SEOUL_CAMPUS_FACTS:CampusFact[]=[
  {id:'seoul-breakfast',keywords:['breakfast','morning meal','천원','조식','아침밥','早餐','早饭'],placeCodes:['S2'],sourceIds:['seoul-breakfast-2026'],status:'limited',text:l('The 1,000-won breakfast programme runs at Student Union (S2), floor 3, September 1–December 14, 2026: weekdays excluding public holidays, 08:00–09:00, while portions last. Enrolled undergraduate and graduate students scan their mobile library pass. These are breakfast programme hours, not all-day cafeteria hours.','천원의 아침밥은 학생회관(S2) 3층에서 2026년 9월 1일~12월 14일 공휴일 제외 평일 08:00~09:00에 운영하며 수량 소진 시 마감합니다. 학부·대학원 재학생은 모바일 열람증을 태그해 이용하세요. 조식 운영시간이며 식당 전체 영업시간은 아닙니다.','一千韩元早餐项目位于学生活动馆（S2）3楼，2026年9月1日至12月14日非节假日工作日08:00–09:00供应，售完即止。在读本科生和研究生需扫描移动阅览证。这是早餐项目时间，并非食堂全天营业时间。')},
  {id:'seoul-library',keywords:['library','book','borrow','도서관','책','图书馆','借书'],placeCodes:['S9'],sourceIds:['seoul-library-introduction'],status:'supported',text:l('Bangmok Academic Information Center (S9) is the Humanities Campus library. Check the library website for access and opening hours.','방목학술정보관(S9)은 인문캠퍼스 도서관입니다. 출입 방법과 운영시간은 도서관 홈페이지에서 확인하세요.','Bangmok学术信息馆（S9）是人文校区图书馆。入馆方式和开放时间请查看图书馆网站。')},
  {id:'seoul-printing',keywords:['print','printing','copy','scan','인쇄','프린트','복사','스캔','打印','复印','扫描'],placeCodes:['S9'],sourceIds:['seoul-welfare'],status:'limited',text:l('The copying room is on floor 3 of Bangmok Academic Information Center (S9). Check services and charges at the counter.','복사실은 방목학술정보관(S9) 3층에 있습니다. 이용 서비스와 요금은 현장에서 확인하세요.','复印室位于Bangmok学术信息馆（S9）3楼。具体服务和费用请向柜台确认。')},
  {id:'seoul-bank',keywords:['bank','atm','은행','현금','银行','取款'],placeCodes:['S5'],sourceIds:['seoul-welfare'],status:'limited',text:l('Hana Bank and an ATM are on floor 1 of the Administration Building (S5). Check bank opening hours before visiting.','하나은행과 현금지급기는 행정동(S5) 1층에 있습니다. 방문 전 은행 운영시간을 확인하세요.','韩亚银行和自动取款机位于行政楼（S5）1楼。前往银行前请确认营业时间。')},
  {id:'seoul-post',keywords:['post','mail','parcel','우체','우편','택배','邮局','邮寄','快递'],placeCodes:['S2'],sourceIds:['seoul-facility-locations','seoul-welfare'],status:'limited',text:l('The post office is on floor 1 of Student Union (S2). Check opening hours before taking your parcel.','우체국은 학생회관(S2) 1층에 있습니다. 우편물을 가져가기 전에 운영시간을 확인하세요.','邮局位于学生活动馆（S2）1楼。寄件前请确认营业时间。')},
  ...[
    {id:'seoul-student-support',code:'S1',keywords:['student support','student affairs','학생지원','学生支援','学生事务']},
    {id:'seoul-health-support',code:'S4',keywords:['health center','clinic','disability','counseling','counselling','보건','장애학생','상담센터','保健','医疗','残障','咨询中心']},
    {id:'seoul-exchange-support',code:'S5',keywords:['international exchange','international office','국제교류','国际交流']},
    {id:'seoul-future-office',code:'S3',keywords:['future convergence','미래융합','未来融合']},
    {id:'seoul-business-office',code:'S10',keywords:['business office','business administration office','경영대학교학','经营学院教务','graduate administration','대학원교학','研究生院教务']},
    {id:'seoul-residence-info',code:'S8',keywords:['dorm','dormitory','residence','housing','기숙사','생활관','宿舍']},
  ].map(({id,code,keywords}):CampusFact=>({id,keywords,placeCodes:[code],sourceIds:SEOUL_BUILDING_CONTENT[code]!.sourceIds,status:'supported',text:SEOUL_BUILDING_CONTENT[code]!.description})),
];

export type SeoulCode={code:string;name:Localized;roomPattern:boolean;sourceId:string};
export const SEOUL_CLASSROOM_BUILDINGS:SeoulCode[]=[
  {code:'S1',name:l('General Hall','종합관','综合馆'),roomPattern:true,sourceId:'seoul-classroom-guide'},
  {code:'S2',name:l('Student Union','학생회관','学生活动馆'),roomPattern:false,sourceId:'seoul-building-numbers'},
  {code:'S3',name:l('Mirae Hall','미래관','未来馆'),roomPattern:true,sourceId:'seoul-classroom-guide'},
  {code:'S4',name:l('International Hall','국제관','国际馆'),roomPattern:true,sourceId:'seoul-classroom-guide'},
  {code:'S5',name:l('Administration Building','행정동','行政楼'),roomPattern:false,sourceId:'seoul-building-numbers'},
  {code:'S8',name:l('Humanities Residence','생활관(인문)','人文校区宿舍'),roomPattern:false,sourceId:'seoul-building-numbers'},
  {code:'S9',name:l('Bangmok Academic Information Center','방목학술정보관','Bangmok学术信息馆'),roomPattern:false,sourceId:'seoul-building-numbers'},
  {code:'S10',name:l('MCC · Myongji Campus Complex','MCC관','MCC · 明知校园综合楼'),roomPattern:true,sourceId:'seoul-classroom-2026'},
];

/** Resolve only source-supported room patterns. S11's conflicting MCC entry is not guessed. */
export function resolveSeoulClassroomCode(input:string):{building:SeoulCode;roomCode:string|null;sourceId:string}|null {
  const token=input.trim().toUpperCase();
  const exact=SEOUL_CLASSROOM_BUILDINGS.find(b=>b.code===token);
  if(exact)return {building:exact,roomCode:null,sourceId:exact.sourceId};
  for(const b of [...SEOUL_CLASSROOM_BUILDINGS].filter(b=>b.roomPattern).sort((a,b)=>b.code.length-a.code.length)){
    if(new RegExp(`^${b.code}\\d{3}$`).test(token))return {building:b,roomCode:token,sourceId:b.sourceId};
  }
  return null;
}
const has=(q:string,words:string[])=>words.some(w=>/^[a-z0-9 ]+$/i.test(w)?new RegExp(`(?:^|[^a-z])${w}(?:$|[^a-z])`,'i').test(q):q.includes(w));
const unique=(items:string[])=>[...new Set(items)];

export function answerSeoulQuestion(query:string,language:Language='en'):ChatAnswer {
  const q=query.normalize('NFKC').toLowerCase().slice(0,2000);
  const t=(en:string,ko:string,zh:string)=>localize(l(en,ko,zh),language);
  const unknown=():ChatAnswer=>({answer:t('No saved answer for this question. Try a building name, a full classroom code such as S10303, food, transport, the library or printing.','저장된 답변이 없습니다. 건물명, S10303 같은 전체 강의실 코드, 식사, 교통, 도서관 또는 인쇄를 질문하세요.','暂无此问题的已保存答案。请尝试建筑名称、S10303等完整教室编号、餐饮、交通、图书馆或打印。'),citations:[],placeCodes:[],status:'unknown'});
  if(!q.trim())return unknown();
  const transport=has(q,['bus','buses','shuttle','transport','subway','station','7017','7019','7021','7611','7612','7713','버스','셔틀','교통','지하철','홍대입구','증산역','校车','公交','巴士','接驳','交通','地铁','弘大入口','缯山']);
  if(/(?:^|[^a-z0-9])y\d*(?=$|[^a-z0-9])/i.test(q)||(!transport&&has(q,['yongin','natural campus','용인','자연캠퍼스','龙仁','自然校区'])))return {answer:t('Switch to Yongin to find Y building codes or Yongin facilities.','Y 건물 코드나 용인 시설을 찾으려면 용인캠퍼스로 전환하세요.','查询Y开头的建筑编号或龙仁设施时，请切换至龙仁校区。'),citations:[],placeCodes:[],status:'unknown'};
  if(transport)return {answer:localize(SEOUL_TRANSPORT_SUMMARY,language),citations:[...SEOUL_TRANSPORT_SOURCE_IDS],placeCodes:[],status:'limited'};
  const sensitive=has(q,['open now','opening','hours','close','price','cost','cheap','budget','vegan','halal','allergy','allergen','gluten','영업','몇 시','가격','얼마','저렴','채식','할랄','알레르기','营业','几点','价格','多少钱','便宜','预算','素食','清真','过敏','无麸质']);
  if(sensitive)return {answer:t('Check current hours, prices and dietary or allergen information with the venue. The breakfast notice covers only its dated programme.','현재 운영시간, 가격, 식이·알레르기 정보는 매장에 확인하세요. 조식 공지는 해당 기간의 프로그램만 안내합니다.','当前营业时间、价格及特殊饮食或过敏原信息请向店家确认。早餐公告仅适用于其注明日期的项目。'),citations:['seoul-welfare','seoul-breakfast-2026'],placeCodes:[],status:'unknown'};
  const codes=(q.toUpperCase().match(/(?:^|[^A-Z0-9])S\d+(?=$|[^A-Z0-9])/g)||[]).map(s=>s.replace(/^[^S]*/,''));
  const resolved=codes.map(resolveSeoulClassroomCode).filter((r):r is NonNullable<typeof r>=>r!==null);
  if(codes.some(code=>!resolveSeoulClassroomCode(code)))return {answer:t('I cannot resolve that room code. Confirm the full code and building with your timetable or instructor. For MCC, the 2026 notice uses S10; the older S11 entry conflicts with it.','해당 호실 코드를 찾지 못했습니다. 시간표나 담당 교수에게 전체 코드와 건물을 확인하세요. MCC는 2026년 공지에서 S10이며 이전 S11 표기와 다릅니다.','无法解析该教室编号。请通过课表或教师确认完整编号和建筑。2026年公告将MCC标为S10，与旧资料的S11不一致。'),citations:['seoul-classroom-guide','seoul-classroom-2026'],placeCodes:[],status:'unknown'};
  const coffee=has(q,['coffee','cafe','cafes','café','cafés','커피','카페','咖啡']);
  const eating=has(q,['eat','food','lunch','dinner','breakfast','restaurant','restaurants','cafeteria','식사','밥','식당','먹','점심','저녁','吃','餐厅','食堂','午餐','晚餐','早餐']);
  const store=has(q,['convenience','snack','snacks','store','stores','편의점','간식','便利店','零食','商店']);
  const reference=SEOUL_REFERENCE_FEATURES.find(f=>(!!f.code&&codes.includes(f.code))||Object.values(f.name).some(name=>!!name&&q.includes(name.normalize('NFKC').toLowerCase()))||(f.code==='S10'&&has(q,['mcc'])));
  if(resolved.length&&!coffee&&!eating&&!store){
    const roomQuery=resolved.some(r=>r.roomCode);
    const details=roomQuery?t('Building match only. Confirm the room and class with your timetable or instructor; entrances and indoor routes are not provided.','건물 검색 결과입니다. 호실과 수업은 시간표나 담당 교수에게 확인하세요. 출입구와 실내 경로는 제공하지 않습니다.','仅识别建筑。请通过课表或教师确认教室和课程；不提供入口及室内路线。'):unique(resolved.map(r=>r.building.code)).map(code=>localize(SEOUL_BUILDING_CONTENT[code]!.description,language)).join('\n');
    return {answer:`${resolved.map(r=>`${r.roomCode||r.building.code} → ${localize(r.building.name,language)} (${r.building.code})`).join('\n')}\n\n${details}`,citations:unique(resolved.flatMap(r=>[r.sourceId,...(roomQuery?[]:SEOUL_BUILDING_CONTENT[r.building.code]!.sourceIds)])),placeCodes:unique(resolved.map(r=>r.building.code)),status:roomQuery?'limited':'supported'};
  }
  if(has(q,['class','classroom','lecture','room','강의','수업','호실','上课','教室','课程','课表'])&&!resolved.length)return {answer:t('Enter your full classroom code, such as S10303. Your course or major alone does not identify a classroom; check your timetable or instructor.','S10303 같은 전체 강의실 코드를 입력하세요. 과목명이나 전공만으로 강의실을 찾을 수 없으니 시간표나 담당 교수에게 확인하세요.','请输入S10303等完整教室编号。仅凭课程或专业无法确定教室，请查看课表或向教师确认。'),citations:['seoul-classroom-2026'],placeCodes:[],status:'unknown'};
  const requested=unique([...resolved.map(r=>r.building.code),...(reference?.code?[reference.code]:[])]);
  const breakfast=SEOUL_CAMPUS_FACTS.find(f=>f.id==='seoul-breakfast');
  if(breakfast&&has(q,breakfast.keywords)&&!coffee&&!store&&(!requested.length||requested.includes('S2')))return {answer:localize(breakfast.text,language),citations:breakfast.sourceIds,placeCodes:breakfast.placeCodes,status:breakfast.status};
  if(coffee||eating||store){
    const venues=SEOUL_CAMPUS_FOOD.filter(v=>(coffee?v.kind==='cafe':store?v.kind==='convenience':v.kind==='cafeteria'||v.kind==='restaurant')&&(!requested.length||requested.includes(v.placeCode||'')));
    if(!venues.length)return {answer:t('No matching venue is saved for this building. Check the university facilities page for other options.','이 건물에 저장된 해당 매장이 없습니다. 다른 매장은 대학 복지시설 안내에서 확인하세요.','该建筑暂无已保存的匹配店家。其他选择请查看大学设施页面。'),citations:['seoul-welfare'],placeCodes:requested,status:'unknown'};
    return {answer:venues.map(v=>`${localize(v.name,language)} · ${localize(v.location,language)}${v.placeCode?` (${v.placeCode})`:''}`).join('\n'),citations:unique(venues.flatMap(v=>v.sourceIds)),placeCodes:unique(venues.map(v=>v.placeCode).filter((code):code is string=>code!==null)),status:'limited'};
  }
  const fact=SEOUL_CAMPUS_FACTS.find(f=>has(q,f.keywords));
  if(fact)return {answer:localize(fact.text,language),citations:fact.sourceIds,placeCodes:fact.placeCodes,status:fact.status};
  if(reference){
    const content=reference.code?SEOUL_BUILDING_CONTENT[reference.code]:undefined;
    return {answer:`${localize(reference.name,language)}${reference.code?` · ${reference.code}`:''}${content?`\n${localize(content.description,language)}`:''}`,citations:content?.sourceIds||['seoul-directory'],placeCodes:reference.code?[reference.code]:[],placeIds:[reference.id],status:'supported'};
  }
  return unknown();
}
