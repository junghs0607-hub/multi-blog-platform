/** 시드 데이터: 데모 사용자, 테마별 핀 문구, 보드, 댓글 */

export const DEMO_PASSWORD = "mosaic1234";
export const ADMIN_PASSWORD = "admin1234";

export const DEMO_USERS = [
  { email: "admin@mosaic.local", username: "admin", displayName: "모자이크 운영팀", bio: "Mosaic 운영 계정입니다.", role: "admin" as const },
  { email: "minji@mosaic.local", username: "minji", displayName: "김민지", bio: "집 꾸미기와 홈카페를 좋아해요 ☕️ 매일 영감을 모읍니다.", role: "user" as const },
  { email: "junho@mosaic.local", username: "junho", displayName: "이준호", bio: "건축 디자이너 / 도시와 공간을 기록합니다.", role: "user" as const },
  { email: "seoyeon@mosaic.local", username: "seoyeon", displayName: "박서연", bio: "웨딩 플래너 💐 꽃과 컬러 팔레트 수집가", role: "user" as const },
  { email: "hyunwoo@mosaic.local", username: "hyunwoo", displayName: "최현우", bio: "주말엔 산으로, 밤에는 별을 찍어요 🏔️✨", role: "user" as const },
  { email: "jiwoo@mosaic.local", username: "jiwoo", displayName: "정지우", bio: "일러스트레이터. 고양이 두 마리와 살고 있어요 🐱", role: "user" as const },
];

export interface ThemeSpec {
  theme: string;
  category: string;
  palettes: string[];
  titles: string[];
  descriptions: string[];
  tags: string[];
  authors: string[];
  domains: string[];
}

