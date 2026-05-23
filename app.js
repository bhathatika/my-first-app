// APP VERSION: 4.4.0 (Full Rich Text Editor Integration & Auto-Save Fix)
const firebaseConfig = {
  apiKey: "AIzaSyByguLw2U9d1nEIOUiPNHcOkYkBaMhR_Qk",
  authDomain: "epub-creator-pro.firebaseapp.com",
  projectId: "epub-creator-pro",
  storageBucket: "epub-creator-pro.firebasestorage.app",
  messagingSenderId: "1065833326550",
  appId: "1:1065833326550:web:8af45cc6d6930276ef6677",
  measurementId: "G-Q9FHPLKVBD"
};

// Initialize Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const auth = firebase.auth();
const db = firebase.firestore();

let chapters = []; // အခန်းတစ်ခုစီရဲ့ Quill instance နဲ့ id တွေကို သိမ်းထားရန်
let currentUser = null;
let coverBase64 = "";
let isLightMode = false;

// DOM Elements
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
if (themeBtn) {
    themeBtn.addEventListener('click', () => {
        isLightMode = !isLightMode;
        applyTheme();
        localStorage.setItem('epub_theme', isLightMode ? 'light' : 'dark');
    });
}

function applyTheme() {
    if (!bodyTag || !mainContainer || !backupBox || !themeBtn) return;
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

// --- 🖼️ COVER IMAGE PROCESS ---
if (coverInput) {
    coverInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function (evt) {
                coverBase64 = evt.target.result;
                if (coverPreview) {
                    coverPreview.src = coverBase64;
                    coverPreview.classList.remove('hidden');
                }
                saveData();
            };
            reader.readAsDataURL(file);
        }
    });
}

// --- 🔐 AUTH SYSTEM ---
if (authBtn) {
    authBtn.addEventListener('click', () => {
        if (currentUser) {
            auth.signOut().then(() => { alert("အကောင့်မှ ထွက်လိုက်ပါပြီ။"); location.reload(); });
        } else if (authSection) {
            authSection.classList.toggle('hidden');
        }
    });
}
if (closeAuth && authSection) closeAuth.addEventListener('click', () => authSection.classList.add('hidden'));

if (signUpSubmit) {
    signUpSubmit.addEventListener('click', () => {
        const email = emailInput ? emailInput.value.trim() : ""; 
        const password = passwordInput ? passwordInput.value : "";
        if(!email || !password) return alert("Email နှင့် Password ဖြည့်ပါ");
        auth.createUserWithEmailAndPassword(email, password).then(() => { if(authSection) authSection.classList.add('hidden'); }).catch(err => alert(err.message));
    });
}
if (signInSubmit) {
    signInSubmit.addEventListener('click', () => {
        const email = emailInput ? emailInput.value.trim() : ""; 
        const password = passwordInput ? passwordInput.value : "";
        if(!email || !password) return alert("Email နှင့် Password ဖြည့်ပါ");
        auth.signInWithEmailAndPassword(email, password).then(() => { if(authSection) authSection.classList.add('hidden'); }).catch(err => alert(err.message));
    });
}

auth.onAuthStateChanged(user => {
    if (user) {
        currentUser = user; if (authBtn) authBtn.innerText = "Sign Out";
        if (userEmailDisplay) userEmailDisplay.innerText = user.email; 
        if (userInfoStatus) userInfoStatus.classList.remove('hidden');
        loadDataFromCloud();
    } else {
        currentUser = null; if (authBtn) authBtn.innerText = "Sign In";
        if (userInfoStatus) userInfoStatus.classList.add('hidden'); 
        loadDataFromLocal();
    }
});

