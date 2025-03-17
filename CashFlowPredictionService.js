/**
 * CashFlowPredictionService.js
 * Service for AI-powered cash flow prediction and error detection
 */

const db = require('../config/database');

class CashFlowPredictionService {
  /**
   * Generate cash flow prediction for a property
   * @param {number} propertyId - The ID of the property
   * @param {Object} options - Prediction options (months, includeHistorical)
   * @returns {Promise<Object>} - Cash flow prediction data
   */
  async generatePrediction(propertyId, options = {}) {
    try {
      const {
        months = 6,
        includeHistorical = true
      } = options;

      // Get historical data for the property
      const historicalData = await this.getHistoricalCashFlow(propertyId, includeHistorical ? 12 : 0);
      
      // Get recurring income sources (rent payments)
      const recurringIncomeQuery = `
        SELECT * FROM recurring_payments
        WHERE property_id = $1
        AND is_active = true
        AND payment_type = 'income'
      `;
      
      const recurringIncomeResult = await db.query(recurringIncomeQuery, [propertyId]);
      const recurringIncome = recurringIncomeResult.rows;
      
      // Get recurring expenses
      const recurringExpenseQuery = `
        SELECT * FROM recurring_payments
        WHERE property_id = $1
        AND is_active = true
        AND payment_type = 'expense'
      `;
      
      const recurringExpenseResult = await db.query(recurringExpenseQuery, [propertyId]);
      const recurringExpenses = recurringExpenseResult.rows;
      
      // Get seasonal expense patterns
      const seasonalPatternsQuery = `
        SELECT 
          EXTRACT(MONTH FROM transaction_date) as month,
          category,
          AVG(amount) as average_amount,
          COUNT(*) as occurrence_count
        FROM expenses
        WHERE property_id = $1
        AND transaction_date >= CURRENT_DATE - INTERVAL '2 years'
        GROUP BY EXTRACT(MONTH FROM transaction_date), category
        HAVING COUNT(*) >= 2
      `;
      
      const seasonalPatternsResult = await db.query(seasonalPatternsQuery, [propertyId]);
      const seasonalPatterns = seasonalPatternsResult.rows;
      
      // Generate prediction for each month
      const prediction = [];
      const currentDate = new Date();
      
      for (let i = 0; i < months; i++) {
        const predictionMonth = new Date(currentDate);
        predictionMonth.setMonth(currentDate.getMonth() + i);
        const monthKey = predictionMonth.toISOString().substring(0, 7); // YYYY-MM format
        const monthNumber = predictionMonth.getMonth() + 1; // 1-12
        
        // Calculate expected income for the month
        let expectedIncome = 0;
        recurringIncome.forEach(income => {
          // Check if this income applies to the current month based on frequency
          if (this.isPaymentDueInMonth(income, predictionMonth)) {
            expectedIncome += parseFloat(income.amount);
          }
        });
        
        // Calculate expected expenses for the month
        let expectedExpenses = 0;
        
        // Regular recurring expenses
        recurringExpenses.forEach(expense => {
          // Check if this expense applies to the current month based on frequency
          if (this.isPaymentDueInMonth(expense, predictionMonth)) {
            expectedExpenses += parseFloat(expense.amount);
          }
        });
        
        // Seasonal expenses based on historical patterns
        seasonalPatterns.forEach(pattern => {
          if (parseInt(pattern.month) === monthNumber) {
            // Add seasonal expense if it's expected in this month
            expectedExpenses += parseFloat(pattern.average_amount);
          }
        });
        
        // Calculate net cash flow
        const netCashFlow = expectedIncome - expectedExpenses;
        
        // Add to prediction array
        prediction.push({
          month: monthKey,
          expectedIncome,
          expectedExpenses,
          netCashFlow,
          confidence: this.calculateConfidenceScore(expectedIncome, expectedExpenses, seasonalPatterns, monthNumber)
        });
      }
      
      return {
        propertyId,
        historicalData: historicalData.monthlyData,
        prediction,
        summary: {
          totalExpectedIncome: prediction.reduce((sum, month) => sum + month.expectedIncome, 0),
          totalExpectedExpenses: prediction.reduce((sum, month) => sum + month.expectedExpenses, 0),
          totalNetCashFlow: prediction.reduce((sum, month) => sum + month.netCashFlow, 0),
          averageMonthlyNetCashFlow: prediction.reduce((sum, month) => sum + month.netCashFlow, 0) / prediction.length
        }
      };
    } catch (error) {
      console.error('Error generating cash flow prediction:', error);
      throw new Error('Failed to generate cash flow prediction');
    }
  }

