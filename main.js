
var canSubmitByQuota = false; // 用來記錄名額是否正常
var canSubmitByPhone = false; // 用來記錄名額是否正常
var roomPriceMap = {};
var allCourseData = [];
var allCourseDataPast = [];
var allRoomBookState = [];
var globalSingleBookedMap = {};
var globalDiscountRate = 0.9;
var earlyBirdDate = "";
var earlyBirdDiscount = 1;
var globalAccountNumber = "";
var globalSettings = {};
var aiTomorrowWeatherText = "正在連線氣象局獲取最新預報中資訊...";
var aiChatHistory = [];
var aiStoreConfig = {
  "停車資訊": "300新竹市北區東大路537號對面停車場（步行3分鐘，公立停車場，非合作或特約）",
  "場館設施": "教室內備有冷熱飲水機、專屬男女更衣室以及置物櫃。為了維護舞蹈教室的木地板，進來上課請記得自備「乾淨的室內運動鞋」或換穿我們的室內拖鞋唷！",
  "廁所在哪裡": "一進門的走廊到底左手邊就是男女化妝室囉。",
  "官方LINE": "@843qpnet",
  "外部課程": "6月20/21/27/28共四天有「用 AI 打造你的全自動化數位商店」課程，報名方式請洽官LINE"
};
const COMMON_INFO_BTNS = `
  <div class="info-card-btn" onclick="toggleDrawer('rules-content', '教室使用規章')">
    <span style="font-size: 1.5em;">教室規章</span>
    <small style="color:#f089a1; margin-top: 8px;">查看詳情 ➔</small>
  </div>
  <div class="info-card-btn" onclick="toggleDrawer('payment-info-content', '匯款帳戶資訊')">
    <span style="font-size: 1.5em;">匯款資訊</span>
    <small style="color:#f089a1; margin-top: 8px;">查看帳號 ➔</small>
  </div>
`;
let aiStime = 0;
let aiEtime = 0;
let textTimer;
// 註冊一個自訂的 HTML 標籤元件
class CustomNoticePulse extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
      <div class="notice-pulse-container">
        <div class="notice-pulse-text" style="display: inline-flex; align-items: center; gap: 6px;">
          <svg class="flicker-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" style="width: 25px; height: 25px; fill: #e74c3c;">
            <path d="M320 64C334.7 64 348.2 72.1 355.2 85L571.2 485C577.9 497.4 577.6 512.4 570.4 524.5C563.2 536.6 550.1 544 536 544L104 544C89.9 544 76.8 536.6 69.6 524.5C62.4 512.4 62.1 497.4 68.8 485L284.8 85C291.8 72.1 305.3 64 320 64zM320 416C302.3 416 288 430.3 288 448C288 465.7 302.3 480 320 480C337.7 480 352 465.7 352 448C352 430.3 337.7 416 320 416zM320 224C301.8 224 287.3 239.5 288.6 257.7L296 361.7C296.9 374.2 307.4 384 319.9 384C332.5 384 342.9 374.3 343.8 361.7L351.2 257.7C352.5 239.5 338.1 224 319.8 224z" />
          </svg>
          請一次報名一人唷
          <svg class="flicker-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" style="width: 25px; height: 25px; fill: #e74c3c;">
            <path d="M320 64C334.7 64 348.2 72.1 355.2 85L571.2 485C577.9 497.4 577.6 512.4 570.4 524.5C563.2 536.6 550.1 544 536 544L104 544C89.9 544 76.8 536.6 69.6 524.5C62.4 512.4 62.1 497.4 68.8 485L284.8 85C291.8 72.1 305.3 64 320 64zM320 416C302.3 416 288 430.3 288 448C288 465.7 302.3 480 320 480C337.7 480 352 465.7 352 448C352 430.3 337.7 416 320 416zM320 224C301.8 224 287.3 239.5 288.6 257.7L296 361.7C296.9 374.2 307.4 384 319.9 384C332.5 384 342.9 374.3 343.8 361.7L351.2 257.7C352.5 239.5 338.1 224 319.8 224z" />
          </svg>
        </div>
      </div>
    `;
  }
}
// 定義新標籤名稱 (名稱中間必須帶有至少一個橫線 - )
customElements.define('custom-notice-pulse', CustomNoticePulse);
// 0. 網頁載入時，自動抓取後端試算表的課程清單填入下拉選單
window.addEventListener('load', function () {
  const startTime = performance.now();
  console.log("開始載入資料...");
  const loadingTexts = ["連線至微動身活...", "正在載入期課課表...", "正在載入本月課表...", "正在讀取報名資料...", "正在讀取預約資料...", "準備就緒..."];
  let textIdx = 0;
  const subtitleTextEl = document.getElementById('loading-text-content');

  if (subtitleTextEl) {
    textTimer = setInterval(() => {
      textIdx = (textIdx + 1) % loadingTexts.length;
      subtitleTextEl.innerText = loadingTexts[textIdx];
    }, 1500);
  }
  callGasApi("getAppInitData")
    .then(function (initData) {
      const mTime = performance.now();
      const durationSeconds = ((mTime - startTime) / 1000).toFixed(3);
      console.log(`🎉 載入成功！總共花費了 ${durationSeconds} 秒。`);
      // 1. 將後端抓回的資料直接塞入全域變數中，供各功能隨時撈取
      globalSettings = initData.settings;
      allCourseData = initData.currentCourses;
      allCourseDataPast = initData.pastCourses;
      allRoomBookState = initData.popularWallData;
      globalSingleBookedMap = initData.singleBookedMap;
      renderAllRules();
      // 2. 處理網頁與表單標題
      //document.getElementById('main-title').innerText = globalSettings.title[0] + "\n課程報名｜教室預約";
      document.getElementById('main-title').innerText = "課程報名｜教室預約";
      document.getElementById('all-course-title').innerHTML = `
      <span style="display: inline-flex; align-items: center; justify-content: center; gap: 8px;">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" style="width: 24px; height: 24px; fill: #D05A6E;">
          <path d="M216 64C229.3 64 240 74.7 240 88L240 128L400 128L400 88C400 74.7 410.7 64 424 64C437.3 64 448 74.7 448 88L448 128L480 128C515.3 128 544 156.7 544 192L544 480C544 515.3 515.3 544 480 544L160 544C124.7 544 96 515.3 96 480L96 192C96 156.7 124.7 128 160 128L192 128L192 88C192 74.7 202.7 64 216 64zM216 176L160 176C151.2 176 144 183.2 144 192L144 240L496 240L496 192C496 183.2 488.8 176 480 176L216 176zM144 288L144 480C144 488.8 151.2 496 160 496L480 496C488.8 496 496 488.8 496 480L496 288L144 288z"/>
        </svg>
        整期課程報名 (${globalSettings.title[1]})
      </span>
    `;
      //<!--!Font Awesome Free v7.2.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2026 Fonticons, Inc.-->
      document.getElementById('single-course-title').innerHTML = `
      <span style="display: inline-flex; align-items: center; justify-content: center; gap: 8px;">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" style="width: 24px; height: 24px; fill: #D05A6E;">
          <path d="M96 128C60.7 128 32 156.7 32 192L32 256C32 264.8 39.4 271.7 47.7 274.6C66.5 281.1 80 299 80 320C80 341 66.5 358.9 47.7 365.4C39.4 368.3 32 375.2 32 384L32 448C32 483.3 60.7 512 96 512L544 512C579.3 512 608 483.3 608 448L608 384C608 375.2 600.6 368.3 592.3 365.4C573.5 358.9 560 341 560 320C560 299 573.5 281.1 592.3 274.6C600.6 271.7 608 264.8 608 256L608 192C608 156.7 579.3 128 544 128L96 128zM448 400L448 240L192 240L192 400L448 400zM144 224C144 206.3 158.3 192 176 192L464 192C481.7 192 496 206.3 496 224L496 416C496 433.7 481.7 448 464 448L176 448C158.3 448 144 433.7 144 416L144 224z"/>
        </svg>
        單堂課程報名 (${globalSettings.title[2]})
      </span>
    `;
      //<!--!Font Awesome Free v7.2.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2026 Fonticons, Inc.-->

      // 3. 處理跑馬燈邏輯
      const newsBoardEl = document.getElementById('news-board-content');
      if (globalSettings.marqueeText && newsBoardEl) {
        const newsLines = globalSettings.marqueeText.split(/\r?\n/).map(line => line.trim()).filter(line => line !== "");

        if (newsLines.length > 0) {
          let currentLineIndex = 0;

          function getNewsHtml(line) {
            let tagText = "NEW";
            let messageText = line;

            const match = line.match(/^\[(.*?)\](.*)/);
            if (match) {
              tagText = match[1].trim(); // 取得中括號內的字 (例如: NEW, HOT, 報名)
              messageText = match[2].trim(); // 取得中括號後面的字 (例如: 蝶谷巴特手做課程)
            }

            const badgeHtml = `<span style="background: linear-gradient(135deg, #FFD1DC 0%, #E87A90 100%); color: white; padding: 2px 7px; border-radius: 50px; font-size: 0.55em; font-weight: bold; margin-right: 5px; display: inline-block; vertical-align: middle; box-shadow: 0 2px 5px rgba(232, 122, 144, 0.2);"><span class="badge-text-heartbeat">${tagText}</span></span>`;

            return badgeHtml + `<span style="vertical-align: middle;">${messageText}</span>`;
          }

          newsBoardEl.innerHTML = getNewsHtml(newsLines[currentLineIndex]);

          setInterval(function () {
            newsBoardEl.classList.add('exit');

            setTimeout(function () {
              currentLineIndex = (currentLineIndex + 1) % newsLines.length;

              newsBoardEl.innerHTML = getNewsHtml(newsLines[currentLineIndex]);

              newsBoardEl.classList.remove('exit');
              newsBoardEl.classList.add('enter');

              void newsBoardEl.offsetWidth;

              newsBoardEl.classList.remove('enter');
            }, 600);

          }, 5000); // 每 5 秒鐘換下一行 (如果你要10秒，記得這裡改成 10000)

        } else {
          newsBoardEl.parentNode.style.display = 'none';
        }
      } else if (newsBoardEl) {
        newsBoardEl.parentNode.style.display = 'none';
      }

      // 4. 配置折扣與早鳥日期參數
      globalDiscountRate = globalSettings.discount;
      earlyBirdDate = globalSettings.earlyBirdDate;
      earlyBirdDiscount = globalSettings.earlyBirdDiscount;

      const targetDate = new Date(earlyBirdDate);
      targetDate.setHours(23, 59, 59, 999);

      if (earlyBirdDate && new Date().getTime() <= targetDate.getTime()) {
        const countdownContainer = document.getElementById('earlybird-countdown-container');
        const dEl = document.getElementById('cd-days');
        const hEl = document.getElementById('cd-hours');
        const mEl = document.getElementById('cd-minutes');
        const sEl = document.getElementById('cd-seconds');
        document.getElementById('priceDisplayAreaEb').style.display = "inline-flex";

        function updateCountdown() {
          const now = new Date().getTime();
          const distance = targetDate.getTime() - now;

          if (distance < 0) {
            if (countdownContainer) countdownContainer.style.display = 'none';
            clearInterval(countdownInterval);
            return;
          }

          const days = Math.floor(distance / (1000 * 60 * 60 * 24));
          const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
          const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
          const seconds = Math.floor((distance % (1000 * 60)) / 1000);

          if (countdownContainer && countdownContainer.style.display === 'none') {
            countdownContainer.style.display = 'block'; // 確保時間未到時可見
          }
          if (dEl) animateCountdownValue(dEl, String(days).padStart(2, '0'));
          if (hEl) animateCountdownValue(hEl, String(hours).padStart(2, '0'));
          if (mEl) animateCountdownValue(mEl, String(minutes).padStart(2, '0'));
          if (sEl) animateCountdownValue(sEl, String(seconds).padStart(2, '0'));
        }

        updateCountdown();
        const countdownInterval = setInterval(updateCountdown, 1000);
      }

      // 5. 處理銀行匯款帳戶文字顯示
      const bank = globalSettings.bank;
      const bankStr = `${bank.bankCode}（${bank.bankName}）`;
      document.querySelectorAll('.bank-info-display').forEach(el => { el.textContent = bankStr; });
      document.querySelectorAll('.account-number-display').forEach(el => { el.textContent = bank.accountNumber; });
      globalAccountNumber = bank.accountNumber;
      const fullAccountStr = `${bankStr}\n${bank.accountNumber}`;
      document.querySelectorAll('.account-display').forEach(el => { el.textContent = fullAccountStr; });

      // 6. 初始化教室選擇下拉選單
      const selectRoom = document.getElementById('roomSelect');
      if (selectRoom && globalSettings.rooms) {
        selectRoom.innerHTML = '<option value="">-- 請選擇教室 --</option>';
        let priceHtml = "";
        globalSettings.rooms.forEach(function (room) {
          const option = document.createElement('option');
          option.value = room.name; option.text = room.name;
          selectRoom.appendChild(option);
          roomPriceMap[room.name] = room.price;
          priceHtml += `• ${room.name}：<strong>${room.price}/小時</strong><br>`;
        });
        const priceDisplay = document.getElementById('room-price-display');
        if (priceDisplay) { priceDisplay.innerHTML = priceHtml; }
      }
      buildCustomDropdown('roomSelect', 'customRoomDropdown', 'customRoomMenu', '--選擇教室--');

      // 7. 💡 渲染「當期整期課表表單與手風琴」
      if (initData.openTimestamp) {
        if (initData.serverTime >= initData.openTimestamp) {
          var scheduleBody = document.getElementById('schedule-body');
          if (scheduleBody) {
            scheduleBody.innerHTML = `
            <div style="
              padding: 40px 20px; 
              text-align: center; 
              color: #D05A6E; 
              background-color: #fff5f7; 
              border: 2px dashed #E87A90; 
              border-radius: 12px; 
              margin: 20px auto;
              max-width: 90%;
            ">
              <div style="font-size: 2rem; margin-bottom: 10px;">⏳</div>
              <div style="font-size: 1.2rem; font-weight: bold; letter-spacing: 1px;">最新課表準備中，敬請期待！</div>
            </div>
          `;
          }
        } else {
          renderCurrentCoursesUI(initData.currentCourses);
        }
      } else {
        renderCurrentCoursesUI(initData.currentCourses);
      }

      // 8. 💡 渲染「前期單堂課程手風琴」
      const scheduleBodyPast = document.getElementById('schedule-body-past');
      if (scheduleBodyPast) {
        renderAccordionSchedule(allCourseDataPast, scheduleBodyPast, "SINGLE");
      }
      // 動態牆
      const wallSection = document.getElementById('popularBookingWall');
      const wallContainer = document.getElementById('popularWallContainer');
      if (wallSection && wallContainer) {
        if (initData.popularWallData && initData.popularWallData.length > 0) {
          wallSection.style.display = 'block';

          let wallItemsData = initData.popularWallData;

          // 若資料過少 (小於 5 筆)，我們將陣列複製疊加，確保有足夠的節點能完美執行「進場/退場」的狀態切換
          if (wallItemsData.length > 0 && wallItemsData.length < 5) {
            wallItemsData = [...wallItemsData, ...wallItemsData, ...wallItemsData];
          }

          let wallHtml = '';
          wallItemsData.forEach(item => {
            wallHtml += `
            <div class="booking-wall-item" style="border-left: 5px solid ${item.color};">
              <div class="wall-date">${item.displayDate}</div>
              <div class="wall-status" style="background-color: ${item.bgColor}; color: ${item.color}; border: 1px solid ${item.color};">
                ${item.status}
              </div>
            </div>
            `;
          });
          wallContainer.innerHTML = wallHtml;

          // 清除可能殘留的舊計時器
          if (window.popularWallInterval) clearInterval(window.popularWallInterval);
          window.currentWallIndex = 0; // 重置起點

          // 更新卡片狀態的函數
          function updateWallPositions() {
            const items = document.querySelectorAll('#popularWallContainer .booking-wall-item');
            const total = items.length;
            if (total === 0) return;

            // 先清除所有狀態 Class
            items.forEach(item => {
              item.classList.remove('wall-pos-0', 'wall-pos-1', 'wall-pos-2', 'wall-pos-exit', 'wall-pos-enter');
            });

            // 計算當前輪播的各個目標索引
            const idx0 = window.currentWallIndex % total;
            const idx1 = (window.currentWallIndex + 1) % total;
            const idx2 = (window.currentWallIndex + 2) % total;
            const idxExit = (window.currentWallIndex - 1 + total) % total;  // 剛退場的卡片
            const idxEnter = (window.currentWallIndex + 3) % total;         // 準備進場的卡片

            // 賦予新的狀態 Class
            items[idx0].classList.add('wall-pos-0');
            items[idx1].classList.add('wall-pos-1');
            items[idx2].classList.add('wall-pos-2');
            items[idxExit].classList.add('wall-pos-exit');
            items[idxEnter].classList.add('wall-pos-enter');
          }

          // 初始化第一次排版
          updateWallPositions();

          // 設定每 3 秒往上滾動輪播一次 (可自行調整毫秒數)
          window.popularWallInterval = setInterval(() => {
            const items = document.querySelectorAll('#popularWallContainer .booking-wall-item');
            if (items.length === 0) return;

            // 指標 +1，並觸發重新計算
            window.currentWallIndex = (window.currentWallIndex + 1) % items.length;
            updateWallPositions();
          }, 5000);

        } else {
          wallSection.style.display = 'none';
        }
      }



      // 9. 💡 初始化「單堂下拉選單」與「查詢老師下拉選單」
      initSingleCourseDropdown();
      renderTeacherDropdownUI(initData.teachers);
      buildCustomDropdown('teacherSearchInput', 'customTeacherSearchDropdown', 'customTeacherSearchMenu', '-- 請選擇老師 --');
      buildCustomDropdown('participantCount', 'customParticipantDropdown', 'customParticipantMenu', '1 人');

      // 10. 💡 判斷單堂課程報名是否開放與分頁引導限制
      if (initData.openTimestamp) {
        if (initData.serverTime >= initData.openTimestamp) {
          var btnFullTerm = document.getElementById('btn-full-term');
          var btnSingleClass = document.getElementById('btn-single-class');
          if (btnFullTerm && btnSingleClass) {
            btnFullTerm.disabled = true;
            btnSingleClass.disabled = false;
            openSubTab({ currentTarget: btnSingleClass }, 'singleCourseSection');
          }
        }
      }

      // 💡 渲染「活動照片」到抽屜中 (乾淨無事件版)
      const picBody = document.getElementById('pic-body');
      if (picBody) {
        if (initData.photos && initData.photos.length > 0) {
          picBody.innerHTML = '';
          initData.photos.forEach(url => {
            const img = document.createElement('img');
            img.src = url;
            img.className = 'photo-card';
            img.setAttribute('referrerpolicy', 'no-referrer');
            picBody.appendChild(img);
          });
        } else {
          picBody.innerHTML = '<p style="color: #999; text-align: center; width: 100%;">目前沒有活動照片</p>';
        }
      }
      renderNewsCarousel(initData.newsphotos);

      const endTime = performance.now();
      // 3. 計算差值並換算成秒數 (保留三位小數)
      const durationSecondss = ((endTime - mTime) / 1000).toFixed(3);
      closeOverlay();
      console.log(`🎉 渲染成功！總共花費了 ${durationSecondss} 秒。`);
    })
    .catch(function (error) {
      console.error("❌ 系統初始化失敗:", error);
    }); // 🔄 改為只呼叫這一個整合大禮包函式
});

function animateCountdownValue(el, newValue) {
  let inner = el.querySelector('i.num-inner');

  // 如果沒有內層，就動態建立一個 <i> 標籤
  if (!inner) {
    el.innerHTML = `<i class="num-inner">${newValue}</i>`;
    inner = el.querySelector('i.num-inner');
    return; // 第一次建立不需要動畫
  }

  // 如果數值沒變，就不執行任何動作
  if (inner.innerText === newValue) return;

  // 1. 執行向上滑出動畫
  inner.classList.add('exit');

  // 2. 等待滑出動畫結束 (250ms)
  setTimeout(() => {
    inner.innerText = newValue;        // 替換新數字
    inner.classList.remove('exit');
    inner.classList.add('enter');      // 瞬間移動到下方

    void inner.offsetWidth;            // ⚠️ 強制瀏覽器重繪 (重要！沒有這行不會有動畫)

    // 3. 拔掉 enter，數字就會平滑滑入原位
    inner.classList.remove('enter');
  }, 250);
}

// 抽出：單獨處理當期整期課程的 UI 渲染器
function renderCurrentCoursesUI(courses) {
  const select = document.getElementById('itemQueryName');
  const checkboxContainer = document.getElementById('checkbox-container');
  const scheduleBody = document.getElementById('schedule-body');
  const days = ["週一", "週二", "週三", "週四", "週五", "週六", "週日"];
  const englishDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  select.innerHTML = '<option value="">-- 請選擇課程 --</option>';
  checkboxContainer.innerHTML = '';

  courses.forEach(function (courseObj) {
    const courseName = courseObj.name;
    const option = document.createElement('option');
    option.value = courseName; option.text = courseName;
    if (courseName.includes("★")) { option.disabled = true; option.style.fontWeight = "bold"; }
    select.appendChild(option);

    if (!courseName.includes("★")) {
      const wrapper = document.createElement('div');
      wrapper.className = 'course-anim-wrapper';
      let courseDay = "";
      days.forEach(function (d) { if (courseName.includes(d)) courseDay = d; });
      wrapper.setAttribute('data-day', courseDay);
      wrapper.style.display = "none";

      const label = document.createElement('label');
      label.className = 'checkbox-item';
      const input = document.createElement('input');
      input.type = 'checkbox'; input.name = 'items'; input.value = courseName;
      input.onchange = updateSelectedDisplay;

      const span = document.createElement('span');
      span.className = 'no-wrap-text';

      try {
        const parts = courseName.split(" ");
        if (parts.length >= 3) {
          const nameTeacher = parts[0].split("-");
          span.innerHTML = `
            <strong style="color: #d14d72; font-size: 1.05rem;">${nameTeacher[0]}</strong> 
            <span style="color: #7f8c8d; font-size: 0.9rem;">(${nameTeacher[1] || ""})</span><br>
            <span style="background: #FFF5F7; color: #E87A90; padding: 2px 6px; border-radius: 6px; font-size: 0.85rem; border: 1px solid #F4A7B9; text-align: center; display: block; width: 80px; margin-top: 1px;">${parts[2]}</span>`;
        } else { span.innerText = courseName; }
      } catch (err) { span.innerText = courseName; }

      label.appendChild(input); label.appendChild(span);
      wrapper.appendChild(label); checkboxContainer.appendChild(wrapper);
    }
  });

  // 預設切換至今天星期的分頁
  const currentDay = ["週日", "週一", "週二", "週三", "週四", "週五", "週六"][new Date().getDay()];
  filterDay(currentDay, null);

  // 渲染大課表手風琴 (整期)
  if (scheduleBody) {
    let termText = globalSettings?.title?.[1] || "";
    let accordionHtml = '<div class="accordion-container">';
    if (termText) {
      accordionHtml += `
        <div style="text-align: center; padding: 10px 0 15px 0; color: #d14d72; font-weight: bold; font-size: 1.25em; letter-spacing: 2px;">
          ${termText}
        </div>
      `;
    }
    days.forEach((day, index) => {
      const dayCourses = courses.filter(c => c.name.includes(day) && !c.name.includes('★'));
      accordionHtml += `
        <div class="day-card">
          <div class="card-header" onclick="toggleAccordion(this)">
            <span>${day} <small style="font-weight:normal; opacity:0.6; margin-left:5px;">${englishDays[index]}</small></span>
            <span class="arrow" style="transition: transform 0.3s;">▼</span>
          </div>
          <div class="card-body">`;

      if (dayCourses.length > 0) {
        dayCourses.sort((a, b) => {
          const timeA = a.name.match(/\d{2}:\d{2}/); const timeB = b.name.match(/\d{2}:\d{2}/);
          return (timeA && timeB) ? timeA[0].localeCompare(timeB[0]) : 0;
        });
        dayCourses.forEach(course => {
          const parts = course.name.split(" "); const nameTeacher = parts[0].split("-");
          const timeRange = parts[2] || ""; const remaining = course.remaining; const max = course.maxCapacity;
          const times = timeRange.split("-");
          const quotaHtml = (remaining <= 0) ? `<br><span style="color:red; font-weight:bold;">(已額滿)</span>` : `<br><span style="color:#4CAF50;">(尚餘名額 ${remaining}/${max})</span>`;
          accordionHtml += `
            <div class="accordion-course-item" style="cursor: pointer;" title="點擊直接加入預約" onclick="selectFromScheduleSingle('${course.name.replace(/'/g, "\\'")}')">
              <div class="time-tag"><span>${times[0] || ""}</span><div class="time-line"></div><span>${times[1] || ""}</span></div>
              <div class="course-info"><b>${nameTeacher[0]}</b> - ${nameTeacher[1] || ""} ${quotaHtml}</div>
            </div>`;
        });
      } else {
        accordionHtml += `<div style="padding:15px; color:#ccc; text-align:center;">今日暫無排課</div>`;
      }
      accordionHtml += `</div></div>`;
    });
    accordionHtml += '</div>';
    scheduleBody.innerHTML = accordionHtml;
  }
}

// 抽出：單獨處理老師查詢下拉選單的 UI 渲染器
function renderTeacherDropdownUI(teachers) {
  const select = document.getElementById('teacherSearchInput');
  select.innerHTML = '<option value="">請選擇老師</option>';
  if (teachers.length === 0) {
    select.innerHTML = '<option value="">無老師資料</option>';
    return;
  }
  teachers.forEach(function (name) {
    const option = document.createElement('option');
    option.value = name; option.text = name;
    select.appendChild(option);
  });
}

/**
 * 渲染所有規章與注意事項
 * 請在取得 GAS 回傳資料並設定好 globalSettings 後呼叫此函式
 */
function renderAllRules() {
  // 確認資料是否存在
  if (!globalSettings || !globalSettings.rules) return;

  const rulesMap = globalSettings.rules;

  // 建立「試算表名稱」與「HTML ID」的對應字典
  const idMapping = {
    "報名須知": "noticeDisplayArea",
    "課程費用": "priceDisplayArea",
    "取消政策": "policyDisplayArea",
    "教室規章": "rulesDisplayArea",
    "行前通知": "remindDisplayArea"
  };

  for (const sheetCategory in rulesMap) {
    const targetId = idMapping[sheetCategory] || sheetCategory;
    const container = document.getElementById(targetId);

    // 如果畫面上沒有這個 ID 的容器，就跳過
    if (!container) continue;

    // 清空該容器
    container.innerHTML = '';

    const items = rulesMap[sheetCategory];

    // 依序生成這個 ID 裡面的所有區塊
    items.forEach(item => {

      let parsedContent = item.content;
      parsedContent = parsedContent.replace(/\*(.*?)\*/g, '<strong>$1</strong>');
      parsedContent = parsedContent.replace(/!(.*?)!/g, '<strong style="color:#e74c3c;">$1</strong>');
      parsedContent = parsedContent.replace(/\n/g, '<br>');

      if (item.title === "⚠️ 注意事項") {

        // 🌟 特殊樣式：黃色警告框
        const warningDiv = document.createElement('div');
        warningDiv.style.cssText = 'margin-top: 20px; padding: 15px; background: #fff9db; border-radius: 8px; font-size: 0.85rem; color: #856404;';

        // 把固定的標題跟處理好的內文組裝起來
        warningDiv.innerHTML = `<strong>⚠️ 注意事項：</strong><br>${parsedContent}`;

        // 直接塞入容器中
        container.appendChild(warningDiv);

      } else {

        const section = document.createElement('section');
        section.style.cssText = 'margin-bottom: 25px;';

        const h4 = document.createElement('h4');
        h4.style.cssText = 'color:#2c3e50; border-bottom: 2px solid #f1f3f5; padding-bottom: 5px; margin-top: 0;';
        h4.innerText = item.title;
        section.appendChild(h4);

        const contentDiv = document.createElement('div');
        contentDiv.style.cssText = 'padding-left: 10px; border-left: 3px solid #E87A90; margin-top: 10px; line-height: 1.6; color: #555;';
        contentDiv.innerHTML = parsedContent; // 塞入處理好的內文

        section.appendChild(contentDiv);
        container.appendChild(section);

      }
    });
  }
}

function openQueryTab(evt, tabName) {
  const targetBtn = evt.currentTarget;
  const parentNode = targetBtn.parentElement;
  const ghost = document.getElementById('query-ghost-tab');
  const currentActiveBtn = parentNode.querySelector(".tab-btn.active");

  if (!currentActiveBtn || currentActiveBtn === targetBtn) {
    executeQueryTabSwitch(targetBtn, parentNode, tabName);
    return;
  }

  if (ghost && parentNode) {
    const pRect = parentNode.getBoundingClientRect();
    const cRect = currentActiveBtn.getBoundingClientRect();
    const tRect = targetBtn.getBoundingClientRect();
    const startX = cRect.left - pRect.left;
    const startY = cRect.top - pRect.top;
    const endX = tRect.left - pRect.left;
    const endY = tRect.top - pRect.top;

    // 同步幽靈按鈕內部的文字與尺寸，飛過去時才最自然
    ghost.innerText = currentActiveBtn.innerText;
    ghost.style.width = cRect.width + "px";
    ghost.style.height = cRect.height + "px";

    ghost.style.setProperty('--sx', startX + "px");
    ghost.style.setProperty('--sy', startY + "px");
    ghost.style.setProperty('--ex', endX + "px");
    ghost.style.setProperty('--ey', endY + "px");

    currentActiveBtn.classList.remove('active');
    ghost.classList.remove('ghost-moving');
    void ghost.offsetWidth;
    ghost.classList.add('ghost-moving');

    setTimeout(() => {
      ghost.classList.remove('ghost-moving');
      currentActiveBtn.style.opacity = "1";
      executeQueryTabSwitch(targetBtn, parentNode, tabName);
    }, 350);
  } else {
    executeQueryTabSwitch(targetBtn, parentNode, tabName);
  }
}

function executeQueryTabSwitch(targetBtn, parentNode, tabName) {
  const btns = parentNode.querySelectorAll(".tab-btn");
  for (let i = 0; i < btns.length; i++) {
    btns[i].classList.remove("active");
  }
  targetBtn.classList.add("active");

  // 精準只隱藏查詢系統旗下的分頁，不再干擾外部報名系統
  const contents = document.getElementsByClassName("query-tab-content");
  for (let i = 0; i < contents.length; i++) {
    contents[i].classList.remove("active");
    contents[i].style.display = "none";
    // ✨ 順便移除淡入 class，確保下次切換回來時能重新觸發動畫
    contents[i].classList.remove("fade-in-section");
  }

  const targetContent = document.getElementById(tabName);
  if (targetContent) {
    targetContent.classList.add("active");
    targetContent.style.display = "block";

    // ✨ 魔法兩行：強制瀏覽器重繪 (Reflow)，並掛上淡入動畫
    void targetContent.offsetWidth;
    targetContent.classList.add("fade-in-section");
  }
}


// 1. 處理報名提交 (含時間衝突防呆)
document.getElementById('regForm').addEventListener('submit', function (e) {
  e.preventDefault();
  const btn = document.getElementById('submitBtn');
  const output = document.getElementById('regOutput');
  const pCount = parseInt(document.getElementById('participantCount').value) || 1;

  // --- [保留邏輯 1：基礎驗證] ---
  const agreement = document.getElementById('agreementCheckbox');
  if (!agreement.checked) {
    output.style.color = "#e74c3c";
    output.innerHTML = "⚠️ <b>請先勾選：</b>「本人已詳細閱讀相關資訊」後再提交。";
    output.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }

  if (!canSubmitByQuota) {
    output.style.color = "#e74c3c";
    output.innerHTML = "⚠️ <b>無法提交！</b><br>您未選擇課程或包含「已額滿」項目，請修正後再提交。";
    output.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }

  if (!canSubmitByPhone) {
    output.style.color = "#e74c3c";
    output.innerHTML = "⚠️ <b>無法提交！</b><br>請輸入正確的電話格式。";
    output.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }

  // --- [保留邏輯 2：衝突檢查] ---
  const checkboxes = document.querySelectorAll('input[name="items"]:checked');
  const selectedItems = Array.from(checkboxes).map(cb => cb.value);

  if (selectedItems.length >= 2) {
    let conflicts = [];
    let parsedItems = [];
    selectedItems.forEach(item => {
      try {
        const parts = item.split(" ");
        const day = parts[1];
        const timePart = parts[2].split("-");
        const start = timePart[0].split(":");
        const end = timePart[1].split(":");
        const startMin = parseInt(start[0]) * 60 + parseInt(start[1]);
        const endMin = parseInt(end[0]) * 60 + parseInt(end[1]);
        parsedItems.push({ name: item, day: day, start: startMin, end: endMin });
      } catch (err) { console.error("解析失敗: " + item); }
    });

    for (let i = 0; i < parsedItems.length; i++) {
      for (let j = i + 1; j < parsedItems.length; j++) {
        const a = parsedItems[i];
        const b = parsedItems[j];
        if (a.day === b.day && a.start < b.end && b.start < a.end) {
          conflicts.push(`「${a.name}」 與 「${b.name}」`);
        }
      }
    }

    if (conflicts.length > 0) {
      output.style.color = "#e74c3c";
      output.innerHTML = "⚠️ <b>報名時間衝突！</b><br>" + conflicts.join("<br>");
      output.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
  }

  // --- [新增邏輯：收集多人資料] ---
  const formData = new FormData(this);
  const baseData = {};
  formData.forEach((value, key) => { baseData[key] = value; });
  baseData["items"] = selectedItems;

  if (pCount > 1) {
    baseData.lineId = baseData.lineId + "(" + baseData.name + ")";
  }

  let participants = [{ name: baseData.name, phone: baseData.phone }];

  if (pCount > 1) {
    collectNextParticipant(2, pCount, participants, baseData, btn, output);
  } else {
    askEmergencyContactSingle(baseData, btn, output);
  }
});

/**
 * 從課表點擊課程後，自動關閉抽屜並在表單中勾選
 */

function selectFromScheduleSingle(courseName) {
  const expandContainer = document.getElementById('expandInputContainer');
  const queryContainer = document.getElementById('queryInputContainer');
  const singleTabBtn = document.getElementById('btn-single-class');

  const isSingleExpanded = expandContainer && expandContainer.classList.contains('expanded');
  const isQueryExpanded = queryContainer && queryContainer.classList.contains('expanded');

  if (!isSingleExpanded && !isQueryExpanded) {
    return;
  }

  // 💡 1. 分流判斷：如果是從「查詢日期（期課）」的滿版抽屜點擊的
  if (isQueryExpanded) {
    closeDrawer();      // 關閉可能開啟的側邊欄
    closeQueryCourse(); // 執行專屬的關閉期課抽屜與還原邏輯

    const queryInput = document.getElementById('itemQueryName');
    if (queryInput) {
      queryInput.value = courseName;              // 填入選擇的課程名稱
      queryInput.classList.add('field-success'); // 給它一個成功的綠框反饋

      // 讓輸入框重新變回 block 顯示
      queryInput.style.display = 'block';

      // 捲動回該輸入框頂端
      queryInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
      queryInput.dispatchEvent(new Event('change'));
    }
    return; // 填完期課文字框後直接中斷
  }

  // 💡 2. 分流判斷：如果是從「單堂報名」的滿版抽屜點擊的
  if (isSingleExpanded) {
    // 只有當單堂報名分頁是 active 狀態時才處理（保留你原本的防呆機制）
    closeDrawer();
    closeExpandedCourse();

    const singleInput = document.getElementById('singleCourseSelect');
    if (singleInput) {
      singleInput.value = courseName;             // 填入選擇的課程名稱
      singleInput.classList.add('field-success'); // 順手給它一個成功的綠框反饋

      // 觸發載入該課程對應的單堂可報名日期
      if (typeof loadSingleDates === 'function') {
        loadSingleDates();
      }

      // 捲動回單堂表單頂端
      singleInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    return; // 填完單堂文字框後直接中斷

  }
}

function selectFromSchedule(courseName) {
  // 1. 關閉側邊抽屜
  closeDrawer();

  // 2. 解析星期，自動切換到對應的分頁
  const days = ["週一", "週二", "週三", "週四", "週五", "週六", "週日"];
  let targetDay = "";
  days.forEach(d => { if (courseName.includes(d)) targetDay = d; });

  if (targetDay) {
    filterDay(targetDay, null);
  }

  // 3. 延遲執行勾選（等待 filterDay 的動畫完成）
  setTimeout(() => {
    const checkboxes = document.querySelectorAll('input[name="items"]');
    checkboxes.forEach(cb => {
      if (cb.value === courseName) {
        cb.checked = true; // 執行勾選

        // 觸發原始的更新邏輯（計算金額與顯示清單）
        updateSelectedDisplay();

        // 捲動到選擇結果區塊，讓使用者確認
        const targetSection = document.getElementById('selected-courses-section');
        if (targetSection) {
          targetSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    });
  }, 400); // 這裡的延遲時間需略長於 filterDay 的動畫時間 (320ms)
}

// 連鎖彈窗收集函數

function collectNextParticipant(currentIdx, totalCount, list, baseData, btn, output) {
  const injectionPoint = document.getElementById('modalInjectionPoint');
  injectionPoint.innerHTML = `
    <div style="padding: 15px; text-align: center;">
      <h3 style="color: #d14d72; margin-bottom:15px;">第 ${currentIdx} 位學員資料</h3>
      
      <div id="extraErrorMsg" style="display: none; color: #e74c3c; background-color: #fdf2f4; border: 1px solid #f9d5dc; padding: 10px; border-radius: 6px; margin-bottom: 15px; font-size: 0.95em; font-weight: bold; text-align: left;"></div>
      
      <div class="field" style="text-align: left;">
        <label>學員姓名</label>
        <input type="text" id="extraName" placeholder="請輸入姓名" style="width:100%; padding:12px; box-sizing:border-box; border:1px solid #ddd; border-radius:6px;">
      </div>
      <div class="field" style="text-align: left; margin-top: 15px;">
        <label>學員電話</label>
        <input type="tel" id="extraPhone" placeholder="09XXXXXXXX" maxlength="10" inputmode="numeric" style="width:100%; padding:12px; box-sizing:border-box; border:1px solid #ddd; border-radius:6px;">
      </div>
      <button id="confirmExtraBtn" class="btn-universal" style="background: linear-gradient(135deg, #E87A90 0%, #D05A6E 100%); width:100%; margin-top:20px;">下一步</button>
    </div>
  `;
  document.getElementById('paymentModalOverlay').classList.add('active');

  document.getElementById('confirmExtraBtn').onclick = function () {
    const n = document.getElementById('extraName').value.trim();
    const p = document.getElementById('extraPhone').value.trim();
    const errorEl = document.getElementById('extraErrorMsg');

    // 初始化隱藏錯誤訊息，並移除先前的紅框樣式
    errorEl.style.display = 'none';
    document.getElementById('extraName').classList.remove('field-error');
    document.getElementById('extraPhone').classList.remove('field-error');

    // --- 開始進行細緻的格式檢查 ---
    let errors = [];
    if (!n) {
      errors.push("⚠️ 請填寫學員姓名");
      document.getElementById('extraName').classList.add('field-error');
    }

    if (p.length === 0) {
      errors.push("⚠️ 請填寫學員電話");
      document.getElementById('extraPhone').classList.add('field-error');
    } else if (p.length < 10 || !p.startsWith('09')) {
      errors.push("⚠️ 電話格式不正確 (須為 09 開頭的 10 位數字)");
      document.getElementById('extraPhone').classList.add('field-error');
    }

    // 若有錯誤，呈現提示區塊並中斷程序
    if (errors.length > 0) {
      errorEl.innerHTML = errors.join("<br>");
      errorEl.style.display = 'block';
      return;
    }

    // 通過驗證，寫入資料庫陣列
    list.push({ name: n, phone: p });
    if (currentIdx < totalCount) {
      collectNextParticipant(currentIdx + 1, totalCount, list, baseData, btn, output);
    } else {
      document.getElementById('paymentModalOverlay').classList.remove('active');
      executeBatchSubmit(list, baseData, btn, output);
    }
  };
}

/**
 * 📅 核心重構：建立高彈性的手風琴課表渲染器 (支援整期與前期單堂)
 */
function renderAccordionSchedule(courseSource, containerElement, type) {
  const days = ["週一", "週二", "週三", "週四", "週五", "週六", "週日"];
  const englishDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  let termText = globalSettings?.title?.[2] || "";
  let accordionHtml = '<div class="accordion-container">';
  if (termText) {
    accordionHtml += `
      <div style="text-align: center; padding: 10px 0 15px 0; color: #d14d72; font-weight: bold; font-size: 1.25em; letter-spacing: 2px;">
        ${termText}
      </div>
    `;
  }

  days.forEach((day, index) => {
    // 過濾屬於該天且不含系統標記的課程
    const dayCourses = courseSource.filter(c =>
      c.name.includes(day) && !c.name.includes('★')
    );

    accordionHtml += `
      <div class="day-card">
        <div class="card-header" onclick="toggleAccordion(this)">
          <span>${day} <small style="font-weight:normal; opacity:0.6; margin-left:5px;">${englishDays[index]}</small></span>
          <span class="arrow" style="transition: transform 0.3s;">▼</span>
        </div>
        <div class="card-body">`;

    if (dayCourses.length > 0) {
      // 依據課表時間先後進行排序
      dayCourses.sort((a, b) => {
        const timeA = a.name.match(/\d{2}:\d{2}/);
        const timeB = b.name.match(/\d{2}:\d{2}/);
        return (timeA && timeB) ? timeA[0].localeCompare(timeB[0]) : 0;
      });

      dayCourses.forEach(course => {
        const parts = course.name.split(" ");
        const nameTeacher = parts[0].split("-");
        const timeRange = parts[2] || "";
        const remaining = course.remaining;
        const max = course.maxCapacity;
        const times = timeRange.split("-");
        const startTime = times[0] || "";
        const endTime = times[1] || "";

        // 名額狀態顯示 (單堂與整期共用此剩餘名額邏輯，可依後端邏輯自由調整)
        const quotaHtml = (remaining <= 0)
          ? `<br><span style="color:red; font-weight:bold;">(已額滿)</span>`
          : `<br><span style="color:#4CAF50;">(名額請至單堂報名確認)</span>`;

        accordionHtml += `
          <div class="accordion-course-item" 
              onclick="selectFromScheduleSingle('${course.name.replace(/'/g, "\\'")}')" 
              style="cursor: pointer;"
              title="點擊直接將此課程帶入表單">
            <div class="time-tag">
              <span>${startTime}</span>
              <div class="time-line"></div>
              <span>${endTime}</span>
            </div>
            <div class="course-info">
              <b>${nameTeacher[0]}</b> - ${nameTeacher[1] || ""} ${quotaHtml}
            </div>
          </div>`;
      });
    } else {
      accordionHtml += `<div style="padding:15px; color:#ccc; text-align:center;">今日暫無排課</div>`;
    }

    accordionHtml += `</div></div>`;
  });

  accordionHtml += '</div>';
  containerElement.innerHTML = accordionHtml;
}
// 批次送出函數
/**
 * 修改後的批次提交：改為「一次打包」送出，最穩定。
 */
function executeBatchSubmit(list, baseData, btn, output) {
  btn.disabled = true;
  // 如果 1 人就不顯示人數
  const btnText = list.length > 1 ? `提交中 (${list.length}人)...` : "提交中...";
  //btn.innerText = btnText;
  btn.innerHTML = `
      <svg class="fly-out-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" width="1.4em" height="1.4em" style="vertical-align: middle; margin-right: 8px;">
        <path fill="white" d="M125.4 128C91.5 128 64 155.5 64 189.4C64 190.3 64 191.1 64.1 192L64 192L64 448C64 483.3 92.7 512 128 512L512 512C547.3 512 576 483.3 576 448L576 192L575.9 192C575.9 191.1 576 190.3 576 189.4C576 155.5 548.5 128 514.6 128L125.4 128zM528 256.3L528 448C528 456.8 520.8 464 512 464L128 464C119.2 464 112 456.8 112 448L112 256.3L266.8 373.7C298.2 397.6 341.7 397.6 373.2 373.7L528 256.3zM112 189.4C112 182 118 176 125.4 176L514.6 176C522 176 528 182 528 189.4C528 193.6 526 197.6 522.7 200.1L344.2 335.5C329.9 346.3 310.1 346.3 295.8 335.5L117.3 200.1C114 197.6 112 193.6 112 189.4z"/>
      </svg>
    `;
  //<!--!Font Awesome Free v7.2.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2026 Fonticons, Inc.-->

  output.style.color = "#34495e";
  output.innerText = "正在處理報名資料，請稍候...";

  // 修改：直接呼叫一個專門處理「多人」的後端函數
  callGasApi("processBatchForm", [baseData, list])
    .then(function (res) {
      // 成功後直接執行原本的結尾邏輯
      finalizeBatch(list.length, list.length, btn, output);
    })
    .catch(function (err) {
      output.style.color = "red";
      // 注意：catch 抓到的 err 如果是字串，直接印出即可；若是 Error 物件則印出 err.message
      const errorMsg = err.message || err;
      output.innerText = "❌ 提交失敗：" + errorMsg;
      btn.disabled = false;
      btn.innerText = "提交報名";
    }); // 此函數需在後端 (GS檔) 增加
}

function finalizeBatch(s, t, btn, output) {
  btn.disabled = false; btn.innerText = "提交報名";
  output.style.color = "green"; output.innerHTML = `✅ 已成功處理 ${s} 位學員報名。請用手機號碼查詢確認報名狀態。`;
  const paymentInfoHtml = document.getElementById('paymentInfo').innerHTML;
  document.getElementById('modalInjectionPoint').innerHTML = paymentInfoHtml;
  document.getElementById('paymentModalOverlay').classList.add('active');
  document.getElementById('regForm').reset();
  updateSelectedDisplay();
}

// 通用緊急聯絡人彈窗收集函數（支援整期與單堂）
function askEmergencyContactSingle(baseData, btn, output, isSingleCourse) {
  const injectionPoint = document.getElementById('modalInjectionPoint');
  injectionPoint.innerHTML = `
    <div style="padding: 15px; text-align: center;">
      <h3 style="color: #d14d72; margin-bottom:15px;">🚨 緊急聯絡人資訊</h3> 
      <p style="font-size: 0.9em; color: #666; margin-bottom: 20px;">(選填) 為了您的安全，建議填寫</p> 
      
      <div id="emergencyErrorMsg" style="display: none; color: #e74c3c; background-color: #fdf2f4; border: 1px solid #f9d5dc; padding: 10px; border-radius: 6px; margin-bottom: 15px; font-size: 0.95em; font-weight: bold; text-align: left;"></div>
      
      <div class="field" style="text-align: left;">
      <span class="pink-highlight">聯絡人姓名</span>
        <input type="text" id="emergencyName" placeholder="請輸入姓名" style="width:100%; padding:12px; box-sizing:border-box; border:1px solid #ddd;"> 
      </div>
      <div class="field" style="text-align: left; margin-top: 15px;">
      <span class="pink-highlight">聯絡人電話</span>
        <input type="tel" id="emergencyPhone" placeholder="09XXXXXXXX" maxlength="10" inputmode="numeric" style="width:100%; padding:12px; box-sizing:border-box; border:1px solid #ddd;"> 
      </div>
      <div style="display: flex; gap: 10px; margin-top: 20px;"> 
        <button id="skipEmergencyBtn" class="btn-universal" style="background: #858585; flex: 1;">不填寫</button> 
        <button id="submitEmergencyBtn" class="btn-universal" style="background: linear-gradient(135deg, #E87A90 0%, #D05A6E 100%); flex: 1;">提交報名</button>
      </div>
    </div>
  `;
  document.getElementById('paymentModalOverlay').classList.add('active');

  // 輔助檢查與分流送出
  function handleNext(emergencyStr) {
    document.getElementById('paymentModalOverlay').classList.remove('active');
    if (isSingleCourse) {
      executeSingleCourseSubmit(baseData, emergencyStr, btn, output);
    } else {
      executeSingleSubmit(baseData, emergencyStr, btn, output);
    }
  }

  // 點擊「提交報名」
  document.getElementById('submitEmergencyBtn').onclick = function () {
    const eName = document.getElementById('emergencyName').value.trim();
    const ePhone = document.getElementById('emergencyPhone').value.trim();
    const errorEl = document.getElementById('emergencyErrorMsg');

    // 初始化隱藏錯誤訊息，並移除先前的紅框樣式
    errorEl.style.display = 'none';
    document.getElementById('emergencyName').classList.remove('field-error');
    document.getElementById('emergencyPhone').classList.remove('field-error');

    let info = "";

    if (eName && ePhone) {
      // 深度檢查：既然兩個都填了，就順便幫忙檢查電話格式
      if (!ePhone.startsWith('09') || ePhone.length !== 10) {
        errorEl.innerHTML = "⚠️ 聯絡人電話格式不正確 (須為 09 開頭的 10 位數字)";
        errorEl.style.display = 'block';
        document.getElementById('emergencyPhone').classList.add('field-error');
        return;
      }
      info = "緊急聯絡人：" + eName + " (" + ePhone + ")";
    } else {
      // 欄位沒填完整（一個有填一個沒填）
      let missingFields = [];
      if (!eName) {
        missingFields.push("「聯絡人姓名」");
        document.getElementById('emergencyName').classList.add('field-error');
      }
      if (!ePhone) {
        missingFields.push("「聯絡人電話」");
        document.getElementById('emergencyPhone').classList.add('field-error');
      }

      errorEl.innerHTML = `⚠️ 請完整填寫 ${missingFields.join('與')}，<br>或直接點擊下方「不填寫」按鈕。`;
      errorEl.style.display = 'block';
      return;
    }

    handleNext(info);
  };

  // 點擊「不填寫」
  document.getElementById('skipEmergencyBtn').onclick = function () {
    handleNext("");
  };
}

/**
 * [新增] 執行最終的 1 人提交 (帶入緊急聯絡人資訊)
 */
function executeSingleSubmit(baseData, emergencyInfo, btn, output) {
  btn.disabled = true;
  btn.innerHTML = `
    <svg class="fly-out-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" width="1.4em" height="1.4em" style="vertical-align: middle; margin-right: 8px;">
      <path fill="white" d="M125.4 128C91.5 128 64 155.5 64 189.4C64 190.3 64 191.1 64.1 192L64 192L64 448C64 483.3 92.7 512 128 512L512 512C547.3 512 576 483.3 576 448L576 192L575.9 192C575.9 191.1 576 190.3 576 189.4C576 155.5 548.5 128 514.6 128L125.4 128zM528 256.3L528 448C528 456.8 520.8 464 512 464L128 464C119.2 464 112 456.8 112 448L112 256.3L266.8 373.7C298.2 397.6 341.7 397.6 373.2 373.7L528 256.3zM112 189.4C112 182 118 176 125.4 176L514.6 176C522 176 528 182 528 189.4C528 193.6 526 197.6 522.7 200.1L344.2 335.5C329.9 346.3 310.1 346.3 295.8 335.5L117.3 200.1C114 197.6 112 193.6 112 189.4z"/>
    </svg>
  `;
  //<!--!Font Awesome Free v7.2.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2026 Fonticons, Inc.-->
  output.style.color = "#34495e";
  output.innerText = "正在處理報名資料...";

  // 1. 將單人的姓名與電話打包成符合後端規格的陣列
  var singleParticipantList = [
    { name: baseData.name, phone: baseData.phone }
  ];

  // 2. 改為呼叫後端的 processBatchForm 進入同一個 LOCK 排隊
  callGasApi("processBatchForm", [baseData, singleParticipantList, emergencyInfo])
    .then(function () {
      finalizeBatch(1, 1, btn, output);
    })
    .catch(function (err) {
      output.style.color = "red";
      // 防呆：確保不論 err 是字串還是 Error 物件都能正確印出錯誤訊息
      const errorMsg = err.message || err;
      output.innerText = "❌ 提交失敗：" + errorMsg;
      btn.disabled = false;
      btn.innerText = "提交報名";
    });
}

// 輔助函式：切換手風琴展開
function toggleAccordion(header) {
  const card = header.parentElement;
  const isOpen = card.classList.contains('active');



  document.querySelectorAll('.day-card').forEach(c => {
    if (c !== card) c.classList.remove('active');
  });


  if (isOpen) {
    card.classList.remove('active');
  } else {
    card.classList.add('active');
  }
}


// 封裝原本的提交邏輯
function submitForm(formElement, btn, output) {
  btn.disabled = true;
  btn.innerText = "提交中...";
  output.innerText = "";

  // 1. 🌟 必須先手動將 HTML 的 Form 轉換為 JavaScript Object
  const formData = new FormData(formElement);
  const formObj = {};
  formData.forEach((value, key) => {
    // 確保如果表單有多選框 (checkbox，例如相同的 name)，會被轉成陣列
    if (formObj[key]) {
      if (!Array.isArray(formObj[key])) {
        formObj[key] = [formObj[key]];
      }
      formObj[key].push(value);
    } else {
      formObj[key] = value;
    }
  });

  // 2. 呼叫後端 API
  // 對應後端的 processForm(formData, emergencyInfo)，第二個參數如果沒有就傳空字串
  callGasApi("processForm", [formObj, ""])
    .then(function (res) {
      output.style.color = "green";
      output.innerHTML = "✅ " + res;

      const paymentInfoHtml = document.getElementById('paymentInfo').innerHTML;
      const injectionPoint = document.getElementById('modalInjectionPoint');
      injectionPoint.innerHTML = `<div style="display:block !important; border:none; background:none; margin:0;">${paymentInfoHtml}</div>`;
      document.getElementById('paymentModalOverlay').classList.add('active');

      // 1. 重設表單基礎欄位（姓名、電話、LINE ID、Email、末5碼）
      formElement.reset();
      document.getElementById('agreementCheckbox').checked = false;

      // 2. 清空「選擇的課程」顯示區塊，恢復到初始狀態
      const selectedList = document.getElementById('selected-list');
      if (selectedList) {
        selectedList.innerHTML = '<span style="color: #999; font-weight: bold;">尚未選擇課程</span>';
      }

      // 3. 移除電話欄位的成功/錯誤樣式標記
      const phoneInput = document.getElementById('queryPhone');
      if (phoneInput) {
        phoneInput.classList.remove('field-success', 'field-error');
      }

      // 4. 重設星期篩選（預設回到當天或清空顯示）
      const currentDay = ["週日", "週一", "週二", "週三", "週四", "週五", "週六"][new Date().getDay()];
      filterDay(currentDay, null);

      btn.disabled = false;
      btn.innerText = "提交報名";

      // 選擇性：3秒後清空成功訊息
      setTimeout(() => { output.innerText = ""; }, 3000);

    })
    .catch(function (err) {
      output.style.color = "red";
      const errorMsg = err.message || err;
      output.innerText = "❌ 提交失敗：" + errorMsg;
      btn.disabled = false;
      btn.innerText = "提交報名";
    });
}

/**
 * 從後端抓取最新課程資料並刷新前端介面（含全域變數、下拉選單、勾選框與課表）
 */

// 2. 處理報名查詢
// 修改原本的 queryBtn 監聽器
document.getElementById('queryBtn').addEventListener('click', function () {
  const phone = document.getElementById('realQueryPhone').value;
  const resultDiv = document.getElementById('queryResult');
  const btn = this;

  if (!phone) {
    resultDiv.innerHTML = "<span style='color: red;'>請輸入電話號碼以供查詢</span>";
    return;
  }

  btn.disabled = true;
  btn.innerHTML = '<svg class="walking-circle" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640"><path fill="white" d="M480 272C480 317.9 465.1 360.3 440 394.7L566.6 521.4C579.1 533.9 579.1 554.2 566.6 566.7C554.1 579.2 533.8 579.2 521.3 566.7L394.7 440C360.3 465.1 317.9 480 272 480C157.1 480 64 386.9 64 272C64 157.1 157.1 64 272 64C386.9 64 480 157.1 480 272zM272 416C351.5 416 416 351.5 416 272C416 192.5 351.5 128 272 128C192.5 128 128 192.5 128 272C128 351.5 192.5 416 272 416z"/></svg>';
  //<!--!Font Awesome Free v7.2.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2026 Fonticons, Inc.-->
  resultDiv.innerText = "";

  callGasApi("queryRegistration", [phone])
    .then(function (res) {
      if (res === "查無紀錄。") {
        resultDiv.innerHTML = `<div style="color: red; text-align: center; padding: 20px;">${res}</div>`;
      } else if (res.error) {
        resultDiv.innerHTML = `<div style="color: red;">${res.error}</div>`;
      } else {
        // 1. 顯示總金額標題
        let html = `<div style="font-size: 1.15em; color: #d14d72; margin: 15px 0 10px 0; font-weight: bold; border-bottom: 2px solid #F4A7B9; display: inline-block; padding-bottom: 5px;">
                          ${res.summary.discountDesc}
                        </div><br>
                        <span style="font-size: 0.9em; color: green; line-height: 1;">僅供複查，若已繳費無須在意</span><br>`;

        // 2. 組裝課程卡片
        // 2. 組裝課程卡片（包含當期整期、當期單堂、以及歷史前期紀錄）
        res.items.forEach(item => {
          // 1. 先統一解析課程與老師名稱 (避免重複撰寫導致卡住)
          // 格式範例: "Zumba-Grace 週日 16:00-16:55"
          const rawName = item.name || "";
          const nameParts = rawName.split(" ");

          // 取得課程與星期，若格式不對則回傳原名
          const displayName = (nameParts.length >= 2) ? (nameParts[0]) : rawName;
          const dayText = (nameParts.length >= 2) ? (nameParts[1].trim()) : "";

          // 安全抓取時間段
          const fullTimeRange = (nameParts.length >= 3) ? nameParts[2] : "";
          const timeParts = fullTimeRange.includes("-") ? fullTimeRange.split("-") : ["--:--", "--:--"];
          const startTime = timeParts[0] || "--:--";
          const endTime = timeParts[1] || "--:--";

          // 2. 解析 cKey 與 tKey (用於抽屜功能，增加單引號轉義防止語法報錯)
          const subParts = nameParts[0] ? nameParts[0].split("-") : ["", ""];
          const cKey = (subParts[0] || "").trim().replace(/'/g, "\\'");
          const tKey = (subParts[1] || "").trim().replace(/'/g, "\\'");

          // --- 3. 樣式與文字分流核心配置 ---
          let primaryColor = "#F4A7B9"; // 預設當期整期：粉色
          let darkColor = "#d14d72";
          let typeLabel = "📌 預約期課";
          let shadowStyle = "rgba(232, 122, 144, 0.3)";
          let bgGradient = "linear-gradient(135deg, #FFF5F7 0%, #FFD1DC 100%)";
          let priceDisplayStr = "";
          let paySt = "";

          if (item.isPaid) {
            paySt = `<span style="color: #2ecc71; font-size: 0.9em; font-weight: normal;">✅ 已完成繳費</span>`;
          } else {
            paySt = `<span style="color: #f39c12; font-size: 0.9em; font-weight: normal;">⏳ 管理人員對帳中</span>`;
          }
          if (item.period === "PAST") {
            // 如果是前期歷史紀錄：改為莫蘭迪沉穩灰色調，不計算與顯示金額
            primaryColor = "#D2A8B0";
            darkColor = "#9C5E6D";
            typeLabel = "⏳ 當期課程";
            shadowStyle = "rgba(156, 94, 109, 0.3)";
            bgGradient = "linear-gradient(135deg, #F9F5F6 0%, #E6D5D8 100%)";
            priceDisplayStr = `共 ${item.count} 堂 (本期預約)`;
            paySt = "";
          } else if (item.type === "SINGLE") {
            // 如果是當期單堂：維持藍色調
            primaryColor = "#3498db";
            darkColor = "#2980b9";
            typeLabel = "🎟️ 當期單堂";
            shadowStyle = "rgba(52, 152, 219, 0.3)";
            bgGradient = "linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)";
            priceDisplayStr = `單堂預約 ${item.amount} 元`;
          } else {
            // 當期整期課程：正常計算金額
            const ebTag = item.isEarlyBird ? " (早鳥)" : "";
            priceDisplayStr = `共 ${item.count} 堂 ${item.amount} 元 ${ebTag}`;
          }

          // --- 4. 輸出通用 3D 翻轉卡片模板 ---
          html += `
                  <div class="course-card result-card-anim" onclick="openCombinedDrawer('${cKey}', '${tKey}', this)" style="cursor: pointer; margin-top: 10px;">
                      <div class="card-inner">
                          <div class="card-front" style="display: flex; align-items: center; padding: 15px; border-left: 6px solid ${primaryColor}; background: #ffffff;">
                              
                              <div style="width: 70px; flex-shrink: 0; margin-right: 15px; text-align: center;">
                                  <div class="time-tag" style="
                                      background: ${primaryColor}; 
                                      display: flex; 
                                      flex-direction: column; 
                                      align-items: center; 
                                      justify-content: center; 
                                      width: 70px; 
                                      height: 70px;
                                      margin: 0 auto;
                                      border-radius: 12px;
                                      color: white; 
                                      box-sizing: border-box;
                                      box-shadow: 0 4px 8px ${shadowStyle};">
                                      <span style="font-size: 1.0em; font-weight: bold; line-height: 1;">${startTime}</span>
                                      <div class="time-line" style="width: 2px; height: 10px; background: rgba(255,255,255,0.7); margin: 4px 0;"></div>
                                      <span style="font-size: 1.0em; font-weight: bold; line-height: 1;">${endTime}</span>
                                  </div>
                                  <span style="
                                      font-size: 0.95em; 
                                      font-weight: bold; 
                                      color: ${darkColor};
                                      margin: 8px auto 0 auto; 
                                      display: block; 
                                      width: 100%;
                                      text-align: center;">
                                      ${dayText || nameParts[1] || ""}
                                  </span>
                              </div>

                              <div style="flex: 1; text-align: left; min-width: 0;">
                                  <div class="card-title" style="margin-bottom: 4px; font-weight: bold; color: ${darkColor}; font-size: 1.1em;">
                                      ${displayName} <span style="font-size: 0.85em; color: #7f8c8d; font-weight: normal;">(${item.userName})</span>
                                  </div>
                                  <div class="card-detail" style="font-size: 0.9em; color: #555;">日期：${item.dates}</div>
                                  <div class="card-detail" style="color: ${darkColor}; font-weight: bold; margin-top: 6px; font-size: 0.95em;">
                                      ${priceDisplayStr}<br>${paySt}
                                  </div>
                                  <small style="color: ${primaryColor}; display: block; margin-top: 6px;">點擊查看課程與老師簡介 ➔</small>
                              </div>
                          </div>
                          
                          <div class="card-back" style="background: ${bgGradient}; border-color: ${primaryColor}; color: ${darkColor};">
                              <div style="font-weight: bold;">查看詳細介紹...</div>
                          </div>
                      </div>
                  </div>`;
        });
        resultDiv.innerHTML = html;

        // 3. 渲染個人課表 (過濾：僅渲染「整期(FULL)」的課程)
        const userFullCourseNames = res.items
          .filter(item => item.type === "FULL")
          .map(item => item.name.trim());

        const matchedCourses = allCourseData.filter(c => {
          return userFullCourseNames.some(uName => c.name.includes(uName));
        });
      }

      btn.disabled = false;
      btn.innerText = "查詢";
    })
    .catch(function (err) {
      // 增加防呆：處理網路錯誤或伺服器錯誤，避免按鈕永久卡住
      const errorMsg = err.message || err;
      resultDiv.innerHTML = `<div style="color: red; text-align: center; padding: 20px;">❌ 查詢失敗：${errorMsg}</div>`;
      btn.disabled = false;
      btn.innerText = "查詢";
    });
});

// 3. 處理課程日期查詢
document.getElementById('itemQueryName').addEventListener('change', function () {
  const itemName = document.getElementById('itemQueryName').value;
  const resultDiv = document.getElementById('itemQueryResult');

  if (!itemName) {
    resultDiv.innerHTML = "<span style='color: red;'>請選擇課程名稱</span>";
    return;
  }

  if (!allCourseData || allCourseData.length === 0) {
    resultDiv.innerHTML = "<span style='color: orange;'>資料載入中，請稍候再試...</span>";
    return;
  }

  const course = allCourseData.find(c => c.name === itemName);

  if (course) {
    // --- 1. 解析名稱、老師、星期與時間 ---
    // 假設 itemName 格式為 "課程-老師 星期 時間範圍"
    var fullParts = itemName.split(" ");
    var nameTeacherPart = fullParts[0]; // "課程-老師"
    var weekPart = fullParts[1] ? fullParts[1].trim() : ""; // "週日"
    var timePart = fullParts[2] ? fullParts[2].trim() : ""; // "16:00-16:55"

    // 解析 cKey 與 tKey (用於抽屜)
    var nameParts = nameTeacherPart.split("-");
    var cKey = nameParts[0] ? nameParts[0].trim() : "";
    var tKey = nameParts[1] ? nameParts[1].trim() : "";

    // 解析開始與結束時間
    var timeRange = timePart.split("-");
    var startTime = timeRange[0] || "--:--";
    var endTime = timeRange[1] || "--:--";

    // --- 2. 計算價格與堂數 ---
    const dateString = course.dates;
    const pricePerClass = course.pricePerClass;
    const dateArray = dateString.split(",").filter(s => s.trim() !== "");
    const totalClasses = dateArray.length;
    const totalPrice = totalClasses * pricePerClass;

    // --- 3. 渲染為定版小卡片格式 ---
    let cardHtml = `
      <div class="course-card result-card-anim" onclick="openCombinedDrawer('${cKey.replace(/'/g, "\\'")}', '${tKey.replace(/'/g, "\\'")}', this)" style="cursor: pointer; margin-top: 10px;">
          <div class="card-inner">
              <div class="card-front" style="display: flex; align-items: center; padding: 15px; border-left: 6px solid #F4A7B9;">
                  
                  <div style="width: 70px; flex-shrink: 0; margin-right: 15px; text-align: center;">
                      <div class="time-tag" style="
                          background: #F4A7B9; 
                          display: flex; 
                          flex-direction: column; 
                          align-items: center; 
                          justify-content: center; 
                          width: 70px; 
                          height: 70px; 
                          margin: 0 auto; 
                          border-radius: 12px; 
                          color: white; 
                          box-sizing: border-box;
                          box-shadow: 0 4px 8px rgba(232, 122, 144, 0.3);">
                          <span style="font-size: 1.0em; font-weight: bold; line-height: 1;">${startTime}</span>
                          <div class="time-line" style="width: 2px; height: 10px; background: rgba(255,255,255,0.7); margin: 4px 0;"></div>
                          <span style="font-size: 1.0em; font-weight: bold; line-height: 1;">${endTime}</span>
                      </div>
                      <span style="
                          font-size: 0.95em; 
                          font-weight: bold; 
                          color: #d14d72; 
                          margin: 8px auto 0 auto; 
                          display: block; 
                          width: 100%;
                          text-align: center;">
                          ${weekPart}
                      </span>
                  </div>

                  <div style="flex: 1; text-align: left; min-width: 0;">
                      <div class="card-title" style="margin-bottom: 4px; font-weight: bold; color: #d14d72; font-size: 1.1em;">
                          ${nameTeacherPart}
                      </div>
                      <div class="card-detail" style="font-size: 0.9em; color: #555;">日期：${dateString}</div>
                      <div class="card-detail" style="color: #e74c3c; font-weight: bold; margin-top: 6px; font-size: 0.95em;">
                          共 ${totalClasses} 堂 ${totalPrice} 元
                      </div>
                      <small style="color: #f089a1; display: block; margin-top: 6px;">點擊查看課程與老師簡介 ➔</small>
                  </div>
              </div>
              
              <div class="card-back">
                  <div style="font-weight: bold;">查看詳細介紹...</div>
              </div>
          </div>
      </div>`;

    resultDiv.innerHTML = cardHtml;
  } else {
    resultDiv.innerText = "目前查無此項目的日期資訊。";
  }
});



function filterDay(day, evt) {
  const container = document.querySelector('.day-tabs');
  // 安全檢查：若 DOM 尚未生成則靜默跳出，防止腳本卡死
  if (!container) return;

  const ghost = document.getElementById('day-ghost-tab');
  const tabs = document.querySelectorAll('.day-tab:not(#day-ghost-tab)');
  const currentActive = container.querySelector('.day-tab.active-day');

  // 1. 定義目標按鈕 (適應自動歸位需求)
  let targetTab = (evt && evt.currentTarget) ? evt.currentTarget : null;
  if (!targetTab) {
    const searchLabel = day.replace('週', '');
    tabs.forEach(tab => {
      if (tab.innerText.trim() === searchLabel) targetTab = tab;
    });
  }

  // 2. 核心邏輯分流
  if (evt && targetTab && currentActive && targetTab !== currentActive) {
    // --- 執行人為點擊的衝刺動畫 ---
    const pRect = container.getBoundingClientRect();
    const cRect = currentActive.getBoundingClientRect();
    const tRect = targetTab.getBoundingClientRect();

    // 同步外觀與文字
    ghost.style.width = cRect.width + "px";
    ghost.style.height = cRect.height + "px";
    ghost.innerText = currentActive.innerText;

    // 適應原本 ghost-dash 的變數注入
    // 注意：CSS 內已有 calc(var(--sy) - 6px)，這裡直接給予相對座標
    ghost.style.setProperty('--sx', (cRect.left - pRect.left) + "px");
    ghost.style.setProperty('--sy', (cRect.top - pRect.top + 2) + "px");
    ghost.style.setProperty('--ex', (tRect.left - pRect.left) + "px");
    ghost.style.setProperty('--ey', (tRect.top - pRect.top + 2) + "px");

    // 觸發切換
    currentActive.classList.remove('active-day');
    ghost.classList.remove('day-ghost-moving');
    void ghost.offsetWidth; // 強制瀏覽器重繪以啟動動畫
    ghost.classList.add('day-ghost-moving');

    setTimeout(() => {
      ghost.classList.remove('day-ghost-moving');
      targetTab.classList.add('active-day');
    }, 320);
  } else {
    // --- 執行初始化自動歸位 (不計算座標，避免報錯卡死) ---
    tabs.forEach(tab => tab.classList.remove('active-day'));
    if (targetTab) {
      targetTab.classList.add('active-day');
    }
  }

  // 3. 處理課程顯示與隱藏 (原本動畫邏輯)
  const allWrappers = document.querySelectorAll('.course-anim-wrapper');
  let hasCourse = false;
  allWrappers.forEach(div => {
    if (div.getAttribute('data-day') === day) {
      div.classList.add('active-show');
      hasCourse = true;
    } else {
      div.classList.remove('active-show');
    }
  });

  // 4. 更新無課程提示
  const cbContainer = document.getElementById('checkbox-container');
  if (cbContainer) {
    let noMsg = document.getElementById('no-course-notice');
    if (noMsg) noMsg.remove();
    if (!hasCourse) {
      const p = document.createElement('p');
      p.id = 'no-course-notice';
      p.style = "text-align:center; color:#999; padding:20px; font-size:0.9em;";
      p.innerText = "☕ 該日暫無課程安排";
      cbContainer.appendChild(p);
    }
  }
}

let currentStatusData = []; // 全域變數儲存當前教室狀態

// 1. 初始化日期選單限制
//14天
let fp;

function checkDateTrigger() {
  const dateInput = document.getElementById('roomDate');
  const today = new Date();
  const maxDate = new Date();
  maxDate.setDate(today.getDate() + 31);

  dateInput.disabled = false;
  dateInput.placeholder = "選擇日期";
  // 如果已經初始化過，就更新設定；否則就建立新的
  if (!fp) {
    fp = flatpickr("#roomDate", {
      disableMobile: "true", // 關鍵：禁止手機彈出原生滾輪
      dateFormat: "Y-m-d",
      minDate: "today",      // 鎖死今天以前
      maxDate: maxDate,      // 鎖死 14 天以後
      // 當日期改變時觸發原本的 fetchRoomStatus
      onChange: function (selectedDates, dateStr) {
        if (dateStr) {
          const msgDiv = document.getElementById('roomstatusmsg');
          if (msgDiv) {
            msgDiv.innerHTML = '<svg class="hourglass-spin" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" style="display: inline-block; vertical-align: middle; margin-right: 8px;"><path fill="#e87a90" d="M128 96C128 78.3 142.3 64 160 64L480 64C497.7 64 512 78.3 512 96C512 113.7 497.7 128 480 128L480 139C480 181.4 463.1 222.1 433.1 252.1L365.2 320L433.1 387.9C463.1 417.9 480 458.6 480 501L480 512C497.7 512 512 526.3 512 544C512 561.7 497.7 576 480 576L160 576C142.3 576 128 561.7 128 544C128 526.3 142.3 512 160 512L160 501C160 458.6 176.9 417.9 206.9 387.9L274.8 320L206.9 252.1C176.9 222.1 160 181.4 160 139L160 128C142.3 128 128 113.7 128 96zM224 128L224 139C224 164.5 234.1 188.9 252.1 206.9L320 274.8L387.9 206.9C405.9 188.9 416 164.5 416 139L416 128L224 128zM224 512L416 512L416 501C416 475.5 405.9 451.1 387.9 433.1L320 365.2L252.1 433.1C234.1 451.1 224 475.5 224 501L224 512z"/></svg><span style="color: #E87A90; vertical-align: middle;">教室預約狀態載入中，請稍候...</span>';
            msgDiv.style.display = "block"; // 確保區塊是顯示狀態
            //<!--!Font Awesome Free v7.2.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2026 Fonticons, Inc.-->
          }
          fetchRoomStatus();
        }
      },
      locale: {
        firstDayOfWeek: 1 // 週一開始
      }
    });
  } else {
    // 若已存在，僅更新範圍
    fp.set("minDate", "today");
    fp.set("maxDate", maxDate);
  }

  document.getElementById('dateSection').style.display = 'block';
  updatePriceList();
}

// 輔助函式：確保日期格式正確且不跳時區
function formatDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// 針對 iPhone 的防呆檢查
function handleDateChange(input, min, max) {
  const selectedDate = input.value;
  if (!selectedDate) return;

  if (selectedDate < min || selectedDate > max) {
    input.value = ""; // 強制清空
    return;
  }

  // 原本的邏輯：抓取教室狀態
  fetchRoomStatus();
}

// 2. 抓取教室狀態並生成表格
function fetchRoomStatus() {
  const room = document.getElementById('roomSelect').value;
  const dateString = document.getElementById('roomDate').value;
  const body = document.getElementById('roomTableBody');
  const head = document.getElementById('roomTableHead');

  if (!room || !dateString) return;
  body.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 20px;">讀取時段中...</td></tr>';

  const weekDays = ["週日", "週一", "週二", "週三", "週四", "週五", "週六"];
  const d = new Date(dateString);
  const selectedDayName = weekDays[d.getDay()];
  const dateParts = dateString.split("-");
  const formattedDate = parseInt(dateParts[1]) + "/" + parseInt(dateParts[2]);

  const timeSlots = [
    "09:00-09:30", "09:30-10:00", "10:00-10:30", "10:30-11:00",
    "11:00-11:30", "11:30-12:00", "12:00-12:30", "12:30-13:00", "13:00-13:30", "13:30-14:00",
    "14:00-14:30", "14:30-15:00", "15:00-15:30", "15:30-16:00",
    "16:00-16:30", "16:30-17:00", "17:00-17:30", "17:30-18:00",
    "18:00-18:30", "18:30-19:00", "19:00-19:30", "19:30-20:00",
    "20:00-20:30", "20:30-21:00", "21:00-21:30", "21:30-22:00"
  ];

  let localStatusGrid = timeSlots.map(slot => ({ time: slot, status: "可預約" }));

  const tToM = (t) => {
    const p = t.trim().split(":");
    return parseInt(p[0]) * 60 + parseInt(p[1]);
  };

  allCourseData.forEach(course => {
    if (course.room === room && course.name.includes(selectedDayName) && course.dates.includes(formattedDate)) {
      const timeMatch = course.name.match(/\d{2}:\d{2}-\d{2}:\d{2}/);
      if (timeMatch) {
        const [taskStart, taskEnd] = timeMatch[0].split("-").map(tToM);
        localStatusGrid.forEach(slot => {
          const [slotStart, slotEnd] = slot.time.split("-").map(tToM);
          if (taskStart < slotEnd && taskEnd > slotStart) { slot.status = "課程"; }
        });
      }
    }
  });

  allCourseDataPast.forEach(course => {
    if (course.room === room && course.name.includes(selectedDayName) && course.dates.includes(formattedDate)) {
      const timeMatch = course.name.match(/\d{2}:\d{2}-\d{2}:\d{2}/);
      if (timeMatch) {
        const [taskStart, taskEnd] = timeMatch[0].split("-").map(tToM);
        localStatusGrid.forEach(slot => {
          const [slotStart, slotEnd] = slot.time.split("-").map(tToM);
          if (taskStart < slotEnd && taskEnd > slotStart) { slot.status = "課程"; }
        });
      }
    }
  });

  callGasApi("getRoomStatus", [room, dateString])
    .then(function (serverStatus) {
      currentStatusData = localStatusGrid.map((item, idx) => {
        if (item.status === "課程") return item;
        return serverStatus[idx];
      });

      // 由於改用網格排版，不需要傳統的表頭了，將其清空讓畫面更乾淨
      head.innerHTML = "";

      // 建立 4 欄式網格容器
      let gridHtml = '<div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; padding: 10px 5px;">';

      currentStatusData.forEach((item, i) => {
        gridHtml += renderSlotTile(item, i);
      });

      gridHtml += '</div>';

      const msgDiv = document.getElementById('roomstatusmsg');
      if (msgDiv) {
        msgDiv.innerHTML = "<span style='color: red;'>注意：預約以 1 小時為單位</span>";
      }

      // 將網格直接放入 tbody 中，無縫接軌原本的 HTML 結構
      body.innerHTML = `<tr><td colspan="4" style="padding: 0; border: none;">${gridHtml}</td></tr>`;

      document.getElementById('statusTableSection').style.display = 'block';
      updateAvailableTimes();
    })
    .catch(function (err) {
      console.error("❌ 讀取教室狀態失敗:", err);
      const msgDiv = document.getElementById('roomstatusmsg');
      if (msgDiv) {
        const errorMsg = err.message || err;
        msgDiv.innerHTML = `<span style="color: red;">❌ 查詢失敗：${errorMsg}</span>`;
        msgDiv.style.display = "block";
      }
    });
}

// 將原本的 renderSlotCell 改名並改為卡片式輸出
function renderSlotTile(item, index) {
  let displayStatus = item.status;
  const startTime = item.time.split("-")[0]; // 只取前半段時間顯示，如 "09:00"

  // 判斷前後時段，如果只剩下單一 30 分鐘則不可預約
  if (displayStatus === "可預約") {
    const prev = currentStatusData[index - 1];
    const next = currentStatusData[index + 1];
    if ((!prev || prev.status !== "可預約") && (!next || next.status !== "可預約")) {
      displayStatus = "不可預約";
    }
  }

  // 🌟 外層按鈕樣式：移除 flex，並加入 -webkit-appearance: none 消除手機預設隱藏樣式
  const commonBtnStyle = "height: 60px; width: 100%; border-radius: 8px; box-sizing: border-box; padding: 0; margin: 0; transition: all 0.5s; -webkit-appearance: none; overflow: hidden;";

  // 🌟 內層排版容器：利用一個佔滿 100% 高度的 div 來負責完美的垂直置中 (完美避開 iOS 按鈕 Bug)
  const innerWrapper = `<div style="height: 100%; width: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; pointer-events: none;">`;

  if (displayStatus === "可預約") {
    // 🟢 空檔：粉紅色空心按鈕
    return `
      <button type="button" class="time-slot-btn" 
        data-index="${index}" data-time="${startTime}"
        onclick="selectStartTime('${startTime}', this)"
        style="${commonBtnStyle} background: #fff; border: 1.5px solid #F4A7B9; color: #E87A90; cursor: pointer; box-shadow: 0 2px 4px rgba(0,0,0,0.02);">
        ${innerWrapper}
          <div style="font-size: 1.2em; font-weight: bold; line-height: 1.1;">${startTime}</div>
          <div style="font-size: 1em; margin-top: 3px; font-weight: bold; line-height: 1.1;">預約</div>
        </div>
      </button>
    `;
  } else {
    // ⚪️ 滿檔/課程/單獨時段：灰色無法點擊方塊
    return `
      <button type="button" disabled
        style="${commonBtnStyle} background: #f5f5f5; border: 1.5px solid #eee; color: #aaa; cursor: not-allowed;">
        ${innerWrapper}
          <div style="font-size: 1.2em; text-decoration: line-through; line-height: 1.1;">${startTime}</div>
          <div style="font-size: 1em; margin-top: 3px; color: #888; line-height: 1.1;">${displayStatus}</div>
        </div>
      </button>
    `;
  }
}

// 點擊磁磚按鈕時，將時間填入文字框，並改變按鈕顏色
function selectStartTime(time, btnEl) {
  document.getElementById('startTimeSelect').value = time;

  // 1. 恢復所有按鈕為「白底粉字」的未選取狀態
  document.querySelectorAll('.time-slot-btn').forEach(b => {
    b.style.background = "#fff";
    b.style.color = "#E87A90";
  });

  // 2. 讓當前選中的按鈕變成「實心粉色」的選取狀態
  btnEl.style.background = "#E87A90";
  btnEl.style.color = "white";
}

function updateAvailableTimes() {
  const durationValue = document.getElementById('durationSelect').value;
  const duration = parseInt(durationValue) || 1;
  const buttons = document.querySelectorAll('.time-slot-btn');
  const slotsNeeded = duration * 2;

  // 當時數改變，清空已選時間
  document.getElementById('startTimeSelect').value = "";

  buttons.forEach(btn => {
    const index = parseInt(btn.getAttribute('data-index'));
    let canBook = true;

    // 檢查從此索引開始是否有足夠的連續「可預約」時段
    for (let i = index; i < index + slotsNeeded; i++) {
      if (i >= currentStatusData.length || currentStatusData[i].status !== "可預約") {
        canBook = false;
        break;
      }
    }

    // --- 🌟 動畫切換邏輯 ---
    if (canBook) {
      // 【進場動畫】：若原本是隱藏的，必須先取消 none 才能開始播動畫
      if (btn.style.display === "none") {
        btn.style.display = ""; // 恢復原本的網格顯示模式

        // 觸發重繪 (Reflow) 的小魔法：這行看起來沒做事，但它能強制瀏覽器刷新，確保接下來的動畫會完美觸發
        btn.offsetHeight;
      }

      // 狀態設定為：完全不透明 + 正常大小
      btn.style.opacity = "1";
      btn.style.transform = "scale(1)";
      btn.style.pointerEvents = "auto";

    } else {
      // 【退場動畫】：先播放淡出與縮小，不馬上隱藏
      btn.style.opacity = "0";
      btn.style.transform = "scale(0.8)";
      btn.style.pointerEvents = "none";

      // 等待 200 毫秒（與我們剛剛寫的按鈕 transition 0.2s 一致）後，才真正把元素抽掉
      setTimeout(() => {
        // 雙重檢查：避免在動畫期間，使用者又快速切換時數導致錯亂
        if (btn.style.opacity === "0") {
          btn.style.display = "none";
        }
      }, 500);
    }
  });
}

// 4. 送出預約
function submitRoomData() {
  const btn = document.getElementById('roomBtn');
  const output = document.getElementById('roomOutput');

  // 取得基礎資料
  const room = document.getElementById('roomSelect').value;
  const date = document.getElementById('roomDate').value;
  const startTime = document.getElementById('startTimeSelect').value;
  const durationValue = document.getElementById('durationSelect').value;
  const duration = parseFloat(durationValue);

  // --- 1. 基礎必選檢查 (由上而下) ---
  if (!room) {
    output.style.color = "red";
    output.innerText = "⚠️ 請選擇教室";
    document.getElementById('roomSelect').focus();
    return;
  }
  if (!date) {
    output.style.color = "red";
    output.innerText = "⚠️ 請選擇預約日期";
    document.getElementById('roomDate').focus();
    return;
  }
  if (!durationValue) {
    output.style.color = "red";
    output.innerText = "⚠️ 請選擇預約時數";
    document.getElementById('durationSelect').focus();
    return;
  }
  if (!startTime) {
    output.style.color = "red";
    output.innerText = "⚠️ 請選擇開始時間";
    document.getElementById('startTimeSelect').focus();
    return;
  }

  // --- 計算結束時間邏輯 ---
  const [startH, startM] = startTime.split(':').map(Number);
  const totalMinutes = startH * 60 + startM + (duration * 60);
  const endH = Math.floor(totalMinutes / 60);
  const endM = totalMinutes % 60;
  const formattedEndTime = endH + ":" + (endM === 0 ? "00" : (endM < 10 ? "0" + endM : endM));
  const timeRangeString = startTime + "-" + formattedEndTime;

  // 取得聯絡人資料
  const nameInput = document.getElementById('rName');
  const phoneInput = document.getElementById('rPhone');
  const lineInput = document.getElementById('rLine');
  const emailInput = document.getElementById('rEmail');
  const bankInput = document.getElementById('rBank');

  // --- 2. 個別欄位細節檢查 ---
  if (!nameInput.value.trim()) {
    output.style.color = "red";
    output.innerText = "⚠️ 請填寫「姓名」";
    nameInput.focus();
    return;
  }
  if (!phoneInput.value.trim()) {
    output.style.color = "red";
    output.innerText = "⚠️ 請填寫「電話」";
    phoneInput.focus();
    return;
  }
  if (!lineInput.value.trim()) {
    output.style.color = "red";
    output.innerText = "⚠️ 請填寫「LINE ID」";
    lineInput.focus();
    return;
  }
  if (!emailInput.value.trim()) {
    output.style.color = "red";
    output.innerText = "⚠️ 請填寫「電子郵件」";
    emailInput.focus();
    return;
  } else {
    const emailRule = /^[^\s@]+@[^\s@]+$/;
    if (!emailRule.test(emailInput.value.trim())) {
      output.style.color = "red";
      output.innerText = "⚠️ 電子郵件格式錯誤（須包含 @ ）";
      emailInput.focus();
      return;
    }
  }
  if (!bankInput.value.trim()) {
    output.style.color = "red";
    output.innerText = "⚠️ 請填寫「匯款末 5 碼」";
    bankInput.focus();
    return;
  } else if (bankInput.value.trim().length !== 5) {
    output.style.color = "red";
    output.innerText = "⚠️ 匯款帳號末 5 碼必須為 5 位數字";
    bankInput.focus();
    return;
  }

  // --- 3. 準備提交資料 ---
  const data = {
    room: room,
    date: date,
    name: nameInput.value.trim(),
    phone: phoneInput.value.trim(),
    lineId: lineInput.value.trim(),
    email: emailInput.value.trim(),
    bankId: bankInput.value.trim(),
    timeRange: timeRangeString
  };


  const originalBtnText = "送出教室預約";
  btn.disabled = true;
  btn.innerHTML = `
    <svg class="fly-out-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" width="1.4em" height="1.4em" style="vertical-align: middle; margin-right: 8px;">
      <path fill="white" d="M125.4 128C91.5 128 64 155.5 64 189.4C64 190.3 64 191.1 64.1 192L64 192L64 448C64 483.3 92.7 512 128 512L512 512C547.3 512 576 483.3 576 448L576 192L575.9 192C575.9 191.1 576 190.3 576 189.4C576 155.5 548.5 128 514.6 128L125.4 128zM528 256.3L528 448C528 456.8 520.8 464 512 464L128 464C119.2 464 112 456.8 112 448L112 256.3L266.8 373.7C298.2 397.6 341.7 397.6 373.2 373.7L528 256.3zM112 189.4C112 182 118 176 125.4 176L514.6 176C522 176 528 182 528 189.4C528 193.6 526 197.6 522.7 200.1L344.2 335.5C329.9 346.3 310.1 346.3 295.8 335.5L117.3 200.1C114 197.6 112 193.6 112 189.4z"/>
    </svg>
  `;
  //<!--!Font Awesome Free v7.2.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2026 Fonticons, Inc.-->
  btn.style.backgroundColor = "#E87A90"; // 變灰色
  btn.style.cursor = "not-allowed";


  callGasApi("submitRoomBooking", [data])
    .then(function (res) {
      btn.innerText = originalBtnText;
      btn.disabled = false;
      btn.style.backgroundColor = "#E87A90";
      btn.style.cursor = "pointer";

      output.style.color = "green";
      output.innerHTML = "✅ " + res + "<br>資料已清空，可繼續下一次預約。";
      output.scrollIntoView({ behavior: 'smooth', block: 'center' });

      const durationSelect = document.getElementById('durationSelect');
      const selectedText = durationSelect.options[durationSelect.selectedIndex].text;
      const priceMatch = selectedText.match(/\((\d+)元\)/);
      const finalPrice = priceMatch ? priceMatch[1] : "0";

      // 2. 注入共用的 paymentInfo
      document.getElementById('displayFinalAmount').innerText = finalPrice;
      const content = document.getElementById('paymentInfo').innerHTML;
      document.getElementById('modalInjectionPoint').innerHTML = content;

      // 3. 彈出
      document.getElementById('paymentModalOverlay').classList.add('active');

      setTimeout(function () {
        // 清空欄位
        nameInput.value = "";
        phoneInput.value = "";
        lineInput.value = "";
        emailInput.value = "";
        bankInput.value = "";

        fetchRoomStatus(); // 重新整理表格
        btn.disabled = false;
        output.innerText = "";
      }, 3000);

    })
    .catch(function (err) {
      output.style.color = "red";
      // 加入 err.message || err 的防呆機制，確保字串或錯誤物件都能正確顯示
      const errorMsg = err.message || err;
      output.innerText = "❌ 提交失敗：" + errorMsg;
      btn.disabled = false;
    });
}

function closePaymentModal() {
  const injectionHtml = document.getElementById('modalInjectionPoint').innerHTML;
  if (injectionHtml.includes('位學員資料') || injectionHtml.includes('緊急聯絡人')) {
    return; // 直接中斷，不關閉視窗
  }

  const modal = document.getElementById('paymentModalOverlay');
  modal.classList.remove('active');
  // 延遲清空內容防止閃爍
  setTimeout(() => { document.getElementById('modalInjectionPoint').innerHTML = ""; }, 300);
}
function updatePriceList() {
  const room = document.getElementById('roomSelect').value;
  const durationSelect = document.getElementById('durationSelect');
  const price = roomPriceMap[room] || 0;

  // 清空現有選項
  durationSelect.innerHTML = "";

  // 動態產生 1-6 小時的選項
  for (let i = 1; i <= 13; i++) {
    const opt = document.createElement('option');
    opt.value = i;
    // 顯示格式：1 小時 (1000元)
    opt.text = i + " 小時 (" + (price * i) + "元)";
    durationSelect.appendChild(opt);
  }
  buildCustomDropdown('durationSelect', 'customDurationDropdown', 'customDurationMenu', '-- 請先選擇教室 --');
  // 更新價格後，也要同步更新「可預約開始時間」選單
  updateAvailableTimes();
}

// 分頁切換功能
function openTab(evt, tabName) {
  const targetBtn = evt.currentTarget;
  const parent = targetBtn.parentElement;
  const ghost = document.getElementById('ghost-tab');
  const currentActiveBtn = parent.querySelector(".tab-btn.active");

  // 防呆：如果點擊的是同一個按鈕，或者找不到當前激活按鈕，就直接切換不跑動畫
  if (!currentActiveBtn || currentActiveBtn === targetBtn) {
    executeTabSwitch(targetBtn, parent, tabName);
    return;
  }

  if (ghost && parent) {
    // 計算相對位置
    const pRect = parent.getBoundingClientRect();
    const cRect = currentActiveBtn.getBoundingClientRect();
    const tRect = targetBtn.getBoundingClientRect();

    const startX = cRect.left - pRect.left;
    const startY = cRect.top - pRect.top;
    const endX = tRect.left - pRect.left;
    const endY = tRect.top - pRect.top;

    // 同步內容與尺寸
    ghost.style.width = cRect.width + "px";
    ghost.style.height = cRect.height + "px";

    // 注入變數 (SY 和 EY 已經在 CSS 內處理了 -3px 補償)
    ghost.style.setProperty('--sx', startX + "px");
    ghost.style.setProperty('--sy', startY + "px");
    ghost.style.setProperty('--ex', endX + "px");
    ghost.style.setProperty('--ey', endY + "px");

    // 啟動表演
    currentActiveBtn.classList.remove('active');

    ghost.classList.remove('ghost-moving');
    void ghost.offsetWidth; // 觸發重繪
    ghost.classList.add('ghost-moving');

    setTimeout(() => {
      ghost.classList.remove('ghost-moving');
      currentActiveBtn.style.opacity = "1"; // 恢復透明度

      // 動畫跑完後，呼叫實質切換的函式
      executeTabSwitch(targetBtn, parent, tabName);
    }, 350);
  } else {
    // 找不到幽靈按鈕時的保底機制
    executeTabSwitch(targetBtn, parent, tabName);
  }
}

/**
 * 輔助完成實質的主分頁面板切換與淡入動畫
 */
function executeTabSwitch(targetBtn, parent, tabName) {
  const btns = parent.querySelectorAll(".tab-btn");
  for (let i = 0; i < btns.length; i++) {
    btns[i].classList.remove("active");
  }
  targetBtn.classList.add("active");

  const tabContent = document.getElementsByClassName("tab-content");
  for (let i = 0; i < tabContent.length; i++) {
    tabContent[i].classList.remove("active");
    tabContent[i].classList.remove("fade-in-section");
  }

  const targetContent = document.getElementById(tabName);
  if (targetContent) {
    targetContent.classList.add("active");
    void targetContent.offsetWidth;
    targetContent.classList.add("fade-in-section");
  }

  const jumpPrimaryBtn = document.getElementById('jumpPrimaryBtn');
  if (jumpPrimaryBtn) {
    if (tabName === 'courseTab') {
      jumpPrimaryBtn.innerText = '報名';
    } else if (tabName === 'roomTab') {
      jumpPrimaryBtn.innerText = '預約';
    }
  }
}



function handleRoomQuery() {
  const phone = document.getElementById('queryRoomPhone').value;
  const btn = document.getElementById('roomqueryBtn'); // 查詢按鈕
  const resultDiv = document.getElementById('queryRoomResult'); // 下方顯示結果的地方

  if (!phone) {
    resultDiv.innerText = "請輸入電話號碼";
    resultDiv.style.color = "red";
    return;
  }

  // 1. 查詢開始
  btn.innerHTML = '<svg class="walking-circle" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" width="16" height="16"><path fill="white" d="M480 272C480 317.9 465.1 360.3 440 394.7L566.6 521.4C579.1 533.9 579.1 554.2 566.6 566.7C554.1 579.2 533.8 579.2 521.3 566.7L394.7 440C360.3 465.1 317.9 480 272 480C157.1 480 64 386.9 64 272C64 157.1 157.1 64 272 64C386.9 64 480 157.1 480 272zM272 416C351.5 416 416 351.5 416 272C416 192.5 351.5 128 272 128C192.5 128 128 192.5 128 272C128 351.5 192.5 416 272 416z"/></svg>';
  btn.disabled = true;
  btn.style.backgroundColor = "#E87A90";
  btn.style.cursor = "not-allowed";

  resultDiv.style.color = "#2c3e50";

  callGasApi("queryRoomReservation", [phone])
    .then(function (res) {
      // 2. 查詢完畢
      btn.innerText = "查詢";
      btn.disabled = false;
      btn.style.backgroundColor = "#E87A90";
      btn.style.cursor = "pointer";

      // 3. 處理查詢結果
      if (res === "查無教室預約紀錄。" || !res) {
        resultDiv.innerText = res;
        resultDiv.style.color = "red";
      } else {
        const rows = res.split("\n");

        // 防禦設定：清除 padding 與確保白淨的格式
        resultDiv.style.padding = "0";
        resultDiv.style.whiteSpace = "normal";

        // 縮小卡片間距，讓清單更緊湊
        let cardHtml = '<div style="display:flex;flex-direction:column;gap:10px;margin-top:12px;">';

        rows.forEach((rowStr) => {
          const parts = rowStr.split('｜');
          if (parts.length === 3) {
            const room = parts[0].replace('教室: ', '').trim();
            const date = parts[1].replace('日期: ', '').trim();
            const time = parts[2].replace('時間: ', '').trim();
            const [startTime, endTime] = time.split('-');

            const dateObj = new Date(date);
            const weekDays = ["日", "一", "二", "三", "四", "五", "六"];
            const weekDayStr = isNaN(dateObj) ? "" : `(週${weekDays[dateObj.getDay()]})`;

            cardHtml += `<div style="display:flex;justify-content:space-between;align-items:center;border:1.5px solid #F4A7B9;border-radius:15px;padding:12px 15px;background:#fff;box-shadow:0 2px 6px rgba(244,167,185,0.15);">` +
              `<div class="time-tag" style="display:flex;flex-direction:column;align-items:center;font-weight:bold;font-size:1.05em;width:55px;flex-shrink:0;">` +
              `<span style="line-height:1;">${startTime}</span>` +
              `<div class="time-line"></div>` +
              `<span style="line-height:1;">${endTime}</span>` +
              `</div>` +
              `<div style="flex-grow:1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:0 10px;">` +
              `<span style="font-size:1.1em;font-weight:bold;color:#555;line-height:1.2;">${date}</span>` +
              `<span style="font-size:0.85em;color:#888;font-weight:bold;margin-top:2px;">${weekDayStr}</span>` +
              `</div>` +
              `<div style="flex-shrink:0;">` +
              `<span style="background:#F4A7B9;color:#fff;padding:5px 12px;border-radius:15px;font-size:0.95em;font-weight:bold;white-space:nowrap;">${room}</span>` +
              `</div>` +
              `</div>`;
          }
        });

        cardHtml += `</div>`;

        resultDiv.style.color = "#2c3e50";
        resultDiv.innerHTML = cardHtml;
      }
    })
    .catch(function (err) {
      btn.innerText = "查詢";
      btn.disabled = false;
      btn.style.backgroundColor = "#E87A90";
      btn.style.cursor = "pointer";

      console.error("查詢預約失敗:", err.message || err);
      resultDiv.innerText = "❌ 系統錯誤，請稍後再試。";
      resultDiv.style.color = "red";
    });
}

function updateNotice() {
  const selectElement = document.getElementById('participantCount');
  const noticeElement = document.getElementById('multi-notice');

  // 取得當前選中的值
  const count = selectElement.value;

  // 判斷：如果人數大於 1，則顯示提示訊息
  if (count > 1) {
    noticeElement.style.display = 'block';
  } else {
    noticeElement.style.display = 'none';
  }
  updateSelectedDisplay();
}

function updateSelectedDisplay() {
  const selectedList = document.getElementById('selected-list');
  const checkedBoxes = document.querySelectorAll('input[name="items"]:checked');
  const pCount = parseInt(document.getElementById('participantCount').value) || 1; // 取得人數

  // 1. 如果沒有勾選任何課程
  if (checkedBoxes.length === 0) {
    selectedList.innerHTML = '<span style="color: #999; font-weight: bold;">尚未選擇課程</span>';
    canSubmitByQuota = false; // 重置名額狀態
    return;
  }

  // --- 新增：早鳥判定邏輯 ---
  const today = new Date();
  // 確保截止日期格式正確並將時間設為當天最後一秒 (23:59:59) 以利判斷
  const ebDeadline = earlyBirdDate ? new Date(earlyBirdDate) : null;
  if (ebDeadline) ebDeadline.setHours(23, 59, 59, 999);

  const isEarlyBird = ebDeadline && today <= ebDeadline;
  const currentEBDiscount = isEarlyBird ? earlyBirdDiscount : 1;
  // ----------------------

  // 2. 開始前端計算邏輯
  let totalPrice = 0;
  let listHtml = '<ul style="margin: 0; padding-left: 20px; line-height: 1.6;">';
  let hasFullItem = false;
  const selectedItemsCount = checkedBoxes.length;

  checkedBoxes.forEach(box => {
    const itemName = box.value;
    // 從全域變數 allCourseData 找出對應的課程物件
    const course = allCourseData.find(c => c.name === itemName);

    if (course) {
      // 解析堂數 (B欄日期以逗號分隔)
      const dateArray = course.dates.split(",").filter(s => s.trim() !== "");
      const count = dateArray.length;

      // 修改：先乘上早鳥折扣，再計算小計
      const subTotal = Math.round(count * course.pricePerClass * currentEBDiscount);
      totalPrice += (subTotal * pCount);

      // 名額判斷 
      let statusLabel = "";
      if (course.remaining <= 0) {
        statusLabel = ` <b style="color: red;">(已額滿 請取消勾選)</b>`;
        hasFullItem = true;
      } else {
        statusLabel = ` (剩餘名額 ${course.remaining})`;
      }

      // 若有早鳥優惠，在項目後方顯示提示字樣
      const ebTag = (isEarlyBird && currentEBDiscount !== 1) ? ` <span style="color: #E87A90; font-size: 0.9em;">(早鳥價)</span>` : "";

      listHtml += `<li><span style="font-size: 1.15em; font-weight: bold;">${itemName}</span><br><span style="font-size: 1em; color: #666;">(${count}堂, ${subTotal}元)${ebTag} ${statusLabel}</span></li>`;
    }
  });

  listHtml += '</ul>';

  // 3. 更新全域提交狀態
  canSubmitByQuota = !hasFullItem;

  // 4. 計算折扣 (兩堂以上額外折扣)
  let finalDisplayHtml = listHtml;
  finalDisplayHtml += `<div style="margin-top: 10px; padding-top: 5px; border-top: 2px solid #F4A7B9; font-weight: bold; color: #d05a6e;">`;
  finalDisplayHtml += `共計 ${selectedItemsCount} 門課，總金額：${totalPrice} 元`;

  let finalPrice = totalPrice;
  if (!isEarlyBird && selectedItemsCount >= 2 && globalDiscountRate !== 1) {
    const discountPrice = Math.round(totalPrice * globalDiscountRate);
    const displayDiscount = (globalDiscountRate * 100) % 10 === 0 ?
      (globalDiscountRate * 10) :
      (globalDiscountRate * 100);
    finalDisplayHtml += `<br><span style="color: #E87A90;">✨ 兩堂以上 ${displayDiscount} 折優惠✨</span>`;
    finalPrice = discountPrice;
  } else if (isEarlyBird && selectedItemsCount >= 2) {
    finalDisplayHtml += `<br><span style="color: #666; font-size: 0.85em;">(已套用早鳥優惠)</span>`;
  }

  finalDisplayHtml += `</div>`;

  selectedList.classList.remove('result-card-anim');
  selectedList.innerHTML = finalDisplayHtml;

  // 2. 強制瀏覽器重繪 (Reflow)，確保能重新偵測到動畫
  void selectedList.offsetWidth;

  // 3. 重新加上動畫類別，觸發往上淡出特效
  selectedList.classList.add('result-card-anim');

  const amountSpan = document.getElementById('displayFinalAmount');
  if (amountSpan) {
    amountSpan.innerText = finalPrice;
  }
}


function validateCoursePhone(inputEl) {
  const submitBtn = document.getElementById('submitBtn');
  let value = inputEl.value.trim();

  // 1. 強制過濾非數字
  value = value.replace(/[^0-9]/g, '');
  inputEl.value = value;

  // 2. 驗證條件：長度為10 且 以09開頭
  const isValid = (value.length === 10 && value.startsWith('09'));

  if (isValid) {
    // --- 格式正確：變綠框、啟動按鈕 ---
    inputEl.classList.add('field-success');
    inputEl.classList.remove('field-error');

    canSubmitByPhone = true;
    //submitBtn.style.backgroundColor = "#E87A90"; // 變成原本報名按鈕的綠色
    submitBtn.style.cursor = "pointer";
  } else {
    // --- 格式不全或錯誤：取消綠框、禁用按鈕 ---
    inputEl.classList.remove('field-success');

    // 如果剛好滿10碼但不是09開頭，可以給個紅框警告
    if (value.length === 10) {
      inputEl.classList.add('field-error');
    } else {
      inputEl.classList.remove('field-error');
    }

    canSubmitByPhone = false;
    //submitBtn.style.backgroundColor = "#cccccc"; // 變回灰色
    submitBtn.style.cursor = "not-allowed";
  }
}

function validateSinglePhone(inputEl) {
  const submitBtn = document.getElementById('submitBtnS');
  let value = inputEl.value.trim();

  // 1. 強制過濾非數字
  value = value.replace(/[^0-9]/g, '');
  inputEl.value = value;

  // 2. 驗證條件：長度為10 且 以09開頭
  const isValid = (value.length === 10 && value.startsWith('09'));

  if (isValid) {
    // --- 格式正確：變綠框、啟動按鈕 ---
    inputEl.classList.add('field-success');
    inputEl.classList.remove('field-error');

  } else {
    // --- 格式不全或錯誤：取消綠框、禁用按鈕 ---
    inputEl.classList.remove('field-success');

    // 如果剛好滿10碼但不是09開頭，可以給個紅框警告
    if (value.length === 10) {
      inputEl.classList.add('field-error');
    } else {
      inputEl.classList.remove('field-error');
    }

  }
}

function validateRoomPhone(inputEl) {
  const roomBtn = document.getElementById('roomBtn');
  let value = inputEl.value.trim().replace(/[^0-9]/g, ''); // 過濾非數字
  inputEl.value = value;

  // 驗證條件：10碼 且 09 開頭
  if (value.length === 10 && value.startsWith('09')) {
    // --- 格式正確：變綠框、開啟紫色按鈕 ---
    inputEl.classList.add('field-success');
    inputEl.classList.remove('field-error');

    //roomBtn.disabled = false;
    //roomBtn.style.background = "#E87A90"; // 恢復你原本的紫色
    roomBtn.style.cursor = "pointer";
  } else {
    // --- 格式錯誤或長度不足：禁用按鈕 ---
    inputEl.classList.remove('field-success');

    // 如果剛好滿10碼但非09開頭，顯示錯誤顏色
    if (value.length === 10) {
      inputEl.classList.add('field-error');
    } else {
      inputEl.classList.remove('field-error');
    }

    //roomBtn.disabled = true;
    //roomBtn.style.background = "#cccccc"; // 變回灰色
    roomBtn.style.cursor = "not-allowed";
  }
}

document.getElementById('teacherSearchInput').addEventListener('change', function () {
  // 1. 取得選取的老師名稱
  const teacherName = document.getElementById('teacherSearchInput').value.trim();
  const resultDiv = document.getElementById('teacherQueryResult');

  // 2. 檢查是否選取老師
  if (!teacherName) {
    resultDiv.innerHTML = "<div class='result-card-anim' style='color: red; text-align:center;'>請選擇老師再進行查詢</div>";
    return;
  }

  let allCourseText = globalSettings?.title?.[1] || "";
  let singleCourseText = globalSettings?.title?.[2] || "";

  // 3. 安全合併「現有課程」與「過去課程」資料
  // 確保如果陣列尚未載入(undefined)時，會以空陣列 [] 代替，避免程式報錯
  const currentData = (allCourseData || []).map(c => ({ ...c, courseType: '期課課程' }));
  const pastData = (allCourseDataPast || []).map(c => ({ ...c, courseType: '本月課程' }));
  const combinedData = [...currentData, ...pastData];

  // 檢查合併後的資料狀態
  if (combinedData.length === 0) {
    resultDiv.innerHTML = "<div class='result-card-anim' style='color: orange; text-align:center;'>資料載入中，請稍候再試...</div>";
    return;
  }

  // 4. 過濾出該老師的所有課程 (排除含有「★」的項目)
  const filteredCourses = combinedData.filter(c =>
    c.name && c.name.includes(teacherName) && !c.name.includes('★')
  );

  // 5. 渲染結果
  if (filteredCourses.length === 0) {
    resultDiv.innerHTML = `<div class="result-card-anim" style="text-align:center; padding: 20px; color: #999;">此老師目前無公開排課紀錄</div>`;
  } else {
    // 依據星期與時間排序，讓清單更整齊
    const dayOrder = ["週一", "週二", "週三", "週四", "週五", "週六", "週日"];
    filteredCourses.sort((a, b) => {
      const dayA = dayOrder.findIndex(d => a.name.includes(d));
      const dayB = dayOrder.findIndex(d => b.name.includes(d));
      if (dayA !== dayB) return dayA - dayB;
      const timeA = a.name.match(/\d{2}:\d{2}/);
      const timeB = b.name.match(/\d{2}:\d{2}/);
      return (timeA && timeB) ? timeA[0].localeCompare(timeB[0]) : 0;
    });

    let html = ``;

    filteredCourses.forEach(course => {
      // --- 1. 解析時間與名稱 (安全抓取，避免格式錯誤) ---
      const rawCourseName = course.name || "";
      const namePartsFull = rawCourseName.split(" ");

      // 課程名稱與老師 (例如: "Zumba-Grace")
      const nameTeacherPart = namePartsFull[0] || "";
      const subParts = nameTeacherPart.split("-");
      const cKey = (subParts[0] || "").trim().replace(/'/g, "\\'");
      const tKey = (subParts[1] || "").trim().replace(/'/g, "\\'");

      // 星期與時間段
      const weekText = (namePartsFull[1] || "").trim();
      const fullTimeStr = namePartsFull[2] || "";
      const tParts = fullTimeStr.split("-");
      const startTime = tParts[0] || "--:--";
      const endTime = tParts[1] || "--:--";

      // --- 2. 計算價格與堂數 (若有需要) ---
      // 這裡確保 dates 有值才進行 split，避免 past data 結構不同造成錯誤
      const rawDates = course.dates || "";
      const dateArray = rawDates.split(",").filter(s => s.trim() !== "");
      const totalClasses = dateArray.length;
      const totalPrice = totalClasses * (course.pricePerClass || 0);
      const tagBgColor = course.courseType === '期課課程' ? '#d14d72' : '#f089a1';
      const displayTagText = (course.courseType === '期課課程') ? allCourseText : singleCourseText;
      const tagHtml = `<span style="background: ${tagBgColor}; color: white; padding: 3px 8px; border-radius: 4px; font-size: 0.75em; margin-right: 6px; white-space: nowrap;">${displayTagText}</span>`;

      // --- 3. 組裝定版 HTML (套用 result-card-anim 動畫) ---
      html += `
    <div class="course-card result-card-anim" onclick="openCombinedDrawer('${cKey}', '${tKey}', this)" style="cursor: pointer; margin-top: 10px;">
        <div class="card-inner">
            <div class="card-front" style="display: flex; align-items: center; padding: 15px; border-left: 6px solid #F4A7B9;">
                
                <div style="width: 70px; flex-shrink: 0; margin-right: 15px; text-align: center;">
                    <div class="time-tag" style="
                        background: #F4A7B9; 
                        display: flex; 
                        flex-direction: column; 
                        align-items: center; 
                        justify-content: center; 
                        width: 70px; 
                        height: 70px; 
                        margin: 0 auto; 
                        border-radius: 12px; 
                        color: white; 
                        box-sizing: border-box;
                        box-shadow: 0 4px 8px rgba(232, 122, 144, 0.3);">
                        <span style="font-size: 1.0em; font-weight: bold; line-height: 1;">${startTime}</span>
                        <div class="time-line" style="width: 2px; height: 10px; background: rgba(255,255,255,0.7); margin: 3px 0;"></div>
                        <span style="font-size: 1.0em; font-weight: bold; line-height: 1;">${endTime}</span>
                    </div>

                    <span style="
                        font-size: 0.95em; 
                        font-weight: bold; 
                        color: #d14d72; 
                        margin: 8px auto 0 auto; 
                        display: block; 
                        width: 100%;
                        text-align: center;">
                        ${weekText}
                    </span>
                </div>

                <div style="flex: 1; text-align: left; min-width: 0;">
                    <div class="card-title" style="margin-bottom: 4px; font-weight: bold; color: #d14d72; font-size: 1.1em; display: flex; flex-direction: column; align-items: flex-start; gap: 6px;">
                        ${tagHtml}
                        <span>${cKey}</span>
                    </div>
                    <small style="color: #f089a1; display: block; margin-top: 6px;">點擊查看課程與老師簡介 ➔</small>
                </div>
            </div>

            <div class="card-back">
                <div style="font-weight: bold;">查看詳細介紹...</div>
            </div>
        </div>
    </div>`;
    });

    resultDiv.innerHTML = html;
  }
});

function validateNumber(obj) {
  obj.value = obj.value.replace(/\D/g, '');
}

function injectCommonRules() {
  const containers = document.querySelectorAll('.rules-container');
  containers.forEach(container => {
    container.innerHTML = COMMON_INFO_BTNS;
  });
}

// 確保在頁面載入後執行
window.addEventListener('load', () => {
  const openingNotice = document.getElementById('opening-notice');
  if (0) {
    const today = new Date();
    // 設定截止日期為 2026 年 5 月 24 日 的凌晨 00:00:00
    // (JavaScript 的月份是從 0 開始算，所以 4 代表 5 月)
    const targetDate = new Date(2026, 4, 24);

    if (today < targetDate) {
      openingNotice.innerText = "WEI DONG";
    } else {
      openingNotice.innerText = "WEI DONG";
    }
  }
  injectCommonRules();

  // 尋找所有的文字、電話、信箱輸入框
  const textInputs = document.querySelectorAll('input[type="text"], input[type="tel"], input[type="email"]');

  textInputs.forEach(input => {
    input.addEventListener('input', function () {
      // 1. 先移除舊的 class，確保連續打字時動畫能重新觸發
      this.classList.remove('typing-pulse-effect');

      // 2. 強制瀏覽器重繪 (Reflow) 
      void this.offsetWidth;

      // 3. 加上動畫 class
      this.classList.add('typing-pulse-effect');
    });
  });


});

function closeOverlay() {
  if (textTimer) {
    clearInterval(textTimer);
  }
  const overlay = document.getElementById('video-overlay');
  if (overlay) {
    overlay.classList.add('exit-animation'); // 直接套用 CSS 動畫

    const aiWidget = document.getElementById('ai-chat-widget');
    if (aiWidget) {
      aiWidget.classList.add('show');
    }
    //document.getElementById('qrcode-widget').classList.add('show');

    setTimeout(() => {
      overlay.style.display = 'none';
    }, 800);
  }
}
// 打開 QRCode 視窗
function openQRCodeModal() {
  document.getElementById('qrcodeModalOverlay').classList.add('active');
}

// 關閉 QRCode 視窗並還原狀態
function closeQRCodeModal() {
  document.getElementById('qrcodeModalOverlay').classList.remove('active');
  // 延遲清空內容，避免淡出動畫時發生閃爍
  setTimeout(() => {
    document.getElementById('qrPhoneNumber').value = "";
    document.getElementById('qrErrorMsg').style.display = "none";
    document.getElementById('qrcodeDisplay').style.display = "none";
    document.getElementById('qrcodeImg').src = "";
  }, 300);
}

// 產生 QRCode
function generateQRCode() {
  const phone = document.getElementById('qrPhoneNumber').value.trim();
  const errorMsg = document.getElementById('qrErrorMsg');

  // 簡單的防呆檢查：是否為 09 開頭且剛好 10 碼
  if (phone.length !== 10 || !phone.startsWith('09')) {
    errorMsg.style.display = 'block';
    errorMsg.innerHTML = "⚠️ 請輸入正確的手機號碼 (09開頭，共10碼)";
    return;
  }

  errorMsg.style.display = 'none';

  // 使用免費穩定的 API 產生 QRCode (將手機號碼編碼作為 QRCode 內容)
  const qrUrl = "https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=" + encodeURIComponent(phone);

  const img = document.getElementById('qrcodeImg');
  img.src = qrUrl;
  document.getElementById('qrcodeDisplay').style.display = 'block';
}
function initSingleCourseDropdown() {
  const inputEl = document.getElementById('singleCourseSelect');
  if (!inputEl) return;

  // 檢查是否有拿到前期的課表資料
  if (!allCourseDataPast || allCourseDataPast.length === 0) {
    inputEl.placeholder = "❌ 暫無本月單堂課程資料";
    inputEl.disabled = true;
    return;
  }

  // 復原初始狀態
  inputEl.placeholder = "🔍 點擊此處開啟課表選擇課程";
  inputEl.disabled = false;
  inputEl.value = ""; // 確保重設時欄位清空
}

function loadSingleDates() {
  const courseName = document.getElementById('singleCourseSelect').value;
  const container = document.getElementById('dateRadioGroup');
  const priceSpan = document.getElementById('sTotalPrice');
  if (!courseName) {
    container.innerHTML = '<p>請先選擇課程...</p>';
    priceSpan.innerText = "0";
    return;
  }

  const course = allCourseDataPast.find(c => c.name === courseName); // 🔍 改從前期資料搜尋
  if (!course) return;
  var extraFee = 0;
  priceSpan.innerText = course.pricePerClass + extraFee;

  // 💡 [修改] 直接在前端使用 globalSingleBookedMap 計算名額，免去後端 API 呼叫，瞬間載入！
  container.innerHTML = "";

  // 1. 本地端秒算各日期剩餘名額
  const dateStatus = {};
  const dateArray = course.dates.split(/[,，\s]+/).filter(d => d.trim().length > 0);
  dateArray.forEach(d => {
    const dateStr = d.trim();
    const booked = (globalSingleBookedMap[course.name] && globalSingleBookedMap[course.name][dateStr]) ? globalSingleBookedMap[course.name][dateStr] : 0;
    dateStatus[dateStr] = course.remaining - booked;
  });

  // 2. 進行日期排序
  const sortedDates = Object.keys(dateStatus).sort(function (a, b) {
    const partsA = a.split(/[\/\-]/);
    const partsB = b.split(/[\/\-]/);
    const monthA = parseInt(partsA[0], 10);
    const dayA = parseInt(partsA[1], 10);
    const monthB = parseInt(partsB[0], 10);
    const dayB = parseInt(partsB[1], 10);

    if (monthA !== monthB) return monthA - monthB;
    return dayA - dayB;
  });

  // 💡 [新增] 建立今天零點零分 (00:00:00) 的時間物件作為比較基準
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let hasAvailableDate = false; // 紀錄是否有產生任何有效的日期選項

  // 3. 渲染每一天的選項
  sortedDates.forEach(date => {
    // 解析格式 (支援 "5/23" 或 "05-23" 或 "2026/05/23")
    const dateParts = date.split(/[\/\-]/);
    let targetYear = today.getFullYear();
    let targetMonth, targetDay;

    if (dateParts.length === 3) {
      targetYear = parseInt(dateParts[0], 10);
      targetMonth = parseInt(dateParts[1], 10) - 1;
      targetDay = parseInt(dateParts[2], 10);
    } else if (dateParts.length === 2) {
      targetMonth = parseInt(dateParts[0], 10) - 1;
      targetDay = parseInt(dateParts[1], 10);
    } else {
      return; // 格式不符則跳過
    }

    // 建立該課程日期的物件，同樣設為 00:00:00 進行公平比對
    const itemDate = new Date(targetYear, targetMonth, targetDay, 0, 0, 0, 0);

    // 💡 [核心防呆] 如果課程日期小於或等於今天，直接跳過不產生選項
    if (itemDate <= today) {
      return;
    }

    // 通過時間檢查，代表是未來的課程，開始渲染選項
    hasAvailableDate = true;
    const remaining = dateStatus[date];
    const label = document.createElement('label');
    label.className = 'checkbox-item';

    const isFull = remaining <= 0;
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = 'singleDate';
    radio.value = date;
    radio.disabled = isFull;

    const span = document.createElement('span');
    span.innerHTML = isFull ? `${date} <b style="color:red;">(已額滿)</b>` : `${date} (剩餘 ${remaining})`;
    if (isFull) label.style.color = "#ccc";

    label.appendChild(radio);
    label.appendChild(span);
    container.appendChild(label);
  });

  // 💡 [加強體驗] 如果該歷史課程的所有日期都已經過去了，顯示提示字樣
  if (!hasAvailableDate) {
    container.innerHTML = '<p style="color: #999; font-size: 0.9em;">☕ 此課程當前已無可報名的未來日期</p>';
  }
}

function submitSingleForm() {
  const output = document.getElementById('singleOutput');
  const selectedDate = document.querySelector('input[name="singleDate"]:checked');
  const btn = document.querySelector('button[onclick="submitSingleForm()"]');

  const data = {
    courseName: document.getElementById('singleCourseSelect').value,
    selectedDate: selectedDate ? selectedDate.value : "",
    name: document.getElementById('sName').value.trim(),
    phone: document.getElementById('sPhone').value.trim(),
    lineId: document.getElementById('sLine').value.trim(),
    email: document.getElementById('sEmail').value.trim(),
    bankId: document.getElementById('sBank').value.trim()
  };

  if (!data.courseName || !data.selectedDate || !data.name || !data.phone || !data.bankId) {
    output.style.color = "red";
    output.innerText = "⚠️ 請填寫完整報名資訊並選擇日期";
    return;
  }

  const isPhoneValid = (data.phone.length === 10 && data.phone.startsWith('09'));
  if (!isPhoneValid) {
    output.style.color = "red";
    output.innerText = "⚠️ 電話格式不正確，必須為 09 開頭的 10 位數字";
    document.getElementById('sPhone').focus();
    return;
  }

  const agreement = document.getElementById('agreementCheckbox_S');
  if (!agreement.checked) {
    output.style.color = "red";
    output.innerText = "⚠️ 請先勾選：「本人已詳細閱讀相關資訊」後再提交。";
    output.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }

  // 驗證過關後，先不直接送出後端，而是呼叫彈窗（最後一個參數帶 true 代表單堂課程）
  askEmergencyContactSingle(data, btn, output, true);
}

/**
 * 執行最終的單堂資料提交（帶入緊急聯絡人資訊）
 */
function executeSingleCourseSubmit(data, emergencyInfo, btn, output) {
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `
      <svg class="fly-out-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" width="1.4em" height="1.4em" style="vertical-align: middle; margin-right: 8px;">
        <path fill="white" d="M125.4 128C91.5 128 64 155.5 64 189.4C64 190.3 64 191.1 64.1 192L64 192L64 448C64 483.3 92.7 512 128 512L512 512C547.3 512 576 483.3 576 448L576 192L575.9 192C575.9 191.1 576 190.3 576 189.4C576 155.5 548.5 128 514.6 128L125.4 128zM528 256.3L528 448C528 456.8 520.8 464 512 464L128 464C119.2 464 112 456.8 112 448L112 256.3L266.8 373.7C298.2 397.6 341.7 397.6 373.2 373.7L528 256.3zM112 189.4C112 182 118 176 125.4 176L514.6 176C522 176 528 182 528 189.4C528 193.6 526 197.6 522.7 200.1L344.2 335.5C329.9 346.3 310.1 346.3 295.8 335.5L117.3 200.1C114 197.6 112 193.6 112 189.4z"/>
      </svg>
    `;
    //<!--!Font Awesome Free v7.2.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2026 Fonticons, Inc.-->
  }
  output.style.color = "#34495e";
  output.innerText = "正在處理單堂報名資料...";

  callGasApi("processSingleForm", [data, emergencyInfo])
    .then(function (res) {
      if (btn) {
        btn.disabled = false;
        btn.innerText = "提交單堂報名";
      }

      output.style.color = "green";
      output.innerText = "✅ " + res;

      // 顯示匯款資訊並卷動
      const totalPrice = document.getElementById('sTotalPrice').innerText;
      document.getElementById('displayFinalAmount').innerText = totalPrice;

      // 抓取 paymentInfo 的內容並注入到 Modal 
      const paymentInfoHtml = document.getElementById('paymentInfo').innerHTML;
      const injectionPoint = document.getElementById('modalInjectionPoint');

      injectionPoint.innerHTML = `
        <div style="display:block !important; border:none; background:none; margin:0;">
          ${paymentInfoHtml}
        </div>
      `;

      // 顯示中央彈出視窗
      document.getElementById('paymentModalOverlay').classList.add('active');

      // 清空單堂表單基礎欄位
      document.getElementById('sName').value = "";
      document.getElementById('sPhone').value = "";
      document.getElementById('sBank').value = "";
      document.getElementById('sLine').value = "";
      document.getElementById('sEmail').value = "";
      document.getElementById('agreementCheckbox_S').checked = false;

      loadSingleDates(); // 刷新名額狀態
    })
    .catch(function (err) {
      if (btn) {
        btn.disabled = false;
        btn.innerText = "提交單堂報名";
      }
      output.style.color = "red";
      // 增加防呆：確保字串或錯誤物件都能正確顯示
      const errorMsg = err.message || err;
      output.innerText = "❌ 提交失敗：" + errorMsg;
    });
}

function openSubTab(evt, tabName) {
  const targetBtn = evt.currentTarget;
  const parentNode = targetBtn.parentElement;
  const ghost = document.getElementById('child-ghost-tab');
  const currentActiveBtn = parentNode.querySelector(".tab-btn.active");

  // 防呆：如果點擊的是同一個按鈕，或者找不到當前激活按鈕，就直接切換不跑動畫
  if (!currentActiveBtn || currentActiveBtn === targetBtn) {
    executeSubTabSwitch(targetBtn, parentNode, tabName);
    return;
  }

  if (ghost && parentNode) {
    // 1. 計算相對父容器的起點與終點座標
    const pRect = parentNode.getBoundingClientRect();
    const cRect = currentActiveBtn.getBoundingClientRect();
    const tRect = targetBtn.getBoundingClientRect();

    const startX = cRect.left - pRect.left;
    const startY = cRect.top - pRect.top;
    const endX = tRect.left - pRect.left;
    const endY = tRect.top - pRect.top;

    // 2. 同步幽靈卡片的尺寸
    ghost.style.width = cRect.width + "px";
    ghost.style.height = cRect.height + "px";

    // 3. 注入 CSS 衝刺變數
    ghost.style.setProperty('--sx', startX + "px");
    ghost.style.setProperty('--sy', startY + "px");
    ghost.style.setProperty('--ex', endX + "px");
    ghost.style.setProperty('--ey', endY + "px");

    // 4. 表演真假卡片切換
    currentActiveBtn.classList.remove('active');

    ghost.classList.remove('ghost-moving');
    void ghost.offsetWidth; // 強制重繪
    ghost.classList.add('ghost-moving');

    // 5. 動畫結束後復原狀態並完成切換
    setTimeout(() => {
      ghost.classList.remove('ghost-moving');
      currentActiveBtn.style.opacity = "1";
      executeSubTabSwitch(targetBtn, parentNode, tabName);
    }, 350); // 與 CSS 動畫時間保持一致
  } else {
    executeSubTabSwitch(targetBtn, parentNode, tabName);
  }
}

/**
 * 輔助完成實質的分頁面板切換與樣式標記
 */
function executeSubTabSwitch(targetBtn, parentNode, tabName) {
  // 切換按鈕樣式
  const btns = parentNode.querySelectorAll(".tab-btn");
  for (let i = 0; i < btns.length; i++) {
    btns[i].classList.remove("active");
  }
  targetBtn.classList.add("active");

  // 切換下方內容區區塊
  const contents = document.getElementsByClassName("sub-tab-content");
  for (let i = 0; i < contents.length; i++) {
    contents[i].classList.remove("active");
    contents[i].style.display = "none";
    // ✨ 新增：順便移除淡入 class，確保下次切換回來時能重新觸發動畫
    contents[i].classList.remove("fade-in-section");
  }

  const targetContent = document.getElementById(tabName);
  if (targetContent) {
    targetContent.classList.add("active");
    targetContent.style.display = "block";

    // ✨ 魔法兩行：強制瀏覽器重繪 (Reflow)，並掛上淡入動畫
    void targetContent.offsetWidth;
    targetContent.classList.add("fade-in-section");
  }
}

function toggleDrawer(contentId, title) {
  // === 【步驟 A】抓取觸發點擊的原始按鈕本人 ===
  // 透過 event.currentTarget 可以精準抓到目前被點擊的 info-card-btn
  const originalBtn = event ? event.currentTarget : null;

  if (originalBtn && originalBtn.classList.contains('info-card-btn')) {
    // 1. 抓取原始按鈕當下的幾何尺寸，以及相對於網頁頂部的絕對座標
    const rect = originalBtn.getBoundingClientRect();
    const absX = rect.left + window.scrollX;
    const absY = rect.top + window.scrollY;

    // 2. 動態創建一個一模一樣的替身小卡
    const ghost = document.createElement('div');
    ghost.className = 'fly-card-ghost';

    // 3. 把原始按鈕內部的文字、小字、箭頭等 HTML 完美複製進去
    ghost.innerHTML = originalBtn.innerHTML;

    // 4. 強制讓替身小卡的尺寸與出生位置跟原始按鈕完全重合
    ghost.style.width = rect.width + 'px';
    ghost.style.height = rect.height + 'px';
    ghost.style.left = absX + 'px';
    ghost.style.top = absY + 'px';

    // 5. 將替身小卡塞進網頁中，它會立刻開始執行 CSS 的往右放大淡出動畫
    document.body.appendChild(ghost);

    // 6. 動畫播完後（0.6 秒），自動把這個功成身退的替身從小卡中拔除銷毀
    setTimeout(() => {
      ghost.remove();
    }, 600);
  }

  // === 【步驟 B】核心防呆延時：當小卡飛到一半時，你原本的抽屜邏輯才完美接棒 ===
  setTimeout(() => {
    const drawer = document.getElementById('sideDrawer');
    const overlay = document.getElementById('drawerOverlay');
    const body = document.getElementById('drawerBody');
    const titleEl = document.getElementById('drawerTitle');

    // 1. 注入標題與內容
    titleEl.innerText = title;
    // 將隱藏區塊的 HTML 複製到抽屜的 Body 中
    body.innerHTML = document.getElementById(contentId).innerHTML;

    body.scrollTop = 0;

    // 2. 針對不同功能執行初始化 
    // 由於使用 innerHTML 注入，必須在注入後才執行選單初始化 
    setTimeout(() => {
      if (contentId === 'course-content') {
        // 初始化課程簡介下拉選單 
        initCourseIntroDropdown();
      } else if (contentId === 'teacher-content') {
        // 初始化師資介紹下拉選單 
        initTeacherDropdown();
      } else if (contentId === 'room-content') {
        // 修改處：改為呼叫列表初始化函式 
        initVenueList();
      }
    }, 50);

    // 3. 顯示抽屜與遮罩
    overlay.style.display = 'block';
    setTimeout(() => {
      drawer.classList.add('open');
    }, 10);

  }, 250); // 延遲 250 毫秒開啟，讓小卡先飛一會兒，視覺體驗最流暢！
}

function closeDrawer() {
  const drawer = document.getElementById('sideDrawer');
  const overlay = document.getElementById('drawerOverlay');

  drawer.classList.remove('open');

  // 核心：關閉抽屜時將小卡翻回來
  if (currentFlippedCourseCard) {
    currentFlippedCourseCard.classList.remove('card-flipped');
    currentFlippedCourseCard = null;
  }

  setTimeout(() => {
    overlay.style.display = 'none';
  }, 300);
}

function copyOnlyAccountNumber(e) {
  // 1. 檢查廣域變數是否有資料
  if (!globalAccountNumber) {
    console.error("帳號資訊尚未載入");
    return;
  }

  // 2. 執行複製邏輯
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(globalAccountNumber).then(function () {
      // 3. 成功反饋
      // 使用 currentTarget 確保點擊到按鈕內部的文字或圖示時，依然能正確抓到按鈕本人
      const btn = e.currentTarget || e.target;
      const originalText = btn.innerText;

      btn.innerText = "帳號已複製！";
      // 建議使用原本 LINE 按鈕的綠色漸層
      btn.style.background = "linear-gradient(135deg, #A8D8B9 0%, #77C392 100%)";

      setTimeout(() => {
        btn.innerText = originalText;
        btn.style.background = "linear-gradient(135deg, #E87A90 0%, #C88595 100%)";
      }, 1500);
    }).catch(function (err) {
      console.error('複製失敗: ', err);
    });
  } else {
    // 兼容性方案
    alert("您的瀏覽器不支援一鍵複製，帳號為：\n" + globalAccountNumber);
  }
}

/**
 * 1. 初始化課程選單 (改為小卡版，無篩選全顯示)
 */
function initCourseIntroDropdown() {
  const select = document.getElementById('courseIntroSelect');
  if (!globalSettings.courseIntros) return;

  select.innerHTML = '<option value="">-- 請選擇課程 --</option>';
  let coursesArray = [];

  // 取得所有簡介中的課程名稱並排序
  Object.keys(globalSettings.courseIntros).sort().forEach(name => {
    const option = document.createElement('option');
    option.value = name;
    option.text = name;
    select.appendChild(option);

    // 把所有的課程都推進陣列
    coursesArray.push({
      value: name,
      name: name
    });
  });

  // 呼叫生成課程小卡的函數
  renderCourseCards(coursesArray);
}

/**
 * 2. 生成課程小卡
 */
function renderCourseCards(courses) {
  const container = document.getElementById('courseCardsContainer');

  // 清除舊卡片，只保留重選按鈕
  const oldCards = container.querySelectorAll('.teacher-small-card:not(#reselectCourseBtn)');
  oldCards.forEach(card => card.remove());

  courses.forEach(course => {
    const card = document.createElement('div');
    card.className = 'teacher-small-card'; // 直接套用前一次寫好的 CSS
    card.innerText = course.name;

    card.onclick = function () {
      selectCourseCard(course.value, card);
    };

    container.appendChild(card);
  });
}

/**
 * 3. 點擊課程小卡後的處理邏輯
 */
function selectCourseCard(courseValue, selectedCard) {
  // 注意：這裡只抓 #courseCardsContainer 裡面的卡片，避免去動到老師的小卡
  const allCards = document.querySelectorAll('#courseCardsContainer .teacher-small-card:not(#reselectCourseBtn)');

  allCards.forEach(card => {
    if (card !== selectedCard) {
      card.style.opacity = '0';
    } else {
      card.classList.add('selected-card');
    }
  });

  // 2. 等待 0.5 秒其他卡片淡出後，執行滑順歸位動畫
  setTimeout(() => {
    // === 開始 FLIP 動畫計算 ===
    const startRect = selectedCard.getBoundingClientRect();
    allCards.forEach(card => {
      if (card !== selectedCard) card.style.display = 'none';
    });

    const reselectBtn = document.getElementById('reselectCourseBtn');
    reselectBtn.style.display = 'inline-flex';

    const endRect = selectedCard.getBoundingClientRect();

    const deltaX = startRect.left - endRect.left;
    const deltaY = startRect.top - endRect.top;

    selectedCard.style.transition = 'none';
    selectedCard.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
    selectedCard.offsetHeight;
    selectedCard.style.transition = 'transform 0.4s cubic-bezier(0.25, 0.8, 0.25, 1)';
    selectedCard.style.transform = 'translate(0, 0)';

    setTimeout(() => {
      reselectBtn.style.opacity = '1';
    }, 10);

    setTimeout(() => {
      selectedCard.style.transition = '';
      selectedCard.style.transform = '';
    }, 400);
    const select = document.getElementById('courseIntroSelect');
    if (select) {
      select.value = courseValue;
      loadCourseIntro();
    }

  }, 500); // 在其他卡片淡出的 0.5 秒後執行  
}

/**
 * 4. 點擊「重新選擇課程」的處理邏輯
 */
function resetCourseSelection() {
  // 1. 隱藏下方介紹區，清空 select
  const displayArea = document.getElementById('introDisplayArea');
  displayArea.classList.add('fade-out');
  setTimeout(() => {
    displayArea.style.display = 'none';
    displayArea.classList.remove('fade-out');
  }, 500);
  const select = document.getElementById('courseIntroSelect');
  if (select) select.value = "";

  // 2. 「重新選擇課程」按鈕開始 0.5 秒淡出
  const reselectBtn = document.getElementById('reselectCourseBtn');
  reselectBtn.style.opacity = '0';

  // 3. 關鍵修正：等待 0.5 秒完全消失後再載入其他卡片
  setTimeout(() => {
    reselectBtn.style.display = 'none'; // 徹底退出空間

    // 讓原本所有被隱藏的課程小卡重新回到畫面上並淡入
    const allCards = document.querySelectorAll('#courseCardsContainer .teacher-small-card:not(#reselectCourseBtn)');
    allCards.forEach(card => {
      card.classList.remove('selected-card');
      card.style.display = 'block';

      // 延遲 10ms 觸發 CSS opacity 淡入
      setTimeout(() => {
        card.style.opacity = '1';
      }, 10);
    });
  }, 500);
}

/**
 * 讀取並顯示簡介
 */
function loadCourseIntro() {
  // 取得選中的名稱
  let selectedName = document.getElementById('courseIntroSelect').value;
  const bodyEl = document.getElementById('introBody');
  const titleEl = document.getElementById('introTitle');
  const displayArea = document.getElementById('introDisplayArea');

  displayArea.style.display = 'none';
  if (!selectedName) { return; }

  // 防呆處理：如果 value 意外包含了 (未開課)，將其移除以便對應 globalSettings
  const cleanName = selectedName.replace(/\s\(未開課\)$/, "");

  if (titleEl) {
    titleEl.innerText = "🌸 " + cleanName + " 課程介紹";
  }

  // 使用清除標籤後的名稱來抓取簡介內容
  const desc = globalSettings.courseIntros[cleanName] || "簡介尚在更新中";

  if (desc.includes('http')) {
    bodyEl.innerHTML = `<img src="${desc}" referrerpolicy="no-referrer" style="width:100%; border-radius:12px;">`;
  } else {
    bodyEl.innerText = desc;
  }
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      displayArea.style.display = 'block';
    });
  });
}
let allTeacherData = [];
/**
 * 初始化師資選單 (改為小卡版)
 */
function initTeacherDropdown() {
  const select = document.getElementById('teacherSelect');
  if (!globalSettings.teachers) return;

  select.innerHTML = '<option value="">-- 請選擇老師 --</option>';

  let teachersArray = [];

  const combinedCourses = [...allCourseData, ...allCourseDataPast];

  globalSettings.teachers.forEach(teacher => {

    const hasCourse = combinedCourses.some(course => {
      // 確保 course.name 存在，再檢查是否包含老師名字
      return course.name && course.name.includes(teacher.name);
    });

    if (hasCourse) {
      const option = document.createElement('option');
      option.value = teacher.name;
      option.text = teacher.name;
      select.appendChild(option);

      teachersArray.push({
        value: teacher.name, // 傳入 select 的 value
        name: teacher.name   // 顯示在小卡上的文字
      });
    }
  });

  renderTeacherCards(teachersArray);
}

/**
 * 1. 生成老師小卡 (注意：不要清空了原本寫在 HTML 的重選按鈕)
 */
function renderTeacherCards(teachers) {
  const container = document.getElementById('teacherCardsContainer');

  // 為了不清空 HTML 裡的重選按鈕，我們先把原本的老師小卡刪除，只保留重選按鈕
  const oldCards = container.querySelectorAll('.teacher-small-card:not(#reselectTeacherBtn)');
  oldCards.forEach(card => card.remove());

  teachers.forEach(teacher => {
    const card = document.createElement('div');
    card.className = 'teacher-small-card';
    card.innerText = teacher.name;

    card.onclick = function () {
      selectTeacherCard(teacher.value, card);
    };

    container.appendChild(card);
  });
}

/**
 * 2. 點擊小卡後的處理邏輯
 */
function selectTeacherCard(teacherValue, selectedCard) {
  // 抓取所有的老師小卡（不包含重選按鈕）
  const allTeacherCards = document.querySelectorAll('.teacher-small-card:not(#reselectTeacherBtn)');

  // 1. 點擊瞬間：其他卡片開始 0.5秒 淡出，選中卡片變色
  allTeacherCards.forEach(card => {
    if (card !== selectedCard) {
      card.style.opacity = '0';
    } else {
      card.classList.add('selected-card');
    }
  });

  // 2. 等待 0.5 秒其他卡片淡出後，執行滑順歸位動畫
  setTimeout(() => {
    const startRect = selectedCard.getBoundingClientRect();

    allTeacherCards.forEach(card => {
      if (card !== selectedCard) card.style.display = 'none';
    });

    const reselectBtn = document.getElementById('reselectTeacherBtn');
    reselectBtn.style.display = 'inline-flex';

    const endRect = selectedCard.getBoundingClientRect();

    const deltaX = startRect.left - endRect.left;
    const deltaY = startRect.top - endRect.top;

    selectedCard.style.transition = 'none';
    selectedCard.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
    selectedCard.offsetHeight;
    selectedCard.style.transition = 'transform 0.4s cubic-bezier(0.25, 0.8, 0.25, 1)';
    selectedCard.style.transform = 'translate(0, 0)';
    setTimeout(() => {
      reselectBtn.style.opacity = '1';
    }, 10);

    setTimeout(() => {
      selectedCard.style.transition = '';
      selectedCard.style.transform = '';
    }, 400);
    const teacherSelect = document.getElementById('teacherSelect');
    if (teacherSelect) {
      teacherSelect.value = teacherValue;
      displayTeacherIntro();
    }

  }, 500); // 在其他卡片淡出的 0.5 秒後執行
}

/**
 * 3. 點擊「重新選擇老師」的處理邏輯
 */
function resetTeacherSelection() {
  // 1. 隱藏下方介紹區，清空 select
  const displayArea = document.getElementById('teacherDisplayArea');
  displayArea.classList.add('fade-out');
  setTimeout(() => {
    displayArea.style.display = 'none';
    displayArea.classList.remove('fade-out');
  }, 500);
  const teacherSelect = document.getElementById('teacherSelect');
  if (teacherSelect) teacherSelect.value = "";

  // 2. 「重新選擇小卡」開始 0.5 秒淡出
  const reselectBtn = document.getElementById('reselectTeacherBtn');
  reselectBtn.style.opacity = '0';

  // 3. 關鍵修正：等待 0.5 秒，等按鈕「完全消失並退出排版」後，才進行後續動作
  setTimeout(() => {
    reselectBtn.style.display = 'none'; // 徹底退出空間

    // 讓原本所有被隱藏的老師小卡重新回到畫面上並淡入
    const allTeacherCards = document.querySelectorAll('.teacher-small-card:not(#reselectTeacherBtn)');
    allTeacherCards.forEach(card => {
      card.classList.remove('selected-card'); // 移除選取狀態
      card.style.display = 'block';           // 恢復顯示佔位

      // 延遲 10ms 觸發 CSS opacity 淡入
      setTimeout(() => {
        card.style.opacity = '1';
      }, 10);
    });
  }, 500); // 這裡的 500 對應 CSS transition 的 0.5s
}
/**
 * 顯示選中的老師圖片與名字
 */
function displayTeacherIntro() {
  const selectedName = document.getElementById('teacherSelect').value;
  const imgEl = document.getElementById('teacherImg');
  //const titleEl = document.getElementById('teacherNameTitle');
  const introEl = document.getElementById('teacherIntroText');
  const displayArea = document.getElementById('teacherDisplayArea');
  const cardContainer = document.querySelector('.teacher-card-container');

  displayArea.style.display = 'none';
  if (cardContainer) cardContainer.classList.remove('flipped');
  if (!selectedName) return;

  const teacher = globalSettings.teachers.find(t => t.name === selectedName);
  if (teacher) {
    if (introEl) {
      introEl.innerHTML = teacher.intro;
    }

    imgEl.setAttribute('referrerpolicy', 'no-referrer');
    imgEl.onload = () => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          displayArea.style.display = 'block';
        });
      });
    };
    imgEl.onerror = () => {
      console.log("老師圖片載入失敗，直接顯示區塊");
      displayArea.style.display = 'block';
    };
    imgEl.src = teacher.url; 
  }
}



// 新增一個變數紀錄當前翻轉的小卡
let currentFlippedCourseCard = null;

function openCombinedDrawer(courseName, teacherName, cardEl) {
  // 1. 處理卡片翻轉視覺
  if (cardEl) {
    // 若已有卡片翻轉（保險機制），先恢復它
    if (currentFlippedCourseCard) currentFlippedCourseCard.classList.remove('card-flipped');

    currentFlippedCourseCard = cardEl;
    currentFlippedCourseCard.classList.add('card-flipped');
  }

  // 2. 延遲執行原本的抽屜邏輯 (等待翻轉動畫進行)
  setTimeout(() => {
    const drawer = document.getElementById('sideDrawer');
    const overlay = document.getElementById('drawerOverlay');
    const body = document.getElementById('drawerBody');
    const titleEl = document.getElementById('drawerTitle');

    titleEl.innerText = "詳細資訊";

    // --- 1. 課程簡介區塊 (保留您原本的邏輯) ---
    const introKeys = Object.keys(globalSettings.courseIntros || {});
    const matchedCourseKey = introKeys.find(key => courseName.includes(key) || key.includes(courseName));
    const courseDesc = matchedCourseKey ? globalSettings.courseIntros[matchedCourseKey] : "課程簡介尚在更新中";

    let courseHtml = `<h4 style="color: #d14d72; border-bottom: 2px solid #F4A7B9; padding-bottom: 5px;">🌸 ${matchedCourseKey || courseName} 課程介紹</h4>`;
    if (courseDesc.includes('http')) {
      courseHtml += `<img src="${courseDesc}" referrerpolicy="no-referrer" style="width:100%; border-radius:12px; margin-bottom: 15px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">`;
    } else {
      courseHtml += `<p style="line-height: 1.8; color: #555; margin-bottom: 20px; white-space: pre-wrap;">${courseDesc}</p>`;
    }

    // --- 2. 老師簡介區塊 (保留您原本的邏輯) ---
    const matchedTeachers = globalSettings.teachers.filter(t => teacherName.includes(t.name));
    let teacherHtml = "";
    if (matchedTeachers.length > 0) {
      matchedTeachers.forEach(teacher => {
        teacherHtml += `
                    <h4 style="color: #d14d72; border-bottom: 2px solid #F4A7B9; padding-bottom: 5px; margin-top: 25px;">👤 ${teacher.name} 老師簡介</h4>
                    <div class="teacher-card-container" onclick="this.classList.toggle('flipped')" style="margin: 10px auto 25px;">
                        <span style="color: #bababa; font-size: 0.85em; display: block; margin-bottom: 8px;">💡 點擊照片可翻看資歷</span>
                        <div class="teacher-card-inner">
                            <div class="teacher-card-front">
                                <img src="${teacher.url}" referrerpolicy="no-referrer" style="width: 100%; height: 100%; object-fit: cover; border-radius: 15px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
                            </div>
                            <div class="teacher-card-back" style="background: #FFF5F7; border: 2px solid #F4A7B9; border-radius: 15px; padding: 20px; display: flex; flex-direction: column; align-items: flex-start; box-sizing: border-box;">
                                <div style="color: #d14d72; font-weight: bold; margin-bottom: 10px; border-bottom: 1px solid #F4A7B9; width: 100%; padding-bottom: 5px;">資歷與專長</div>
                                <div style="font-size: 1rem; line-height: 1.6; text-align: left; color: #555; white-space: pre-wrap; overflow-y: auto; width: 100%; flex: 1;">${teacher.intro || "老師介紹更新中..."}</div>
                            </div>
                        </div>
                    </div>`;
      });
    } else {
      teacherHtml = `
                <h4 style="color: #d14d72; border-bottom: 2px solid #F4A7B9; padding-bottom: 5px; margin-top: 25px;">👤 師資介紹</h4>
                <p style="color: #999; font-style: italic;">${teacherName} 老師簡介尚在更新中</p>`;
    }

    body.innerHTML = courseHtml + teacherHtml;
    overlay.style.display = 'block';
    setTimeout(() => { drawer.classList.add('open'); }, 10);
  }, 400); // 等待 0.4 秒翻轉動畫進行
}

/**
 * 初始化教室簡介列表
 */
function initVenueList() {
  const introArray = globalSettings.venueIntrosArray || [];
  let html = "";

  if (introArray.length === 0) {
    html = '<p style="text-align:center; color:#999;">目前尚無教室資訊</p>';
  } else {
    introArray.forEach(item => {
      html += `
        <div style="margin-bottom: 35px;">
          <h4 style="color: #d14d72; border-bottom: 2px solid #F4A7B9; padding-bottom: 8px; margin-bottom: 15px; font-size: 1.2em;">
            ${item.name}
          </h4>`;

      // --- 修正點：防呆判斷，確有圖片連結才渲染 img 標籤 ---
      if (item.pic && item.pic.trim() !== "") {
        html += `
          <div style="margin-bottom: 15px;">
            <img src="${item.pic}" 
                 referrerpolicy="no-referrer" 
                 style="width:100%; display:block; border-radius:15px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); object-fit: cover;"
                 onerror="this.style.display='none';"> 
          </div>`;
      }

      html += `<p style="line-height: 1.8; color: #444; white-space: pre-wrap; font-size: 0.95em;">${item.desc}</p>`;
      html += `</div>`;
    });
  }

  document.getElementById('drawerBody').innerHTML = html;
}



// 在你的 <script> 標籤內加入這一行即可
document.addEventListener("touchstart", function () { }, true);

/**
 * 點擊放大輸入框並填入課表內容
 */

function openExpandedCourse() {
  const container = document.getElementById('expandInputContainer');
  const contentBox = document.getElementById('expandCourseContent');
  const sourceTable = document.getElementById('schedule-content-past');

  if (!container || !contentBox || !sourceTable) return;

  document.body.appendChild(container);
  const overlay = getOrCreateExpandOverlay();
  overlay.classList.add('show');

  contentBox.innerHTML = sourceTable.innerHTML;
  container.classList.add('expanded');
  document.body.style.overflow = 'hidden';

  setTimeout(function () {
    container.style.animation = "expandFlipIn 0.4s cubic-bezier(0.25, 1, 0.5, 1) forwards";
    setTimeout(function () {
      container.style.animation = "none";
      container.style.transform = "translate(-50%, -50%) perspective(1000px) rotateX(0deg) scale(1)";
    }, 400);
  }, 20);
}

function closeExpandedCourse(event) {
  if (event) event.stopPropagation();

  const container = document.getElementById('expandInputContainer');
  const overlay = document.getElementById('expandSharedOverlay');
  if (overlay) overlay.classList.remove('show');
  if (container) {
    container.style.transform = "";
    container.style.animation = "expandFlipOut 0.3s cubic-bezier(0.25, 1, 0.5, 1) forwards";
    setTimeout(function () {
      container.classList.remove('expanded');
      container.style.animation = "";
      document.body.style.overflow = '';

      // ✨ 關鍵修復 2：動畫結束後，把它放回原本的包裝層裡面
      document.getElementById('singleCourseWrapper').appendChild(container);
    }, 350);
  }
}

/**
 * ✨ 全新仿造函數：點擊放大輸入框並填入期課課表內容
 * （與原功能 100% 獨立，純粹處理複製 HTML 與 3D 動播，無添加任何無關功能）
 */
function openQueryCourse() {
  const container = document.getElementById('queryInputContainer');
  const contentBox = document.getElementById('queryCourseContent');
  const sourceTable = document.getElementById('schedule-content');

  if (!container || !contentBox || !sourceTable) return;

  document.body.appendChild(container);
  const overlay = getOrCreateExpandOverlay();
  overlay.classList.add('show');

  contentBox.innerHTML = sourceTable.innerHTML;
  container.classList.add('expanded');
  document.body.style.overflow = 'hidden';

  setTimeout(function () {
    container.style.animation = "expandFlipIn 0.4s cubic-bezier(0.25, 1, 0.5, 1) forwards";
    setTimeout(function () {
      container.style.animation = "none";
      container.style.transform = "translate(-50%, -50%) perspective(1000px) rotateX(0deg) scale(1)";
    }, 400);
  }, 20);
}

function closeQueryCourse(event) {
  if (event) event.stopPropagation();
  const overlay = document.getElementById('expandSharedOverlay');
  if (overlay) overlay.classList.remove('show');
  const container = document.getElementById('queryInputContainer');

  if (container) {
    container.style.transform = "";
    container.style.animation = "expandFlipOut 0.3s cubic-bezier(0.25, 1, 0.5, 1) forwards";
    setTimeout(function () {
      container.classList.remove('expanded');
      container.style.animation = "";
      document.body.style.overflow = '';

      document.getElementById('queryCourseWrapper').appendChild(container);

    }, 350);
  }
}
// 1. 控制自製下拉選單的開關切換
function toggleCustomDropdown(containerId) {
  const container = document.getElementById(containerId);
  const menu = container.querySelector('.wd-dropdown-menu');

  // 偵測是否為手機版（或者是當下半部沒內容、高度過矮時）
  const isShortLayout = document.body.clientHeight < 600 || !document.getElementById('introDisplayArea');

  if (isShortLayout) {
    // 💡 方案 A：如果版面太矮，直接套用你原本最厲害的 expanded 滿版防蓋機制！
    container.classList.toggle('expanded');
    if (container.classList.contains('expanded')) {
      document.body.style.overflow = 'hidden'; // 防止底層捲動
    } else {
      document.body.style.overflow = '';
    }
  } else {
    // 💡 方案 B：版面高度夠大時，維持原本優雅的就地向下展開
    container.classList.toggle('open');
  }
}

// 2. 當後端撈完資料填入真實 select 後，呼叫此函式將選項複製一份到美化選單中
/**
 * ✨ 通用型：自製下拉選單生成器
 * @param {string} realSelectId 真實 select 的 ID
 * @param {string} containerId 美化選單容器的 ID
 * @param {string} menuId 美化選單清單(ul) 的 ID
 * @param {string} defaultText 預設提示文字（如果真實 select 沒有選中有效值時顯示）
 * @param {function} customLogic 可選：額外的自訂邏輯，在選單點擊後執行
 */
function buildCustomDropdown(realSelectId, containerId, menuId, defaultText, customLogic = null) {
  const realSelect = document.getElementById(realSelectId);
  const customMenu = document.getElementById(menuId);
  const triggerText = document.querySelector(`#${containerId} .selected-text`);

  if (!realSelect || !customMenu || !triggerText) return;

  // A. 清空舊有的自製清單
  customMenu.innerHTML = "";

  // B. 根據真實 select 的當前選取值，初始化觸發框的文字
  const selectedOpt = realSelect.options[realSelect.selectedIndex];
  triggerText.innerText = (selectedOpt && selectedOpt.value !== "") ? selectedOpt.text : defaultText;

  // C. 撈取真實 select 裡面的所有 options 進行複製
  Array.from(realSelect.options).forEach(opt => {
    // 根據你原本的邏輯，多數選單會跳過 value === "" 的選項
    // 但因為有些選單原本沒有特別過濾空值，這邊我們用 `!opt.text.includes("--")` 或 `opt.value !== ""` 來過濾預設提示項
    if (opt.value === "" && realSelectId !== 'roomSelect' && realSelectId !== 'durationSelect') return;

    // 如果是教室跟時數，你原本的寫法會把所有的 option 印出來，所以特別繞開過濾
    if (opt.value === "" && (realSelectId === 'roomSelect' || realSelectId === 'durationSelect')) return;

    const li = document.createElement('li');
    li.className = 'wd-dropdown-item';
    li.innerText = opt.text;

    if (opt.disabled) {
      li.classList.add('disabled');
    } else {
      // 綁定點擊選項事件
      li.onclick = function () {
        // 1. 更新美化觸發框的顯示文字
        triggerText.innerText = opt.text;

        // 2. 同步選取真實的 select 值
        realSelect.value = opt.value;

        // 3. 觸發真實選單綁定的連動事件 (例如 onChange)
        realSelect.dispatchEvent(new Event('change'));

        // 4. 收起美化選單
        const container = document.getElementById(containerId);
        if (container.classList.contains('open')) {
          container.classList.remove('open');
        } else if (container.classList.contains('expanded')) {
          container.classList.remove('expanded');
          document.body.style.overflow = ''; // 放開鎖定
        }

        // 5. 執行額外的自訂邏輯 (如果有傳入)
        if (customLogic && typeof customLogic === 'function') {
          customLogic();
        }
      };
    }
    customMenu.appendChild(li);
  });
}

