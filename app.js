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
                ['clean']
            ]
        }
    });

    // Quill ထဲ စာရိုက်ရင် Data ထဲ ချက်ချင်းသိမ်းမယ်
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

// Add Chapter Event
btnAddChapter.addEventListener('click', () => {
    const newChapter = {
        title: `အခန်း (${chapters.length + 1})`,
        content: ''
    };
    chapters.push(newChapter);
    renderChapters();
    selectChapter(chapters.length - 1);
});

// Active Chapter Title Sync
activeChTitle.addEventListener('input', (e) => {
    if (activeChapterIndex !== null && chapters[activeChapterIndex]) {
        chapters[activeChapterIndex].title = e.target.value;
        const btn = document.querySelector(`[data-index="${activeChapterIndex}"] .ch-title-text`);
        if (btn) btn.innerText = e.target.value;
    }
});

// Render Chapters List
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

        // Click to Select
        div.querySelector('.ch-title-text').addEventListener('click', () => selectChapter(idx));
        
        // Click to Delete
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

// Select Chapter function
function selectChapter(idx) {
    if (idx < 0 || idx >= chapters.length) return;
    activeChapterIndex = idx;
    
    // Highlight Active
    renderChapters();

    activeEditorSection.classList.remove('hidden');
    activeChTitle.value = chapters[idx].title;
    
    // Set content to Quill
    if (quill) {
        quill.root.innerHTML = chapters[idx].content || '';
    }
    
    // Auto-scroll screen down smoothly to view editor
    activeEditorSection.scrollIntoView({ behavior: 'smooth' });
}

// Generate ePub Core Logic
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
    
    let manifestChapters = '';
    let spineChapters = '';
    
    chapters.forEach((ch, idx) => {
        manifestChapters += `<item id="ch${idx}" href="ch${idx}.xhtml" media-type="application/xhtml+xml"/>\n`;
        spineChapters += `<itemref idref="ch${idx}"/>\n`;
        
        const contentHtml = `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head><title>${ch.title}</title><style>body{font-family:sans-serif;padding:1em;line-height:1.6;}h1{text-align:center;}</style></head>
<body><h1>${ch.title}</h1><div>${ch.content}</div></body>
</html>`;
        oebps.file(`ch${idx}.xhtml`, contentHtml);
    });
    
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
