let bookChapters = [];
let currentChapterId = null;
let coverBase64 = "";

// Text Format Commands
function execCmd(command) {
    document.execCommand(command, false, null);
    saveCurrentChapterContentLive();
}

// ဓာတ်ပုံများကို အရွယ်အစားချုံ့ပေးသည့် စနစ်
function compressImage(file, maxWidth, maxHeight, quality) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = function(event) {
            const img = new Image();
            img.src = event.target.result;
            img.onload = function() {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > maxWidth) { height *= maxWidth / width; width = maxWidth; }
                } else {
                    if (height > maxHeight) { width *= maxHeight / height; height = maxHeight; }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                const dataUrl = canvas.toDataURL('image/jpeg', quality);
                resolve(dataUrl);
            };
            img.onerror = error => reject(error);
        };
        reader.onerror = error => reject(error);
    });
}

// 🌟 Photo Library မှ ပုံတစ်ပုံတည်း သို့မဟုတ် အများကြီးထည့်လျှင် တန်းစီထည့်ပေးမည့် စနစ် 🌟
async function insertImagesToEditor(event) {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    
    const editor = document.getElementById('editor');
    editor.focus();

    let imagesHtml = "";
    for (let i = 0; i < files.length; i++) {
        try {
            const compressedBase64 = await compressImage(files[i], 800, 800, 0.75);
            // XHTML စံနှုန်းမီအောင် <img /> သေချာပိတ်ပြီး String စနစ်ဖြင့် တည်ဆောက်သည်
            imagesHtml += `<div style="text-align:center; margin:15px auto;"><img src="${compressedBase64}" alt="inserted_image" style="max-width:100%; height:auto; display:inline-block;" /></div>`;
        } catch (err) {
            console.error("Image compression error:", err);
        }
    }
    
    // Editor ထဲသို့ စာသားအနေဖြင့် အဆင်ပြေပြေ တိုက်ရိုက်ပေါင်းထည့်ခြင်း
    editor.innerHTML += imagesHtml;
    
    saveCurrentChapterContentLive();
    event.target.value = ""; // Input ကို Reset ပြန်လုပ်သည်
}

function updateChapterTitleLive() {
    if (!currentChapterId) return;
    const titleInput = document.getElementById('current-chapter-title').value;
    const chap = bookChapters.find(c => c.id === currentChapterId);
    if (chap) {
        chap.title = titleInput || "Untitled Chapter";
        renderChapterList();
    }
}

function saveCurrentChapterContentLive() {
    if (!currentChapterId) return;
    const chap = bookChapters.find(c => c.id === currentChapterId);
    if (chap) {
        chap.content = document.getElementById('editor').innerHTML;
        saveCurrentBookState();
    }
}

function addChapter() {
    const newId = "chap_" + Date.now();
    const newChap = {
        id: newId,
        title: "Chapter " + (bookChapters.length + 1),
        content: ""
    };
    bookChapters.push(newChap);
    renderChapterList();
    selectChapter(newId);
}

function renderChapterList() {
    const list = document.getElementById('chapter-list');
    list.innerHTML = "";
    bookChapters.forEach((chap) => {
        const li = document.createElement('li');
        li.className = `flex justify-between items-center p-2 rounded-lg cursor-pointer transition-all ${chap.id === currentChapterId ? 'bg-slate-700 text-white font-bold' : 'bg-slate-800 text-gray-300 hover:bg-slate-700'}`;
        li.onclick = () => selectChapter(chap.id);
        
        li.innerHTML = `
            <span class="truncate"><i class="fa-solid fa-file-lines mr-2"></i>${chap.title}</span>
            <button onclick="event.stopPropagation(); deleteChapter('${chap.id}')" class="text-rose-400 hover:text-rose-600 p-1">
                <i class="fa-solid fa-trash"></i>
            </button>
        `;
        list.appendChild(li);
    });
}

function selectChapter(id) {
    currentChapterId = id;
    const chap = bookChapters.find(c => c.id === id);
    if (chap) {
        document.getElementById('current-chapter-title').value = chap.title;
        document.getElementById('editor').innerHTML = chap.content || "";
        renderChapterList();
    }
}

function deleteChapter(id) {
    bookChapters = bookChapters.filter(c => c.id !== id);
    if (currentChapterId === id) {
        currentChapterId = bookChapters.length > 0 ? bookChapters[0].id : null;
    }
    renderChapterList();
    if (currentChapterId) selectChapter(currentChapterId);
    else {
        document.getElementById('current-chapter-title').value = "";
        document.getElementById('editor').innerHTML = "";
    }
    saveCurrentBookState();
}