/**
 * 自動判斷裝置並開啟內建地圖 App
 */

function openDeviceMap(event) {
  // 阻止預設行為
  if (event) event.preventDefault();

  // 1. 請在這裡輸入您教室的「完整地址」或「Google 地圖地標名稱」
  var address = "新竹市東大路二段685號"; // 填入您的實際地址

  // 編碼成網頁安全字元
  var encodedAddress = encodeURIComponent(address);

  // 2. 判斷是否為 iOS 裝置 (iPhone / iPad / iPod)
  var isAppleDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

  // 3. 判斷是否為行動裝置 (Android 或 iOS)
  var isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

  if (isAppleDevice && isMobile) {
    // 蘋果手機/平板：使用 maps:// 強制喚起 Apple Maps App
    window.top.location.href = "https://maps.apple.com/?q=" + encodedAddress;
  } else if (isMobile) {
    // 安卓手機：使用 geo: 語法喚起 Google Maps App
    window.location.href = "https://www.google.com/maps/search/?api=1&query=" + encodedAddress;
  } else {
    // 💻 電腦桌機版 (Windows / Mac)：
    // 必須使用 window.open 並加上 '_blank'，強制在瀏覽器「新分頁」打開 Google 地圖
    // 這樣可以完全跳出 GAS 的 iframe 框架限制，徹底解決「拒絕連線」的問題！
    window.open("https://www.google.com/maps/search/?api=1&query=" + encodedAddress, "_blank");
  }
}

