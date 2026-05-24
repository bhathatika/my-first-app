// =========================================================================
// 🚀 ၁။ ePub ဖိုင် ထုတ်ယူမည့် လုပ်ဆောင်ချက် (iOS Chrome/Firefox တွင် မပျက်ကျအောင် ပြင်ဆင်ပြီး)
// =========================================================================
async function generateEPUB() {
    await saveCurrentBookState();
    const title = document.getElementById('book-title').value || "Untitled Book";
    const author = document.getElementById('author').value || "Unknown Author";
    
    if(!bookChapters || bookChapters.length === 0) {
        // ဘာသာစကားအလိုက် Alert ပြသခြင်း
        const currentLang = localStorage.getItem('lang') || 'my';
        if(currentLang === 'en') {
            alert("⚠️ Warning: No chapters found. Please click '+ Add Chapter'.");
        } else {
            alert("⚠️ သတိပေးချက်: အခန်းမရှိသေးပါ။ '+ အခန်းတိုးမည်' ကို နှိပ်ပေးပါ။");
        }
        return;
    }

    const zip = new JSZip();
    zip.file("mimetype", "application/epub+zip", { compression: "STORE" });
    
    const containerXml = `<?xml version="1.0" encoding="UTF-8"?>
    <container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
        <rootfiles>
            <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
        </rootfiles>
    </container>`;
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

        const brs = container.querySelectorAll('br');
        brs.forEach(br => {
            const pBr = doc.createElement('p');
            pBr.innerHTML = '&#160;';
            br.replaceWith(pBr);
        });

        const imgs = container.querySelectorAll('img');
        for (let img of imgs) {
            const src = img.getAttribute('src');
            if (src && src.startsWith('data:image')) {
                let ext = "jpg";
                let mediaType = "image/jpeg";
                if (src.includes("image/png")) { ext = "png"; mediaType = "image/png"; }
                else if (src.includes("image/gif")) { ext = "gif"; mediaType = "image/gif"; }

                const filename = `image_${imageCounter}.${ext}`;
                const imgBlob = base64ToBlob(src);
                
                if (imgBlob) {
                    zip.file(`OEBPS/images/${filename}`, imgBlob);
                    manifestItems += `<item id="img_${imageCounter}" href="images/${filename}" media-type="${mediaType}"/>\n`;
                    img.setAttribute('src', `images/${filename}`);
                    if (!img.getAttribute('alt')) img.setAttribute('alt', `photo_${imageCounter}`);
                    imageCounter++;
                } else { img.remove(); }
            }
        }

        const serializer = new XMLSerializer();
        let finalizedXhtmlContent = serializer.serializeToString(container);
        finalizedXhtmlContent = finalizedXhtmlContent.replace(/^<div[^>]*>/, '').replace(/<\/div>$/, '');

        const chapHtml = `<?xml version="1.0" encoding="utf-8"?>
        <!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.1//EN" "http://www.w3.org/TR/xhtml11/DTD/xhtml11.dtd">
        <html xmlns="http://www.w3.org/1999/xhtml">
        <head>
            <title>${chap.title}</title>
            <style>
                body { padding: 20px; font-family: sans-serif; line-height: 1.6; color: #111111; background-color: #ffffff; }
                img { max-width: 100%; height: auto; display: block; margin: 15px auto; border-radius: 6px; }
                h1 { font-size: 1.5em; text-align: center; margin-bottom: 20px; color: #1e2640; }
                p { margin-bottom: 0.8em; text-align: justify; line-height: 1.6; }
            </style>
        </head>
        <body>
            <h1>${chap.title}</h1>
            <div>${finalizedXhtmlContent}</div>
        </body>
        </html>`;
        
        zip.file(`OEBPS/chapter_${index + 1}.xhtml`, chapHtml);
        manifestItems += `<item id="chap_${index + 1}" href="chapter_${index + 1}.xhtml" media-type="application/xhtml+xml"/>\n`;
        spineItems += `<itemref idref="chap_${index + 1}"/>\n`;
    }

    if (coverBase64) {
        let coverExt = "jpg";
        let coverMime = "image/jpeg";
        if (coverBase64.includes("image/png")) { coverExt = "png"; coverMime = "image/png"; }
        const coverBlob = base64ToBlob(coverBase64);
        if (coverBlob) {
            zip.file(`OEBPS/images/cover.${coverExt}`, coverBlob);
            manifestItems += `<item id="cover-img" href="images/cover.${coverExt}" media-type="${coverMime}"/>\n`;
        }
    }

    const opfXml = `<?xml version="1.0" encoding="UTF-8"?>
    <package xmlns="http://www.idpf.org/2007/opf" unique-identifier="bookid" version="2.0">
        <metadata xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:opf="http://www.idpf.org/2007/opf">
            <dc:title>${title}</dc:title>
            <dc:creator opf:role="aut">${author}</dc:creator>
            <dc:language>my</dc:language>
            <dc:identifier id="bookid">urn:uuid:${Date.now()}</dc:identifier>
             ${coverBase64 ? '<meta name="cover" content="cover-img"/>' : ''}
        </metadata>
        <manifest>
            <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
            ${manifestItems}
        </manifest>
        <spine toc="ncx">
            ${spineItems}
        </spine>
    </package>`;
    zip.file("OEBPS/content.opf", opfXml);

    let ncxNav = "";
    bookChapters.forEach((chap, index) => {
        ncxNav += `<navPoint id="nav_${index + 1}" playOrder="${index + 1}">
            <navLabel><text>${chap.title}</text></navLabel>
            <content src="chapter_${index + 1}.xhtml"/>
        </navPoint>\n`;
    });

    const ncxXml = `<?xml version="1.0" encoding="UTF-8"?>
    <!DOCTYPE ncx PUBLIC "-//NISO//DTD ncx v2005-1//EN" "http://www.daisy.org/z3986/2005/ncx-2005-1.dtd">
    <ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
        <head>
            <meta name="dtb:uid" content="urn:uuid:${Date.now()}"/>
            <meta name="dtb:depth" content="1"/>
        </head>
        <docTitle><text>${title}</text></docTitle>
        <navMap>${ncxNav}</navMap>
    </ncx>`;
    zip.file("OEBPS/toc.ncx", ncxXml);

    zip.generateAsync({ type: "blob", mimeType: "application/epub+zip" }).then(function (blob) {
        const filename = title.replace(/\s+/g, '_') + ".epub";
        const fileURL = URL.createObjectURL(blob);
        
        if (navigator.userAgent.match('CriOS') || navigator.userAgent.match('FxiOS')) {
            window.open(fileURL, '_blank');
        } else {
            const a = document.createElement('a');
            a.href = fileURL;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(fileURL); }, 500);
        }
    }).catch(function (err) { alert("ePub Error: " + err.message); });
}

