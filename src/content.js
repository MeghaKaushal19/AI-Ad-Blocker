import * as tf from '@tensorflow/tfjs';
import { PersonalizedModelTrainer } from './ai/PersonalizedModelTrainer';

class AdShield {
    constructor() {
        this.model = null;
        this.personalizedTrainer = new PersonalizedModelTrainer();
        this.userPreferences = null;
        this.whitelist = [];
        this.isInitialized = false;
        this.retryAttempts = 0;
        this.maxRetryAttempts = 3;
        this.retryDelay = 1000; // 1 second
        this.adCategories = {
            'tech': {
                keywords: [
                    'technology', 'gadget', 'software', 'hardware', 'tech', 'computer',
                    'laptop', 'smartphone', 'device', 'electronics', 'digital', 'app',
                    'mobile', 'tablet', 'gaming', 'console', 'smart home', 'iot',
                    'artificial intelligence', 'ai', 'robot', 'automation', 'cyber'
                ],
                selectors: [
                    '[class*="tech"][class*="sponsor"]',
                    '[class*="tech"][class*="ad"]',
                    'iframe[src*="tech"][src*="ad"]',
                    '[data-ad-category="tech"]',
                    '[class*="technology-promotion"]',
                    '[id*="tech-sponsor"]',
                    'div[class*="gadget-showcase"]',
                    'a[href*="tech"][href*="promotion"]',
                    '[data-sponsor-category="technology"]'
                ]
            },
            'fashion': {
                keywords: [
                    'fashion', 'clothing', 'style', 'wear', 'apparel', 'shoes',
                    'accessories', 'jewelry', 'designer', 'outfit', 'dress', 'luxury',
                    'brand', 'collection', 'trend', 'seasonal', 'boutique', 'wardrobe',
                    'handbag', 'cosmetics', 'beauty', 'makeup', 'skincare'
                ],
                selectors: [
                    '[class*="fashion"][class*="ad"]',
                    '[class*="clothing"][class*="sponsor"]',
                    '[data-ad-category="fashion"]',
                    '.fashion-promotion',
                    '#style-showcase',
                    '[class*="beauty-ad"]',
                    'div[class*="brand-spotlight"]',
                    'iframe[src*="fashion"][src*="promo"]',
                    '[data-sponsor-type="fashion"]'
                ]
            },
            'sponsored': {
                keywords: [
                    'sponsored', 'promoted', 'partner', 'collaboration', 'ad',
                    'advertisement', 'promotion', 'sponsored content', 'paid content',
                    'branded', 'partnership', 'advertorial', 'featured', 'recommended',
                    'suggested', 'sponsored post', 'paid partnership'
                ],
                selectors: [
                    '[class*="sponsored"]',
                    '[class*="promoted"]',
                    '[data-sponsored]',
                    '.sponsored-content',
                    '[aria-label*="advertisement"]',
                    '[role="complementary"]',
                    '[data-ad]',
                    '.ad-container',
                    '#sponsored-content',
                    '[class*="native-ad"]',
                    '.paid-content',
                    '[data-testid*="sponsored"]'
                ]
            },
            'affiliate': {
                keywords: [
                    'affiliate', 'commission', 'partner-link', 'referral', 'earn',
                    'reward', 'cashback', 'partnership', 'associate', 'deal',
                    'exclusive offer', 'special offer', 'limited time', 'promotion code'
                ],
                selectors: [
                    '[class*="affiliate"]',
                    '[data-affiliate]',
                    'a[href*="affiliate"]',
                    '[data-ad-category="affiliate"]',
                    '.partner-content',
                    '[class*="referral"]',
                    'div[data-partnership]',
                    '[class*="commission-link"]',
                    '.affiliate-disclosure',
                    '[data-tracking*="affiliate"]'
                ]
            },
            'shopping': {
                keywords: [
                    'shop', 'buy', 'purchase', 'deal', 'discount', 'price', 'offer',
                    'sale', 'product', 'store', 'cart', 'checkout', 'order', 'amazon',
                    'ebay', 'marketplace', 'ecommerce', 'shopping', 'bargain', 'save',
                    'limited time', 'exclusive', 'best price', 'free shipping',
                    'discount code', 'coupon', 'clearance', 'special price',
                    'best deal', 'flash sale', 'today only', 'shop now', 'buy now',
                    'great deal', 'hot deal', 'special offer', 'lowest price'
                ],
                selectors: [
                    '[class*="shopping"]',
                    '[class*="product"]',
                    '[class*="commerce"]',
                    '[class*="shop"]',
                    '[class*="store"]',
                    '[data-ad-category="shopping"]',
                    '[class*="buy"]',
                    '[class*="price"]',
                    'a[href*="product"]',
                    'a[href*="shop"]',
                    'a[href*="buy"]',
                    'iframe[src*="shop"]',
                    'iframe[src*="product"]',
                    '.product-card',
                    '.shopping-widget',
                    '[data-testid*="product-ad"]',
                    '[class*="marketplace"]',
                    '.deal-container',
                    '[class*="price-tag"]',
                    'div[class*="shop-now"]',
                    '[data-automation*="product"]'
                ]
            },
            'travel': {
                keywords: [
                    'travel', 'flight', 'hotel', 'vacation', 'booking', 'destination',
                    'trip', 'holiday', 'resort', 'cruise', 'airfare', 'accommodation',
                    'tour', 'adventure', 'getaway', 'explore', 'journey', 'tourism'
                ],
                selectors: [
                    '[class*="travel"][class*="sponsor"]',
                    '[class*="flight"][class*="ad"]',
                    '[data-ad-category="travel"]',
                    '.vacation-promo',
                    '#travel-deals',
                    '[class*="hotel-ad"]',
                    'div[class*="destination-spotlight"]',
                    'iframe[src*="travel"][src*="promo"]',
                    '[data-sponsor-type="travel"]'
                ]
            },
            'finance': {
                keywords: [
                    'finance', 'invest', 'trading', 'crypto', 'bank', 'loan',
                    'mortgage', 'credit', 'insurance', 'investment', 'stock',
                    'portfolio', 'wealth', 'money', 'financial', 'banking',
                    'retirement', 'savings', 'broker', 'fund', 'asset'
                ],
                selectors: [
                    '[class*="finance"][class*="ad"]',
                    '[class*="trading"][class*="ad"]',
                    '[data-ad-category="finance"]',
                    '.investment-promo',
                    '#financial-offers',
                    '[class*="crypto-ad"]',
                    'div[class*="banking-products"]',
                    'iframe[src*="finance"][src*="promo"]',
                    '[data-sponsor-type="financial"]'
                ]
            },
            'gaming': {
                keywords: [
                    'game', 'gaming', 'play', 'console', 'esports', 'playstation',
                    'xbox', 'nintendo', 'steam', 'gamer', 'multiplayer', 'rpg',
                    'fps', 'mmorpg', 'battle royale', 'dlc', 'expansion'
                ],
                selectors: [
                    '[class*="game"][class*="ad"]',
                    '[class*="gaming"][class*="sponsor"]',
                    '[data-ad-category="gaming"]',
                    '.game-promotion',
                    '#gaming-deals',
                    '[class*="game-ad"]',
                    'div[class*="esports-content"]',
                    'iframe[src*="game"][src*="promo"]',
                    '[data-sponsor-type="gaming"]'
                ]
            },
            'social': {
                keywords: [
                    'social', 'network', 'community', 'follow', 'share', 'connect',
                    'platform', 'profile', 'influencer', 'trending', 'viral',
                    'social media', 'engagement', 'followers', 'likes', 'social network'
                ],
                selectors: [
                    '[class*="social"][class*="sponsor"]',
                    '[class*="social"][class*="promoted"]',
                    '[data-ad-category="social"]',
                    '.social-promotion',
                    '#social-spotlight',
                    '[class*="influencer-ad"]',
                    'div[class*="social-content"]',
                    'iframe[src*="social"][src*="promo"]',
                    '[data-sponsor-type="social"]'
                ]
            },
            'video': {
                keywords: [
                    'video', 'watch', 'stream', 'player', 'streaming', 'live',
                    'broadcast', 'channel', 'episode', 'series', 'movie', 'film',
                    'trailer', 'preview', 'premiere', 'show', 'content'
                ],
                selectors: [
                    '.video-ad',
                    '[class*="video"][class*="sponsor"]',
                    '.pre-roll-ad',
                    '[data-ad-category="video"]',
                    '.video-promotion',
                    '#streaming-offers',
                    '[class*="player-ad"]',
                    'div[class*="video-content"]',
                    'iframe[src*="video"][src*="promo"]',
                    '[data-sponsor-type="video"]',
                    '.mid-roll-ad',
                    '.post-roll-ad',
                    '[class*="stream-ad"]'
                ]
            }
        };
    }