// 💡 優化：切換 AI 視窗，並在關閉時徹底清空對話與記憶
function toggleAIChat() {
  var chatBox = document.getElementById('ai-chat-box');
  var msgContainer = document.getElementById('ai-messages');
  if (!chatBox) return;

  // 切換 active 類別（控制先前做好的淡入淡出動畫）
  chatBox.classList.toggle('active');

  // 🎯 核心功能：檢查點擊後，視窗究竟是「打開」還是「關閉」
  if (!chatBox.classList.contains('active')) {
    // ───────── 【當視窗被關閉時執行徹底清空】 ─────────
    console.log("🧹 AI 視窗已關閉，正在啟動記憶與畫面清空程序...");

    // 1. 清空前端畫面上的所有對話泡泡，並回復初始歡迎詞
    if (msgContainer) {
      msgContainer.innerHTML = `
        <div style="margin-bottom: 8px; color: #888;">
          <span style="background: white; padding: 6px 10px; border-radius: 10px; display: inline-block; border: 1px solid #eee;">
            哈囉！我是您的小助理，有任何課程或預約問題都可以問我唷！
          </span>
        </div>
      `;
    }

    // 2. 徹底洗牌全域歷史紀錄陣列，讓 AI 大腦完全忘記剛才的上下文
    if (typeof aiChatHistory !== 'undefined') {
      aiChatHistory = [];
    }
  }
}
function fetchTomorrowWeather() {
  //console.log("=== 🔍 天氣功能啟動（中文結構觀測 LOG 版） ===");

  // 1. 計算明天日期
  var today = new Date();
  var tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  var year = tomorrow.getFullYear();
  var month = String(tomorrow.getMonth() + 1).padStart(2, '0');
  var date = String(tomorrow.getDate()).padStart(2, '0');
  var tomorrowString = year + "-" + month + "-" + date;

  var daysOfWeek = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"];
  var tomorrowDayName = daysOfWeek[tomorrow.getDay()];

  //console.log("➔ 📅 [追蹤 1] 目標比對的明天日期字串是:", tomorrowString);

  // 預設安全墊底值
  aiTomorrowWeatherText = "【教室所在地：新竹市北區 官方即時氣象預報】\n" +
    "明日日期與時間：" + tomorrowString + " (" + tomorrowDayName + ")\n" +
    "明日天氣狀態：多雲到晴，降雨機率約 20% \n" +
    "溫馨提示：非常適合出門運動舞蹈唷！";

  var apiUrl = "https://opendata.cwa.gov.tw/api/v1/rest/datastore/F-D0047-055?Authorization=rdec-key-123-45678-011121314&format=JSON&elementName=PoP12h,Wx";

  fetch(apiUrl)
    .then(function (response) {
      return response.json();
    })
    .then(function (data) {
      try {
        var locationsArray = data.records.Locations[0].Location;
        var northDistrictData = locationsArray.find(function (item) {
          return item.LocationName === "北區";
        });

        if (!northDistrictData) {
          console.error("❌ 錯誤：找不到北區");
          return;
        }

        var weatherElements = northDistrictData.WeatherElement;

        // 💡 依據上一張截圖的重大發現，改用中文「天氣現象」與「12小時降雨機率」進行精準對齊
        var wxElement = weatherElements.find(function (e) { return e.ElementName === "天氣現象"; });
        var popElement = weatherElements.find(function (e) { return e.ElementName === "12小時降雨機率"; });

        if (!wxElement || !popElement) {
          console.error("❌ 錯誤：雖然改用中文名稱，但在陣列中依然對不到『天氣現象』或『12小時降雨機率』！");
          return;
        }

        // 嘗試用明天日期去篩選
        var tomorrowWxObj = wxElement.Time.find(function (t) { return t.StartTime.includes(tomorrowString); });
        var tomorrowPopObj = popElement.Time.find(function (t) { return t.StartTime.includes(tomorrowString); });


        // 安全順位替代
        if (!tomorrowWxObj) { console.warn("⚠️ 提示：未精準對到明天日期，改拿 Wx 第一筆"); tomorrowWxObj = wxElement.Time[0]; }
        if (!tomorrowPopObj) { console.warn("⚠️ 提示：未精準對到明天日期，改拿 PoP 第一筆"); tomorrowPopObj = popElement.Time[0]; }

        var finalWx = "多雲到晴";
        var finalPop = "20";

        // 動態提取最內層第一個屬性的值，並把物件所有 Key 印出來看
        if (tomorrowWxObj && tomorrowWxObj.ElementValue && tomorrowWxObj.ElementValue[0]) {
          var evObj = tomorrowWxObj.ElementValue[0];
          var firstKey = Object.keys(evObj)[0];
          if (firstKey) finalWx = evObj[firstKey];
        }

        if (tomorrowPopObj && tomorrowPopObj.ElementValue && tomorrowPopObj.ElementValue[0]) {
          var evObj = tomorrowPopObj.ElementValue[0];
          var firstKey = Object.keys(evObj)[0];
          if (firstKey) finalPop = evObj[firstKey];
        }

        // 成功組裝
        aiTomorrowWeatherText = "【教室所在地：新竹市北區 官方即時氣象預報】\n" +
          "明日日期與時間：" + tomorrowString + " (" + tomorrowDayName + ")\n" +
          "明日天氣狀態：" + finalWx + "\n" +
          "明日降雨機率：" + finalPop + "% \n" +
          "（資料來源：中央氣象署即時同步）";

        //console.log("✅ [觀測成功] 拼裝出的常識大禮包文字為:\n", aiTomorrowWeatherText);
      } catch (innerErr) {
        console.error("❌ 觀測版內部執行崩潰，原因為:", innerErr);
      }
    })
    .catch(function (error) {
      console.error("❌ 網絡層級 fetch 核心崩潰:", error);
    });
}

