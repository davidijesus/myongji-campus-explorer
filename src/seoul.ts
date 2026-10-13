import { Category, Dataset, Evidence, Localized, Place } from './types';
import { ReferenceFeature } from './campus';

const tr = (en:string,ko:string,zh:string):Localized => ({en,ko,zh});
export const SEOUL_DIRECTORY_URL = 'https://www.mju.ac.kr/campusMap/mjukr/view.do?findType=A';
export const SEOUL_DIRECTORY_DATA_URL = 'https://www.mju.ac.kr/campusMap/mjukr/1/artclList.do';
export const SEOUL_OVERVIEW_URL = 'https://www.mju.ac.kr/bbs/record/359/168757/download.do';
export const SEOUL_FRONT_PHOTO_URL = 'https://gsca.mju.ac.kr/CrossEditor/binary/images/000355/20251128163849970_107N73HV.png';
export const SEOUL_CODES_URL = 'https://www.mju.ac.kr/bbs/ice1/1157/156902/download.do';
export const SEOUL_REFERENCE_CHECKED = '2026-10-01T00:00:00+09:00';
export const SEOUL_CONTENT_CHECKED = '2026-10-06';

/** Content verification is separate from the unchanged map-marker review. */
export const SEOUL_BUILDING_SOURCES = [
    {id:'seoul-college-offices',url:'https://www.mju.ac.kr/mjukr/274/subview.do',title:tr('Academic administration offices','통합교학팀','教务办公室')},
    {id:'seoul-student-affairs',url:'https://www.mju.ac.kr/mjukr/202/subview.do',title:tr('Student support and counseling','학생지원 및 상담','学生支援与咨询')},
    {id:'seoul-health-center',url:'https://www.mju.ac.kr/mjukr/3132/subview.do',title:tr('Health Center','보건의료센터','保健医疗中心')},
    {id:'seoul-international-affairs',url:'https://www.mju.ac.kr/mjukr/5217/subview.do',title:tr('International Affairs','국제교류처','国际交流处')},
    {id:'seoul-residence',url:'https://www.mju.ac.kr/mjukr/7696/subview.do',title:tr('Residence halls','생활관 안내','宿舍介绍')},
    {id:'seoul-facility-locations',url:'https://ice1.mju.ac.kr/ice1/7617/subview.do',title:tr('Student facility locations','학생편의시설','学生设施位置')},
    {id:'seoul-library-introduction',url:'https://www.mju.ac.kr/bbs/mjukr/167/199623/artclView.do',title:tr('Bangmok library introduction','방목학술정보관 소개','Bangmok图书馆介绍')},
    {id:'seoul-mcc-facilities',url:'https://www.mju.ac.kr/mjukr/9418/subview.do',title:tr('MCC facilities','MCC 시설 소개','MCC设施介绍')},
    {id:'seoul-graduate-office',url:'https://gse.mju.ac.kr/gse/1965/subview.do',title:tr('Graduate administration location','대학원교학팀 위치','研究生院教务组位置')},
];
export const SEOUL_BUILDING_CONTENT:Record<string,{description:Localized;sourceIds:string[]}> = {
    S1:{description:tr('Student Support is on floor 2. Social Sciences administration is on floor 6; Humanities administration is on floor 7.','학생지원팀은 2층에 있습니다. 사회과학대학교학팀은 6층, 인문대학교학팀은 7층에 있습니다.','学生支援组位于2楼，社会科学学院教务组位于6楼，人文学院教务组位于7楼。'),sourceIds:['seoul-student-affairs','seoul-college-offices']},
    S2:{description:tr('The student cafeteria and café are on floor 3.','학생식당과 카페는 3층에 있습니다.','学生食堂和咖啡厅位于3楼。'),sourceIds:['seoul-facility-locations','seoul-breakfast-2026']},
    S3:{description:tr('The College of Future Convergence academic administration team is on floor 2.','미래융합대학교학팀은 2층에 있습니다.','未来融合学院教务组位于2楼。'),sourceIds:['seoul-college-offices']},
    S4:{description:tr('The Health Center, Disability Support Center and Student Counseling Center are on floor 1.','보건의료센터, 장애학생지원센터, 학생상담센터는 1층에 있습니다.','保健医疗中心、残障学生支援中心和学生咨询中心位于1楼。'),sourceIds:['seoul-health-center','seoul-student-affairs']},
    S5:{description:tr('International Exchange Support is on floor 4. The bank and convenience store are on floor 1.','국제교류지원팀은 4층에 있습니다. 은행과 편의점은 1층에 있습니다.','国际交流支援组位于4楼，银行和便利店位于1楼。'),sourceIds:['seoul-international-affairs','seoul-welfare']},
    S8:{description:tr('Student housing with shared laundry, lounges and seminar rooms.','세탁실, 휴게실, 세미나실을 갖춘 학생 생활관입니다.','学生宿舍，设有公共洗衣房、休息室和研讨室。'),sourceIds:['seoul-residence']},
    S9:{description:tr('The Humanities Campus library.','인문캠퍼스 도서관입니다.','人文校区图书馆。'),sourceIds:['seoul-library-introduction']},
    S10:{description:tr('MCC combines Veritas Hall classrooms and offices with Koinonia Hall shops and services. Business academic administration is on floor 4; graduate administration is in Veritas Hall, floor 3, room 10350.','MCC는 강의실과 사무실이 있는 베리타스홀, 상업·복지시설이 있는 코이노니아홀로 구성됩니다. 경영대학교학팀은 4층, 대학원교학팀은 베리타스홀 3층 10350호에 있습니다.','MCC由设有教室和办公室的Veritas Hall及设有商店和服务设施的Koinonia Hall组成。经营学院教务组位于4楼，研究生院教务组位于Veritas Hall 3楼10350室。'),sourceIds:['seoul-mcc-facilities','seoul-college-offices','seoul-graduate-office']},
};

