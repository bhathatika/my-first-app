// 🚀 ၁။ ePub ဖိုင် ထုတ်ယူမည့် လုပ်ဆောင်ချက် (iOS Chrome/Firefox ပါ အလုပ်လုပ်အောင် ပြင်ဆင်ပြီး)
async function generateEPUB() {
    await saveCurrentBookState();
    const title = document.getElementById('book-title').value || "Untitled Book";
    const author = document.getElementById('author').value || "Unknown Author";
    
    if(!bookChapters || bookChapters.length === 0) {
        alert("⚠️ သတိပေးချက်: အခန်းမရှိသေးပါ။ '+ အခန်းတိုးမည်' ကို နှိပ်ပေးပါ။");
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
        
        // 🌟 [ပြင်ဆင်ချက်] iOS Chrome (CriOS) နှင့် Firefox (FxiOS) စစ်ဆေးခြင်း
        if (navigator.userAgent.match('CriOS') || navigator.userAgent.match('FxiOS')) {
            const reader = new FileReader();
            reader.onloadend = function() {
                window.open(reader.result, '_blank');
            };
            reader.readAsDataURL(blob);
        } else {
            // Safari နှင့် တခြား Browser များအတွက် ပုံမှန်ဒေါင်းလုဒ်စနစ်
            const reader = new FileReader();
            reader.onloadend = function() {
                const a = document.createElement('a');
                a.href = reader.result;
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                setTimeout(() => { document.body.removeChild(a); }, 500);
            };
            reader.readAsDataURL(blob);
        }
    }).catch(function (err) { alert("ePub Error: " + err.message); });
}

// 📦 ၂။ စာအုပ် BACKUP ဖိုင်ထုတ်ယူမည့် လုပ်ဆောင်ချက် (iOS Chrome/Firefox ပါ အလုပ်လုပ်အောင် ပြင်ဆင်ပြီး)
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
                alert("⚠️ သိမ်းဆည်းထားသည့် ဒေတာမရှိသေးပါ။");
                return;
            }
            const jsonString = JSON.stringify(state);
            const blob = new Blob([jsonString], { type: "application/json" });
            const filename = (state.title || "My_Novel").replace(/\s+/g, '_') + "_backup.json";

            // 🌟 [ပြင်ဆင်ချက်] iOS Chrome (CriOS) နှင့် Firefox (FxiOS) စစ်ဆေးခြင်း
            if (navigator.userAgent.match('CriOS') || navigator.userAgent.match('FxiOS')) {
                const reader = new FileReader();
                reader.onloadend = function() {
                    window.open(reader.result, '_blank');
                };
                reader.readAsDataURL(blob);
            } else {
                // Safari နှင့် တခြား Browser များအတွက် ပုံမှန်ဒေါင်းလုဒ်စနစ်
                const reader = new FileReader();
                reader.onloadend = function() {
                    const a = document.createElement('a');
                    a.href = reader.result;
                    a.download = filename;
                    document.body.appendChild(a);
                    a.click();
                    setTimeout(() => { document.body.removeChild(a); }, 500);
                };
                reader.readAsDataURL(blob);
            }
        };
    } catch (error) {
        alert("Backup ဖိုင်ထုတ်ယူမှု မအောင်မြင်ပါ: " + error.message);
    }
}
