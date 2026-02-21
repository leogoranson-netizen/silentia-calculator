// ============================================
// STATE MANAGEMENT
// ============================================

// Application state
const state = {
    curtainType: 'textile', // 'textile' or 'disposable'
    cleaningFrequency: 'quarterly', // 'quarterly', 'monthly', 'weekly'
    quantity: 0
};

// Product lifespan
const SILENTIA_LIFESPAN_YEARS = 10; // Technical lifespan of Silentia screens

// Calculation constants (real cost data in euros)
const COSTS = {
    silentiaScreen: 1310, // Cost per Silentia screen (€1310)
    textileCurtain: 800, // Cost per textile curtain (€800)
    disposableCurtain: 700, // Cost per disposable curtain (€700)

    // Cleaning costs
    textileCleaning: 48, // Cost per textile curtain cleaning (6 kg × €8/kg = €48)
    disposableCleaning: 0, // Disposable gets replaced, not cleaned
    disposableReplacement: 700, // Cost to replace disposable (€700)
    silentiaCleaning: 5 // Low cleaning cost for Silentia screens
};

// Environmental impact constants
const ENVIRONMENTAL = {
    textile: {
        // 1 curtain = 6 kg × 18 MJ/kg = 108 MJ = 30 kWh per wash
        kWhPerCleaning: 30, // kWh per textile curtain wash
        // 1 curtain = 6 kg × 18 L/kg = 108 liters per wash
        waterPerCleaning: 108 // Liters per textile curtain wash
    },
    disposable: {
        // 1 disposable curtain = 2 kg polypropylene waste per replacement
        plasticPerUnit: 2 // kg of plastic waste per disposable curtain
    },
    silentia: {
        kWhPerCleaning: 0, // No energy used for Silentia cleaning
        waterPerCleaning: 0, // No water used for Silentia cleaning
        disinfectantPerCleaning: 0.02, // 0.02 liters disinfectant per screen
        wipesPerCleaning: 0.015 // 1 cleaning wipe per screen = 0.015 kg
    }
};

// Cleaning frequency multipliers (times per year)
const FREQUENCY_MULTIPLIER = {
    yearly: 1,
    quarterly: 4,
    monthly: 12,
    weekly: 52,
    daily: 365
};

// ============================================
// TOGGLE BUTTON HANDLERS
// ============================================

function initializeToggles() {
    // Curtain type toggles
    document.querySelectorAll('[data-type]').forEach(btn => {
        btn.addEventListener('click', function() {
            // Remove active from all type buttons
            document.querySelectorAll('[data-type]').forEach(b =>
                b.classList.remove('active'));
            // Add active to clicked button
            this.classList.add('active');
            // Update state
            state.curtainType = this.dataset.type;
            update();
        });
    });

    // Cleaning frequency toggles
    document.querySelectorAll('[data-frequency]').forEach(btn => {
        btn.addEventListener('click', function() {
            // Remove active from all frequency buttons
            document.querySelectorAll('[data-frequency]').forEach(b =>
                b.classList.remove('active'));
            // Add active to clicked button
            this.classList.add('active');
            // Update state
            state.cleaningFrequency = this.dataset.frequency;
            update();
        });
    });

    // Quantity input
    document.getElementById('quantity').addEventListener('input', function() {
        state.quantity = parseInt(this.value) || 0;
        update();
    });
}

// ============================================
// ROI CALCULATION
// ============================================

