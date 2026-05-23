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

let chapters = []; // { id, imgBase64 } ပုံစံသိမ်းမည်
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

// --- 🖼️ COVER IMAGE PROCESS ---
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
    if(!email || !password) return alert("Email နှင့် Password ဖြည့်ပါ");
    auth.createUserWithEmailAndPassword(email, password).then(() => authSection.classList.add('hidden')).catch(err => alert(err.message));
});
signInSubmit.addEventListener('click', () => {
    const email = emailInput.value.trim(); const password = passwordInput.value;
    if(!email || !password) return alert("Email နှင့် Password ဖြည့်ပါ");
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

// --- ✨ HTML TAG REMOVER PRO ---
function cleanHtmlToText(htmlString) {
    if (!htmlString) return "";
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = htmlString;
    
    const paragraphs = tempDiv.querySelectorAll("p, br");
    paragraphs.forEach(el => {
        if(el.tagName.toLowerCase() === 'br') {
            el.parentNode.insertBefore(document.createTextNode("\n"), el);
            el.parentNode.removeChild(el);
        } else if(el.tagName.toLowerCase() === 'p') {
            el.appendChild(document.createTextNode("\n"));
        }
    });
    
    let textResult = tempDiv.textContent || tempDiv.innerText || "";
    return textResult.trim();
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
            content: document.getElementById(`chContent-${idx}`) ? document.getElementById(`chContent-${idx}`).value : "",
            imgBase64: ch.imgBase64 || "" // ဓာတ်ပုံဒေတာ သိမ်းဆည်းရန်
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
    try {
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
                let cleanedContent = cleanHtmlToText(ch.content);
                addChapter(ch.title, cleanedContent, ch.imgBase64);
            });
        } else {
            addChapter();
        }
    } catch (e) {
        console.error("Render error:", e);
    }
}

// --- 📝 CHAPTERS MANAGEMENT (ဓာတ်ပုံရွေးချယ်မှု စနစ်အပြည့်အစုံ ပြန်ထည့်ထားသည်) ---
function addChapter(title = "", content = "", imgBase64 = "") {
    const index = chapters.length;
    chapters.push({ id: index + 1, imgBase64: imgBase64 });

    const chBox = document.createElement('div');
    chBox.className = "bg-gray-750 p-3 rounded-lg border border-gray-700 space-y-2 relative";
    chBox.id = `chBox-${index}`;
    
    // ပုံရှိလျှင် ပြရန်၊ မရှိလျှင် ဖျောက်ထားရန် တည်ဆောက်ခြင်း
    const imgHiddenClass = imgBase64 ? "" : "hidden";

    chBox.innerHTML = `
        <div class="flex justify-between items-center">
            <span class="text-xs font-bold text-emerald-500">အခန်း - ${index + 1}</span>
        </div>
        <input type="text" id="chTitle-${index}" value="${title}" placeholder="အခန်းခေါင်းစဉ်" class="w-full p-2 bg-gray-950 rounded text-sm text-white border border-gray-700 focus:outline-emerald-500">
        
        <!-- 📸 အခန်းလိုက် ဓာတ်ပုံထည့်ရန် နေရာသစ် -->
        <div class="flex items-center space-x-2 bg-gray-950 p-1.5 rounded border border-gray-700">
            <input type="file" id="chImgInput-${index}" accept="image/*" class="text-xs text-gray-400 file:mr-2 file:py-0.5 file:px-2 file:rounded file:border-0 file:text-xs file:bg-gray-700 file:text-white hover:file:bg-gray-650">
            <img id="chImgPreview-${index}" src="${imgBase64}" class="${imgHiddenClass} w-10 h-10 object-cover rounded border border-gray-600">
        </div>

        <textarea id="chContent-${index}" rows="4" placeholder="စာသားများ ရေးသားရန်..." class="w-full p-2 bg-gray-950 rounded text-sm text-white border border-gray-700 focus:outline-emerald-500">${content}</textarea>
    `;
    
    chaptersContainer.appendChild(chBox);

    // ဓာတ်ပုံရွေးချယ်မှု အလုပ်လုပ်စေရန် ချိတ်ဆက်ခြင်း
    const chImgInput = document.getElementById(`chImgInput-${index}`);
    const chImgPreview = document.getElementById(`chImgPreview-${index}`);

    chImgInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function (evt) {
                chapters[index].imgBase64 = evt.target.result;
                chImgPreview.src = evt.target.result;
                chImgPreview.classList.remove('hidden');
                saveData();
            };
            reader.readAsDataURL(file);
        }
    });

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

