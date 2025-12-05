let db;
const DB_NAME = 'DriveLocalDB';
const DB_VERSION = 2;
const STORE_NAME = 'files';

let currentView = 'files';
let isOnline = navigator.onLine;


function initDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        
        request.onerror = () => {
            console.error('Erreur lors de l\'ouverture de la base de données');
            reject(request.error);
        };
        
        request.onsuccess = () => {
            db = request.result;
            console.log('Base de données ouverte avec succès');
            updateStats();
            displayFiles();
            resolve();
        };
        
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                const objectStore = db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
                objectStore.createIndex('name', 'name', { unique: false });
                objectStore.createIndex('type', 'type', { unique: false });
                objectStore.createIndex('size', 'size', { unique: false });
                objectStore.createIndex('date', 'date', { unique: false });
                objectStore.createIndex('shared', 'shared', { unique: false });
                objectStore.createIndex('trash', 'trash', { unique: false });
                objectStore.createIndex('lastModified', 'lastModified', { unique: false });
                console.log('Store d\'objets créé');
            }
            
            if (event.oldVersion < 2) {
                const transaction = event.target.transaction;
                const store = transaction.objectStore(STORE_NAME);
                
                if (!store.indexNames.contains('shared')) {
                    store.createIndex('shared', 'shared', { unique: false });
                }
                
                if (!store.indexNames.contains('trash')) {
                    store.createIndex('trash', 'trash', { unique: false });
                }
                
                if (!store.indexNames.contains('lastModified')) {
                    store.createIndex('lastModified', 'lastModified', { unique: false });
                }
            }
        };
    });
}

async function addFile(file) {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject('Base de données non initialisée');
            return;
        }

        if (file.size > 1024 * 1024) {
            reject('Le fichier dépasse la taille maximale de 1 Mo');
            return;
        }

        const reader = new FileReader();
        
        reader.onload = (event) => {
            const transaction = db.transaction([STORE_NAME], 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            
            const now = new Date();
            const fileData = {
                name: file.name,
                type: file.type,
                size: file.size,
                date: now.toISOString(),
                lastModified: now.getTime(),
                shared: false,
                trash: false,
                data: event.target.result
            };
            
            const request = store.add(fileData);
            
            request.onsuccess = () => {
                console.log('Fichier ajouté avec ID:', request.result);
                updateStats();
                displayFiles();
                resolve(request.result);
            };
            
            request.onerror = () => {
                reject(`Erreur lors de l'ajout du fichier: ${request.error}`);
            };
        };
        
        reader.onerror = () => {
            reject('Erreur lors de la lecture du fichier');
        };
        
        reader.readAsArrayBuffer(file);
    });
}

function getFilesByView() {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject('Base de données non initialisée');
            return;
        }
        
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAll();
        
        request.onsuccess = () => {
            let files = request.result;
            
            switch(currentView) {
                case 'files':
                    files = files.filter(file => !file.trash && !file.shared);
                    break;
                case 'recents':
                    const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
                    files = files.filter(file => !file.trash && file.lastModified > sevenDaysAgo);
                    files.sort((a, b) => b.lastModified - a.lastModified);
                    break;
                case 'shared':
                    files = files.filter(file => !file.trash && file.shared);
                    break;
                case 'trash':
                    files = files.filter(file => file.trash);
                    break;
            }
            
            if (currentView !== 'recents') {
                files.sort((a, b) => new Date(b.date) - new Date(a.date));
            }
            
            resolve(files);
        };
        
        request.onerror = () => {
            reject(`Erreur lors de la récupération des fichiers: ${request.error}`);
        };
    });
}

function moveToTrash(id) {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject('Base de données non initialisée');
            return;
        }
        
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const getRequest = store.get(id);
        
        getRequest.onsuccess = () => {
            const file = getRequest.result;
            if (!file) {
                reject('Fichier non trouvé');
                return;
            }
            
            file.trash = true;
            file.lastModified = Date.now();
            
            const updateRequest = store.put(file);
            
            updateRequest.onsuccess = () => {
                console.log('Fichier déplacé vers la corbeille avec ID:', id);
                updateStats();
                displayFiles();
                resolve();
            };
            
            updateRequest.onerror = () => {
                reject(`Erreur lors du déplacement vers la corbeille: ${updateRequest.error}`);
            };
        };
        
        getRequest.onerror = () => {
            reject(`Erreur lors de la récupération du fichier: ${getRequest.error}`);
        };
    });
}