function calculateROI() {
    const qty = state.quantity;
    if (qty <= 0) {
        return { years: 0, valid: false };
    }

    const cleaningsPerYear = FREQUENCY_MULTIPLIER[state.cleaningFrequency];

    // Initial investment
    const silentiaInitial = qty * COSTS.silentiaScreen;
    const curtainInitial = qty * (state.curtainType === 'textile' ?
        COSTS.textileCurtain : COSTS.disposableCurtain);

    // Annual operating costs
    let silentiaAnnual = qty * COSTS.silentiaCleaning * cleaningsPerYear;
    let curtainAnnual;

    if (state.curtainType === 'textile') {
        curtainAnnual = qty * COSTS.textileCleaning * cleaningsPerYear;
    } else {
        // Disposable: replaced each cleaning
        curtainAnnual = qty * COSTS.disposableReplacement * cleaningsPerYear;
    }

    // Calculate break-even point
    // Total cost Silentia: silentiaInitial + silentiaAnnual × years
    // Total cost Curtain: curtainInitial + curtainAnnual × years
    // Break even when: silentiaInitial + silentiaAnnual × years = curtainInitial + curtainAnnual × years
    // Solving for years: years = (silentiaInitial - curtainInitial) / (curtainAnnual - silentiaAnnual)

    const initialDifference = silentiaInitial - curtainInitial;
    const annualSavings = curtainAnnual - silentiaAnnual;

    if (annualSavings <= 0) {
        // Silentia is more expensive to operate, no break-even
        return { years: 999, valid: false };
    }

    const breakEvenYears = initialDifference / annualSavings;

    return {
        years: Math.max(0, breakEvenYears), // Return raw number, not formatted
        valid: true,
        savings: annualSavings,
        initialDiff: initialDifference
    };
}

// ============================================
// ENVIRONMENTAL IMPACT CALCULATION
// ============================================

function calculateResources() {
    const qty = state.quantity;
    if (qty <= 0) {
        return null;
    }

    const cleaningsPerYear = FREQUENCY_MULTIPLIER[state.cleaningFrequency];

    if (state.curtainType === 'textile') {
        // Textile curtains: kWh and water
        const curtainKWh = qty * ENVIRONMENTAL.textile.kWhPerCleaning * cleaningsPerYear;
        const curtainWater = qty * ENVIRONMENTAL.textile.waterPerCleaning * cleaningsPerYear;

        const silentiaKWh = qty * ENVIRONMENTAL.silentia.kWhPerCleaning * cleaningsPerYear;
        const silentiaWater = qty * ENVIRONMENTAL.silentia.waterPerCleaning * cleaningsPerYear;
        const silentiaDisinfectant = qty * ENVIRONMENTAL.silentia.disinfectantPerCleaning * cleaningsPerYear;
        const silentiaWipes = qty * ENVIRONMENTAL.silentia.wipesPerCleaning * cleaningsPerYear;

        return {
            type: 'textile',
            curtainKWh: curtainKWh.toFixed(0),
            curtainWater: curtainWater.toFixed(0),
            silentiaKWh: silentiaKWh.toFixed(0),
            silentiaWater: silentiaWater.toFixed(0),
            silentiaDisinfectant: parseFloat(silentiaDisinfectant.toFixed(2)),
            silentiaWipes: parseFloat(silentiaWipes.toFixed(2)),
            savedKWh: (curtainKWh - silentiaKWh).toFixed(0),
            savedWater: (curtainWater - silentiaWater).toFixed(0)
        };
    } else {
        // Disposable curtains: plastic waste
        const plasticWaste = qty * ENVIRONMENTAL.disposable.plasticPerUnit * cleaningsPerYear;
        const silentiaDisinfectant = qty * ENVIRONMENTAL.silentia.disinfectantPerCleaning * cleaningsPerYear;
        const silentiaWipes = qty * ENVIRONMENTAL.silentia.wipesPerCleaning * cleaningsPerYear;

        return {
            type: 'disposable',
            plasticWaste: plasticWaste.toFixed(0),
            silentiaDisinfectant: parseFloat(silentiaDisinfectant.toFixed(2)),
            silentiaWipes: parseFloat(silentiaWipes.toFixed(2)),
            savedPlastic: plasticWaste.toFixed(0) // Silentia produces no plastic waste
        };
    }
}

// ============================================
// CHART DISPLAY FUNCTION
// ============================================

