// ★ 선생님의 최신 구글 웹 앱 URL을 입력했습니다.
const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbztEDUhTVL_1zXG-r69oPNkpG10AgxAxtUbhzBzhV9TQ0y_RBdV5Q-K4MVn0NKEbZCy/exec';
                
let baseDate = new Date(); // 화면에 띄울 기준 날짜
let currentView = 'week';  // 기본 뷰 '주'
let viewData = { events: [], memos: {} }; // 서버에서 가져올 데이터 바구니
let memoTimeouts = {}; // 메모 자동 저장 딜레이를 위한 타이머

document.addEventListener('DOMContentLoaded', () => {
    initButtons();
    loadData();
});

// 1. 이동 및 탭 버튼 활성화 세팅
function initButtons() {
    document.getElementById('btn-prev').addEventListener('click', () => changeDate(-1));
    document.getElementById('btn-next').addEventListener('click', () => changeDate(1));
    document.getElementById('btn-today').addEventListener('click', () => {
        baseDate = new Date();
        loadData();
    });

    document.getElementById('tab-month').addEventListener('click', () => setView('month'));
    document.getElementById('tab-week').addEventListener('click', () => setView('week'));
    document.getElementById('tab-day').addEventListener('click', () => setView('day'));
}

// 2. 뷰(월/주/일) 스위칭
function setView(view) {
    currentView = view;
    document.querySelectorAll('.btn-tab').forEach(b => b.classList.remove('active'));
    document.getElementById('tab-' + view).classList.add('active');
    loadData(); // 뷰가 바뀌면 날짜 범위를 다시 계산해서 패치
}

// 3. 날짜 화살표 이동 로직 (월/주/일 단위로 이동)
function changeDate(dir) {
    if (currentView === 'month') {
        baseDate.setMonth(baseDate.getMonth() + dir);
    } else if (currentView === 'week') {
        baseDate.setDate(baseDate.getDate() + (dir * 7));
    } else if (currentView === 'day') {
        baseDate.setDate(baseDate.getDate() + dir);
    }
    loadData();
}

// 4. 구글 서버에 데이터 요청 (현재 뷰에 필요한 날짜만큼만)
async function loadData() {
    document.getElementById('status-loading').style.display = 'block';
    document.getElementById('view-month').style.display = 'none';
    document.getElementById('view-table-wrapper').style.display = 'none';

    let start, end;
    
    // 월/주/일에 따라 검색 범위 계산
    if (currentView === 'month') {
        start = new Date(baseDate.getFullYear(), baseDate.getMonth(), 1);
        end = new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 0);
        document.getElementById('main-title').innerText = `${baseDate.getFullYear()}년 ${baseDate.getMonth() + 1}월 달력`;
    } 
    else if (currentView === 'week') {
        let day = baseDate.getDay();
        let diff = baseDate.getDate() - day + (day === 0 ? -6 : 1);
        start = new Date(new Date(baseDate).setDate(diff)); // 월요일
        end = new Date(start);
        end.setDate(end.getDate() + 4); // 금요일
        document.getElementById('main-title').innerText = `${start.getMonth() + 1}.${start.getDate()} ~ ${end.getMonth() + 1}.${end.getDate()} 주간계획`;
    } 
    else {
        start = new Date(baseDate);
        end = new Date(baseDate);
        const days = ['일','월','화','수','목','금','토'];
        document.getElementById('main-title').innerText = `${start.getMonth() + 1}월 ${start.getDate()}일 (${days[start.getDay()]})`;
    }

    try {
        const url = `${WEB_APP_URL}?action=getEvents&start=${start.toISOString()}&end=${end.toISOString()}`;
        const response = await fetch(url);
        const result = await response.json();
        viewData = result; // { events: [...], memos: {...} }

        // 데이터가 도착하면 선택된 뷰 그리기
        if (currentView === 'month') renderMonth(start);
        else if (currentView === 'week') renderWeek(start);
        else renderDay(start);

    } catch (error) {
        document.getElementById('main-title').innerText = "데이터 연동 에러!";
    }
    
    document.getElementById('status-loading').style.display = 'none';
}

// 5. '월' 뷰 그리기 (CSS Grid 달력)
function renderMonth(startDate) {
    const monthEl = document.getElementById('view-month');
    let year = startDate.getFullYear();
    let month = startDate.getMonth();
    
    let firstDay = new Date(year, month, 1).getDay();
    let lastDate = new Date(year, month + 1, 0).getDate();
    
    let html = '<div class="calendar-grid">';
    const daysKor = ['일','월','화','수','목','금','토'];
    daysKor.forEach(d => html += `<div class="cal-header">${d}</div>`);
    
    // 1일 앞의 빈칸
    for (let i = 0; i < firstDay; i++) html += `<div class="cal-cell empty"></div>`;
    
    // 날짜 및 데이터 삽입
    for (let i = 1; i <= lastDate; i++) {
        let current = new Date(year, month, i);
        let dateStr = current.toISOString().split('T')[0];
        
        let dayEvents = viewData.events.filter(e => e.start.split('T')[0] === dateStr);
        let scheduleHtml = dayEvents.map(e => `<div class="cal-evt">${e.title}</div>`).join('');
        let memoIcon = viewData.memos[dateStr] ? `📝` : '';
        
        html += `
        <div class="cal-cell">
            <div class="cal-date"><span>${i}</span><span>${memoIcon}</span></div>
            <div class="cal-evts">${scheduleHtml}</div>
        </div>`;
    }
    html += '</div>';
    
    monthEl.innerHTML = html;
    monthEl.style.display = 'block';
}