/** Official-directory POIs projected to a local scene, never surveyed centroids/entrances. */
export const SEOUL_REFERENCE_PROJECTION = {
    origin:{lat:37.5801,lon:126.9233},unitsPerMeter:.46,
    model:'WGS84 local tangent plane',semiMajorAxis:6378137,inverseFlattening:298.257223563,
} as const;
function ecef(lat:number,lon:number):[number,number,number] {
    const phi=lat*Math.PI/180,lambda=lon*Math.PI/180,f=1/SEOUL_REFERENCE_PROJECTION.inverseFlattening,e2=f*(2-f);
    const n=SEOUL_REFERENCE_PROJECTION.semiMajorAxis/Math.sqrt(1-e2*Math.sin(phi)**2);
    return [n*Math.cos(phi)*Math.cos(lambda),n*Math.cos(phi)*Math.sin(lambda),n*(1-e2)*Math.sin(phi)];
}
const referenceOrigin=ecef(SEOUL_REFERENCE_PROJECTION.origin.lat,SEOUL_REFERENCE_PROJECTION.origin.lon);
export function seoulMarkerToReferencePoint(lat:number,lon:number):[number,number] {
    const p=ecef(lat,lon),dx=p[0]-referenceOrigin[0],dy=p[1]-referenceOrigin[1],dz=p[2]-referenceOrigin[2];
    const phi=SEOUL_REFERENCE_PROJECTION.origin.lat*Math.PI/180,lambda=SEOUL_REFERENCE_PROJECTION.origin.lon*Math.PI/180,s=SEOUL_REFERENCE_PROJECTION.unitsPerMeter;
    return [(-Math.sin(lambda)*dx+Math.cos(lambda)*dy)*s,-(-Math.sin(phi)*Math.cos(lambda)*dx-Math.sin(phi)*Math.sin(lambda)*dy+Math.cos(phi)*dz)*s];
}
const geometryNote=tr(
    'Map positions and building shapes are approximate. Check signs for entrances and step-free routes.',
    '지도 위치와 건물 형태는 대략적입니다. 출입구와 무단차 경로는 현장 안내를 확인하세요.',
    '地图位置和建筑形状为近似值。入口及无台阶通道请以现场标识为准。');
const geometryEvidence:Evidence={status:'unverified',sourceUrl:SEOUL_OVERVIEW_URL,checkedAt:null,note:geometryNote};
export const SEOUL_CAMPUS:Dataset['campus']={
    id:'mju-seoul-humanities',
    name:tr('Myongji University · Humanities Campus','명지대학교 인문캠퍼스','明知大学 · 人文校区'),
    address:tr('34 Geobukgol-ro, Seodaemun-gu, Seoul, 03674, Korea','서울특별시 서대문구 거북골로 34 (03674)','韩国首尔西大门区 Geobukgol-ro 34号，03674'),
    evidence:{status:'verified',sourceUrl:'https://www.mju.ac.kr/mjukr/338/subview.do',checkedAt:SEOUL_REFERENCE_CHECKED,note:tr('Campus name and address checked on official university pages.','캠퍼스명과 주소는 대학 공식 페이지에서 확인했습니다.','校区名称和地址已查对大学官方网站。')},
    origin:null,boundary:null,geometryEvidence,
};