function displayChart() {
    const qty = state.quantity;
    const chartElement = document.getElementById('chart-output');

    if (qty <= 0) {
        chartElement.innerHTML = '<p>Enter quantity and click Calculate to see chart</p>';
        return;
    }

    const cleaningsPerYear = FREQUENCY_MULTIPLIER[state.cleaningFrequency];
    const curtainTypeName = state.curtainType === 'textile' ? 'Textile' : 'Disposable';

    // Calculate costs
    const silentiaInitial = qty * COSTS.silentiaScreen;
    const curtainInitial = qty * (state.curtainType === 'textile' ? COSTS.textileCurtain : COSTS.disposableCurtain);

    const silentiaAnnual = qty * COSTS.silentiaCleaning * cleaningsPerYear;
    let curtainAnnual;
    if (state.curtainType === 'textile') {
        curtainAnnual = qty * COSTS.textileCleaning * cleaningsPerYear;
    } else {
        curtainAnnual = qty * COSTS.disposableReplacement * cleaningsPerYear;
    }

    // 10-year total cost
    const silentiaTotal = silentiaInitial + (silentiaAnnual * SILENTIA_LIFESPAN_YEARS);
    const curtainTotal = curtainInitial + (curtainAnnual * SILENTIA_LIFESPAN_YEARS);

    // Format currency
    const formatCurrency = (value) => '€' + value.toLocaleString('en-US');

    // Create chart bars
    const createBarRow = (label, silentiaValue, curtainValue) => {
        const maxValue = Math.max(silentiaValue, curtainValue);
        const silentiaWidth = maxValue > 0 ? (silentiaValue / maxValue) * 100 : 0;
        const curtainWidth = maxValue > 0 ? (curtainValue / maxValue) * 100 : 0;

        return `
            <div class="chart-bar-row">
                <span class="chart-bar-label">Silentia</span>
                <div class="chart-bar-wrapper">
                    <div class="chart-bar silentia" style="width: ${silentiaWidth}%"></div>
                </div>
                <span class="chart-bar-value">${formatCurrency(silentiaValue)}</span>
            </div>
            <div class="chart-bar-row">
                <span class="chart-bar-label">${curtainTypeName}</span>
                <div class="chart-bar-wrapper">
                    <div class="chart-bar curtain" style="width: ${curtainWidth}%"></div>
                </div>
                <span class="chart-bar-value">${formatCurrency(curtainValue)}</span>
            </div>
        `;
    };

    chartElement.innerHTML = `
        <div class="chart-section">
            <div class="chart-section-title">Initial Investment</div>
            ${createBarRow('Initial', silentiaInitial, curtainInitial)}
        </div>
        <div class="chart-section">
            <div class="chart-section-title">Annual Operating Cost</div>
            ${createBarRow('Annual', silentiaAnnual, curtainAnnual)}
        </div>
        <div class="chart-section">
            <div class="chart-section-title">10-Year Total Cost</div>
            ${createBarRow('Total', silentiaTotal, curtainTotal)}
        </div>
        <div class="chart-legend">
            <div class="chart-legend-item">
                <div class="chart-legend-color silentia"></div>
                <span>Silentia</span>
            </div>
            <div class="chart-legend-item">
                <div class="chart-legend-color curtain"></div>
                <span>${curtainTypeName} Curtain</span>
            </div>
        </div>
    `;
}

// ============================================
// DISPLAY UPDATE FUNCTIONS
// ============================================