// 💡 網頁初始化載入時，自動執行一次抓天氣
window.addEventListener('DOMContentLoaded', function () {
  fetchTomorrowWeather();
  // 動態載入外部 SVG 並啟動保護衣包裝機
  fetch('weidong0.svg')
    .then(response => response.text())
    .then(svgData => {
      document.getElementById('logo-container').innerHTML = svgData;

      // ==========================================
      // ✨ SVG 碎片保護衣：自動化包裝腳本 ✨
      // ==========================================
      // 抓取所有的路徑
      const layer0Paths = Array.from(document.querySelectorAll('#layer-MC0 path'));
      const layer1Paths = Array.from(document.querySelectorAll('#layer-MC1 path'));

      // 按照我們之前的邏輯，切分成 10 組
      const groups = [
        layer0Paths.slice(0, 9),
        layer0Paths.slice(9, 18),
        layer0Paths.slice(18),
        layer1Paths
      ];

      // 10組呼吸動畫的週期 (質數秒，製造隨機交錯感)
      const breatheDurations = [4.3, 5.7, 3.8, 6.1];

      // 開始幫每個碎片穿衣服
      groups.forEach((groupPaths, index) => {
        let dropDelay = index * 0.6;
        let breatheDelay = dropDelay + 4.8;

        groupPaths.forEach(path => {
          // 1. 創造一件全新的 <g> 保護衣
          const wrapper = document.createElementNS("http://www.w3.org/2000/svg", "g");
          wrapper.classList.add('anim-wrapper'); // 加上 CSS 類別
          let randomX = Math.floor(Math.random() * 301) - 150;
          let randomY = Math.floor(Math.random() * 301) - 150;
          let randomAngle = Math.floor(Math.random() * 90) - 45;
          let randomRX = Math.floor(Math.random() * 361) - 180; // X軸 3D 翻轉 -180 到 180度
          let randomRY = Math.floor(Math.random() * 361) - 180; // Y軸 3D 翻轉 -180 到 180度
          let dropDuration = 2;
          if (index === 3) {
            dropDuration = 1.3;
            dropDelay = index * 0.8;
            randomRX = 0;
            randomRY = 0;
          } else {
            randomAngle = 0;
          }
          wrapper.style.setProperty('--random-x', `${randomX}px`);
          wrapper.style.setProperty('--random-y', `${randomY}px`);
          wrapper.style.setProperty('--random-rot', `${randomAngle}deg`);
          wrapper.style.setProperty('--random-rx', `${randomRX}deg`);
          wrapper.style.setProperty('--random-ry', `${randomRY}deg`);

          // 2. 獨立寫入這件保護衣的「動畫速度」與「延遲時間」

          wrapper.style.animationDuration = `${dropDuration}s, ${breatheDurations[index]}s`;
          wrapper.style.animationDelay = `${dropDelay}s, ${breatheDelay}s`;

          // 3. 把保護衣穿到 <path> 外面！
          path.parentNode.insertBefore(wrapper, path);
          wrapper.appendChild(path);
        });
      });
    })
    .catch(error => console.error('無法載入 SVG:', error));
});

