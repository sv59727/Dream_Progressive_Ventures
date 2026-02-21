import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
    getFirestore,
    collection,
    addDoc,
    getDocs,
    deleteDoc,
    doc,
    query,
    orderBy,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import {
    getAuth,
    signInWithEmailAndPassword,
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

/* ====================================================
   FIREBASE CONFIGURATION
   ==================================================== */
const firebaseConfig = {
    apiKey: "AIzaSyDEPLVXLHQzK9sWxhYmPjc4uMx5Xjeydac",
    authDomain: "dream-progressive-ventures.firebaseapp.com",
    projectId: "dream-progressive-ventures",
    storageBucket: "dream-progressive-ventures.firebasestorage.app",
    messagingSenderId: "316380502448",
    appId: "1:316380502448:web:6b4d9138052e7d5a139e75",
    measurementId: "G-T62FVHSF10"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

let activeCategory = 'sites';
let uploadedPhotosBase64 = [];

/* ====================================================
   CORE SYSTEM INITIALIZATION
   ==================================================== */
document.addEventListener('DOMContentLoaded', () => {
    // Mobile Menu Toggle
    const mobileBtn = document.querySelector('.mobile-menu-btn');
    const navLinks = document.querySelector('.nav-links');

    if (mobileBtn) {
        mobileBtn.addEventListener('click', () => {
            navLinks.classList.toggle('active');
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
            if (navLinks && navLinks.classList.contains('active')) {
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
                window.scrollTo({ top: offsetPosition, behavior: "smooth" });
            }
        });
    });

    // Scroll Animation Observer
    const observerOptions = { threshold: 0.1 };
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) entry.target.classList.add('visible');
        });
    }, observerOptions);

    document.querySelectorAll('.section').forEach(section => observer.observe(section));

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
            fetch("https://formsubmit.co/ajax/vsonu4428@gmail.com", {
                method: "POST",
                body: formData
            })
                .then(response => response.json())
                .then(data => {
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
                    Swal.fire({
                        title: 'Submission Failed',
                        text: 'Something went wrong. Please try again later.',
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
    onAuthStateChanged(auth, (user) => {
        updateAdminUI();
    });

    initSystem();
});

/* ====================================================
   DATA MANAGEMENT (FIRESTORE)
   ==================================================== */

async function initSystem() {
    // UI update handled by onAuthStateChanged
}

async function getData(category) {
    try {
        const snapshot = await getDocs(collection(db, category));
        const data = snapshot.docs.map(docSnap => ({
            id: docSnap.id,
            ...docSnap.data()
        }));
        // Sort locally by timestamp since server-side orderBy requires manual indexes
        return data.sort((a, b) => {
            const timeA = a.timestamp?.seconds || 0;
            const timeB = b.timestamp?.seconds || 0;
            return timeB - timeA;
        });
    } catch (e) {
        console.error("Firestore Read Error:", e);
        return [];
    }
}

async function saveData(category, item) {
    try {
        item.timestamp = serverTimestamp();
        await addDoc(collection(db, category), item);
    } catch (e) {
        console.error("Firestore Write Error:", e);
        alert("Failed to save: " + e.message);
    }
}

async function deleteFromCloud(category, docId) {
    try {
        await deleteDoc(doc(db, category, docId));
    } catch (e) {
        console.error("Firestore Delete Error:", e);
    }
}

/* ====================================================
   UI HANDLERS
   ==================================================== */

function handleAdminAuth() {
    if (auth.currentUser) {
        signOut(auth).then(() => {
            updateAdminUI();
            Swal.fire({ title: 'Logged Out', icon: 'success', timer: 1000, showConfirmButton: false });
        });
        return;
    }

    Swal.fire({
        title: 'Admin Login',
        html: `
            <input id="adminEmail" class="swal2-input" placeholder="Email">
            <input id="adminPassword" type="password" class="swal2-input" placeholder="Password">
        `,
        confirmButtonText: 'Login',
        confirmButtonColor: '#1a3c34',
        focusConfirm: false,
        preConfirm: () => {
            const email = document.getElementById('adminEmail').value;
            const password = document.getElementById('adminPassword').value;
            if (!email || !password) {
                Swal.showValidationMessage('Please enter both email and password');
                return false;
            }
            return signInWithEmailAndPassword(auth, email, password)
                .catch(error => {
                    Swal.showValidationMessage('Login Failed: ' + error.message);
                });
        }
    }).then(result => {
        if (result.isConfirmed) {
            updateAdminUI();
        }
    });
}

function updateAdminUI() {
    const isAdmin = !!auth.currentUser;
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
    if (category === 'selling' && !auth.currentUser) {
        openAddModal('selling');
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
    document.querySelectorAll('.btn-view-sites').forEach(b => b.classList.remove('open'));

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
    const isAdmin = !!auth.currentUser;

    if (manageBtn) manageBtn.style.display = isAdmin ? 'flex' : 'none';

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

    const currentPhotosCount = uploadedPhotosBase64.filter(p => p !== null).length;

    // Safety check: Max 3 photos total
    if (currentPhotosCount + files.length > 3) {
        Swal.fire({
            title: "Limit Exceeded",
            text: "To stay within free storage limits, please upload maximum 3 photos per property.",
            icon: "warning",
            confirmButtonColor: "#1a3c34"
        });
        return;
    }

    files.forEach(file => {
        // Safety check: 5MB File size limit
        if (file.size > 5 * 1024 * 1024) {
            Swal.fire({
                title: "File Too Large",
                text: `${file.name} is over 5MB. Please choose a smaller file.`,
                icon: "error",
                confirmButtonColor: "#c0392b"
            });
            return;
        }

        const reader = new FileReader();
        reader.onload = async function (e) {
            const rawBase64 = e.target.result;
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

function compressImage(base64Str, maxWidth = 900, quality = 0.6) {
    return new Promise((resolve) => {
        const img = new Image();
        img.src = base64Str;

        img.onload = () => {
            const canvas = document.createElement('canvas');

            let width = img.width;
            let height = img.height;

            // Resize if larger than maxWidth
            if (width > maxWidth) {
                height = (maxWidth / width) * height;
                width = maxWidth;
            }

            canvas.width = width;
            canvas.height = height;

            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);

            // Force JPEG output (smaller than PNG)
            const compressedBase64 = canvas.toDataURL('image/jpeg', quality);

            resolve(compressedBase64);
        };
    });
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

    const item = {
        title,
        address: activeCategory === 'market' ? '' : address,
        description,
        photos,
        date: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    };

    await saveData(activeCategory, item);
    closeModal('addSiteModal');
    Swal.fire({ title: 'Published! 🎉', icon: 'success', confirmButtonColor: '#1a3c34' }).then(() => openViewGallery(activeCategory));
}

async function openViewGallery(category) {
    activeCategory = category;
    const isAdmin = !!auth.currentUser;
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
                    <button class="${ownerMode ? 'delete-site-btn owner-logged' : 'delete-site-btn'}" onclick="deleteItem('${item.id}')">
                        <i class="fas fa-trash-alt"></i> Delete
                    </button>
                </div>
            </div>`;
        gallery.appendChild(card);
    });
}

async function deleteItem(id) {
    if (!auth.currentUser) return;
    const result = await Swal.fire({ title: 'Delete entry?', icon: 'warning', showCancelButton: true, confirmButtonColor: '#c0392b' });
    if (result.isConfirmed) {
        await deleteFromCloud(activeCategory, id);
        await renderGallery(true, activeCategory);
        Swal.fire({ title: 'Deleted', icon: 'success', timer: 1000, showConfirmButton: false });
    }
}

function openLightbox(src) { document.getElementById('lightboxImg').src = src; document.getElementById('lightboxOverlay').classList.add('active'); document.body.style.overflow = 'hidden'; }
function closeLightbox() { document.getElementById('lightboxOverlay').classList.remove('active'); document.body.style.overflow = ''; }
function showModal(id) { document.getElementById(id).classList.add('active'); document.body.style.overflow = 'hidden'; }
function closeModal(id) { document.getElementById(id).classList.remove('active'); document.body.style.overflow = ''; }
function closeAddSiteModal() { closeModal('addSiteModal'); }
function openOwnerGallery() { closeModal('addSiteModal'); openViewGallery(activeCategory); }
function closeOwnerGallery() { closeModal('viewSitesModal'); }

/* ====================================================
   GLOBAL EXPORTS (For HTML onclick handlers)
   ==================================================== */
window.handleAdminAuth = handleAdminAuth;
window.handleCategoryAction = handleCategoryAction;
window.toggleAdminMenu = toggleAdminMenu;
window.openAddModal = openAddModal;
window.openViewGallery = openViewGallery;
window.openLightbox = openLightbox;
window.closeLightbox = closeLightbox;
window.showModal = showModal;
window.closeModal = closeModal;
window.closeAddSiteModal = closeAddSiteModal;
window.openOwnerGallery = openOwnerGallery;
window.closeOwnerGallery = closeOwnerGallery;
window.previewPhotos = previewPhotos;
window.removePreviewPhoto = removePreviewPhoto;
window.saveSite = saveSite;
window.deleteItem = deleteItem;