// --- 💾 DATA SYSTEM ---
function getAppData() {
    const dataChapters = [];
    chapters.forEach((ch, idx) => {
        const tInput = document.getElementById(`chTitle-${idx}`);
        // Quill Editor ထဲက စာသားနဲ့ ပုံတွေအကုန်လုံးကို HTML format အတိုင်း အတိအကျ ဆွဲထုတ်ယူပါတယ်
        const htmlContent = ch.editorInstance ? ch.editorInstance.root.innerHTML : "";
        
        dataChapters.push({
            id: idx + 1,
            title: tInput ? tInput.value : "",
            content: htmlContent
        });
    });
    return {
        title: bookTitleInput ? bookTitleInput.value : "",
        author: bookAuthorInput ? bookAuthorInput.value : "",
        cover: coverBase64,
        chapters: dataChapters
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
    try {
        if (!jsonData) return;
        const data = JSON.parse(jsonData);
        if (bookTitleInput) bookTitleInput.value = data.title || "";
        if (bookAuthorInput) bookAuthorInput.value = data.author || "";
        
        if (data.cover) {
            coverBase64 = data.cover; 
            if (coverPreview) { coverPreview.src = coverBase64; coverPreview.classList.remove('hidden'); }
        } else {
            coverBase64 = ""; 
            if (coverPreview) coverPreview.classList.add('hidden');
        }

        if (chaptersContainer) {
            chaptersContainer.innerHTML = "";
            chapters = [];
            
            if(data.chapters && data.chapters.length > 0) {
                data.chapters.forEach(ch => {
                    // ပါလာသမျှ ပုံတွေ၊ စာလုံးအထူအစောင်း ကုဒ်တွေကို Editor ထဲ တိုက်ရိုက် ထည့်သွင်းပေးပါတယ်
                    addChapter(ch.title || "", ch.content || "");
                });
            } else {
                addChapter();
            }
        }
    } catch (e) {
        console.error("Render error:", e);
        if (chaptersContainer && chaptersContainer.innerHTML === "") addChapter();
    }
}

// --- 📝 CHAPTERS MANAGEMENT (Quill Integration) ---
function addChapter(title = "", htmlContent = "") {
    if (!chaptersContainer) return;
    const index = chapters.length;

    const chBox = document.createElement('div');
    chBox.className = "bg-gray-750 p-4 rounded-lg border border-gray-700 space-y-3 block clear-both mt-3";
    chBox.id = `chBox-${index}`;
    
    chBox.innerHTML = `
        <div class="flex justify-between items-center">
            <span class="text-xs font-bold text-emerald-500">အခန်း - ${index + 1}</span>
        </div>
        
        <input type="text" id="chTitle-${index}" placeholder="အခန်းခေါင်းစဉ်" class="w-full p-2 bg-gray-950 rounded text-sm text-white border border-gray-700 focus:outline-emerald-500 font-medium">
        
        <div class="space-y-1">
            <label class="block text-xs font-bold text-gray-400">📝 အခန်းတွင်းစာသားနှင့် ဓာတ်ပုံများ (Chapter Content)</label>
            <!-- Quill Editor Container -->
            <div id="editor-container-${index}" class="w-full"></div>
        </div>
    `;
    
    chaptersContainer.appendChild(chBox);

    // Quill Rich Text Editor အား ခေါ်ယူသတ်မှတ်ခြင်း
    const quill = new Quill(`#editor-container-${index}`, {
        theme: 'snow',
        placeholder: 'ဤနေရာတွင် စာသားများနှင့် ဓာတ်ပုံများကို စိတ်ကြိုက် ရေးသားထည့်သွင်းနိုင်ပါသည်...',
        modules: {
            toolbar: [
                ['bold', 'italic', 'underline'],
                ['image', 'code-block'],
                [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                ['clean']
            ]
        }
    });

    // အခန်းအချက်အလက်ကို Array ထဲ သိမ်းဆည်းခြင်း
    chapters.push({
        id: index + 1,
        editorInstance: quill
    });

    // ခေါင်းစဉ်ဖြည့်သွင်းခြင်း
    const tIn = document.getElementById(`chTitle-${index}`);
    if (tIn) tIn.value = title;

    // ပါလာတဲ့ စာသားနဲ့ ပုံတွေကို Editor ထဲသို့ ပုံဖော်ထည့်သွင်းခြင်း
    if (htmlContent) {
        quill.root.innerHTML = htmlContent;
    }

    // Event Listeners for Live Auto-Saving
    if (tIn) tIn.addEventListener('input', saveData);
    quill.on('text-change', () => {
        saveData();
    });
}

if (bookTitleInput) bookTitleInput.addEventListener('input', saveData);
if (bookAuthorInput) bookAuthorInput.addEventListener('input', saveData);

const btnAddChapter = document.getElementById('btnAddChapter');
if (btnAddChapter) {
    btnAddChapter.addEventListener('click', () => { addChapter(); saveData(); });
}

// --- 📂 BACKUP BUTTONS ---
const btnBackup = document.getElementById('btnBackup');
if (btnBackup) {
    btnBackup.addEventListener('click', () => {
        const titleValue = bookTitleInput ? bookTitleInput.value : 'untitled';
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(getAppData()));
        const dl = document.createElement('a');
        dl.setAttribute("href", dataStr);
        dl.setAttribute("download", `${titleValue}_backup.json`);
        dl.click();
    });
}

const btnLoadBackup = document.getElementById('btnLoadBackup');
const fileInput = document.getElementById('fileInput');
if (btnLoadBackup && fileInput) {
    btnLoadBackup.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0]; if (!file) return;
        const reader = new FileReader();
        reader.onload = function(evt) { renderApp(evt.target.result); saveData(); alert("Backup တင်ပြီးပါပြီ။"); };
        reader.readAsText(file);
    });
}

