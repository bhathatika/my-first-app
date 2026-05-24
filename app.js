// ==========================================
// ၁။ SAVE BOOK STATE FUNCTION (ဓာတ်ပုံဒေတာ ချန်လှပ်၍ Size Error ကင်းဝေးစေရန် ပြင်ဆင်ပြီး)
// ==========================================
function saveCurrentBookState() {
    const editorContent = tinymce.activeEditor ? tinymce.activeEditor.getContent() : "";
    
    if (currentChapterIndex === null || currentChapterIndex === undefined) {
        if (bookChapters && bookChapters.length > 0) {
            currentChapterIndex = 0;
        }
    }

    if (currentChapterIndex !== null && bookChapters[currentChapterIndex]) {
        bookChapters[currentChapterIndex].content = editorContent;
    }
    
    // ⚠️ LOCALSTORAGE QUOTA ERROR မတက်စေရန်အတွက် 
    // ဓာတ်ပုံ Base64 ဒေတာများမပါဘဲ စာသားသီးသန့်ကိုသာ Backup သိမ်းဆည်းမည့်စနစ်
    const safeChapters = bookChapters.map(chap => {
        let cleanContent = chap.content || "";
        // ဓာတ်ပုံများ၏ Base64 src နေရာတွင် ဒေတာပမာဏ လျော့ကျစေရန် ခေတ္တ အစားထိုးခြင်း
        cleanContent = cleanContent.replace(/src="data:image\/[^"]+"/g, 'src="" data-skip-backup="true"');
        return {
            title: chap.title,
            content: cleanContent
        };
    });

    try {
        localStorage.setItem('saved_book_title', document.getElementById('book-title').value);
        localStorage.setItem('saved_book_author', document.getElementById('author').value);
        localStorage.setItem('saved_book_chapters', JSON.stringify(safeChapters)); // စာသားသီးသန့်တင်မို့ Size အရမ်းသေးသွားပါပြီ
        
        // မျက်နှာဖုံးပုံသည်လည်း ကြီးမားနိုင်သဖြင့် try-catch ဖြင့် သီးသန့်ကာကွယ်သိမ်းဆည်းခြင်း
        if (coverBase64 && coverBase64.length < 2000000) { // 2MB အောက်မှသာ သိမ်းမည်
            localStorage.setItem('saved_book_cover', coverBase64);
        }
    } catch (e) {
        console.log("Local Storage Backup Skipped due to size, but allowed to generate EPUB.");
    }
}

// ==========================================
// ၂။ GENERATE EPUB FUNCTION (ချွတ်ယွင်းချက်မရှိ အလုပ်လုပ်မည့် စနစ်သစ်)
// ==========================================
function generateEPUB() {
    // လက်ရှိစာကို အရင်သိမ်းမည် (အပေါ်က စနစ်သစ်ကြောင့် Error တက်ပြီး ကုဒ်ရပ်သွားခြင်း မရှိတော့ပါ)
    saveCurrentBookState(); 
    
    const title = document.getElementById('book-title').value || "Untitled Book";
    const author = document.getElementById('author').value || "Unknown Author";
    
    if(!bookChapters || bookChapters.length === 0) {
        alert("⚠️ သတိပေးချက်: အခန်း (Chapter) မရှိသေးပါ။ နှိပ်၍ အခန်းအရင်တိုးပေးပါဗျာ။");
        return;
    }

    // စာသားများ အခန်းထဲသို့ ရောက်ရှိစေရန်
    let hasContent = bookChapters.some(chap => chap.content && chap.content.trim() !== "");
    if (!hasContent) {
        const editorContent = tinymce.activeEditor ? tinymce.activeEditor.getContent() : "";
        if (editorContent.trim() !== "") {
            bookChapters[0].content = editorContent;
        } else {
            alert("⚠️ သတိပေးချက်: အခန်းထဲတွင် မည်သည့်စာသား သို့မဟုတ် ဓာတ်ပုံမျှ မရှိသေးပါ။");
            return;
        }
    }

    if (typeof JSZip === 'undefined') {
        alert("JSZip Library မတက်သေးပါ၊ ခေတ္တစောင့်ပြီး ပြန်ကြိုးစားပေးပါ။");
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

    // အမှန်တကယ် ePub ထုတ်လုပ်ရာတွင် တည်းဖြတ်မှုပြုလုပ်ရန်အတွက် Editor မှ တိုက်ရိုက် Data ယူခြင်း
    const actualChapters = JSON.parse(JSON.stringify(bookChapters));
    if (actualChapters[currentChapterIndex] && tinymce.activeEditor) {
        actualChapters[currentChapterIndex].content = tinymce.activeEditor.getContent();
    }

    actualChapters.forEach((chap, index) => {
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

        // ဓာတ်ပုံများကို ePub ဖိုင်ထဲသို့ ပေါင်းထည့်ခြင်း (Size ကြီးသော်လည်း zip ထဲသို့ တိုက်ရိုက်ထည့်သဖြင့် အောင်မြင်ပါမည်)
        const imgs = container.querySelectorAll('img');
        imgs.forEach(img => {
            const src = img.getAttribute('src');
            if (src && src.startsWith('data:image')) {
                let ext = "jpg";
                let mediaType = "image/jpeg";
                if (src.includes("image/png")) { ext = "png"; mediaType = "image/png"; }
                else if (src.includes("image/gif")) { ext = "gif"; mediaType = "image/gif"; }

                const filename = `image_${imageCounter}.${ext}`;
                const imgBlob = base64ToBlob(src);
                
                zip.file(`OEBPS/images/${filename}`, imgBlob);
                manifestItems += `<item id="img_${imageCounter}" href="images/${filename}" media-type="${mediaType}"/>\n`;
                img.setAttribute('src', `images/${filename}`);
                if (!img.getAttribute('alt')) img.setAttribute('alt', `photo_${imageCounter}`);
                imageCounter++;
            }
        });

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
                img { max-width: 100%; height: auto; display: block; margin: 15px auto; border-radius: 6px; box-shadow: 0 2px 5px rgba(0,0,0,0.15); }
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
    });

    if (coverBase64) {
        let coverExt = "jpg";
        let coverMime = "image/jpeg";
        if (coverBase64.includes("image/png")) { coverExt = "png"; coverMime = "image/png"; }
        const coverBlob = base64ToBlob(coverBase64);
        zip.file(`OEBPS/images/cover.${coverExt}`, coverBlob);
        manifestItems += `<item id="cover-img" href="images/cover.${coverExt}" media-type="${coverMime}"/>\n`;
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
    actualChapters.forEach((chap, index) => {
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
        
        // Safari Flow ဒေါင်းလုဒ်ဆွဲခြင်းစနစ်
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
    }).catch(function (err) {
        alert("ePub Generation Error: " + err.message);
    });
}