type Spec=[number,string,string,string,string,Category,number,number,number,number,number,ReferenceFeature['form']?];
// The w/d/h values below are expressly illustrative envelopes, not source footprints.
// Codes use the official Seoul building-number convention; no room existence is inferred.
const specs:Spec[]=[
    [10,'S1','General Hall','종합관','综合馆','academic',37.580300,126.922549,41,16,32],
    [11,'S2','Student Union','학생회관','学生活动馆','services',37.580300,126.923450,16,14,26],
    [12,'S3','Mirae Hall','미래관','未来馆','academic',37.580104,126.921604,23,12,19],
    [13,'S4','International Hall','국제관','国际馆','academic',37.580900,126.923826,17,21,29],
    [14,'S5','Administration Building','행정동','行政楼','services',37.580098,126.924244,26,14,13],
    [16,'S8','Humanities Residence','생활관(인문)','人文校区宿舍','residence',37.580800,126.923064,24,11,18],
    [17,'S9','Bangmok Academic Information Center','방목학술정보관','Bangmok学术信息馆','library',37.580750,126.924498,27,20,15],
    [104,'S10','MCC · Myongji Campus Complex','MCC(Myongji Campus Complex)관','MCC · 明知校园综合楼','academic',37.579150,126.922500,37,10,12],
];
export const SEOUL_REFERENCE_FEATURES:ReferenceFeature[]=specs.map(([article,code,en,ko,zh,category,lat,lon,w,d,h,form='block'])=>({
    id:'mju-'+code.toLowerCase(),code,name:tr(en,ko,zh),category,kind:'building',form,
    marker:{article,lat,lon},center:seoulMarkerToReferencePoint(lat,lon),size:[w,d,h],angle:0,note:geometryNote,
}));
SEOUL_REFERENCE_FEATURES.push(
    {id:'mju-seoul-field',code:null,name:tr('Campus Sports Field','운동장','校区运动场'),category:'outdoors',kind:'field',form:'low',marker:{article:15,lat:37.579450,lon:126.922800},center:seoulMarkerToReferencePoint(37.579450,126.922800),size:[31,19,0],angle:0,note:tr('Listed in the official directory. The official campus view shows the sports surface on the MCC terrace. Its elevation and boundary are not surveyed here.','공식 목록에 있는 운동장입니다. 대학의 캠퍼스 그림은 MCC 테라스 위 운동 공간을 보여 줍니다. 여기서는 높이와 외곽을 실측하지 않았습니다.','官方目录列有此运动场。大学校区图将运动区域画在MCC平台上；此处未实测其标高及边界。')},
    {id:'mju-seoul-gate',code:null,name:tr('Main Gate','정문','正门'),category:'services',kind:'gate',form:'low',marker:{article:38,lat:37.579700,lon:126.923930},center:seoulMarkerToReferencePoint(37.579700,126.923930),size:[5.4,1.2,3.2],angle:0,note:tr('Official directory label and marker. The rendered gateway is an abstract locator, not a verified entrance shape or accessible entrance.','공식 목록의 이름과 표식입니다. 그림의 문은 추상적인 위치 표시이며, 실제 출입구 형태나 무장애 출입구를 확인한 것이 아닙니다.','名称和标记来自官方目录。所绘门形只是抽象位置标识，不代表已核实的入口形状或无障碍入口。')},
    {id:'mju-seoul-guardhouse',code:null,name:tr('Gatehouse','수위실','门卫室'),category:'services',kind:'building',form:'low',marker:{article:39,lat:37.579656,lon:126.923794},center:seoulMarkerToReferencePoint(37.579656,126.923794),size:[2.6,2,3.4],angle:0,note:tr('Official directory label and marker; the small block is a locator with unverified dimensions and appearance.','공식 목록의 이름과 표식이며, 작은 블록의 크기와 외관은 미확인입니다.','名称和标记来自官方目录；小方块的尺寸及外观未核实。')},
);
/** No Seoul road/route geometry has been independently established. */
export const SEOUL_REFERENCE_ROADS:[number,number][][]=[];
export const SEOUL_REFERENCE_CAMPUS={
    id:'myongji-seoul-reference-2026-10-01',frame:'illustration' as const,
    sourceUrl:SEOUL_DIRECTORY_URL,checkedAt:SEOUL_REFERENCE_CHECKED,
    features:SEOUL_REFERENCE_FEATURES,paths:SEOUL_REFERENCE_ROADS,
};
export function createSeoulReferencePlaces():Place[] {
    return SEOUL_REFERENCE_FEATURES.map(f=>({
        id:f.id,name:f.name,code:f.code,category:f.category,
        aliases:[f.name.en,f.name.ko,f.name.zh||'',...(f.code?[f.code,f.code.slice(1)]:[]),...(f.code==='S1'?['Main Building','본관']:[]),...(f.code==='S4'?['경상관']:[]),...(f.code==='S9'?['library','도서관','图书馆']:[]),...(f.code==='S10'?['MCC','베리타스홀','코이노니아홀','Veritas Hall','Koinonia Hall']:[])],
        description:(f.code&&SEOUL_BUILDING_CONTENT[f.code]?.description)||f.name,point:null,buildingId:null,entranceIds:[],photo:null,
        evidence:{status:'verified',sourceUrl:(f.code&&SEOUL_BUILDING_SOURCES.find(s=>s.id===SEOUL_BUILDING_CONTENT[f.code!]?.sourceIds[0])?.url)||SEOUL_DIRECTORY_URL,checkedAt:f.code&&SEOUL_BUILDING_CONTENT[f.code]?`${SEOUL_CONTENT_CHECKED}T00:00:00+09:00`:SEOUL_REFERENCE_CHECKED,note:tr('University building and facility information.','대학 건물 및 시설 안내.','大学建筑与设施信息。')},
        geometryEvidence,
    }));
}
export const getSeoulPlaces=createSeoulReferencePlaces;
