import type { Language, Localized } from './types';
import type { KnowledgeSource, CampusFood, CampusFact, BusRoute, ChatAnswer } from './knowledge';
import { SEOUL_DIRECTORY_URL, SEOUL_REFERENCE_FEATURES } from './seoul';
import { localize } from './i18n';

const l=(en:string,ko:string,zh:string):Localized=>({en,ko,zh});
export const SEOUL_KNOWLEDGE_CHECKED_AT='2026-10-01';
const source=(id:string,title:Localized,url:string,note:Localized,publishedAt:string|null=null):KnowledgeSource=>({id,title,url,note,publishedAt,kind:'official',status:'checked',checkedAt:SEOUL_KNOWLEDGE_CHECKED_AT});
export const SEOUL_KNOWLEDGE_SOURCES:KnowledgeSource[]=[
  source('seoul-directory',l('Myongji · Seoul campus directory','명지대학교 · 인문캠퍼스 안내','明知大学 · 首尔校区目录'),SEOUL_DIRECTORY_URL,l('Official names and directory markers, not surveyed footprints, entrances or classroom assignments.','공식 이름과 목록 표식이며 실측 외곽·출입구·강의실 배정 자료가 아닙니다.','官方名称和目录标记，不是实测建筑轮廓、入口或教室安排。')),
  source('seoul-welfare',l('Myongji · Humanities Campus facilities','명지대학교 · 인문캠퍼스 복지시설','明知大学 · 人文校区生活设施'),'https://www.mju.ac.kr/mjukr/489/subview.do',l('Undated university list. Generic facility names are retained because operators are not specified. Current opening and prices are unverified.','적용일 미상의 대학 목록입니다. 업체명이 없으므로 시설 종류를 표시합니다. 현재 영업 여부와 가격은 미확인입니다.','大学设施列表未注明适用日期，未列经营者，因此保留设施类别名称。当前营业情况和价格未核实。')),
  source('seoul-directions',l('Myongji · public transport to Seoul campus','명지대학교 · 인문캠퍼스 교통 안내','明知大学 · 首尔校区公共交通'),'https://www.mju.ac.kr/mjukr/508/subview.do',l('Official bus-route and subway-transfer list; no departure timetable or live arrivals. The page warns routes can change without notice.','공식 시내버스 노선과 지하철 환승 안내입니다. 출발 시간표나 실시간 도착정보가 아니며 예고 없이 변경될 수 있다고 안내합니다.','官方公交线路和地铁换乘列表，不含发车时刻或实时到站信息。页面提示线路可能不经预告变更。')),
  source('seoul-shuttle-ended',l('Myongji · trial shuttle ends October 1, 2026','명지대학교 · 2026년 10월 1일 시범 셔틀 종료','明知大学 · 试运行校车于2026年10月1日结束'),'https://www.mju.ac.kr/bbs/mjukr/141/235890/artclView.do',l('Ends the September trial between the two campuses and the Sadang–Natural Campus trial. Does not cancel the separate regular Yongin station/downtown/Giheung timetable.','9월 시범운행한 캠퍼스 간 노선과 사당역–자연캠퍼스 노선의 종료 공지입니다. 별도 정규 용인 명지대역·시내·기흥역 시간표를 취소하는 공지가 아닙니다.','结束9月试运行的两校区间线路及舍堂站—自然校区线路，不涉及另行公布的龙仁车站、市区及器兴站常规时刻表。'),'2026-09-30'),
  source('seoul-classroom-guide',l('Myongji · classroom guide and conflicting MCC entry','명지대학교 · 강의실 안내와 MCC 표기 차이','明知大学 · 教室指南及MCC编号差异'),'https://www.mju.ac.kr/bbs/gs/195/174672/download.do',l('Lists S1 General Hall, S3 Mirae Hall and S4 International Hall. Its undated S11 MCC entry conflicts with dated 2026 S10 examples; S11 is not automatically resolved.','S1 종합관, S3 미래관, S4 국제관을 안내합니다. 적용일 미상 S11 MCC 표기는 2026년 공지의 S10 예시와 달라 S11을 자동 해석하지 않습니다.','列明S1综合馆、S3未来馆及S4国际馆。未注明日期的S11 MCC条目与2026年公告的S10示例冲突，因此不自动解析S11。')),
  source('seoul-classroom-2026',l('Myongji · 2026 classroom-code explanation','명지대학교 · 2026년 강의실 번호 안내','明知大学 · 2026年教室编号说明'),'https://www.mju.ac.kr/bbs/mjukr/466/234268/artclView.do',l('Explicit example: S10303 means S10 (MCC), floor 3, room 03. This explains the numbering; it does not verify a student’s class assignment or every possible room.','S10303은 S10(MCC관) 3층 03호라는 예시입니다. 번호 규칙 안내이며 학생 개인 수업 배정이나 가능한 모든 호실의 존재를 확인하지 않습니다.','明确示例：S10303为S10（MCC）3层03室。这是编号说明，不确认学生的课程安排，也不确认所有可能编号的教室都存在。'),'2026-08-07'),
  source('seoul-building-numbers',l('Myongji · 2024 Seoul building-number guide','명지대학교 · 2024년 인문 건물번호 안내','明知大学 · 2024年首尔建筑编号指南'),'https://www.mju.ac.kr/bbs/ice1/1157/156902/download.do',l('Historical guide for building numbers 1, 2, 3, 4, 5, 8, 9 and 10. Building selection is distinct from confirming a room or its current use.','1·2·3·4·5·8·9·10번 건물을 설명하는 2024년 안내입니다. 건물 선택은 호실의 존재나 현재 용도 확인과 다릅니다.','2024年指南介绍1、2、3、4、5、8、9、10号楼。识别建筑并不确认某房间的存在或当前用途。')),
  source('seoul-breakfast-2026',l('Myongji · 2026-2 Seoul breakfast programme','명지대학교 · 2026-2 인문 천원의 아침밥','明知大学 · 2026年第二学期首尔早餐项目'),'https://www.mju.ac.kr/bbs/mjukr/141/235827/artclView.do',l('Dated programme at Student Union 3F, September 1–December 14, weekdays except public holidays, 08:00–09:00; may close early when portions run out. Not all-day cafeteria hours.','학생회관 3층에서 9월 1일~12월 14일 공휴일 제외 평일 08:00~09:00 운영하는 공지입니다. 소진 시 조기 마감하며 식당 전체 영업시간이 아닙니다.','注明日期的早餐项目位于学生活动馆3层，9月1日至12月14日非节假日工作日08:00–09:00，售完可能提前结束。这不是食堂全天营业时间。'),'2026-09-29'),
];