// --- 📥 NATIVE EPUB GENERATION SYSTEM WITH IMAGES SUPPORT (ဓာတ်ပုံများပါ စာအုပ်ထဲသို့ တိုက်ရိုက်ထည့်သွင်းပေးမည့် စနစ်သစ်) ---
btnGenerate.addEventListener('click', async () => {
    const data = getAppData();
    if (!data.title) return alert("စာအုပ်ခေါင်းစဉ် အရင်ဖြည့်ပါဗျာ။");
    if (!window.JSZip) return alert("JSZip Library မပွင့်သေးပါ၊ အင်တာနက်လိုင်း ပြန်စစ်ပေးပါ။");

    btnGenerate.innerText = "⏳ စာအုပ်ထုတ်နေဆဲဖြစ်သည်...";
    btnGenerate.disabled = true;

    try {
        const zip = new JSZip();
        
        // 1. mimetype ဖိုင်ထည့်ခြင်း
        zip.file("mimetype", "application/epub+zip", { compression: "STORE" });
        
        // 2. META-INF/container.xml ဆောက်ခြင်း
        const containerXml = `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
    <rootfiles>
        <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
    </rootfiles>
</container>`;
        zip.folder("META-INF").file("container.xml", containerXml);

        // 3. OEBPS Folder ထဲမှာ အခန်းများနှင့် ပုံများ စတင်ဖန်တီးခြင်း
        const oebps = zip.folder("OEBPS");
        
        let manifestItems = "";
        let spineItems = "";
        let tocItems = "";

        // Cover ပုံကို စာအုပ်ထဲ ထည့်သွင်းခြင်း
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
            } catch(e) { console.error("Cover convert error:", e); }
        }

        // အခန်းလိုက် ဒေတာနှင့် ပုံများကို ပေါင်းစပ်ဖွဲ့စည်းခြင်း
        data.chapters.forEach((ch, idx) => {
            const chFileName = `chapter_${idx + 1}.html`;
            let chImageTag = ""; // HTML ထဲ ထည့်မည့် img tag

            // အခန်းထဲမှာ ပုံထည့်ထားခဲ့လျှင် Processing လုပ်ခြင်း
            if (ch.imgBase64 && ch.imgBase64.includes("data:image/")) {
                try {
                    const imgParts = ch.imgBase64.split(',');
                    const imgBase64Content = imgParts[1];
                    const imgMimeType = imgParts[0].split(';')[0].split(':')[1];
                    const imgExt = imgMimeType.split('/')[1] || 'jpg';
                    const imgFileName = `ch_img_${idx + 1}.${imgExt}`;

                    // ပုံဖိုင်ကို Zip ထဲ ထည့်သွင်းခြင်း
                    oebps.file(imgFileName, imgBase64Content, { base64: true });
                    
                    // OPF Manifest ထဲ ထည့်ရန်
                    manifestItems += `    <item id="ch-img-${idx + 1}" href="${imgFileName}" media-type="${imgMimeType}"/>\n`;
                    
                    // စာမျက်နှာ HTML ထဲမှာ ပြသပေးရန် img tag တည်ဆောက်ခြင်း
                    chImageTag = `<div style="text-align:center; margin:1em 0;"><img src="${imgFileName}" style="max-w-100; max-height:300px; border-radius:6px;" alt="Chapter Image"/></div>`;
                } catch(e) { console.error("Chapter image convert error:", e); }
            }

            // စာသားများကို Paragraph ခွဲခြင်း
            const paragraphsHtml = ch.content
                .split('\n')
                .map(p => p.trim() ? `<p style="text-indent:1.5em; margin:0.5em 0; line-height:1.6;">${p.trim()}</p>` : '')
                .join('');

            const chHtmlContent = `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
    <title>${ch.title || `Chapter ${idx + 1}`}</title>
</head>
<body>
    <h2 style="text-align:center; margin-top:1em; margin-bottom:1em;">${ch.title || `Chapter ${idx + 1}`}</h2>
    ${chImageTag} <!-- ဓာတ်ပုံရှိလျှင် ဤနေရာတွင် ပေါ်မည်ဖြစ်သည် -->
    ${paragraphsHtml || "<p></p>"}
</body>
</html>`;

            oebps.file(chFileName, chHtmlContent);
            
            manifestItems += `    <item id="ch-${idx + 1}" href="${chFileName}" media-type="application/xhtml+xml"/>\n`;
            spineItems += `    <itemref idref="ch-${idx + 1}"/>\n`;
            tocItems += `    <navPoint id="nav-${idx + 1}" playOrder="${idx + 1}">
        <navLabel><text>${ch.title || `Chapter ${idx + 1}`}</text></navLabel>
        <content src="${chFileName}"/>
    </navPoint>\n`;
        });

        // 4. OEBPS/content.opf (စာအုပ် Metadata) ဖန်တီးခြင်း
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

        // 5. OEBPS/toc.ncx (မာတိကာလမ်းညွှန်) ဖန်တီးခြင်း
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
        oebps.file("toc.ncx", tocNcx);

        // 6. Zip ဖိုင်ကို Generate လုပ်ပြီး ဒေါင်းလုဒ်ချပေးခြင်း
        const contentBlob = await zip.generateAsync({ type: "blob", mimeType: "application/epub+zip" });
        
        const url = URL.createObjectURL(contentBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${data.title}.epub`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        alert("🎉 ဓာတ်ပုံများပါဝင်သော ePub စာအုပ်ကို အောင်မြင်စွာ ထုတ်လုပ်ပြီးပါပြီဗျာ!");
    } catch (err) {
        console.error(err);
        alert("အမှားဖြစ်သွားပါသည်: " + err.message);
    } finally {
        btnGenerate.innerText = "📥 ePub စာအုပ်ထုတ်မည် (Generate ePub)";
        btnGenerate.disabled = false;
    }
});