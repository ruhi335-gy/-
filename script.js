// IMPORTANT: Replace with your Firebase config & Cloudinary credentials

// Firebase imports
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.3.0/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile,
  reauthenticateWithCredential,
  EmailAuthProvider,
  updatePassword,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.3.0/firebase-auth.js";

import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  addDoc,
  collection,
  query,
  where,
  orderBy,
  getDocs,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.3.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "YOUR_API_KEY_HERE",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MSG_SENDER_ID",
  appId: "YOUR_APP_ID"
};

const cloudName = "YOUR_CLOUDINARY_CLOUD_NAME";
const uploadPreset = "YOUR_CLOUDINARY_UPLOAD_PRESET";

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// DOM Elements
const loginTabBtn = document.getElementById('loginTabBtn');
const signupTabBtn = document.getElementById('signupTabBtn');

const loginForm = document.getElementById('loginForm');
const signupForm = document.getElementById('signupForm');

const authSection = document.getElementById('authSection');
const userSection = document.getElementById('userSection');

const userProfilePic = document.getElementById('userProfilePic');
const userEmailSpan = document.getElementById('userEmail');

const tabPhotos = document.getElementById('tabPhotos');
const tabVideos = document.getElementById('tabVideos');
const tabAll = document.getElementById('tabAll');
const tabAccount = document.getElementById('tabAccount');

const uploadSection = document.getElementById('uploadSection');
const fileList = document.getElementById('fileList');

const accountTab = document.getElementById('accountTab');
const accountEmail = document.getElementById('accountEmail');
const accountName = document.getElementById('accountName');
const accountGender = document.getElementById('accountGender');
const userProfilePicLarge = document.getElementById('userProfilePicLarge');

// Signup popup elements
const signupPopup = document.getElementById('signupPopup');
const signupNameInput = document.getElementById('signupName');
const signupGenderSelect = document.getElementById('signupGender');
const signupProfilePicInput = document.getElementById('signupProfilePicInput');
const signupProfilePreview = document.getElementById('signupProfilePreview');

// Edit profile popup elements
const editProfilePopup = document.getElementById('editProfilePopup');
const editNameInput = document.getElementById('editName');
const editGenderSelect = document.getElementById('editGender');
const editProfilePicInput = document.getElementById('editProfilePicInput');
const editProfilePreview = document.getElementById('editProfilePreview');

// Change password popup elements
const changePasswordPopup = document.getElementById('changePasswordPopup');
const oldPasswordInput = document.getElementById('oldPassword');
const newPasswordInput = document.getElementById('newPassword');
const confirmPasswordInput = document.getElementById('confirmPassword');

// Media popup elements
const mediaPopup = document.getElementById('mediaPopup');
const popupImg = document.getElementById('popupImg');
const popupVid = document.getElementById('popupVid');

// Fullscreen video popup
const videoFullscreenPopup = document.getElementById('videoFullscreenPopup');
const fullscreenVideo = document.getElementById('fullscreenVideo');

let currentUser = null;
let userProfileData = {};
let currentFilter = 'photo';

// --- AUTH FORM TOGGLE ---
window.showAuthForm = function(form) {
  if(form === 'login') {
    loginForm.style.display = 'flex';
    signupForm.style.display = 'none';
    loginTabBtn.classList.add('active');
    signupTabBtn.classList.remove('active');
  } else {
    signupForm.style.display = 'flex';
    loginForm.style.display = 'none';
    signupTabBtn.classList.add('active');
    loginTabBtn.classList.remove('active');
  }
};

// Toggle password visibility
window.togglePassword = function(inputId, btn) {
  const input = document.getElementById(inputId);
  if(input.type === 'password') {
    input.type = 'text';
    btn.textContent = 'Hide';
  } else {
    input.type = 'password';
    btn.textContent = 'Show';
  }
};

// --- SIGNUP PROCESS ---

signupForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const email = document.getElementById('signupEmail').value.trim();
  const password = document.getElementById('signupPassword').value.trim();

  if(!email || !password) return alert("Please enter email and password.");

  try {
    const userCred = await createUserWithEmailAndPassword(auth, email, password);
    currentUser = userCred.user;

    // Open signup profile completion popup
    openSignupPopup();
  } catch(err) {
    alert(err.message);
  }
});

window.openSignupPopup = function(){
  signupPopup.style.display = 'flex';

  // Reset inputs
  signupNameInput.value = "";
  signupGenderSelect.value = "";
  signupProfilePicInput.value = "";
  signupProfilePreview.style.display = 'none';
  signupProfilePreview.src = "";
};

