document.addEventListener('DOMContentLoaded', () => {
    // Mobile Menu Toggle
    const mobileBtn = document.querySelector('.mobile-menu-btn');
    const navLinks = document.querySelector('.nav-links');

    if (mobileBtn) {
        mobileBtn.addEventListener('click', () => {
            navLinks.classList.toggle('active');

            // Optional: Toggle icon between bars and times
            const icon = mobileBtn.querySelector('i');
            if (navLinks.classList.contains('active')) {
                icon.classList.remove('fa-bars');
                icon.classList.add('fa-times');
            } else {
                icon.classList.remove('fa-times');
                icon.classList.add('fa-bars');
            }
        });
    }

    // Smooth Scrolling for Anchors
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();

            // Close mobile menu if open
            if (navLinks.classList.contains('active')) {
                navLinks.classList.remove('active');
                const icon = mobileBtn.querySelector('i');
                icon.classList.remove('fa-times');
                icon.classList.add('fa-bars');
            }

            const targetId = this.getAttribute('href');
            if (targetId === '#') return;

            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                const headerOffset = 80;
                const elementPosition = targetElement.getBoundingClientRect().top;
                const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

                window.scrollTo({
                    top: offsetPosition,
                    behavior: "smooth"
                });
            }
        });
    });

    // Scroll Animation Observer
    const observerOptions = {
        threshold: 0.1
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, observerOptions);

    document.querySelectorAll('.section').forEach(section => {
        observer.observe(section);
    });

    // Form Submission Handler
    const contactForm = document.querySelector('.contact-form');
    if (contactForm) {
        contactForm.addEventListener('submit', function (e) {
            e.preventDefault();

            const submitBtn = contactForm.querySelector('button[type="submit"]');
            const originalBtnText = submitBtn.innerText;
            submitBtn.innerText = 'Sending...';
            submitBtn.disabled = true;

            const formData = new FormData(this);

            // Using FormSubmit.co AJAX endpoint
            fetch("https://formsubmit.co/ajax/vsonu4428@gmail.com", {
                method: "POST",
                body: formData
            })
                .then(response => response.json())
                .then(data => {
                    if (data.success === "false" || (data.message && data.message.includes("fail"))) {
                        throw new Error(data.message || 'Submission failed');
                    }

                    Swal.fire({
                        title: 'Message Sent!',
                        text: 'Thank you for connecting with Dream Progressive Ventures. We will get back to you shortly.',
                        icon: 'success',
                        confirmButtonColor: '#1a3c34',
                        confirmButtonText: 'Great!'
                    });
                    contactForm.reset();
                })
                .catch(error => {
                    console.error('Error:', error);

                    let errorMsg = 'Something went wrong. Please try again later.';

                    // Helpful message for local testing
                    if (window.location.protocol === 'file:') {
                        errorMsg = "It looks like you're running this file locally. Form submission services usually require a live web server (http/https) to specific referrers. Please upload your site to test the email feature fully.";
                    }

                    Swal.fire({
                        title: 'Submission Failed',
                        text: errorMsg,
                        icon: 'error',
                        confirmButtonColor: '#1a3c34'
                    });
                })
                .finally(() => {
                    submitBtn.innerText = originalBtnText;
                    submitBtn.disabled = false;
                });
        });
    }

    // Close dropdown when clicking outside
    document.addEventListener('click', function (e) {
        const dropdowns = document.querySelectorAll('.sites-dropdown');
        const buttons = document.querySelectorAll('.btn-view-sites');

        let clickedInside = false;
        dropdowns.forEach(d => { if (d.contains(e.target)) clickedInside = true; });
        buttons.forEach(b => { if (b.contains(e.target)) clickedInside = true; });

        if (!clickedInside) {
            dropdowns.forEach(d => d.classList.remove('open'));
            buttons.forEach(b => b.classList.remove('open'));
            document.querySelectorAll('.service-card').forEach(c => c.style.zIndex = '');
        }
    });

    // Initialize System
    initSystem();
});

