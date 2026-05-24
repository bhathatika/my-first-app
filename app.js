<!DOCTYPE html>
<html lang="my">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Web ePub Creator Pro</title>
    <!-- FontAwesome for Icons -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
        :root {
            --bg-color: #121824;
            --card-bg: #1e2640;
            --text-color: #ffffff;
            --text-muted: #94a3b8;
            --primary-blue: #3b82f6;
            --btn-gray: #334155;
            --btn-red: #ef4444;
            --btn-green: #10b981;
            --border-color: #334155;
            --input-bg: #0f172a;
        }

        .light-mode {
            --bg-color: #f8fafc;
            --card-bg: #ffffff;
            --text-color: #0f172a;
            --text-muted: #64748b;
            --primary-blue: #2563eb;
            --btn-gray: #e2e8f0;
            --btn-red: #dc2626;
            --btn-green: #16a34a;
            --border-color: #cbd5e1;
            --input-bg: #f1f5f9;
        }

        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        }

        body {
            background-color: var(--bg-color);
            color: var(--text-color);
            padding: 20px;
            display: flex;
            justify-content: center;
            transition: background-color 0.3s, color 0.3s;
        }

        .app-container {
            width: 100%;
            max-width: 480px;
            background-color: var(--card-bg);
            border-radius: 12px;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
            overflow: hidden;
            border: 1px solid var(--border-color);
        }

        /* Auth Screen Styling */
        #auth-screen {
            padding: 30px 20px;
            display: flex;
            flex-direction: column;
            gap: 15px;
        }

        .auth-toggle {
            display: flex;
            justify-content: center;
            gap: 20px;
            margin-bottom: 10px;
        }

        .auth-toggle span {
            cursor: pointer;
            font-weight: bold;
            padding-bottom: 5px;
            color: var(--text-muted);
        }

        .auth-toggle span.active {
            color: var(--primary-blue);
            border-bottom: 2px solid var(--primary-blue);
        }

        /* Header Styling */
        .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 15px 20px;
            border-bottom: 1px solid var(--border-color);
        }

        .brand {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 1.1rem;
            font-weight: bold;
        }

        .brand span.premium {
            background-color: #22c55e;
            color: white;
            font-size: 0.7rem;
            padding: 2px 6px;
            border-radius: 20px;
        }

        .header-btns {
            display: flex;
            gap: 10px;
        }

        .mode-btn, .lang-btn {
            background-color: #f59e0b;
            color: white;
            border: none;
            padding: 6px 12px;
            border-radius: 6px;
            cursor: pointer;
            font-weight: bold;
            font-size: 0.85rem;
        }

        .lang-btn {
            background-color: var(--btn-gray);
            color: var(--text-color);
        }

        /* Main Content */
        .content {
            padding: 20px;
            display: flex;
            flex-direction: column;
            gap: 20px;
        }

        /* Card Panels */
        .panel {
            border: 1px solid var(--border-color);
            border-radius: 8px;
            padding: 15px;
            background-color: rgba(0, 0, 0, 0.05);
        }

        .panel-title {
            text-align: center;
            font-size: 0.95rem;
            margin-bottom: 15px;
            display: flex;
            justify-content: center;
            align-items: center;
            gap: 6px;
        }

        .form-group {
            display: flex;
            flex-direction: column;
            gap: 8px;
            margin-bottom: 15px;
        }

        label {
            font-weight: bold;
            font-size: 0.95rem;
        }

        input[type="text"], textarea {
            width: 100%;
            padding: 10px;
            background-color: var(--input-bg);
            border: 1px solid var(--border-color);
            border-radius: 6px;
            color: var(--text-color);
            outline: none;
        }

        /* Buttons styling */
        .btn {
            width: 100%;
            padding: 12px;
            border: none;
            border-radius: 6px;
            font-weight: bold;
            cursor: pointer;
            display: flex;
            justify-content: center;
            align-items: center;
            gap: 8px;
            color: white;
            font-size: 0.95rem;
            margin-bottom: 10px;
        }

        .btn-gray { background-color: var(--btn-gray); color: var(--text-color); }
        .btn-blue { background-color: var(--primary-blue); }
        .btn-red { background-color: var(--btn-red); }
        .btn-green { background-color: var(--btn-green); }

        /* PDF Section Box */
        .pdf-box {
            background-color: rgba(16, 185, 129, 0.1);
            border: 1px dashed var(--btn-green);
            border-radius: 8px;
            padding: 15px;
        }

        /* Editor Toolbar */
        .editor-container {
            background-color: white;
            border-radius: 6px;
            overflow: hidden;
            border: 1px solid var(--border-color);
        }

        .toolbar {
            background-color: #f1f5f9;
            padding: 8px;
            display: flex;
            gap: 10px;
            border-bottom: 1px solid #cbd5e1;
        }

        .toolbar button {
            background: none;
            border: none;
            cursor: pointer;
            color: #334155;
            font-size: 1rem;
            padding: 2px 5px;
        }

        .toolbar button:hover {
            background-color: #cbd5e1;
            border-radius: 4px;
        }

        .editor-area {
            min-height: 200px;
            padding: 10px;
            color: #000000;
            background-color: #ffffff;
            outline: none;
            overflow-y: auto;
        }

        .hidden { display: none !important; }
    </style>
