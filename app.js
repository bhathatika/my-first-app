const firebaseConfig = {
  apiKey: "AIzaSyByguLw2U9d1nEIOUiPNHcOkYkBaMhR_Qk",
  authDomain: "epub-creator-pro.firebaseapp.com",
  projectId: "epub-creator-pro",
  storageBucket: "epub-creator-pro.firebasestorage.app",
  messagingSenderId: "1065833326550",
  appId: "1:1065833326550:web:8af45cc6d6930276ef6677",
  measurementId: "G-Q9FHPLKVBD"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

let chapters = [];
let currentUser = null;
let coverBase64 = "";
let isLightMode = false;

// Elements
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
const btnGenerate = document.getElementById('btnGenerate');

// --- 🌗 THEME SYSTEM ---
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
    } else {
        bodyTag.className = "bg-gray-900 text-gray-100 min-h-screen p-4 flex flex-col items-center";
        mainContainer.className = "w-full max-w-md bg-gray-800 rounded-xl p-6 shadow-2xl space-y-6 border border-gray-750";
        backupBox.className = "border border-gray-700 rounded-lg p-4 space-y-3 bg-gray-850";
        themeBtn.innerText = "☀️ Light Mode";
    }
}
if (localStorage.getItem('epub_theme') === 'light') { isLightMode = true; applyTheme(); }

// --- 🖼️ IMAGE PROCESS ---
coverInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function (evt) {
            coverBase64 = evt.target.result;
            coverPreview.src = coverBase64;
            coverPreview.classList.remove('hidden');
            saveData();
        };
        reader.readAsDataURL(file);
    }
});

// --- 🔐 AUTH SYSTEM ---
authBtn.addEventListener('click', () => {
    if (currentUser) {
        auth.signOut().then(() => { alert("အကောင့်မှ ထွက်လိုက်ပါပြီ။"); location.reload(); });
    } else {
        authSection.classList.toggle('hidden');
    }
});
closeAuth.addEventListener('click', () => authSection.classList.add('hidden'));

signUpSubmit.addEventListener('click', () => {
    const email = emailInput.value.trim(); const password = passwordInput.value;
    if(!email || !password) return alert("ဖြည့်စွက်ပါ");
    auth.createUserWithEmailAndPassword(email, password).then(() => authSection.classList.add('hidden')).catch(err => alert(err.message));
});
signInSubmit.addEventListener('click', () => {
    const email = emailInput.value.trim(); const password = passwordInput.value;
    if(!email || !password) return alert("ဖြည့်စွက်ပါ");
    auth.signInWithEmailAndPassword(email, password).then(() => authSection.classList.add('hidden')).catch(err => alert(err.message));
});

auth.onAuthStateChanged(user => {
    if (user) {
        currentUser = user; authBtn.innerText = "Sign Out";
        userEmailDisplay.innerText = user.email; userInfoStatus.classList.remove('hidden');
        loadDataFromCloud();
    } else {
        currentUser = null; authBtn.innerText = "Sign In";
        userInfoStatus.classList.add('hidden'); loadDataFromLocal();
    }
});

// --- ✨ HTML HTML TAG REMOVER (စာသားသန့်စင်ရေးစနစ်) ---
function cleanHtmlToText(htmlString) {
    if (!htmlString) return "";
    let clean = htmlString;
    // စာကြောင်းအသစ် လဲလှယ်ခြင်း
    clean = clean.replace(/<br\s*\/?>/gi, "\n");
    clean = clean.replace(/<\/p>/gi, "\n");
    // တခြား tag များကို ဖျက်ခြင်း
    clean = clean.replace(/<[^>]+>/g, "");
    return clean.trim();
}

// --- 💾 DATA SYSTEM ---
function getAppData() {
    return {
        title: bookTitleInput.value,
        author: bookAuthorInput.value,
        cover: coverBase64,
        chapters: chapters.map((ch, idx) => ({
            id: idx + 1,
            title: document.getElementById(`chTitle-${idx}`) ? document.getElementById(`chTitle-${idx}`).value : "",
            content: document.getElementById(`chContent-${idx}`) ? document.getElementById(`chContent-${idx}`).value : ""
        }))
    };
}

function saveData() {
    const data = getAppData();
    localStorage.setItem('epub_creator_data', JSON.stringify(data));
    if (currentUser) {
        db.collection("user_books").doc(currentUser.uid).set(data).catch(err => console.log(err));
    }
}

function loadDataFromLocal() {
    const localData = localStorage.getItem('epub_creator_data');
    if (localData) renderApp(localData); else addChapter();
}

