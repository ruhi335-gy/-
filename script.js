// Firebase config & init
const firebaseConfig = {
  apiKey: "AIzaSyAiGJjHOzDxHJ2ouQTH2qUng2qA0EgafII",
  authDomain: "tik-tok-ed81f.firebaseapp.com",
  databaseURL: "https://tik-tok-ed81f-default-rtdb.firebaseio.com",
  projectId: "tik-tok-ed81f",
  storageBucket: "tik-tok-ed81f.firebasestorage.app",
  messagingSenderId: "5346923427",
  appId: "1:5346923427:web:29faf78bb7119330f74016",
  measurementId: "G-JN334NPY7E"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

const emptyBoard = ["", "", "", "", "", "", "", "", ""];
let currentRoom = null;
let player = null;
let playerNameGlobal = null;
let gameOver = false;

// DOM references
const board = document.getElementById("board");
const cells = document.querySelectorAll(".cell");
const status = document.getElementById("status");
const opponentNameDiv = document.getElementById("opponentName");
const popup = document.getElementById("popup");
const popupMsg = document.getElementById("popupMsg");
const overlay = document.getElementById("overlay");

const btnReplay = document.getElementById("btn-replay");
const btnConfirm = document.getElementById("btn-confirm");
const btnReject = document.getElementById("btn-reject");
const btnFeedback = document.getElementById("btn-feedback");

const playerNameInput = document.getElementById("playerNameInput");
const roomCodeInput = document.getElementById("roomCodeInput");
const btnCreateRoom = document.getElementById("btnCreateRoom");
const btnJoinRoom = document.getElementById("btnJoinRoom");
const createRoomSection = document.getElementById("createRoomSection");

// Chat
const chatContainer = document.getElementById("chatContainer");
const chatMessages = document.getElementById("chatMessages");
const chatInput = document.getElementById("chatInput");
const chatSendBtn = document.getElementById("chatSendBtn");

btnCreateRoom.addEventListener("click", createRoom);
btnJoinRoom.addEventListener("click", joinRoom);
btnReplay.addEventListener("click", resetBoard);
btnConfirm.addEventListener("click", () => confirmPlayAgain(true));
btnReject.addEventListener("click", () => confirmPlayAgain(false));
btnFeedback.addEventListener("click", giveFeedback);
overlay.addEventListener("click", closePopup);

chatSendBtn.addEventListener("click", sendChatMessage);
chatInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") sendChatMessage();
});

cells.forEach((cell) => {
  cell.addEventListener("click", () => {
    if (!gameOver && currentRoom && player) {
      makeMove(parseInt(cell.dataset.index));
    }
  });
});

function playClickSound() {
  const audio = document.getElementById("clickSound");
  if (audio) {
    audio.currentTime = 0;
    audio.play();
  }
}

async function createRoom() {
  const name = playerNameInput.value.trim();
  const code = roomCodeInput.value.trim().toUpperCase();

  if (!name || !code) return alert("Enter name and room code");

  const ref = db.ref("rooms/" + code);
  const snap = await ref.once("value");

  if (snap.exists()) return alert("Room already exists.");

  const data = {
    board: emptyBoard,
    current: "X",
    winner: "",
    playAgainRequest: "none",
    lastRequester: "",
    players: { X: { name } },
    chat: []
  };

  await ref.set(data);
  currentRoom = code;
  player = "X";
  playerNameGlobal = name;
  setupUI();
  listenForUpdates(code);
}

async function joinRoom() {
  const name = playerNameInput.value.trim();
  const code = roomCodeInput.value.trim().toUpperCase();

  if (!name || !code) return alert("Enter name and room code");

  const ref = db.ref("rooms/" + code);
  const snap = await ref.once("value");

  if (!snap.exists()) return alert("Room not found");

  const game = snap.val();
  if (game.players?.O) return alert("Room is full");

  await ref.child("players/O").set({ name });
  currentRoom = code;
  player = "O";
  playerNameGlobal = name;
  setupUI();
  listenForUpdates(code);
}

function setupUI() {
  createRoomSection.style.display = "none";
  board.style.display = "grid";
  chatContainer.style.display = "block";
}

function updateBoard(boardArr) {
  cells.forEach((cell, i) => {
    cell.textContent = boardArr[i];
  });
}

