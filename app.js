// app.js (Chrome RAM သက်သာအောင် အပြီးသတ်ပြင်ထားခြင်း)
async function insertImagesToEditor(event) {
    const files = event.target.files;
    const editor = document.getElementById('editor');
    for (let file of files) {
        // ပုံတစ်ပုံချင်းစီကို အရင်ချုံ့မည် (RAM မပြည့်စေရန်)
        const base64 = await compressImage(file, 600, 600, 0.6);
        const img = document.createElement('img');
        img.src = base64;
        img.style.width = "100%";
        img.style.margin = "10px 0";
        editor.appendChild(img);
    }
    saveCurrentChapterContentLive();
    event.target.value = "";
}

// ဒေါင်းလုဒ်ခလုတ် နှိပ်မရတာကို ဖြေရှင်းရန်
async function generateEPUB() {
    // ခလုတ်နှိပ်တာနဲ့ ဒီ Message တက်လာလား စမ်းကြည့်ပါ
    alert("ဒေါင်းလုဒ်လုပ်နေပါပြီ၊ ခဏစောင့်ပါ...");
    
    // ကျန်တာတွေက အရင်အတိုင်းပဲ...
}