function sendAIMessage() {
  aiStime = performance.now();
  console.log(`進AI呼叫。`);
  var inputEl = document.getElementById('ai-input');
  var msgContainer = document.getElementById('ai-messages');
  var userText = inputEl.value.trim();

  if (!userText) return;

  // 1. 渲染使用者的話
  msgContainer.innerHTML += `<div style="margin-bottom: 8px; text-align: right;"><span style="background: #E87A90; color: white; padding: 6px 10px; border-radius: 16px 16px 2px 16px; display: inline-block; max-width: 80%; text-align: left;">${userText}</span></div>`;
  inputEl.value = "";
  msgContainer.scrollTop = msgContainer.scrollHeight;

  var cleanInput = userText.replace(/[\s\s,，.。!！?？]/g, "");


  if (cleanInput.includes("糖香料")) {
    appendAIResponse("以及一切美好的事物！");
    return;
  }
  if (cleanInput.includes("一天又平安的過去了")) {
    appendAIResponse("感謝飛天小女警的努力！");
    return;
  }
  if (cleanInput.includes("謝謝你9527")) {
    appendAIResponse("不客氣！");
    document.getElementById('qrcode-widget').classList.toggle('show');
    return;
  }
  if (cleanInput.includes("howdoyouturnthison")) {
    appendAIResponse("Got it！");
    document.getElementById("multiReg").style.display = "";
    return;
  }

  var phoneMatch = userText.match(/09\d{8}/);
  aiChatHistory.push({ role: "user", content: userText });
  // 2. 顯示思考中動畫
  var loadingId = "ai-loading-" + Date.now();
  if (!phoneMatch) msgContainer.innerHTML += `<div id="${loadingId}" style="margin-bottom: 8px; color: #888;"><span style="background: white; padding: 6px 10px; border-radius: 10px; display: inline-block; border: 1px solid #eee;">思考中... ⏳</span></div>`;
  msgContainer.scrollTop = msgContainer.scrollHeight;

  // 3. 檢查是否有 10 碼電話


  if (phoneMatch) {
    var userPhone = phoneMatch[0];

    var isAskingReservation = userText.includes("預約") || userText.includes("場地") || userText.includes("教室") || userText.includes("空間") || userText.includes("租借");

    if (isAskingReservation) {
      // ───────── 方案 A：【學員查特定電話的「場地空間預約」紀錄】 ─────────
      console.log("🎯 偵測到關鍵字，準備呼叫：queryRoomReservation");
      appendAIResponse("請直接到教室預約 > 教室預約查詢，輸入電話查詢");
      return;

      // ───────── 方案 A：【場地空間預約分流 - 精準字串對接完全體】 ─────────
      callGasApi("queryRoomReservation", [userPhone])
        .then(function (res) {
          var loadingEl = document.getElementById(loadingId);
          if (loadingEl) loadingEl.remove();

          try {
            var aiContext = "";

            // 💡 修正：後端傳回的是純字串，直接判定是否為空、或包含「查無」字眼
            if (!res || typeof res !== "string" || res.trim() === "" || res.includes("查無")) {
              aiContext = `【系統通知：這支電話目前在試算表中『完全查無場地預約紀錄』。請溫柔告知學員目前系統中還沒有這支手機的空間租借或預約登記唷！】`;
            } else {
              // 💡 後端已經幫忙組好漂亮的條列字串了，直接整包塞給 AI，並強迫它遵照格式吐出
              aiContext = `【系統通知：這支電話『已成功查到場地空間預約紀錄』！以下為後端資料庫撈出的真實預約明細：

${res}

請立刻執行核心守則，將上方每一筆預約的教室、日期與時間用溫柔且漂亮的排版呈現給學員，千萬不要漏掉任何一筆！】`;
            }

            askGeminiSmartHub(userText, aiContext);
          } catch (e) {
            if (typeof appendAIResponse === "function") {
              appendAIResponse("處理預約資料時發生錯誤，請稍後再試。");
            }
            console.error("預約解析錯誤:", e);
          }
        })
        .catch(function (err) {
          // 💡 防呆：發生網路或系統錯誤時，也要記得把 loading 動畫拿掉
          var loadingEl = document.getElementById(loadingId);
          if (loadingEl) loadingEl.remove();

          if (typeof appendAIResponse === "function") {
            appendAIResponse("❌ 查詢預約資料失敗，連線發生異常，請稍後再試。");
          }
          console.error("API 查詢錯誤:", err.message || err);
        });

    } else {
      // ───────── 方案 B：【學員查特定電話的「課程報名」紀錄】 ─────────
      console.log("🎯 預設意圖，準備呼叫：queryRegistration");
      appendAIResponse("請直接到課程報名 > 報名與繳費查詢，輸入電話查詢");
      return;


      callGasApi("queryRegistration", [userPhone])
        .then(function (res) {
          var loadingEl = document.getElementById(loadingId);
          if (loadingEl) loadingEl.remove();

          try {
            var aiContext = "";

            // 💡 判斷是否查無紀錄 (防呆空陣列、空物件、或是特定字串)
            if (!res || JSON.stringify(res) === "{}" || JSON.stringify(res) === "[]" || res === "查無紀錄。") {
              aiContext = `【系統通知：這支電話目前在試算表中『完全查無報名紀錄』。請立刻執行核心守則第 2 條的查無紀錄罐頭回覆！】`;
            }
            // 💡 判斷如果是「多筆資料」（陣列）
            else if (Array.isArray(res)) {
              // 將多筆 JSON 資料在前端先精煉成乾淨的文字清單
              var recordList = res.map(function (item, index) {
                return `紀錄 ${index + 1}：
      - 課程名稱：${item.course || item.課程名稱 || "未提供"}
      - 上課日期/時間：${item.date || item.上課日期 || "未提供"}
      - 繳費對帳狀態：${item.status || item.對帳狀態 || item.狀態 || "確認中"}`;
              }).join("\n\n");

              aiContext = `【系統通知：這支電話『已成功查到多筆課程報名紀錄』！
      請務必將以下所有紀錄【完整、逐筆】溫柔條列展示給顧客，不要漏掉任何一筆：

      ${recordList}

      請立刻根據上述精煉後的資料進行親切的回覆！】`;
              console.log(`手機查詢！！！${recordList}`);
            }
            // 💡 預防萬一：如果是單一物件舊格式
            else {
              aiContext = `【系統通知：這支電話『已成功查到課程報名紀錄』！以下為真實資料：\n${JSON.stringify(res)}\n請立刻執行核心守則第 2 條，將裡面的課程名稱、上課日期與對帳狀態溫柔條列出來！】`;
            }

            askGeminiSmartHub(userText, aiContext);
          } catch (e) {
            if (typeof appendAIResponse === "function") {
              appendAIResponse("處理報名資料時發生錯誤，請稍後再試。");
            }
            console.error(e);
          }
        })
        .catch(function (err) {
          // 💡 防呆：發生網路或系統錯誤時，也要記得把 loading 動畫拿掉
          var loadingEl = document.getElementById(loadingId);
          if (loadingEl) loadingEl.remove();

          if (typeof appendAIResponse === "function") {
            appendAIResponse("❌ 查詢報名紀錄失敗，連線發生異常，請稍後再試。");
          }
          console.error("API 查詢錯誤:", err.message || err);
        });


    }

  } else {
    // ───────── 【智慧大腦模式】 ─────────
    // 💡 修正：加入 try-catch 保護，防止 DOM 或全域變數未載入完成時程式崩潰卡死
    try {
      var pageClone = document.body.cloneNode(true);

      // 1. 暴力刪除對 AI 理解「資料結構」毫無幫助的標籤
      var uselessTags = pageClone.querySelectorAll('script, style, svg, iframe, video, #ai-chat-widget, .loader');
      uselessTags.forEach(function (el) { el.remove(); });

      // 2. 拔除所有「皮肉 (排版與樣式)」，只留下「骨架 (資料與結構)」
      var allElements = pageClone.getElementsByTagName('*');
      for (var i = 0; i < allElements.length; i++) {
        var el = allElements[i];
        el.removeAttribute('class'); // 刪除 class
        el.removeAttribute('style'); // 刪除 style
        el.removeAttribute('onclick'); // 刪除 onclick
        el.removeAttribute('oninput'); // 刪除 oninput
        // 💡 刻意保留：id, name, type, placeholder, value 等「說明書」必備屬性
      }

      // 3. 壓縮空白換行，進一步縮減體積
      var cleanHtmlStructure = pageClone.innerHTML.replace(/\s+/g, ' ').trim();
      console.log("📦 目前清理後的 HTML 字元長度為: " + cleanHtmlStructure.length);

      var teachersDataText = "暫無師資資料";
      if (typeof globalSettings !== 'undefined' && globalSettings.teachers) {
        teachersDataText = JSON.stringify(globalSettings.teachers);
      }

      var brainContext = "【💡 現實世界明天天氣預報資訊】:\n" + aiTomorrowWeatherText +
        "\n\n【💡 微動身活場館生活常見問題 FAQ】:\n" + JSON.stringify(aiStoreConfig) +
        "\n\n【微動身活期課課表與名額(未來，如果顧客強調期課課程以這筆資料為主，沒有就說課表還沒出來) name:課程名稱,dates:課程日期如果要計算剩餘課堂數要用天數來計算,room:上課教室,pricePerClass:期課每堂價格,maxCapacity:最大人數,remaining:剩餘人數名額】：\n" + JSON.stringify(allCourseData) +
        "\n\n【當顧客強調期課課程且schedule-body的內容是最新課表準備中，敬請期待！就照此回答】" +
        "\n\n【微動身活當月開課課表與名額(現在如果顧客只問課程，就以這筆資料為主) name:課程名稱,dates:課程日期如果要計算剩餘課堂數要用天數來計算,room:上課教室,pricePerClass:每堂價格,maxCapacity:最大人數,remaining:剩餘人數名額】：\n" + JSON.stringify(allCourseDataPast) +
        "\n\n【回答當月開課課表與名額時，把名額多考慮這份單堂報名資料，只在當月課程考慮，期課課程不考慮】：\n" + JSON.stringify(globalSingleBookedMap) +
        "\n\n【各課程的詳細介紹特色】：\n" + JSON.stringify(globalSettings.courseIntros) +
        "\n\n【教室的預約狀況】：\n" + JSON.stringify(allRoomBookState) +
        "\n\n【官方全體師資團隊詳細簡介資料庫】:\n" + teachersDataText +
        "\n\n【目前網頁的 HTML 介面結構】:\n" + cleanHtmlStructure;

      // 順利打包完成後才移除第一個 Loading
      var loadingEl = document.getElementById(loadingId);
      if (loadingEl) loadingEl.remove();

      askGeminiSmartHub(userText, brainContext);
    } catch (e) {
      // 💡 例外安全處理：萬一打包出錯，立刻關閉 Loading 條並提示使用者
      var loadingEl = document.getElementById(loadingId);
      if (loadingEl) loadingEl.remove();
      appendAIResponse("系統資料載入中，請稍候再試或重新整理網頁唷！");
      console.error(e);
    }
  }
}