const unverified=l('University-listed facility · operator, current hours, prices and availability unverified.','대학에 등재된 시설 · 업체명, 현재 운영시간·가격·영업 여부 미확인.','大学所列设施 · 经营者、当前营业时间、价格和营业状态未核实。');
const food=(id:string,name:Localized,kind:CampusFood['kind'],placeCode:string,location:Localized):CampusFood=>({id,name,kind,placeCode,location,sourceIds:['seoul-welfare','seoul-building-numbers'],hours:null,price:null,note:unverified});
export const SEOUL_CAMPUS_FOOD:CampusFood[]=[
  food('seoul-student-cafeteria',l('Student cafeteria','학생식당','学生食堂'),'cafeteria','S2',l('Student Union · 3F','학생회관 · 3층','学生活动馆 · 3层')),
  food('seoul-student-cafe',l('Student Union coffee shop','학생회관 커피전문점','学生活动馆咖啡店'),'cafe','S2',l('Student Union · 3F (official welfare list)','학생회관 · 3층 (공식 복지시설 목록)','学生活动馆 · 3层（官方福利设施表）')),
  food('seoul-main-store',l('General Hall shop','종합관 매점','综合馆商店'),'convenience','S1',l('Main Building / General Hall · 4F','본관 / 종합관 · 4층','本馆／综合馆 · 4层')),
  food('seoul-admin-store',l('Administration convenience store','행정동 편의점','行政楼便利店'),'convenience','S5',l('Administration Building · 1F','행정동 · 1층','行政楼 · 1层')),
];
SEOUL_CAMPUS_FOOD[0]!.sourceIds.push('seoul-breakfast-2026');
SEOUL_CAMPUS_FOOD[0]!.note=l('The September 29, 2026 notice confirms this venue for the dated breakfast programme. General hours, menus and prices are not verified. Ask about breakfast for the published conditions.','2026년 9월 29일 공지가 해당 장소의 기간 한정 조식 운영을 확인합니다. 일반 영업시간·메뉴·가격은 미확인입니다. 조식 질문에서 공지 조건을 확인하세요.','2026年9月29日公告确认此处举办有期限的早餐项目。普通营业时间、菜单和价格未核实。可询问早餐项目的公告条件。');