export const THEMES: ThemeSpec[] = [
  {
    theme: "mountains",
    category: "nature",
    palettes: ["sunset", "forest", "lavender", "coral"],
    titles: ["노을 지는 산맥 풍경", "새벽 안개 속 능선", "알프스 하이킹 코스", "겨울 설산 파노라마", "캠핑하기 좋은 산 정상", "구름 위의 일출"],
    descriptions: [
      "해 질 녘 산 능선이 겹겹이 이어지는 풍경. 바라만 봐도 마음이 차분해져요.",
      "주말 등산 코스로 추천하는 곳입니다. 정상에서 보는 뷰가 정말 최고예요.",
      "레이어드된 산의 색감이 아름다워서 배경화면으로 쓰기 좋아요.",
    ],
    tags: ["산", "풍경", "노을", "하이킹", "자연", "캠핑", "등산"],
    authors: ["hyunwoo", "junho", "minji"],
    domains: ["https://trip.example.com/mountain", "https://blog.example.kr/hiking"],
  },
  {
    theme: "ocean",
    category: "travel",
    palettes: ["ocean", "citrus", "sunset", "pastel"],
    titles: ["제주 바다 일몰", "여름 해변 휴양지", "파도 소리가 들리는 바다", "서핑하기 좋은 해변", "고요한 새벽 바다", "에메랄드빛 바다 여행"],
    descriptions: [
      "수평선 너머로 해가 지는 순간. 여름 여행지로 강력 추천합니다.",
      "잔잔한 파도와 하늘의 그라데이션이 너무 예쁜 바다 풍경이에요.",
      "다음 휴가는 꼭 바다로! 여행 버킷리스트에 저장해 두세요.",
    ],
    tags: ["바다", "해변", "여름", "여행", "일몰", "제주", "휴양지"],
    authors: ["hyunwoo", "minji", "seoyeon"],
    domains: ["https://trip.example.com/beach", "https://travel.example.kr/jeju"],
  },
  {
    theme: "city",
    category: "architecture",
    palettes: ["night", "lavender", "ocean", "mono"],
    titles: ["도시의 야경", "미니멀한 빌딩 스카이라인", "서울 야경 포인트", "모던 건축 실루엣", "불 켜진 창문들", "한밤의 도심 풍경"],
    descriptions: [
      "불 켜진 창문들이 만드는 도시의 리듬. 야경 사진 레퍼런스로 좋아요.",
      "빌딩들의 높낮이가 만드는 스카이라인 구성이 인상적입니다.",
      "건축 프레젠테이션 배경으로 활용하기 좋은 도시 실루엣.",
    ],
    tags: ["도시", "건축", "야경", "스카이라인", "서울", "빌딩"],
    authors: ["junho", "hyunwoo"],
    domains: ["https://archi.example.com/skyline", "https://blog.example.kr/city"],
  },
  {
    theme: "abstract",
    category: "art",
    palettes: ["pastel", "coral", "berry", "lavender", "citrus"],
    titles: ["추상화 컬러 스터디", "모던 아트 포스터", "파스텔 톤 추상 페인팅", "거실에 걸기 좋은 추상화", "컬러 블록 아트워크", "몽환적인 그라데이션 아트"],
    descriptions: [
      "부드러운 형태와 색의 조합. 인테리어 포스터로 출력해도 예뻐요.",
      "색 대비 연구용으로 만든 작업입니다. 팔레트 참고하세요!",
      "미니멀한 공간에 포인트가 되어줄 추상 작품.",
    ],
    tags: ["추상화", "아트", "포스터", "컬러", "인테리어소품", "그라데이션"],
    authors: ["jiwoo", "seoyeon", "minji"],
    domains: ["https://gallery.example.com/abstract", "https://art.example.kr/works"],
  },
  {
    theme: "food",
    category: "food",
    palettes: ["berry", "citrus", "coral", "mint"],
    titles: ["브런치 플레이팅 아이디어", "홈카페 디저트 한 접시", "건강한 샐러드 볼", "주말 파스타 플레이팅", "과일 타르트 만들기", "제철 과일 플레이트"],
    descriptions: [
      "주말 아침 브런치 플레이팅. 색감 있는 과일로 포인트를 줬어요.",
      "간단하지만 예쁜 홈카페 메뉴! 레시피는 원본 링크를 참고하세요.",
      "영양 가득한 한 그릇 요리. 다이어트 식단으로도 좋아요.",
    ],
    tags: ["요리", "레시피", "브런치", "홈카페", "디저트", "플레이팅", "샐러드"],
    authors: ["minji", "jiwoo", "seoyeon"],
    domains: ["https://recipe.example.com/brunch", "https://cook.example.kr/dessert"],
  },
  {
    theme: "interior",
    category: "interior",
    palettes: ["pastel", "earth", "mint", "coral", "lavender"],
    titles: ["아늑한 거실 인테리어", "북유럽 스타일 원룸 꾸미기", "햇살 가득한 창가", "미니멀 라이프 거실", "식물로 꾸민 홈 인테리어", "따뜻한 우드톤 거실"],
    descriptions: [
      "소파와 창가 배치만 바꿔도 분위기가 확 달라져요. 원룸 인테리어 참고용!",
      "화이트 + 우드 + 그린 조합은 실패가 없어요. 식물 하나로 포인트!",
      "햇살이 잘 드는 창가 자리. 이런 집에서 살고 싶네요.",
    ],
    tags: ["인테리어", "거실", "홈스타일링", "북유럽", "원룸", "식물", "집꾸미기"],
    authors: ["minji", "junho", "seoyeon"],
    domains: ["https://home.example.com/living", "https://interior.example.kr/oneroom"],
  },
  {
    theme: "leaves",
    category: "illustration",
    palettes: ["forest", "mint", "earth", "pastel"],
    titles: ["몬스테라 잎 패턴", "보태니컬 일러스트", "초록 식물 배경화면", "열대 잎사귀 프린트", "봄 새싹 드로잉", "그린 무드 패턴"],
    descriptions: [
      "직접 그린 보태니컬 패턴이에요. 폰 배경화면으로 써보세요 🌿",
      "열대 잎사귀를 반복 배치한 패턴. 패브릭 프린트로도 잘 어울려요.",
      "초록색이 주는 편안함. 눈이 피로할 때 보면 좋아요.",
    ],
    tags: ["식물", "보태니컬", "패턴", "배경화면", "그린", "일러스트"],
    authors: ["jiwoo", "seoyeon"],
    domains: ["https://illust.example.com/botanical"],
  },
  {
    theme: "pattern",
    category: "design",
    palettes: ["coral", "citrus", "berry", "mono", "ocean"],
    titles: ["기하학 패턴 디자인", "스트라이프 텍스타일", "레트로 도트 패턴", "모던 그래픽 패턴", "브랜드 컬러 팔레트 패턴", "삼각형 타일 그래픽"],
    descriptions: [
      "반복되는 도형으로 만든 그래픽 패턴. 브랜딩 레퍼런스로 활용하세요.",
      "레트로 감성의 컬러 조합. 포장지나 패키지 디자인에 잘 어울려요.",
      "심플한 기하학 패턴으로 만든 텍스타일 시안입니다.",
    ],
    tags: ["패턴", "디자인", "그래픽", "레트로", "텍스타일", "브랜딩"],
    authors: ["seoyeon", "junho", "jiwoo"],
    domains: ["https://design.example.com/patterns", "https://brand.example.kr/palette"],
  },
  {
    theme: "cat",
    category: "animals",
    palettes: ["pastel", "citrus", "lavender", "coral"],
    titles: ["귀여운 고양이 일러스트", "낮잠 자는 고양이", "고양이 캐릭터 디자인", "반려묘 프로필 그림", "고양이 얼굴 아이콘", "졸린 냥이 그림"],
    descriptions: [
      "우리 집 고양이를 모델로 그려봤어요 🐱 프로필 사진으로 써도 돼요!",
      "동그란 얼굴과 커다란 눈이 포인트인 고양이 캐릭터입니다.",
      "낮잠 자는 고양이만큼 평화로운 건 없죠. 귀여움 주의!",
    ],
    tags: ["고양이", "반려동물", "캐릭터", "일러스트", "귀여운", "반려묘"],
    authors: ["jiwoo", "minji"],
    domains: ["https://illust.example.com/cat"],
  },
  {
    theme: "space",
    category: "photography",
    palettes: ["night", "lavender", "ocean"],
    titles: ["밤하늘 은하수", "우주 행성 일러스트", "별이 빛나는 밤", "토성 고리 포스터", "달빛 아래 우주", "별 사진 촬영 팁"],
    descriptions: [
      "별 사진을 찍으러 다니며 상상한 우주의 모습. 밤하늘 좋아하시는 분들께 ✨",
      "행성과 고리를 단순한 형태로 표현했어요. 아이 방 포스터로 추천!",
      "은하수 촬영은 광해가 없는 곳에서, 노출은 길게!",
    ],
    tags: ["우주", "밤하늘", "별", "행성", "배경화면", "천체사진"],
    authors: ["hyunwoo", "jiwoo"],
    domains: ["https://astro.example.com/milkyway"],
  },
  {
    theme: "flowers",
    category: "wedding",
    palettes: ["pastel", "berry", "lavender", "coral"],
    titles: ["웨딩 부케 아이디어", "파스텔 꽃다발", "봄꽃 일러스트", "플라워 데코레이션", "들꽃 정원", "축하 꽃다발 컬러 조합"],
    descriptions: [
      "파스텔 톤 꽃으로 만든 웨딩 부케. 스몰 웨딩에 잘 어울려요 💐",
      "봄에 어울리는 꽃 조합 레퍼런스입니다. 플로리스트분들 참고하세요.",
      "식장 데코에 활용하기 좋은 플라워 컬러 팔레트.",
    ],
    tags: ["꽃", "웨딩", "부케", "봄", "플라워", "꽃다발"],
    authors: ["seoyeon", "minji"],
    domains: ["https://wedding.example.com/bouquet", "https://flower.example.kr/spring"],
  },
  {
    theme: "desk",
    category: "technology",
    palettes: ["mono", "ocean", "mint", "night"],
    titles: ["미니멀 데스크 셋업", "재택근무 책상 꾸미기", "개발자 작업 공간", "데스크테리어 아이디어", "깔끔한 홈오피스", "모니터 하나로 끝내는 셋업"],
    descriptions: [
      "선 정리와 최소한의 소품으로 완성한 데스크 셋업. 집중이 잘 돼요.",
      "재택근무 2년 차의 책상. 모니터 높이와 조명이 핵심입니다.",
      "작은 화분 하나가 책상 분위기를 확 바꿔줘요 🌱",
    ],
    tags: ["데스크셋업", "홈오피스", "테크", "작업공간", "미니멀", "재택근무"],
    authors: ["junho", "hyunwoo", "jiwoo"],
    domains: ["https://setup.example.com/desk", "https://dev.example.kr/workspace"],
  },
];