function updateStatus(game) {
  const { current, winner, players } = game;
  const opp = player === "X" ? players?.O?.name : players?.X?.name;

  opponentNameDiv.textContent = opp
    ? `Opponent: ${opp}`
    : "Waiting for opponent...";

  if (winner) {
    const winnerName = winner === "X" ? players?.X?.name : players?.O?.name;
    status.textContent = winner === "draw" ? "It's a draw!" : `${winnerName} wins!`;
    gameOver = true;
  } else {
    status.textContent =
      current === player ? `Your turn (${playerNameGlobal})` : "Opponent's move...";
    gameOver = false;
  }
}

async function makeMove(i) {
  const ref = db.ref("rooms/" + currentRoom);
  const snap = await ref.once("value");
  const game = snap.val();

  if (!game.players.X || !game.players.O) return alert("Waiting for opponent...");

  if (game.board[i] !== "" || game.current !== player || game.winner) return;

  playClickSound();
  const board = [...game.board];
  board[i] = player;
  const winner = checkWinner(board);
  const next = player === "X" ? "O" : "X";

  await ref.update({
    board,
    current: winner ? "" : next,
    winner: winner || "",
    playAgainRequest: "none",
    lastRequester: ""
  });
}

function checkWinner(b) {
  const win = [
    [0,1,2],[3,4,5],[6,7,8],
    [0,3,6],[1,4,7],[2,5,8],
    [0,4,8],[2,4,6]
  ];
  for (let [a,b1,c] of win) {
    if (b[a] && b[a] === b[b1] && b[a] === b[c]) return b[a];
  }
  return b.every(x => x) ? "draw" : null;
}

async function resetBoard() {
  const ref = db.ref("rooms/" + currentRoom);
  const snap = await ref.once("value");
  const game = snap.val();

  if (game.playAgainRequest === "none") {
    await ref.update({ playAgainRequest: "requested", lastRequester: player });
    alert("Request sent. Waiting...");
  } else {
    alert("Already requested.");
  }
  closePopup();
}

function handlePlayAgainPopup(game) {
  if (game.playAgainRequest === "requested" && game.lastRequester !== player) {
    popupMsg.textContent = "Opponent wants to play again. Accept?";
    btnConfirm.style.display = "inline-block";
    btnReject.style.display = "inline-block";
    btnReplay.style.display = "none";
    btnFeedback.style.display = "none";
    showPopup();
  } else if (game.winner) {
    const msg = game.winner === "draw"
      ? "It's a draw!"
      : `${game.players[game.winner]?.name} wins!`;
    popupMsg.textContent = msg;
    btnReplay.style.display = "inline-block";
    btnConfirm.style.display = "none";
    btnReject.style.display = "none";
    btnFeedback.style.display = "inline-block";
    showPopup();
  } else {
    closePopup();
  }
}

async function confirmPlayAgain(ok) {
  const ref = db.ref("rooms/" + currentRoom);
  if (ok) {
    await ref.update({
      board: emptyBoard,
      current: "X",
      winner: "",
      playAgainRequest: "none",
      lastRequester: ""
    });
    gameOver = false;
    closePopup();
  } else {
    await ref.update({ playAgainRequest: "none", lastRequester: "" });
    popupMsg.textContent = "You rejected play again.";
    btnConfirm.style.display = "none";
    btnReject.style.display = "none";
    btnReplay.style.display = "none";
    btnFeedback.style.display = "inline-block";
  }
}

function showPopup() {
  popup.style.display = "block";
  overlay.style.display = "block";
}

function closePopup() {
  popup.style.display = "none";
  overlay.style.display = "none";
}

function giveFeedback() {
  window.open("https://instagram.com/it_lonely.boy", "_blank");
}

// Realtime listeners
function listenForUpdates(code) {
  const ref = db.ref("rooms/" + code);
  ref.on("value", (snap) => {
    const game = snap.val();
    if (!game) return;
    updateBoard(game.board);
    updateStatus(game);
    handlePlayAgainPopup(game);
    updateChatUI(game.chat || []);
  });
}

// 🔥 Chat
function sendChatMessage() {
  const msg = chatInput.value.trim();
  if (!msg || !currentRoom || !player) return;

  const chatRef = db.ref("rooms/" + currentRoom + "/chat");
  const newMsg = {
    name: playerNameGlobal,
    text: msg,
    time: Date.now()
  };
  chatRef.push(newMsg);
  chatInput.value = "";
}

function updateChatUI(messages) {
  chatMessages.innerHTML = "";
  Object.values(messages).forEach(({ name, text }) => {
    const div = document.createElement("div");
    div.textContent = `${name}: ${text}`;
    chatMessages.appendChild(div);
  });
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