async function handleCoverImage(event) {
    const file = event.target.files[0];
    if (file) {
        try {
            coverBase64 = await compressImage(file, 600, 900, 0.8);
            document.getElementById('cover-status').classList.remove('hidden');
            saveCurrentBookState();
        } catch (err) {
            console.error("Cover image error:", err);
        }
    }
}

function clearAllContent() {
    if(confirm("စာသားအားလုံးကို ဖျက်ပစ်ရန် သေချာပါသလား။")) {
        document.getElementById('editor').innerHTML = "";
        saveCurrentChapterContentLive();
    }
}

function saveCurrentBookState() {
    const state = {
        title: document.getElementById('book-title').value,
        author: document.getElementById('author').value,
        chapters: bookChapters,
        cover: coverBase64
    };
    localStorage.setItem('epub_creator_pro_state', JSON.stringify(state));
}

function loadBookState() {
    const saved = localStorage.getItem('epub_creator_pro_state');
    if (saved) {
        try {
            const state = JSON.parse(saved);
            document.getElementById('book-title').value = state.title || "";
            document.getElementById('author').value = state.author || "";
            bookChapters = state.chapters || [];
            coverBase64 = state.cover || "";
            renderChapterList();
            
            if (coverBase64 && coverBase64.includes("data:image")) {
                document.getElementById('cover-status').classList.remove('hidden');
            }
            if (bookChapters.length > 0) selectChapter(bookChapters[0].id);
        } catch(e) { 
            console.error(e);
        }
    }
}

// Pure JavaScript Base64 to Blob Decoder (Chrome Safe)
function dataUrlToBlob(dataUrl) {
    if (!dataUrl || !dataUrl.includes(',')) return null;
    try {
        const parts = dataUrl.split(',');
        const contentType = parts[0].split(':')[1].split(';')[0];
        const raw = window.atob(parts[1]);
        const rawLength = raw.length;
        const uInt8Array = new Uint8Array(rawLength);
        
        for (let i = 0; i < rawLength; ++i) {
            uInt8Array[i] = raw.charCodeAt(i);
        }
        return new Blob([uInt8Array], { type: contentType });
    } catch (e) {
        console.error("Decoder error:", e);
        return null;
    }
}