/**
 * 全智慧中心：負責把常識與問題噴給後端，並就地精準渲染
 */
function askGeminiSmartHub(userQuery, dataContext) {
  var msgContainer = document.getElementById('ai-messages');
  var geminiLoadingId = "ai-loading-smart-" + Date.now();

  msgContainer.innerHTML += `<div id="${geminiLoadingId}" style="margin-bottom: 8px; color: #888;"><span style="background: white; padding: 6px 10px; border-radius: 10px; display: inline-block; border: 1px solid #eee;">智慧小助手思考中... 🧠</span></div>`;
  msgContainer.scrollTop = msgContainer.scrollHeight;
  var historyConversationText = aiChatHistory.map(function (chat) {
    return (chat.role === "user" ? "【顧客】: " : "【秘書(你)】: ") + chat.content;
  }).join("\n");


  var finalPrompt = `你是「微動身活」共享舞蹈空間的智慧型全功能 AI 櫃檯秘書。請根據下方提供的【即時館場資料庫】和【顧客提問】進行回答。

【即時館場資料庫內容】：
${dataContext}

【🚨 櫃檯秘書執行核心守則（最高權限）】：
1. 隱私與權限：顧客已經在前端通過了安全驗證。身為 AI 櫃檯秘書，你【絕對擁有完整權限】閱讀並告知顧客上方資料庫內的內容！嚴禁回答「我沒有權限查詢」、「無法直接查詢環境」、「請撥打專線」等拒絕罐頭訊息。
2. 報名與預約資料處理：基於個資關係，AI助手不提供報名與預約紀錄的查詢，請顧客直接用網站功能查詢。
3. 語氣與排版：請維持一貫溫柔、親切助理口吻。善用換行與精簡的條列式排版，讓顧客一眼就能看懂答案。
4. 答案盡量精簡，不要有多餘的贅詞或句子。
5. 絕對核心守則：請務必將回答完整說完，確保每一個句子與段落都有完整的結尾標點符號，絕對不可話說一半中斷。

【前情提對話歷史紀錄】：
${historyConversationText}

【顧客目前實際提問】：
${userQuery}`;

  callGasApi("askAIAssistant", [finalPrompt])
    .then(function (aiResponse) {
      // 💡 收到回應立刻解鎖
      var geminiLoadingEl = document.getElementById(geminiLoadingId);
      if (geminiLoadingEl) geminiLoadingEl.remove();

      var finalResponse = aiResponse || "小助手剛剛不小心發呆了，可以請您再說一次嗎？";
      aiChatHistory.push({ role: "model", content: finalResponse });
      appendAIResponse(finalResponse);
    })
    .catch(function (err) {
      // 💡 呼叫後端（Gemini）失敗或斷線時立刻解鎖
      var geminiLoadingEl = document.getElementById(geminiLoadingId);
      if (geminiLoadingEl) geminiLoadingEl.remove();

      // 將錯誤印在 Console 方便除錯
      console.error("❌ AI 請求失敗:", err.message || err);
      appendAIResponse("小助手頭有點暈，請再跟我說一次。");
    });
}

