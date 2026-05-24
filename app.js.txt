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
    input.setAttribute('multiple', 'multiple'); // Enable multiple image selection
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

// App State (Load safely from LocalStorage)
let chapters = [{ title: 'Chapter 1', content: '' }];
let currentChapterIndex = 0;

try {
    const savedChapters = localStorage.getItem('epub_creator_chapters');
    if (savedChapters) {
        chapters = JSON.parse(savedChapters);
    }
} catch (e) {
    console.error("Error loading from localStorage", e);
}

// Setup Elements and Night Mode Toggle
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
    
    // Create and Append "All Clear" Button dynamically
    setupAllClearButton();
    
    // Initial Load Setup
    loadChapterState();
});

// Dynamic UI Injection for "All Clear" Button
function setupAllClearButton() {
    const chapterTitleInput = document.getElementById('chapterTitle');
    if (chapterTitleInput && !document.getElementById('allClearBtn')) {
        const clearBtn = document.createElement('button');
        clearBtn.id = 'allClearBtn';
        clearBtn.innerHTML = '🧹 စာသားအားလုံးဖျက်ရန် (Clear All)';
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
                quill.setText(''); // Instantly clear editor text
                chapters[currentChapterIndex].content = '';
                saveToLocalStorage();
            }
        };
        // Insert right after the chapter title input field
        chapterTitleInput.parentNode.insertBefore(clearBtn, chapterTitleInput.nextSibling);
    }
}

// Optimization: Strips heavy base64 strings before saving text to LocalStorage to prevent 5MB crashes
function getCleanedChaptersForStorage() {
    return chapters.map(ch => {
        // Strip out base64 image data just for LocalStorage, keeps the text and image placements safe
        let strippedContent = ch.content.replace(/<img[^>]+src="data:image\/[^;]+;base64,[^"]+"[^>]*>/g, '<img src="" alt="Auto-saved Image Place" />');
        return {
            title: ch.title,
            content: strippedContent
        };
    });
}

// Save text data safely to LocalStorage without heavy image payload
function saveToLocalStorage() {
    try {
        const optimizedData = getCleanedChaptersForStorage();
        localStorage.setItem('epub_creator_chapters', JSON.stringify(optimizedData));
    } catch (e) {
        console.warn("LocalStorage save skipped to protect memory:", e);
    }
}

// Clean and Validate HTML Content for XHTML/EPUB compatibility
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

// Render Sidebar Chapter List
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

// Load Chapter Data
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

// Listen for typing/image insert changes in Quill Editor
quill.on('text-change', () => {
    if (chapters[currentChapterIndex]) {
        chapters[currentChapterIndex].content = quill.root.innerHTML;
        saveToLocalStorage();
    }
});

// Chapter Event Listeners
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

// PDF Text Extraction Logic
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
            
            status.textContent = 'Text extracted successfully! Check below.';
        };
        fileReader.readAsArrayBuffer(pdfFile);
    } catch (error) {
        status.textContent = 'Error loading or parsing PDF.';
        console.error(error);
    }
});

// Helper for Image Base64 conversion
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

// Generate and Download ePub (Robust Multi-Image Packager)
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
                    
                    const imgFileName = `img_${imageCounter}.${ext}`;
                    const imgId = `inline_img_${imageCounter}`;
                    
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
        const id = `chapter${index + 1}`;
        manifestItems += `<item id="${id}" href="${id}.html" media-type="application/xhtml+xml"/>\n`;
        spineItems += `<itemref idref="${id}"/>\n`;
        tocNavPoints += `<navPoint id="navpoint-${index + 1}" playOrder="${index + 1}"><navLabel><text>${ch.title}</text></navLabel><content src="${id}.html"/></navPoint>\n`;
        
        const cleanedContent = cleanHtmlForEpub(processedContent);
        const chapterHtml = `<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.1//EN" "http://www.w3.org/TR/xhtml11/DTD/xhtml11.dtd"><html xmlns="http://www.w3.org/1999/xhtml"><head><title>${ch.title}</title><style>body { font-family: sans-serif; padding: 10px; } h1 { text-align: center; } img { max-width: 100%; height: auto; display: block; margin: 10px auto; }</style></head><body><h1>${ch.title}</h1><div>${cleanedContent}</div></body></html>`;
        oebps.file(`${id}.html`, chapterHtml);
    }
    
    let manifestCoverItem = '';
    let metadataCoverMeta = '';
    if (coverFile) {
        manifestCoverItem = `<item id="cover-image" href="cover.jpg" media-type="image/jpeg"/>`;
        metadataCoverMeta = `<meta name="cover" content="cover-image"/>`;
        try {
            const base64Data = await fileToBase64(coverFile);
            oebps.file("cover.jpg", base64Data, { base64: true });
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