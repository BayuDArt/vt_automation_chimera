document.addEventListener('DOMContentLoaded', () => {
    // ... (semua deklarasi elemen DOM Anda tetap sama) ...
    const hashInput = document.getElementById('hash-input');
    const filenameInput = document.getElementById('filename-input');
    const resultContent = document.getElementById('result-content');
    const copyButton = document.getElementById('copy-button');
    const templateControls = document.querySelector('.template-controls');
    const addTemplateOverlay = document.getElementById('add-template-overlay');
    const templateNameInput = document.getElementById('template-name-input');
    const templateContentInput = document.getElementById('template-content-input');
    const saveTemplateBtn = document.getElementById('save-template-btn');
    const cancelTemplateBtn = document.getElementById('cancel-template-btn');
    const dialogOverlay = document.getElementById('dialog-overlay');
    const dialogMessage = document.getElementById('dialog-message');
    const dialogCloseBtn = document.getElementById('dialog-close-btn');

    let currentCtiData = null;
    let baseTemplates = {};
    let userTemplates = {};
    let activeTemplateId = null;

    // --- TEMPLATE MANAGEMENT ---

    async function loadTemplates() {
        try {
            const response = await fetch('/api/templates');
            if (!response.ok) throw new Error('Failed to load base templates');
            baseTemplates = await response.json();

            const storedUserTemplates = localStorage.getItem('userCustomTemplates');
            userTemplates = storedUserTemplates ? JSON.parse(storedUserTemplates) : {};
            
            renderTemplateButtons();
        } catch (error) {
            console.error('Error loading templates:', error);
            templateControls.innerHTML = '<p style="color: red;">Could not load templates.</p>';
        }
    }

    /**
     * =================================================================
     * FUNGSI renderTemplateButtons YANG TELAH DIPERBARUI SECARA TOTAL
     * =================================================================
     */
    function renderTemplateButtons() {
        templateControls.innerHTML = ''; // Selalu kosongkan container dulu

        // 1. Buat tombol-tombol yang tidak bisa dihapus (Bawaan)
        createTemplateButton('Raw CTI Result', 'raw', false); // `false` berarti tidak bisa dihapus
        for (const id in baseTemplates) {
            createTemplateButton(baseTemplates[id].name, id, false);
        }

        // 2. Buat tombol-tombol untuk template kustom PENGGUNA (Bisa Dihapus)
        for (const id in userTemplates) {
            createTemplateButton(userTemplates[id].name, id, true); // `true` berarti bisa dihapus
        }

        // 3. Buat tombol "Add Template +" di akhir dengan ikon SVG
        const addButtonIcon = `
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="14" cy="14" r="14" fill="#D9D9D9"/>
            <path d="M13 15H7V13H13V7H15V13H21V15H15V21H13V15Z" fill="#757575"/>
        </svg>
        `;

        const addButton = document.createElement('button');
        // Kita tambahkan class khusus 'add-template-btn' untuk styling yang lebih spesifik
        addButton.className = 'template-btn add-template-btn';

        // Menggunakan innerHTML untuk memasukkan teks DAN ikon SVG
        addButton.innerHTML = `
        <span>Add Template</span>
        ${addButtonIcon}
        `;

        addButton.addEventListener('click', () => {
            templateNameInput.value = '';
            templateContentInput.value = '';
            addTemplateOverlay.style.display = 'flex';
        });
        templateControls.appendChild(addButton);

        // Perbarui highlight tombol yang aktif
        updateActiveButton();
    }
    
    /**
     * Helper untuk membuat satu tombol template, sekarang dengan opsi hapus
     */
    function createTemplateButton(name, id, isDeletable) {
        // Buat container untuk menampung tombol utama dan tombol hapus
        const container = document.createElement('div');
        container.className = 'template-btn-container';

        const button = document.createElement('button');
        button.className = 'template-btn';
        button.textContent = name;
        button.dataset.templateId = id;
        button.addEventListener('click', () => applyTemplate(id));
        
        container.appendChild(button);

        // Jika tombolnya bisa dihapus, tambahkan ikon 'X'
        if (isDeletable) {
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'delete-template-btn';
            deleteBtn.innerHTML = '&times;'; // Simbol 'X'
            deleteBtn.title = 'Delete this template';
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation(); // Hentikan event agar tidak memicu tombol utama
                deleteTemplate(id, name);
            });
            container.appendChild(deleteBtn);
        }
        
        templateControls.appendChild(container);
    }
    
    /**
     * =================================================================
     * FUNGSI BARU UNTUK MENGHAPUS TEMPLATE
     * =================================================================
     */
    function deleteTemplate(templateId, templateName) {
        // Minta konfirmasi dari pengguna
        if (confirm(`Are you sure you want to delete the template "${templateName}"?`)) {
            // Hapus dari object JavaScript
            delete userTemplates[templateId];
            
            // Perbarui localStorage
            localStorage.setItem('userCustomTemplates', JSON.stringify(userTemplates));
            
            // Jika template yang dihapus adalah yang sedang aktif, kembali ke 'raw'
            if (activeTemplateId === templateId) {
                applyTemplate('raw');
            }
            
            // Render ulang semua tombol untuk menampilkan perubahan
            renderTemplateButtons();
            
            showDialog('Template has been deleted.');
        }
    }

    function saveNewTemplate() {
        const name = templateNameInput.value.trim();
        const content = templateContentInput.value.trim();

        if (!name || !content) {
            showDialog('Template name and content cannot be empty.');
            return;
        }

        const id = `user_${name.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}`;
        userTemplates[id] = { name, content };
        localStorage.setItem('userCustomTemplates', JSON.stringify(userTemplates));

        addTemplateOverlay.style.display = 'none';
        renderTemplateButtons();
        showDialog('Template saved successfully!');
    }

    // --- CORE APPLICATION LOGIC (Fungsi di bawah ini tidak berubah) ---

    async function performSearch() {
        const hashValue = hashInput.value.trim();
        const fileName = filenameInput.value.trim();
        if (!hashValue) {
            showDialog('Please enter a hash value.');
            return;
        }
        resultContent.textContent = 'Searching... Please wait.';
        currentCtiData = null;
        try {
            const response = await fetch('/api/check', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ioc_value: hashValue,
                    ioc_type: 'hash',
                    file_name: fileName,
                }),
            });
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            currentCtiData = await response.json();
            applyTemplate(activeTemplateId || 'raw');
        } catch (error) {
            console.error('Search error:', error);
            resultContent.textContent = `Error during search: ${error.message}`;
            currentCtiData = null;
        }
    }

    function applyTemplate(templateId) {
        if (templateId !== 'raw' && !currentCtiData) {
            showDialog('Please run a scan first to apply a template.');
            return;
        }
        activeTemplateId = templateId;
        const allTemplates = { ...baseTemplates, ...userTemplates };
        let finalContent = '';
        if (templateId === 'raw') {
            finalContent = currentCtiData ? currentCtiData.scan_output : '* Results will be displayed here after searching...';
        } else if (allTemplates[templateId]) {
            const templateContent = allTemplates[templateId].content;
            finalContent = replacePlaceholders(templateContent, currentCtiData);
        } else {
            finalContent = 'Template not found.';
        }
        resultContent.textContent = finalContent;
        updateActiveButton();
    }
    
    function replacePlaceholders(templateString, data) {
        const now = new Date();
        const date = now.toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' });
        const time = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

        return templateString
            .replace(/{{hash}}/g, data.ioc_value || 'N/A')
            .replace(/{{filename}}/g, data.file_name || 'N/A')
            .replace(/{{hasil_cti}}/g, data.scan_output || 'No CTI results available.')
            .replace(/{{date}}/g, date)
            .replace(/{{time}}/g, time);
    }
    
    function updateActiveButton() {
        // Logika ini perlu disesuaikan karena sekarang tombol ada di dalam container
        document.querySelectorAll('.template-btn-container').forEach(container => {
            const button = container.querySelector('.template-btn');
            if(button){
                 button.classList.toggle('active', button.dataset.templateId === activeTemplateId);
            }
        });
    }

    // --- EVENT LISTENERS (Tidak berubah) ---
    hashInput.addEventListener('keypress', (e) => e.key === 'Enter' && performSearch());
    filenameInput.addEventListener('keypress', (e) => e.key === 'Enter' && performSearch());
    copyButton.addEventListener('click', () => {
        navigator.clipboard.writeText(resultContent.textContent)
            .then(() => showDialog('Result copied to clipboard!'))
            .catch(err => {
                console.error('Copy failed:', err);
                showDialog('Failed to copy text.');
            });
    });
    saveTemplateBtn.addEventListener('click', saveNewTemplate);
    cancelTemplateBtn.addEventListener('click', () => addTemplateOverlay.style.display = 'none');
    dialogCloseBtn.addEventListener('click', () => dialogOverlay.style.display = 'none');
    function showDialog(message) {
        dialogMessage.textContent = message;
        dialogOverlay.style.display = 'flex';
    }

    // --- INISIALISASI ---
    loadTemplates();
});