export const SEOUL_TRANSPORT_SUMMARY=l(
  'The September 30, 2026 notice ends the Seoul–Yongin trial shuttle from October 1. No active Seoul shuttle departure timetable is verified here. The university lists city buses 7017, 7019, 7021, 7611, 7612 and 7713. Its transfer guide lists Jeungsan Station (Line 6), exit 2 → 7019/7021/7611; Hongik Univ. Station (Line 2) → 7612. Route changes and live arrivals must be checked with the operator; no journey times are inferred.',
  '2026년 9월 30일 공지는 10월 1일부터 인문–자연캠퍼스 시범 셔틀 종료를 안내합니다. 이 앱에서 현재 인문 셔틀 출발 시간표는 확인되지 않았습니다. 대학은 시내버스 7017·7019·7021·7611·7612·7713을 안내합니다. 환승 안내에는 6호선 증산역 2번 출구 → 7019·7021·7611, 2호선 홍대입구역 → 7612가 있습니다. 변경과 실시간 도착은 운수사에 확인해야 하며 이동시간을 추정하지 않습니다.',
  '2026年9月30日公告称，首尔—龙仁校区间试运行接驳车从10月1日起结束。本应用没有已核实的现行首尔校车发车表。大学列出的市内公交为7017、7019、7021、7611、7612和7713。换乘指南列明：6号线缯山站2号出口→7019／7021／7611；2号线弘大入口站→7612。线路变更和实时到站请向运营方确认；本应用不推算行程时间。');
