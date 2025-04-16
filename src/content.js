import * as tf from '@tensorflow/tfjs';
import { PersonalizedModelTrainer } from './ai/PersonalizedModelTrainer';

class AdShield {
    constructor() {
        this.model = null;
        this.personalizedTrainer = new PersonalizedModelTrainer();
        this.userPreferences = null;
        this.whitelist = [];
        this.isInitialized = false;
        this.adCategories = {
            'tech': {
                keywords: ['technology', 'gadget', 'software', 'hardware', 'tech'],
                selectors: [
                    '[class*="tech"][class*="sponsor"]',
                    '[class*="tech"][class*="ad"]',
                    'iframe[src*="tech"][src*="ad"]',
                    '[data-ad-category="tech"]'
                ]
            },
            'fashion': {
                keywords: ['fashion', 'clothing', 'style', 'wear', 'apparel'],
                selectors: [
                    '[class*="fashion"][class*="ad"]',
                    '[class*="clothing"][class*="sponsor"]',
                    '[data-ad-category="fashion"]'
                ]
            },
            'sponsored': {
                keywords: ['sponsored', 'promoted', 'partner', 'collaboration'],
                selectors: [
                    '[class*="sponsored"]',
                    '[class*="promoted"]',
                    '[data-sponsored]',
                    '.sponsored-content'
                ]
            },
            'affiliate': {
                keywords: ['affiliate', 'commission', 'partner-link'],
                selectors: [
                    '[class*="affiliate"]',
                    '[data-affiliate]',
                    'a[href*="affiliate"]',
                    '[data-ad-category="affiliate"]'
                ]
            },
            'shopping': {
                keywords: ['shop', 'buy', 'purchase', 'deal', 'discount'],
                selectors: [
                    '[class*="shopping"][class*="ad"]',
                    '[class*="product"][class*="ad"]',
                    '[data-ad-category="shopping"]'
                ]
            },
            'travel': {
                keywords: ['travel', 'flight', 'hotel', 'vacation', 'booking'],
                selectors: [
                    '[class*="travel"][class*="sponsor"]',
                    '[class*="flight"][class*="ad"]',
                    '[data-ad-category="travel"]'
                ]
            },
            'finance': {
                keywords: ['finance', 'invest', 'trading', 'crypto', 'bank'],
                selectors: [
                    '[class*="finance"][class*="ad"]',
                    '[class*="trading"][class*="ad"]',
                    '[data-ad-category="finance"]'
                ]
            },
            'gaming': {
                keywords: ['game', 'gaming', 'play', 'console', 'esports'],
                selectors: [
                    '[class*="game"][class*="ad"]',
                    '[class*="gaming"][class*="sponsor"]',
                    '[data-ad-category="gaming"]'
                ]
            },
            'social': {
                keywords: ['social', 'network', 'community', 'follow'],
                selectors: [
                    '[class*="social"][class*="sponsor"]',
                    '[class*="social"][class*="promoted"]',
                    '[data-ad-category="social"]'
                ]
            },
            'video': {
                keywords: ['video', 'watch', 'stream', 'player'],
                selectors: [
                    '.video-ad',
                    '[class*="video"][class*="sponsor"]',
                    '.pre-roll-ad',
                    '[data-ad-category="video"]'
                ]
            }
        };
    }

    async initialize() {
        try {
            // Initialize personalized model trainer
            await this.personalizedTrainer.initialize();
            await this.personalizedTrainer.loadSavedModel();

            // Get user preferences and whitelist
            await this.loadUserPreferences();
            
            // Set up observers and start blocking
            this.setupObservers();
            this.processPage();
            
            this.isInitialized = true;
            console.log("✅ AdShield Initialized");
        } catch (error) {
            console.error("❌ Initialization Error:", error);
            this.fallbackMode();
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
                if (shouldBlock) {
                    this.hideElement(element);
                    console.log(`🚫 Blocked ${adInfo.category} ad:`, element);
                } else {
                    console.log(`✅ Allowed ${adInfo.category} ad:`, element);
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
        if (Object.keys(this.userPreferences).length === 0) return true;

        // If category is unknown, block by default
        if (!category || !this.userPreferences.hasOwnProperty(category)) return true;

        // Block if the category is not allowed
        return !this.userPreferences[category];
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
