import express from 'express';
import {
calculateFourPillars,
getHeavenlyStemElement,
getEarthlyBranchElement,
getHeavenlyStemYinYang,
getEarthlyBranchYinYang,
lunarToSolar
} from 'manseryeok';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.disable('x-powered-by');
app.use(express.json({ limit: '20kb' }));
app.use(express.static(path.join(__dirname, 'public')));
const port = Number(process.env.PORT || 3000);
const hourlyLimit = Number(process.env.RATE_LIMIT_PER_HOUR || 20);
const model = process.env.GEMINI_MODEL || 'gemini-3.8-flash';

const buckets = new Map();

function rateLimit(req, res, next) {
const ip = (
req.headers['x-forwarded-for'] ||
req.socket.remoteAddress ||
'unknown'
).toString().split(',')[0].trim();

const now = Date.now();
let b = buckets.get(ip);

if (!b || now - b.start > 3600000) {
b = { start: now, count: 0 };
}

b.count++;
buckets.set(ip, b);

if (b.count > hourlyLimit) {
return res.status(429).json({
error: '한 시간 이용 횟수를 넘겼어. 조금 뒤에 다시 와라.'
});
}

if (buckets.size > 5000) {
for (const [k, v] of buckets) {
if (now - v.start > 3600000) buckets.delete(k);
}
}

next();
}

app.get('/api/health', (_req, res) => {
res.json({
ok: true,
aiConfigured: Boolean(process.env.GEMINI_API_KEY)
});
});

app.post('/api/reading', rateLimit, async (req, res) => {
try {
const {
birth,
time,
minute = 0,
calendar = 'solar',
leapMonth = false,
mbti,
focus = 'all',
dayBoundary = 'midnight'
} = req.body || {};

if (
typeof birth !== 'string' ||
!/^\d{4}-\d{2}-\d{2}$/.test(birth)
) {
return res.status(400).json({
error: '생년월일을 확인해라.'
});
}

const [by, bm, bd] = birth.split('-').map(Number);

if (
by < 1800 ||
by > 2100 ||
!Number.isInteger(bm) ||
bm < 1 ||
bm > 12 ||
!Number.isInteger(bd) ||
bd < 1 ||
bd > 31
) {
return res.status(400).json({
error: '지원하는 생년월일 범위는 1800~2100년이야.'
});
}

if (
!/^(INTJ|INTP|ENTJ|ENTP|INFJ|INFP|ENFJ|ENFP|ISTJ|ISFJ|ESTJ|ESFJ|ISTP|ISFP|ESTP|ESFP)$/.test(mbti || '')
) {
return res.status(400).json({
error: 'MBTI를 골라라.'
});
}

if (!['all', 'love', 'money', 'work', 'people'].includes(focus)) {
return res.status(400).json({
error: '풀이 분야를 다시 골라라.'
});
}

if (!['midnight', 'jasi', 'splitJasi'].includes(dayBoundary)) {
return res.status(400).json({
error: '자시 기준이 올바르지 않아.'
});
}

let [y, m, d] = [by, bm, bd];

if (calendar === 'lunar') {
const solar = lunarToSolar(by, bm, bd, Boolean(leapMonth));

if (!solar || !solar.year) {
return res.status(400).json({
error: '그 음력 날짜를 찾지 못했어. 윤달 여부를 확인해라.'
});
}

y = solar.year;
m = solar.month;
d = solar.day;
} else if (calendar !== 'solar') {
return res.status(400).json({
error: '달력 종류가 올바르지 않아.'
});
}

const check = new Date(Date.UTC(y, m - 1, d));

if (
check.getUTCFullYear() !== y ||
check.getUTCMonth() !== m - 1 ||
check.getUTCDate() !== d
) {
return res.status(400).json({
error: '실제로 존재하는 날짜를 입력해라.'
});
}

const knownTime =
time !== null &&
time !== undefined &&
time !== '' &&
time !== 'unknown';

const hour = knownTime ? Number(time) : 12;
const min = Number(minute);

if (
!Number.isInteger(hour) ||
hour < 0 ||
hour > 23 ||
!Number.isInteger(min) ||
min < 0 ||
min > 59
) {
return res.status(400).json({
error: '태어난 시간을 확인해라.'
});
}

const chart = calculateFourPillars({
year: y,
month: m,
day: d,
hour,
minute: min,
isLunar: false,
dayBoundary
});

const pillars = chart.toObject();

const elements = {
목: 0,
화: 0,
토: 0,
금: 0,
수: 0
};

const yinYang = {
음: 0,
양: 0
};

const stemMap = {
갑: '목',
을: '목',
병: '화',
정: '화',
무: '토',
기: '토',
경: '금',
신: '금',
임: '수',
계: '수'
};

const branchMap = {
자: '수',
축: '토',
인: '목',
묘: '목',
진: '토',
사: '화',
오: '화',
미: '토',
신: '금',
유: '금',
술: '토',
해: '수'
};

for (const [key, value] of Object.entries(pillars)) {
if (typeof value !== 'string') continue;

const chars = [...value];

if (chars[0] in stemMap) {
elements[stemMap[chars[0]]]++;
yinYang[getHeavenlyStemYinYang(chars[0])]++;
}

if (chars[1] in branchMap) {
elements[branchMap[chars[1]]]++;
yinYang[getEarthlyBranchYinYang(chars[1])]++;
}
}

const payload = {
birthInput: {
year: by,
month: bm,
day: bd,
calendar,
leapMonth: calendar === 'lunar' ? Boolean(leapMonth) : false
},
solarDate: {
year: y,
month: m,
day: d
},
time: knownTime
? { hour, minute: min }
: { unknown: true },
mbti,
focus,
pillars,
elements,
yinYang,
dayElement: chart.dayElement,
dayYinYang: chart.dayYinYang,
tenGods: chart.tenGods,
voidBranches: chart.voidBranches,
dayBoundary,
note: knownTime
? '태어난 시각을 반영함'
: '태어난 시간을 몰라 시주는 임의의 정오 기준이며, 시주 해석은 제외해야 함'
};

if (!process.env.GEMINI_API_KEY) {
return res.status(503).json({
error: '서버에 GEMINI_API_KEY가 설정되지 않았어. 배포 환경변수에 Gemini API 키를 넣어라.',
chart: payload
});
}

const prompt = `너는 한국어 캐릭터 '욕쟁이 할매'다.
말투는 핵불닭맛: 거침없는 풍자와 장난스러운 욕설을 쓰되 혐오표현, 특정 집단 비하, 위협은 금지한다.
사용자를 모욕하거나 불안을 조장하지 말고, 날카롭지만 쓸모 있는 조언을 준다.
제공된 사주 계산 데이터만 사실로 취급하고 사주 기둥/오행을 새로 계산하거나 지어내지 않는다.
사주와 MBTI 해석은 전통적·오락적 해석임을 유지하고 운명을 확정적으로 말하지 않는다.
재정/건강/법률 관련 확정적 예측 금지.
시간 모름이면 시주를 근거로 해석하지 않는다.
아래 JSON 형식 외 텍스트는 출력하지 마라.

JSON schema:
{
"title": "짧은 제목",
"opening": "할매 첫마디",
"overall": "종합 성향 3~5문장",
"elements": "음양오행 해석 2~4문장",
"mbti": "MBTI와 사주 조합 2~4문장",
"love": "연애·인간관계 2~4문장",
"workMoney": "일·재물 2~4문장",
"advice": "실행 가능한 처방전 2~3개",
"disclaimer": "재미와 자기성찰을 위한 해석이며 중요한 결정의 근거로 삼지 말 것"
}

사용자의 궁금한 분야: ${focus}
MBTI: ${mbti}
만세력 계산 데이터: ${JSON.stringify(payload)}`;

const geminiResponse = await fetch(
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': process.env.GEMINI_API_KEY
    },
    body: JSON.stringify({
      systemInstruction: {
        parts: [
          {
            text: 'You are a helpful assistant that follows the requested JSON output format.'
          }
        ]
      },
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }]
        }
      ],
      generationConfig: {
        responseMimeType: 'application/json',
        maxOutputTokens: 1100
      }
    })
  }
);
{
method: 'POST',
headers: {
'Content-Type': 'application/json',
'x-goog-api-key': process.env.GEMINI_API_KEY
},
body: JSON.stringify({
systemInstruction: {
parts: [
{
text: 'You are a helpful assistant that follows the requested JSON output format.'
}
]
},
contents: [
{
role: 'user',
parts: [{ text: prompt }]
}
],
generationConfig: {
responseMimeType: 'application/json',
maxOutputTokens: 1100
}
})
}
);

