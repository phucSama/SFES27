// PHẢN ỨNG. — background service worker
// 1) Bấm icon trên thanh công cụ để mở phòng thí nghiệm ảo (bản deploy trên Netlify)
//    trong một tab mới.
// 2) Chuột phải trên bất kỳ trang nào → "Mở bảng đen tại đây" để bật một cửa sổ
//    Bảng đen nổi ngay trên trang đó (content.js đảm nhiệm phần vẽ cửa sổ).
// Extension không đóng gói lab.html/three.min.js cục bộ — mọi thứ luôn lấy từ bản
// mới nhất trên Netlify để tránh lệch phiên bản / thiếu file.

var APP_URL = 'https://sfes-lab.netlify.app/';
var BLACKBOARD_MENU_ID = 'sfes-open-blackboard';

chrome.action.onClicked.addListener(function () {
  chrome.tabs.create({ url: APP_URL });
});

chrome.runtime.onInstalled.addListener(function () {
  chrome.contextMenus.create({
    id: BLACKBOARD_MENU_ID,
    title: '📝 Mở bảng đen tại đây',
    contexts: ['all']
  });
});

chrome.contextMenus.onClicked.addListener(function (info, tab) {
  if (info.menuItemId !== BLACKBOARD_MENU_ID || !tab || !tab.id) return;
  // Content script đã được inject sẵn trên mọi trang (content_scripts trong
  // manifest.json), nên chỉ cần gửi message — không cần quyền "scripting"/"activeTab".
  chrome.tabs.sendMessage(tab.id, { type: 'open-blackboard' }, function () {
    // Nuốt lỗi "Receiving end does not exist" cho các trang đặc biệt mà Chrome
    // không cho content script chạy (chrome://, Chrome Web Store, PDF viewer...).
    void chrome.runtime.lastError;
  });
});