    async initialize() {
        try {
            console.log("🚀 Initializing AdShield...");
            
            // Load user preferences and whitelist first
            await this.loadUserPreferences();
            
            // Initialize the model
            await this.initializeModel();
            
            // Set up observers and start blocking
            this.setupObservers();
            await this.processPage();
            
            this.isInitialized = true;
            console.log("✅ AdShield Initialized Successfully");
    } catch (error) {
            console.error("❌ Initialization Error:", error);
            if (this.retryAttempts < this.maxRetryAttempts) {
                this.retryAttempts++;
                console.log(`🔄 Retrying initialization (attempt ${this.retryAttempts}/${this.maxRetryAttempts})...`);
                setTimeout(() => this.initialize(), this.retryDelay * this.retryAttempts);
            } else {
                console.error("❌ Max retry attempts reached. Falling back to basic mode.");
                this.fallbackMode();
            }
        }
    }

    async initializeModel() {
        try {
            console.log("🧠 Loading AI model...");
            
            // Get the model path
            const modelPath = chrome.runtime.getURL('model/model.json');
            console.log("📂 Model path:", modelPath);
            
            // Load the model
            this.model = await tf.loadGraphModel(modelPath);
            console.log("✅ Model loaded successfully");
            
            // Warm up the model with a dummy prediction
            const dummyTensor = tf.zeros([1, 224, 224, 3]);
            await this.model.predict(dummyTensor).data();
            tf.dispose(dummyTensor);
            
            console.log("✨ Model warm-up complete");
            return true;
        } catch (error) {
            console.error("❌ Error loading model:", error);
            if (error.message.includes('Failed to fetch')) {
                console.error("💡 This might be due to:");
                console.error("   1. Model files not found in the correct location");
                console.error("   2. CORS issues with model file access");
                console.error("   3. Network connectivity problems");
            }
            throw error;
        }
    }