export const SEOUL_TRANSPORT_SOURCE_IDS=['seoul-shuttle-ended','seoul-directions'];
/** City route numbers are not departure timetables. The intercampus trial has ended. */
export const SEOUL_BUS_ROUTES:BusRoute[]=[];
export const SEOUL_CAMPUS_FACTS:CampusFact[]=[
  {id:'seoul-breakfast',keywords:['breakfast','morning meal','천원','조식','아침밥','早餐','早饭'],placeCodes:['S2'],sourceIds:['seoul-breakfast-2026','seoul-building-numbers'],status:'limited',text:l('The September 29 notice describes the “1,000-won breakfast” programme at Student Union (S2), 3F: September 1–December 14, 2026, Monday–Friday except public holidays, 08:00–09:00. It can end early when portions run out. Enrolled undergraduate and graduate students use a mobile library-pass scan. This is a published programme, not confirmation that food is available now or the cafeteria’s all-day hours.','9월 29일 공지의 “천원의 아침밥”은 학생회관(S2) 3층에서 2026년 9월 1일~12월 14일 공휴일 제외 월~금 08:00~09:00 운영합니다. 준비 수량 소진 시 조기 마감할 수 있습니다. 학부·대학원 재학생이 모바일 열람증 태그 후 이용합니다. 공개 운영계획이며 현재 식사 가능 여부나 식당 전체 영업시간 확인은 아닙니다.','9月29日公告介绍“一千韩元早餐”项目：2026年9月1日至12月14日，非节假日周一至周五08:00–09:00，地点为学生活动馆（S2）3层。份数售完可能提前结束。在读本科生和研究生扫描移动阅览证使用。这是公布的项目安排，不确认此刻仍有餐食，也不是食堂全天营业时间。')},
  {id:'seoul-library',keywords:['library','book','borrow','도서관','책','图书馆','借书'],placeCodes:['S9'],sourceIds:['seoul-directory','seoul-building-numbers'],status:'supported',text:l('The Seoul campus directory lists Bangmok Academic Information Center (S9), the campus library building. Check the library’s current access and opening rules; this app does not verify available seats.','인문캠퍼스 목록의 방목학술정보관(S9)이 도서관 건물입니다. 현재 출입·운영 규정은 도서관에서 확인하세요. 좌석 현황은 제공하지 않습니다.','首尔校区目录列有Bangmok学术信息馆（S9），即图书馆所在建筑。现行入馆和开放规则请向图书馆确认；本应用不提供可用座位信息。')},
  {id:'seoul-printing',keywords:['print','printing','copy','scan','인쇄','프린트','복사','스캔','打印','复印','扫描'],placeCodes:['S9','S1','S4'],sourceIds:['seoul-welfare','seoul-building-numbers'],status:'limited',text:l('The official welfare list places a copying room in Bangmok Academic Information Center (S9), 3F, and computer/printer rooms in the Main Building (S1), 1F, and the former Business/Economics Building (now International Hall, S4), 1F. Current fees and operating hours are unverified.','공식 복지시설 목록은 방목학술정보관(S9) 3층 복사실, 본관(S1) 1층과 경상관(현 국제관, S4) 1층 전산실습실·프린터실을 안내합니다. 현재 요금과 운영시간은 미확인입니다.','官方福利设施表列有Bangmok学术信息馆（S9）3层复印室，以及本馆（S1）1层和原经商馆（现国际馆，S4）1层的电脑／打印室。当前费用和开放时间未核实。')},
  {id:'seoul-bank',keywords:['bank','atm','은행','현금','银行','取款'],placeCodes:['S5'],sourceIds:['seoul-welfare','seoul-building-numbers'],status:'limited',text:l('The official Seoul welfare list places Hana Bank in the Administration Building (S5), 1F. Current hours and services are unverified.','공식 인문 복지시설 목록은 하나은행을 행정동(S5) 1층으로 안내합니다. 현재 운영시간과 서비스는 미확인입니다.','官方首尔校区福利设施表将韩亚银行列于行政楼（S5）1层。当前营业时间和服务未核实。')},
  {id:'seoul-post',keywords:['post','mail','parcel','우체','우편','택배','邮局','邮寄','快递'],placeCodes:['S2'],sourceIds:['seoul-welfare','seoul-building-numbers'],status:'limited',text:l('The university lists a post office in Student Union (S2), 1F. Current opening hours and services are unverified.','대학은 우체국을 학생회관(S2) 1층으로 안내합니다. 현재 운영시간과 서비스는 미확인입니다.','大学资料将邮局列于学生活动馆（S2）1层。当前营业时间和服务未核实。')},
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
  const unknown=():ChatAnswer=>({answer:t('I do not have a verified answer in the saved Seoul campus sources. Ask about a building, a full classroom code such as S10303, food, coffee, public transport, the library or printing. I cannot access your personal timetable.','저장된 인문캠퍼스 출처에서 확인된 답을 찾지 못했습니다. 건물, S10303 같은 전체 강의실 코드, 식사, 커피, 대중교통, 도서관, 인쇄를 질문하세요. 개인 시간표에는 접근할 수 없습니다.','保存的首尔校区资料中没有经过核实的答案。可以询问建筑、S10303等完整教室编号、餐饮、咖啡、公共交通、图书馆或打印。我无法访问你的个人课表。'),citations:[],placeCodes:[],status:'unknown'});
  if(!q.trim())return unknown();
  const transport=has(q,['bus','buses','shuttle','transport','subway','station','7017','7019','7021','7611','7612','7713','버스','셔틀','교통','지하철','홍대입구','증산역','校车','公交','巴士','接驳','交通','地铁','弘大入口','缯山']);
  if(/(?:^|[^a-z0-9])y\d*(?=$|[^a-z0-9])/i.test(q)||(!transport&&has(q,['yongin','natural campus','용인','자연캠퍼스','龙仁','自然校区'])))return {answer:t('This is the Seoul campus guide. Switch to Yongin for Y building codes or Yongin venues. I will not place a Yongin classroom or café on the Seoul map.','현재 서울 인문캠퍼스 안내입니다. Y 건물 코드나 용인 시설은 용인캠퍼스로 전환하세요. 용인 강의실·카페를 서울 지도에 배치하지 않습니다.','当前选择的是首尔校区。查询Y开头的建筑或龙仁地点时请切换至龙仁；不会将龙仁教室或咖啡店放到首尔地图上。'),citations:[],placeCodes:[],status:'unknown'};
  if(transport)return {answer:localize(SEOUL_TRANSPORT_SUMMARY,language),citations:[...SEOUL_TRANSPORT_SOURCE_IDS],placeCodes:[],status:'limited'};
  const sensitive=has(q,['open now','opening','hours','close','price','cost','cheap','budget','vegan','halal','allergy','allergen','gluten','영업','몇 시','가격','얼마','저렴','채식','할랄','알레르기','营业','几点','价格','多少钱','便宜','预算','素食','清真','过敏','无麸质']);
  if(sensitive)return {answer:t('Current general opening hours, prices and dietary/allergen suitability are not verified in this app. The dated breakfast programme has separate published conditions; it does not establish all-day hours or today’s availability. Please check the venue or official notice.','이 앱에는 현재 일반 영업시간, 가격, 식이·알레르기 적합성에 대한 검증된 정보가 없습니다. 기간 한정 조식 공지에는 별도 조건이 있으며 식당 전체 영업시간이나 오늘 이용 가능 여부를 확인하지 않습니다. 매장이나 공식 공지를 확인하세요.','本应用未核实现行普通营业时间、价格及特殊饮食／过敏原适用性。注明日期的早餐项目有独立条件，不能据此确认全天营业时间或今日供应情况。请向店家或官方公告核实。'),citations:['seoul-welfare','seoul-breakfast-2026'],placeCodes:[],status:'unknown'};
  const codes=(q.toUpperCase().match(/(?:^|[^A-Z0-9])S\d+(?=$|[^A-Z0-9])/g)||[]).map(s=>s.replace(/^[^S]*/,''));
  const resolved=codes.map(resolveSeoulClassroomCode).filter((r):r is NonNullable<typeof r>=>r!==null);
  if(codes.some(code=>!resolveSeoulClassroomCode(code)))return {answer:t('That Seoul room code is not resolved by the verified rules. The undated classroom PDF labels MCC as S11, while dated 2026 notices use S10; this app does not guess S11. Provide the complete code and building name from your own timetable, or confirm with your instructor.','해당 서울 강의실 코드는 확인된 규칙으로 해석하지 못했습니다. 적용일 미상 PDF는 MCC를 S11로, 2026년 공지는 S10으로 표기하므로 이 앱은 S11을 추측하지 않습니다. 본인 시간표의 전체 코드·건물명을 제시하거나 담당 교수에게 확인하세요.','已核实的规则无法解析该首尔教室编号。未注明日期的PDF将MCC写为S11，而2026年公告使用S10，因此本应用不猜测S11。请提供个人课表中的完整编号和建筑名称，或向教师确认。'),citations:['seoul-classroom-guide','seoul-classroom-2026'],placeCodes:[],status:'unknown'};
  const coffee=has(q,['coffee','cafe','cafes','café','cafés','커피','카페','咖啡']);
  const eating=has(q,['eat','food','lunch','dinner','breakfast','restaurant','restaurants','cafeteria','식사','밥','식당','먹','점심','저녁','吃','餐厅','食堂','午餐','晚餐','早餐']);
  const store=has(q,['convenience','snack','snacks','store','stores','편의점','간식','便利店','零食','商店']);
  const reference=SEOUL_REFERENCE_FEATURES.find(f=>!!f.code&&(codes.includes(f.code)||q.includes(f.name.en.toLowerCase())||q.includes(f.name.ko)||(!!f.name.zh&&q.includes(f.name.zh))||(f.code==='S10'&&has(q,['mcc']))));
  if(resolved.length&&!coffee&&!eating&&!store)return {answer:`${resolved.map(r=>`${r.roomCode||r.building.code} → ${localize(r.building.name,language)} (${r.building.code})`).join('\n')}\n\n${t('This identifies the building from official numbering evidence. It does not verify room existence, floor, entrance or your class assignment. Confirm your full code with your timetable or instructor.','공식 번호 자료로 건물을 식별했습니다. 호실 존재·층·출입구·본인 수업 배정을 확인한 것은 아닙니다. 전체 코드를 시간표나 담당 교수에게 확인하세요.','此结果依据官方编号资料识别建筑，不确认房间存在、楼层、入口或你的课程安排。请用个人课表或向教师确认完整编号。')}`,citations:unique(resolved.map(r=>r.sourceId)),placeCodes:unique(resolved.map(r=>r.building.code)),status:resolved.some(r=>r.roomCode)?'limited':'supported'};
  if(has(q,['class','classroom','lecture','room','강의','수업','호실','上课','教室','课程','课表'])&&!resolved.length)return {answer:t('Please paste your full Seoul classroom code, such as S10303, or the building name and room number. A course name, major or student name does not establish its location. I cannot access your timetable or infer a room assignment.','S10303 같은 전체 서울 강의실 코드 또는 건물명과 호수를 입력하세요. 과목명·전공·학생 이름으로 수업 장소를 확인할 수 없습니다. 개인 시간표 접근이나 호실 배정 추정은 하지 않습니다.','请提供完整首尔教室编号，例如S10303，或建筑名称和房间号。课程名称、专业或学生姓名不能确定上课地点。我无法访问你的课表或推测教室安排。'),citations:['seoul-classroom-2026'],placeCodes:[],status:'unknown'};
  const requested=unique([...resolved.map(r=>r.building.code),...(reference?.code?[reference.code]:[])]);
  const breakfast=SEOUL_CAMPUS_FACTS.find(f=>f.id==='seoul-breakfast');
  if(breakfast&&has(q,breakfast.keywords)&&!coffee&&!store&&(!requested.length||requested.includes('S2')))return {answer:localize(breakfast.text,language),citations:breakfast.sourceIds,placeCodes:breakfast.placeCodes,status:breakfast.status};
  if(coffee||eating||store){
    const venues=SEOUL_CAMPUS_FOOD.filter(v=>(coffee?v.kind==='cafe':store?v.kind==='convenience':v.kind==='cafeteria'||v.kind==='restaurant')&&(!requested.length||requested.includes(v.placeCode||'')));
    if(!venues.length)return {answer:t('The saved Seoul sources do not list a matching venue in that building. This does not prove none exists. Check the university source before visiting.','저장된 인문캠퍼스 출처에는 해당 건물의 요청한 매장이 없습니다. 실제로 없다는 뜻은 아닙니다. 방문 전 대학 출처에서 확인하세요.','保存的首尔校区资料没有列出该建筑内符合条件的店家，这不代表实际不存在。前往前请向大学核实。'),citations:['seoul-welfare'],placeCodes:requested,status:'unknown'};
    return {answer:`${t('The university’s Seoul facilities list gives:','대학 인문캠퍼스 시설 목록의 장소입니다:','大学首尔校区设施表列出：')}\n${venues.map(v=>`${localize(v.name,language)} · ${localize(v.location,language)} (${v.placeCode})`).join('\n')}\n\n${t('Operators, current opening hours, prices and availability are unverified. These are translated facility categories, not invented business names.','업체명·현재 운영시간·가격·영업 여부는 미확인입니다. 번역된 시설 종류이며 임의의 매장명이 아닙니다.','经营者、当前营业时间、价格和营业状态未核实。这些名称是设施类别的翻译，不是虚构店名。')}`,citations:unique(venues.flatMap(v=>v.sourceIds)),placeCodes:unique(venues.map(v=>v.placeCode).filter((code):code is string=>code!==null)),status:'limited'};
  }
  const fact=SEOUL_CAMPUS_FACTS.find(f=>has(q,f.keywords));
  if(fact)return {answer:localize(fact.text,language),citations:fact.sourceIds,placeCodes:fact.placeCodes,status:fact.status};
  if(reference)return {answer:`${localize(reference.name,language)} · ${reference.code}\n${t('Select this building in the Seoul campus map. Geometry and entrances are schematic, not surveyed, and no classroom assignment is inferred.','서울캠퍼스 지도에서 이 건물을 선택하세요. 건물 형태와 출입구는 개략 표현이며 실측이나 강의실 배정 확인이 아닙니다.','可在首尔校区地图上选择此建筑。形状和入口为示意、未经实测；不据此推测教室安排。')}`,citations:['seoul-directory','seoul-building-numbers'],placeCodes:reference.code?[reference.code]:[],status:'limited'};
  return unknown();
}