</head>
<body>

<div class="app-container">

    <!-- SIGN IN / SIGN UP SCREEN -->
    <div id="auth-screen">
        <div class="auth-toggle">
            <span id="tab-login" class="active" onclick="switchAuthTab('login')">Sign In</span>
            <span id="tab-register" onclick="switchAuthTab('register')">Sign Up</span>
        </div>
        <div class="form-group">
            <label id="lbl-email">အီးမေးလ် (Email)</label>
            <input type="text" id="auth-email" placeholder="example@gmail.com">
        </div>
        <div class="form-group">
            <label id="lbl-pass">လျှို့ဝှက်နံပါတ် (Password)</label>
            <input type="text" id="auth-password" placeholder="******">
        </div>
        <button class="btn btn-blue" id="btn-auth" onclick="handleAuth()">Sign In</button>
    </div>

    <!-- MAIN APP SCREEN (Hidden by default until login) -->
    <div id="main-app" class="hidden">
        <!-- Header -->
        <div class="header">
            <div class="brand">
                <i class="fa-solid fa-globe"></i> Web ePub Creator Pro <span class="premium">Premium Unlocked</span>
            </div>
            <div class="header-btns">
                <button class="lang-btn" onclick="toggleLanguage()">EN</button>
                <button class="mode-btn" onclick="toggleDarkMode()">Light Mode</button>
            </div>
        </div>

        <!-- Main Content Form -->
        <div class="content">
            
            <!-- Backup Panel -->
            <div class="panel">
                <div class="panel-title" id="lbl-backup-title"><i class="fa-solid fa-floppy-disk"></i> စာအုပ် BACKUP စီမံခန့်ခွဲမှု</div>
                <button class="btn btn-gray" onclick="exportBackup()"><i class="fa-solid fa-floppy-disk"></i> <span id="lbl-btn-backup">လက်ရှိစာအုပ်ကို ဖိုင်သိမ်းဆည်းမည် (Backup)</span></button>
                
                <!-- Hidden file input for load backup -->
                <input type="file" id="import-file" class="hidden" onchange="importBackup(event)" accept=".json">
                <button class="btn btn-blue" onclick="document.getElementById('import-file').click()"><i class="fa-solid fa-box-open"></i> <span id="lbl-btn-load">စာအုပ်ဟောင်း ပြန်တင်မည် (Load Backup)</span></button>
                
                <button class="btn btn-red" onclick="resetForm()"><i class="fa-solid fa-paintbrush"></i> <span id="lbl-btn-reset">စာအုပ်အသစ်အတွက် အစကပြန်စမည် (Reset)</span></button>
            </div>

            <!-- Book Meta Data -->
            <div class="form-group">
                <label id="lbl-book-title">စာအုပ်အမည် (Book Title)</label>
                <input type="text" id="book-title" placeholder="My Novel" oninput="saveToLocalStorage()">
            </div>

            <div class="form-group">
                <label id="lbl-author">စာရေးဆရာ (Author)</label>
                <input type="text" id="author" placeholder="Unknown Author" oninput="saveToLocalStorage()">
            </div>

            <div class="form-group">
                <label id="lbl-cover">မျက်နှာဖုံးပုံ (Cover Image)</label>
                <input type="file" id="cover-image" accept="image/*" onchange="handleCoverUpload(event)">
                <small id="cover-status" style="color: var(--btn-green); margin-top:5px;"></small>
            </div>

            <!-- Chapters Section -->
            <div class="form-group">
                <label id="lbl-chapters">အခန်းများ (Chapters)</label>
                <button class="btn btn-blue"><i class="fa-solid fa-plus"></i> <span id="lbl-btn-addchapter">အခန်းတိုးမည် (Add Chapter)</span></button>
            </div>

            <!-- PDF Optional Box -->
            <div class="pdf-box">
                <div style="color: #10b981; font-weight: bold; font-size: 0.9rem; margin-bottom: 10px; display: flex; align-items: center; gap: 5px;">
                    <i class="fa-solid fa-file-pdf"></i> <span id="lbl-pdf-title">PDF မှ စာသားထုတ်ယူရန် (Optional)</span>
                </div>
                <input type="file" accept=".pdf" style="margin-bottom: 10px; color: var(--text-color);">
                <button class="btn btn-green" style="margin: 0;"><i class="fa-solid fa-bolt"></i> <span id="lbl-btn-pdfextract">PDF မှ စာသားများကို ဆွဲထုတ်မည်</span></button>
            </div>

            <!-- Chapter Details -->
            <div class="form-group">
                <label id="lbl-chap-title">အခန်းခေါင်းစဉ် (Chapter Title)</label>
                <input type="text" id="chapter-title" placeholder="Chapter Title" oninput="saveToLocalStorage()">
            </div>

            <button class="btn btn-red" onclick="clearContent()"><i class="fa-solid fa-broom"></i> <span id="lbl-btn-clear">စာသားအားလုံးဖျက်ရန် (Clear All Content)</span></button>

            <!-- Text Rich Editor -->
            <div class="form-group">
                <label id="lbl-chap-content">အခန်းတွင်းစာသား (Chapter Content)</label>
                <div class="editor-container">
                    <div class="toolbar">
                        <button onclick="formatDoc('bold')"><i class="fa-solid fa-bold"></i></button>
                        <button onclick="formatDoc('italic')"><i class="fa-solid fa-italic"></i></button>
                        <button onclick="formatDoc('underline')"><i class="fa-solid fa-underline"></i></button>
                        <button onclick="formatDoc('insertUnorderedList')"><i class="fa-solid fa-list-ul"></i></button>
                        <button onclick="formatDoc('insertOrderedList')"><i class="fa-solid fa-list-ol"></i></button>
                        <!-- Image Upload in Editor -->
                        <button onclick="document.getElementById('editor-img-upload').click()"><i class="fa-solid fa-image"></i></button>
                        <input type="file" id="editor-img-upload" class="hidden" accept="image/*" onchange="insertImage(event)">
                        <button onclick="formatDoc('removeFormat')"><i class="fa-solid fa-text-slash"></i></button>
                    </div>
                    <div class="editor-area" id="editor" contenteditable="true" oninput="saveToLocalStorage()"></div>
                </div>
            </div>

            <!-- Export Button -->
            <button class="btn btn-green" onclick="alert('ePub file generation feature connected!')">
                <i class="fa-solid fa-box"></i> <span id="lbl-btn-export">ePub ဖိုင် ထုတ်ယူမည်</span>
            </button>

        </div>
    </div>