  /**
   * Get historical cash flow data for a property
   * @param {number} propertyId - The ID of the property
   * @param {number} months - Number of months of historical data to retrieve
   * @returns {Promise<Object>} - Historical cash flow data
   */
  async getHistoricalCashFlow(propertyId, months = 12) {
    try {
      if (months <= 0) {
        return {
          propertyId,
          monthlyData: []
        };
      }
      
      // Get income data
      const incomeQuery = `
        SELECT 
          DATE_TRUNC('month', transaction_date) as month,
          SUM(amount) as total_income
        FROM payments
        WHERE property_id = $1
        AND transaction_date >= CURRENT_DATE - INTERVAL '${months} months'
        GROUP BY DATE_TRUNC('month', transaction_date)
        ORDER BY month
      `;
      
      const incomeResult = await db.query(incomeQuery, [propertyId]);
      
      // Get expense data
      const expenseQuery = `
        SELECT 
          DATE_TRUNC('month', transaction_date) as month,
          SUM(amount) as total_expenses
        FROM expenses
        WHERE property_id = $1
        AND transaction_date >= CURRENT_DATE - INTERVAL '${months} months'
        GROUP BY DATE_TRUNC('month', transaction_date)
        ORDER BY month
      `;
      
      const expenseResult = await db.query(expenseQuery, [propertyId]);
      
      // Process data into a more usable format
      const monthlyData = {};
      
      // Process income data
      incomeResult.rows.forEach(row => {
        const monthKey = row.month.toISOString().substring(0, 7); // YYYY-MM format
        
        if (!monthlyData[monthKey]) {
          monthlyData[monthKey] = {
            month: monthKey,
            income: 0,
            expenses: 0,
            netCashFlow: 0
          };
        }
        
        monthlyData[monthKey].income = parseFloat(row.total_income);
        monthlyData[monthKey].netCashFlow = monthlyData[monthKey].income - monthlyData[monthKey].expenses;
      });
      
      // Process expense data
      expenseResult.rows.forEach(row => {
        const monthKey = row.month.toISOString().substring(0, 7); // YYYY-MM format
        
        if (!monthlyData[monthKey]) {
          monthlyData[monthKey] = {
            month: monthKey,
            income: 0,
            expenses: 0,
            netCashFlow: 0
          };
        }
        
        monthlyData[monthKey].expenses = parseFloat(row.total_expenses);
        monthlyData[monthKey].netCashFlow = monthlyData[monthKey].income - monthlyData[monthKey].expenses;
      });
      
      // Convert to array and sort by month
      const monthlyDataArray = Object.values(monthlyData).sort((a, b) => a.month.localeCompare(b.month));
      
      return {
        propertyId,
        monthlyData: monthlyDataArray
      };
    } catch (error) {
      console.error('Error getting historical cash flow:', error);
      throw new Error('Failed to get historical cash flow');
    }
  }