export const BOARDS: { owner: string; name: string; description: string; visibility: "public" | "private"; themes: string[] }[] = [
  { owner: "minji", name: "우리집 인테리어", description: "이사 가면 꼭 해보고 싶은 인테리어 아이디어", visibility: "public", themes: ["interior", "abstract"] },
  { owner: "minji", name: "홈카페 레시피", description: "주말 브런치 & 디저트", visibility: "public", themes: ["food"] },
  { owner: "minji", name: "여행 버킷리스트", description: "언젠가 꼭 가볼 곳들", visibility: "private", themes: ["ocean", "mountains"] },
  { owner: "junho", name: "건축 레퍼런스", description: "도시, 빌딩, 공간 연구", visibility: "public", themes: ["city", "interior"] },
  { owner: "junho", name: "데스크 셋업", description: "작업 공간 아이디어", visibility: "public", themes: ["desk"] },
  { owner: "junho", name: "비밀 프로젝트", description: "공모전 준비 자료 (비공개)", visibility: "private", themes: ["pattern", "city"] },
  { owner: "seoyeon", name: "웨딩 준비", description: "부케, 데코, 컬러 팔레트", visibility: "public", themes: ["flowers"] },
  { owner: "seoyeon", name: "컬러 팔레트", description: "색 조합 영감", visibility: "public", themes: ["pattern", "abstract"] },
  { owner: "hyunwoo", name: "캠핑 & 하이킹", description: "다음 주말엔 어디로?", visibility: "public", themes: ["mountains", "ocean"] },
  { owner: "hyunwoo", name: "밤하늘", description: "별 사진 레퍼런스", visibility: "public", themes: ["space"] },
  { owner: "jiwoo", name: "고양이 모음", description: "세상의 모든 고양이 🐈", visibility: "public", themes: ["cat"] },
  { owner: "jiwoo", name: "일러스트 레퍼런스", description: "드로잉 참고 자료", visibility: "public", themes: ["leaves", "space", "cat"] },
  { owner: "admin", name: "운영 참고", description: "운영팀 내부용", visibility: "private", themes: ["pattern"] },
];

export const COMMENTS = [
  "너무 예뻐요! 😍",
  "저장해갑니다~",
  "색감이 정말 좋네요",
  "이런 스타일 너무 좋아요",
  "어디서 보신 건가요?",
  "공유해주셔서 감사합니다!",
  "오늘 바로 따라 해봐야겠어요",
  "분위기 최고네요 👍",
  "배경화면으로 쓰고 싶어요",
  "정보 감사합니다 :)",
  "제 보드에도 저장했어요!",
  "구도가 정말 좋네요",
];
