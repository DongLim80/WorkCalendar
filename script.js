// 선생님의 구글 앱스 스크립트 웹 앱 URL
const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbztEDUhTVL_1zXG-r69oPNkpG10AgxAxtUbhzBzhV9TQ0y_RBdV5Q-K4MVn0NKEbZCy/exec';
let weeklyData = null; // 데이터를 담아둘 빈 바구니

// 웹페이지가 열리면 즉시 실행되는 함수
document.addEventListener('DOMContentLoaded', () => {
    fetchData();
    setupTabs();
});

// 1. 구글 서버에서 데이터 긁어오기
async function fetchData() {
    try {
        const response = await fetch(WEB_APP_URL);
        const result = await response.json();
        weeklyData = result.data; // 구글 시트 A1:F32 데이터 저장

        // 상단 타이틀 채우기
        document.getElementById('main-title').innerText = `${weeklyData[0][2]} ${weeklyData[0][3]}`;
        document.getElementById('sub-title').innerText = weeklyData[0][5];

        // 데이터가 다 모였으니 화면에 그리기
        renderWeek();

    } catch (error) {
        console.error("데이터 로드 오류:", error);
        document.getElementById('status-loading').innerHTML = '<span style="color:red;">데이터 연동 실패! 웹 앱 URL을 확인해주세요.</span>';
    }
}

// 2. 캡처 이미지와 100% 동일한 '세로 전개형 표' 그리기
function renderWeek() {
    const tbody = document.getElementById('view-tbody');
    let html = '';
    const dayNames = ['월', '화', '수', '목', '금'];

    // 5일(월~금) 동안 반복
    for (let i = 0; i < 5; i++) {
        let baseIdx = 2 + (i * 6); // 각 요일이 시작되는 행 인덱스
        
        // 날짜 텍스트 정제 (숫자만 추출)
        let month = weeklyData[baseIdx][0].replace(/[^0-9]/g, '');
        let date = weeklyData[baseIdx + 2][0].replace(/[^0-9]/g, '');
        let dayLabel = weeklyData[baseIdx + 4][0].replace(/[\(\)]/g, '');
        let schedule = (weeklyData[baseIdx][4] || '').replace(/\n/g, '<br>'); // 학사일정 줄바꿈 처리

        // 1교시부터 6교시까지 행(Row) 생성
        for (let p = 1; p <= 6; p++) {
            let className = weeklyData[baseIdx + p - 1][2] || '';
            
            html += '<tr>';
            
            // ★ 핵심: 1교시를 그릴 때만 [구분, 날짜, 학사일정] 셀을 세로로 6칸 병합(rowspan=6) 합니다.
            if (p === 1) {
                html += `<td rowspan="6" class="bg-gray-header">${dayNames[i]}</td>`;
                html += `<td rowspan="6" style="font-weight:bold;">${month}.${date}<br>(${dayLabel})</td>`;
            }
            
            html += `<td class="bg-gray-header">${p}교시</td>`;
            html += `<td><span style="${className ? 'background-color:#e8f5e9; color:#1b5e20; padding:4px 8px; border-radius:4px; font-weight:bold;' : ''}">${className}</span></td>`;
            
            if (p === 1) {
                html += `<td rowspan="6" style="text-align:left; vertical-align:top; font-size:13px; line-height:1.5;">${schedule}</td>`;
            }
            
            html += '</tr>';
        }
    }

    // 완성된 HTML 덩어리를 표 안에 밀어넣기
    tbody.innerHTML = html;
    
    // 로딩 문구 숨기고 완성된 표 보여주기
    document.getElementById('status-loading').style.display = 'none';
    document.getElementById('view-matrix').style.display = 'table';
}

// 3. 월/주/일 탭 제어 기능
function setupTabs() {
    const tabs = document.querySelectorAll('.btn-tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', (e) => {
            // 현재 구글 시트 Apps Script 로직이 1주일치(A1:F32)만 리턴하게 되어있어
            // 월/일 보기는 추후 기능 확장을 위해 알림만 띄우고 주간으로 고정해둡니다.
            if(e.target.id !== 'tab-week') {
                alert('현재 구글 시트가 1주일 단위로 데이터를 제공하도록 설정되어 있어, 지금은 주간 보기만 완벽히 지원됩니다!');
                return;
            }
            
            tabs.forEach(t => t.classList.remove('active'));
            e.target.classList.add('active');
        });
    });
}