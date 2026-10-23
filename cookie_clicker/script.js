// ========================================
// COOKIE CLICKER
// ========================================

const $ = id => document.getElementById(id);

// ========================================
// ARTICLES DE LA BOUTIQUE
// ========================================

const items = {
    cookies: [
        { name: "Cookie 1", file: "cookie.png", price: 0 },
        { name: "Cookie 2", file: "cookie1.png", price: 100 },
        { name: "Cookie 3", file: "cookie2.png", price: 1000 },
        { name: "Cookie 4", file: "cookie3.png", price: 10000 }
    ],

    backgrounds: [
        { name: "Fond 1", file: "background.png", price: 0 },
        { name: "Fond 2", file: "background1.png", price: 200 },
        { name: "Fond 3", file: "background2.png", price: 2000 },
        { name: "Fond 4", file: "background3.png", price: 20000 }
    ]
};

// ========================================
// COMPÉTENCES ET TIMERS
// ========================================

// cooldown = temps d'attente avant la prochaine utilisation
// speed = nombre de cookies gagnés par seconde
// duration = durée pendant laquelle le boost est actif

const duration = 10;

const boosts = {
    double: {
        name: "Bonus ×2",
        cooldown: 2 * 60,
        speed: 0
    },

    auto1: {
        name: "Auto 1",
        cooldown: 30 * 60,
        speed: 50
    },

    auto2: {
        name: "Auto 2",
        cooldown: 2 * 3600,
        speed: 500
    },

    auto3: {
        name: "GOD MODE",
        cooldown: 24 * 3600,
        speed: 10000
    }
};

// ========================================
// VARIABLES DU JEU
// ========================================

let score = 0;
let paused = false;

let owned = {
    cookies: ["cookie.png"],
    backgrounds: ["background.png"]
};

let selected = {
    cookie: "cookie.png",
    background: "background.png"
};

let customImages = {
    cookie: null,
    background: null
};

// Heure de fin des boosts actifs
let active = {};

// Heure à laquelle chaque boost sera de nouveau disponible
let readyAt = {};

let lastAutoTick = Date.now();

// ========================================
// CHARGEMENT DE LA SAUVEGARDE
// ========================================

function loadGame() {
    try {
        const rawSave = localStorage.getItem("cookieSave");

        if (!rawSave) return;

        const save = JSON.parse(rawSave);

        if (!save || typeof save !== "object") return;

        score = Number.isFinite(save.score)
            ? Math.max(0, save.score)
            : 0;

        if (save.owned) {
            owned.cookies = Array.isArray(save.owned.cookies)
                ? save.owned.cookies
                : ["cookie.png"];

            owned.backgrounds = Array.isArray(save.owned.backgrounds)
                ? save.owned.backgrounds
                : ["background.png"];
        }

        if (save.selected) {
            selected.cookie = save.selected.cookie || "cookie.png";
            selected.background =
                save.selected.background || "background.png";
        }

        if (save.customImages) {
            customImages.cookie = save.customImages.cookie || null;
            customImages.background =
                save.customImages.background || null;
        }

        active = save.active || {};
        readyAt = save.readyAt || {};

    } catch (error) {
        console.error("Impossible de charger la sauvegarde :", error);
    }
}

// ========================================
// SAUVEGARDE
// ========================================

function saveGame() {
    try {
        localStorage.setItem("cookieSave", JSON.stringify({
            score,
            owned,
            selected,
            customImages,
            active,
            readyAt
        }));
    } catch (error) {
        console.error(
            "Sauvegarde impossible. L'espace de stockage est peut-être plein.",
            error
        );
    }
}

// ========================================
// AFFICHAGE DU SCORE
// ========================================

function updateScore() {
    $("score").textContent =
        Math.floor(score).toLocaleString("fr-FR");

    // Met à jour les boutons de la boutique
    renderShop("cookies", "cookieShop");
    renderShop("backgrounds", "backgroundShop");
}

// ========================================
// CLIQUER SUR LE COOKIE
// ========================================

function clickCookie() {
    if (paused) return;

    const doubleActive = (active.double || 0) > Date.now();

    score += doubleActive ? 2 : 1;

    updateScore();
    saveGame();
}

// ========================================
// PAUSE
// ========================================

function pauseGame() {
    paused = !paused;

    $("pause").textContent = paused ? "REPRENDRE" : "PAUSE";

    renderBoosts();
}