signupProfilePicInput.addEventListener('change', function(){
  const file = this.files[0];
  if(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      signupProfilePreview.src = e.target.result;
      signupProfilePreview.style.display = 'inline-block';
    };
    reader.readAsDataURL(file);
  }
});

window.completeSignup = async function(){
  const name = signupNameInput.value.trim();
  const gender = signupGenderSelect.value;
  const file = signupProfilePicInput.files[0];

  if(!name) return alert("Please enter your name.");
  if(!gender) return alert("Please select your gender.");

  let profilePicUrl = "";

  if(file) {
    profilePicUrl = await uploadToCloudinary(file);
    if(!profilePicUrl) return alert("Failed to upload profile picture.");
  }

  try {
    await setDoc(doc(db, "users", currentUser.uid), {
      name,
      gender,
      profilePic: profilePicUrl,
      joined: serverTimestamp()
    });

    await updateProfile(currentUser, {
      displayName: name,
      photoURL: profilePicUrl || null
    });

    signupPopup.style.display = 'none';
    alert("Signup complete! You are logged in.");
    loadUserData(currentUser);
    toggleSections(true);
  } catch(err) {
    alert(err.message);
  }
};

// --- LOGIN PROCESS ---

window.signIn = async function(){
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value.trim();

  if(!email || !password) return alert("Enter email and password.");

  try {
    const userCred = await signInWithEmailAndPassword(auth, email, password);
    currentUser = userCred.user;
    loadUserData(currentUser);
    toggleSections(true);
  } catch(err) {
    alert(err.message);
  }
};

// --- LOGOUT ---
window.signOut = async function(){
  await firebaseSignOut(auth);
  currentUser = null;
  userProfileData = {};
  toggleSections(false);
  clearMediaList();
  clearAccountInfo();
};

// --- UI Toggle ---
function toggleSections(isLoggedIn) {
  if(isLoggedIn){
    authSection.style.display = 'none';
    userSection.style.display = 'block';
  } else {
    authSection.style.display = 'block';
    userSection.style.display = 'none';
  }
}

// --- LOAD USER DATA ---
async function loadUserData(user){
  if(!user) return;
  try {
    const userDoc = await getDoc(doc(db, "users", user.uid));
    if(userDoc.exists()){
      userProfileData = userDoc.data();
    } else {
      // Fallback if profile not completed
      userProfileData = {
        name: user.displayName || "User",
        gender: "Not set",
        profilePic: user.photoURL || ""
      };
    }
    // Update UI
    userEmailSpan.textContent = user.email;
    userProfilePic.src = userProfileData.profilePic || "https://via.placeholder.com/40?text=User";
    accountEmail.textContent = user.email;
    accountName.textContent = userProfileData.name || "Not set";
    accountGender.textContent = userProfileData.gender || "Not set";
    userProfilePicLarge.src = userProfileData.profilePic || "https://via.placeholder.com/80?text=User";

    // Load files
    await loadUserMedia(user.uid);
    // Show photos tab by default
    filterMedia('photo');
    showUploadAndTabs();
  } catch(err){
    alert("Error loading user data: " + err.message);
  }
}

function clearAccountInfo(){
  userEmailSpan.textContent = "";
  userProfilePic.src = "https://via.placeholder.com/40?text=User";
  accountEmail.textContent = "";
  accountName.textContent = "";
  accountGender.textContent = "";
  userProfilePicLarge.src = "https://via.placeholder.com/80?text=User";
}

// Show upload and tabs UI
function showUploadAndTabs(){
  uploadSection.style.display = 'flex';
  tabPhotos.style.display = 'inline-block';
  tabVideos.style.display = 'inline-block';
  tabAll.style.display = 'inline-block';
  tabAccount.style.display = 'inline-block';
  accountTab.style.display = 'none';
}

// --- LOAD USER MEDIA ---

let userMediaFiles = [];

async function loadUserMedia(uid){
  userMediaFiles = [];
  clearMediaList();

  try {
    const filesRef = collection(db, "users", uid, "files");
    const q = query(filesRef, orderBy("uploadedAt", "desc"));
    const querySnapshot = await getDocs(q);
    querySnapshot.forEach(docSnap => {
      userMediaFiles.push({id: docSnap.id, ...docSnap.data()});
    });
    renderMediaList();
  } catch(err){
    alert("Error loading media files: " + err.message);
  }
}

