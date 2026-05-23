let chapters = [];
let activeChapterIndex = null;
let quill = null;

// Initialize Quill Rich Text Editor
document.addEventListener('DOMContentLoaded', () => {
    quill = new Quill('#editor', {
        theme: 'snow',
        placeholder: 'ဒီနေရာမှာ စာသားများ ရိုက်ထည့်ပါ...',
        modules: {
            toolbar: [
                ['bold', 'italic', 'underline'],
                [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                ['image', 'clean'] // Image Tool ကိုပါ အသေအချာ ထည့်သွင်းထားပါတယ်
            ]
        }
    });

    quill.on('text-change', () => {
        if (activeChapterIndex !== null && chapters[activeChapterIndex]) {
            chapters[activeChapterIndex].content = quill.root.innerHTML;
        }
    });
});

// UI Elements
const btnAddChapter = document.getElementById('btnAddChapter');
const chaptersListContainer = document.getElementById('chaptersListContainer');
const activeEditorSection = document.getElementById('activeEditorSection');
const activeChTitle = document.getElementById('activeChTitle');
const btnGenerate = document.getElementById('btnGenerate');
const btnBackup = document.getElementById('btnBackup');
const btnLoadBackup = document.getElementById('btnLoadBackup');
const fileInput = document.getElementById('fileInput');
const btnReset = document.getElementById('btnReset');

btnAddChapter.addEventListener('click', () => {
    const newChapter = {
        title: `အခန်း (${chapters.length + 1})`,
        content: ''
    };
    chapters.push(newChapter);
    renderChapters();
    selectChapter(chapters.length - 1);
});

activeChTitle.addEventListener('input', (e) => {
    if (activeChapterIndex !== null && chapters[activeChapterIndex]) {
        chapters[activeChapterIndex].title = e.target.value;
        const btn = document.querySelector(`[data-index="${activeChapterIndex}"] .ch-title-text`);
        if (btn) btn.innerText = e.target.value;
    }
});

function renderChapters() {
    chaptersListContainer.innerHTML = '';
    chapters.forEach((ch, idx) => {
        const div = document.createElement('div');
        div.className = 'flex items-center justify-between bg-gray-700 p-2 rounded-lg gap-2 border border-gray-600';
        div.setAttribute('data-index', idx);
        
        if(idx === activeChapterIndex) div.classList.add('active-chapter');

        div.innerHTML = `
            <button class="flex-1 text-left text-sm font-medium truncate py-1 ch-title-text">${ch.title}</button>
            <button class="text-rose-400 hover:text-rose-300 font-bold px-2 py-1 text-sm btn-delete">&times;</button>
        `;

        div.querySelector('.ch-title-text').addEventListener('click', () => selectChapter(idx));
        
        div.querySelector('.btn-delete').addEventListener('click', (e) => {
            e.stopPropagation();
            if(confirm('ဤအခန်းကို ဖျက်ရန် သေချာပါသလား?')) {
                chapters.splice(idx, 1);
                if (activeChapterIndex === idx) {
                    activeChapterIndex = null;
                    activeEditorSection.classList.add('hidden');
                } else if (activeChapterIndex > idx) {
                    activeChapterIndex--;
                }
                renderChapters();
                if(activeChapterIndex !== null) selectChapter(activeChapterIndex);
            }
        });

        chaptersListContainer.appendChild(div);
    });
}

function selectChapter(idx) {
    if (idx < 0 || idx >= chapters.length) return;
    activeChapterIndex = idx;
    
    renderChapters();
    activeEditorSection.classList.remove('hidden');
    activeChTitle.value = chapters[idx].title;
    
    if (quill) {
        quill.root.innerHTML = chapters[idx].content || '';
    }
    
    activeEditorSection.scrollIntoView({ behavior: 'smooth' });
}

// XHTML ကို Clean လုပ်ပေးမည့် Utility
function cleanHtmlForXhtml(htmlContent) {
    if (!htmlContent) return '<p></p>';
    let clean = htmlContent;
    clean = clean.replace(/<br\s*\/?>/gi, '<br/>');
    clean = clean.replace(/&nbsp;/g, '&#160;');
    return clean;
}

// Base64 စာသားမှ ePub အသိအမှတ်ပြု Binary Blob သို့ ပြောင်းပေးသည့် လုပ်ဆောင်ချက်
function base64ToBlob(base64Str, contentType) {
    const byteCharacters = atob(base64Str);
    const byteArrays = [];
    for (let offset = 0; offset < byteCharacters.length; offset += 512) {
        const slice = byteCharacters.slice(offset, offset + 512);
        const byteNumbers = new Array(slice.length);
        for (let i = 0; i < slice.length; i++) {
            byteNumbers[i] = slice.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        byteArrays.push(byteArray);
    }
    return new Blob(byteArrays, { type: contentType });
}

// 🌟 Generate ePub Core Logic (ဓာတ်ပုံများခွဲထုတ်စနစ် အပြည့်အစုံ)
btnGenerate.addEventListener('click', async () => {
    if (chapters.length === 0) {
        alert('ကျေးဇူးပြု၍ အခန်းအနည်းဆုံးတစ်ခု အရင်ထည့်ပါ!');
        return;
    }
    
    const title = document.getElementById('bookTitle').value || 'My Novel';
    const author = document.getElementById('bookAuthor').value || 'Unknown Author';
    
    const zip = new JSZip();
    zip.file("mimetype", "application/epub+zip");
    
    const metaInf = zip.folder("META-INF");
    metaInf.file("container.xml", `<?xml version="1.0"?><container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>`);
    
    const oebps = zip.folder("OEBPS");
    const imagesFolder = oebps.folder("images"); // ePub အတွင်း ဓာတ်ပုံများသိမ်းဆည်းမည့် Folder
    
    let manifestChapters = '';
    let manifestImages = '';
    let spineChapters = '';
    let imageCounter = 0;
    
    // အခန်းတစ်ခုချင်းစီကို ပတ်ပြီး စစ်ဆေးခြင်း
    for (let idx = 0; idx < chapters.length; idx++) {
        let ch = chapters[idx];
        manifestChapters += `<item id="ch${idx}" href="ch${idx}.xhtml" media-type="application/xhtml+xml"/>\n`;
        spineChapters += `<itemref idref="ch${idx}"/>\n`;
        
        // ကွန်တိန်နာအသွင်ပြောင်းလဲပြီး ဓာတ်ပုံများကို ရှာဖွေဆွဲထုတ်ခြင်း
        let parser = new DOMParser();
        let doc = parser.parseFromString(`<div>${ch.content}</div>`, 'text/html');
        let imgs = doc.querySelectorAll('img');
        
        imgs.forEach((img) => {
            let src = img.getAttribute('src');
            // Base64 Data စစ်စစ်ဖြစ်ပါက ခွဲထုတ်မည်
            if (src && src.startsWith('data:image')) {
                imageCounter++;
                let match = src.match(/^data:(image\/[a-zA-Z+.-]+);base64,(.+)$/);
                if (match) {
                    let mimeType = match[1];
                    let base64Data = match[2];
                    let ext = mimeType.split('/')[1] || 'jpg';
                    let imgFilename = `img_${imageCounter}.${ext}`;
                    
                    // Binary Blob ပြောင်းလဲပြီး Zip ဖိုင်ထဲ ထည့်သွင်းခြင်း
                    let imgBlob = base64ToBlob(base64Data, mimeType);
                    imagesFolder.file(imgFilename, imgBlob);
                    
                    // Manifest ထဲတွင် ပုံကို မှတ်ပုံတင်ခြင်း
                    manifestImages += `<item id="img${imageCounter}" href="images/${imgFilename}" media-type="${mimeType}"/>\n`;
                    
                    // XHTML ကုဒ်အတွင်းရှိ src လမ်းကြောင်းကို ပြောင်းလဲပေးခြင်း
                    img.setAttribute('src', `images/${imgFilename}`);
                    img.setAttribute('alt', `Image ${imageCounter}`);
                }
            }
        });
        
        // ပြန်လည်သန့်စင်ထားသော HTML ကို ရယူခြင်း
        let processedHtml = doc.querySelector('div').innerHTML;
        let cleanedContent = cleanHtmlForXhtml(processedHtml);
        
        const contentHtml = `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.1//EN" "http://www.w3.org/TR/xhtml11/DTD/xhtml11.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="my">
<head>
    <title>${ch.title}</title>
    <style>
        body { font-family: sans-serif; padding: 1em; line-height: 1.6; color: #000000; background-color: #ffffff; }
        h1 { text-align: center; color: #111111; font-size: 1.5em; margin-bottom: 1em; }
        p { margin-bottom: 0.8em; text-align: justify; }
        img { max-width: 100%; height: auto; display: block; margin: 1.5em auto; }
    </style>
</head>
<body>
    <h1>${ch.title}</h1>
    <div>${cleanedContent}</div>
</body>
</html>`;
        oebps.file(`ch${idx}.xhtml`, contentHtml);
    }
    
    const opfContent = `<?xml version="1.0" encoding="utf-8"?>
<package xmlns="http://www.idpf.org/2007/opf" unique-identifier="bookid" version="2.0">
<metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:title>${title}</dc:title>
    <dc:creator>${author}</dc:creator>
    <dc:identifier id="bookid">urn:uuid:${Math.random()}</dc:identifier>
    <dc:language>my</dc:language>
</metadata>
<manifest>
    <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
    ${manifestChapters}
    ${manifestImages}
</manifest>
<spine toc="ncx">
    ${spineChapters}
</spine>
</package>`;
    
    oebps.file("content.opf", opfContent);
    
    let ncxNav = '';
    chapters.forEach((ch, idx) => {
        ncxNav += `<navPoint id="ch${idx}" playOrder="${idx+1}"><navLabel><text>${ch.title}</text></navLabel><content src="ch${idx}.xhtml"/></navPoint>\n`;
    });
    
    const ncxContent = `<?xml version="1.0" encoding="utf-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
<head><meta name="dtb:uid" content="urn:uuid:123"/></head>
<docTitle><text>${title}</text></docTitle>
<navMap>${ncxNav}</navMap>
</ncx>`;
    
    oebps.file("toc.ncx", ncxContent);
    
    const blob = await zip.generateAsync({ type: "blob" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${title}.epub`;
    link.click();
});

// Backup Data
btnBackup.addEventListener('click', () => {
    const data = {
        title: document.getElementById('bookTitle').value,
        author: document.getElementById('bookAuthor').value,
        chapters: chapters
    };
    const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${data.title || 'backup'}_backup.json`;
    link.click();
});

// Load Backup
btnLoadBackup.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const data = JSON.parse(event.target.result);
            document.getElementById('bookTitle').value = data.title || '';
            document.getElementById('bookAuthor').value = data.author || '';
            chapters = data.chapters || [];
            renderChapters();
            if(chapters.length > 0) selectChapter(0);
            alert('Backup ဖိုင်ကို အောင်မြင်စွာ တင်ပြီးပါပြီ!');
        } catch (err) {
            alert('ဖိုင်ဖတ်ရတာ မှားယွင်းနေပါသည်။');
        }
    };
    reader.readAsText(file);
});

// Reset Form
btnReset.addEventListener('click', () => {
    if(confirm('စာအုပ်အသစ်စရန် သေချာပါသလား? ရှိသမျှစာများ ပျက်ပါမည်။')) {
        document.getElementById('bookTitle').value = '';
        document.getElementById('bookAuthor').value = '';
        chapters = [];
        activeChapterIndex = null;
        renderChapters();
        activeEditorSection.classList.add('hidden');
        if(quill) quill.root.innerHTML = '';
    }
});