// ========================================
// BOUTIQUES : COOKIES ET BACKGROUNDS
// ========================================

function renderShop(type, container) {
    const shop = $(container);

    if (!shop) return;

    shop.innerHTML = "";

    items[type].forEach(item => {
        const isCookie = type === "cookies";
        const category = isCookie ? "cookies" : "backgrounds";
        const selectionKey = isCookie ? "cookie" : "background";

        const isOwned = owned[category].includes(item.file);
        const isSelected = selected[selectionKey] === item.file;

        const button = document.createElement("button");

        if (isSelected) {
            button.textContent = item.name + " ✓";
        } else if (isOwned) {
            button.textContent = item.name + " — Sélectionner";
        } else {
            button.textContent =
                `${item.name} — ${item.price} cookies`;
        }

        button.disabled = !isOwned && score < item.price;

        button.onclick = () => {
            if (!isOwned) {
                if (score < item.price) return;

                score -= item.price;
                owned[category].push(item.file);
            }

            selected[selectionKey] = item.file;

            if (isCookie) {
                customImages.cookie = null;
                $("cookie").src = "img/" + item.file;
            } else {
                customImages.background = null;
                document.body.style.backgroundImage =
                    `url("img/${item.file}")`;

                document.body.style.backgroundSize = "cover";
                document.body.style.backgroundPosition = "center";
            }

            updateScore();
            renderAll();
            saveGame();
        };

        shop.appendChild(button);
    });
}

// ========================================
// AFFICHAGE GÉNÉRAL
// ========================================

function renderAll() {
    renderShop("cookies", "cookieShop");
    renderShop("backgrounds", "backgroundShop");
    renderBoosts();
}

// ========================================
// ACTIVER UNE COMPÉTENCE
// ========================================

function activateBoost(name) {
    if (paused) return;
    if (!boosts[name]) return;

    const now = Date.now();

    // Impossible d'activer un boost pendant son cooldown
    if (now < (readyAt[name] || 0)) return;

    // Impossible de réactiver un boost encore actif
    if (now < (active[name] || 0)) return;

    // Activation pendant 10 secondes
    active[name] = now + duration * 1000;

    // Le cooldown commence à l'activation
    readyAt[name] = now + boosts[name].cooldown * 1000;

    saveGame();
    renderBoosts();
}

// ========================================
// AFFICHAGE DES BOOSTS ET DES TIMERS
// ========================================

function renderBoosts() {
    const container = $("boosts");

    if (!container) return;

    container.innerHTML = "";

    const now = Date.now();

    Object.entries(boosts).forEach(([key, boost]) => {
        const card = document.createElement("div");
        card.className = "boost-card";

        // Style du bloc de compétence
        Object.assign(card.style, {
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            padding: "14px",
            margin: "6px",
            minWidth: "180px",
            background: "rgba(20, 16, 35, 0.95)",
            border: "1px solid rgba(255,255,255,0.2)",
            borderRadius: "12px",
            color: "white",
            textAlign: "center"
        });

        // Nom de la compétence
        const title = document.createElement("strong");
        title.textContent = boost.name;

        // Timer toujours visible
        const timer = document.createElement("div");

        Object.assign(timer.style, {
            fontSize: "14px",
            fontWeight: "bold",
            color: "#c4b5fd",
            minHeight: "36px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            lineHeight: "1.5"
        });

        const cooldownRemaining = Math.max(
            0,
            Math.ceil(((readyAt[key] || 0) - now) / 1000)
        );

        const activeRemaining = Math.max(
            0,
            Math.ceil(((active[key] || 0) - now) / 1000)
        );

        // Affiche l'état et le temps restant
        if (activeRemaining > 0) {
            timer.textContent =
                `ACTIF : ${formatTime(activeRemaining)}`;
        } else if (cooldownRemaining > 0) {
            timer.textContent =
                `Disponible dans : ${formatTime(cooldownRemaining)}`;
        } else {
            timer.textContent = "Prêt à être utilisé";
        }

        // Bouton d'activation
        const button = document.createElement("button");

        if (activeRemaining > 0) {
            button.textContent = "EN COURS";
        } else if (cooldownRemaining > 0) {
            button.textContent = "EN RECHARGEMENT";
        } else {
            button.textContent = "ACTIVER";
        }

        button.disabled =
            paused || cooldownRemaining > 0 || activeRemaining > 0;

        button.style.width = "100%";

        button.onclick = () => activateBoost(key);

        // Assemblage de la carte
        card.appendChild(title);
        card.appendChild(timer);
        card.appendChild(button);

        container.appendChild(card);
    });
}

