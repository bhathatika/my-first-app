let bookChapters = [];
let currentChapterId = null;
let coverBase64 = "";

// Text Format Commands
function execCmd(command) {
    document.execCommand(command, false, null);
    saveCurrentChapterContentLive();
}

// ဓာတ်ပုံအရွယ်အစားကို အလိုအလျောက်ချုံ့ပေးပြီး ဒေါင်းလုဒ်အဆင်ပြေစေမည့် Image Compressor စနစ်
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

// တစ်ခါတည်းနဲ့ ဓာတ်ပုံ အများကြီး (Multiple) အလိုအလျောက် ချုံ့ပြီး စာအကွက်ထဲ စီထည့်ပေးမည့် စနစ်
async function insertImagesToEditor(event) {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    
    const editor = document.getElementById('editor');
    editor.focus();

    for (let i = 0; i < files.length; i++) {
        try {
            const compressedBase64 = await compressImage(files[i], 800, 800, 0.75);
            
            const selection = window.getSelection();
            if (selection.rangeCount > 0) {
                const range = selection.getRangeAt(0);
                if (editor.contains(range.commonAncestorContainer)) {
                    const img = document.createElement('img');
                    img.src = compressedBase64;
                    img.alt = "inserted_image";
                    
                    range.deleteContents();
                    range.insertNode(img);
                    
                    range.setStartAfter(img);
                    range.setEndAfter(img);
                    selection.removeAllRanges();
                    selection.addRange(range);
                    continue;
                }
            }
            editor.innerHTML += `<div><img src="${compressedBase64}" alt="inserted_image"/></div>`;
        } catch (err) {
            console.error("Image loading error:", err);
        }
    }
    
    saveCurrentChapterContentLive();
    event.target.value = ""; 
}

// အခန်းခေါင်းစဉ် Live ပြောင်းလဲခြင်း
function updateChapterTitleLive() {
    if (!currentChapterId) return;
    const titleInput = document.getElementById('current-chapter-title').value;
    const chap = bookChapters.find(c => c.id === currentChapterId);
    if (chap) {
        chap.title = titleInput || "Untitled Chapter";
        renderChapterList();
    }
}

// အခန်းပါဝင်မှုများကို Live သိမ်းဆည်းခြင်း
function saveCurrentChapterContentLive() {
    if (!currentChapterId) return;
    const chap = bookChapters.find(c => c.id === currentChapterId);
    if (chap) {
        chap.content = document.getElementById('editor').innerHTML;
        saveCurrentBookState();
    }
}

// အခန်းအသစ်တိုးခြင်း
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

// အခန်းများစာရင်း ပြသခြင်း
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

// အခန်းကို ရွေးချယ်ကြည့်ရှုခြင်း
function selectChapter(id) {
    currentChapterId = id;
    const chap = bookChapters.find(c => c.id === id);
    if (chap) {
        document.getElementById('current-chapter-title').value = chap.title;
        document.getElementById('editor').innerHTML = chap.content || "";
        renderChapterList();
    }
}

// အခန်းဖျက်ခြင်း
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

// မျက်နှာဖုံးပုံစနစ် (Error ကို အလိုအလျောက် ကျော်သွားစေရန် ပြင်ဆင်ထားသည်)
async function handleCoverImage(event) {
    const file = event.target.files[0];
    if (file) {
        try {
            coverBase64 = await compressImage(file, 600, 900, 0.8);
            document.getElementById('cover-status').classList.remove('hidden');
            saveCurrentBookState();
        } catch (err) {
            console.error("Cover image compression failed:", err);
            // အစ်ကို့ဆီမှာ Alert ထပ်မပြစေရန် ဖြုတ်ပေးလိုက်ပါသည်
        }
    }
}

// စာသားအားလုံး ဖျက်ထုတ်ခြင်း
function clearAllContent() {
    if(confirm("စာသားအားလုံးကို ဖျက်ပစ်ရန် သေချာပါသလား။")) {
        document.getElementById('editor').innerHTML = "";
        saveCurrentChapterContentLive();
    }
}

// ဒေတာများအား LocalStorage တွင် သိမ်းခြင်း
function saveCurrentBookState() {
    const state = {
        title: document.getElementById('book-title').value,
        author: document.getElementById('author').value,
        chapters: bookChapters,
        cover: coverBase64
    };
    localStorage.setItem('epub_creator_pro_state', JSON.stringify(state));
}