const geminiData = await geminiResponse.json();

if (!geminiResponse.ok) {
console.error(
  'Gemini API error:',
  geminiResponse.status,
  JSON.stringify(geminiData, null, 2)
);

  const apiError = new Error(
    geminiData?.error?.message || 'Gemini API 요청에 실패했어.'
  );

  apiError.status = geminiResponse.status;
  throw apiError;
}

const outputText = geminiData?.candidates?.[0]?.content?.parts
?.map(part => part.text || '')
.join('');

if (!outputText) {
throw new Error('Gemini 응답에 풀이 내용이 없어.');
}

let reading;

try {
reading = JSON.parse(outputText);
} catch {
throw new Error('AI 응답을 해석하지 못했어. 다시 시도해라.');
}

res.json({
chart: payload,
reading,
model
});
} catch (err) {
console.error('reading_error', err?.message || err);

let msg = '풀이를 만들다가 문제가 생겼어. 입력을 확인하고 다시 시도해라.';

if (err?.status === 400) {
msg = 'Gemini 요청 형식이나 모델 설정을 확인해라.';
} else if (err?.status === 401 || err?.status === 403) {
msg = 'Gemini API 키가 올바르지 않거나 권한이 없어. 서버 환경변수를 확인해라.';
} else if (err?.status === 429) {
msg = 'Gemini 사용량 한도에 걸렸어. 잠시 뒤 다시 해라.';
} else if (err instanceof RangeError) {
msg = '해당 생년월일을 만세력 엔진에서 처리할 수 없어. 날짜와 음력/윤달을 확인해라.';
}

res.status(500).json({ error: msg });
}
});

app.listen(port, () => {
  console.log(`Saju app listening on ${port}`);
});