// ========================================
// FORMATAGE DES TIMERS
// ========================================

function formatTime(seconds) {
    seconds = Math.max(0, Math.floor(seconds));

    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;

    if (h > 0) {
        return `${h} h ${m} min ${s} s`;
    }

    if (m > 0) {
        return `${m} min ${s} s`;
    }

    return `${s} s`;
}

// ========================================
// IMPORTER UN COOKIE PERSONNALISÉ
// ========================================

function uploadCookie(event) {
    const file = event.target.files[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
        alert("Choisis un fichier image.");
        return;
    }

    const reader = new FileReader();

    reader.onload = () => {
        customImages.cookie = reader.result;
        $("cookie").src = reader.result;

        saveGame();
    };

    reader.onerror = () => {
        alert("Impossible de lire cette image.");
    };

    reader.readAsDataURL(file);
}

// ========================================
// IMPORTER UN BACKGROUND PERSONNALISÉ
// ========================================

function uploadBackground(event) {
    const file = event.target.files[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
        alert("Choisis un fichier image.");
        return;
    }

    const reader = new FileReader();

    reader.onload = () => {
        customImages.background = reader.result;

        document.body.style.backgroundImage =
            `url("${reader.result}")`;

        document.body.style.backgroundSize = "cover";
        document.body.style.backgroundPosition = "center";

        saveGame();
    };

    reader.onerror = () => {
        alert("Impossible de lire cette image.");
    };

    reader.readAsDataURL(file);
}

// ========================================
// RESET TOTAL
// ========================================

function resetGame() {
    const confirmation = confirm(
        "Veux-tu vraiment tout effacer ?\n\n" +
        "Le score, les achats, les compétences et les images personnalisées seront réinitialisés."
    );

    if (!confirmation) return;

    // Effacer la sauvegarde
    try {
        localStorage.removeItem("cookieSave");
    } catch (error) {
        console.error("Impossible d'effacer la sauvegarde :", error);
    }

    // Réinitialiser les variables en mémoire
    score = 0;
    paused = false;

    owned = {
        cookies: ["cookie.png"],
        backgrounds: ["background.png"]
    };

    selected = {
        cookie: "cookie.png",
        background: "background.png"
    };

    customImages = {
        cookie: null,
        background: null
    };

    active = {};
    readyAt = {};

    lastAutoTick = Date.now();

    // Réinitialiser l'affichage
    $("pause").textContent = "PAUSE";
    $("cookie").src = "img/cookie.png";

    document.body.style.backgroundImage =
        'url("img/background.png")';

    document.body.style.backgroundSize = "cover";
    document.body.style.backgroundPosition = "center";

    updateScore();
    renderAll();

    // Sauvegarder le nouvel état vide
    saveGame();
}

// ========================================
// AUTOMATISATION ET ACTUALISATION DES TIMERS
// ========================================

// Le score automatique est calculé toutes les 100 ms.
// Les timers sont également rafraîchis régulièrement.

setInterval(() => {
    const now = Date.now();

    if (!paused) {
        for (const [name, boost] of Object.entries(boosts)) {
            if (
                name !== "double" &&
                (active[name] || 0) > now
            ) {
                score += boost.speed / 10;
            }
        }

        updateScore();
    }

    // Actualise les timers même pendant la pause
    renderBoosts();

    // Sauvegarde automatique toutes les secondes
    if (now - lastAutoTick >= 1000) {
        saveGame();
        lastAutoTick = now;
    }
}, 100);

// ========================================
// RESTAURER L'AFFICHAGE APRÈS RECHARGEMENT
// ========================================

loadGame();

if (customImages.cookie) {
    $("cookie").src = customImages.cookie;
} else {
    $("cookie").src = "img/" + selected.cookie;
}

if (customImages.background) {
    document.body.style.backgroundImage =
        `url("${customImages.background}")`;
} else {
    document.body.style.backgroundImage =
        `url("img/${selected.background}")`;
}

document.body.style.backgroundSize = "cover";
document.body.style.backgroundPosition = "center";

updateScore();
renderAll();