// ดေတာများ ပြန်ခေါ်ခြင်း (Safe Load စနစ်ဖြင့် ပြင်ဆင်ထားသည်)
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
            
            // Base64 မှန်မမှန် စစ်ဆေးပြီးမှ Status ပြရန်
            if (coverBase64 && coverBase64.includes("data:image")) {
                document.getElementById('cover-status').classList.remove('hidden');
            } else {
                coverBase64 = ""; // မှားနေလျှင် ရှင်းထုတ်ပစ်ရန်
            }
            
            if (bookChapters.length > 0) selectChapter(bookChapters[0].id);
        } catch(e) { 
            console.error("Data load error, resetting state:", e);
            localStorage.removeItem('epub_creator_pro_state');
        }
    }
}

// Base64 မှ Blob ပြောင်းလဲခြင်း
function base64ToBlob(base64Str) {
    if (!base64Str || !base64Str.includes(",")) return null;
    try {
        const parts = base64Str.split(',');
        const byteString = atob(parts[1]);
        const mimeString = parts[0].split(':')[1].split(';')[0];
        const ab = new ArrayBuffer(byteString.length);
        const ia = new Uint8Array(ab);
        for (let i = 0; i < byteString.length; i++) {
            ia[i] = byteString.charCodeAt(i);
        }
        return new Blob([ab], { type: mimeString });
    } catch (e) {
        console.error("Base64 to Blob conversion failed:", e);
        return null;
    }
}

// Generate EPUB စနစ်
async function generateEPUB() {
    saveCurrentBookState();
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
    let imageCounter = 1;

    for (let index = 0; index < bookChapters.length; index++) {
        let chap = bookChapters[index];
        let htmlString = chap.content || "";
        htmlString = htmlString.replace(/&nbsp;/g, '&#160;');

        const parser = new DOMParser();
        const doc = parser.parseFromString(`<div>${htmlString}</div>`, 'text/html');
        const container = doc.body.firstChild;

        const imgs = container.querySelectorAll('img');
        for (let img of imgs) {
            const src = img.getAttribute('src');
            if (src && src.startsWith('data:image')) {
                let ext = "jpg"; let mediaType = "image/jpeg";
                if (src.includes("image/png")) { ext = "png"; mediaType = "image/png"; }
                const filename = `image_${imageCounter}.${ext}`;
                const imgBlob = base64ToBlob(src);
                if (imgBlob) {
                    zip.file(`OEBPS/images/${filename}`, imgBlob);
                    manifestItems += `<item id="img_${imageCounter}" href="images/${filename}" media-type="${mediaType}"/>\n`;
                    img.setAttribute('src', `images/${filename}`);
                    imageCounter++;
                }
            }
        }

        const serializer = new XMLSerializer();
        let finalizedXhtmlContent = serializer.serializeToString(container);
        finalizedXhtmlContent = finalizedXhtmlContent.replace(/^<div[^>]*>/, '').replace(/<\/div>$/, '');

        const chapHtml = `<?xml version="1.0" encoding="utf-8"?>
        <!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.1//EN" "http://www.w3.org/TR/xhtml11/DTD/xhtml11.dtd">
        <html xmlns="http://www.w3.org/1999/xhtml">
        <head><title>${chap.title}</title></head>
        <body><h1>${chap.title}</h1><div>${finalizedXhtmlContent}</div></body>
        </html>`;
        
        zip.file(`OEBPS/chapter_${index + 1}.xhtml`, chapHtml);
        manifestItems += `<item id="chap_${index + 1}" href="chapter_${index + 1}.xhtml" media-type="application/xhtml+xml"/>\n`;
        spineItems += `<itemref idref="chap_${index + 1}"/>\n`;
    }

    if (coverBase64 && coverBase64.includes("data:image")) {
        let coverExt = "jpg"; let coverMime = "image/jpeg";
        if (coverBase64.includes("image/png")) { coverExt = "png"; coverMime = "image/png"; }
        const coverBlob = base64ToBlob(coverBase64);
        if (coverBlob) {
            zip.file(`OEBPS/images/cover.${coverExt}`, coverBlob);
            manifestItems += `<item id="cover-img" href="images/cover.${coverExt}" media-type="${coverMime}"/>\n`;
        }
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
        }, 1000);
    }).catch(function(err) {
        alert("ဒေါင်းလုဒ်ဆွဲရာတွင် အမှားအယွင်းရှိနေပါသည်။");
    });
}

// Backup စနစ်များ
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