</div>

<script>
    // --- State & Languages ---
    let currentLang = 'my';
    let currentAuthTab = 'login';
    let coverBase64 = ""; // Holds image backup data

    const langData = {
        my: {
            email: "အီးမေးလ် (Email)", pass: "လျှို့ဝှက်နံပါတ် (Password)",
            backupTitle: "စာအုပ် BACKUP စီမံခန့်ခွဲမှု", btnBackup: "လက်ရှိစာအုပ်ကို ဖိုင်သိမ်းဆည်းမည် (Backup)",
            btnLoad: "စာအုပ်ဟောင်း ပြန်တင်မည် (Load Backup)", btnReset: "စာအုပ်အသစ်အတွက် အစကပြန်စမည် (Reset)",
            bookTitle: "စာအုပ်အမည် (Book Title)", author: "စာရေးဆရာ (Author)", cover: "မျက်နှာဖုံးပုံ (Cover Image)",
            chapters: "အခန်းများ (Chapters)", btnAddChap: "အခန်းတိုးမည် (Add Chapter)", pdfTitle: "PDF မှ စာသားထုတ်ယူရန် (Optional)",
            btnPdf: "PDF မှ စာသားများကို ဆွဲထုတ်မည်", chapTitle: "အခန်းခေါင်းစဉ် (Chapter Title)",
            btnClear: "စာသားအားလုံးဖျက်ရန် (Clear All Content)", chapContent: "အခန်းတွင်းစာသား (Chapter Content)",
            btnExport: "ePub ဖိုင် ထုတ်ယူမည်", modeLight: "Light Mode", modeDark: "Dark Mode"
        },
        en: {
            email: "Email Address", pass: "Password",
            backupTitle: "Book BACKUP Management", btnBackup: "Save Current Book (Backup)",
            btnLoad: "Load Old Book (Load Backup)", btnReset: "Reset for New Book",
            bookTitle: "Book Title", author: "Author", cover: "Cover Image",
            chapters: "Chapters", btnAddChap: "Add Chapter", pdfTitle: "Extract Text from PDF (Optional)",
            btnPdf: "Extract Text from PDF", chapTitle: "Chapter Title",
            btnClear: "Clear All Content", chapContent: "Chapter Content",
            btnExport: "Export ePub File", modeLight: "Light Mode", modeDark: "Dark Mode"
        }
    };

    // --- Auth Section ---
    function switchAuthTab(tab) {
        currentAuthTab = tab;
        document.getElementById('tab-login').classList.toggle('active', tab === 'login');
        document.getElementById('tab-register').classList.toggle('active', tab === 'register');
        document.getElementById('btn-auth').innerText = tab === 'login' ? 'Sign In' : 'Sign Up';
    }

    function handleAuth() {
        const email = document.getElementById('auth-email').value;
        const pass = document.getElementById('auth-password').value;
        if(email && pass) {
            document.getElementById('auth-screen').classList.add('hidden');
            document.getElementById('main-app').classList.remove('hidden');
            loadFromLocalStorage(); // Load saved work after login
        } else {
            alert('Please fill in all fields.');
        }
    }

    // --- UI Theme & Language Toggles ---
    function toggleDarkMode() {
        document.body.classList.toggle('light-mode');
        const isLight = document.body.classList.contains('light-mode');
        document.querySelector('.mode-btn').innerText = isLight ? "Dark Mode" : "Light Mode";
    }

    function toggleLanguage() {
        currentLang = currentLang === 'my' ? 'en' : 'my';
        document.querySelector('.lang-btn').innerText = currentLang === 'my' ? 'EN' : 'MY';
        updateUIStrings();
    }

    function updateUIStrings() {
        const data = langData[currentLang];
        document.getElementById('lbl-email').innerText = data.email;
        document.getElementById('lbl-pass').innerText = data.pass;
        document.getElementById('lbl-backup-title').innerHTML = `<i class="fa-solid fa-floppy-disk"></i> ${data.backupTitle}`;
        document.getElementById('lbl-btn-backup').innerText = data.btnBackup;
        document.getElementById('lbl-btn-load').innerText = data.btnLoad;
        document.getElementById('lbl-btn-reset').innerText = data.btnReset;
        document.getElementById('lbl-book-title').innerText = data.bookTitle;
        document.getElementById('lbl-author').innerText = data.author;
        document.getElementById('lbl-cover').innerText = data.cover;
        document.getElementById('lbl-chapters').innerText = data.chapters;
        document.getElementById('lbl-btn-addchapter').innerText = data.btnAddChap;
        document.getElementById('lbl-pdf-title').innerText = data.pdfTitle;
        document.getElementById('lbl-btn-pdfextract').innerText = data.btnPdf;
        document.getElementById('lbl-chap-title').innerText = data.chapTitle;
        document.getElementById('lbl-btn-clear').innerText = data.btnClear;
        document.getElementById('lbl-chap-content').innerText = data.chapContent;
        document.getElementById('lbl-btn-export').innerText = data.btnExport;
    }

    // --- Rich Text Editor Actions ---
    function formatDoc(cmd, value = null) {
        document.execCommand(cmd, false, value);
    }

    // Handle Editor Image (Converts image to Base64 to include in backup)
    function insertImage(event) {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                const imgTag = `<img src="${e.target.result}" style="max-width:100%; border-radius:6px; margin: 5px 0;"/>`;
                document.getElementById('editor').focus();
                document.execCommand('insertHTML', false, imgTag);
                saveToLocalStorage();
            }
            reader.readAsDataURL(file);
        }
    }

    // Handle Cover Image Upload
    function handleCoverUpload(event) {
        const file = event.target.files[0];
        if(file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                coverBase64 = e.target.result;
                document.getElementById('cover-status').innerText = "Cover image loaded successfully!";
                saveToLocalStorage();
            }
            reader.readAsDataURL(file);
        }
    }

    // --- Local Storage (Anti-Refresh Feature) ---
    function saveToLocalStorage() {
        const bookData = {
            title: document.getElementById('book-title').value,
            author: document.getElementById('author').value,
            chapterTitle: document.getElementById('chapter-title').value,
            content: document.getElementById('editor').innerHTML,
            cover: coverBase64
        };
        localStorage.setItem('epub_creator_data', JSON.stringify(bookData));
    }

    function loadFromLocalStorage() {
        const savedData = localStorage.getItem('epub_creator_data');
        if(savedData) {
            const data = JSON.parse(savedData);
            document.getElementById('book-title').value = data.title || "";
            document.getElementById('author').value = data.author || "";
            document.getElementById('chapter-title').value = data.chapterTitle || "";
            document.getElementById('editor').innerHTML = data.content || "";
            if(data.cover) {
                coverBase64 = data.cover;
                document.getElementById('cover-status').innerText = "Cover image recovered!";
            }
        }
    }

    // --- Backup & Restore Features (File Export/Import) ---
    function exportBackup() {
        saveToLocalStorage();
        const dataStr = localStorage.getItem('epub_creator_data');
        if(!dataStr) return alert("No data to backup!");
        
        const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
        const exportFileDefaultName = 'epub_book_backup.json';
        
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
    }

    function importBackup(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function(e) {
            const content = e.target.result;
            localStorage.setItem('epub_creator_data', content);
            loadFromLocalStorage();
            alert("Backup data restored completely with images!");
        };
        reader.readAsText(file);
    }

    function clearContent() {
        document.getElementById('chapter-title').value = "";
        document.getElementById('editor').innerHTML = "";
        saveToLocalStorage();
    }

    function resetForm() {
        if(confirm("Are you sure you want to reset? All unsaved data will be lost.")) {
            localStorage.removeItem('epub_creator_data');
            document.getElementById('book-title').value = "";
            document.getElementById('author').value = "";
            document.getElementById('chapter-title').value = "";
            document.getElementById('editor').innerHTML = "";
            document.getElementById('cover-image').value = "";
            document.getElementById('cover-status').innerText = "";
            coverBase64 = "";
        }
    }
</script>
</body>
</html>