function restoreFromTrash(id) {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject('Base de données non initialisée');
            return;
        }
        
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const getRequest = store.get(id);
        
        getRequest.onsuccess = () => {
            const file = getRequest.result;
            if (!file) {
                reject('Fichier non trouvé');
                return;
            }
            
            file.trash = false;
            file.lastModified = Date.now();
            
            const updateRequest = store.put(file);
            
            updateRequest.onsuccess = () => {
                console.log('Fichier restauré depuis la corbeille avec ID:', id);
                updateStats();
                displayFiles();
                resolve();
            };
            
            updateRequest.onerror = () => {
                reject(`Erreur lors de la restauration: ${updateRequest.error}`);
            };
        };
        
        getRequest.onerror = () => {
            reject(`Erreur lors de la récupération du fichier: ${getRequest.error}`);
        };
    });
}

function deletePermanently(id) {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject('Base de données non initialisée');
            return;
        }
        
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.delete(id);
        
        request.onsuccess = () => {
            console.log('Fichier supprimé définitivement avec ID:', id);
            updateStats();
            displayFiles();
            resolve();
        };
        
        request.onerror = () => {
            reject(`Erreur lors de la suppression définitive: ${request.error}`);
        };
    });
}

function toggleShared(id) {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject('Base de données non initialisée');
            return;
        }
        
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const getRequest = store.get(id);
        
        getRequest.onsuccess = () => {
            const file = getRequest.result;
            if (!file) {
                reject('Fichier non trouvé');
                return;
            }
            
            file.shared = !file.shared;
            file.lastModified = Date.now();
            
            const updateRequest = store.put(file);
            
            updateRequest.onsuccess = () => {
                console.log(`Fichier ${file.shared ? 'partagé' : 'départagé'} avec ID:`, id);
                updateStats();
                displayFiles();
                resolve(file.shared);
            };
            
            updateRequest.onerror = () => {
                reject(`Erreur lors de la modification du partage: ${updateRequest.error}`);
            };
        };
        
        getRequest.onerror = () => {
            reject(`Erreur lors de la récupération du fichier: ${getRequest.error}`);
        };
    });
}

