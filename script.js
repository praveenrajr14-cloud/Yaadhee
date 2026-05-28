/* -------------------------------------------------------------
   YADHEE LUXURY HERITAGE - COMPLETE APP LOGIC (JAVASCRIPT)
   ------------------------------------------------------------- */

document.addEventListener('DOMContentLoaded', () => {

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
    // I. CUSTOM DOUBLE CURSOR механики
    // -------------------------------------------------------------
    document.addEventListener('mousemove', (e) => {
        cursor.style.left = e.clientX + 'px';
        cursor.style.top = e.clientY + 'px';
        
        cursorDot.style.left = e.clientX + 'px';
        cursorDot.style.top = e.clientY + 'px';
    });

    const addCursorListeners = () => {
        const interactiveElements = document.querySelectorAll('a, button, input, select, textarea, .product-card, .filter-btn, .lookbook-dot');
        interactiveElements.forEach(el => {
            el.addEventListener('mouseenter', () => {
                document.body.classList.add('hovering-interactive');
            });
            el.addEventListener('mouseleave', () => {
                document.body.classList.remove('hovering-interactive');
            });
        });
    };
    addCursorListeners();


    // -------------------------------------------------------------
    // II. SCROLL DRIVEN LAYOUT EFFECTS & PARALLAX
    // -------------------------------------------------------------
    window.addEventListener('scroll', () => {
        if (window.scrollY > 80) {
            mainHeader.classList.add('scrolled');
        } else {
            mainHeader.classList.remove('scrolled');
        }

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

    document.querySelectorAll('.reveal-on-scroll').forEach(el => {
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
            showToast('Acquisition removed from Favorites.');
        } else {
            wishlist.push(id);
            showToast('Acquisition secured in your private Favorites.');
        }
        localStorage.setItem('yadhee_wishlist', JSON.stringify(wishlist));
        updateWishlistUI();
    };

    // Wishlist Toggle button bindings
    favsToggle.addEventListener('click', () => {
        showToast(`Your private Favorites contain ${wishlist.length} heirloom pieces.`);
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
                    <p>Your luxury collection vault is currently empty.</p>
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
        
        localStorage.setItem('yadhee_cart', JSON.stringify(cart));
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
            localStorage.setItem('yadhee_cart', JSON.stringify(cart));
            updateCartUI();
        }
    };

    const removeFromCart = (id) => {
        cart = cart.filter(item => item.id !== id);
        localStorage.setItem('yadhee_cart', JSON.stringify(cart));
        updateCartUI();
        showToast('Acquisition removed from Bag.');
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
                showToast('Your collection vault is empty.');
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
            submitBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Secure Transmitting...`;

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
                    showToast(`Sovereign dispatch order #${data.orderId} secured successfully!`);
                    cart = [];
                    localStorage.removeItem('yadhee_cart');
                    updateCartUI();
                    checkoutForm.reset();
                    checkoutModal.classList.remove('active');
                } else {
                    showToast(data.error || "Order dispatch transmission failed.");
                }
            })
            .catch(err => {
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalContent;
                console.error(err);
                showToast("Secured gateway network transmission failure.");
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
                    <button class="modal-add-btn" id="modalAddBtn" data-id="${product.id}">Acquire Masterpiece</button>
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
            updateCartUI();
            updateWishlistUI();
            bindGlobalProductCardEvents();

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
            // Fallback load mock
            showToast("Secure catalog syncing error. Loading offline mode...");
        });

});
