// ============================================
// STATE MANAGEMENT
// ============================================

// Application state
const state = {
    curtainType: 'textile', // 'textile' or 'disposable'
    cleaningFrequency: 'quarterly', // 'quarterly', 'monthly', 'weekly'
    quantity: 0,
    units: 'metric' // 'metric' or 'imperial'
};

// Unit conversion factors
const CONVERSIONS = {
    litersToGallons: 0.264172,
    kgToLbs: 2.20462
};

// Product lifespan
const SILENTIA_LIFESPAN_YEARS = 10; // Technical lifespan of Silentia screens

// Calculation constants (real cost data in euros, +15% inflation 2020-2026 applied)
// Shared labour rate — all cleaning/changeover time is priced at this €/hour.
const CLEANING_RATE_PER_HOUR = 45;

const COSTS = {
    silentia: {
        product: 1360,              // Cost per Silentia screen
        installation: 60,           // Labour for initial install (one-time)
        replace: 1300,              // Replacement cost after product life
        cleaningMinutes: 5,         // Minutes per cleaning event (quick wipe)
        adminPerYear: 20,           // Admin cost added at end of each full year
        productLifeYears: 10
    },
    textile: {
        product: 305,               // Rails + curtain (one-time setup material)
        installation: 60,           // Labour for initial install (one-time)
        replace: 150,               // New textile curtain cost (each 5-year cycle)
        operationMinutes: 20,       // Minutes per take-down/wash/put-up step (×3 per cycle)
        washFee: 46,                // Laundry fee per wash cycle
        adminPerYear: 80,           // Admin cost added at end of each full year
        productLifeYears: 5
    },
    disposable: {
        product: 150,               // Rails (one-time setup material)
        installation: 60,           // Labour for initial install (one-time)
        replace: 15,                // Cost per new disposable curtain (each change)
        operationMinutes: 20,       // Minutes per take-down/install step (×3 per change)
        adminPerYear: 80            // Admin cost added at end of each full year
    }
};

// Environmental impact constants
const ENVIRONMENTAL = {
    textile: {
        // 1 curtain = 4 kg × 5 kWh/kg = 20 kWh per wash
        kWhPerCleaning: 20, // kWh per textile curtain wash
        // 1 curtain = 4 kg × 18 L/kg = 72 liters per wash
        waterPerCleaning: 72 // Liters per textile curtain wash
    },
    disposable: {
        // 1 disposable curtain = 1.2 kg polypropylene or polyester waste per replacement
        plasticPerUnit: 1.2 // kg of plastic waste per disposable curtain
    },
    silentia: {
        kWhPerCleaning: 0, // No energy used for Silentia cleaning
        waterPerCleaning: 0, // No water used for Silentia cleaning
        disinfectantPerCleaning: 0.01, // 0.01 liters disinfectant per screen
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

    // Unit system toggles
    document.querySelectorAll('[data-units]').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('[data-units]').forEach(b =>
                b.classList.remove('active'));
            this.classList.add('active');
            state.units = this.dataset.units;
            update();
        });
    });

    // Quantity input
    const quantityInput = document.getElementById('quantity');
    quantityInput.addEventListener('input', function() {
        const val = parseInt(this.value);
        if (!val || val <= 0) {
            this.value = '';
            state.quantity = 0;
        } else {
            state.quantity = val;
        }
        update();
    });

    // Plus / minus buttons
    document.getElementById('qtyPlus').addEventListener('click', function() {
        const cur = parseInt(quantityInput.value) || 0;
        quantityInput.value = cur + 1;
        state.quantity = cur + 1;
        update();
    });

    document.getElementById('qtyMinus').addEventListener('click', function() {
        const cur = parseInt(quantityInput.value) || 0;
        if (cur > 1) {
            quantityInput.value = cur - 1;
            state.quantity = cur - 1;
        } else {
            quantityInput.value = '';
            state.quantity = 0;
        }
        update();
    });
}

// ============================================
// ROI CALCULATION
// ============================================

// Per-event labour cost helper: minutes × hourly rate.
function labourCost(minutes) {
    return (minutes / 60) * CLEANING_RATE_PER_HOUR;
}

// Cost per single cleaning/change event for each option.
// Silentia: 5 min wipe × €45/hr = €3.75
// Textile:  3 × 20 min labour + €46 wash fee = €45 + €46 = €91
// Disposable: €15 new curtain + 3 × 20 min labour = €15 + €45 = €60
function perEventCost(option) {
    if (option === 'silentia') {
        return labourCost(COSTS.silentia.cleaningMinutes);
    }
    if (option === 'textile') {
        return labourCost(3 * COSTS.textile.operationMinutes) + COSTS.textile.washFee;
    }
    // disposable
    return COSTS.disposable.replace + labourCost(3 * COSTS.disposable.operationMinutes);
}

// Count replacements that have occurred by `year`, excluding one that lands exactly
// at year-end (end-of-lifespan = decommissioning, not a fresh replacement).
function replacementsByYear(year, lifespanYears) {
    if (year <= 0) return 0;
    return Math.floor((year - 0.0001) / lifespanYears);
}