/**
 * 智慧上下文傳送器（精準渲染版）
 */
function askGeminiWithContext(userQuery, dataContext, mode) {
  var msgContainer = document.getElementById('ai-messages'); // 💡 確保函式內有重新抓取對話框
  var geminiLoadingId = "ai-loading-gemini-" + Date.now();

  msgContainer.innerHTML += `<div id="${geminiLoadingId}" style="margin-bottom: 8px; color: #888;"><span style="background: white; padding: 6px 10px; border-radius: 10px; display: inline-block; border: 1px solid #eee;">智慧助理分析中... 🧠</span></div>`;
  msgContainer.scrollTop = msgContainer.scrollHeight;

  var systemRole = "請以「微動身活」親切櫃檯小助手的溫柔口吻回答顧客。如果資料庫顯示\"查無紀錄。\"或找不到內容，請委婉告知。";
  if (mode === "顧問模式") {
    systemRole = "你現在是「微動身活」的專業運動課程顧問。請根據上方提供的【課程詳細介紹】與【名額狀態】，分析顧客的需求（例如：新手、想燃脂、想舒緩放鬆等），用熱情、親切且專業的口吻推薦最適合他的 1~2 門課程，並說明原因與目前的剩餘名額，引導他報名。";
  }

  var finalPrompt = `【系統即時提供給你的館場資料內容】：\n${dataContext}\n\n【顧客目前實際提問】：\n${userQuery}\n\n${systemRole}`;

  callGasApi("askAIAssistant", [finalPrompt])
    .then(function (aiResponse) {
      // 💡 收到回應，立刻解除第二次的轉圈圈
      var geminiLoadingEl = document.getElementById(geminiLoadingId);
      if (geminiLoadingEl) geminiLoadingEl.remove();

      // 直接就地渲染，百分之百不會被其他函式變數卡到！
      msgContainer.innerHTML += `<div style="margin-bottom: 8px; color: #333;"><span style="background: white; padding: 6px 10px; border-radius: 10px; display: inline-block; border: 1px solid #f9d5dc; line-height: 1.5; text-align: left; max-width: 80%;">${aiResponse}</span></div>`;
      msgContainer.scrollTop = msgContainer.scrollHeight;
    })
    .catch(function (err) {
      // 💡 發生錯誤或斷線時，也要確實拿掉轉圈圈動畫
      var geminiLoadingEl = document.getElementById(geminiLoadingId);
      if (geminiLoadingEl) geminiLoadingEl.remove();

      // 可以在控制台印出錯誤，方便除錯
      console.error("❌ AI 請求失敗:", err.message || err);
      appendAIResponse("小助手思緒有點混亂，請稍後再試。");
    });
}