// 6. '주' 뷰 그리기 (월~금 세로 전개 표)
function renderWeek(monday) {
    const tbody = document.getElementById('view-tbody');
    let html = '';
    const dayNames = ['월', '화', '수', '목', '금'];
    
    for (let i = 0; i < 5; i++) {
        let d = new Date(monday);
        d.setDate(monday.getDate() + i);
        html += buildDayHtmlRows(d, dayNames[i]);
    }
    
    tbody.innerHTML = html;
    document.getElementById('view-table-wrapper').style.display = 'block';
    attachMemoEvents();
}

// 7. '일' 뷰 그리기 (선택된 하루 표)
function renderDay(targetDate) {
    const tbody = document.getElementById('view-tbody');
    const dayNames = ['일','월','화','수','목','금','토'];
    
    // 주말 거르기
    if (targetDate.getDay() === 0 || targetDate.getDay() === 6) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 40px;">주말은 데이터가 없습니다.</td></tr>';
    } else {
        tbody.innerHTML = buildDayHtmlRows(targetDate, dayNames[targetDate.getDay()]);
    }
    
    document.getElementById('view-table-wrapper').style.display = 'block';
    attachMemoEvents();
}

// 공통 함수: 하루 치(6교시) 표 HTML 블록을 조립하는 기능
function buildDayHtmlRows(dateObj, dayLabel) {
    let dateStr = dateObj.toISOString().split('T')[0]; // YYYY-MM-DD
    let m = dateObj.getMonth() + 1;
    let dt = dateObj.getDate();
    
    let classes = ["", "", "", "", "", ""];
    let scheduleArr = [];
    
    // 해당 날짜 데이터 필터링 및 교시 분리
    viewData.events.forEach(ev => {
        let evDate = ev.start.split('T')[0];
        if (evDate === dateStr) {
            if (ev.allDay) {
                scheduleArr.push(`- ${ev.title}`);
            } else {
                let match = ev.title.match(/^\[(\d+)교시\](.*)/); // 정규식으로 교시와 학반 쪼개기
                if (match) {
                    let p = parseInt(match[1]);
                    if (p >= 1 && p <= 6) classes[p - 1] = match[2];
                } else {
                    scheduleArr.push(`- ${ev.title}`);
                }
            }
        }
    });
    
    let scheduleText = scheduleArr.join('<br>');
    let memoText = viewData.memos[dateStr] || '';
    let rowHtml = '';

    for (let p = 1; p <= 6; p++) {
        rowHtml += '<tr>';
        
        if (p === 1) { // 1교시일 때만 구분/날짜/일정/메모 칸을 병합(세로로 크게)
            rowHtml += `<td rowspan="6" class="bg-gray-header col-day">${dayLabel}</td>`;
            rowHtml += `<td rowspan="6" class="col-date">${m}.${dt}</td>`;
        }
        
        rowHtml += `<td class="bg-gray-header col-period">${p}교시</td>`;
        rowHtml += `<td class="col-class">${classes[p-1] ? `<div class="class-box">${classes[p-1]}</div>` : ''}</td>`;
        
        if (p === 1) {
            rowHtml += `<td rowspan="6" class="col-schedule">${scheduleText}</td>`;
            rowHtml += `<td rowspan="6" class="col-memo">
                <textarea class="memo-input" data-date="${dateStr}" placeholder="터치하여 메모 입력...">${memoText}</textarea>
            </td>`;
        }
        rowHtml += '</tr>';
    }
    return rowHtml;
}

// 8. 메모 자동 저장 이벤트 부여 (디바운싱 기법 적용)
function attachMemoEvents() {
    const textareas = document.querySelectorAll('.memo-input');
    textareas.forEach(ta => {
        ta.addEventListener('input', (e) => {
            const dateStr = e.target.getAttribute('data-date');
            const memoText = e.target.value;
            e.target.style.backgroundColor = '#fff9c4'; // 노란색: 입력 & 저장 대기 중
            
            clearTimeout(memoTimeouts[dateStr]); // 1초 대기 (서버 부하 방지)
            memoTimeouts[dateStr] = setTimeout(async () => {
                try {
                    const url = `${WEB_APP_URL}?action=saveMemo&date=${dateStr}&memo=${encodeURIComponent(memoText)}`;
                    const res = await fetch(url);
                    const json = await res.json();
                    if(json.success) e.target.style.backgroundColor = 'transparent'; // 초록색: 완료
                    else e.target.style.backgroundColor = '#ffcdd2'; // 빨간색: 에러
                } catch(err) {
                    e.target.style.backgroundColor = '#ffcdd2';
                }
            }, 1000);
        });
    });
}