    async loadUserPreferences() {
        return new Promise((resolve) => {
            chrome.storage.sync.get(['adPreferences', 'whitelist'], (result) => {
                this.userPreferences = result.adPreferences || {};
                this.whitelist = result.whitelist || [];
                resolve();
            });
        });
    }

    setupObservers() {
        // Watch for DOM changes
        const observer = new MutationObserver(this.handleMutations.bind(this));
        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['src', 'class', 'id']
        });

        // Listen for preference updates
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            if (message.type === 'PREFERENCES_UPDATED') {
                this.userPreferences = message.preferences;
                this.processPage();
            } else if (message.type === 'WHITELIST_UPDATED') {
                this.whitelist = message.whitelist;
                this.processPage();
            }
        });
    }

    async handleMutations(mutations) {
        const significantChange = mutations.some(mutation => {
            return mutation.type === 'childList' ||
                   (mutation.type === 'attributes' && 
                    ['src', 'class', 'id'].includes(mutation.attributeName));
        });

        if (significantChange) {
            this.processPage();
        }
    }

    async processPage() {
        if (this.isWhitelisted()) {
            console.log("📋 Site is whitelisted");
            return;
        }

        const elements = document.querySelectorAll('div, iframe, img, a');
        for (const element of elements) {
            await this.processElement(element);
        }
    }

    isWhitelisted() {
        return this.whitelist.some(url => 
            window.location.href.includes(url.replace(/^https?:\/\//, '')));
    }

    async processElement(element) {
        try {
            // Skip already processed elements
            if (element.dataset.adShieldProcessed) return;
            element.dataset.adShieldProcessed = 'true';

            // Determine if it's an ad and its category
            const adInfo = await this.analyzeElement(element);
            
            if (adInfo.isAd) {
                const shouldBlock = this.shouldBlockAd(adInfo.category);
                
                // Record the interaction
                chrome.runtime.sendMessage({
                    type: 'RECORD_INTERACTION',
                    category: adInfo.category || 'general',
                    interactionType: shouldBlock ? 'blocked' : 'shown'
                });

                if (shouldBlock) {
                    // Remove the element from DOM instead of just hiding it
                    if (element.parentNode) {
                        element.parentNode.removeChild(element);
                    }
                } else {
                    // Show and highlight allowed ads
                    element.style.setProperty('display', 'block', 'important');
                    element.style.setProperty('visibility', 'visible', 'important');
                    element.style.setProperty('border', '2px solid #4CAF50', 'important');
                    element.style.setProperty('position', 'relative', 'important');
                    this.addFeedbackUI(element, adInfo.category);
                }
            }
        } catch (error) {
            console.error("Error processing element:", error);
        }
    }

    async analyzeElement(element) {
        const result = { isAd: false, category: null };

        // Check for obvious ad indicators first
        const elementHTML = element.outerHTML.toLowerCase();
        const elementText = element.textContent.toLowerCase();

        // Check each category
        for (const [category, data] of Object.entries(this.adCategories)) {
            // Check selectors
            const matchesSelector = data.selectors.some(selector => {
                try {
                    return element.matches(selector);
                } catch {
                    return false;
                }
            });

            // Check keywords
            const hasKeywords = data.keywords.some(keyword => 
                elementText.includes(keyword) || elementHTML.includes(keyword));

            if (matchesSelector || hasKeywords) {
                result.isAd = true;
                result.category = category;
                break;
            }
        }

        // If it's an image or iframe, use personalized model
        if (!result.isAd && (element.tagName === 'IMG' || element.tagName === 'IFRAME')) {
            try {
                const prediction = await this.personalizedTrainer.predict(element);
                if (prediction !== null) {
                    result.isAd = prediction > 0.7;
                    // Determine category based on content if it's an ad
                    if (result.isAd) {
                        result.category = this.determineAdCategory(element);
                    }
                }
            } catch (error) {
                console.error("AI analysis failed:", error);
            }
        }

        return result;
    }

    determineAdCategory(element) {
        // Simple category determination based on element content
        const content = element.outerHTML.toLowerCase();
        
        for (const [category, data] of Object.entries(this.adCategories)) {
            if (data.keywords.some(keyword => content.includes(keyword))) {
                return category;
            }
        }
        
        return 'general';
    }

    async handleUserFeedback(element, isAd, category) {
        // Add to training data
        await this.personalizedTrainer.addTrainingExample(element, isAd ? 1 : 0);
        
        // If we have enough examples, trigger training
        await this.personalizedTrainer.trainOnUserData();
        
        // Update statistics
        chrome.runtime.sendMessage({
            type: 'RECORD_INTERACTION',
            category: category || 'general',
            interactionType: isAd ? 'blocked' : 'shown'
        });
    }

    // Add feedback buttons to ads
    addFeedbackUI(element, category) {
        const feedbackDiv = document.createElement('div');
        feedbackDiv.className = 'ad-shield-feedback';
        feedbackDiv.style.cssText = `
            position: absolute;
            top: 0;
            right: 0;
            background: rgba(0,0,0,0.7);
            padding: 5px;
            border-radius: 0 0 0 5px;
            z-index: 999999;
        `;

        const correctButton = document.createElement('button');
        correctButton.textContent = '✓';
        correctButton.title = 'This is an ad';
        correctButton.onclick = () => this.handleUserFeedback(element, true, category);

        const wrongButton = document.createElement('button');
        wrongButton.textContent = '✕';
        wrongButton.title = 'This is not an ad';
        wrongButton.onclick = () => this.handleUserFeedback(element, false, category);

        feedbackDiv.appendChild(correctButton);
        feedbackDiv.appendChild(wrongButton);

        // Make sure element is positioned relatively
        const currentPosition = window.getComputedStyle(element).position;
        if (currentPosition === 'static') {
            element.style.position = 'relative';
        }

        element.appendChild(feedbackDiv);
    }

    shouldBlockAd(category) {
        // If no preferences are set, block all ads
        if (Object.keys(this.userPreferences).length === 0) {
            console.log('No preferences set, blocking all ads');
            return true;
        }

        // If category is unknown, block by default
        if (!category || !this.userPreferences.hasOwnProperty(category)) {
            console.log(`Unknown category ${category}, blocking by default`);
            return true;
        }

        // Block if the category is not allowed
        const shouldBlock = !this.userPreferences[category];
        console.log(`Category ${category} preference check: allowed=${!shouldBlock}`);
        return shouldBlock;
    }

    hideElement(element) {
        element.style.setProperty('display', 'none', 'important');
        element.style.setProperty('visibility', 'hidden', 'important');
        element.classList.add('ad-shield-blocked');
        
        // Add feedback UI for blocked ads
        const wrapper = document.createElement('div');
        wrapper.className = 'ad-shield-blocked-wrapper';
        wrapper.style.cssText = `
            position: relative;
            width: ${element.offsetWidth}px;
            height: ${element.offsetHeight}px;
            background: rgba(0,0,0,0.1);
            display: flex;
            align-items: center;
            justify-content: center;
        `;
        
        const message = document.createElement('div');
        message.textContent = 'Ad Blocked';
        message.style.cssText = `
            background: rgba(0,0,0,0.7);
            color: white;
            padding: 5px 10px;
            border-radius: 3px;
            font-size: 12px;
        `;
        
        wrapper.appendChild(message);
        element.parentNode.insertBefore(wrapper, element);
        this.addFeedbackUI(wrapper, this.determineAdCategory(element));
    }

    fallbackMode() {
        console.log("⚠️ Entering fallback mode");
        const basicSelectors = [
            '[class*="ad-"]',
            '[class*="advertisement"]',
            '[id*="ad-"]',
            'ins.adsbygoogle',
            'iframe[src*="ad"]'
        ];

        const observer = new MutationObserver(() => {
            basicSelectors.forEach(selector => {
                document.querySelectorAll(selector).forEach(element => {
                    this.hideElement(element);
                });
            });
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }
}

// Initialize AdShield
const adShield = new AdShield();
adShield.initialize();