function clearMediaList(){
  fileList.innerHTML = "";
}

function renderMediaList(){
  clearMediaList();
  let filtered = userMediaFiles;
  if(currentFilter !== 'all'){
    filtered = userMediaFiles.filter(f => f.type === currentFilter);
  }
  if(filtered.length === 0){
    fileList.innerHTML = `<p style="text-align:center; color:#777;">No ${currentFilter === 'all' ? '' : currentFilter} files uploaded yet.</p>`;
    return;
  }
  filtered.forEach(file => {
    const div = document.createElement('div');
    div.className = 'file-item';
    div.title = file.name || "Uploaded file";

    if(file.type === 'photo'){
      const img = document.createElement('img');
      img.src = file.url;
      img.alt = file.name || "Photo";
      div.appendChild(img);
      div.onclick = () => openMediaPopup(file);
    } else if(file.type === 'video'){
      const video = document.createElement('video');
      video.src = file.url;
      video.setAttribute('muted', '');
      video.setAttribute('playsinline', '');
      video.setAttribute('preload', 'metadata');
      video.style.objectFit = 'cover';
      video.style.height = '150px';
      video.controls = false;
      div.appendChild(video);
      div.onclick = () => openFullscreenVideo(file);
    }

    fileList.appendChild(div);
  });
}

// --- FILTER MEDIA ---
window.filterMedia = function(type){
  currentFilter = type;
  // Update tab active states
  tabPhotos.classList.toggle('active', type === 'photo');
  tabVideos.classList.toggle('active', type === 'video');
  tabAll.classList.toggle('active', type === 'all');

  fileList.style.display = type === 'all' || type === 'photo' || type === 'video' ? 'grid' : 'none';
  uploadSection.style.display = type === 'all' || type === 'photo' || type === 'video' ? 'flex' : 'none';

  accountTab.style.display = 'none';
  renderMediaList();
};

// --- ACCOUNT TAB ---
window.showAccountTab = function(){
  tabPhotos.classList.remove('active');
  tabVideos.classList.remove('active');
  tabAll.classList.remove('active');
  tabAccount.classList.add('active');

  fileList.style.display = 'none';
  uploadSection.style.display = 'none';
  accountTab.style.display = 'block';
};

// --- UPLOAD FILE ---

async function uploadToCloudinary(file) {
  const url = `https://api.cloudinary.com/v1_1/${cloudName}/upload`;
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', uploadPreset);

  try {
    const res = await fetch(url, {
      method: 'POST',
      body: formData
    });
    const data = await res.json();
    if(data.secure_url) {
      return data.secure_url;
    } else {
      throw new Error("Cloudinary upload failed");
    }
  } catch(err){
    alert("Upload error: " + err.message);
    return null;
  }
}

window.uploadFile = async function(){
  const fileInput = document.getElementById('fileInput');
  const file = fileInput.files[0];
  if(!file) return alert("Please select a file to upload.");

  const fileType = file.type.startsWith('image') ? 'photo' :
                   file.type.startsWith('video') ? 'video' : null;
  if(!fileType) return alert("Only photos and videos are allowed.");

  uploadSection.querySelector('button').disabled = true;
  uploadSection.querySelector('button').textContent = "Uploading...";

  const uploadedUrl = await uploadToCloudinary(file);
  if(!uploadedUrl) {
    uploadSection.querySelector('button').disabled = false;
    uploadSection.querySelector('button').textContent = "Upload";
    return;
  }

  // Save metadata to Firestore
  try {
    await addDoc(collection(db, "users", currentUser.uid, "files"), {
      url: uploadedUrl,
      type: fileType,
      name: file.name,
      uploadedAt: serverTimestamp()
    });
    alert("Upload successful!");
    await loadUserMedia(currentUser.uid);
    filterMedia(currentFilter);
  } catch(err){
    alert("Saving file info failed: " + err.message);
  }

  fileInput.value = "";
  uploadSection.querySelector('button').disabled = false;
  uploadSection.querySelector('button').textContent = "Upload";
};

// --- MEDIA POPUP ---

window.openMediaPopup = function(file){
  mediaPopup.style.display = 'flex';
  if(file.type === 'photo'){
    popupImg.style.display = 'block';
    popupVid.style.display = 'none';
    popupImg.src = file.url;
  } else if(file.type === 'video'){
    popupImg.style.display = 'none';
    popupVid.style.display = 'block';
    popupVid.src = file.url;
    popupVid.play();
  }
};