/**
 * 輔助：常規快速渲染（確保作用域安全）
 */
// 💡 升級版：支援格式加工的 AI 回應渲染器
function appendAIResponse(text) {
  var msgContainer = document.getElementById('ai-messages');
  aiEtime = performance.now();
  let costTime = ((aiEtime - aiStime) / 1000).toFixed(3);
  if (msgContainer) {
    // 1. 自動將 AI 回傳的換行符號 \n 轉換成網頁的 <br> 標籤
    var processedText = text.replace(/\n/g, '<br>');

    // 2. [選配] 自動將 AI 經常用來強調的 **文字** 轉換成 <strong>粗體</strong>
    processedText = processedText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    // 3. 渲染出帶有呼吸感與立體陰影的對話泡泡
    msgContainer.innerHTML += `
      <div class="ai-bubble-wrapper" style="margin-bottom: 12px; color: #333; text-align: left; animation: fadeInUp 0.3s ease;">
        <span style="
          background: white; 
          padding: 10px 14px; 
          border-radius: 2px 16px 16px 16px; /* 💡 左上角特殊銳角，更有對話框質感 */
          display: inline-block; 
          border: 1px solid #f9d5dc; 
          line-height: 1.6; 
          max-width: 85%; 
          box-shadow: 0 2px 8px rgba(232, 122, 144, 0.05);
          font-size: 14px;
        ">
          ${processedText}
        </span>
      </div>
    `;
    msgContainer.scrollTop = msgContainer.scrollHeight;
  }
  console.log(`AI呼叫完成！！！${costTime} 秒`);
}

const GAS_API_URL = "https://script.google.com/macros/s/AKfycbzMsKpq2PiUuvvHF_lZhIRIA4KnRC553LFVFLcDPZqD1CArDjBtyjyZeu5kKeg31SM/exec";

/**
 * 取代 google.script.run 的統一 API 呼叫器
 * 💡 這裡使用 text/plain 的原因是為了避開瀏覽器嚴格的 CORS Preflight (OPTIONS) 限制，GAS 解析一樣會成功。
 */
function callGasApi(action, params = []) {
  return fetch(GAS_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "text/plain;charset=utf-8",
    },
    body: JSON.stringify({ action: action, params: params })
  })
    .then(response => response.json())
    .then(res => {
      if (res.status === "error") {
        throw new Error(res.message);
      }
      return res.data;
    });
}

// 開啟照片燈箱
function openLightbox(url) {
  const modal = document.getElementById('photoLightbox');
  const lightboxImg = document.getElementById('lightboxImg');

  lightboxImg.src = url; // 帶入點擊的照片網址
  modal.classList.add('show'); // 顯示彈窗
  document.body.style.overflow = 'hidden'; // 放大時鎖定網頁背景，防止底層畫面跟著滾動
}

// 關閉照片燈箱
function closeLightbox() {
  const modal = document.getElementById('photoLightbox');
  modal.classList.remove('show'); // 隱藏彈窗
  document.body.style.overflow = ''; // 恢復網頁背景滾動
}

document.addEventListener('click', function (event) {
  // 如果點擊到的元素，身上有 'photo-card' 這個 class，就執行放大
  if (event.target && event.target.classList.contains('photo-card')) {
    event.stopPropagation();
    openLightbox(event.target.src); // 直接抓圖片網址並打開燈箱
  }
});


// 1. 監聽滾動事件，動態偵測「當前啟用 Tab」裡的 INFOBOX
window.addEventListener('scroll', function () {
  // 🔥 關鍵修改 1：找出當前正在顯示的 Tab 區塊
  const activeTab = document.querySelector('.tab-content.active');
  if (!activeTab) return;

  // 🔥 關鍵修改 2：只抓取該 Tab 裡面的 info-box (會自動對應 ifb-course 或 ifb-room)
  const infoBox = activeTab.querySelector('.info-box');
  const stickyNav = document.getElementById('stickyQuickNav');
  const drawer = document.getElementById('quickMenuDrawer');
  const btn = document.getElementById('quickMenuBtn');

  // 如果找不到 INFOBOX 或 Bar，或者是電腦版，就不執行
  if (!infoBox || !stickyNav || window.innerWidth > 600) return;

  // 取得當前 INFOBOX 距離目前視窗頂部的位置
  const rect = infoBox.getBoundingClientRect();

  // 當 INFOBOX 的上緣碰到或超過螢幕頂端時 (小於等於 0)
  if (rect.top <= 0) {
    stickyNav.classList.add('show');
  } else {
    // 隱藏 Bar 並收起所有選單
    stickyNav.classList.remove('show');
    if (drawer) drawer.classList.remove('show');
    if (btn) btn.classList.remove('active');
  }
});

// 2. 核心邏輯：切換快速選單抽屜
function toggleQuickMenu() {
  const drawer = document.getElementById('quickMenuDrawer');
  const btn = document.getElementById('quickMenuBtn');
  const list = document.getElementById('quickMenuList');

  if (!drawer || !btn || !list) return;

  const isOpening = !drawer.classList.contains('show');

  if (isOpening) {
    list.innerHTML = '';

    // 🔥 關鍵修改 3：先鎖定「當前啟用」的 Tab
    const activeTab = document.querySelector('.tab-content.active');
    if (!activeTab) return;

    // 🔥 關鍵修改 4：只抓取該 Tab 裡面的 info-card-btn，過濾掉隱藏的
    const cards = activeTab.querySelectorAll('.info-card-btn');

    cards.forEach(card => {
      const span = card.querySelector('span');
      if (!span) return;

      const li = document.createElement('li');
      li.innerText = span.innerText;

      li.onclick = () => {
        toggleQuickMenu();
        setTimeout(() => {
          card.click();
          // 加上偏移，避免打開卡片時被上方的 Bar 蓋住
          const y = card.getBoundingClientRect().top + window.scrollY - 70;
          window.scrollTo({ top: y, behavior: 'smooth' });
        }, 320);
      };

      list.appendChild(li);
    });

    drawer.classList.add('show');
    btn.classList.add('active');
  } else {
    drawer.classList.remove('show');
    btn.classList.remove('active');
  }
}

// 👇 新增：快速導覽 BAR 專用的快速跳躍邏輯
function executeQuickJump(actionType) {
  // 檢查目前是否為「課程報名」分頁
  const isCourseTab = document.getElementById('courseTab').classList.contains('active');
  let targetElementId = '';

  if (isCourseTab) {
    if (actionType === 'primary') targetElementId = 'courseEnrollmentSystem'; // 報名
    if (actionType === 'query') targetElementId = 'querySystemContainer';     // 查詢
  } else {
    // 否則就是在「教室預約」分頁
    if (actionType === 'primary') targetElementId = 'roomEnrollmentSystem';   // 預約
    if (actionType === 'query') targetElementId = 'queryRoomContainer';       // 查詢
  }

  // 執行平滑捲動到該區塊
  if (targetElementId) {
    const targetElement = document.getElementById(targetElementId);
    if (targetElement) {
      targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
}

function getOrCreateExpandOverlay() {
  let overlay = document.getElementById('expandSharedOverlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'expandSharedOverlay';
    overlay.className = 'expand-overlay';
    // 點擊背景也能順便關閉
    overlay.onclick = function () {
      if (document.getElementById('expandInputContainer')?.classList.contains('expanded')) {
        closeExpandedCourse();
      }
      if (document.getElementById('queryInputContainer')?.classList.contains('expanded')) {
        closeQueryCourse();
      }
    };
    document.body.appendChild(overlay);
  }
  return overlay;
}

// 建立全域變數來記住目前的照片陣列
let globalNewsPhotos = [];

/**
 * 渲染最新活動的輪播圖區塊
 */
function renderNewsCarousel(photos) {
  const picBody = document.getElementById('news-body');
  if (!picBody) return;

  // 如果沒有資料，顯示預設提示
  if (!photos || photos.length === 0) {
    picBody.innerHTML = '<p style="color:#888; text-align:center; padding: 20px;">目前尚無最新活動，敬請期待！</p>';
    return;
  }

  // 將資料存入全域變數供點擊切換時使用
  globalNewsPhotos = photos;

  // 1. 生成上方的大圖 (預設顯示第 0 張，並綁定你原本的 openLightbox 燈箱功能)
  const mainImgHtml = `
    <div style="text-align: center; overflow: hidden; border-radius: 12px;">
      <img id="newsMainImg" class="news-carousel-main" 
           src="${photos[0]}" 
           onclick="openLightbox(this.src)">
    </div>
  `;

  // 2. 生成下方的縮圖列
  let thumbHtml = '<div class="news-thumbnails-container">';
  photos.forEach((url, index) => {
    // 第 0 張預設加上 'active' class
    const isActive = index === 0 ? 'active' : '';
    thumbHtml += `
      <img class="news-thumbnail ${isActive}" 
           src="${url}" 
           id="newsThumb_${index}"
           onclick="changeNewsMainImage(${index})">
    `;
  });
  thumbHtml += '</div>';

  // 將組合好的 HTML 塞入畫面
  picBody.innerHTML = mainImgHtml + thumbHtml;
}

/**
 * 點擊縮圖時切換上方大圖
 */
function changeNewsMainImage(index) {
  const mainImg = document.getElementById('newsMainImg');
  if (!mainImg) return;

  // 1. 為了滑順視覺，先讓大圖稍微變透明
  mainImg.style.opacity = '0.6';
  
  setTimeout(() => {
    // 瞬間替換圖片網址，並恢復不透明度
    mainImg.src = globalNewsPhotos[index];
    mainImg.style.opacity = '1';
  }, 150);

  // 2. 更新下方縮圖的框線狀態 (移除舊的，加上新的)
  const allThumbs = document.querySelectorAll('.news-thumbnail');
  allThumbs.forEach((thumb, i) => {
    if (i === index) {
      thumb.classList.add('active');
      // 🌟 神級 UX 體驗：如果縮圖超出畫面，自動把它滑動到中央
      thumb.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    } else {
      thumb.classList.remove('active');
    }
  });
}