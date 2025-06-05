// ==UserScript==
// @name         FaceCheck URL Extractor with Ratings (Mobile and Desktop)
// @namespace    http://tampermonkey.net/
// @version      3.0.0
// @description  Extracts image URLs and ratings from FaceCheck results for both mobile and desktop with automatic overlay on mobile
// @author       vin31_ modified by Nthompson096, perplexity.ai and 0wn3dg0d
// @match        https://facecheck.id/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // Detect mobile device
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    // Function to get cookie value by name
    const getCookie = (name) => {
        const cookies = document.cookie.split(';').map(cookie => cookie.trim());
        const targetCookie = cookies.find(cookie => cookie.startsWith(`${name}=`));
        return targetCookie ? targetCookie.split('=')[1] : null;
    };

    // Determine the theme based on the cookie
    const theme = getCookie('theme') || 'dark'; // Default to dark theme if cookie is not set

    // SHARED FUNCTIONS

    // Helper function to determine rating and color based on confidence score
    const getRating = (confidence) => {
        if (confidence >= 90) return { rating: 'Certain Match', color: isMobile ? 'green' : '#4caf50' };
        if (confidence >= 83) return { rating: 'Confident Match', color: isMobile ? 'yellow' : '#ffeb3b' };
        if (confidence >= 70) return { rating: 'Uncertain Match', color: isMobile ? 'orange' : '#ff9800' };
        if (confidence >= 50) return { rating: 'Weak Match', color: isMobile ? 'red' : '#f44336' };
        return { rating: 'No Match', color: isMobile ? 'white' : '#9e9e9e' };
    };

    // Helper to check if on results page
    const isResultsPage = () => /https:\/\/facecheck\.id\/(?:[a-z]{2})?\#.+/.test(window.location.href);

    // Shared URL extraction function (works for both mobile and desktop)
    const extractUrls = (fimg) => {
        const parentAnchor = fimg.closest('a');
        const groupId = parentAnchor ? parentAnchor.getAttribute('data-grp') : null;
        const results = [];

        // If it's a group, collect all elements of the group
        if (groupId) {
            const groupElements = document.querySelectorAll(`a[data-grp="${groupId}"]`);
            groupElements.forEach(groupElement => {
                const groupFimg = groupElement.querySelector('.facediv') || groupElement.querySelector('[id^="fimg"]');
                if (!groupFimg) return;

                const result = extractSingleUrl(groupFimg);
                if (result) results.push(result);
            });
        } else {
            // If it's a standalone element
            const result = extractSingleUrl(fimg);
            if (result) results.push(result);
        }

        return results.sort((a, b) => b.confidence - a.confidence);
    };

    // Extract URL from a single image element
    const extractSingleUrl = (fimg) => {
        const bgImage = window.getComputedStyle(fimg).backgroundImage;
        const base64Match = bgImage.match(/base64,(.*)"/);
        const urlMatch = base64Match ? atob(base64Match[1]).match(/https?:\/\/[^\s"]+/) : null;
        if (!urlMatch) return null;

        const domain = new URL(urlMatch[0]).hostname.replace('www.', '');
        const distSpan = fimg.parentElement.querySelector('.dist');
        const confidence = distSpan ? parseInt(distSpan.textContent) : 0;
        const { rating, color } = getRating(confidence);

        return { url: urlMatch[0], domain, confidence, rating, color };
    };

// MOBILE FUNCTIONALITY
if (isMobile) {
    // Mobile-specific styles for overlays - ENLARGED VERSION
    const mobileStyles = `
        .mobile-overlay {
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            background: linear-gradient(to top, rgba(0,0,0,0.9) 100%, rgba(0,0,0,0.7) 0%, transparent);
            color: white;
            padding: 12px 8px 8px 8px;
            font-size: 14px;  /* Increased from 11px */
            line-height: 1.4;  /* Increased from 1.2 */
            z-index: 1000;
            border-radius: 0 0 8px 8px;
            pointer-events: none;
            transform: translateY(100%);
            transition: transform 0.3s ease;
        }
        .mobile-overlay.visible {
            transform: translateY(0);
        }
        .mobile-overlay a {
            color: #00FFFF;
            text-decoration: none;
            display: block;
            margin-bottom: 4px;  /* Increased from 2px */
            font-weight: bold;
            pointer-events: all;
            padding: 6px 8px;  /* Increased from 2px 4px */
            border-radius: 4px;  /* Increased from 3px */
            background: rgba(0,0,0,0.8);
            font-size: 14px;  /* Added explicit font size */
        }
        .mobile-overlay a:active {
            background: rgba(0,255,255,0.2);
        }
        .mobile-overlay .rating {
            font-size: 12px;  /* Increased from 10px */
            font-weight: normal;
        }
        .fimg-container {
            position: relative;
            overflow: hidden;
        }
        .mobile-info-panel {
            position: fixed;
            bottom: 10px;
            left: 10px;
            right: 10px;
            background: rgba(0,0,0,0.95);
            color: white;
            padding: 15px;
            border-radius: 8px;
            z-index: 9999;
            font-size: 16px;  /* Increased from 14px */
            line-height: 1.5;  /* Increased from 1.4 */
            max-height: 70vh;
            overflow-y: auto;
            transform: translateY(120%);
            transition: transform 0.3s ease;
            border: 1px solid rgba(0,255,255,0.3);
            box-shadow: 0 4px 20px rgba(0,0,0,0.5);
        }
        .mobile-info-panel.visible {
            transform: translateY(0);
        }
        .mobile-info-panel .close-btn {
            position: absolute;
            top: 8px;  /* Increased from 5px */
            right: 12px;  /* Increased from 10px */
            background: none;
            border: none;
            color: #00FFFF;
            font-size: 20px;  /* Increased from 16px */
            cursor: pointer;
            padding: 0;
            width: 24px;  /* Increased from 20px */
            height: 24px;  /* Increased from 20px */
        }
        .mobile-info-panel a {
            color: #00FFFF;
            text-decoration: none;
            display: block;
            margin: 12px 0;  /* Increased from 8px 0 */
            padding: 10px 12px;  /* Increased from 8px 10px */
            background: rgba(0,255,255,0.1);
            border-radius: 6px;
            border: 1px solid rgba(0,255,255,0.2);
            word-break: break-all;
            font-size: 16px;  /* Explicit font size */
        }
        .mobile-info-panel a:active {
            background: rgba(0,255,255,0.3);
        }
        .mobile-info-panel .url-item {
            margin-bottom: 16px;  /* Increased from 12px */
        }
        .mobile-info-panel .confidence {
            font-size: 14px;  /* Increased from 12px */
            margin-top: 6px;  /* Increased from 2px */
        }
        .mobile-overlay .click-hint {
            font-size: 12px;  /* Increased from 10px */
            color: #aaa;
            margin-top: 4px;  /* Increased from 2px */
            font-style: italic;
        }
    `;

        // Inject mobile styles
        const mobileStyleSheet = document.createElement("style");
        mobileStyleSheet.type = "text/css";
        mobileStyleSheet.innerText = mobileStyles;
        document.head.appendChild(mobileStyleSheet);

        // Create overlay for mobile images
        const createMobileOverlay = (fimg, results) => {
            // Make sure the parent container has relative positioning
            const container = fimg.parentElement;
            if (!container.classList.contains('fimg-container')) {
                container.classList.add('fimg-container');
            }

            const overlay = document.createElement("div");
            overlay.classList.add("mobile-overlay");

            // Show domain, confidence, and click hint
            const topResult = results[0];
            overlay.innerHTML = `
            <div style="color:${topResult.color}; pointer-events: none;">
                ${topResult.domain} (${topResult.confidence}%)
            </div>
            <div class="click-hint" style="pointer-events: none;">Tap for more URLs</div>
        `;

            container.appendChild(overlay);

            // Show overlay with animation after a short delay
            setTimeout(() => {
                overlay.classList.add("visible");
            }, 100);

            return overlay;
        };

        // Create floating info panel that shows when tapping on overlay info
        const createInfoPanel = () => {
            const panel = document.createElement("div");
            panel.classList.add("mobile-info-panel");
            panel.innerHTML = `
            <button class="close-btn">×</button>
            <div id="panel-content"></div>
        `;
            document.body.appendChild(panel);

            // Close button functionality
            panel.querySelector('.close-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                panel.classList.remove('visible');
            });

            // Close when clicking outside
            document.addEventListener('click', (e) => {
                if (!panel.contains(e.target) && panel.classList.contains('visible')) {
                    panel.classList.remove('visible');
                }
            });

            return panel;
        };

        const infoPanel = createInfoPanel();

        // Add click handler to overlays to show detailed info
        const addOverlayClickHandler = (overlay, results) => {
            overlay.style.pointerEvents = 'all';
            overlay.style.cursor = 'pointer';

            overlay.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();

                const content = results.map((result, index) => `
                <div class="url-item">
                    <a href="${result.url}" target="_blank">
                        ${index + 1}. ${result.domain}
                    </a>
                    <div class="confidence" style="color:${result.color};">
                        ${result.confidence}% - ${result.rating}
                    </div>
                    <a href="${result.url}" target="_blank" style="font-size:12px;">
                        ${result.url}
                    </a>
                </div>
            `).join('');

                infoPanel.querySelector('#panel-content').innerHTML = content;
                infoPanel.classList.add('visible');
            });
        };

        // Process all mobile images
        const processMobileImages = () => {
            const fimgElements = document.querySelectorAll('[id^="fimg"]');

            fimgElements.forEach(fimg => {
                // Skip if already processed
                if (fimg.parentElement.querySelector('.mobile-overlay')) return;

                const results = extractUrls(fimg);
                if (results.length > 0) {
                    const overlay = createMobileOverlay(fimg, results);
                    addOverlayClickHandler(overlay, results);
                }
            });
        };

        // Start processing mobile images
        const mobileCheckInterval = setInterval(() => {
            if (isResultsPage() && document.querySelector('[id^="fimg"]')) {
                processMobileImages();
                // Continue checking for new images that might load dynamically
                setTimeout(() => {
                    processMobileImages();
                }, 2000);
            }
        }, 1000);
    } else {
        // DESKTOP FUNCTIONALITY

        // CSS Variables for easy theme management
        const desktopStyles = `
            :root {
                --popup-bg: ${theme === 'light' ? '#ffffff' : '#1e1e1e'};
                --popup-color: ${theme === 'light' ? '#007acc' : '#00ffff'};
                --popup-opacity: 0.95;
                --popup-border: 1px solid ${theme === 'light' ? 'rgba(0, 122, 204, 0.2)' : 'rgba(0, 255, 255, 0.2)'};
                --popup-shadow: 0 4px 12px ${theme === 'light' ? 'rgba(0, 0, 0, 0.1)' : 'rgba(0, 0, 0, 0.3)'};
                --popup-radius: 12px;
                --popup-padding: 16px;
                --popup-width: 320px;
                --popup-max-height: 400px;
                --popup-transition: opacity 0.3s ease, transform 0.3s ease;
            }
            .popup {
                position: fixed;
                background: var(--popup-bg);
                color: var(--popup-color);
                opacity: 0;
                border: var(--popup-border);
                box-shadow: var(--popup-shadow);
                border-radius: var(--popup-radius);
                padding: var(--popup-padding);
                width: var(--popup-width);
                max-height: var(--popup-max-height);
                overflow-y: auto;
                pointer-events: auto;
                transition: var(--popup-transition);
                transform: translateY(-10px);
                backdrop-filter: blur(10px);
                z-index: 9999;
            }
            .popup.visible {
                opacity: var(--popup-opacity);
                transform: translateY(0);
            }
            .popup ul {
                list-style: none;
                padding: 0;
                margin: 0;
            }
            .popup li {
                margin: 8px 0;
            }
            .popup a {
                color: var(--popup-color);
                text-decoration: none;
                transition: color 0.2s ease;
            }
            .popup a:hover {
                color: #ff6f61;
            }
        `;

        // Inject desktop styles
        const desktopStyleSheet = document.createElement("style");
        desktopStyleSheet.type = "text/css";
        desktopStyleSheet.innerText = desktopStyles;
        document.head.appendChild(desktopStyleSheet);

        // Create and style the popup window
        const createPopup = () => {
            const popup = document.createElement("div");
            popup.classList.add("popup");
            document.body.appendChild(popup);
            return popup;
        };

        // Function to display results in the popup window
        const displayResultsDesktop = (results, popup, fimg) => {
            const rect = fimg.getBoundingClientRect();
            popup.style.left = `${rect.right - 155}px`;
            popup.style.top = `${rect.top}px`;

            const resultsList = results.map(result => `
                <li>
                    <a href="${result.url}" target="_blank">
                        ${result.domain}
                    </a>
                    <span style="color:${result.color};">(${result.confidence}% - ${result.rating})</span>
                </li>
            `).join('');

            popup.innerHTML = `<ul>${resultsList}</ul>`;
            popup.classList.add('visible');
        };

        // Create the popup window
        const popup = createPopup();

        // Track which elements have listeners attached
        const processedFimgs = new WeakSet();
        let hoverTimeout;
        let isPopupHovered = false;

        // Add event listeners for all fimg elements
        const addHoverListeners = () => {
            const fimgElements = document.querySelectorAll('[id^="fimg"]');

            fimgElements.forEach(fimg => {
                if (processedFimgs.has(fimg)) return;
                processedFimgs.add(fimg);

                fimg.addEventListener('mouseenter', () => {
                    if (isPopupHovered) return;
                    clearTimeout(hoverTimeout);
                    const results = extractUrls(fimg);
                    if (results.length > 0) {
                        displayResultsDesktop(results, popup, fimg);
                    }
                });

                fimg.addEventListener('mouseleave', () => {
                    if (isPopupHovered) return;
                    hoverTimeout = setTimeout(() => {
                        popup.classList.remove('visible');
                    }, 300);
                });
            });

            // Event handler for the popup
            popup.addEventListener('mouseenter', () => {
                isPopupHovered = true;
                clearTimeout(hoverTimeout);
            });

            popup.addEventListener('mouseleave', () => {
                isPopupHovered = false;
                popup.classList.remove('visible');
            });
        };

        // Start adding event listeners after the page loads
        const desktopCheckInterval = setInterval(() => {
            if (isResultsPage() && document.querySelector('[id^="fimg"]')) {
                addHoverListeners();
            }
        }, 1000);
    }

})();
