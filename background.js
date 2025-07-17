importScripts('js/firebase-app-compat.js');
importScripts('js/firebase-database-compat.js');

const firebaseConfig = {
  apiKey: "AIzaSyBcEsFf7MhtJVGeLzIPRu1Rdt5t0iCXNDc",
  authDomain: "one-time-message-fa648.firebaseapp.com",
  databaseURL: "https://one-time-message-fa648-default-rtdb.firebaseio.com",
  projectId: "one-time-message-fa648",
  storageBucket: "one-time-message-fa648.appspot.com",
  messagingSenderId: "448671934037",
  appId: "1:448671934037:web:768e4c65281b5d219596dc",
  measurementId: "G-DKWXP0K3Y4"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();

let currentUser = null;
let unreadListener = null;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if(message.type === "setCurrentUser") {
    currentUser = message.user;
    startListeningUnread();
    sendResponse({received: true});
  }
});

let unreadListenerCallback = null;

function startListeningUnread() {
  if(unreadListener) unreadListener.off();

  unreadListener = db.ref("messages").on("value", snapshot => {
    const messages = snapshot.val() || {};
    let unreadCount = 0;
    for(let key in messages) {
      const msg = messages[key];
      if(msg.to === currentUser && !msg.read) {
        unreadCount++;
      }
    }

    chrome.action.setBadgeText({ text: unreadCount > 0 ? unreadCount.toString() : "" });
    chrome.action.setBadgeBackgroundColor({ color: "#FF0000" });
  });
}
