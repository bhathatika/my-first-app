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

// HTML Elements များကို ဖမ်းယူခြင်း
const bookTitleInput = document.getElementById('bookTitle');
const bookAuthorInput = document.getElementById('bookAuthor');
const chaptersContainer = document.getElementById('chaptersContainer');
const authBtn = document.getElementById('authBtn');
const authSection = document.getElementById('authSection');
const emailInput = document.getElementById('emailInput');
const passwordInput = document.getElementById('passwordInput');
const signInSubmit = document.getElementById('signInSubmit');
const signUpSubmit = document.getElementById('signUpSubmit');
const closeAuth = document.getElementById('closeAuth');
const userInfoStatus = document.getElementById('userInfoStatus');
const userEmailDisplay = document.getElementById('userEmailDisplay');

// --- 🔐 ACCOUNT SYSTEM (FIREBASE AUTH) ---

// အကောင့်ဝင်/ထွက် ခလုတ် နှိပ်သည့်အခါ UI ပြသခြင်း
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

// Sign Up (အကောင့်အသစ်ဖွင့်ခြင်း)
signUpSubmit.addEventListener('click', () => {
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    if(!email || !password) return alert("Email နှင့် Password ဖြည့်ပါ");
    
    auth.createUserWithEmailAndPassword(email, password)
        .then(() => {
            alert("အကောင့်အသစ် အောင်မြင်စွာ ဖွင့်ပြီးပါပြီ။");
            authSection.classList.add('hidden');
        })
        .catch(err => alert("အမှားရှိပါသည်: " + err.message));
});

// Sign In (အကောင့်ဝင်ခြင်း)
signInSubmit.addEventListener('click', () => {
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    if(!email || !password) return alert("Email နှင့် Password ဖြည့်ပါ");
    
    auth.signInWithEmailAndPassword(email, password)
        .then(() => {
            alert("အကောင့်ဝင်ခြင်း အောင်မြင်ပါသည်။");
            authSection.classList.add('hidden');
        })
        .catch(err => alert("အမှားရှိပါသည်: " + err.message));
});

// အကောင့် အခြေအနေကို စောင့်ကြည့်ခြင်း (User State Change)
auth.onAuthStateChanged(user => {
    if (user) {
        currentUser = user;
        authBtn.innerText = "Sign Out";
        userEmailDisplay.innerText = user.email;
        userInfoStatus.classList.remove('hidden');
        // Cloud Database မှ ဒေတာလှမ်းယူခြင်း
        loadDataFromCloud();
    } else {
        currentUser = null;
        authBtn.innerText = "Sign In";
        userInfoStatus.classList.add('hidden');
        loadDataFromLocal(); // အကောင့်မဝင်ထားရင် LocalStorage ကပဲပြမည်
    }
});

// --- 💾 DATA SAVE & LOAD SYSTEM ---

// ဒေတာအားလုံးကို စုစည်းရယူခြင်း
function getAppData() {
    return {
        title: bookTitleInput.value,
        author: bookAuthorInput.value,
        chapters: chapters.map((ch, index) => ({
            id: index + 1,
            title: document.getElementById(`chTitle-${index}`).value,
            content: document.getElementById(`chContent-${index}`).value
        }))
    };
}

// ဒေတာ သိမ်းဆည်းခြင်း (Auto Save)
function saveData() {
    const data = getAppData();
    // LocalStorage ထဲသိမ်းခြင်း
    localStorage.setItem('epub_creator_data', JSON.stringify(data));
    
    // အကောင့်ဝင်ထားလျှင် Cloud ပေါ်သို့ပါ သိမ်းခြင်း
    if (currentUser) {
        db.collection("user_books").doc(currentUser.uid).set(data)
            .then(() => console.log("Cloud synced!"))
            .catch(err => console.error("Cloud sync error:", err));
    }
}

// Local Storage မှ ပြန်ဖွင့်ခြင်း
function loadDataFromLocal() {
    const localData = localStorage.getItem('epub_creator_data');
    if (localData) {
        renderApp(JSON.stringify(localData));
    } else {
        addChapter(); // အသစ်ဆိုလျှင် အခန်း ၁ တစ်ခု အလိုအလျောက်ထည့်ပေးမည်
    }
}

// Cloud Database မှ ပြန်ဖွင့်ခြင်း
function loadDataFromCloud() {
    if (!currentUser) return;
    db.collection("user_books").doc(currentUser.uid).get()
        .then(doc => {
            if (doc.exists) {
                const cloudData = doc.data();
                bookTitleInput.value = cloudData.title || "";
                bookAuthorInput.value = cloudData.author || "";
                chapters = [];
                chaptersContainer.innerHTML = "";
                if(cloudData.chapters && cloudData.chapters.length > 0) {
                    cloudData.chapters.forEach(ch => addChapter(ch.title, ch.content));
                } else {
                    addChapter();
                }
            } else {
                loadDataFromLocal();
            }
        });
}

// UI ပေါ်တွင် အချက်အလက်များ ပြန်လည် ဖော်ပြပေးခြင်း
function renderApp(jsonData) {
    const data = JSON.parse(jsonData);
    bookTitleInput.value = data.title || "";
    bookAuthorInput.value = data.author || "";
    chaptersContainer.innerHTML = "";
    chapters = [];
    if(data.chapters) {
        data.chapters.forEach(ch => addChapter(ch.title, ch.content));
    }
}

// --- 📝 CHAPTER MANAGEMENT ---

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
        <input type="text" id="chTitle-${index}" value="${title}" placeholder="အခန်းခေါင်းစဉ်" class="w-full p-2 bg-gray-900 rounded text-sm text-white border border-gray-700 focus:outline-emerald-500">
        <textarea id="chContent-${index}" rows="4" placeholder="စာသားများ ရေးသားရန်..." class="w-full p-2 bg-gray-900 rounded text-sm text-white border border-gray-700 focus:outline-emerald-500">${content}</textarea>
    `;
    
    chaptersContainer.appendChild(chBox);

    // Event Listeners for Auto-Save
    document.getElementById(`chTitle-${index}`).addEventListener('input', saveData);
    document.getElementById(`chContent-${index}`).addEventListener('input', saveData);
}

// Event Listeners for Main Inputs
bookTitleInput.addEventListener('input', saveData);
bookAuthorInput.addEventListener('input', saveData);
document.getElementById('btnAddChapter').addEventListener('click', () => { addChapter(); saveData(); });

// --- 📂 MANUAL BACKUP BUTTONS ---

document.getElementById('btnBackup').addEventListener('click', () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(getAppData()));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `${bookTitleInput.value || 'untitled'}_backup.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
});

document.getElementById('btnLoadBackup').addEventListener('click', () => document.getElementById('fileInput').click());

document.getElementById('fileInput').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        renderApp(e.target.result);
        saveData();
        alert("Backup ဖိုင်ကို အောင်မြင်စွာ ပြန်တင်ပြီးပါပြီ။");
    };
    reader.readAsText(file);
});

document.getElementById('btnReset').addEventListener('click', () => {
    if(confirm("လက်ရှိ ရေးလက်စများကို ဖျက်ပြီး အစက ပြန်စမှာ သေချာပါသလား။")) {
        localStorage.removeItem('epub_creator_data');
        bookTitleInput.value = "";
        bookAuthorInput.value = "";
        chaptersContainer.innerHTML = "";
        chapters = [];
        addChapter();
        saveData();
    }
});