/* ====================================================
   HIGH-CAPACITY STORAGE & IMAGE SYSTEM
   ==================================================== */

const OWNER_PASSWORD = 'sonu@123';
const DB_NAME = 'DPV_Database';
const DB_VERSION = 1;
const STORE_NAME = 'content';
const STORAGE_PREFIX = 'dpv_'; // for legacy migration

let activeCategory = 'sites';
let uploadedPhotosBase64 = [];
let db;

async function initSystem() {
    await initDB();
    await migrateLegacyData();
    updateAdminUI();
}

// ---- IndexedDB Manager ----
function initDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME);
            }
        };
        request.onsuccess = (e) => { db = e.target.result; resolve(db); };
        request.onerror = (e) => { console.error('DB Error', e); reject(e); };
    });
}

function getData(category) {
    return new Promise((resolve) => {
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(category);
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => resolve([]);
    });
}

function saveData(category, data) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.put(data, category);
        request.onsuccess = () => resolve();
        request.onerror = (e) => reject(e);
    });
}

// Migrate data from localStorage to IndexedDB once
async function migrateLegacyData() {
    const migratedKey = 'dpv_migrated_to_idb';
    if (localStorage.getItem(migratedKey)) return;

    const categories = ['sites', 'plots', 'market', 'selling'];
    for (const cat of categories) {
        const localData = localStorage.getItem(STORAGE_PREFIX + cat);
        if (localData) {
            try {
                const parsed = JSON.parse(localData);
                await saveData(cat, parsed);
                console.log(`Migrated ${cat} to IndexedDB`);
            } catch (e) { console.error('Migration failed for', cat); }
        }
    }
    localStorage.setItem(migratedKey, 'true');
}

// ---- Image Compression Utility ----
function compressImage(base64Str, maxWidth = 1200, quality = 0.7) {
    return new Promise((resolve) => {
        const img = new Image();
        img.src = base64Str;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;

            if (width > maxWidth) {
                height = (maxWidth / width) * height;
                width = maxWidth;
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', quality));
        };
    });
}

// ---- Admin Auth Handle ----
function handleAdminAuth() {
    if (sessionStorage.getItem('adminAuth') === 'true') {
        Swal.fire({
            title: 'Logout Admin?',
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Yes, Logout',
            confirmButtonColor: '#c0392b'
        }).then(result => {
            if (result.isConfirmed) {
                sessionStorage.removeItem('adminAuth');
                updateAdminUI();
                Swal.fire({ title: 'Logged Out', icon: 'success', timer: 1000, showConfirmButton: false });
            }
        });
        return;
    }

    Swal.fire({
        title: 'Admin Login',
        input: 'password',
        inputPlaceholder: 'Enter admin password',
        inputAttributes: { autocapitalize: 'off', autocorrect: 'off' },
        showCancelButton: true,
        confirmButtonText: 'Login',
        confirmButtonColor: '#1a3c34',
    }).then((result) => {
        if (result.isConfirmed) {
            if (result.value === OWNER_PASSWORD) {
                sessionStorage.setItem('adminAuth', 'true');
                updateAdminUI();
                Swal.fire({ title: 'Welcome Admin!', icon: 'success', timer: 1500, showConfirmButton: false });
            } else {
                Swal.fire({ title: 'Incorrect Password', icon: 'error', confirmButtonColor: '#1a3c34' });
            }
        }
    });
}

function updateAdminUI() {
    const isAdmin = sessionStorage.getItem('adminAuth') === 'true';
    const loginBtn = document.getElementById('adminLoginBtn');

    if (loginBtn) {
        loginBtn.innerHTML = isAdmin ? '<i class="fas fa-unlock"></i> Logout' : '<i class="fas fa-lock"></i> Admin';
        loginBtn.classList.toggle('admin-logged', isAdmin);
    }
    refreshCategoryButtons(isAdmin);
}