function displayResults() {
    const roi = calculateROI();
    const resources = calculateResources();

    // Update ROI display
    const roiElement = document.getElementById('roi-years');
    const yearLabelElement = document.querySelector('.label');

    if (roi.valid && roi.years !== 999) {
        const years = roi.years;
        if (years > SILENTIA_LIFESPAN_YEARS) {
            roiElement.textContent = '10+';
            yearLabelElement.textContent = 'YEARS';
        } else if (years < 1/52) {
            // Convert to days when less than 1 week
            const days = Math.round(years * 365);
            roiElement.textContent = Math.max(1, days).toString();
            yearLabelElement.textContent = days === 1 ? 'DAY' : 'DAYS';
        } else if (years < 1/12) {
            // Convert to weeks when less than 1 month
            const weeks = Math.round(years * 52);
            // If 4 or more weeks, show as months instead
            if (weeks >= 4) {
                const months = Math.round(years * 12);
                roiElement.textContent = months.toString();
                yearLabelElement.textContent = months === 1 ? 'MONTH' : 'MONTHS';
            } else if (weeks < 1) {
                const days = Math.round(years * 365);
                roiElement.textContent = Math.max(1, days).toString();
                yearLabelElement.textContent = days === 1 ? 'DAY' : 'DAYS';
            } else {
                roiElement.textContent = weeks.toString();
                yearLabelElement.textContent = weeks === 1 ? 'WEEK' : 'WEEKS';
            }
        } else if (years < 1) {
            // Convert to months when less than 1 year
            const months = Math.round(years * 12);
            // If it rounds to 12 months, show as 1 year instead
            if (months >= 12) {
                roiElement.textContent = '1';
                yearLabelElement.textContent = 'YEAR';
            } else {
                roiElement.textContent = months.toString();
                yearLabelElement.textContent = months === 1 ? 'MONTH' : 'MONTHS';
            }
        } else {
            // Display years - remove decimal if whole number
            const roundedYears = Math.round(years * 10) / 10; // Round to 1 decimal place
            if (Math.abs(roundedYears - Math.round(roundedYears)) < 0.01) {
                // It's essentially a whole number
                roiElement.textContent = Math.round(roundedYears).toString();
            } else {
                roiElement.textContent = roundedYears.toFixed(1);
            }
            // Update label: "YEAR" if 1 or less, "YEARS" if more than 1
            yearLabelElement.textContent = roundedYears > 1 ? 'YEARS' : 'YEAR';
        }
    } else if (roi.years === 999) {
        roiElement.textContent = 'N/A';
        yearLabelElement.textContent = 'YEARS';
    } else {
        roiElement.textContent = '--';
        yearLabelElement.textContent = 'YEAR';
    }

    // Update Resources display
    const resourcesElement = document.getElementById('resources-output');

    if (!resources) {
        resourcesElement.innerHTML = '<p>Enter quantity to calculate</p>';
        return;
    }

    const curtainTypeName = state.curtainType === 'textile' ? 'Textile' : 'Disposable';

    let chartHTML = '';

    if (resources.type === 'textile') {
        const curtainTotal = Number(resources.curtainKWh) + Number(resources.curtainWater);
        const silentiaTotal = Number(resources.silentiaDisinfectant) + Number(resources.silentiaWipes);
        const maxTotal = Math.max(curtainTotal, silentiaTotal);

        // Bar widths scaled relative to each other
        const curtainBarWidth = maxTotal > 0 ? (curtainTotal / maxTotal) * 100 : 0;
        const silentiaBarWidth = maxTotal > 0 ? (silentiaTotal / maxTotal) * 100 : 0;

        // Segment percentages within each bar
        const curtainEnergyPct = curtainTotal > 0 ? (Number(resources.curtainKWh) / curtainTotal) * 100 : 0;
        const curtainWaterPct = curtainTotal > 0 ? (Number(resources.curtainWater) / curtainTotal) * 100 : 0;
        const silentiaDisinfPct = silentiaTotal > 0 ? (Number(resources.silentiaDisinfectant) / silentiaTotal) * 100 : 0;
        const silentiaWipesPct = silentiaTotal > 0 ? (Number(resources.silentiaWipes) / silentiaTotal) * 100 : 0;

        chartHTML = `
            <div class="stacked-bar-section">
                <div class="stacked-bar-details">
                    <span class="stacked-bar-label">${curtainTypeName}:</span>
                    <span class="seg-detail"><span class="seg-dot seg-energy"></span>${resources.curtainKWh} <span class="unit-label">kWh</span></span>
                    <span class="seg-detail"><span class="seg-dot seg-water"></span>${resources.curtainWater} <span class="unit-label">L waste water</span></span>
                </div>
                <div class="stacked-bar-row">
                    <div class="stacked-bar-track">
                        <div class="stacked-bar-wrapper" style="width: ${curtainBarWidth}%">
                            <div class="stacked-segment seg-energy" style="width: ${curtainEnergyPct}%"></div>
                            <div class="stacked-segment seg-water" style="width: ${curtainWaterPct}%"></div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="stacked-bar-section">
                <div class="stacked-bar-details">
                    <span class="stacked-bar-label">Silentia:</span>
                    <span class="seg-detail"><span class="seg-dot seg-wipes"></span>${resources.silentiaWipes} <span class="unit-label">kg wipes</span></span>
                    <span class="seg-detail"><span class="seg-dot seg-disinfectant"></span>${resources.silentiaDisinfectant} <span class="unit-label">L disinfectant</span></span>
                </div>
                <div class="stacked-bar-row">
                    <div class="stacked-bar-track">
                        <div class="stacked-bar-wrapper" style="width: ${silentiaBarWidth}%">
                            <div class="stacked-segment seg-wipes" style="width: ${silentiaWipesPct}%"></div>
                            <div class="stacked-segment seg-disinfectant" style="width: ${silentiaDisinfPct}%"></div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    } else {
        const curtainTotal = Number(resources.plasticWaste);
        const silentiaTotal = Number(resources.silentiaDisinfectant) + Number(resources.silentiaWipes);
        const maxTotal = Math.max(curtainTotal, silentiaTotal);

        const curtainBarWidth = maxTotal > 0 ? (curtainTotal / maxTotal) * 100 : 0;
        const silentiaBarWidth = maxTotal > 0 ? (silentiaTotal / maxTotal) * 100 : 0;

        const silentiaDisinfPct = silentiaTotal > 0 ? (Number(resources.silentiaDisinfectant) / silentiaTotal) * 100 : 0;
        const silentiaWipesPct = silentiaTotal > 0 ? (Number(resources.silentiaWipes) / silentiaTotal) * 100 : 0;

        chartHTML = `
            <div class="stacked-bar-section">
                <div class="stacked-bar-details">
                    <span class="stacked-bar-label">${curtainTypeName}:</span>
                    <span class="seg-detail"><span class="seg-dot seg-plastic"></span>${resources.plasticWaste} <span class="unit-label">kg plastic</span></span>
                </div>
                <div class="stacked-bar-row">
                    <div class="stacked-bar-track">
                        <div class="stacked-bar-wrapper" style="width: ${curtainBarWidth}%">
                            <div class="stacked-segment seg-plastic" style="width: 100%"></div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="stacked-bar-section">
                <div class="stacked-bar-details">
                    <span class="stacked-bar-label">Silentia:</span>
                    <span class="seg-detail"><span class="seg-dot seg-wipes"></span>${resources.silentiaWipes} <span class="unit-label">kg wipes</span></span>
                    <span class="seg-detail"><span class="seg-dot seg-disinfectant"></span>${resources.silentiaDisinfectant} <span class="unit-label">L disinfectant</span></span>
                </div>
                <div class="stacked-bar-row">
                    <div class="stacked-bar-track">
                        <div class="stacked-bar-wrapper" style="width: ${silentiaBarWidth}%">
                            <div class="stacked-segment seg-wipes" style="width: ${silentiaWipesPct}%"></div>
                            <div class="stacked-segment seg-disinfectant" style="width: ${silentiaDisinfPct}%"></div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    resourcesElement.innerHTML = chartHTML;
}

// ============================================
// LIVE UPDATE
// ============================================

function update() {
    if (state.quantity > 0) {
        displayResults();
        displayChart();
    }
}

// ============================================
// INITIALIZATION
// ============================================

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    // Detect macOS Safari — it renders Myriad Pro wider than Chrome
    var ua = navigator.userAgent;
    var isSafari = ua.indexOf('Safari') !== -1 && ua.indexOf('Chrome') === -1;
    var isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    if (isSafari && isMac) {
        document.documentElement.classList.add('mac-safari');
    }

    initializeToggles();

    // Info popup handlers
    document.querySelectorAll('.info-icon').forEach(icon => {
        icon.addEventListener('click', function(e) {
            e.stopPropagation();
            const popupId = this.dataset.popup;
            const popup = document.getElementById(popupId);
            // Close all other popups
            document.querySelectorAll('.info-popup').forEach(p => {
                if (p !== popup) p.classList.remove('active');
            });
            popup.classList.toggle('active');
        });
    });

    // Close popups when clicking outside
    document.addEventListener('click', function() {
        document.querySelectorAll('.info-popup').forEach(p => p.classList.remove('active'));
    });

});
