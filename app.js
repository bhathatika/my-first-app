// Configure PDF.js Worker
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';

// Initialize Quill Editor with Simple Toolbar and Multi-Image support
const quill = new Quill('#editor-container', {
    theme: 'snow',
    placeholder: 'Write chapter content here...',
    modules: {
        toolbar: [
            [{ 'header': [1, 2, false] }],
            ['bold', 'italic', 'underline'],
            ['image', 'code-block'],
            [{ 'list': 'ordered'}, { 'list': 'bullet' }],
            ['clean']
        ]
    }
});

// Intercept Quill's image button to allow multiple file selection
const toolbar = quill.getModule('toolbar');
toolbar.addHandler('image', () => {
    const input = document.createElement('input');
    input.setAttribute('type', 'file');
    input.setAttribute('accept', 'image/*');
    input.setAttribute('multiple', 'multiple');
    input.click();

    input.onchange = async () => {
        const files = input.files;
        if (files.length > 0) {
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                try {
                    const base64Str = await fileToBase64Complete(file);
                    const range = quill.getSelection(true);
                    quill.insertEmbed(range.index, 'image', base64Str);
                    quill.setSelection(range.index + 1);
                } catch (err) {
                    console.error("Image upload error: ", err);
                }
            }
        }
    };
});

// App State
let chapters = [{ title: 'Chapter 1', content: '' }];
let currentChapterIndex = 0;

// Load Everything SAFELY from LocalStorage
try {
    const savedChapters = localStorage.getItem('epub_creator_chapters');
    if (savedChapters) {
        chapters = JSON.parse(savedChapters);
    }
    const savedTitle = localStorage.getItem('epub_creator_book_title');
    if (savedTitle) document.getElementById('bookTitle').value = savedTitle;
    const savedAuthor = localStorage.getItem('epub_creator_book_author');
    if (savedAuthor) document.getElementById('bookAuthor').value = savedAuthor;
} catch (e) {
    console.error("Error loading from localStorage", e);
}

document.addEventListener('DOMContentLoaded', () => {
    const modeToggle = document.getElementById('modeToggle');
    if (modeToggle) {
        modeToggle.addEventListener('click', () => {
            document.body.classList.toggle('dark-mode');
            if (document.body.classList.contains('dark-mode')) {
                modeToggle.textContent = '☀️ Light Mode';
            } else {
                modeToggle.textContent = '🌙 Night Mode';
            }
        });
    }
    setupAllClearButton();
    setupBackupSystemEvents(); // Setup method B backup system
    loadChapterState();
});

function setupAllClearButton() {
    const chapterTitleInput = document.getElementById('chapterTitle');
    if (chapterTitleInput && !document.getElementById('allClearBtn')) {
        const clearBtn = document.createElement('button');
        clearBtn.id = 'allClearBtn';
        clearBtn.innerHTML = '🧹 စာသားအားလုံးဖျက်ရန် (Clear All Content)';
        clearBtn.className = 'btn-danger';
        clearBtn.style.marginTop = '8px';
        clearBtn.style.marginBottom = '8px';
        clearBtn.style.padding = '8px 12px';
        clearBtn.style.width = '100%';
        clearBtn.style.fontWeight = 'bold';
        clearBtn.style.borderRadius = '6px';
        clearBtn.style.cursor = 'pointer';
        
        clearBtn.onclick = () => {
            if (confirm('ယခု Chapter ထဲက စာသားနဲ့ ပုံအားလုံးကို အပြီးဖျက်ထုတ်မှာ သေချာပါသလား။')) {
                quill.setText('');
                chapters[currentChapterIndex].content = '';
                saveToLocalStorage();
            }
        };
        chapterTitleInput.parentNode.insertBefore(clearBtn, chapterTitleInput.nextSibling);
    }
}