  /**
   * Detect potential errors or anomalies in financial data
   * @param {number} propertyId - The ID of the property
   * @returns {Promise<Array>} - Array of detected anomalies
   */
  async detectAnomalies(propertyId) {
    try {
      const anomalies = [];
      
      // Get historical data
      const historicalData = await this.getHistoricalCashFlow(propertyId, 24);
      const monthlyData = historicalData.monthlyData;
      
      if (monthlyData.length < 3) {
        return {
          propertyId,
          anomalies: [{
            type: 'insufficient_data',
            description: 'Not enough historical data to detect anomalies',
            severity: 'low'
          }]
        };
      }
      
      // Calculate average and standard deviation for income and expenses
      const incomeValues = monthlyData.map(month => month.income);
      const expenseValues = monthlyData.map(month => month.expenses);
      
      const incomeStats = this.calculateStats(incomeValues);
      const expenseStats = this.calculateStats(expenseValues);
      
      // Check for income anomalies
      monthlyData.forEach(month => {
        // Check for unusually high income
        if (month.income > incomeStats.mean + 2 * incomeStats.stdDev) {
          anomalies.push({
            type: 'high_income',
            month: month.month,
            value: month.income,
            expected: incomeStats.mean,
            deviation: (month.income - incomeStats.mean) / incomeStats.stdDev,
            description: `Unusually high income for ${month.month}`,
            severity: 'medium'
          });
        }
        
        // Check for unusually low income
        if (month.income < incomeStats.mean - 2 * incomeStats.stdDev && month.income > 0) {
          anomalies.push({
            type: 'low_income',
            month: month.month,
            value: month.income,
            expected: incomeStats.mean,
            deviation: (incomeStats.mean - month.income) / incomeStats.stdDev,
            description: `Unusually low income for ${month.month}`,
            severity: 'high'
          });
        }
        
        // Check for unusually high expenses
        if (month.expenses > expenseStats.mean + 2 * expenseStats.stdDev) {
          anomalies.push({
            type: 'high_expenses',
            month: month.month,
            value: month.expenses,
            expected: expenseStats.mean,
            deviation: (month.expenses - expenseStats.mean) / expenseStats.stdDev,
            description: `Unusually high expenses for ${month.month}`,
            severity: 'high'
          });
        }
        
        // Check for missing expenses (unusually low or zero)
        if (month.expenses < expenseStats.mean - 2 * expenseStats.stdDev || 
            (month.expenses === 0 && expenseStats.mean > 0)) {
          anomalies.push({
            type: 'low_expenses',
            month: month.month,
            value: month.expenses,
            expected: expenseStats.mean,
            deviation: expenseStats.mean > 0 ? (expenseStats.mean - month.expenses) / expenseStats.stdDev : 0,
            description: `Unusually low or missing expenses for ${month.month}`,
            severity: 'medium'
          });
        }
      });
      
      // Check for duplicate transactions
      const duplicatePaymentsQuery = `
        SELECT 
          amount, 
          tenant_id, 
          transaction_date,
          COUNT(*) as count
        FROM payments
        WHERE property_id = $1
        AND transaction_date >= CURRENT_DATE - INTERVAL '3 months'
        GROUP BY amount, tenant_id, transaction_date
        HAVING COUNT(*) > 1
      `;
      
      const duplicatePaymentsResult = await db.query(duplicatePaymentsQuery, [propertyId]);
      
      duplicatePaymentsResult.rows.forEach(row => {
        anomalies.push({
          type: 'duplicate_payment',
          date: row.transaction_date,
          amount: row.amount,
          tenant_id: row.tenant_id,
          count: row.count,
          description: `Potential duplicate payment of $${row.amount} from tenant ID ${row.tenant_id} on ${row.transaction_date.toISOString().split('T')[0]}`,
          severity: 'high'
        });
      });
      
      // Check for duplicate expenses
      const duplicateExpensesQuery = `
        SELECT 
          amount, 
          category, 
          transaction_date,
          COUNT(*) as count
        FROM expenses
        WHERE property_id = $1
        AND transaction_date >= CURRENT_DATE - INTERVAL '3 months'
        GROUP BY amount, category, transaction_date
        HAVING COUNT(*) > 1
      `;
      
      const duplicateExpensesResult = await db.query(duplicateExpensesQuery, [propertyId]);
      
      duplicateExpensesResult.rows.forEach(row => {
        anomalies.push({
          type: 'duplicate_expense',
          date: row.transaction_date,
          amount: row.amount,
          category: row.category,
          count: row.count,
          description: `Potential duplicate expense of $${row.amount} in category ${row.category} on ${row.transaction_date.toISOString().split('T')[0]}`,
          severity: 'high'
        });
      });
      
      return {
        propertyId,
        anomalies: anomalies.sort((a, b) => {
          // Sort by severity first (high to low)
          const severityOrder = { high: 0, medium: 1, low: 2 };
          if (severityOrder[a.severity] !== severityOrder[b.severity]) {
            return severityOrder[a.severity] - severityOrder[b.severity];
          }
          
          // Then sort by date (most recent first)
          if (a.month && b.month) {
            return b.month.localeCompare(a.month);
          } else if (a.date && b.date) {
            return new Date(b.date) - new Date(a.date);
          }
          
          return 0;
        })
      };
    } catch (error) {
      console.error('Error detecting anomalies:', error);
      throw new Error('Failed to detect anomalies');
    }
  }

  /**
   * Helper method to check if a payment is due in a specific month
   * @param {Object} payment - The payment object
   * @param {Date} targetMonth - The target month
   * @returns {boolean} - Whether the payment is due in the target month
   */
  isPaymentDueInMonth(payment, targetMonth) {
    const dueDate = new Date(payment.due_date);
    const frequency = payment.frequency;
    
    // For monthly payments
    if (frequency === 'monthly') {
      return true;
    }
    
    // For quarterly payments
    if (frequency === 'quarterly') {
      const monthDiff = (targetMonth.getFullYear() - dueDate.getFullYear()) * 12 + 
                        (targetMonth.getMonth() - dueDate.getMonth());
      return monthDiff % 3 === 0;
    }
    
    // For annual payments
    if (frequency === 'annual') {
      return targetMonth.getMonth() === dueDate.getMonth();
    }
    
    // For one-time payments
    if (frequency === 'one-time') {
      return targetMonth.getMonth() === dueDate.getMonth() && 
             targetMonth.getFullYear() === dueDate.getFullYear();
    }
    
    return false;
  }

  /**
   * Calculate confidence score for prediction
   * @param {number} income - Predicted income
   * @param {number} expenses - Predicted expenses
   * @param {Array} seasonalPatterns - Seasonal patterns data
   * @param {number} month - Target month (1-12)
   * @returns {number} - Confidence score (0-1)
   */
  calculateConfidenceScore(income, expenses, seasonalPatterns, month) {
    // Base confidence
    let confidence = 0.7;
    
    // Adjust based on seasonal pattern strength
    const monthPatterns = seasonalPatterns.filter(pattern => parseInt(pattern.month) === month);
    
    if (monthPatterns.length > 0) {
      // More patterns means more confidence
      confidence += 0.05 * Math.min(monthPatterns.length, 3);
      
      // Higher occurrence count means more confidence
      const avgOccurrenceCount = monthPatterns.reduce((sum, pattern) => sum + parseInt(pattern.occurrence_count), 0) / monthPatterns.length;
      confidence += 0.02 * Math.min(avgOccurrenceCount, 5);
    <response clipped><NOTE>To save on context only part of this file has been shown to you. You should retry this tool after you have searched inside the file with `grep -n` in order to find the line numbers of what you are looking for.</NOTE>