const btnReset = document.getElementById('btnReset');
if (btnReset) {
    btnReset.addEventListener('click', () => {
        if(confirm("အစက ပြန်စမှာ သေချက်ပါသလား။")) {
            localStorage.removeItem('epub_creator_data');
            if (bookTitleInput) bookTitleInput.value = ""; 
            if (bookAuthorInput) bookAuthorInput.value = ""; 
            coverBase64 = "";
            if (coverPreview) coverPreview.classList.add('hidden'); 
            if (coverInput) coverInput.value = "";
            if (chaptersContainer) chaptersContainer.innerHTML = ""; 
            chapters = []; 
            addChapter(); 
            saveData();
        }
    });
}

// --- 📥 NATIVE EPUB GENERATION SYSTEM ---
if (btnGenerate) {
    btnGenerate.addEventListener('click', async () => {
        const data = getAppData();
        if (!data.title) return alert("စာအုပ်ခေါင်းစဉ် အရင်ဖြည့်ပါဗျာ။");
        if (!window.JSZip) return alert("JSZip Library မပွင့်သေးပါ၊ အင်တာနက်လိုင်း ပြန်စစ်ပေးပါ။");

        btnGenerate.innerText = "⏳ စာအုပ်ထုတ်နေဆဲဖြစ်သည်...";
        btnGenerate.disabled = true;

        try {
            const zip = new JSZip();
            zip.file("mimetype", "application/epub+zip", { compression: "STORE" });
            
            const containerXml = `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
    <rootfiles>
        <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
    </rootfiles>
</container>`;
            zip.folder("META-INF").file("container.xml", containerXml);

            const oebps = zip.folder("OEBPS");
            let manifestItems = "";
            let spineItems = "";
            let tocItems = "";

            let hasCover = false;
            if (data.cover && data.cover.includes("data:image/")) {
                try {
                    const parts = data.cover.split(',');
                    const base64Content = parts[1];
                    const mimeType = parts[0].split(';')[0].split(':')[1];
                    const ext = mimeType.split('/')[1] || 'jpg';
                    
                    oebps.file(`cover.${ext}`, base64Content, { base64: true });
                    hasCover = true;
                    data.coverExt = ext;
                    data.coverMime = mimeType;
                    manifestItems += `    <item id="cover-image" href="cover.${data.coverExt}" media-type="${data.coverMime}" properties="cover-image"/>\n`;
                } catch(e) { console.error("cover error", e); }
            }

            let imgCounter = 1;

            // အခန်းတစ်ခန်းစီကို ePub format ပြောင်းလဲခြင်း
            for (let idx = 0; idx < data.chapters.length; idx++) {
                const ch = data.chapters[idx];
                const chFileName = `chapter_${idx + 1}.html`;
                
                // Rich Text ထဲမှာ ပါဝင်နေတဲ့ Base64 ဓာတ်ပုံတွေကို ePub ထဲ သီးသန့်ဖိုင်အဖြစ် ဆွဲထုတ်သိမ်းဆည်းပေးခြင်း
                let contentHtml = ch.content || "<div></div>";
                const imgRegex = /<img[^>]+src="data:(image\/[^;]+);base64,([^"]+)"[^>]*>/gi;
                let match;
                
                while ((match = imgRegex.exec(ch.content)) !== null) {
                    const mimeType = match[1];
                    const base64Data = match[2];
                    const ext = mimeType.split('/')[1] || 'jpg';
                    const filename = `img_${imgCounter}.${ext}`;
                    
                    // Zip ထဲသို့ ပုံထည့်ခြင်း
                    oebps.file(filename, base64Data, { base64: true });
                    manifestItems += `    <item id="rich-img-${imgCounter}" href="${filename}" media-type="${mimeType}"/>\n`;
                    
                    // HTML ထဲက Base64 link ကို ePub အတွက် ပုံမှန် relative link အဖြစ် ပြောင်းလဲပစ်ခြင်း
                    contentHtml = contentHtml.replace(match[0], `<div style="text-align:center; margin:1em 0;"><img src="${filename}" style="max-width:100%;" alt="inline-image"/></div>`);
                    imgCounter++;
                }

                const chHtmlContent = `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
    <title>${ch.title || `Chapter ${idx + 1}`}</title>
    <style>
        body { font-family: sans-serif; padding: 10px; line-height: 1.6; }
        h2 { text-align: center; margin-top: 1em; margin-bottom: 1em; }
        p { margin: 0.5em 0; text-indent: 1.5em; }
    </style>
</head>
<body>
    <h2>${ch.title || `Chapter ${idx + 1}`}</h2>
    <div class="content">
        ${contentHtml}
    </div>
</body>
</html>`;

                oebps.file(chFileName, chHtmlContent);
                manifestItems += `    <item id="ch-${idx + 1}" href="${chFileName}" media-type="application/xhtml+xml"/>\n`;
                spineItems += `    <itemref idref="ch-${idx + 1}"/>\n`;
                tocItems += `    <navPoint id="nav-${idx + 1}" playOrder="${idx + 1}">
            <navLabel><text>${ch.title || `Chapter ${idx + 1}`}</text></navLabel>
            <content src="${chFileName}"/>
        </navPoint>\n`;
            }

            const contentOpf = `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" unique-identifier="bookid" version="2.0">
    <metadata xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:opf="http://www.idpf.org/2007/opf">
        <dc:title>${data.title}</dc:title>
        <dc:creator>${data.author || "Unknown Author"}</dc:creator>
        <dc:identifier id="bookid">urn:uuid:${Math.random().toString(36).substring(2, 15)}</dc:identifier>
        <dc:language>my</dc:language>
        ${hasCover ? `<meta name="cover" content="cover-image"/>` : ""}
    </metadata>
    <manifest>
        <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
        ${manifestItems}
    </manifest>
    <spine toc="ncx">
        ${spineItems}
    </spine>
</package>`;
            oebps.file("content.opf", contentOpf);

            const tocNcx = `<?xml version="1.0" encoding="UTF-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
    <head>
        <meta name="dtb:uid" content="urn:uuid:12345"/>
        <meta name="dtb:depth" content="1"/>
    </head>
    <docTitle><text>${data.title}</text></docTitle>
    <navMap>
        ${tocItems}
    </navMap>
</ncx>`;
            if (oebps) oebps.file("toc.ncx", tocNcx);

            const contentBlob = await zip.generateAsync({ type: "blob", mimeType: "application/epub+zip" });
            const url = URL.createObjectURL(contentBlob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${data.title}.epub`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            alert("🎉 ePub စာအုပ်ကို Rich Text ပုံစံအတိုင်း အောင်မြင်စွာ ထုတ်လုပ်ပြီးပါပြီဗျာ!");
        } catch (err) {
            console.error(err);
            alert("အမှားဖြစ်သွားပါသည်: " + err.message);
        } finally {
            btnGenerate.innerText = "📥 ePub စာအုပ်ထုတ်မည် (Generate ePub)";
            btnGenerate.disabled = false;
        }
    });
}