// METHOD B: MULTI-BOOK BACKUP & LOGIC MANAGEMENT
function setupBackupSystemEvents() {
    // 1. Download Backup as JSON file
    document.getElementById('backupBookBtn').onclick = () => {
        saveCurrentChapterState();
        const bookData = {
            title: document.getElementById('bookTitle').value.trim(),
            author: document.getElementById('bookAuthor').value.trim(),
            chapters: chapters
        };
        const blob = new Blob([JSON.stringify(bookData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const filename = (bookData.title || 'book_backup').replace(/\s+/g, '_') + '_backup.json';
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    };

    // 2. Load Backup from file
    document.getElementById('loadBackupFile').onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function(evt) {
            try {
                const parsed = JSON.parse(evt.target.result);
                if (parsed.chapters && Array.isArray(parsed.chapters)) {
                    if (confirm('ဒီ Backup ဖိုင်ကို တင်သွင်းလိုက်ရင် လက်ရှိ App ပေါ်မှာ ပြသနေတဲ့စာတွေ အကုန်လုံး အစားထိုးလဲလှယ်သွားပါမယ်။ တင်သွင်းမှာ သေချာပါသလား။')) {
                        chapters = parsed.chapters;
                        document.getElementById('bookTitle').value = parsed.title || 'Untitled Book';
                        document.getElementById('bookAuthor').value = parsed.author || 'Unknown Author';
                        currentChapterIndex = 0;
                        saveToLocalStorage();
                        loadChapterState();
                        alert('Backup ဖိုင်ကို အောင်မြင်စွာ ပြန်လည်တင်သွင်းပြီးပါပြီဗျာ။');
                    }
                } else {
                    alert('မှားယွင်းနေသော ဖိုင်ပုံစံဖြစ်နေပါသည်။ စာအုပ် Backup JSON ဖိုင်သာ ဖြစ်ရပါမည်။');
                }
            } catch(err) {
                alert('ဖိုင်ကို ဖတ်မရပါ။ ' + err.message);
            }
        };
        reader.readAsText(file);
        e.target.value = ''; // clear input cache
    };

    // 3. Reset App completely for a brand new book
    document.getElementById('resetAppBtn').onclick = () => {
        if (confirm('⚠️ သတိပေးချက်: လက်ရှိစာအုပ်ကို Backup ဖိုင်အရင်မသိမ်းထားရသေးရင် စာတွေအကုန် ပျက်သွားနိုင်ပါတယ်။ စာအုပ်အသစ်စရေးဖို့ App တစ်ခုလုံးကို Reset ချမှာ သေချာပါသလား။')) {
            chapters = [{ title: 'Chapter 1', content: '' }];
            currentChapterIndex = 0;
            document.getElementById('bookTitle').value = 'Book Title New';
            document.getElementById('bookAuthor').value = 'Author Name';
            document.getElementById('coverImage').value = '';
            quill.setText('');
            saveToLocalStorage();
            loadChapterState();
            alert('App ကို Reset ချပေးပြီးပါပြီ။ စာအုပ်အသစ်တစ်အုပ်ကို အစကနေ စတင်ရေးသားနိုင်ပါပြီဗျာ။');
        }
    };
}

// Save to local memory safely
function saveToLocalStorage() {
    try {
        localStorage.setItem('epub_creator_chapters', JSON.stringify(chapters));
        localStorage.setItem('epub_creator_book_title', document.getElementById('bookTitle').value);
        localStorage.setItem('epub_creator_book_author', document.getElementById('bookAuthor').value);
    } catch (e) {
        console.warn("Storage limit note: Data remains safe in current session.");
    }
}

function cleanHtmlForEpub(htmlContent) {
    if (!htmlContent) return '';
    let cleaned = htmlContent.replace(/<br\s*>/gi, '<br />');
    cleaned = cleaned.replace(/<img([^>]*)\s*>/gi, (match, p1) => {
        if (!p1.trim().endsWith('/')) {
            return `<img ${p1.replace(/\/$/, '').trim()} />`;
        }
        return match;
    });
    return cleaned;
}

function renderChapterList() {
    const listContainer = document.getElementById('chapterList');
    if (!listContainer) return;
    listContainer.innerHTML = '';
    
    chapters.forEach((ch, index) => {
        const item = document.createElement('div');
        item.className = `chapter-item ${index === currentChapterIndex ? 'active' : ''}`;
        
        const titleSpan = document.createElement('span');
        titleSpan.textContent = ch.title || `Chapter ${index + 1}`;
        titleSpan.style.flexGrow = '1';
        titleSpan.onclick = () => switchChapter(index);
        
        const deleteBtn = document.createElement('button');
        deleteBtn.innerHTML = '❌';
        deleteBtn.className = 'btn-danger';
        deleteBtn.onclick = (e) => {
            e.stopPropagation();
            deleteChapter(index);
        };
        
        item.appendChild(titleSpan);
        if (chapters.length > 1) {
            item.appendChild(deleteBtn);
        }
        listContainer.appendChild(item);
    });
}

function saveCurrentChapterState() {
    const titleInput = document.getElementById('chapterTitle');
    if (titleInput && chapters[currentChapterIndex]) {
        chapters[currentChapterIndex].title = titleInput.value.trim() || `Chapter ${currentChapterIndex + 1}`;
        chapters[currentChapterIndex].content = quill.root.innerHTML;
        saveToLocalStorage();
    }
}

function loadChapterState() {
    if (chapters[currentChapterIndex]) {
        const titleInput = document.getElementById('chapterTitle');
        if (titleInput) titleInput.value = chapters[currentChapterIndex].title;
        quill.root.innerHTML = chapters[currentChapterIndex].content;
    }
    renderChapterList();
}

function switchChapter(index) {
    saveCurrentChapterState();
    currentChapterIndex = index;
    document.getElementById('chapterTitle').value = chapters[currentChapterIndex].title;
    quill.root.innerHTML = chapters[currentChapterIndex].content;
    renderChapterList();
}

function deleteChapter(index) {
    if (confirm('Are you sure you want to delete this chapter?')) {
        chapters.splice(index, 1);
        if (currentChapterIndex >= chapters.length) {
            currentChapterIndex = chapters.length - 1;
        }
        saveToLocalStorage();
        document.getElementById('chapterTitle').value = chapters[currentChapterIndex].title;
        quill.root.innerHTML = chapters[currentChapterIndex].content;
        renderChapterList();
    }
}

quill.on('text-change', () => {
    if (chapters[currentChapterIndex]) {
        chapters[currentChapterIndex].content = quill.root.innerHTML;
        saveToLocalStorage();
    }
});

document.getElementById('addChapterBtn').addEventListener('click', () => {
    saveCurrentChapterState();
    chapters.push({ title: `Chapter ${chapters.length + 1}`, content: '' });
    currentChapterIndex = chapters.length - 1;
    document.getElementById('chapterTitle').value = chapters[currentChapterIndex].title;
    quill.root.innerHTML = '';
    saveToLocalStorage();
    renderChapterList();
});

document.getElementById('chapterTitle').addEventListener('input', (e) => {
    if (chapters[currentChapterIndex]) {
        chapters[currentChapterIndex].title = e.target.value;
        saveToLocalStorage();
        renderChapterList();
    }
});

// Sync Title and Author inputs with local storage real-time
document.getElementById('bookTitle').addEventListener('input', () => saveToLocalStorage());
document.getElementById('bookAuthor').addEventListener('input', () => saveToLocalStorage());

document.getElementById('extractPdfBtn').addEventListener('click', async () => {
    const pdfFile = document.getElementById('pdfFile').files[0];
    const status = document.getElementById('pdfStatus');
    if (!pdfFile) {
        alert('Please select a PDF file first.');
        return;
    }
    status.textContent = 'Extracting text from PDF... Please wait.';
    try {
        const fileReader = new FileReader();
        fileReader.onload = async function () {
            const typedarray = new Uint8Array(this.result);
            const pdf = await pdfjsLib.getDocument(typedarray).promise;
            let fullText = '';
            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const textContent = await page.getTextContent();
                const pageText = textContent.items.map(item => item.str).join(' ');
                fullText += `<h3>Page ${i}</h3><p>${pageText}</p><br />`;
            }
            saveCurrentChapterState();
            chapters.push({ title: `PDF Extracted Content`, content: fullText });
            currentChapterIndex = chapters.length - 1;
            document.getElementById('chapterTitle').value = chapters[currentChapterIndex].title;
            quill.root.innerHTML = chapters[currentChapterIndex].content;
            saveToLocalStorage();
            renderChapterList();
            status.textContent = 'Text extracted successfully!';
        };
        fileReader.readAsArrayBuffer(pdfFile);
    } catch (error) {
        status.textContent = 'Error loading or parsing PDF.';
    }
});

function fileToBase64Complete(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.onerror = error => reject(error);
    });
}

