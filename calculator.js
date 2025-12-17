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
        wipesPerCleaning: 1 // 1 cleaning wipe per screen
    }
};

// Cleaning frequency multipliers (times per year)
const FREQUENCY_MULTIPLIER = {
    yearly: 1,
    quarterly: 4,
    monthly: 12,
    weekly: 52
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
        });
    });

    // Quantity input
    document.getElementById('quantity').addEventListener('input', function() {
        state.quantity = parseInt(this.value) || 0;
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
            silentiaDisinfectant: silentiaDisinfectant.toFixed(0),
            silentiaWipes: silentiaWipes.toFixed(0),
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
            silentiaDisinfectant: silentiaDisinfectant.toFixed(0),
            silentiaWipes: silentiaWipes.toFixed(0),
            savedPlastic: plasticWaste.toFixed(0) // Silentia produces no plastic waste
        };
    }
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
        } else if (years < 1/12) {
            // Convert to weeks when less than 1 month
            const weeks = Math.round(years * 52);
            // If 4 or more weeks, show as months instead
            if (weeks >= 4) {
                const months = Math.round(years * 12);
                roiElement.textContent = months.toString();
                yearLabelElement.textContent = months === 1 ? 'MONTH' : 'MONTHS';
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

    if (resources.type === 'textile') {
        resourcesElement.innerHTML = `
            <div>
                <strong>Textile Curtains (Annual):</strong>
                <p>${resources.curtainKWh} kWh</p>
                <p>${resources.curtainWater} liters water</p>
            </div>
            <div>
                <strong>Silentia Screens (Annual):</strong>
                <p>${resources.silentiaDisinfectant} liters disinfectant</p>
                <p>${resources.silentiaWipes} cleaning wipes</p>
            </div>
            <div style="border-top: 2px solid #ddd; padding-top: 10px; margin-top: 15px;">
                <strong style="color: #00864a;">Annual Savings:</strong>
                <p style="color: #00864a; font-weight: bold;">${resources.savedKWh} kWh</p>
                <p style="color: #00864a; font-weight: bold;">${resources.savedWater} liters water</p>
            </div>
        `;
    } else {
        resourcesElement.innerHTML = `
            <div>
                <strong>Disposable Curtains (Annual):</strong>
                <p>${resources.plasticWaste} kg plastic waste</p>
            </div>
            <div>
                <strong>Silentia Screens (Annual):</strong>
                <p>${resources.silentiaDisinfectant} liters disinfectant</p>
                <p>${resources.silentiaWipes} cleaning wipes</p>
            </div>
            <div style="border-top: 2px solid #ddd; padding-top: 10px; margin-top: 15px;">
                <strong style="color: #00864a;">Annual Savings:</strong>
                <p style="color: #00864a; font-weight: bold;">${resources.savedPlastic} kg plastic waste eliminated</p>
            </div>
        `;
    }
}

// ============================================
// CALCULATE BUTTON HANDLER
// ============================================

function handleCalculate() {
    if (state.quantity <= 0) {
        alert('Please enter a valid number of curtains/screens');
        return;
    }

    displayResults();
}

// ============================================
// INITIALIZATION
// ============================================

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    initializeToggles();

    // Add calculate button listener
    document.querySelector('.calculate-btn').addEventListener('click', handleCalculate);

    // Optional: Calculate on Enter key in quantity input
    document.getElementById('quantity').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            handleCalculate();
        }
    });
});
