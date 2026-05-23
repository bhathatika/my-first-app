// သင့်ရဲ့ ကိုယ်ပိုင် Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyByguLw2U9d1nEIOUiPNHcOkYkBaMhR_Qk",
  authDomain: "epub-creator-pro.firebaseapp.com",
  projectId: "epub-creator-pro",
  storageBucket: "epub-creator-pro.firebasestorage.app",
  messagingSenderId: "1065833326550",
  appId: "1:1065833326550:web:8af45cc6d6930276ef6677",
  measurementId: "G-Q9FHPLKVBD"
};

// Initialize Firebase ဝန်ဆောင်မှုများ
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// Global Variables
let chapters = [];
let currentUser = null;
let coverBase64 = ""; // မျက်နှာဖုံးပုံ သိမ်းရန်
let isLightMode = false; // Theme ထိန်းရန်

// HTML Elements ဖမ်းယူခြင်း
const bodyTag = document.getElementById('bodyTag');
const mainContainer = document.getElementById('mainContainer');
const backupBox = document.getElementById('backupBox');
const bookTitleInput = document.getElementById('bookTitle');
const bookAuthorInput = document.getElementById('bookAuthor');
const coverInput = document.getElementById('coverInput');
const coverPreview = document.getElementById('coverPreview');
const chaptersContainer = document.getElementById('chaptersContainer');
const themeBtn = document.getElementById('themeBtn');
const authBtn = document.getElementById('authBtn');
const authSection = document.getElementById('authSection');
const emailInput = document.getElementById('emailInput');
const passwordInput = document.getElementById('passwordInput');
const signInSubmit = document.getElementById('signInSubmit');
const signUpSubmit = document.getElementById('signUpSubmit');
const closeAuth = document.getElementById('closeAuth');
const userInfoStatus = document.getElementById('userInfoStatus');
const userEmailDisplay = document.getElementById('userEmailDisplay');

// --- 🌗 LIGHT / DARK MODE SYSTEM ---
themeBtn.addEventListener('click', () => {
    isLightMode = !isLightMode;
    applyTheme();
    localStorage.setItem('epub_theme', isLightMode ? 'light' : 'dark');
});

function applyTheme() {
    if (isLightMode) {
        bodyTag.className = "bg-gray-100 text-gray-900 min-h-screen p-4 flex flex-col items-center";
        mainContainer.className = "w-full max-w-md bg-white rounded-xl p-6 shadow-2xl space-y-6 border border-gray-200";
        backupBox.className = "border border-gray-200 rounded-lg p-4 space-y-3 bg-gray-50";
        themeBtn.innerText = "🌙 Night Mode";
        themeBtn.className = "bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-1 px-2.5 rounded text-xs transition";
    } else {
        bodyTag.className = "bg-gray-900 text-gray-100 min-h-screen p-4 flex flex-col items-center";
        mainContainer.className = "w-full max-w-md bg-gray-800 rounded-xl p-6 shadow-2xl space-y-6 border border-gray-750";
        backupBox.className = "border border-gray-700 rounded-lg p-4 space-y-3 bg-gray-850";
        themeBtn.innerText = "☀️ Light Mode";
        themeBtn.className = "bg-gray-700 hover:bg-gray-650 text-white font-bold py-1 px-2.5 rounded text-xs transition";
    }
}

// သိုလှောင်ထားသော Theme ပြန်ခေါ်ခြင်း
const savedTheme = localStorage.getItem('epub_theme');
if (savedTheme === 'light') {
    isLightMode = true;
    applyTheme();
}

// --- 🖼️ IMAGE PROCESSING ---
coverInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function (event) {
            coverBase64 = event.target.result;
            coverPreview.src = coverBase64;
            coverPreview.classList.remove('hidden');
            saveData();
        };
        reader.readAsDataURL(file);
    }
});

// --- 🔐 FIREBASE AUTHENTICATION ---
authBtn.addEventListener('click', () => {
    if (currentUser) {
        auth.signOut().then(() => {
            alert("အကောင့်မှ ထွက်လိုက်ပါပြီ။");
            location.reload();
        });
    } else {
        authSection.classList.toggle('hidden');
    }
});
closeAuth.addEventListener('click', () => authSection.classList.add('hidden'));

signUpSubmit.addEventListener('click', () => {
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    if(!email || !password) return alert("Email နှင့် Password ဖြည့်ပါ");
    auth.createUserWithEmailAndPassword(email, password)
        .then(() => { authSection.classList.add('hidden'); })
        .catch(err => alert("အမှားရှိပါသည်: " + err.message));
});

signInSubmit.addEventListener('click', () => {
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    if(!email || !password) return alert("Email နှင့် Password ဖြည့်ပါ");
    auth.signInWithEmailAndPassword(email, password)
        .then(() => { authSection.classList.add('hidden'); })
        .catch(err => alert("အမှားရှိပါသည်: " + err.message));
});