// Generate and Download ePub
document.getElementById('downloadEpub').addEventListener('click', async () => {
    saveCurrentChapterState();
    
    const title = document.getElementById('bookTitle').value.trim() || 'Untitled Book';
    const author = document.getElementById('bookAuthor').value.trim() || 'Unknown Author';
    const coverFile = document.getElementById('coverImage').files[0];
    
    const zip = new JSZip();
    zip.file("mimetype", "application/epub+zip", { compression: "STORE" });
    
    const containerXml = `<?xml version="1.0" encoding="UTF-8"?><container version="1.0" xmlns="urn:oasis:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>`;
    zip.folder("META-INF").file("container.xml", containerXml);
    
    let manifestItems = '';
    let spineItems = '';
    let tocNavPoints = '';
    let imageManifestItems = '';
    
    const oebps = zip.folder("OEBPS");
    let imageCounter = 1;

    function getAlphabetId(num) {
        let ret = '';
        while (num >= 0) {
            ret = String.fromCharCode(97 + (num % 26)) + ret;
            num = Math.floor(num / 26) - 1;
        }
        return ret;
    }

    for (let index = 0; index < chapters.length; index++) {
        const ch = chapters[index];
        
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = ch.content;
        const images = tempDiv.getElementsByTagName('img');
        
        for (let i = 0; i < images.length; i++) {
            const img = images[i];
            const src = img.getAttribute('src');
            
            if (src && src.startsWith('data:image/')) {
                try {
                    const parts = src.split(';base64,');
                    const mimeType = parts[0].split(':')[1];
                    const ext = mimeType.split('/')[1] || 'jpeg';
                    const base64Data = parts[1];
                    
                    const imgAlphaCode = getAlphabetId(imageCounter);
                    const imgFileName = `image_file_${imgAlphaCode}.${ext}`;
                    const imgId = `img_id_${imgAlphaCode}`;
                    
                    oebps.file(imgFileName, base64Data, { base64: true });
                    imageManifestItems += `<item id="${imgId}" href="${imgFileName}" media-type="${mimeType}"/>\n`;
                    
                    img.setAttribute('src', imgFileName);
                    img.removeAttribute('alt');
                    
                    imageCounter++;
                } catch (imgErr) {
                    console.error("Failed to parse base64 image: ", imgErr);
                }
            }
        }
        
        const processedContent = tempDiv.innerHTML;
        const alphaChapterCode = getAlphabetId(index);
        const cleanFileId = `chapter_section_doc_${alphaChapterCode}`;
        
        manifestItems += `<item id="${cleanFileId}" href="${cleanFileId}.html" media-type="application/xhtml+xml"/>\n`;
        spineItems += `<itemref idref="${cleanFileId}"/>\n`;
        tocNavPoints += `<navPoint id="nav-${cleanFileId}" playOrder="${index + 1}"><navLabel><text>${ch.title}</text></navLabel><content src="${cleanFileId}.html"/></navPoint>\n`;
        
        const cleanedContent = cleanHtmlForEpub(processedContent);
        const chapterHtml = `<?xml version="1.0" encoding="UTF-8"?><html xmlns="http://www.w3.org/1999/xhtml"><head><title>${ch.title}</title><style>body { font-family: sans-serif; padding: 10px; } h1 { text-align: center; } img { max-width: 100%; height: auto; display: block; margin: 10px auto; }</style></head><body><h1>${ch.title}</h1><div>${cleanedContent}</div></body></html>`;
        oebps.file(`${cleanFileId}.html`, chapterHtml);
    }
    
    let manifestCoverItem = '';
    let metadataCoverMeta = '';
    if (coverFile) {
        manifestCoverItem = `<item id="cover-image" href="cover_page_img.jpg" media-type="image/jpeg"/>`;
        metadataCoverMeta = `<meta name="cover" content="cover-image"/>`;
        try {
            const base64Data = await fileToBase64(coverFile);
            oebps.file("cover_page_img.jpg", base64Data, { base64: true });
        } catch (e) {
            alert("Error processing cover image: " + e.message);
            return;
        }
    }
    
    const contentOpf = `<?xml version="1.0" encoding="UTF-8"?><package xmlns="http://www.idpf.org/2007/opf" unique-identifier="bookid" version="2.0"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>${title}</dc:title><dc:creator>${author}</dc:creator><dc:language>en</dc:language>${metadataCoverMeta}</metadata><manifest><item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>${manifestItems}${imageManifestItems}${manifestCoverItem}</manifest><spine toc="ncx">${spineItems}</spine></package>`;
    const tocNcx = `<?xml version="1.0" encoding="UTF-8"?><ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1"><head><meta name="dtb:uid" content="123456789X"/></head><docTitle><text>${title}</text></docTitle><navMap>${tocNavPoints}</navMap></ncx>`;

    oebps.file("content.opf", contentOpf);
    oebps.file("toc.ncx", tocNcx);
    
    zip.generateAsync({ type: "blob" }).then(function(content) {
        const link = document.createElement('a');
        link.href = URL.createObjectURL(content);
        link.download = `${title.replace(/\s+/g, '_')}.epub`;
        link.click();
    });
});

// Run Initial Setup
renderChapterList();