function refreshCategoryButtons(isAdmin) {
    const categories = [
        { id: 'homeBuyingActions', key: 'sites', label: 'Sites', visitorLabel: 'View Sites' },
        { id: 'marketActions', key: 'market', label: 'Market News', visitorLabel: 'Market News' },
        { id: 'plotsActions', key: 'plots', label: 'Plots', visitorLabel: 'View Plots' },
        { id: 'sellingActions', key: 'selling', label: 'Selling', visitorLabel: 'Sell Property' }
    ];

    categories.forEach(cat => {
        const container = document.getElementById(cat.id);
        if (!container) return;

        if (isAdmin) {
            container.innerHTML = `
                <div class="admin-dropdown-wrapper">
                    <button class="btn-view-sites admin-btn" onclick="toggleAdminMenu(event, '${cat.key}')">
                        Manage ${cat.label} <i class="fas fa-chevron-down"></i>
                    </button>
                    <div class="sites-dropdown" id="${cat.key}Dropdown">
                        <button onclick="openAddModal('${cat.key}')"><i class="fas fa-plus-circle"></i> Add New</button>
                        <button onclick="openViewGallery('${cat.key}')"><i class="fas fa-eye"></i> View All</button>
                    </div>
                </div>`;
        } else if (cat.key === 'selling') {
            // Special case for Selling: Allow both adding and viewing for visitors
            container.innerHTML = `
                <div class="visitor-actions-grid">
                    <button class="btn-view-sites" onclick="openAddModal('selling')">
                        <span class="btn-text">Sell Property</span>
                    </button>
                    <button class="btn-view-sites btn-secondary-view" onclick="openViewGallery('selling')">
                        <span class="btn-text">View Listed</span>
                    </button>
                </div>`;
        } else {
            container.innerHTML = `
                <button class="btn-view-sites" onclick="handleCategoryAction('${cat.key}')">
                    <span class="btn-text">${cat.visitorLabel}</span> <i class="fas fa-chevron-right"></i>
                </button>`;
        }
    });
}

function handleCategoryAction(category) {
    if (category === 'selling' && sessionStorage.getItem('adminAuth') !== 'true') {
        openAddModal('selling'); // Visitors can add directly for selling
    } else {
        openViewGallery(category);
    }
}

function toggleAdminMenu(e, category) {
    e.stopPropagation();
    const dropdown = document.getElementById(`${category}Dropdown`);
    const btn = e.currentTarget;
    const card = btn.closest('.service-card');
    const isOpen = dropdown.classList.contains('open');

    document.querySelectorAll('.sites-dropdown').forEach(d => d.classList.remove('open'));
    document.querySelectorAll('.btn-view-sites').forEach(b => b.classList.remove('open'));
    document.querySelectorAll('.service-card').forEach(c => c.style.zIndex = '');

    if (!isOpen) {
        dropdown.classList.add('open');
        btn.classList.add('open');
        if (card) card.style.zIndex = '100';
    }
}

function openAddModal(category) {
    activeCategory = category;
    prepareAddForm();
    showModal('addSiteModal');
}