// =========================================================================
// 📦 ၂။ စာအုပ် BACKUP ဖိုင်ထုတ်ယူမည့် လုပ်ဆောင်ချက်
// =========================================================================
async function exportToBackupFile() {
    try {
        await saveCurrentBookState();
        const db = await initDB();
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const getRequest = store.get('currentBook');
        
        getRequest.onsuccess = function() {
            const state = getRequest.result;
            if (!state) {
                const currentLang = localStorage.getItem('lang') || 'my';
                alert(currentLang === 'en' ? "⚠️ No backup data found." : "⚠️ သိမ်းဆည်းထားသည့် ဒေတာမရှိသေးပါ။");
                return;
            }
            const jsonString = JSON.stringify(state);
            const blob = new Blob([jsonString], { type: "application/json" });
            const filename = (state.title || "My_Novel").replace(/\s+/g, '_') + "_backup.json";
            const fileURL = URL.createObjectURL(blob);

            if (navigator.userAgent.match('CriOS') || navigator.userAgent.match('FxiOS')) {
                window.open(fileURL, '_blank');
            } else {
                const a = document.createElement('a');
                a.href = fileURL;
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(fileURL); }, 500);
            }
        };
    } catch (error) {
        alert("Backup Error: " + error.message);
    }
}

// =========================================================================
// 🌙 ၃။ NIGHT MODE (DARK THEME) လုပ်ဆောင်ချက်
// =========================================================================
function toggleTheme() {
    const body = document.body;
    const btn = document.getElementById('theme-toggle');
    body.classList.toggle('dark-mode');
    
    // Theme အလိုက် CSS Style များကို သီးသန့်မခွဲဘဲ JavaScript ကနေ တိုက်ရိုက်ထိန်းချုပ်ခြင်း (အန္တရာယ်ကင်းစေရန်)
    if (body.classList.contains('dark-mode')) {
        document.documentElement.style.setProperty('--bg-color', '#121212');
        document.documentElement.style.setProperty('--text-color', '#e0e0e0');
        btn.innerText = "☀️ Light Mode";
        localStorage.setItem('theme', 'dark');
        applyDarkStyles(true);
    } else {
        document.documentElement.style.setProperty('--bg-color', '#ffffff');
        document.documentElement.style.setProperty('--text-color', '#111111');
        btn.innerText = "🌙 Night Mode";
        localStorage.setItem('theme', 'light');
        applyDarkStyles(false);
    }
}

