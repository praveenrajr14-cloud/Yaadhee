/* -------------------------------------------------------------
   YADHEE LUXURY HERITAGE - COMPLETE APP LOGIC (JAVASCRIPT)
   ------------------------------------------------------------- */

document.addEventListener('DOMContentLoaded', () => {

    // ==========================================================================
    // INTERACTIVE CINEMATIC WEBSITE DESIGN SUITE
    // ==========================================================================

    // 1. Cinematic Preloader & Page Transition HTML Injections
    const injectCinematicLayers = () => {
        const preloaderShown = sessionStorage.getItem('yadhee_preloader_shown');

        // Always inject page transition overlay for smooth page loads
        const transOverlay = document.createElement('div');
        transOverlay.id = 'page-transition-overlay';
        document.body.appendChild(transOverlay);

        if (preloaderShown) {
            // Skip logo animation preloader on subsequent page visits in the same session
            return;
        }

        // Enforce cursor hidden during initial loading screen
        document.body.classList.add('loading-active');

        const preloader = document.createElement('div');
        preloader.id = 'cinematic-preloader';
        
        // Split "Yadhee" to character spans for stagger animation
        const logoText = "Yadhee";
        const charsHTML = logoText.split('').map((char, index) => {
            return `<span class="preloader-char" style="animation-delay: ${0.1 + (index * 0.08)}s">${char}</span>`;
        }).join('');

        preloader.innerHTML = `
            <div class="preloader-inner">
                <span class="preloader-logo">${charsHTML}</span>
            </div>
        `;
        document.body.prepend(preloader);

        setTimeout(() => {
            preloader.classList.add('loaded');
            document.body.classList.remove('loading-active');
            setTimeout(() => preloader.remove(), 600);
            sessionStorage.setItem('yadhee_preloader_shown', 'true');
        }, 1100);
    };
    injectCinematicLayers();

    // 2. Custom Multi-Page Transition link interceptors
    const setupTransitionInterceptors = () => {
        const transitionOverlay = document.getElementById('page-transition-overlay');
        document.querySelectorAll('a').forEach(link => {
            const href = link.getAttribute('href');
            if (href && href.startsWith('/') && !link.classList.contains('logout-btn-text') && !link.getAttribute('target')) {
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    if (transitionOverlay) {
                        transitionOverlay.classList.add('active');
                    }
                    setTimeout(() => {
                        window.location.href = href;
                    }, 500);
                });
            }
        });
    };
    setupTransitionInterceptors();



    // 4. Golden Dust canvas backdrop
    const initGoldDustCanvas = () => {
        const canvas = document.createElement('canvas');
        canvas.id = 'gold-dust-canvas';
        document.body.appendChild(canvas);
        const ctx = canvas.getContext('2d');
        let particles = [];
        const colors = ['rgba(197, 160, 89, 0.12)', 'rgba(212, 175, 55, 0.1)', 'rgba(122, 12, 30, 0.06)'];

        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };
        window.addEventListener('resize', resize);
        resize();

        for (let i = 0; i < 55; i++) {
            particles.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                radius: Math.random() * 2 + 0.5,
                color: colors[Math.floor(Math.random() * colors.length)],
                speedX: Math.random() * 0.3 - 0.15,
                speedY: Math.random() * 0.3 - 0.2,
                opacity: Math.random() * 0.5 + 0.3,
                fadeDir: Math.random() > 0.5 ? 0.004 : -0.004
            });
        }

        const animate = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            particles.forEach(p => {
                p.x += p.speedX;
                p.y += p.speedY;

                if (p.x < 0) p.x = canvas.width;
                if (p.x > canvas.width) p.x = 0;
                if (p.y < 0) p.y = canvas.height;
                if (p.y > canvas.height) p.y = 0;

                p.opacity += p.fadeDir;
                if (p.opacity > 0.7) p.fadeDir = -0.004;
                if (p.opacity < 0.2) p.fadeDir = 0.004;

                ctx.beginPath();
                ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
                ctx.fillStyle = p.color;
                ctx.globalAlpha = Math.max(0, p.opacity);
                ctx.fill();
            });
            requestAnimationFrame(animate);
        };
        animate();
    };
    // initGoldDustCanvas(); // Disabled to fix performance lag



    // --- PRODUCT DATA STORAGE ---
    let productsData = {};

    // --- APP STATE ---
    let cart = JSON.parse(localStorage.getItem('yadhee_cart')) || [];
    let wishlist = JSON.parse(localStorage.getItem('yadhee_wishlist')) || [];

    // --- SELECT DOM ELEMENTS ---
    const cursor = document.getElementById('custom-cursor');
    const cursorDot = document.getElementById('custom-cursor-dot');
    
    const mainHeader = document.querySelector('.main-header');
    
    const searchToggle = document.getElementById('searchToggle');
    const searchOverlay = document.getElementById('searchOverlay');
    const searchClose = document.getElementById('searchClose');
    const searchInput = document.getElementById('searchInput');
    
    const cartToggle = document.getElementById('cartToggle');
    const cartOverlay = document.getElementById('cartOverlay');
    const cartClose = document.getElementById('cartClose');
    const cartItemsContainer = document.getElementById('cartItemsContainer');
    const cartTotalPrice = document.getElementById('cartTotalPrice');
    const cartCountBadges = document.querySelectorAll('.cart-count');
    const checkoutBtn = document.getElementById('checkoutBtn');
    const emptyCartBack = document.getElementById('emptyCartBack');
    const cartFooter = document.getElementById('cartFooter');
    
    const favsToggle = document.getElementById('favsToggle');
    const favsCountBadges = document.querySelectorAll('.favs-count');
    
    const productGrid = document.getElementById('productGrid');
    const filterButtons = document.querySelectorAll('.filter-btn');
    
    const productModal = document.getElementById('productModal');
    const modalClose = document.getElementById('modalClose');
    const modalContentGrid = document.getElementById('modalContentGrid');
    
    const heroSlides = document.querySelectorAll('.hero-slide');
    const heroPrev = document.getElementById('heroPrev');
    const heroNext = document.getElementById('heroNext');
    let currentHeroIndex = 0;
    let heroAutoPlayInterval;

    const lookbookTrack = document.getElementById('lookbookTrack');
    const lookbookDots = document.querySelectorAll('.lookbook-dot');
    
    const atelierForm = document.getElementById('atelierForm');
    const atelierFormSuccess = document.getElementById('atelierFormSuccess');
    const successClose = document.getElementById('successClose');

    const newsletterForm = document.getElementById('newsletterForm');
    const newsletterSuccess = document.getElementById('newsletterSuccess');

    const toastContainer = document.getElementById('toastContainer');


    // -------------------------------------------------------------
    // I. DYNAMIC BACKGROUND BLOBS, LERP CURSOR & 3D TILT
    // -------------------------------------------------------------
    
    // 1. Dynamic Blob Generation
    const injectLiquidBackground = () => {
        const bgContainer = document.createElement('div');
        bgContainer.className = 'liquid-bg-container';
        
        const rubyBlob = document.createElement('div');
        rubyBlob.className = 'liquid-blob blob-ruby';
        
        const goldBlob = document.createElement('div');
        goldBlob.className = 'liquid-blob blob-gold';
        
        const violetBlob = document.createElement('div');
        violetBlob.className = 'liquid-blob blob-violet';
        
        bgContainer.appendChild(rubyBlob);
        bgContainer.appendChild(goldBlob);
        bgContainer.appendChild(violetBlob);
        document.body.appendChild(bgContainer);
    };
    injectLiquidBackground();

    // 2. Custom Liquid Cursor (Disabled for normal arrow cursor)
    const addCursorListeners = () => {
        // Disabled for default arrow cursor
    };

    // 3. 3D Spatial Card Tilt Effect (Disabled to resolve lag)
    const addCardTiltListeners = () => {
        // Disabled for high-performance lag-free experience
    };


    let lastScrollY = window.scrollY;

    // -------------------------------------------------------------
    // II. SCROLL DRIVEN LAYOUT EFFECTS & PARALLAX
    // -------------------------------------------------------------
    window.addEventListener('scroll', () => {
        const currentScrollY = window.scrollY;

        if (currentScrollY > 80) {
            mainHeader.classList.add('scrolled');
        } else {
            mainHeader.classList.remove('scrolled');
        }

        if (currentScrollY > lastScrollY && currentScrollY > 180) {
            mainHeader.classList.add('header-hidden');
        } else {
            mainHeader.classList.remove('header-hidden');
        }

        lastScrollY = currentScrollY;

        // Custom Parallax Scroll handler
        const parallaxImgs = document.querySelectorAll('.parallax-img');
        parallaxImgs.forEach(img => {
            const scrollPercent = (window.scrollY / window.innerHeight) * 15;
            img.style.transform = `scale(1.05) translateY(${-scrollPercent}px)`;
        });
    });

    // Intersection Observer for Smooth Scroll Reveals
    const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
            }
        });
    }, { threshold: 0.1 });

    document.querySelectorAll('.reveal-on-scroll, .cinematic-reveal').forEach(el => {
        revealObserver.observe(el);
    });


    // -------------------------------------------------------------
    // III. CINEMATIC HERO SLIDESHOW
    // -------------------------------------------------------------
    const showHeroSlide = (index) => {
        heroSlides.forEach(slide => slide.classList.remove('active'));
        heroSlides[index].classList.add('active');
    };

    const nextHeroSlide = () => {
        currentHeroIndex = (currentHeroIndex + 1) % heroSlides.length;
        showHeroSlide(currentHeroIndex);
    };

    const prevHeroSlide = () => {
        currentHeroIndex = (currentHeroIndex - 1 + heroSlides.length) % heroSlides.length;
        showHeroSlide(currentHeroIndex);
    };

    if (heroNext && heroPrev) {
        heroNext.addEventListener('click', () => {
            nextHeroSlide();
            resetHeroAutoplay();
        });
        heroPrev.addEventListener('click', () => {
            prevHeroSlide();
            resetHeroAutoplay();
        });
    }

    const resetHeroAutoplay = () => {
        clearInterval(heroAutoPlayInterval);
        heroAutoPlayInterval = setInterval(nextHeroSlide, 8000);
    };
    resetHeroAutoplay();


    // -------------------------------------------------------------
    // IV. SEARCH CONTROLS
    // -------------------------------------------------------------
    if (searchToggle && searchClose && searchOverlay) {
        searchToggle.addEventListener('click', () => {
            searchOverlay.classList.add('active');
            setTimeout(() => searchInput.focus(), 300);
        });
        
        searchClose.addEventListener('click', () => {
            searchOverlay.classList.remove('active');
            searchInput.value = '';
        });

        // Search Suggestion Clicks close overlay
        document.querySelectorAll('.suggested-link').forEach(link => {
            link.addEventListener('click', () => {
                searchOverlay.classList.remove('active');
            });
        });
    }


    // -------------------------------------------------------------
    // V. CURATED GALLERY PRODUCT FILTERING
    // -------------------------------------------------------------
    filterButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            filterButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            const filterValue = btn.getAttribute('data-filter');
            const productCards = document.querySelectorAll('.product-card');

            productCards.forEach(card => {
                const category = card.getAttribute('data-category');
                if (filterValue === 'all' || category === filterValue) {
                    card.classList.remove('hide');
                } else {
                    card.classList.add('hide');
                }
            });
        });
    });


    // -------------------------------------------------------------
    // VI. EDITORIAL LOOKBOOK TRANSITIONS
    // -------------------------------------------------------------
    lookbookDots.forEach(dot => {
        dot.addEventListener('click', () => {
            lookbookDots.forEach(d => d.classList.remove('active'));
            dot.classList.add('active');
            
            const slideIndex = parseInt(dot.getAttribute('data-index'));
            lookbookTrack.style.transform = `translateX(-${slideIndex * 33.333}%)`;
        });
    });

    // Make lookbook links work dynamically by triggering product grid categories
    document.querySelectorAll('.editorial-link').forEach(link => {
        link.addEventListener('click', (e) => {
            const filterVal = link.getAttribute('data-filter');
            const targetFilterBtn = document.querySelector(`.filter-btn[data-filter="${filterVal}"]`);
            if (targetFilterBtn) {
                targetFilterBtn.click();
            }
        });
    });


    // -------------------------------------------------------------
    // VII. PERSISTENT WISHLIST MANAGEMENT
    // -------------------------------------------------------------
    const updateWishlistUI = () => {
        favsCountBadges.forEach(badge => {
            badge.textContent = wishlist.length;
        });

        // Update heart icons on cards
        document.querySelectorAll('.product-card').forEach(card => {
            const pid = card.getAttribute('data-id');
            const heartIcon = card.querySelector('.fav-add-btn i');
            if (wishlist.includes(pid)) {
                heartIcon.className = 'fa-solid fa-heart gold-text';
            } else {
                heartIcon.className = 'fa-regular fa-heart';
            }
        });
    };

    const toggleWishlistItem = (id) => {
        if (wishlist.includes(id)) {
            wishlist = wishlist.filter(item => item !== id);
            showToast('Item removed from Favorites.');
        } else {
            wishlist.push(id);
            showToast('Item added to Favorites.');
        }
        localStorage.setItem('yadhee_wishlist', JSON.stringify(wishlist));
        updateWishlistUI();
    };

    // Wishlist Toggle button bindings
    favsToggle.addEventListener('click', () => {
        showToast(`Your Favorites contain ${wishlist.length} items.`);
    });


    // -------------------------------------------------------------
    // VIII. CART DRAWER & STATE LOGIC
    // -------------------------------------------------------------
    const showToast = (message) => {
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.innerHTML = `<i class="fa-solid fa-bell"></i> <span>${message}</span>`;
        toastContainer.appendChild(toast);
        
        setTimeout(() => {
            toast.style.animation = 'toastSlideIn 0.5s cubic-bezier(0.25, 1, 0.5, 1) reverse forwards';
            setTimeout(() => {
                toast.remove();
            }, 500);
        }, 3500);
        
        addCursorListeners();
    };

    const updateCartUI = () => {
        // Calculate totals
        const totalItemsCount = cart.reduce((acc, curr) => acc + curr.qty, 0);
        cartCountBadges.forEach(badge => badge.textContent = totalItemsCount);
        
        let rawTotalINR = cart.reduce((acc, curr) => {
            const prod = productsData[curr.id];
            return acc + (prod.priceINR * curr.qty);
        }, 0);

        // Apply 5% Sovereign Discount automatically
        const DISCOUNT_RATE = 0.05;
        const discountedTotalINR = Math.round(rawTotalINR * (1 - DISCOUNT_RATE));

        // Show strikethrough original + discounted price
        const cartOriginalPriceEl = document.getElementById('cartOriginalPrice');
        if (cartOriginalPriceEl && rawTotalINR > 0) {
            cartOriginalPriceEl.textContent = `₹${rawTotalINR.toLocaleString('en-IN')}`;
        } else if (cartOriginalPriceEl) {
            cartOriginalPriceEl.textContent = '';
        }
        cartTotalPrice.textContent = `₹${discountedTotalINR.toLocaleString('en-IN')}`;

        // Populate items in Drawer
        if (cart.length === 0) {
            cartItemsContainer.innerHTML = `
                <div class="cart-empty-message">
                    <i class="fa-solid fa-receipt"></i>
                    <p>Your shopping cart is currently empty.</p>
                    <a href="sarees.html" class="btn btn-primary" id="emptyCartBack">Explore Collections</a>
                </div>
            `;
            cartFooter.style.display = 'none';
        } else {
            cartFooter.style.display = 'block';
            cartItemsContainer.innerHTML = '';
            
            cart.forEach(item => {
                const product = productsData[item.id];
                const itemHTML = `
                    <div class="cart-item" data-id="${item.id}">
                        <img src="${product.img}" alt="${product.name}" class="cart-item-img">
                        <div class="cart-item-info">
                            <h4 class="cart-item-name">${product.name}</h4>
                            <span class="cart-item-meta">${product.type}</span>
                            <span class="cart-item-price">₹${product.priceINR.toLocaleString('en-IN')}</span>
                            <div class="cart-item-qty-row">
                                <div class="qty-control">
                                    <button class="qty-btn qty-minus"><i class="fa-solid fa-minus"></i></button>
                                    <span class="qty-val">${item.qty}</span>
                                    <button class="qty-btn qty-plus"><i class="fa-solid fa-plus"></i></button>
                                </div>
                                <button class="item-remove-btn">Remove</button>
                            </div>
                        </div>
                    </div>
                `;
                cartItemsContainer.insertAdjacentHTML('beforeend', itemHTML);
            });
            
            // Re-apply event listeners for quantity edits
            bindCartItemActionListeners();
        }
        
        addCursorListeners();
    };

    const bindCartItemActionListeners = () => {
        document.querySelectorAll('.cart-item').forEach(itemNode => {
            const pid = itemNode.getAttribute('data-id');
            
            itemNode.querySelector('.qty-minus').addEventListener('click', () => {
                adjustQty(pid, -1);
            });

            itemNode.querySelector('.qty-plus').addEventListener('click', () => {
                adjustQty(pid, 1);
            });

            itemNode.querySelector('.item-remove-btn').addEventListener('click', () => {
                removeFromCart(pid);
            });
        });
    };

    const addToCart = (id, qty = 1) => {
        const existingItem = cart.find(item => item.id === id);
        if (existingItem) {
            existingItem.qty += qty;
        } else {
            cart.push({ id, qty });
        }
        
        const isLoggedIn = document.body.dataset.loggedIn === 'true';
        if (isLoggedIn) {
            const targetQty = existingItem ? existingItem.qty : qty;
            fetch('/api/cart', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ productId: id, quantity: targetQty })
            })
            .catch(err => console.error("DB cart add error:", err));
        } else {
            localStorage.setItem('yadhee_cart', JSON.stringify(cart));
        }
        
        updateCartUI();
        showToast(`${productsData[id].name} added to Shopping Bag.`);
        
        // Auto slide out cart drawer to show off
        cartOverlay.classList.add('active');
    };

    const adjustQty = (id, change) => {
        const item = cart.find(item => item.id === id);
        if (item) {
            item.qty += change;
            if (item.qty <= 0) {
                removeFromCart(id);
                return;
            }
            
            const isLoggedIn = document.body.dataset.loggedIn === 'true';
            if (isLoggedIn) {
                fetch('/api/cart', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ productId: id, quantity: item.qty })
                })
                .catch(err => console.error("DB cart adjust error:", err));
            } else {
                localStorage.setItem('yadhee_cart', JSON.stringify(cart));
            }
            
            updateCartUI();
        }
    };

    const removeFromCart = (id) => {
        cart = cart.filter(item => item.id !== id);
        
        const isLoggedIn = document.body.dataset.loggedIn === 'true';
        if (isLoggedIn) {
            fetch(`/api/cart/${id}`, {
                method: 'DELETE'
            })
            .catch(err => console.error("DB cart delete error:", err));
        } else {
            localStorage.setItem('yadhee_cart', JSON.stringify(cart));
        }
        
        updateCartUI();
        showToast('Item removed from cart.');
    };

    // Toggle Drawer Open / Close
    if (cartToggle && cartClose && cartOverlay) {
        cartToggle.addEventListener('click', () => {
            cartOverlay.classList.add('active');
        });

        cartClose.addEventListener('click', () => {
            cartOverlay.classList.remove('active');
        });

        // Close on clicking outside the drawer pane
        cartOverlay.addEventListener('click', (e) => {
            if (e.target === cartOverlay) {
                cartOverlay.classList.remove('active');
            }
        });
    }

    // Dynamic Checkout Form Modal Logic
    const checkoutModal = document.getElementById('checkoutModal');
    const checkoutModalClose = document.getElementById('checkoutModalClose');
    const checkoutForm = document.getElementById('checkoutForm');

    if (checkoutBtn && checkoutModal && checkoutModalClose) {
        checkoutBtn.addEventListener('click', () => {
            if (cart.length === 0) {
                showToast('Your cart is empty.');
                return;
            }
            cartOverlay.classList.remove('active');
            checkoutModal.classList.add('active');
        });

        checkoutModalClose.addEventListener('click', () => {
            checkoutModal.classList.remove('active');
        });
    }

    if (checkoutForm) {
        checkoutForm.addEventListener('submit', (e) => {
            e.preventDefault();

            const submitBtn = checkoutForm.querySelector('.form-submit-btn');
            const originalContent = submitBtn.innerHTML;
            submitBtn.disabled = true;
            submitBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Processing...`;

            const name = document.getElementById('checkoutName').value;
            const email = document.getElementById('checkoutEmail').value;
            const phone = document.getElementById('checkoutPhone').value;
            const address = document.getElementById('checkoutAddress').value;
            const forceOutcome = document.getElementById('devForceOutcome') ? document.getElementById('devForceOutcome').value : 'success';

            // Calculate Totals with 5% Sovereign Discount
            const DISCOUNT_RATE = 0.05;
            let rawTotalINR = cart.reduce((acc, curr) => {
                const prod = productsData[curr.id];
                return acc + (prod.priceINR * curr.qty);
            }, 0);
            let rawTotalUSD = cart.reduce((acc, curr) => {
                const prod = productsData[curr.id];
                return acc + (prod.priceUSD * curr.qty);
            }, 0);
            let totalINR = Math.round(rawTotalINR * (1 - DISCOUNT_RATE));
            let totalUSD = parseFloat((rawTotalUSD * (1 - DISCOUNT_RATE)).toFixed(2));

            fetch('/api/checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, phone, address, cart, totalINR, totalUSD, paymentForceOutcome: forceOutcome })
            })
            .then(res => res.json())
            .then(data => {
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalContent;

                if (data.success) {
                    showToast(`Order #${data.orderId} placed successfully!`);
                    cart = [];
                    localStorage.removeItem('yadhee_cart');
                    updateCartUI();
                    checkoutForm.reset();
                    checkoutModal.classList.remove('active');
                } else {
                    showToast(data.error || "Failed to place order.");
                }
            })
            .catch(err => {
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalContent;
                console.error(err);
                showToast("Payment processing error. Please try again.");
            });
        });
    }

    // --- WHATSAPP WIDGET DYNAMIC LINK CONSTRUCTION ---
    const whatsappWidget = document.getElementById('whatsappWidget');
    const updateWhatsAppWidgetHref = (product) => {
        if (!whatsappWidget) return;
        const phone = whatsappWidget.getAttribute('href')?.split('wa.me/')?.[1]?.split('?')?.[0] || '919999988888';
        if (product) {
            const productUrl = window.location.origin + '/' + (product.category === 'saree' ? 'sarees' : 'jewels') + '#' + product.id;
            const text = `Hi! I am interested in the ${product.name} (${productUrl}). Can you provide more details about the fabric/material?`;
            whatsappWidget.setAttribute('href', `https://wa.me/${phone}?text=${encodeURIComponent(text)}`);
        } else {
            const text = "Hi! I am interested in exploring your exquisite heritage collections. Can you assist me?";
            whatsappWidget.setAttribute('href', `https://wa.me/${phone}?text=${encodeURIComponent(text)}`);
        }
    };

    // --- AUTOMATED ABANDONED CART TRACKER ---
    const recordAbandonedCart = () => {
        const name = document.getElementById('checkoutName')?.value || '';
        const email = document.getElementById('checkoutEmail')?.value || '';
        const phone = document.getElementById('checkoutPhone')?.value || '';
        const address = document.getElementById('checkoutAddress')?.value || '';

        // If email and cart are not empty, log as draft/abandoned
        if (email && cart.length > 0) {
            // Calculate Totals
            let totalINR = cart.reduce((acc, curr) => {
                const prod = productsData[curr.id];
                return acc + (prod ? prod.priceINR * curr.qty : 0);
            }, 0);
            let totalUSD = cart.reduce((acc, curr) => {
                const prod = productsData[curr.id];
                return acc + (prod ? prod.priceUSD * curr.qty : 0);
            }, 0);

            fetch('/api/abandoned-cart', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, phone, address, cart, totalINR, totalUSD })
            })
            .then(res => res.json())
            .then(data => {
                console.log("[Abandoned Cart] Logged/Updated successfully:", data);
            })
            .catch(err => console.error("[Abandoned Cart] Error logging:", err));
        }
    };

    // Attach listeners to input fields
    setTimeout(() => {
        ['checkoutName', 'checkoutEmail', 'checkoutPhone', 'checkoutAddress'].forEach(id => {
            const input = document.getElementById(id);
            if (input) {
                input.addEventListener('blur', recordAbandonedCart);
                input.addEventListener('change', recordAbandonedCart);
            }
        });
    }, 1000);


    // -------------------------------------------------------------
    // IX. PRODUCT DETAIL OVERLAY MODAL LOGIC & CLOSE-UP ZOOMS
    // -------------------------------------------------------------
    const openProductModal = (id) => {
        const product = productsData[id];
        if (!product) return;

        window.currentActiveProduct = product;
        updateWhatsAppWidgetHref(product);

        // Update URL hash without reload to make it shareable
        window.location.hash = product.id;

        // Generate dynamic Spec rows HTML
        let specsHTML = '';
        for (const [key, val] of Object.entries(product.specs)) {
            specsHTML += `
                <div class="spec-line">
                    <span class="spec-label">${key}</span>
                    <span class="spec-val">${val}</span>
                </div>
            `;
        }

        modalContentGrid.innerHTML = `
            <div class="modal-visual-pane">
                <img src="${product.img}" alt="${product.name}" id="zoomImage">
            </div>
            <div class="modal-detail-pane">
                <span class="modal-subtitle">${product.type}</span>
                <h2 class="modal-title">${product.name}</h2>
                <div class="modal-price-row">
                    <span class="modal-price">₹${product.priceINR.toLocaleString('en-IN')}</span>
                    <span class="price-usd">($${product.priceUSD.toLocaleString()})</span>
                </div>
                <p class="modal-desc">${product.desc}</p>
                <div class="modal-specs">
                    ${specsHTML}
                </div>
                <div class="modal-actions-row">
                    <button class="modal-add-btn" id="modalAddBtn" data-id="${product.id}">Add to cart</button>
                    <button class="modal-fav-btn" id="modalFavBtn" data-id="${product.id}"><i class="fa-regular fa-heart"></i></button>
                </div>
            </div>
        `;

        // Apply interactive custom cursor listeners on new items
        addCursorListeners();

        // Implement close-up dynamic hover scale zoom within modal visual pane
        const modalVisual = modalContentGrid.querySelector('.modal-visual-pane');
        const zoomImage = document.getElementById('zoomImage');
        
        modalVisual.addEventListener('mousemove', (e) => {
            const rect = modalVisual.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            const xPercent = (x / rect.width) * 100;
            const yPercent = (y / rect.height) * 100;
            
            zoomImage.style.transformOrigin = `${xPercent}% ${yPercent}%`;
            zoomImage.style.transform = 'scale(1.8)';
        });
        
        modalVisual.addEventListener('mouseleave', () => {
            zoomImage.style.transform = 'scale(1)';
        });

        // Add action triggers inside modal
        document.getElementById('modalAddBtn').addEventListener('click', (e) => {
            const pid = e.target.getAttribute('data-id');
            addToCart(pid);
            productModal.classList.remove('active');
            window.currentActiveProduct = null;
            updateWhatsAppWidgetHref(null);
            history.pushState("", document.title, window.location.pathname + window.location.search);
        });

        document.getElementById('modalFavBtn').addEventListener('click', (e) => {
            const pid = e.currentTarget.getAttribute('data-id');
            toggleWishlistItem(pid);
            
            const heartIcon = e.currentTarget.querySelector('i');
            if (wishlist.includes(pid)) {
                heartIcon.className = 'fa-solid fa-heart gold-text';
            } else {
                heartIcon.className = 'fa-regular fa-heart';
            }
        });

        // Check if the current modal item is already favorited and set icon class
        const modalFavBtnIcon = document.getElementById('modalFavBtn').querySelector('i');
        if (wishlist.includes(id)) {
            modalFavBtnIcon.className = 'fa-solid fa-heart gold-text';
        } else {
            modalFavBtnIcon.className = 'fa-regular fa-heart';
        }

        // Display Modal
        productModal.classList.add('active');
    };

    if (productModal && modalClose) {
        modalClose.addEventListener('click', () => {
            productModal.classList.remove('active');
            window.currentActiveProduct = null;
            updateWhatsAppWidgetHref(null);
            history.pushState("", document.title, window.location.pathname + window.location.search);
        });

        productModal.addEventListener('click', (e) => {
            if (e.target === productModal) {
                productModal.classList.remove('active');
                window.currentActiveProduct = null;
                updateWhatsAppWidgetHref(null);
                history.pushState("", document.title, window.location.pathname + window.location.search);
            }
        });
    }


    // -------------------------------------------------------------
    // X. EVENT WRAPPING ON PRODUCT CARDS AND SECTIONS
    // -------------------------------------------------------------
    const bindGlobalProductCardEvents = () => {
        document.querySelectorAll('.product-card').forEach(card => {
            const pid = card.getAttribute('data-id');
            
            // Add to Cart
            card.querySelector('.add-to-bag-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                addToCart(pid);
            });
            
            // Add to Favorites
            card.querySelector('.fav-add-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                toggleWishlistItem(pid);
            });
            
            // Quick View Click
            card.querySelector('.quick-view-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                openProductModal(pid);
            });

            // Card body click defaults to details quick view modal
            card.addEventListener('click', () => {
                openProductModal(pid);
            });
        });
    };
    // bindGlobalProductCardEvents will be triggered inside fetch callback below
    


    // -------------------------------------------------------------
    // XI. BESPOKE ATELIER APP SCHEDULING FORM
    // -------------------------------------------------------------
    if (atelierForm && atelierFormSuccess && successClose) {
        atelierForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const name = document.getElementById('clientName').value;
            const email = document.getElementById('clientEmail').value;
            const interestSelect = document.getElementById('interestType');
            const interest = interestSelect.value;
            const message = document.getElementById('clientMessage').value;

            const submitBtn = atelierForm.querySelector('.form-submit-btn');
            const originalBtnContent = submitBtn.innerHTML;
            
            submitBtn.disabled = true;
            submitBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Transmitting Registry...`;

            fetch('/api/atelier', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, interest, message })
            })
            .then(res => res.json())
            .then(data => {
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalBtnContent;

                if (data.success) {
                    // Show beautiful success overlay details
                    atelierFormSuccess.classList.add('active');
                    atelierForm.reset();
                } else {
                    showToast(data.error || "Failed to transmit booking request.");
                }
            })
            .catch(err => {
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalBtnContent;
                console.error(err);
                showToast("Atelier consultation registry transmission failed.");
            });
        });

        successClose.addEventListener('click', () => {
            atelierFormSuccess.classList.remove('active');
        });
    }


    // -------------------------------------------------------------
    // XII. NEWSLETTER SIGNUP
    // -------------------------------------------------------------
    if (newsletterForm && newsletterSuccess) {
        newsletterForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const emailInput = newsletterForm.querySelector('input[type="email"]');
            const email = emailInput.value;
            const submitBtn = newsletterForm.querySelector('button');
            submitBtn.disabled = true;
            
            fetch('/api/newsletter', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            })
            .then(res => res.json())
            .then(data => {
                submitBtn.disabled = false;
                if (data.success) {
                    newsletterForm.reset();
                    newsletterSuccess.style.display = 'block';
                    
                    setTimeout(() => {
                        newsletterSuccess.style.display = 'none';
                    }, 5000);
                } else {
                    showToast(data.error || "Newsletter sign-up failure.");
                }
            })
            .catch(err => {
                submitBtn.disabled = false;
                console.error(err);
                showToast("Newsletter network transmission failure.");
            });
        });
    }

    // Scroll to Gallery when clicking "Explore Loom" / "Acquire Masterpieces"
    document.querySelectorAll('.scroll-to-gallery').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const targetSection = document.querySelector('#collections');
            if (targetSection) {
                targetSection.scrollIntoView({ behavior: 'smooth' });
            } else {
                window.location.href = '/#collections';
            }
        });
    });


    // --- PATRON VAULT PROFILE CONTROLS & HEADER USER DROPDOWN ---
    
    // User dropdown in sticky header
    const userMenuToggle = document.getElementById('userMenuToggle');
    const userDropdown = document.getElementById('userDropdown');
    
    if (userMenuToggle && userDropdown) {
        userMenuToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            userDropdown.classList.toggle('active');
        });
        
        // Close dropdown when clicking anywhere else
        document.addEventListener('click', () => {
            userDropdown.classList.remove('active');
        });
    }

    // Profile cabinet edit form handling on /vault page
    const editProfileBtn = document.getElementById('editProfileBtn');
    const cancelEditBtn = document.getElementById('cancelEditBtn');
    const profileDisplaySection = document.getElementById('profileDisplaySection');
    const profileEditForm = document.getElementById('profileEditForm');
    
    if (editProfileBtn && cancelEditBtn && profileDisplaySection && profileEditForm) {
        editProfileBtn.addEventListener('click', () => {
            profileDisplaySection.style.display = 'none';
            profileEditForm.style.display = 'block';
        });
        
        cancelEditBtn.addEventListener('click', () => {
            profileEditForm.style.display = 'none';
            profileDisplaySection.style.display = 'block';
            profileEditForm.reset();
        });
        
        profileEditForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const phone = document.getElementById('editPhone').value;
            const address = document.getElementById('editAddress').value;
            
            const submitBtn = profileEditForm.querySelector('.save-cabinet-btn');
            const originalContent = submitBtn.innerHTML;
            submitBtn.disabled = true;
            submitBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Saving...`;
            
            fetch('/vault/update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone, address })
            })
            .then(res => res.json())
            .then(data => {
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalContent;
                
                if (data.success) {
                    document.getElementById('dispPhone').textContent = phone || 'No phone recorded';
                    document.getElementById('dispAddress').textContent = address || 'No shipping address recorded';
                    
                    profileEditForm.style.display = 'none';
                    profileDisplaySection.style.display = 'block';
                    
                    showToast("Profile updated successfully.");
                } else {
                    showToast(data.error || "Failed to update profile.");
                }
            })
            .catch(err => {
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalContent;
                console.error(err);
                showToast("Failed to update profile due to a network error.");
            });
        });
    }

    // --- INITIALIZE DYNAMIC PRODUCTS & UI ---
    fetch('/api/products')
        .then(res => res.json())
        .then(data => {
            data.forEach(p => {
                productsData[p.id] = {
                    id: p.id,
                    category: p.category,
                    name: p.name,
                    type: p.type,
                    priceINR: p.price_inr,
                    priceUSD: p.price_usd,
                    img: p.image_url,
                    tag: p.tag || '',
                    desc: p.description,
                    specs: p.specs
                };
            });

            // Initialize Cart State based on Authentication (Amazon/Flipkart merge flow)
            const isLoggedIn = document.body.dataset.loggedIn === 'true';
            if (isLoggedIn) {
                const localCart = JSON.parse(localStorage.getItem('yadhee_cart')) || [];
                if (localCart.length > 0) {
                    fetch('/api/cart/sync', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ cart: localCart })
                    })
                    .then(res => res.json())
                    .then(mergedCart => {
                        localStorage.removeItem('yadhee_cart');
                        cart = mergedCart;
                        updateCartUI();
                        showToast("We have merged your guest cart with your account.");
                    })
                    .catch(err => {
                        console.error("Cart sync error:", err);
                        cart = [];
                        updateCartUI();
                    });
                } else {
                    fetch('/api/cart')
                        .then(res => res.json())
                        .then(dbCart => {
                            cart = dbCart;
                            updateCartUI();
                        })
                        .catch(err => {
                            console.error("Cart retrieval error:", err);
                            cart = [];
                            updateCartUI();
                        });
                }
            } else {
                cart = JSON.parse(localStorage.getItem('yadhee_cart')) || [];
                updateCartUI();
            }

            updateWishlistUI();
            bindGlobalProductCardEvents();

            // Cart Page Init
            const initCartPage = () => {
                const cartPageGrid = document.getElementById('cartPageGrid');
                const cartPageEmpty = document.getElementById('cartPageEmpty');
                const cartPageItems = document.getElementById('cartPageItems');
                const cartPageSubtotal = document.getElementById('cartPageSubtotal');
                const cartPageDiscount = document.getElementById('cartPageDiscount');
                const cartPageTotal = document.getElementById('cartPageTotal');
                const cartPageTotalUSD = document.getElementById('cartPageTotalUSD');

                if (!cartPageGrid || !cartPageEmpty || !cartPageItems) return;

                const updateCartPageUI = () => {
                    if (cart.length === 0) {
                        cartPageGrid.style.display = 'none';
                        cartPageEmpty.style.display = 'block';
                        return;
                    }

                    cartPageGrid.style.display = 'grid';
                    cartPageEmpty.style.display = 'none';

                    cartPageItems.innerHTML = '';
                    let rawTotalINR = 0;
                    let rawTotalUSD = 0;

                    cart.forEach(item => {
                        const product = productsData[item.id];
                        if (!product) return;

                        const itemTotalINR = product.priceINR * item.qty;
                        rawTotalINR += itemTotalINR;
                        rawTotalUSD += product.priceUSD * item.qty;

                        const itemHTML = `
                            <div class="cart-page-item" data-id="${item.id}">
                                <div class="item-details-box">
                                    <div class="item-img-container">
                                        <img src="/${product.img}" alt="${product.name}" class="item-img">
                                    </div>
                                    <div class="item-text">
                                        <a href="/${product.category === 'saree' ? 'sarees' : 'jewels'}#${product.id}" class="item-title">${product.name}</a>
                                        <span class="item-sub">${product.type}</span>
                                        <span class="item-unit-price">₹${product.priceINR.toLocaleString('en-IN')}</span>
                                    </div>
                                </div>
                                <div class="item-qty-box">
                                    <div class="qty-selector">
                                        <button type="button" class="qty-btn page-qty-minus"><i class="fa-solid fa-minus"></i></button>
                                        <span class="qty-value">${item.qty}</span>
                                        <button type="button" class="qty-btn page-qty-plus"><i class="fa-solid fa-plus"></i></button>
                                    </div>
                                    <button type="button" class="remove-text-btn page-item-remove">Remove</button>
                                </div>
                                <div class="item-total-price-box">
                                    <span class="item-total-price">₹${itemTotalINR.toLocaleString('en-IN')}</span>
                                </div>
                            </div>
                        `;
                        cartPageItems.insertAdjacentHTML('beforeend', itemHTML);
                    });

                    const DISCOUNT_RATE = 0.05;
                    const discountINR = Math.round(rawTotalINR * DISCOUNT_RATE);
                    const totalINR = rawTotalINR - discountINR;
                    const totalUSD = parseFloat((rawTotalUSD * (1 - DISCOUNT_RATE)).toFixed(2));

                    cartPageSubtotal.textContent = `₹${rawTotalINR.toLocaleString('en-IN')}`;
                    cartPageDiscount.textContent = `-₹${discountINR.toLocaleString('en-IN')}`;
                    cartPageTotal.textContent = `₹${totalINR.toLocaleString('en-IN')}`;
                    if (cartPageTotalUSD) {
                        cartPageTotalUSD.textContent = `$${totalUSD.toLocaleString()} USD`;
                    }

                    cartPageItems.querySelectorAll('.cart-page-item').forEach(itemNode => {
                        const pid = itemNode.getAttribute('data-id');
                        
                        itemNode.querySelector('.page-qty-minus').addEventListener('click', () => {
                            adjustQty(pid, -1);
                            updateCartPageUI();
                        });

                        itemNode.querySelector('.page-qty-plus').addEventListener('click', () => {
                            adjustQty(pid, 1);
                            updateCartPageUI();
                        });

                        itemNode.querySelector('.page-item-remove').addEventListener('click', () => {
                            removeFromCart(pid);
                            updateCartPageUI();
                        });
                    });

                    addCursorListeners();
                };

                updateCartPageUI();
            };

            // Checkout Page Init
            const initCheckoutPage = () => {
                const checkoutPageGrid = document.getElementById('checkoutPageGrid');
                const checkoutPageEmpty = document.getElementById('checkoutPageEmpty');
                const checkoutPageItemsList = document.getElementById('checkoutPageItemsList');
                const checkoutPageSubtotal = document.getElementById('checkoutPageSubtotal');
                const checkoutPageDiscount = document.getElementById('checkoutPageDiscount');
                const checkoutPageTotal = document.getElementById('checkoutPageTotal');
                const checkoutPageTotalUSD = document.getElementById('checkoutPageTotalUSD');
                const checkoutPageForm = document.getElementById('checkoutPageForm');
                
                let appliedCoupon = null;

                if (!checkoutPageGrid || !checkoutPageEmpty || !checkoutPageItemsList) return;

                // Coupon application handler
                const couponCodeInput = document.getElementById('couponCodeInput');
                const applyCouponBtn = document.getElementById('applyCouponBtn');
                const couponStatusMessage = document.getElementById('couponStatusMessage');
                const checkoutPageCouponRow = document.getElementById('checkoutPageCouponRow');
                const couponCodeLabel = document.getElementById('couponCodeLabel');
                const checkoutPageCouponDiscount = document.getElementById('checkoutPageCouponDiscount');

                if (applyCouponBtn && couponCodeInput) {
                    applyCouponBtn.addEventListener('click', () => {
                        const code = couponCodeInput.value.trim();
                        if (!code) {
                            showCouponStatus("Please enter a coupon code.", "error");
                            return;
                        }
                        
                        applyCouponBtn.disabled = true;
                        applyCouponBtn.textContent = "...";
                        
                        fetch('/api/coupons/validate', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ code })
                        })
                        .then(res => {
                            applyCouponBtn.disabled = false;
                            applyCouponBtn.textContent = "Apply";
                            return res.json();
                        })
                        .then(data => {
                            if (data.error) {
                                appliedCoupon = null;
                                showCouponStatus(data.error, "error");
                                updateCheckoutPageUI();
                            } else {
                                appliedCoupon = {
                                    code: data.code,
                                    discount_type: data.discount_type,
                                    value: data.value
                                };
                                showCouponStatus(`🎉 Coupon "${data.code}" applied!`, "success");
                                updateCheckoutPageUI();
                            }
                        })
                        .catch(err => {
                            applyCouponBtn.disabled = false;
                            applyCouponBtn.textContent = "Apply";
                            showCouponStatus("Server validation error.", "error");
                        });
                    });
                }

                const showCouponStatus = (msg, type) => {
                    if (!couponStatusMessage) return;
                    couponStatusMessage.textContent = msg;
                    couponStatusMessage.style.display = 'block';
                    if (type === 'success') {
                        couponStatusMessage.style.color = '#4caf50';
                    } else {
                        couponStatusMessage.style.color = 'var(--color-crimson)';
                    }
                };

                const updateCheckoutPageUI = () => {
                    if (cart.length === 0) {
                        checkoutPageGrid.style.display = 'none';
                        checkoutPageEmpty.style.display = 'block';
                        return;
                    }

                    checkoutPageGrid.style.display = 'grid';
                    checkoutPageEmpty.style.display = 'none';

                    checkoutPageItemsList.innerHTML = '';
                    let rawTotalINR = 0;
                    let rawTotalUSD = 0;

                    cart.forEach(item => {
                        const product = productsData[item.id];
                        if (!product) return;

                        const itemTotalINR = product.priceINR * item.qty;
                        rawTotalINR += itemTotalINR;
                        rawTotalUSD += product.priceUSD * item.qty;

                        const itemHTML = `
                            <div class="checkout-item-mini-row">
                                <div class="mini-img-box">
                                    <img src="/${product.img}" alt="${product.name}" class="mini-img">
                                </div>
                                <div class="mini-details">
                                    <h4 class="mini-title">${product.name}</h4>
                                    <span class="mini-meta">${product.type} • Qty: ${item.qty}</span>
                                </div>
                                <span class="mini-total-price">₹${itemTotalINR.toLocaleString('en-IN')}</span>
                            </div>
                        `;
                        checkoutPageItemsList.insertAdjacentHTML('beforeend', itemHTML);
                    });

                    const DISCOUNT_RATE = 0.05;
                    const discountINR = Math.round(rawTotalINR * DISCOUNT_RATE);
                    
                    let couponDiscountINR = 0;
                    let couponDiscountUSD = 0;
                    
                    if (appliedCoupon) {
                        if (appliedCoupon.discount_type === 'percent') {
                            couponDiscountINR = Math.round((rawTotalINR - discountINR) * (appliedCoupon.value / 100));
                            couponDiscountUSD = parseFloat(((rawTotalUSD * (1 - DISCOUNT_RATE)) * (appliedCoupon.value / 100)).toFixed(2));
                        } else {
                            couponDiscountINR = Math.min(appliedCoupon.value, rawTotalINR - discountINR);
                            couponDiscountUSD = parseFloat(Math.min(appliedCoupon.value / 83, rawTotalUSD * (1 - DISCOUNT_RATE)).toFixed(2));
                        }
                    }

                    const totalINR = rawTotalINR - discountINR - couponDiscountINR;
                    const totalUSD = parseFloat((rawTotalUSD * (1 - DISCOUNT_RATE) - couponDiscountUSD).toFixed(2));

                    checkoutPageSubtotal.textContent = `₹${rawTotalINR.toLocaleString('en-IN')}`;
                    checkoutPageDiscount.textContent = `-₹${discountINR.toLocaleString('en-IN')}`;
                    
                    if (appliedCoupon && checkoutPageCouponRow && couponCodeLabel && checkoutPageCouponDiscount) {
                        checkoutPageCouponRow.style.display = 'flex';
                        couponCodeLabel.textContent = appliedCoupon.code;
                        checkoutPageCouponDiscount.textContent = `-₹${couponDiscountINR.toLocaleString('en-IN')}`;
                    } else if (checkoutPageCouponRow) {
                        checkoutPageCouponRow.style.display = 'none';
                    }

                    checkoutPageTotal.textContent = `₹${totalINR.toLocaleString('en-IN')}`;
                    if (checkoutPageTotalUSD) {
                        checkoutPageTotalUSD.textContent = `$${totalUSD.toLocaleString()} USD`;
                    }
                };

                if (checkoutPageForm) {
                    checkoutPageForm.addEventListener('submit', (e) => {
                        e.preventDefault();

                        const submitBtn = checkoutPageForm.querySelector('.submit-secured-order-btn');
                        const originalContent = submitBtn.innerHTML;
                        submitBtn.disabled = true;
                        submitBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Processing Payment...`;

                        const name = document.getElementById('checkoutPageName').value;
                        const email = document.getElementById('checkoutPageEmail').value;
                        const phone = document.getElementById('checkoutPagePhone').value;
                        const address = document.getElementById('checkoutPageAddress').value;
                        const forceOutcome = document.getElementById('devForcePageOutcome') ? document.getElementById('devForcePageOutcome').value : 'success';

                        const DISCOUNT_RATE = 0.05;
                        let rawTotalINR = cart.reduce((acc, curr) => {
                            const prod = productsData[curr.id];
                            return acc + (prod ? prod.priceINR * curr.qty : 0);
                        }, 0);
                        let rawTotalUSD = cart.reduce((acc, curr) => {
                            const prod = productsData[curr.id];
                            return acc + (prod ? prod.priceUSD * curr.qty : 0);
                        }, 0);

                        const discountINR = Math.round(rawTotalINR * DISCOUNT_RATE);
                        let couponDiscountINR = 0;
                        let couponDiscountUSD = 0;

                        if (appliedCoupon) {
                            if (appliedCoupon.discount_type === 'percent') {
                                couponDiscountINR = Math.round((rawTotalINR - discountINR) * (appliedCoupon.value / 100));
                                couponDiscountUSD = parseFloat(((rawTotalUSD * (1 - DISCOUNT_RATE)) * (appliedCoupon.value / 100)).toFixed(2));
                            } else {
                                couponDiscountINR = Math.min(appliedCoupon.value, rawTotalINR - discountINR);
                                couponDiscountUSD = parseFloat(Math.min(appliedCoupon.value / 83, rawTotalUSD * (1 - DISCOUNT_RATE)).toFixed(2));
                            }
                        }

                        let totalINR = rawTotalINR - discountINR - couponDiscountINR;
                        let totalUSD = parseFloat((rawTotalUSD * (1 - DISCOUNT_RATE) - couponDiscountUSD).toFixed(2));

                        fetch('/api/checkout', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ name, email, phone, address, cart, totalINR, totalUSD, paymentForceOutcome: forceOutcome, couponCode: appliedCoupon ? appliedCoupon.code : null })
                        })
                        .then(res => res.json())
                        .then(data => {
                            submitBtn.disabled = false;
                            submitBtn.innerHTML = originalContent;

                            if (data.success) {
                                showToast(`Order #${data.orderId} placed successfully!`);
                                cart = [];
                                localStorage.removeItem('yadhee_cart');
                                updateCartUI();
                                checkoutPageForm.reset();
                                window.location.href = '/vault';
                            } else {
                                showToast(data.error || "Failed to place order.");
                            }
                        })
                        .catch(err => {
                            submitBtn.disabled = false;
                            submitBtn.innerHTML = originalContent;
                            console.error(err);
                            showToast("Payment processing error. Please try again.");
                        });
                    });

                    const syncPageCart = () => {
                        const name = document.getElementById('checkoutPageName')?.value || '';
                        const email = document.getElementById('checkoutPageEmail')?.value || '';
                        const phone = document.getElementById('checkoutPagePhone')?.value || '';
                        const address = document.getElementById('checkoutPageAddress')?.value || '';

                        if (email && cart.length > 0) {
                            let totalINR = cart.reduce((acc, curr) => {
                                const prod = productsData[curr.id];
                                return acc + (prod ? prod.priceINR * curr.qty : 0);
                            }, 0);
                            let totalUSD = cart.reduce((acc, curr) => {
                                const prod = productsData[curr.id];
                                return acc + (prod ? prod.priceUSD * curr.qty : 0);
                            }, 0);

                            fetch('/api/abandoned-cart', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ name, email, phone, address, cart, totalINR, totalUSD })
                            })
                            .then(res => res.json())
                            .then(data => {
                                console.log("[Abandoned Cart Page] Synced successfully:", data);
                            })
                            .catch(err => console.error("[Abandoned Cart Page] Sync error:", err));
                        }
                    };

                    setTimeout(() => {
                        ['checkoutPageName', 'checkoutPageEmail', 'checkoutPagePhone', 'checkoutPageAddress'].forEach(id => {
                            const input = document.getElementById(id);
                            if (input) {
                                input.addEventListener('blur', syncPageCart);
                                input.addEventListener('change', syncPageCart);
                            }
                        });
                    }, 1000);
                }

                updateCheckoutPageUI();
            };

            // Path Check Triggers
            if (window.location.pathname === '/cart') {
                initCartPage();
            } else if (window.location.pathname === '/checkout') {
                initCheckoutPage();
            }

            // Auto-trigger product modal if deep-linked hash anchor exists
            const hash = window.location.hash;
            if (hash && hash.startsWith('#')) {
                const prodId = hash.substring(1);
                if (productsData[prodId]) {
                    setTimeout(() => openProductModal(prodId), 500);
                }
            }
        })
        .catch(err => {
            console.error("Error loading dynamic luxury catalog registry:", err);
            showToast("Secure catalog syncing error. Loading offline mode...");
        });

    // --- EXPLORE SIDEBAR NAVIGATION DRAWER ---
    const menuHamburger = document.getElementById('menuHamburger');
    const sidebarDrawer = document.getElementById('sidebarDrawer');
    const sidebarDrawerOverlay = document.getElementById('sidebarDrawerOverlay');
    const drawerClose = document.getElementById('drawerClose');

    if (menuHamburger && sidebarDrawer && sidebarDrawerOverlay) {
        menuHamburger.addEventListener('click', () => {
            sidebarDrawer.classList.add('active');
            sidebarDrawerOverlay.classList.add('active');
            document.body.style.overflow = 'hidden'; // prevent body scroll when open
        });
    }

    const closeSidebarDrawer = () => {
        if (sidebarDrawer && sidebarDrawerOverlay) {
            sidebarDrawer.classList.remove('active');
            sidebarDrawerOverlay.classList.remove('active');
            document.body.style.overflow = '';
        }
    };

    if (drawerClose) {
        drawerClose.addEventListener('click', closeSidebarDrawer);
    }

    if (sidebarDrawerOverlay) {
        sidebarDrawerOverlay.addEventListener('click', closeSidebarDrawer);
    }

    // Toggle expandable groups inside drawer
    const collectionsGroupHeader = document.getElementById('collectionsGroupHeader');
    const collectionsGroupLinks = document.getElementById('collectionsGroupLinks');
    if (collectionsGroupHeader && collectionsGroupLinks) {
        collectionsGroupHeader.addEventListener('click', () => {
            const caret = collectionsGroupHeader.querySelector('.group-caret');
            const isOpen = collectionsGroupLinks.classList.toggle('active');
            if (isOpen) {
                collectionsGroupLinks.style.maxHeight = collectionsGroupLinks.scrollHeight + 'px';
                caret.className = 'fa-solid fa-minus group-caret';
            } else {
                collectionsGroupLinks.style.maxHeight = '0';
                caret.className = 'fa-solid fa-plus group-caret';
            }
        });
    }

    const brandsGroupHeader = document.getElementById('brandsGroupHeader');
    const brandsGroupLinks = document.getElementById('brandsGroupLinks');
    if (brandsGroupHeader && brandsGroupLinks) {
        brandsGroupHeader.addEventListener('click', () => {
            const caret = brandsGroupHeader.querySelector('.group-caret');
            const isOpen = brandsGroupLinks.classList.toggle('active');
            if (isOpen) {
                brandsGroupLinks.style.maxHeight = brandsGroupLinks.scrollHeight + 'px';
                caret.className = 'fa-solid fa-minus group-caret';
            } else {
                brandsGroupLinks.style.maxHeight = '0';
                caret.className = 'fa-solid fa-plus group-caret';
            }
        });
    }

    // Close Announcement Bar Handler
    const closeAnnouncement = document.getElementById('closeAnnouncement');
    const announcementBar = document.getElementById('announcementBar');
    if (closeAnnouncement && announcementBar && mainHeader) {
        closeAnnouncement.addEventListener('click', () => {
            announcementBar.style.display = 'none';
            document.body.classList.add('announcement-closed');
            mainHeader.style.top = '0';
        });
    }

});