window.closeMediaPopup = function(e){
  if(e.target === mediaPopup || e.target.classList.contains('popupClose')){
    mediaPopup.style.display = 'none';
    popupVid.pause();
    popupVid.src = "";
  }
};

// --- FULLSCREEN VIDEO ---

window.openFullscreenVideo = function(file){
  videoFullscreenPopup.style.display = 'flex';
  fullscreenVideo.src = file.url;
  fullscreenVideo.play();
};

window.closeFullscreenVideo = function(e){
  if(e.target === videoFullscreenPopup || e.target.classList.contains('popupClose')){
    videoFullscreenPopup.style.display = 'none';
    fullscreenVideo.pause();
    fullscreenVideo.src = "";
  }
};

// --- EDIT PROFILE ---

window.openEditProfilePopup = function(){
  editProfilePopup.style.display = 'flex';
  editNameInput.value = userProfileData.name || "";
  editGenderSelect.value = userProfileData.gender || "";
  editProfilePreview.style.display = userProfileData.profilePic ? 'block' : 'none';
  editProfilePreview.src = userProfileData.profilePic || "";
  editProfilePicInput.value = "";
};

editProfilePicInput.addEventListener('change', function(){
  const file = this.files[0];
  if(file){
    const reader = new FileReader();
    reader.onload = e => {
      editProfilePreview.src = e.target.result;
      editProfilePreview.style.display = 'block';
    };
    reader.readAsDataURL(file);
  }
});

window.saveProfileChanges = async function(){
  const newName = editNameInput.value.trim();
  const newGender = editGenderSelect.value;
  const file = editProfilePicInput.files[0];

  if(!newName) return alert("Please enter your name.");
  if(!newGender) return alert("Please select gender.");

  let newProfilePicUrl = userProfileData.profilePic || "";

  if(file){
    newProfilePicUrl = await uploadToCloudinary(file);
    if(!newProfilePicUrl) return alert("Failed to upload new profile picture.");
  }

  try {
    await setDoc(doc(db, "users", currentUser.uid), {
      name: newName,
      gender: newGender,
      profilePic: newProfilePicUrl,
      joined: userProfileData.joined || serverTimestamp()
    });
    await updateProfile(currentUser, {
      displayName: newName,
      photoURL: newProfilePicUrl || null
    });
    userProfileData.name = newName;
    userProfileData.gender = newGender;
    userProfileData.profilePic = newProfilePicUrl;

    accountName.textContent = newName;
    accountGender.textContent = newGender;
    userProfilePic.src = newProfilePicUrl || "https://via.placeholder.com/40?text=User";
    userProfilePicLarge.src = newProfilePicUrl || "https://via.placeholder.com/80?text=User";

    alert("Profile updated successfully!");
    editProfilePopup.style.display = 'none';
  } catch(err){
    alert("Error saving profile: " + err.message);
  }
};

// --- CHANGE PASSWORD ---

window.openChangePasswordPopup = function(){
  changePasswordPopup.style.display = 'flex';
  oldPasswordInput.value = "";
  newPasswordInput.value = "";
  confirmPasswordInput.value = "";
};

window.changePassword = async function(){
  const oldPass = oldPasswordInput.value;
  const newPass = newPasswordInput.value;
  const confirmPass = confirmPasswordInput.value;

  if(!oldPass || !newPass || !confirmPass) return alert("Fill all password fields.");
  if(newPass !== confirmPass) return alert("New password and confirm password do not match.");
  if(newPass.length < 6) return alert("Password should be at least 6 characters.");

  try {
    // Re-authenticate
    const credential = EmailAuthProvider.credential(currentUser.email, oldPass);
    await reauthenticateWithCredential(currentUser, credential);
    await updatePassword(currentUser, newPass);
    alert("Password changed successfully!");
    changePasswordPopup.style.display = 'none';
  } catch(err){
    alert("Password change failed: " + err.message);
  }
};

// --- POPUP CLOSE HANDLERS ---

window.closePopup = function(id){
  document.getElementById(id).style.display = 'none';
};

// --- AUTH STATE LISTENER ---
onAuthStateChanged(auth, (user) => {
  if(user) {
    currentUser = user;
    loadUserData(user);
    toggleSections(true);
  } else {
    currentUser = null;
    userProfileData = {};
    toggleSections(false);
    clearMediaList();
    clearAccountInfo();
  }
});