// Admin accrues at the end of each full year: 0 before year 1, adminPerYear × floor(year).
function adminCostAtYear(qty, year, perYear) {
    return qty * perYear * Math.max(0, Math.floor(year));
}

// Cumulative Silentia cost at a given year.
// Initial + cleaning × years + €1300 per in-period replacement (none within the first 10 yrs) + admin.
function silentiaCostAtYear(qty, year, cleaningsPerYear) {
    const s = COSTS.silentia;
    const initial = qty * (s.product + s.installation);
    const cleaning = qty * perEventCost('silentia') * cleaningsPerYear * year;
    const replacementCost = qty * s.replace * replacementsByYear(year, s.productLifeYears);
    const admin = adminCostAtYear(qty, year, s.adminPerYear);
    return initial + cleaning + replacementCost + admin;
}

// Cumulative curtain cost at a given year (textile has 5-year replacement jumps).
function curtainCostAtYear(qty, type, year, cleaningsPerYear) {
    if (type === 'textile') {
        const t = COSTS.textile;
        const initial = qty * (t.product + t.installation);
        const cleaning = qty * perEventCost('textile') * cleaningsPerYear * year;
        const replacementCost = qty * t.replace * replacementsByYear(year, t.productLifeYears);
        const admin = adminCostAtYear(qty, year, t.adminPerYear);
        return initial + cleaning + replacementCost + admin;
    } else {
        const d = COSTS.disposable;
        const initial = qty * (d.product + d.installation);
        const cleaning = qty * perEventCost('disposable') * cleaningsPerYear * year;
        const admin = adminCostAtYear(qty, year, d.adminPerYear);
        return initial + cleaning + admin;
    }
}

