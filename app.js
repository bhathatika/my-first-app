let bookChapters = [];
let currentChapterId = null;
let coverBase64 = "";

// ဓာတ်ပုံချုံ့သည့်စနစ်
async function compressImage(file, maxWidth, maxHeight, quality) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = function(e) {
            const img = new Image();
            img.src = e.target.result;
            img.onload = function() {
                const canvas = document.createElement('canvas');
                let w = img.width, h = img.height;
                if (w > maxWidth || h > maxHeight) {
                    if (w > h) { h *= maxWidth / w; w = maxWidth; }
                    else { w *= maxHeight / h; h = maxHeight; }
                }
                canvas.width = w; canvas.height = h;
                canvas.getContext('2d').drawImage(img, 0, 0, w, h);
                resolve(canvas.toDataURL('image/jpeg', quality));
            };
        };
    });
}

// 🌟 Chrome အတွက် အထူးပြင်ဆင်ထားသော ပုံထည့်သည့်စနစ် 🌟
async function insertImagesToEditor(event) {
    const files = event.target.files;
    if (!files.length) return;
    const editor = document.getElementById('editor');
    
    // တစ်ပုံချင်းစီ အစီအစဉ်အတိုင်း ထည့်ခြင်း (Memory အဆင်ပြေစေရန်)
    for (let i = 0; i < files.length; i++) {
        const base64 = await compressImage(files[i], 800, 800, 0.7);
        const div = document.createElement('div');
        div.innerHTML = `<p style="text-align:center;"><img src="${base64}" style="max-width:100%;" /></p>`;
        editor.appendChild(div);
    }
    saveCurrentChapterContentLive();
    event.target.value = "";
}

// ကျန်သော လုပ်ဆောင်ချက်များ (Title, Save, Load, etc...) အရင်အတိုင်းပဲ ထားပါ
function saveCurrentBookState() {
    const state = {
        title: document.getElementById('book-title').value,
        author: document.getElementById('author').value,
        chapters: bookChapters,
        cover: coverBase64
    };
    localStorage.setItem('epub_creator_pro_state', JSON.stringify(state));
}

// generateEPUB function မှာတော့ Array.from သုံးထားတာကိုပဲ ဆက်သုံးပါ
// (ဒါက အရင်ကုဒ်အတိုင်းပဲ ဖြစ်ပါတယ်)
