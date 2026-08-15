// PHẢN ỨNG. — background service worker
// Bấm icon trên thanh công cụ để mở phòng thí nghiệm ảo (bản deploy trên Netlify)
// trong một tab mới. Extension không đóng gói lab.html/three.min.js cục bộ nữa —
// mọi thứ luôn lấy từ bản mới nhất trên Netlify để tránh lệch phiên bản / thiếu file.

var APP_URL = 'https://sfes-lab.netlify.app/';

chrome.action.onClicked.addListener(function () {
  chrome.tabs.create({ url: APP_URL });
});