// 🚀 မည်သည့် Browser တွင်မဆို ပုံအရေအတွက် (၁ပုံမှသည် အများကြီးအထိ) ၁၀၀% ဒေါင်းလုဒ်ကျိန်းသေရစေမည့် Perfect Engine 🚀
async function generateEPUB() {
    saveCurrentBookState();
    
    if (typeof JSZip === "undefined") {
        alert("⚠️ စနစ်တစ်ခုလုံး အလုပ်လုပ်ရန် ပြင်ဆင်နေဆဲဖြစ်သည်။ စက္ကန့်အနည်းငယ် စောင့်ပြီးမှ ဒေါင်းလုဒ်ပြန်နှိပ်ပေးပါဗျာ။");
        return;
    }

    const title = document.getElementById('book-title').value || "Untitled_Book";
    const author = document.getElementById('author').value || "Unknown_Author";
    
    if(bookChapters.length === 0) {
        alert("⚠️ သတိပေးချက်: အခန်းမရှိသေးပါ။");
        return;
    }

    const zip = new JSZip();
    zip.file("mimetype", "application/epub+zip", { compression: "STORE" });
    
    const containerXml = `<?xml version="1.0" encoding="UTF-8"?><container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>`;
    zip.file("META-INF/container.xml", containerXml);

    let manifestItems = "";
    let spineItems = "";
    let globalImageCounter = 1;

    // Cover Image Handling
    if (coverBase64 && coverBase64.includes("data:image")) {
        let coverExt = "jpg"; let coverMime = "image/jpeg";
        if (coverBase64.includes("image/png")) { coverExt = "png"; coverMime = "image/png"; }
        
        const coverBlob = dataUrlToBlob(coverBase64);
        if (coverBlob) {
            zip.file(`OEBPS/images/cover.${coverExt}`, coverBlob);
            manifestItems += `<item id="cover-img" href="images/cover.${coverExt}" media-type="${coverMime}"/>\n`;
        }
    }

    // Chapters Handling
    for (let index = 0; index < bookChapters.length; index++) {
        let chap = bookChapters[index];
        let htmlString = chap.content || "";
        
        htmlString = htmlString.replace(/&nbsp;/g, '&#160;');
        htmlString = htmlString.replace(/<br>/g, '<br/>').replace(/<hr>/g, '<hr/>');

        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = htmlString;
        
        // 🌟 ဤနေရာတွင် Live HTMLCollection ကြောင့် Crash မဖြစ်စေရန် Array စစ်စစ်အဖြစ် အသေပြောင်းလဲလိုက်ခြင်း 🌟
        const imgs = Array.from(tempDiv.getElementsByTagName('img'));
        
        for (let img of imgs) {
            const src = img.getAttribute('src');
            if (src && src.startsWith('data:image')) {
                let ext = "jpg"; let mediaType = "image/jpeg";
                if (src.includes("image/png")) { ext = "png"; mediaType = "image/png"; }
                
                const filename = `image_${globalImageCounter}.${ext}`;
                const imgBlob = dataUrlToBlob(src);
                
                if (imgBlob) {
                    zip.file(`OEBPS/images/${filename}`, imgBlob);
                    manifestItems += `<item id="img_${globalImageCounter}" href="images/${filename}" media-type="${mediaType}"/>\n`;
                    // ePub ရဲ့ အတွင်းပိုင်း လမ်းကြောင်းသို့ အောင်မြင်စွာ ပြောင်းလဲသည်
                    img.setAttribute('src', `images/${filename}`);
                    globalImageCounter++;
                }
            }
        }

        const finalizedHtml = tempDiv.innerHTML;

        const chapHtml = `<?xml version="1.0" encoding="utf-8"?>
        <!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.1//EN" "http://www.w3.org/TR/xhtml11/DTD/xhtml11.dtd">
        <html xmlns="http://www.w3.org/1999/xhtml">
        <head><title>${chap.title}</title></head>
        <body>
            <h1>${chap.title}</h1>
            <div>${finalizedHtml}</div>
        </body>
        </html>`;
        
        zip.file(`OEBPS/chapter_${index + 1}.xhtml`, chapHtml);
        manifestItems += `<item id="chap_${index + 1}" href="chapter_${index + 1}.xhtml" media-type="application/xhtml+xml"/>\n`;
        spineItems += `<itemref idref="chap_${index + 1}"/>\n`;
    }

    const opfXml = `<?xml version="1.0" encoding="UTF-8"?>
    <package xmlns="http://www.idpf.org/2007/opf" unique-identifier="bookid" version="2.0">
        <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
            <dc:title>${title}</dc:title><dc:creator>${author}</dc:creator><dc:language>my</dc:language>
            <dc:identifier id="bookid">urn:uuid:${Date.now()}</dc:identifier>
            ${(coverBase64 && coverBase64.includes("data:image")) ? '<meta name="cover" content="cover-img"/>' : ''}
        </metadata>
        <manifest><item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>${manifestItems}</manifest>
        <spine toc="ncx">${spineItems}</spine>
    </package>`;
    zip.file("OEBPS/content.opf", opfXml);

    let ncxNav = "";
    bookChapters.forEach((chap, index) => {
        ncxNav += `<navPoint id="nav_${index + 1}" playOrder="${index + 1}"><navLabel><text>${chap.title}</text></navLabel><content src="chapter_${index + 1}.xhtml"/></navPoint>\n`;
    });

    const ncxXml = `<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE ncx PUBLIC "-//NISO//DTD ncx v2005-1//EN" "http://www.daisy.org/z3986/2005/ncx-2005-1.dtd"><ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1"><head><meta name="dtb:uid" content="${Date.now()}"/></head><docTitle><text>${title}</text></docTitle><navMap>${ncxNav}</navMap></ncx>`;
    zip.file("OEBPS/toc.ncx", ncxXml);

    // ZIP Compilation
    zip.generateAsync({ type: "blob", mimeType: "application/epub+zip" }).then(function (blob) {
        const filename = title.replace(/\s+/g, '_') + ".epub";
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        
        setTimeout(() => {
            document.body.removeChild(a);
            window.URL.revokeObjectURL(downloadUrl);
        }, 1500);
    }).catch(function(err) {
        alert("ဒေါင်းလုဒ်ဆွဲရာတွင် အမှားအယွင်းရှိနေပါသည်။");
    });
}

function exportToBackupFile() {
    const saved = localStorage.getItem('epub_creator_pro_state');
    if (!saved) return alert("⚠️ သိမ်းဆည်းရန် ဒေတာမရှိပါ။");
    const blob = new Blob([saved], { type: "application/json" });
    
    const downloadUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = "epub_book_backup.json";
    a.click();
    setTimeout(() => window.URL.revokeObjectURL(downloadUrl), 1000);
}

function importFromBackupFile(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        localStorage.setItem('epub_creator_pro_state', e.target.result);
        loadBookState();
    };
    reader.readAsText(file);
}

function resetCurrentBookState() {
    if(confirm("စာအုပ်အသစ်ရေးရန် အချက်အလက်အားလုံးကို အကုန်ဖျက်မလား။")) {
        localStorage.removeItem('epub_creator_pro_state');
        location.reload();
    }
}

window.onload = loadBookState;