function loadDataFromCloud() {
    if (!currentUser) return;
    db.collection("user_books").doc(currentUser.uid).get().then(doc => {
        if (doc.exists) renderApp(JSON.stringify(doc.data())); else loadDataFromLocal();
    });
}

function renderApp(jsonData) {
    const data = JSON.parse(jsonData);
    bookTitleInput.value = data.title || "";
    bookAuthorInput.value = data.author || "";
    
    if (data.cover) {
        coverBase64 = data.cover; coverPreview.src = coverBase64; coverPreview.classList.remove('hidden');
    } else {
        coverBase64 = ""; coverPreview.classList.add('hidden');
    }

    chaptersContainer.innerHTML = "";
    chapters = [];
    
    if(data.chapters && data.chapters.length > 0) {
        data.chapters.forEach(ch => {
            // Backup ဖိုင်ဟောင်းမှ HTML tag များကို ရှင်းထုတ်ပြီးမှ ထည့်ပေးသည်
            let cleanedContent = cleanHtmlToText(ch.content);
            addChapter(ch.title, cleanedContent);
        });
    } else {
        addChapter();
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

    document.getElementById(`chTitle-${index}`).addEventListener('input', saveData);
    document.getElementById(`chContent-${index}`).addEventListener('input', saveData);
}

bookTitleInput.addEventListener('input', saveData);
bookAuthorInput.addEventListener('input', saveData);
document.getElementById('btnAddChapter').addEventListener('click', () => { addChapter(); saveData(); });

// --- 📂 BACKUP BUTTONS ---
document.getElementById('btnBackup').addEventListener('click', () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(getAppData()));
    const dl = document.createElement('a');
    dl.setAttribute("href", dataStr);
    dl.setAttribute("download", `${bookTitleInput.value || 'untitled'}_backup.json`);
    dl.click();
});

document.getElementById('btnLoadBackup').addEventListener('click', () => document.getElementById('fileInput').click());
document.getElementById('fileInput').addEventListener('change', (e) => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = function(evt) { renderApp(evt.target.result); saveData(); alert("Backup တင်ပြီးပါပြီ။"); };
    reader.readAsText(file);
});

document.getElementById('btnReset').addEventListener('click', () => {
    if(confirm("အစက ပြန်စမှာ သေချက်ပါသလား။")) {
        localStorage.removeItem('epub_creator_data');
        bookTitleInput.value = ""; bookAuthorInput.value = ""; coverBase64 = "";
        coverPreview.classList.add('hidden'); coverInput.value = "";
        chaptersContainer.innerHTML = ""; chapters = []; addChapter(); saveData();
    }
});

// --- 📥 EPUB GENERATION FUNCTION (စာအုပ်ထုတ်လုပ်ခြင်း) ---
btnGenerate.addEventListener('click', async () => {
    const data = getAppData();
    if (!data.title) return alert("စာအုပ်ခေါင်းစဉ် အရင်ဖြည့်ပါဗျာ။");

    btnGenerate.innerText = "⏳ စာအုပ်ထုတ်နေဆဲဖြစ်သည်...";
    btnGenerate.disabled = true;

    // ePub စာအုပ်အတွက် ဒေတာပုံစံ ပြင်ဆင်ခြင်း
    const option = {
        title: data.title,
        author: data.author || "Unknown Author",
        content: data.chapters.map(ch => ({
            title: ch.title || "Untitled Chapter",
            data: ch.content.split('\n').map(p => `<p>${p}</p>`).join('') // စာကြောင်းအသစ်များကို HTML Format ပြောင်းသည်
        }))
    };

    // မျက်နှာဖုံးပုံရှိလျှင် ထည့်သွင်းခြင်း
    if (data.cover) {
        option.cover = data.cover;
    }

    try {
        // epub-gen-memory သုံးပြီး ဖိုင်ထုတ်ခြင်း
        const blob = await window.htmlToEpub.epubGenMemory(option);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${data.title}.epub`;
        a.click();
        URL.revokeObjectURL(url);
        alert("🎉 ePub စာအုပ် ထုတ်လုပ်ပြီးပါပြီဗျာ!");
    } catch (err) {
        console.error(err);
        alert("စာအုပ်ထုတ်ရာတွင် အမှားတစ်ခုရှိနေပါသည်: " + err.message);
    } finally {
        btnGenerate.innerText = "📥 ePub စာအုပ်ထုတ်မည် (Generate ePub)";
        btnGenerate.disabled = false;
    }
});