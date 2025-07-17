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

let currentUser = getOrCreateAnonUserName();
let selectedChatUser = null;

function getOrCreateAnonUserName() {
  let username = localStorage.getItem("anon_username");
  if (!username) {
    username = "anon_" + Math.random().toString(36).substr(2, 6);
    localStorage.setItem("anon_username", username);
  }
  return username;
}

// Background.js’ye currentUser bilgisini bildir
chrome.runtime.sendMessage({ type: "setCurrentUser", user: currentUser }, response => {
  console.log("Background'a currentUser gönderildi", response);
});

function setUserOnline() {
  const userRef = db.ref("users/" + currentUser);
  userRef.set({ online: true, timestamp: Date.now() });
  userRef.onDisconnect().remove();
}

function sendMessage(toUser, message) {
  const timestamp = Date.now();
  const newMsg = {
    from: currentUser,
    to: toUser,
    text: message,
    timestamp,
    read: false
  };
  db.ref("messages").push(newMsg);
}

function listenToMessages() {
  db.ref("messages").on("value", snapshot => {
    const messages = snapshot.val() || {};

    renderChatList(messages);

    if (selectedChatUser) {
      markMessagesAsRead(selectedChatUser);
      renderChatDetail(messages, selectedChatUser);
    }
  });
}

function renderChatList(messages) {
  const chatList = document.getElementById("chatList");
  chatList.innerHTML = "";

  const users = new Set();

  for (let key in messages) {
    const msg = messages[key];
    if (msg.from === currentUser) users.add(msg.to);
    if (msg.to === currentUser) users.add(msg.from);
  }

  users.forEach(user => {
    const div = document.createElement("div");
    div.className = "list-group-item list-group-item-action chatUser";
     div.href = "#";
    if (user === selectedChatUser) div.classList.add("active");
    div.innerText = user;
    div.onclick = () => {
      selectedChatUser = user;
      renderChatDetail(messages, user);
      markMessagesAsRead(user);
       updateActiveChatUserUI(user);
    };
    chatList.appendChild(div);
  });
}

function renderChatDetail(messages, chatUser) {
  const chatDetail = document.getElementById("chatDetail");
  chatDetail.innerHTML = "";

  const chatMessages = Object.values(messages).filter(
    msg =>
      (msg.from === currentUser && msg.to === chatUser) ||
      (msg.from === chatUser && msg.to === currentUser)
  );

  chatMessages.sort((a, b) => a.timestamp - b.timestamp);

chatMessages.forEach(msg => {
    const wrapper = document.createElement("div");
    wrapper.className = "message-wrapper";
    wrapper.style.justifyContent = msg.from === currentUser ? "flex-end" : "flex-start";

    const messageDiv = document.createElement("div");
    messageDiv.className = "message " + (msg.from === currentUser ? "fromMe" : "fromOther");

    const time = new Date(msg.timestamp).toLocaleString();
    messageDiv.innerHTML = `<div>${msg.text}</div><div class="timestamp">${time}</div>`;

    wrapper.appendChild(messageDiv);
    chatDetail.appendChild(wrapper);
  });

  chatDetail.scrollTop = chatDetail.scrollHeight;
}

function updateActiveChatUserUI(activeUser) {
  const items = document.querySelectorAll(".chatUser");
  items.forEach(item => {
    item.classList.toggle("active", item.innerText === activeUser);
  });
}

function markMessagesAsRead(fromUser) {
  db.ref("messages").once("value").then(snapshot => {
    snapshot.forEach(childSnapshot => {
      const msg = childSnapshot.val();
      const key = childSnapshot.key;

      if (msg.from === fromUser && msg.to === currentUser && !msg.read) {
        db.ref("messages/" + key).update({ read: true });
      }
    });
  });
}

document.getElementById("sendBtn").addEventListener("click", () => {
  const input = document.getElementById("messageInput");
  const message = input.value.trim();
  if (!message) return;

  if (selectedChatUser) {
    sendMessage(selectedChatUser, message);
  } else {
    // selectedChatUser yoksa rastgele kullanıcı bul ve mesaj gönder
    db.ref("users").once("value").then(snapshot => {
      const users = snapshot.val() || {};
      const otherUsers = Object.keys(users).filter(user => user !== currentUser);
      if (otherUsers.length === 0) {
        alert("Şu an çevrimiçi başka kullanıcı yok.");
        return;
      }
      const randomUser = otherUsers[Math.floor(Math.random() * otherUsers.length)];
      selectedChatUser = randomUser;
      sendMessage(selectedChatUser, message);
    });
  }

  input.value = "";
});


setUserOnline();
listenToMessages();