auth.onAuthStateChanged(user => {
    if (user) {
        currentUser = user;
        authBtn.innerText = "Sign Out";
        userEmailDisplay.innerText = user.email;
        userInfoStatus.classList.remove('hidden');
        loadDataFromCloud();
    } else {
        currentUser = null;
        authBtn.innerText = "Sign In";
        userInfoStatus.classList.add('hidden');
        loadDataFromLocal();
    }
});

// --- 💾 DATA CONTROL SYSTEM ---
function getAppData() {
    return {
        title: bookTitleInput.value,
        author: bookAuthorInput.value,
        cover: coverBase64,
        chapters: chapters.map((ch, index) => ({
            id: index + 1,
            title: document.getElementById(`chTitle-${index}`) ? document.getElementById(`chTitle-${index}`).value : "",
            content: document.getElementById(`chContent-${index}`) ? document.getElementById(`chContent-${index}`).value : ""
        }))
    };
}

function saveData() {
    const data = getAppData();
    localStorage.setItem('epub_creator_data', JSON.stringify(data));
    if (currentUser) {
        db.collection("user_books").doc(currentUser.uid).set(data)
            .then(() => console.log("Cloud synced!"))
            .catch(err => console.error("Cloud sync error:", err));
    }
}

function loadDataFromLocal() {
    const localData = localStorage.getItem('epub_creator_data');
    if (localData) {
        renderApp(localData);
    } else {
        addChapter();
    }
}

function loadDataFromCloud() {
    if (!currentUser) return;
    db.collection("user_books").doc(currentUser.uid).get()
        .then(doc => {
            if (doc.exists) {
                const cloudData = doc.data();
                renderApp(JSON.stringify(cloudData));
            } else {
                loadDataFromLocal();
            }
        });
}

function renderApp(jsonData) {
    try {
        const data = JSON.parse(jsonData);
        bookTitleInput.value = data.title || "";
        bookAuthorInput.value = data.author || "";
        
        if (data.cover) {
            coverBase64 = data.cover;
            coverPreview.src = coverBase64;
            coverPreview.classList.remove('hidden');
        } else {
            coverBase64 = "";
            coverPreview.classList.add('hidden');
        }

        chaptersContainer.innerHTML = "";
        chapters = [];
        
        if(data.chapters && data.chapters.length > 0) {
            data.chapters.forEach(ch => {
                addChapter(ch.title, ch.content);
            });
        } else {
            addChapter();
        }
    } catch (e) {
        console.error("Render error:", e);
    }
}

// --- 📝 CHAPTERS MANAGEMENT ---
function addChapter(title = "", content = "") {
    const index = chapters.length;
    chapters.push({ id: index + 1 });

    const chBox = document.createElement('div');
    chBox.className = "bg-gray-750 p-3 rounded-lg border border-gray-700 space-y-2 relative";
    chBox.id = `chBox-${index}`;
    chBox.innerHTML = `
        <div class="flex justify-between items-center">
            <span class="text-xs font-bold text-emerald-500">အခန်း - ${index + 1}</span>
        </div>
        <input type="text" id="chTitle-${index}" value="${title}" placeholder="အခန်းခေါင်းစဉ်" class="w-full p-2 bg-gray-950 rounded text-sm text-white border border-gray-700 focus:outline-emerald-500">
        <textarea id="chContent-${index}" rows="4" placeholder="စာသားများ ရေးသားရန်..." class="w-full p-2 bg-gray-950 rounded text-sm text-white border border-gray-700 focus:outline-emerald-500">${content}</textarea>
    `;
    
    chaptersContainer.appendChild(chBox);

    // Event Listener များကို ပုံသေချိတ်ဆက်ခြင်း
    document.getElementById(`chTitle-${index}`).addEventListener('input', saveData);
    document.getElementById(`chContent-${index}`).addEventListener('input', saveData);
}

bookTitleInput.addEventListener('input', saveData);
bookAuthorInput.addEventListener('input', saveData);
document.getElementById('btnAddChapter').addEventListener('click', () => { addChapter(); saveData(); });

// --- 📂 FILE BACKUP BUTTONS ---
document.getElementById('btnBackup').addEventListener('click', () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(getAppData()));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `${bookTitleInput.value || 'untitled'}_backup.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
});

document.getElementById('btnLoadBackup').addEventListener('click', () => {
    document.getElementById('fileInput').click();
});

document.getElementById('fileInput').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(evt) {
        renderApp(evt.target.result);
        saveData();
        alert("Backup ဖိုင်ကို အောင်မြင်စွာ ပြန်တင်ပြီးပါပြီ။");
    };
    reader.readAsText(file);
});

document.getElementById('btnReset').addEventListener('click', () => {
    if(confirm("လက်ရှိ ရေးလက်စများကို ဖျက်ပြီး အစက ပြန်စမှာ သေချက်ပါသလား။")) {
        localStorage.removeItem('epub_creator_data');
        bookTitleInput.value = "";
        bookAuthorInput.value = "";
        coverBase64 = "";
        coverPreview.classList.add('hidden');
        coverInput.value = "";
        chaptersContainer.innerHTML = "";
        chapters = [];
        addChapter();
        saveData();
    }
});