function prepareAddForm() {
    document.getElementById('siteAddress').value = '';
    document.getElementById('siteTitle').value = '';
    document.getElementById('siteDescription').value = '';
    document.getElementById('photoPreviewGrid').innerHTML = '';
    document.getElementById('photoInput').value = '';
    uploadedPhotosBase64 = [];

    const modalTitle = document.querySelector('#addSiteModal h3');
    const modalSub = document.querySelector('#addSiteModal p');
    const addressField = document.getElementById('siteAddress').parentElement;
    const titleInput = document.getElementById('siteTitle');
    const descInput = document.getElementById('siteDescription');
    const manageBtn = document.querySelector('#addSiteModal .modal-btn-manage');
    const saveBtn = document.querySelector('#addSiteModal .modal-btn-primary');
    const isAdmin = sessionStorage.getItem('adminAuth') === 'true';

    // Hide "My Listings" button for normal users to avoid confusion
    if (manageBtn) {
        manageBtn.style.display = isAdmin ? 'flex' : 'none';
    }

    if (activeCategory === 'selling') {
        modalTitle.textContent = 'Sell Your Property';
        modalSub.textContent = 'Submit your property details for DPV to market it.';
        addressField.style.display = 'block';
        titleInput.placeholder = 'Property / Plot Title';
        descInput.placeholder = 'Your contact number & property details (sqft, price, etc.)';
        saveBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Submit Property';
    } else if (activeCategory === 'market') {
        modalTitle.textContent = 'Add Market Insight';
        modalSub.textContent = 'Share latest real estate news.';
        addressField.style.display = 'none';
        titleInput.placeholder = 'Insight Heading';
        descInput.placeholder = 'Write analysis...';
        saveBtn.innerHTML = '<i class="fas fa-save"></i> Save Site';
    } else if (activeCategory === 'plots') {
        modalTitle.textContent = 'Add New Plot';
        modalSub.textContent = 'List a new residential plot.';
        addressField.style.display = 'block';
        titleInput.placeholder = 'Plot Title';
        descInput.placeholder = 'Plot details...';
        saveBtn.innerHTML = '<i class="fas fa-save"></i> Save Site';
    } else {
        modalTitle.textContent = 'Add New Site';
        modalSub.textContent = 'Upload property details.';
        addressField.style.display = 'block';
        titleInput.placeholder = 'Property Title';
        descInput.placeholder = 'Property details...';
        saveBtn.innerHTML = '<i class="fas fa-save"></i> Save Site';
    }
}

function previewPhotos(input) {
    const grid = document.getElementById('photoPreviewGrid');
    const files = Array.from(input.files);

    files.forEach(file => {
        const reader = new FileReader();
        reader.onload = async function (e) {
            const rawBase64 = e.target.result;
            // Compress immediately for storage efficiency
            const compressedBase64 = await compressImage(rawBase64);
            uploadedPhotosBase64.push(compressedBase64);

            const idx = uploadedPhotosBase64.length - 1;
            const thumb = document.createElement('div');
            thumb.classList.add('preview-thumb');
            thumb.innerHTML = `
                <img src="${compressedBase64}" alt="preview">
                <button class="remove-photo" onclick="removePreviewPhoto(this, ${idx})" title="Remove">
                    <i class="fas fa-times"></i>
                </button>`;
            grid.appendChild(thumb);
        };
        reader.readAsDataURL(file);
    });
    input.value = '';
}

function removePreviewPhoto(btn, idx) {
    uploadedPhotosBase64[idx] = null;
    btn.closest('.preview-thumb').remove();
}

async function saveSite() {
    const address = document.getElementById('siteAddress').value.trim();
    const title = document.getElementById('siteTitle').value.trim();
    const description = document.getElementById('siteDescription').value.trim();
    const photos = uploadedPhotosBase64.filter(p => p !== null);

    if (activeCategory !== 'market' && !address) { alert('Please enter an address.'); return; }
    if (!title) { alert('Please enter a title.'); return; }
    if (activeCategory !== 'market' && photos.length === 0) { alert('Please upload at least one photo.'); return; }

    const data = await getData(activeCategory);
    data.push({
        id: Date.now(),
        title,
        address: activeCategory === 'market' ? '' : address,
        description,
        photos,
        date: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    });
    await saveData(activeCategory, data);

    closeModal('addSiteModal');
    Swal.fire({ title: 'Published! 🎉', icon: 'success', confirmButtonColor: '#1a3c34' }).then(() => openViewGallery(activeCategory));
}

async function openViewGallery(category) {
    activeCategory = category;
    const isAdmin = sessionStorage.getItem('adminAuth') === 'true';
    await renderGallery(isAdmin, category);
    showModal('viewSitesModal');
}