function downloadFile(file) {
    const blob = new Blob([file.data], { type: file.type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

async function updateStats() {
    try {
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAll();
        
        request.onsuccess = () => {
            const files = request.result;
            const activeFiles = files.filter(file => !file.trash);
            const trashFiles = files.filter(file => file.trash);
            const sharedFiles = files.filter(file => !file.trash && file.shared);
            
            const totalSize = activeFiles.reduce((sum, file) => sum + file.size, 0);
            
            document.getElementById('fileCount').textContent = activeFiles.length;
            document.getElementById('storageUsed').textContent = formatFileSize(totalSize);
            document.getElementById('totalFiles').textContent = `${activeFiles.length} fichier${activeFiles.length !== 1 ? 's' : ''}`;
        };
    } catch (error) {
        console.error('Erreur lors de la mise à jour des statistiques:', error);
    }
}

async function displayFiles() {
    try {
        const files = await getFilesByView();
        const filesList = document.getElementById('filesList');
        
        if (files.length === 0) {
            let message = '';
            let icon = 'fa-folder-open';
            
            switch(currentView) {
                case 'files':
                    message = 'Déposez ou téléchargez des fichiers pour les voir apparaître ici.';
                    break;
                case 'recents':
                    message = 'Aucun fichier récent. Les fichiers modifiés dans les 7 derniers jours apparaîtront ici.';
                    icon = 'fa-clock';
                    break;
                case 'shared':
                    message = 'Aucun fichier partagé. Partagez des fichiers pour les voir apparaître ici.';
                    icon = 'fa-share-alt';
                    break;
                case 'trash':
                    message = 'La corbeille est vide. Les fichiers que vous supprimez apparaîtront ici.';
                    icon = 'fa-trash';
                    break;
            }
            
            filesList.innerHTML = `
                <div class="empty-state">
                    <i class="fas ${icon} empty-state-icon"></i>
                    <h3>Aucun fichier</h3>
                    <p>${message}</p>
                </div>
            `;
            return;
        }
        
        filesList.innerHTML = files.map(file => {
            const fileIcon = getFileIcon(file.type, file.name);
            const formattedSize = formatFileSize(file.size);
            const formattedDate = new Date(file.date).toLocaleDateString('fr-FR', {
                day: 'numeric',
                month: 'short',
                year: 'numeric'
            });
            
            let actionButtons = '';
            
            if (currentView === 'trash') {
                actionButtons = `
                    <button class="file-action-btn restore-btn" title="Restaurer">
                        <i class="fas fa-undo"></i>
                    </button>
                    <button class="file-action-btn delete-permanent-btn" title="Supprimer définitivement">
                        <i class="fas fa-trash"></i>
                    </button>
                `;
            } else {
                actionButtons = `
                    <button class="file-action-btn download-btn" title="Télécharger">
                        <i class="fas fa-download"></i>
                    </button>
                    <button class="file-action-btn share-btn" title="${file.shared ? 'Départager' : 'Partager'}">
                        <i class="fas ${file.shared ? 'fa-user-times' : 'fa-share-alt'}"></i>
                    </button>
                    <button class="file-action-btn delete-btn" title="Supprimer">
                        <i class="fas fa-trash"></i>
                    </button>
                `;
            }
            
            return `
                <div class="file-item" data-id="${file.id}">
                    <div class="file-icon ${fileIcon.class}">
                        <i class="${fileIcon.icon}"></i>
                    </div>
                    <div class="file-info">
                        <div class="file-name">
                            ${file.name}
                            ${file.shared ? '<span class="shared-badge">Partagé</span>' : ''}
                        </div>
                        <div class="file-details">${formattedSize} • ${formattedDate}</div>
                    </div>
                    <div class="file-actions">
                        ${actionButtons}
                    </div>
                </div>
            `;
        }).join('');
        
        if (!document.querySelector('#shared-badge-style')) {
            const style = document.createElement('style');
            style.id = 'shared-badge-style';
            style.textContent = `
                .shared-badge {
                    background-color: rgba(66, 133, 244, 0.1);
                    color: var(--primary-color);
                    font-size: 12px;
                    padding: 2px 8px;
                    border-radius: 10px;
                    margin-left: 8px;
                    font-weight: normal;
                }
            `;
            document.head.appendChild(style);
        }
        
        addFileActionListeners();
        
    } catch (error) {
        console.error('Erreur lors de l\'affichage des fichiers:', error);
        filesList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-triangle empty-state-icon"></i>
                <h3>Erreur</h3>
                <p>Impossible de charger les fichiers. Veuillez réessayer.</p>
            </div>
        `;
    }
}

function addFileActionListeners() {
    document.querySelectorAll('.download-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const fileItem = e.target.closest('.file-item');
            const fileId = parseInt(fileItem.dataset.id);
            
            try {
                const files = await getFilesByView();
                const file = files.find(f => f.id === fileId);
                if (file) {
                    downloadFile(file);
                }
            } catch (error) {
                console.error('Erreur lors du téléchargement:', error);
                alert('Erreur lors du téléchargement du fichier');
            }
        });
    });
    
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const fileItem = e.target.closest('.file-item');
            const fileId = parseInt(fileItem.dataset.id);
            
            if (confirm('Êtes-vous sûr de vouloir déplacer ce fichier vers la corbeille ?')) {
                try {
                    await moveToTrash(fileId);
                } catch (error) {
                    console.error('Erreur lors de la suppression:', error);
                    alert('Erreur lors de la suppression du fichier');
                }
            }
        });
    });
    
    document.querySelectorAll('.share-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const fileItem = e.target.closest('.file-item');
            const fileId = parseInt(fileItem.dataset.id);
            
            try {
                await toggleShared(fileId);
            } catch (error) {
                console.error('Erreur lors du partage:', error);
                alert('Erreur lors du partage du fichier');
            }
        });
    });
    
    document.querySelectorAll('.restore-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const fileItem = e.target.closest('.file-item');
            const fileId = parseInt(fileItem.dataset.id);
            
            try {
                await restoreFromTrash(fileId);
            } catch (error) {
                console.error('Erreur lors de la restauration:', error);
                alert('Erreur lors de la restauration du fichier');
            }
        });
    });
    
    document.querySelectorAll('.delete-permanent-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const fileItem = e.target.closest('.file-item');
            const fileId = parseInt(fileItem.dataset.id);
            
            if (confirm('Êtes-vous sûr de vouloir supprimer définitivement ce fichier ? Cette action est irréversible.')) {
                try {
                    await deletePermanently(fileId);
                } catch (error) {
                    console.error('Erreur lors de la suppression définitive:', error);
                    alert('Erreur lors de la suppression définitive du fichier');
                }
            }
        });
    });
}

function getFileIcon(type, name) {
    if (type.includes('pdf')) {
        return { icon: 'fas fa-file-pdf', class: 'pdf' };
    } else if (type.includes('image')) {
        return { icon: 'fas fa-file-image', class: 'img' };
    } else if (type.includes('word') || type.includes('document') || name.match(/\.(doc|docx)$/i)) {
        return { icon: 'fas fa-file-word', class: 'doc' };
    } else if (type.includes('zip') || type.includes('compressed') || name.match(/\.(zip|rar|7z|tar|gz)$/i)) {
        return { icon: 'fas fa-file-archive', class: 'zip' };
    } else {
        return { icon: 'fas fa-file', class: 'default' };
    }
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Octets';
    const k = 1024;
    const sizes = ['Octets', 'Ko', 'Mo', 'Go'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function setupDragAndDrop() {
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const browseButton = document.getElementById('browseButton');
    
    browseButton.addEventListener('click', () => {
        fileInput.click();
    });
    
    fileInput.addEventListener('change', async (e) => {
        const files = Array.from(e.target.files);
        await handleFiles(files);
        fileInput.value = '';
    });
    
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, preventDefaults, false);
    });
    
    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }
    
    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, highlight, false);
    });
    
    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, unhighlight, false);
    });
    
    function highlight() {
        dropZone.classList.add('dragover');
    }
    
    function unhighlight() {
        dropZone.classList.remove('dragover');
    }
    
    dropZone.addEventListener('drop', async (e) => {
        const dt = e.dataTransfer;
        const files = Array.from(dt.files);
        await handleFiles(files);
    });
}

async function handleFiles(files) {
    if (files.length === 0) return;
    
    let addedCount = 0;
    let errorCount = 0;
    
    for (const file of files) {
        try {
            await addFile(file);
            addedCount++;
        } catch (error) {
            console.error(`Erreur avec le fichier ${file.name}:`, error);
            errorCount++;
            
            if (error.includes('dépasse la taille maximale')) {
                alert(`Le fichier "${file.name}" dépasse la taille maximale de 1 Mo et n'a pas été ajouté.`);
            }
        }
    }
    
    if (addedCount > 0) {
        const message = `${addedCount} fichier${addedCount > 1 ? 's' : ''} ajouté${addedCount > 1 ? 's' : ''} avec succès.`;
        if (errorCount > 0) {
            alert(`${message} ${errorCount} fichier${errorCount > 1 ? 's' : ''} n'a${errorCount > 1 ? 'ont' : ''} pas pu être ajouté${errorCount > 1 ? 's' : ''}.`);
        } else {
            console.log(message);
        }
    }
}

function setupNavigation() {
    const navFiles = document.getElementById('nav-files');
    const navRecents = document.getElementById('nav-recents');
    const navShared = document.getElementById('nav-shared');
    const navTrash = document.getElementById('nav-trash');
    
    function changeView(view) {
        currentView = view;
        
        [navFiles, navRecents, navShared, navTrash].forEach(nav => nav.classList.remove('active'));
        
        const pageTitle = document.getElementById('page-title');
        const pageDescription = document.getElementById('page-description');
        const filesHeaderTitle = document.getElementById('files-header-title');
        const dropZoneContainer = document.getElementById('drop-zone-container');
        
        switch(view) {
            case 'files':
                navFiles.classList.add('active');
                pageTitle.textContent = 'Mes fichiers';
                pageDescription.textContent = 'Tous vos fichiers sont stockés localement sur cet appareil. La limite de taille est de 1 Mo par fichier.';
                filesHeaderTitle.textContent = 'Mes fichiers';
                dropZoneContainer.style.display = 'block';
                break;
            case 'recents':
                navRecents.classList.add('active');
                pageTitle.textContent = 'Fichiers récents';
                pageDescription.textContent = 'Fichiers modifiés ou ajoutés au cours des 7 derniers jours.';
                filesHeaderTitle.textContent = 'Fichiers récents';
                dropZoneContainer.style.display = 'none';
                break;
            case 'shared':
                navShared.classList.add('active');
                pageTitle.textContent = 'Fichiers partagés';
                pageDescription.textContent = 'Fichiers que vous avez partagés avec d\'autres utilisateurs.';
                filesHeaderTitle.textContent = 'Fichiers partagés';
                dropZoneContainer.style.display = 'none';
                break;
            case 'trash':
                navTrash.classList.add('active');
                pageTitle.textContent = 'Corbeille';
                pageDescription.textContent = 'Fichiers que vous avez supprimés. Ils seront conservés pendant 30 jours avant suppression définitive.';
                filesHeaderTitle.textContent = 'Corbeille';
                dropZoneContainer.style.display = 'none';
                break;
        }
        
        displayFiles();
    }
    
    navFiles.addEventListener('click', (e) => {
        e.preventDefault();
        changeView('files');
    });
    
    navRecents.addEventListener('click', (e) => {
        e.preventDefault();
        changeView('recents');
    });
    
    navShared.addEventListener('click', (e) => {
        e.preventDefault();
        changeView('shared');
    });
    
    navTrash.addEventListener('click', (e) => {
        e.preventDefault();
        changeView('trash');
    });
}

function setupOfflineMode() {
    const offlinePage = document.getElementById('offlinePage');
    const mainContent = document.getElementById('main-content');
    const footer = document.getElementById('footer');
    const connectionStatus = document.getElementById('connectionStatus');
    const connectionType = document.getElementById('connectionType');
    const showDetailsLink = document.getElementById('showDetailsLink');
    const errorDetails = document.getElementById('errorDetails');
    const retryButton = document.getElementById('retryButton');
    
    function updateConnectionStatus() {
        isOnline = navigator.onLine;
        
        if (isOnline) {
            offlinePage.style.display = 'none';
            mainContent.style.display = 'block';
            footer.style.display = 'flex';
            
            connectionStatus.className = 'connection-status online';
            connectionStatus.innerHTML = '<div class="status-dot"></div><span>En ligne</span>';
            connectionType.textContent = 'En ligne';
        } else {
            offlinePage.style.display = 'flex';
            mainContent.style.display = 'none';
            footer.style.display = 'none';
            
            connectionStatus.className = 'connection-status offline';
            connectionStatus.innerHTML = '<div class="status-dot"></div><span>Hors ligne</span>';
            connectionType.textContent = 'Hors ligne';
        }
    }
    
    window.addEventListener('online', updateConnectionStatus);
    window.addEventListener('offline', updateConnectionStatus);
    
    showDetailsLink.addEventListener('click', (e) => {
        e.preventDefault();
        const isHidden = errorDetails.style.display === 'none' || errorDetails.style.display === '';
        errorDetails.style.display = isHidden ? 'block' : 'none';
        showDetailsLink.textContent = isHidden ? 'Masquer les détails' : 'Pour plus de détails, cliquez ici';
    });
    
    retryButton.addEventListener('click', () => {
        retryButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Tentative de connexion...';
        retryButton.disabled = true;
        
        setTimeout(() => {
            if (navigator.onLine) {
                updateConnectionStatus();
                retryButton.innerHTML = '<i class="fas fa-redo"></i> Réessayer';
                retryButton.disabled = false;
            } else {
                retryButton.innerHTML = '<i class="fas fa-redo"></i> Réessayer';
                retryButton.disabled = false;
                alert('Impossible de se connecter. Vérifiez votre connexion Internet.');
            }
        }, 1500);
    });
    
    updateConnectionStatus();
}

document.addEventListener('DOMContentLoaded', async () => {
    try {
        if (!navigator.onLine) {
            setupOfflineMode();
            return;
        }
        
        await initDB();
        setupDragAndDrop();
        setupNavigation();
        setupOfflineMode();
        
        console.log('Application DriveLocal initialisée');
    } catch (error) {
        console.error('Erreur lors de l\'initialisation de l\'application:', error);
        
        const filesList = document.getElementById('filesList');
        if (filesList) {
            filesList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-exclamation-triangle empty-state-icon"></i>
                    <h3>Erreur d'initialisation</h3>
                    <p>Impossible d'initialiser l'application. Veuillez rafraîchir la page.</p>
                </div>
            `;
        }
    }
});

function goToPage(event){
    event.preventDefault();
    b1 = document.getElementById("oui");
    b2 = document.getElementById("non");
    if(b1.checked) {
        window.location.href = "snake.html";
    }
    else if(b2.checked){
        document.getElementById('message').innerText="Patientez, la connexion va bientôt fonctionner à nouveau…";

    }
    else{
         document.getElementById('message').innerText="Choisir une reponse.";
    }    
}