function applyDarkStyles(isDark) {
    // UI Element များကို လိုက်လံအရောင်ပြောင်းပေးခြင်း
    const container = document.querySelector('.main-container') || document.body;
    if(isDark) {
        container.style.backgroundColor = "#121212";
        container.style.color = "#e0e0e0";
        document.querySelectorAll('input, textarea, select').forEach(el => {
            el.style.backgroundColor = "#2d2d2d";
            el.style.color = "#ffffff";
            el.style.borderColor = "#444444";
        });
    } else {
        container.style.backgroundColor = "";
        container.style.color = "";
        document.querySelectorAll('input, textarea, select').forEach(el => {
            el.style.backgroundColor = "";
            el.style.color = "";
            el.style.borderColor = "";
        });
    }
}

// =========================================================================
// 🌐 ၄။ LANGUAGE (မြန်မာ / English) ပြောင်းလဲခြင်း လုပ်ဆောင်ချက်
// =========================================================================
const translations = {
    my: {
        themeLight: "☀️ Light Mode",
        themeDark: "🌙 Night Mode",
        bookTitle: "စာအုပ်အမည် (Book Title)",
        author: "စာရေးဆရာ (Author)",
        addChapter: "+ အခန်းတိုးမည်",
        exportEpub: "📩 ePub ဖိုင် ထုတ်ယူမည်",
        backupBtn: "Backup ဖိုင်သိမ်းမည်"
    },
    en: {
        themeLight: "☀️ Light Mode",
        themeDark: "🌙 Light Mode",
        bookTitle: "Book Title",
        author: "Author Name",
        addChapter: "+ Add Chapter",
        exportEpub: "📩 Export ePub",
        backupBtn: "Save Backup"
    }
};

function changeLanguage() {
    const lang = document.getElementById('lang-select').value;
    localStorage.setItem('lang', lang);
    
    // UI ပေါ်က စာသားများကို လိုက်လံပြောင်းလဲခြင်း
    const bookTitleInput = document.getElementById('book-title');
    const authorInput = document.getElementById('author');
    const addChapterBtn = document.getElementById('add-chapter-btn') || document.querySelector('button[onclick*="addChapter"]');
    const epubBtn = document.getElementById('export-epub-btn') || document.querySelector('button[onclick*="generateEPUB"]');
    
    if (lang === 'en') {
        if(bookTitleInput) bookTitleInput.placeholder = translations.en.bookTitle;
        if(authorInput) authorInput.placeholder = translations.en.author;
        if(addChapterBtn) addChapterBtn.innerText = translations.en.addChapter;
        if(epubBtn) epubBtn.innerText = translations.en.exportEpub;
    } else {
        if(bookTitleInput) bookTitleInput.placeholder = translations.my.bookTitle;
        if(authorInput) authorInput.placeholder = translations.my.author;
        if(addChapterBtn) addChapterBtn.innerText = translations.my.addChapter;
        if(epubBtn) epubBtn.innerText = translations.my.exportEpub;
    }
}

// =========================================================================
// ⚙️ ၅။ APP စဖွင့်ချိန်တွင် အလိုအလျောက် ပတ်ဝန်းကျင် သတ်မှတ်ပေးခြင်း
// =========================================================================
function initUserPreferences() {
    // ယခင်ရွေးချယ်ခဲ့သော Night Mode အခြေအနေကို စစ်ဆေးပြီး ပြန်ဖွင့်ပေးခြင်း
    if (localStorage.getItem('theme') === 'dark') {
        document.body.classList.add('dark-mode');
        const btn = document.getElementById('theme-toggle');
        if(btn) btn.innerText = "☀️ Light Mode";
        applyDarkStyles(true);
    }
    
    // ယခင်ရွေးချယ်ခဲ့သော ဘာသာစကားကို ပြန်ဖွင့်ပေးခြင်း
    const savedLang = localStorage.getItem('lang');
    const langSelect = document.getElementById('lang-select');
    if (savedLang && langSelect) {
        langSelect.value = savedLang;
        changeLanguage();
    }
}

// စာမျက်နှာ Load ဖြစ်ပြီးတာနဲ့ Preferences တွေကို တန်းပြီး run ပေးရန်
setTimeout(initUserPreferences, 500);
