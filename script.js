// Firebase imports
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js";

import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyAJk-mOOv8fJut5KcPJU_ZsBr1Qj0fCWcs",
  authDomain: "photouploader-5f0a2.firebaseapp.com",
  projectId: "photouploader-5f0a2",
  storageBucket: "photouploader-5f0a2.appspot.com",
  messagingSenderId: "666027306241",
  appId: "1:666027306241:web:e3f1e7fa18f27a5b05bf00",
  measurementId: "G-H1JDPR2WQF"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Cloudinary details
const cloudName = "dqe6v0c2m";
const uploadPreset = "unsigned_preset1";

// DOM references
const fileInput = document.getElementById("fileInput");
const fileList = document.getElementById("fileList");
const userEmailElem = document.getElementById("userEmail");
const userSection = document.getElementById("userSection");
const authSection = document.getElementById("authSection");

let currentUser = null;

// Auth state change
onAuthStateChanged(auth, user => {
  if (user) {
    currentUser = user;
    userSection.style.display = "block";
    authSection.style.display = "none";
    userEmailElem.textContent = user.email;
    loadFiles();
  } else {
    currentUser = null;
    userSection.style.display = "none";
    authSection.style.display = "block";
    fileList.innerHTML = "";
  }
});

// Sign Up
window.signUp = async function () {
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  if (!email || !password) return alert("Enter email and password");

  try {
    const userCred = await createUserWithEmailAndPassword(auth, email, password);
    currentUser = userCred.user;

    // Optional: Add to Firestore 'users' collection
    await addDoc(collection(db, "users"), {
      uid: currentUser.uid,
      email,
      createdAt: serverTimestamp()
    });

    alert("Sign up successful!");
  } catch (err) {
    alert("Sign up error: " + err.message);
  }
};

// Sign In
window.signIn = async function () {
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  try {
    const userCred = await signInWithEmailAndPassword(auth, email, password);
    currentUser = userCred.user;
    alert("Login successful!");
  } catch (err) {
    alert("Login failed: " + err.message);
  }
};

// Sign Out
window.signOut = async function () {
  await signOut(auth);
  alert("Logged out.");
};

// Upload file to Cloudinary and save info to Firestore
window.uploadFile = async function () {
  const file = fileInput.files[0];
  if (!file || !currentUser) return alert("Please select a file and sign in");

  try {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", uploadPreset);

    const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/upload`, {
      method: "POST",
      body: formData
    });

    const data = await response.json();
    if (!data.secure_url) throw new Error("Upload failed");

    const type = file.type.startsWith("video") ? "video" : "photo";

    await addDoc(collection(db, "media"), {
      uid: currentUser.uid,
      url: data.secure_url,
      type,
      createdAt: serverTimestamp()
    });

    alert("Upload successful!");
    loadFiles();
  } catch (err) {
    alert("Saving file info failed: " + err.message);
  }
};

// Load user media from Firestore
async function loadFiles() {
  fileList.innerHTML = "Loading...";
  try {
    const q = query(
      collection(db, "media"),
      where("uid", "==", currentUser.uid),
      orderBy("createdAt", "desc")
    );
    const snapshot = await getDocs(q);

    fileList.innerHTML = "";
    if (snapshot.empty) {
      fileList.innerHTML = "<p>No media uploaded.</p>";
      return;
    }

    snapshot.forEach(doc => {
      const data = doc.data();
      const item = document.createElement("div");
      item.className = "file-item";

      let media;
      if (data.type === "photo") {
        media = document.createElement("img");
        media.src = data.url;
        media.onclick = () => showPopup(data.url, "image");
      } else {
        media = document.createElement("video");
        media.src = data.url;
        media.controls = true;
        media.onclick = () => showPopup(data.url, "video");
      }

      item.appendChild(media);
      fileList.appendChild(item);
    });
  } catch (err) {
    fileList.innerHTML = `<p>Error loading media: ${err.message}</p>`;
  }
}

// Popup display
window.showPopup = function (url, type) {
  const popup = document.getElementById("popup");
  const popupImg = document.getElementById("popupImg");
  const popupVid = document.getElementById("popupVid");

  popup.style.display = "flex";
  if (type === "image") {
    popupImg.src = url;
    popupImg.style.display = "block";
    popupVid.style.display = "none";
  } else {
    popupVid.src = url;
    popupVid.style.display = "block";
    popupVid.play();
    popupImg.style.display = "none";
  }
};

window.closePopup = function (e) {
  const popup = document.getElementById("popup");
  if (e.target.id === "popup" || e.target.id === "popupClose") {
    popup.style.display = "none";
    document.getElementById("popupVid").pause();
  }
};