function calculateROI() {
    const qty = state.quantity;
    if (qty <= 0) {
        return { years: 0, valid: false };
    }

    const cleaningsPerYear = FREQUENCY_MULTIPLIER[state.cleaningFrequency];

    // If curtain is already cheaper day 1 (before any operating costs accrue),
    // Silentia never pays back.
    const sInit = silentiaCostAtYear(qty, 0, cleaningsPerYear);
    const cInit = curtainCostAtYear(qty, state.curtainType, 0, cleaningsPerYear);

    if (cInit >= sInit) {
        // Curtain already more expensive up front → Silentia wins immediately.
        return { years: 0, valid: true };
    }

    // Iterate to find first year where Silentia total ≤ curtain total.
    // Step small enough that 5-year textile replacement jumps don't make us skip
    // the crossing point.
    const maxYears = 50;
    const step = 0.05;
    for (let y = step; y <= maxYears; y += step) {
        const s = silentiaCostAtYear(qty, y, cleaningsPerYear);
        const c = curtainCostAtYear(qty, state.curtainType, y, cleaningsPerYear);
        if (s <= c) {
            return { years: y, valid: true };
        }
    }

    return { years: 999, valid: false };
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

    // Initial investment (year 0)
    const silentiaInitial = silentiaCostAtYear(qty, 0, cleaningsPerYear);
    const curtainInitial = curtainCostAtYear(qty, state.curtainType, 0, cleaningsPerYear);

    // Full lifespan totals (includes textile 5-year replacements for the curtain side)
    const silentiaTotal = silentiaCostAtYear(qty, SILENTIA_LIFESPAN_YEARS, cleaningsPerYear);
    const curtainTotal = curtainCostAtYear(qty, state.curtainType, SILENTIA_LIFESPAN_YEARS, cleaningsPerYear);

    // Average annual = (total - initial) / lifespan. For textile this amortizes the
    // 5-year replacement into the annual bar; the total bar still shows the true sum.
    const silentiaAnnual = (silentiaTotal - silentiaInitial) / SILENTIA_LIFESPAN_YEARS;
    const curtainAnnual = (curtainTotal - curtainInitial) / SILENTIA_LIFESPAN_YEARS;

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
        if (years < 1/52) {
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
            // Display years as a whole integer (no decimals)
            const wholeYears = Math.round(years);
            roiElement.textContent = wholeYears.toString();
            yearLabelElement.textContent = wholeYears === 1 ? 'YEAR' : 'YEARS';
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

    // Unit conversion helpers
    const imperial = state.units === 'imperial';
    const convertVolume = (liters) => imperial ? liters * CONVERSIONS.litersToGallons : liters;
    const convertWeight = (kg) => imperial ? kg * CONVERSIONS.kgToLbs : kg;
    const volUnit = imperial ? 'gal' : 'L';
    const weightUnit = imperial ? 'lbs' : 'kg';

    // Silentia-only display format: tiers based on value magnitude.
    //   > 0.9      → whole number, no decimal (e.g. 1)
    //   > 0.09     → one decimal (e.g. 0.1)
    //   otherwise  → two decimals (preserves small values like 0.04)
    const fmtSilentia = (v) => {
        const n = Number(v);
        if (n > 0.9) return Math.round(n).toString();
        if (n > 0.09) return n.toFixed(1);
        return n.toFixed(2);
    };

    // Silentia bar always uses imperial textile reference scale so it looks
    // the same regardless of textile/disposable selection.
    const cleaningsPerYear = FREQUENCY_MULTIPLIER[state.cleaningFrequency];
    const qty = state.quantity;
    const silentiaDisinfImperial = qty * ENVIRONMENTAL.silentia.disinfectantPerCleaning * cleaningsPerYear * CONVERSIONS.litersToGallons;
    const silentiaWipesImperial = qty * ENVIRONMENTAL.silentia.wipesPerCleaning * cleaningsPerYear * CONVERSIONS.kgToLbs;
    const silentiaTotalRef = silentiaDisinfImperial + silentiaWipesImperial;
    const textileKWhRef = qty * ENVIRONMENTAL.textile.kWhPerCleaning * cleaningsPerYear;
    const textileWaterRef = qty * ENVIRONMENTAL.textile.waterPerCleaning * cleaningsPerYear * CONVERSIONS.litersToGallons;
    const textileCurtainRef = textileKWhRef + textileWaterRef;
    const silentiaMaxRef = Math.max(textileCurtainRef, silentiaTotalRef);
    const silentiaBarWidth = silentiaMaxRef > 0 ? (silentiaTotalRef / silentiaMaxRef) * 100 : 0;
    const silentiaDisinfPct = silentiaTotalRef > 0 ? (silentiaDisinfImperial / silentiaTotalRef) * 100 : 0;
    const silentiaWipesPct = silentiaTotalRef > 0 ? (silentiaWipesImperial / silentiaTotalRef) * 100 : 0;

    let chartHTML = '';

    if (resources.type === 'textile') {
        // Display values (converted to imperial if needed)
        const curtainWaterDisplay = parseFloat(convertVolume(Number(resources.curtainWater)).toFixed(0));
        const silentiaDisinfDisplay = parseFloat(convertVolume(resources.silentiaDisinfectant).toFixed(2));
        const silentiaWipesDisplay = parseFloat(convertWeight(resources.silentiaWipes).toFixed(2));

        // Bar widths always use imperial values so proportions stay constant
        const rawCurtainKWh = Number(resources.curtainKWh);
        const rawCurtainWater = Number(resources.curtainWater) * CONVERSIONS.litersToGallons;

        const curtainTotal = rawCurtainKWh + rawCurtainWater;
        const maxTotal = Math.max(curtainTotal, silentiaTotalRef);

        // Curtain bar scaled against its own max
        const curtainBarWidth = maxTotal > 0 ? (curtainTotal / maxTotal) * 100 : 0;

        // Curtain segment percentages
        const curtainEnergyPct = curtainTotal > 0 ? (rawCurtainKWh / curtainTotal) * 100 : 0;
        const curtainWaterPct = curtainTotal > 0 ? (rawCurtainWater / curtainTotal) * 100 : 0;

        chartHTML = `
            <div class="stacked-bar-section">
                <div class="stacked-bar-details">
                    <span class="stacked-bar-label">${curtainTypeName}:</span>
                    <span class="seg-detail"><span class="seg-dot seg-energy"></span>${resources.curtainKWh} <span class="unit-label">kWh</span></span>
                    <span class="seg-detail"><span class="seg-dot seg-water"></span>${curtainWaterDisplay} <span class="unit-label">${volUnit} waste water</span></span>
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
                    <span class="seg-detail"><span class="seg-dot seg-wipes"></span>${fmtSilentia(silentiaWipesDisplay)} <span class="unit-label">${weightUnit} wipes</span></span>
                    <span class="seg-detail"><span class="seg-dot seg-disinfectant"></span>${fmtSilentia(silentiaDisinfDisplay)} <span class="unit-label">${volUnit} disinfectant</span></span>
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
        // Display values (converted to imperial if needed)
        const plasticDisplay = parseFloat(convertWeight(Number(resources.plasticWaste)).toFixed(0));
        const silentiaDisinfDisplay = parseFloat(convertVolume(resources.silentiaDisinfectant).toFixed(2));
        const silentiaWipesDisplay = parseFloat(convertWeight(resources.silentiaWipes).toFixed(2));

        // Curtain bar uses its own scale
        const rawPlastic = Number(resources.plasticWaste) * CONVERSIONS.kgToLbs;
        const curtainBarWidth = rawPlastic > 0 ? 100 : 0;

        chartHTML = `
            <div class="stacked-bar-section">
                <div class="stacked-bar-details">
                    <span class="stacked-bar-label">${curtainTypeName}:</span>
                    <span class="seg-detail"><span class="seg-dot seg-plastic"></span>${plasticDisplay} <span class="unit-label">${weightUnit} plastic</span></span>
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
                    <span class="seg-detail"><span class="seg-dot seg-wipes"></span>${fmtSilentia(silentiaWipesDisplay)} <span class="unit-label">${weightUnit} wipes</span></span>
                    <span class="seg-detail"><span class="seg-dot seg-disinfectant"></span>${fmtSilentia(silentiaDisinfDisplay)} <span class="unit-label">${volUnit} disinfectant</span></span>
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
    displayResults();
    displayChart();
}

// ============================================
// INITIALIZATION
// ============================================

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
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