async function renderGallery(ownerMode, category) {
    const gallery = document.getElementById('sitesGallery');
    const items = await getData(category);
    gallery.innerHTML = '';

    const gTitle = document.getElementById('galleryModeTitle');
    const gSub = document.getElementById('galleryModeSub');

    let titleText = 'Properties';
    if (category === 'plots') titleText = ownerMode ? 'My Plots' : 'Available Plots';
    else if (category === 'market') titleText = ownerMode ? 'Market News' : 'Market Analysis';
    else if (category === 'selling') titleText = ownerMode ? 'Property Submissions' : 'Listed for Sale';
    else titleText = ownerMode ? 'My Listings' : 'Available Properties';

    if (gTitle) gTitle.innerHTML = ownerMode ? `${titleText} <span class="owner-mode-badge"><i class="fas fa-shield-alt"></i> Admin</span>` : titleText;
    if (gSub) gSub.textContent = ownerMode ? 'Admin view — manage entries' : 'Browse published listings';

    if (items.length === 0) {
        gallery.innerHTML = `<div class="empty-gallery"><h4>No Items Found</h4><p>Check back later!</p></div>`;
        return;
    }

    items.forEach(item => {
        const photosHTML = item.photos.map(src => `<div class="site-gallery-photo" onclick="openLightbox('${src}')"><img src="${src}" loading="lazy"></div>`).join('');
        const card = document.createElement('div');
        card.classList.add('site-card-gallery');
        if (category === 'market') card.classList.add('market-card');
        card.innerHTML = `
            ${item.photos.length > 0 ? `<div class="site-gallery-photos">${photosHTML}</div>` : ''}
            <div class="site-card-info">
                <h4>${item.title}</h4>
                ${item.address ? `<div class="site-card-address"><i class="fas fa-map-marker-alt"></i> ${item.address}</div>` : ''}
                ${item.description ? `<p class="site-card-desc">${item.description}</p>` : ''}
                <div class="site-card-meta">
                    <span class="site-card-date"><i class="fas fa-calendar-alt"></i> ${item.date}</span>
                    <button class="${ownerMode ? 'delete-site-btn owner-logged' : 'delete-site-btn'}" onclick="deleteItem(${item.id})">
                        <i class="fas fa-trash-alt"></i> Delete
                    </button>
                </div>
            </div>`;
        gallery.appendChild(card);
    });
}

async function deleteItem(id) {
    if (sessionStorage.getItem('adminAuth') !== 'true') return;
    const result = await Swal.fire({ title: 'Delete entry?', icon: 'warning', showCancelButton: true, confirmButtonColor: '#c0392b' });
    if (result.isConfirmed) {
        const data = (await getData(activeCategory)).filter(s => s.id !== id);
        await saveData(activeCategory, data);
        await renderGallery(true, activeCategory);
        Swal.fire({ title: 'Deleted', icon: 'success', timer: 1000, showConfirmButton: false });
    }
}

// Helpers (Modals / Lightbox)
function openLightbox(src) { document.getElementById('lightboxImg').src = src; document.getElementById('lightboxOverlay').classList.add('active'); document.body.style.overflow = 'hidden'; }
function closeLightbox() { document.getElementById('lightboxOverlay').classList.remove('active'); document.body.style.overflow = ''; }
function showModal(id) { document.getElementById(id).classList.add('active'); document.body.style.overflow = 'hidden'; }
function closeModal(id) { document.getElementById(id).classList.remove('active'); document.body.style.overflow = ''; }
function closeAddSiteModal() { closeModal('addSiteModal'); }
function openOwnerGallery() {
    closeModal('addSiteModal');
    openViewGallery(activeCategory);
}
function closeOwnerGallery() { closeModal('viewSitesModal'); }
document.querySelectorAll('.modal-overlay').forEach(overlay => overlay.addEventListener('click', function (e) { if (e.target === this) { this.classList.remove('active'); document.body.style.overflow = ''; } }));
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { document.querySelectorAll('.modal-overlay.active').forEach(m => m.classList.remove('active')); closeLightbox(); document.body.style.overflow = ''; } });


