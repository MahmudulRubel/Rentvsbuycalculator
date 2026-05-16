document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const inputs = [
        'homePrice', 'downPayment', 'mortgageRate', 'loanTerm', 
        'propertyTax', 'hoaFees', 'homeInsurance', 'monthlyRent', 
        'renterInsurance', 'homeAppreciation', 'rentIncrease', 
        'investmentReturn', 'timeHorizon'
    ];

    const elements = {};
    inputs.forEach(id => {
        elements[id] = document.getElementById(id);
        const valSpan = document.getElementById(id + 'Val');
        if (valSpan) {
            elements[id].addEventListener('input', () => {
                valSpan.textContent = elements[id].value;
                calculate();
            });
        } else {
            elements[id].addEventListener('input', calculate);
        }
    });

    const monthlyMortgageResult = document.getElementById('monthlyMortgageResult');
    const monthlyRentResult = document.getElementById('monthlyRentResult');
    const breakevenResult = document.getElementById('breakevenResult');
    const savingsResult = document.getElementById('savingsResult');
    const savingsLabel = document.getElementById('savingsLabel');
    const verdictBanner = document.getElementById('verdictBanner');
    const verdictText = document.getElementById('verdictText');
    const tableBody = document.getElementById('tableBody');

    let costChart = null;

    function formatCurrency(val) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            maximumFractionDigits: 0
        }).format(val);
    }

    function calculate() {
        // Values from inputs
        const homePrice = parseFloat(elements.homePrice.value) || 0;
        const downPayment = parseFloat(elements.downPayment.value) || 0;
        const mortgageRate = (parseFloat(elements.mortgageRate.value) || 0) / 100 / 12;
        const loanTerm = (parseFloat(elements.loanTerm.value) || 30) * 12;
        const propertyTaxRate = (parseFloat(elements.propertyTax.value) || 0) / 100;
        const hoaFees = parseFloat(elements.hoaFees.value) || 0;
        const homeInsurance = parseFloat(elements.homeInsurance.value) || 0;
        
        const monthlyRent = parseFloat(elements.monthlyRent.value) || 0;
        const renterInsurance = parseFloat(elements.renterInsurance.value) || 0;

        const homeAppreciation = (parseFloat(elements.homeAppreciation.value) || 0) / 100;
        const rentIncrease = (parseFloat(elements.rentIncrease.value) || 0) / 100;
        const investmentReturn = (parseFloat(elements.investmentReturn.value) || 0) / 100;
        const horizonYears = parseInt(elements.timeHorizon.value) || 10;

        // 1. Monthly Mortgage Payment
        const loanAmount = homePrice - downPayment;
        let monthlyPI = 0;
        if (mortgageRate > 0) {
            monthlyPI = loanAmount * (mortgageRate * Math.pow(1 + mortgageRate, loanTerm)) / (Math.pow(1 + mortgageRate, loanTerm) - 1);
        } else {
            monthlyPI = loanAmount / loanTerm;
        }

        const initialMonthlyBuyCost = monthlyPI + (homePrice * propertyTaxRate / 12) + hoaFees + homeInsurance + (homePrice * 0.01 / 12);
        const initialMonthlyRentCost = monthlyRent + renterInsurance;

        monthlyMortgageResult.textContent = formatCurrency(initialMonthlyBuyCost);
        monthlyRentResult.textContent = formatCurrency(initialMonthlyRentCost);

        // Year-by-year tracking
        let cumulativeBuyCost = homePrice * 0.03; // Starting with 3% closing costs
        let cumulativeRentCost = 0;
        let currentHomeValue = homePrice;
        let currentLoanBalance = loanAmount;
        let currentRent = monthlyRent;
        let investedDownPayment = downPayment;

        const chartLabels = [];
        const buyData = [];
        const rentData = [];
        let tableHTML = '';
        let breakevenYear = null;

        for (let year = 1; year <= 30; year++) {
            let annualInterest = 0;
            let annualPrincipal = 0;

            // Monthly breakdown for this year
            for (let month = 1; month <= 12; month++) {
                // Buying costs
                const interestPayment = currentLoanBalance * mortgageRate;
                const principalPayment = Math.min(monthlyPI - interestPayment, currentLoanBalance);
                
                annualInterest += interestPayment;
                annualPrincipal += principalPayment;
                currentLoanBalance -= principalPayment;

                cumulativeBuyCost += monthlyPI + (currentHomeValue * propertyTaxRate / 12) + hoaFees + homeInsurance + (currentHomeValue * 0.01 / 12);

                // Renting costs
                cumulativeRentCost += currentRent + renterInsurance;
            }

            // End of year adjustments
            currentHomeValue *= (1 + homeAppreciation);
            currentRent *= (1 + rentIncrease);
            investedDownPayment *= (1 + investmentReturn);

            // Opportunity cost of buying: Invested down payment if we had rented instead
            // Net worth comparison as per prompt
            const buyingNetWorth = currentHomeValue - currentLoanBalance;
            const rentingNetWorth = investedDownPayment;

            // Prompt asks for: "breakeven year — the year buying becomes cheaper than renting"
            // Cheaper here usually means (Buy Costs - Equity) < (Rent Costs + Opportunity Cost)
            // Which is equivalent to (Cumulative Buy Cost - BuyingNetWorth) < (Cumulative Rent Cost)
            // Wait, "cheaper" could be simpler: Cumulative Buy Cash Out vs Cumulative Rent Cash Out + Opportunity Cost
            
            // Let's use the net worth comparison for breakeven as it's more accurate for real estate
            // Buy cost effectively is: Cash Out - Equity
            // Rent cost effectively is: Cash Out + (Down Payment * Return)
            
            const netBuyingCost = cumulativeBuyCost - (currentHomeValue - loanAmount - annualPrincipal); // Simplification
            // Actually, let's just track Net Worth Difference
            const netWorthDiff = buyingNetWorth - rentingNetWorth;

            if (breakevenYear === null && buyingNetWorth > rentingNetWorth + (cumulativeBuyCost - cumulativeRentCost)) {
                 // This is a complex way. Let's use a standard one:
                 // Buying is cheaper if (Cumulative Buy Costs - Equity) < (Cumulative Rent Costs)
            }
            
            // Simpler breakeven: when Net Worth of Buyer > Net Worth of Renter
            if (breakevenYear === null && buyingNetWorth - cumulativeBuyCost > rentingNetWorth - cumulativeRentCost) {
                breakevenYear = year;
            }

            if (year <= horizonYears) {
                chartLabels.push(`Year ${year}`);
                buyData.push(Math.round(cumulativeBuyCost - (currentHomeValue - loanAmount))); // Approximating "net" cost
                // Re-think: Prompt asks for "dual-line chart showing cumulative buying cost vs cumulative renting cost"
                buyData[buyData.length-1] = Math.round(cumulativeBuyCost);
                rentData.push(Math.round(cumulativeRentCost + (investedDownPayment - downPayment))); // Rent cost + lost gains
                
                tableHTML += `
                    <tr>
                        <td>${year}</td>
                        <td>${formatCurrency(currentHomeValue)}</td>
                        <td>${formatCurrency(currentLoanBalance)}</td>
                        <td>${formatCurrency(currentHomeValue - currentLoanBalance)}</td>
                        <td>${formatCurrency(cumulativeBuyCost)}</td>
                        <td>${formatCurrency(cumulativeRentCost)}</td>
                    </tr>
                `;
            }
        }

        // Final results for display
        breakevenResult.textContent = breakevenYear ? `${breakevenYear} Years` : '30+ Years';
        
        const finalBuyCost = buyData[horizonYears - 1];
        const finalRentCost = rentData[horizonYears - 1];
        const diff = Math.abs(finalBuyCost - finalRentCost);
        
        savingsLabel.textContent = `${horizonYears}-Year Difference`;
        savingsResult.textContent = formatCurrency(diff);

        if (finalBuyCost < finalRentCost) {
            verdictBanner.className = 'verdict-banner buy-wins';
            verdictText.textContent = `Buying saves you ${formatCurrency(diff)} over ${horizonYears} years.`;
        } else {
            verdictBanner.className = 'verdict-banner rent-wins';
            verdictText.textContent = `Renting saves you ${formatCurrency(diff)} over ${horizonYears} years — breakeven is ${breakevenYear ? 'in year ' + breakevenYear : 'beyond your horizon'}.`;
        }

        tableBody.innerHTML = tableHTML;
        updateChart(chartLabels, buyData, rentData);
    }

    function updateChart(labels, buyData, rentData) {
        const ctx = document.getElementById('costChart').getContext('2d');
        
        if (costChart) {
            costChart.destroy();
        }

        costChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Cumulative Buying Cost',
                        data: buyData,
                        borderColor: '#2563eb',
                        backgroundColor: 'rgba(37, 99, 235, 0.1)',
                        fill: true,
                        tension: 0.3
                    },
                    {
                        label: 'Cumulative Renting Cost',
                        data: rentData,
                        borderColor: '#0d9488',
                        backgroundColor: 'rgba(13, 148, 136, 0.1)',
                        fill: true,
                        tension: 0.3
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return context.dataset.label + ': ' + formatCurrency(context.parsed.y);
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return '$' + value.toLocaleString();
                            }
                        }
                    }
                }
            }
        });
    }

    // Initial calculation
    calculate();
});
