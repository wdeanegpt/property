/**
 * ExpenseManagementService.js
 * 
 * This service handles expense tracking with receipt scanning and categorization.
 * It provides methods for managing expense categories, recording expenses,
 * processing receipt images with OCR, and generating expense reports.
 * 
 * Part of the Advanced Accounting Module (Step 023) for the
 * Comprehensive Property Management System.
 */

const { Pool } = require('pg');
const moment = require('moment');
const fs = require('fs');
const path = require('path');
const config = require('../config/database');
const NotificationService = require('./NotificationService');
const OCRService = require('./OCRService');

class ExpenseManagementService {
  constructor() {
    this.pool = new Pool(config.postgres);
    this.notificationService = new NotificationService();
    this.ocrService = new OCRService();
    this.uploadDir = path.join(__dirname, '../../uploads/receipts');
    
    // Ensure upload directory exists
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  /**
   * Create a new expense category
   * 
   * @param {Object} categoryData - Expense category data
   * @param {string} categoryData.name - The name of the category
   * @param {string} categoryData.description - Description of the category
   * @param {boolean} categoryData.isTaxDeductible - Whether expenses in this category are tax-deductible
   * @param {number} categoryData.parentCategoryId - The ID of the parent category (optional)
   * @param {number} categoryData.userId - The ID of the user creating the category
   * @returns {Promise<Object>} - The created expense category
   */
  async createExpenseCategory(categoryData) {
    try {
      const {
        name,
        description = null,
        isTaxDeductible = true,
        parentCategoryId = null,
        userId
      } = categoryData;
      
      // Check if category with the same name already exists
      const checkQuery = `
        SELECT COUNT(*) AS count
        FROM expense_categories
        WHERE LOWER(name) = LOWER($1)
        AND is_active = true
      `;
      
      const checkResult = await this.pool.query(checkQuery, [name]);
      
      if (parseInt(checkResult.rows[0].count) > 0) {
        throw new Error(`An expense category with the name "${name}" already exists`);
      }
      
      // If parent category is specified, check if it exists
      if (parentCategoryId) {
        const parentCheckQuery = `
          SELECT COUNT(*) AS count
          FROM expense_categories
          WHERE id = $1
          AND is_active = true
        `;
        
        const parentCheckResult = await this.pool.query(parentCheckQuery, [parentCategoryId]);
        
        if (parseInt(parentCheckResult.rows[0].count) === 0) {
          throw new Error('Parent category not found');
        }
      }
      
      // Create the expense category
      const insertQuery = `
        INSERT INTO expense_categories (
          name,
          description,
          is_tax_deductible,
          parent_category_id,
          is_active,
          created_by,
          created_at,
          updated_at
        )
        VALUES ($1, $2, $3, $4, true, $5, NOW(), NOW())
        RETURNING *
      `;
      
      const insertValues = [
        name,
        description,
        isTaxDeductible,
        parentCategoryId,
        userId
      ];
      
      const insertResult = await this.pool.query(insertQuery, insertValues);
      const category = insertResult.rows[0];
      
      return category;
    } catch (error) {
      console.error('Error creating expense category:', error);
      throw new Error(`Failed to create expense category: ${error.message}`);
    }
  }

  /**
   * Update an existing expense category
   * 
   * @param {number} categoryId - The ID of the expense category to update
   * @param {Object} categoryData - Updated expense category data
   * @param {string} categoryData.name - The name of the category
   * @param {string} categoryData.description - Description of the category
   * @param {boolean} categoryData.isTaxDeductible - Whether expenses in this category are tax-deductible
   * @param {number} categoryData.parentCategoryId - The ID of the parent category (optional)
   * @returns {Promise<Object>} - The updated expense category
   */
  async updateExpenseCategory(categoryId, categoryData) {
    try {
      // Get the current category
      const getQuery = `
        SELECT * FROM expense_categories WHERE id = $1
      `;
      
      const getResult = await this.pool.query(getQuery, [categoryId]);
      
      if (getResult.rows.length === 0) {
        throw new Error('Expense category not found');
      }
      
      const currentCategory = getResult.rows[0];
      
      const {
        name = currentCategory.name,
        description = currentCategory.description,
        isTaxDeductible = currentCategory.is_tax_deductible,
        parentCategoryId = currentCategory.parent_category_id
      } = categoryData;
      
      // Check if another category with the same name already exists
      if (name !== currentCategory.name) {
        const checkQuery = `
          SELECT COUNT(*) AS count
          FROM expense_categories
          WHERE LOWER(name) = LOWER($1)
          AND id != $2
          AND is_active = true
        `;
        
        const checkResult = await this.pool.query(checkQuery, [name, categoryId]);
        
        if (parseInt(checkResult.rows[0].count) > 0) {
          throw new Error(`An expense category with the name "${name}" already exists`);
        }
      }
      
      // If parent category is specified, check if it exists and prevent circular references
      if (parentCategoryId && parentCategoryId !== currentCategory.parent_category_id) {
        // Check if parent exists
        const parentCheckQuery = `
          SELECT COUNT(*) AS count
          FROM expense_categories
          WHERE id = $1
          AND is_active = true
        `;
        
        const parentCheckResult = await this.pool.query(parentCheckQuery, [parentCategoryId]);
        
        if (parseInt(parentCheckResult.rows[0].count) === 0) {
          throw new Error('Parent category not found');
        }
        
        // Prevent circular references
        if (parentCategoryId === categoryId) {
          throw new Error('A category cannot be its own parent');
        }
        
        // Check if the new parent is a descendant of this category
        const isDescendantQuery = `
          WITH RECURSIVE category_tree AS (
            SELECT id, parent_category_id FROM expense_categories WHERE id = $1
            UNION ALL
            SELECT ec.id, ec.parent_category_id
            FROM expense_categories ec
            JOIN category_tree ct ON ec.parent_category_id = ct.id
          )
          SELECT COUNT(*) AS count
          FROM category_tree
          WHERE id = $2
        `;
        
        const isDescendantResult = await this.pool.query(isDescendantQuery, [categoryId, parentCategoryId]);
        
        if (parseInt(isDescendantResult.rows[0].count) > 0) {
          throw new Error('Cannot set a descendant category as parent (circular reference)');
        }
      }
      
      // Update the expense category
      const updateQuery = `
        UPDATE expense_categories
        SET 
          name = $1,
          description = $2,
          is_tax_deductible = $3,
          parent_category_id = $4,
          updated_at = NOW()
        WHERE id = $5
        RETURNING *
      `;
      
      const updateValues = [
        name,
        description,
        isTaxDeductible,
        parentCategoryId,
        categoryId
      ];
      
      const updateResult = await this.pool.query(updateQuery, updateValues);
      const updatedCategory = updateResult.rows[0];
      
      return updatedCategory;
    } catch (error) {
      console.error('Error updating expense category:', error);
      throw new Error(`Failed to update expense category: ${error.message}`);
    }
  }

  /**
   * Deactivate an expense category
   * 
   * @param {number} categoryId - The ID of the expense category to deactivate
   * @returns {Promise<boolean>} - Whether the deactivation was successful
   */
  async deactivateExpenseCategory(categoryId) {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Check if category exists
      const checkQuery = `
        SELECT * FROM expense_categories WHERE id = $1
      `;
      
      const checkResult = await client.query(checkQuery, [categoryId]);
      
      if (checkResult.rows.length === 0) {
        throw new Error('Expense category not found');
      }
      
      // Check if category has child categories
      const childrenQuery = `
        SELECT COUNT(*) AS count
        FROM expense_categories
        WHERE parent_category_id = $1
        AND is_active = true
      `;
      
      const childrenResult = await client.query(childrenQuery, [categoryId]);
      
      if (parseInt(childrenResult.rows[0].count) > 0) {
        throw new Error('Cannot deactivate category with active child categories');
      }
      
      // Check if category has expenses
      const expensesQuery = `
        SELECT COUNT(*) AS count
        FROM expenses
        WHERE expense_category_id = $1
      `;
      
      const expensesResult = await client.query(expensesQuery, [categoryId]);
      
      if (parseInt(expensesResult.rows[0].count) > 0) {
        // Update expenses to use parent category or null
        const category = checkResult.rows[0];
        
        const updateExpensesQuery = `
          UPDATE expenses
          SET expense_category_id = $1
          WHERE expense_category_id = $2
        `;
        
        await client.query(updateExpensesQuery, [category.parent_category_id, categoryId]);
      }
      
      // Deactivate the category
      const updateQuery = `
        UPDATE expense_categories
        SET is_active = false, updated_at = NOW()
        WHERE id = $1
      `;
      
      await client.query(updateQuery, [categoryId]);
      
      await client.query('COMMIT');
      
      return true;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error deactivating expense category:', error);
      throw new Error(`Failed to deactivate expense category: ${error.message}`);
    } finally {
      client.release();
    }
  }

  /**
   * Get expense categories
   * 
   * @param {Object} options - Optional parameters
   * @param {boolean} options.includeInactive - Whether to include inactive categories
   * @param {boolean} options.includeHierarchy - Whether to include hierarchical structure
   * @returns {Promise<Array>} - Array of expense categories
   */
  async getExpenseCategories(options = {}) {
    try {
      const {
        includeInactive = false,
        includeHierarchy = false
      } = options;
      
      if (includeHierarchy) {
        // Get categories with hierarchical structure
        const query = `
          WITH RECURSIVE category_tree AS (
            SELECT 
              ec.*,
              0 AS level,
              ARRAY[ec.id] AS path,
              ec.name AS full_path
            FROM expense_categories ec
            WHERE ec.parent_category_id IS NULL
            ${includeInactive ? '' : 'AND ec.is_active = true'}
            
            UNION ALL
            
            SELECT 
              ec.*,
              ct.level + 1,
              ct.path || ec.id,
              ct.full_path || ' > ' || ec.name
            FROM expense_categories ec
            JOIN category_tree ct ON ec.parent_category_id = ct.id
            ${includeInactive ? '' : 'AND ec.is_active = true'}
          )
          SELECT 
            ct.*,
            CONCAT(u.first_name, ' ', u.last_name) AS created_by_name,
            p.name AS parent_name
          FROM category_tree ct
          LEFT JOIN users u ON ct.created_by = u.id
          LEFT JOIN expense_categories p ON ct.parent_category_id = p.id
          ORDER BY ct.path
        `;
        
        const { rows } = await this.pool.query(query);
        return rows;
      } else {
        // Get flat list of categories
        let query = `
          SELECT 
            ec.*,
            CONCAT(u.first_name, ' ', u.last_name) AS created_by_name,
            p.name AS parent_name
          FROM expense_categories ec
          LEFT JOIN users u ON ec.created_by = u.id
          LEFT JOIN expense_categories p ON ec.parent_category_id = p.id
          WHERE 1=1
        `;
        
        if (!includeInactive) {
          query += ` AND ec.is_active = true`;
        }
        
        query += ` ORDER BY ec.name`;
        
        const { rows } = await this.pool.query(query);
        return rows;
      }
    } catch (error) {
      console.error('Error getting expense categories:', error);
      throw new Error('Failed to get expense categories');
    }
  }

  /**
   * Record a new expense
   * 
   * @param {Object} expenseData - Expense data
   * @param {number} expenseData.propertyId - The ID of the property (optional if unitId is provided)
   * @param {number} expenseData.unitId - The ID of the unit (optional if propertyId is provided)
   * @param {number} expenseData.expenseCategoryId - The ID of the expense category
   * @param {number} expenseData.vendorId - The ID of the vendor (optional)
   * @param {number} expenseData.amount - The expense amount
   * @param {number} expenseData.taxAmount - The tax amount (optional)
   * @param {Date} expenseData.transactionDate - The transaction date
   * @param {Date} expenseData.dueDate - The due date (optional)
   * @param {Date} expenseData.paymentDate - The payment date (optional)
   * @param {string} expenseData.paymentMethod - The payment method (optional)
   * @param {string} expenseData.referenceNumber - Reference number (optional)
   * @param {string} expenseData.description - Description of the expense
   * @param {string} expenseData.notes - Additional notes (optional)
   * @param {boolean} expenseData.isRecurring - Whether this is a recurring expense
   * @param {number} expenseData.recurringPaymentId - The ID of the associated recurring payment (required if isRecurring is true)
   * @param {string} expenseData.status - The expense status ('pending', 'paid', 'cancelled', 'disputed')
   * @param {number} expenseData.userId - The ID of the user recording the expense
   * @param {Object} expenseData.receiptImage - Receipt image data (optional)
   * @param {Buffer} expenseData.receiptImage.data - The receipt image data
   * @param {string} expenseData.receiptImage.filename - The original filename
   * @param {string} expenseData.receiptImage.mimetype - The MIME type
   * @returns {Promise<Object>} - The recorded expense
   */
  async recordExpense(expenseData) {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const {
        propertyId = null,
        unitId = null,
        expenseCategoryId,
        vendorId = null,
        amount,
        taxAmount = 0,
        transactionDate = new Date(),
        dueDate = null,
        paymentDate = null,
        paymentMethod = null,
        referenceNumber = null,
        description,
        notes = null,
        isRecurring = false,
        recurringPaymentId = null,
        status = 'pending',
        userId,
        receiptImage = null
      } = expenseData;
      
      // Validate required fields
      if (!propertyId && !unitId) {
        throw new Error('Either propertyId or unitId must be provided');
      }
      
      if (isRecurring && !recurringPaymentId) {
        throw new Error('recurringPaymentId is required for recurring expenses');
      }
      
      if (status === 'paid' && !paymentDate) {
        throw new Error('paymentDate is required for paid expenses');
      }
      
      // Validate amount
      if (amount <= 0) {
        throw new Error('Expense amount must be greater than zero');
      }
      
      // Validate tax amount
      if (taxAmount < 0) {
        throw new Error('Tax amount cannot be negative');
      }
      
      // If unitId is provided but not propertyId, get propertyId from unit
      let finalPropertyId = propertyId;
      
      if (!finalPropertyId && unitId) {
        const unitQuery = `
          SELECT property_id FROM units WHERE id = $1
        `;
        
        const unitResult = await client.query(unitQuery, [unitId]);
        
        if (unitResult.rows.length === 0) {
          throw new Error('Unit not found');
        }
        
        finalPropertyId = unitResult.rows[0].property_id;
      }
      
      // Validate expense category
      const categoryQuery = `
        SELECT * FROM expense_categories WHERE id = $1 AND is_active = true
      `;
      
      const categoryResult = await client.query(categoryQuery, [expenseCategoryId]);
      
      if (categoryResult.rows.length === 0) {
        throw new Error('Expense category not found or inactive');
      }
      
      // Record the expense
      const insertQuery = `
        INSERT INTO expenses (
          property_id,
          unit_id,
          expense_category_id,
          vendor_id,
          amount,
          tax_amount,
          transaction_date,
          due_date,
          payment_date,
          payment_method,
          reference_number,
          description,
          notes,
          is_recurring,
          recurring_payment_id,
          status,
          created_by,
          created_at,
          updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, NOW(), NOW())
        RETURNING *
      `;
      
      const insertValues = [
        finalPropertyId,
        unitId,
        expenseCategoryId,
        vendorId,
        amount,
        taxAmount,
        transactionDate,
        dueDate,
        paymentDate,
        paymentMethod,
        referenceNumber,
        description,
        notes,
        isRecurring,
        recurringPaymentId,
        status,
        userId
      ];
      
      const insertResult = await client.query(insertQuery, insertValues);
      const expense = insertResult.rows[0];
      
      // Process receipt image if provided
      let receiptImageRecord = null;
      
      if (receiptImage) {
        receiptImageRecord = await this.processReceiptImage(client, expense.id, receiptImage, userId);
      }
      
      await client.query('COMMIT');
      
      return {
        ...expense,
        receiptImage: receiptImageRecord
      };
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error recording expense:', error);
      throw new Error(`Failed to record expense: ${error.message}`);
    } finally {
      client.release();
    }
  }

  /**
   * Process and store a receipt image
   * 
   * @param {Object} client - Database client for transaction
   * @param {number} expenseId - The ID of the associated expense
   * @param {Object} imageData - Receipt image data
   * @param {Buffer} imageData.data - The receipt image data
   * @param {string} imageData.filename - The original filename
   * @param {string} imageData.mimetype - The MIME type
   * @param {number} userId - The ID of the user uploading the image
   * @returns {Promise<Object>} - The stored receipt image record
   */
  async processReceiptImage(client, expenseId, imageData, userId) {
    try {
      // Generate unique filename
      const timestamp = moment().format('YYYYMMDD_HHmmss');
      const randomString = Math.random().toString(36).substring(2, 10);
      const fileExtension = path.extname(imageData.filename);
      const newFilename = `receipt_${expenseId}_${timestamp}_${randomString}${fileExtension}`;
      const filePath = path.join(this.uploadDir, newFilename);
      
      // Save file to disk
      fs.writeFileSync(filePath, imageData.data);
      
      // Record in database
      const insertQuery = `
        INSERT INTO receipt_images (
          expense_id,
          file_path,
          file_name,
          mime_type,
          file_size,
          ocr_processed,
          uploaded_by,
          uploaded_at,
          updated_at
        )
        VALUES ($1, $2, $3, $4, $5, false, $6, NOW(), NOW())
        RETURNING *
      `;
      
      const insertValues = [
        expenseId,
        filePath,
        newFilename,
        imageData.mimetype,
        imageData.data.length,
        userId
      ];
      
      const insertResult = await client.query(insertQuery, insertValues);
      const receiptImage = insertResult.rows[0];
      
      // Queue OCR processing
      this.queueOCRProcessing(receiptImage.id);
      
      return receiptImage;
    } catch (error) {
      console.error('Error processing receipt image:', error);
      throw new Error(`Failed to process receipt image: ${error.message}`);
    }
  }

  /**
   * Queue OCR processing for a receipt image
   * 
   * @param {number} receiptImageId - The ID of the receipt image to process
   */
  queueOCRProcessing(receiptImageId) {
    // In a real implementation, this would add the job to a queue
    // For simplicity, we'll process it directly
    setTimeout(() => {
      this.processReceiptImageWithOCR(receiptImageId)
        .catch(error => console.error('Error in OCR processing:', error));
    }, 100);
  }

  /**
   * Process a receipt image with OCR
   * 
   * @param {number} receiptImageId - The ID of the receipt image to process
   * @returns {Promise<Object>} - The OCR processing results
   */
  async processReceiptImageWithOCR(receiptImageId) {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Get receipt image
      const getQuery = `
        SELECT * FROM receipt_images WHERE id = $1
      `;
      
      const getResult = await client.query(getQuery, [receiptImageId]);
      
      if (getResult.rows.length === 0) {
        throw new Error('Receipt image not found');
      }
      
      const receiptImage = getResult.rows[0];
      
      // Skip if already processed
      if (receiptImage.ocr_processed) {
        return {
          receiptImageId,
          alreadyProcessed: true,
          ocrText: receiptImage.ocr_text,
          ocrData: receiptImage.ocr_data
        };
      }
      
      // Process with OCR
      const ocrResult = await this.ocrService.processImage(receiptImage.file_path);
      
      // Extract structured data
      const structuredData = this.extractStructuredDataFromOCR(ocrResult.text);
      
      // Update receipt image with OCR results
      const updateQuery = `
        UPDATE receipt_images
        SET 
          ocr_processed = true,
          ocr_text = $1,
          ocr_data = $2,
          ocr_confidence = $3,
          ocr_processed_at = NOW(),
          updated_at = NOW()
        WHERE id = $4
        RETURNING *
      `;
      
      const updateValues = [
        ocrResult.text,
        JSON.stringify(structuredData),
        ocrResult.confidence,
        receiptImageId
      ];
      
      const updateResult = await client.query(updateQuery, updateValues);
      const updatedReceiptImage = updateResult.rows[0];
      
      // Update expense with extracted data if appropriate
      if (structuredData.total && receiptImage.expense_id) {
        const getExpenseQuery = `
          SELECT * FROM expenses WHERE id = $1
        `;
        
        const getExpenseResult = await client.query(getExpenseQuery, [receiptImage.expense_id]);
        
        if (getExpenseResult.rows.length > 0) {
          const expense = getExpenseResult.rows[0];
          
          // Only update if expense is still pending and amounts differ significantly
          if (expense.status === 'pending') {
            const currentAmount = parseFloat(expense.amount);
            const extractedAmount = parseFloat(structuredData.total);
            
            // If extracted amount differs by more than 5% and is non-zero
            if (extractedAmount > 0 && Math.abs(currentAmount - extractedAmount) / currentAmount > 0.05) {
              const updateExpenseQuery = `
                UPDATE expenses
                SET 
                  amount = $1,
                  tax_amount = $2,
                  transaction_date = $3,
                  vendor_id = $4,
                  updated_at = NOW()
                WHERE id = $5
              `;
              
              const updateExpenseValues = [
                extractedAmount,
                structuredData.tax || expense.tax_amount,
                structuredData.date || expense.transaction_date,
                structuredData.vendorId || expense.vendor_id,
                expense.id
              ];
              
              await client.query(updateExpenseQuery, updateExpenseValues);
            }
          }
        }
      }
      
      await client.query('COMMIT');
      
      return {
        receiptImageId,
        ocrText: ocrResult.text,
        ocrData: structuredData,
        ocrConfidence: ocrResult.confidence
      };
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error processing receipt image with OCR:', error);
      throw new Error(`Failed to process receipt image with OCR: ${error.message}`);
    } finally {
      client.release();
    }
  }

  /**
   * Extract structured data from OCR text
   * 
   * @param {string} ocrText - The OCR text to process
   * @returns {Object} - Extracted structured data
   */
  extractStructuredDataFromOCR(ocrText) {
    // This is a simplified implementation
    // In a real system, this would use more sophisticated NLP and pattern matching
    
    const data = {
      vendor: null,
      vendorId: null,
      date: null,
      total: null,
      tax: null,
      items: []
    };
    
    if (!ocrText) {
      return data;
    }
    
    const lines = ocrText.split('\n');
    
    // Extract vendor name (usually at the top)
    if (lines.length > 0) {
      data.vendor = lines[0].trim();
    }
    
    // Extract date
    const dateRegex = /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/;
    for (const line of lines) {
      const dateMatch = line.match(dateRegex);
      if (dateMatch) {
        // Attempt to parse the date
        try {
          const dateParts = dateMatch[0].split(/[\/\-]/);
          // Assume MM/DD/YYYY format, but this could be improved
          const month = parseInt(dateParts[0]);
          const day = parseInt(dateParts[1]);
          let year = parseInt(dateParts[2]);
          
          // Handle 2-digit years
          if (year < 100) {
            year += year < 50 ? 2000 : 1900;
          }
          
          // Validate date parts
          if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
            data.date = new Date(year, month - 1, day);
            break;
          }
        } catch (e) {
          // Continue if date parsing fails
        }
      }
    }
    
    // Extract total amount
    const totalRegex = /total[:\s]*[$]?(\d+\.\d{2}|\d+,\d{3}\.\d{2}|\d+)/i;
    for (const line of lines) {
      const totalMatch = line.match(totalRegex);
      if (totalMatch) {
        // Remove commas and convert to float
        data.total = parseFloat(totalMatch[1].replace(',', ''));
        break;
      }
    }
    
    // If no explicit total found, look for dollar amounts
    if (data.total === null) {
      const amountRegex = /[$]?(\d+\.\d{2}|\d+,\d{3}\.\d{2})/g;
      const amounts = [];
      
      for (const line of lines) {
        let match;
        while ((match = amountRegex.exec(line)) !== null) {
          amounts.push(parseFloat(match[1].replace(',', '')));
        }
      }
      
      // If amounts found, use the largest as the total
      if (amounts.length > 0) {
        data.total = Math.max(...amounts);
      }
    }
    
    // Extract tax
    const taxRegex = /tax[:\s]*[$]?(\d+\.\d{2}|\d+,\d{3}\.\d{2}|\d+)/i;
    for (const line of lines) {
      const taxMatch = line.match(taxRegex);
      if (taxMatch) {
        data.tax = parseFloat(taxMatch[1].replace(',', ''));
        break;
      }
    }
    
    // Extract line items (simplified)
    const itemRegex = /(\d+)\s+x\s+(.*?)\s+[$]?(\d+\.\d{2}|\d+,\d{3}\.\d{2}|\d+)/i;
    for (const line of lines) {
      const itemMatch = line.match(itemRegex);
      if (itemMatch) {
        data.items.push({
          quantity: parseInt(itemMatch[1]),
          description: itemMatch[2].trim(),
          price: parseFloat(itemMatch[3].replace(',', ''))
        });
      }
    }
    
    return data;
  }

  /**
   * Update an existing expense
   * 
   * @param {number} expenseId - The ID of the expense to update
   * @param {Object} expenseData - Updated expense data
   * @returns {Promise<Object>} - The updated expense
   */
  async updateExpense(expenseId, expenseData) {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Get the current expense
      const getQuery = `
        SELECT * FROM expenses WHERE id = $1
      `;
      
      const getResult = await client.query(getQuery, [expenseId]);
      
      if (getResult.rows.length === 0) {
        throw new Error('Expense not found');
      }
      
      const currentExpense = getResult.rows[0];
      
      const {
        propertyId = currentExpense.property_id,
        unitId = currentExpense.unit_id,
        expenseCategoryId = currentExpense.expense_category_id,
        vendorId = currentExpense.vendor_id,
        amount = currentExpense.amount,
        taxAmount = currentExpense.tax_amount,
        transactionDate = currentExpense.transaction_date,
        dueDate = currentExpense.due_date,
        paymentDate = currentExpense.payment_date,
        paymentMethod = currentExpense.payment_method,
        referenceNumber = currentExpense.reference_number,
        description = currentExpense.description,
        notes = currentExpense.notes,
        isRecurring = currentExpense.is_recurring,
        recurringPaymentId = currentExpense.recurring_payment_id,
        status = currentExpense.status,
        receiptImage = null
      } = expenseData;
      
      // Validate required fields
      if (!propertyId && !unitId) {
        throw new Error('Either propertyId or unitId must be provided');
      }
      
      if (isRecurring && !recurringPaymentId) {
        throw new Error('recurringPaymentId is required for recurring expenses');
      }
      
      if (status === 'paid' && !paymentDate) {
        throw new Error('paymentDate is required for paid expenses');
      }
      
      // Validate amount
      if (amount <= 0) {
        throw new Error('Expense amount must be greater than zero');
      }
      
      // Validate tax amount
      if (taxAmount < 0) {
        throw new Error('Tax amount cannot be negative');
      }
      
      // If unitId is provided but not propertyId, get propertyId from unit
      let finalPropertyId = propertyId;
      
      if (!finalPropertyId && unitId) {
        const unitQuery = `
          SELECT property_id FROM units WHERE id = $1
        `;
        
        const unitResult = await client.query(unitQuery, [unitId]);
        
        if (unitResult.rows.length === 0) {
          throw new Error('Unit not found');
        }
        
        finalPropertyId = unitResult.rows[0].property_id;
      }
      
      // Validate expense category
      const categoryQuery = `
        SELECT * FROM expense_categories WHERE id = $1 AND is_active = true
      `;
      
      const categoryResult = await client.query(categoryQuery, [expenseCategoryId]);
      
      if (categoryResult.rows.length === 0) {
        throw new Error('Expense category not found or inactive');
      }
      
      // Update the expense
      const updateQuery = `
        UPDATE expenses
        SET 
          property_id = $1,
          unit_id = $2,
          expense_category_id = $3,
          vendor_id = $4,
          amount = $5,
          tax_amount = $6,
          transaction_date = $7,
          due_date = $8,
          payment_date = $9,
          payment_method = $10,
          reference_number = $11,
          description = $12,
          notes = $13,
          is_recurring = $14,
          recurring_payment_id = $15,
          status = $16,
          updated_at = NOW()
        WHERE id = $17
        RETURNING *
      `;
      
      const updateValues = [
        finalPropertyId,
        unitId,
        expenseCategoryId,
        vendorId,
        amount,
        taxAmount,
        transactionDate,
        dueDate,
        paymentDate,
        paymentMethod,
        referenceNumber,
        description,
        notes,
        isRecurring,
        recurringPaymentId,
        status,
        expenseId
      ];
      
      const updateResult = await client.query(updateQuery, updateValues);
      const updatedExpense = updateResult.rows[0];
      
      // Process receipt image if provided
      let receiptImageRecord = null;
      
      if (receiptImage) {
        receiptImageRecord = await this.processReceiptImage(client, expenseId, receiptImage, currentExpense.created_by);
      }
      
      // Get existing receipt images
      const receiptImagesQuery = `
        SELECT * FROM receipt_images WHERE expense_id = $1
      `;
      
      const receiptImagesResult = await client.query(receiptImagesQuery, [expenseId]);
      const receiptImages = receiptImagesResult.rows;
      
      await client.query('COMMIT');
      
      return {
        ...updatedExpense,
        receiptImages: receiptImageRecord ? [...receiptImages, receiptImageRecord] : receiptImages
      };
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error updating expense:', error);
      throw new Error(`Failed to update expense: ${error.message}`);
    } finally {
      client.release();
    }
  }

  /**
   * Delete an expense
   * 
   * @param {number} expenseId - The ID of the expense to delete
   * @returns {Promise<boolean>} - Whether the deletion was successful
   */
  async deleteExpense(expenseId) {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Get the expense
      const getQuery = `
        SELECT * FROM expenses WHERE id = $1
      `;
      
      const getResult = await client.query(getQuery, [expenseId]);
      
      if (getResult.rows.length === 0) {
        throw new Error('Expense not found');
      }
      
      // Get receipt images
      const receiptImagesQuery = `
        SELECT * FROM receipt_images WHERE expense_id = $1
      `;
      
      const receiptImagesResult = await client.query(receiptImagesQuery, [expenseId]);
      const receiptImages = receiptImagesResult.rows;
      
      // Delete receipt images from disk
      for (const image of receiptImages) {
        try {
          if (fs.existsSync(image.file_path)) {
            fs.unlinkSync(image.file_path);
          }
        } catch (error) {
          console.error(`Error deleting receipt image file ${image.file_path}:`, error);
        }
      }
      
      // Delete receipt images from database
      if (receiptImages.length > 0) {
        const deleteImagesQuery = `
          DELETE FROM receipt_images WHERE expense_id = $1
        `;
        
        await client.query(deleteImagesQuery, [expenseId]);
      }
      
      // Delete the expense
      const deleteQuery = `
        DELETE FROM expenses WHERE id = $1
      `;
      
      await client.query(deleteQuery, [expenseId]);
      
      await client.query('COMMIT');
      
      return true;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error deleting expense:', error);
      throw new Error(`Failed to delete expense: ${error.message}`);
    } finally {
      client.release();
    }
  }

  /**
   * Get expenses
   * 
   * @param {Object} filters - Filter parameters
   * @param {number} filters.propertyId - Filter by property ID
   * @param {number} filters.unitId - Filter by unit ID
   * @param {number} filters.categoryId - Filter by expense category ID
   * @param {number} filters.vendorId - Filter by vendor ID
   * @param {Date} filters.startDate - Filter by start date
   * @param {Date} filters.endDate - Filter by end date
   * @param {string} filters.status - Filter by status
   * @param {boolean} filters.isRecurring - Filter by recurring status
   * @param {Object} options - Additional options
   * @param {number} options.page - Page number for pagination
   * @param {number} options.pageSize - Page size for pagination
   * @param {string} options.sortBy - Field to sort by
   * @param {string} options.sortOrder - Sort order ('asc' or 'desc')
   * @returns {Promise<Object>} - Paginated expenses with total count
   */
  async getExpenses(filters = {}, options = {}) {
    try {
      const {
        propertyId = null,
        unitId = null,
        categoryId = null,
        vendorId = null,
        startDate = null,
        endDate = null,
        status = null,
        isRecurring = null
      } = filters;
      
      const {
        page = 1,
        pageSize = 20,
        sortBy = 'transaction_date',
        sortOrder = 'desc'
      } = options;
      
      // Build query
      let query = `
        SELECT 
          e.*,
          p.name AS property_name,
          u.unit_number,
          ec.name AS category_name,
          v.name AS vendor_name,
          CONCAT(cu.first_name, ' ', cu.last_name) AS created_by_name,
          (SELECT COUNT(*) FROM receipt_images WHERE expense_id = e.id) AS receipt_count
        FROM expenses e
        LEFT JOIN properties p ON e.property_id = p.id
        LEFT JOIN units u ON e.unit_id = u.id
        LEFT JOIN expense_categories ec ON e.expense_category_id = ec.id
        LEFT JOIN vendors v ON e.vendor_id = v.id
        LEFT JOIN users cu ON e.created_by = cu.id
        WHERE 1=1
      `;
      
      const queryParams = [];
      let paramIndex = 1;
      
      // Add filters
      if (propertyId) {
        query += ` AND e.property_id = $${paramIndex}`;
        queryParams.push(propertyId);
        paramIndex++;
      }
      
      if (unitId) {
        query += ` AND e.unit_id = $${paramIndex}`;
        queryParams.push(unitId);
        paramIndex++;
      }
      
      if (categoryId) {
        query += ` AND e.expense_category_id = $${paramIndex}`;
        queryParams.push(categoryId);
        paramIndex++;
      }
      
      if (vendorId) {
        query += ` AND e.vendor_id = $${paramIndex}`;
        queryParams.push(vendorId);
        paramIndex++;
      }
      
      if (startDate) {
        query += ` AND e.transaction_date >= $${paramIndex}`;
        queryParams.push(startDate);
        paramIndex++;
      }
      
      if (endDate) {
        query += ` AND e.transaction_date <= $${paramIndex}`;
        queryParams.push(endDate);
        paramIndex++;
      }
      
      if (status) {
        query += ` AND e.status = $${paramIndex}`;
        queryParams.push(status);
        paramIndex++;
      }
      
      if (isRecurring !== null) {
        query += ` AND e.is_recurring = $${paramIndex}`;
        queryParams.push(isRecurring);
        paramIndex++;
      }
      
      // Count total matching expenses
      const countQuery = `SELECT COUNT(*) AS total FROM (${query}) AS filtered_expenses`;
      const countResult = await this.pool.query(countQuery, queryParams);
      const totalCount = parseInt(countResult.rows[0].total);
      
      // Add sorting and pagination
      const validSortFields = [
        'transaction_date', 'amount', 'status', 'created_at', 
        'property_name', 'unit_number', 'category_name', 'vendor_name'
      ];
      
      const sortField = validSortFields.includes(sortBy) ? sortBy : 'transaction_date';
      const order = sortOrder.toLowerCase() === 'asc' ? 'ASC' : 'DESC';
      
      query += ` ORDER BY ${sortField} ${order}`;
      
      // Add pagination
      const offset = (page - 1) * pageSize;
      query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      queryParams.push(pageSize, offset);
      
      // Execute query
      const { rows } = await this.pool.query(query, queryParams);
      
      return {
        expenses: rows,
        pagination: {
          page,
          pageSize,
          totalCount,
          totalPages: Math.ceil(totalCount / pageSize)
        }
      };
    } catch (error) {
      console.error('Error getting expenses:', error);
      throw new Error('Failed to get expenses');
    }
  }

  /**
   * Get expense details
   * 
   * @param {number} expenseId - The ID of the expense
   * @returns {Promise<Object>} - Detailed expense information
   */
  async getExpenseDetails(expenseId) {
    try {
      // Get expense
      const expenseQuery = `
        SELECT 
          e.*,
          p.name AS property_name,
          u.unit_number,
          ec.name AS category_name,
          ec.is_tax_deductible,
          v.name AS vendor_name,
          v.contact_name AS vendor_contact,
          v.email AS vendor_email,
          v.phone AS vendor_phone,
          CONCAT(cu.first_name, ' ', cu.last_name) AS created_by_name
        FROM expenses e
        LEFT JOIN properties p ON e.property_id = p.id
        LEFT JOIN units u ON e.unit_id = u.id
        LEFT JOIN expense_categories ec ON e.expense_category_id = ec.id
        LEFT JOIN vendors v ON e.vendor_id = v.id
        LEFT JOIN users cu ON e.created_by = cu.id
        WHERE e.id = $1
      `;
      
      const expenseResult = await this.pool.query(expenseQuery, [expenseId]);
      
      if (expenseResult.rows.length === 0) {
        throw new Error('Expense not found');
      }
      
      const expense = expenseResult.rows[0];
      
      // Get receipt images
      const receiptImagesQuery = `
        SELECT * FROM receipt_images WHERE expense_id = $1
      `;
      
      const receiptImagesResult = await this.pool.query(receiptImagesQuery, [expenseId]);
      const receiptImages = receiptImagesResult.rows;
      
      // Get recurring payment details if applicable
      let recurringPayment = null;
      
      if (expense.is_recurring && expense.recurring_payment_id) {
        const recurringPaymentQuery = `
          SELECT * FROM recurring_payments WHERE id = $1
        `;
        
        const recurringPaymentResult = await this.pool.query(recurringPaymentQuery, [expense.recurring_payment_id]);
        
        if (recurringPaymentResult.rows.length > 0) {
          recurringPayment = recurringPaymentResult.rows[0];
        }
      }
      
      return {
        ...expense,
        receiptImages,
        recurringPayment
      };
    } catch (error) {
      console.error('Error getting expense details:', error);
      throw new Error('Failed to get expense details');
    }
  }

  /**
   * Mark expense as paid
   * 
   * @param {number} expenseId - The ID of the expense
   * @param {Object} paymentData - Payment data
   * @param {Date} paymentData.paymentDate - The payment date
   * @param {string} paymentData.paymentMethod - The payment method
   * @param {string} paymentData.referenceNumber - Reference number (optional)
   * @param {string} paymentData.notes - Additional notes (optional)
   * @returns {Promise<Object>} - The updated expense
   */
  async markExpenseAsPaid(expenseId, paymentData) {
    try {
      const {
        paymentDate = new Date(),
        paymentMethod,
        referenceNumber = null,
        notes = null
      } = paymentData;
      
      // Validate required fields
      if (!paymentMethod) {
        throw new Error('Payment method is required');
      }
      
      // Get the expense
      const getQuery = `
        SELECT * FROM expenses WHERE id = $1
      `;
      
      const getResult = await this.pool.query(getQuery, [expenseId]);
      
      if (getResult.rows.length === 0) {
        throw new Error('Expense not found');
      }
      
      const expense = getResult.rows[0];
      
      // Check if already paid
      if (expense.status === 'paid') {
        throw new Error('Expense is already marked as paid');
      }
      
      // Update the expense
      const updateQuery = `
        UPDATE expenses
        SET 
          status = 'paid',
          payment_date = $1,
          payment_method = $2,
          reference_number = $3,
          notes = CASE WHEN $4 IS NULL THEN notes ELSE $4 END,
          updated_at = NOW()
        WHERE id = $5
        RETURNING *
      `;
      
      const updateValues = [
        paymentDate,
        paymentMethod,
        referenceNumber,
        notes,
        expenseId
      ];
      
      const updateResult = await this.pool.query(updateQuery, updateValues);
      const updatedExpense = updateResult.rows[0];
      
      return updatedExpense;
    } catch (error) {
      console.error('Error marking expense as paid:', error);
      throw new Error(`Failed to mark expense as paid: ${error.message}`);
    }
  }

  /**
   * Generate expense report
   * 
   * @param {Object} filters - Filter parameters
   * @param {number} filters.propertyId - Filter by property ID
   * @param {Array<number>} filters.propertyIds - Filter by multiple property IDs
   * @param {number} filters.unitId - Filter by unit ID
   * @param {number} filters.categoryId - Filter by expense category ID
   * @param {number} filters.vendorId - Filter by vendor ID
   * @param {Date} filters.startDate - Filter by start date (required)
   * @param {Date} filters.endDate - Filter by end date (required)
   * @param {string} filters.groupBy - Group by field ('property', 'unit', 'category', 'vendor', 'month')
   * @param {string} filters.reportType - Report type ('summary', 'detailed')
   * @param {string} filters.format - Report format ('json', 'csv', 'pdf')
   * @returns {Promise<Object>} - The generated report
   */
  async generateExpenseReport(filters) {
    try {
      const {
        propertyId = null,
        propertyIds = null,
        unitId = null,
        categoryId = null,
        vendorId = null,
        startDate,
        endDate,
        groupBy = 'category',
        reportType = 'summary',
        format = 'json'
      } = filters;
      
      // Validate required fields
      if (!startDate || !endDate) {
        throw new Error('Start date and end date are required');
      }
      
      // Validate group by field
      const validGroupByFields = ['property', 'unit', 'category', 'vendor', 'month'];
      if (!validGroupByFields.includes(groupBy)) {
        throw new Error(`Invalid groupBy value. Must be one of: ${validGroupByFields.join(', ')}`);
      }
      
      // Build base query
      let baseQuery = `
        SELECT 
          e.*,
          p.name AS property_name,
          u.unit_number,
          ec.name AS category_name,
          ec.is_tax_deductible,
          v.name AS vendor_name
        FROM expenses e
        LEFT JOIN properties p ON e.property_id = p.id
        LEFT JOIN units u ON e.unit_id = u.id
        LEFT JOIN expense_categories ec ON e.expense_category_id = ec.id
        LEFT JOIN vendors v ON e.vendor_id = v.id
        WHERE e.transaction_date >= $1 AND e.transaction_date <= $2
      `;
      
      const queryParams = [startDate, endDate];
      let paramIndex = 3;
      
      // Add filters
      if (propertyId) {
        baseQuery += ` AND e.property_id = $${paramIndex}`;
        queryParams.push(propertyId);
        paramIndex++;
      } else if (propertyIds && propertyIds.length > 0) {
        baseQuery += ` AND e.property_id = ANY($${paramIndex}::int[])`;
        queryParams.push(propertyIds);
        paramIndex++;
      }
      
      if (unitId) {
        baseQuery += ` AND e.unit_id = $${paramIndex}`;
        queryParams.push(unitId);
        paramIndex++;
      }
      
      if (categoryId) {
        baseQuery += ` AND e.expense_category_id = $${paramIndex}`;
        queryParams.push(categoryId);
        paramIndex++;
      }
      
      if (vendorId) {
        baseQuery += ` AND e.vendor_id = $${paramIndex}`;
        queryParams.push(vendorId);
        paramIndex++;
      }
      
      // Execute base query to get all matching expenses
      const { rows: expenses } = await this.pool.query(baseQuery, queryParams);
      
      // Calculate summary statistics
      const totalExpenses = expenses.length;
      const totalAmount = expenses.reduce((sum, e) => sum + parseFloat(e.amount), 0);
      const totalTaxAmount = expenses.reduce((sum, e) => sum + parseFloat(e.tax_amount), 0);
      const taxDeductibleAmount = expenses
        .filter(e => e.is_tax_deductible)
        .reduce((sum, e) => sum + parseFloat(e.amount), 0);
      
      // Group expenses based on groupBy parameter
      const groupedExpenses = {};
      
      expenses.forEach(expense => {
        let groupKey;
        let groupName;
        
        switch (groupBy) {
          case 'property':
            groupKey = expense.property_id;
            groupName = expense.property_name || 'Unknown Property';
            break;
          case 'unit':
            groupKey = expense.unit_id;
            groupName = expense.unit_number || 'No Unit';
            break;
          case 'category':
            groupKey = expense.expense_category_id;
            groupName = expense.category_name || 'Uncategorized';
            break;
          case 'vendor':
            groupKey = expense.vendor_id;
            groupName = expense.vendor_name || 'Unknown Vendor';
            break;
          case 'month':
            groupKey = moment(expense.transaction_date).format('YYYY-MM');
            groupName = moment(expense.transaction_date).format('MMMM YYYY');
            break;
        }
        
        if (!groupedExpenses[groupKey]) {
          groupedExpenses[groupKey] = {
            id: groupKey,
            name: groupName,
            count: 0,
            amount: 0,
            taxAmount: 0,
            taxDeductibleAmount: 0,
            expenses: []
          };
        }
        
        groupedExpenses[groupKey].count++;
        groupedExpenses[groupKey].amount += parseFloat(expense.amount);
        groupedExpenses[groupKey].taxAmount += parseFloat(expense.tax_amount);
        
        if (expense.is_tax_deductible) {
          groupedExpenses[groupKey].taxDeductibleAmount += parseFloat(expense.amount);
        }
        
        if (reportType === 'detailed') {
          groupedExpenses[groupKey].expenses.push(expense);
        }
      });
      
      // Convert to array and sort by amount (descending)
      const groupedExpensesArray = Object.values(groupedExpenses).sort((a, b) => b.amount - a.amount);
      
      // Construct the report
      const report = {
        reportPeriod: {
          startDate,
          endDate
        },
        summary: {
          totalExpenses,
          totalAmount,
          totalTaxAmount,
          taxDeductibleAmount,
          nonTaxDeductibleAmount: totalAmount - taxDeductibleAmount
        },
        groupBy,
        reportType,
        groups: groupedExpensesArray
      };
      
      // Format the report based on the requested format
      if (format === 'json') {
        return report;
      } else if (format === 'csv') {
        // Generate CSV format
        let csv = 'Group,Count,Amount,Tax Amount,Tax Deductible Amount\n';
        
        groupedExpensesArray.forEach(group => {
          csv += `"${group.name}",${group.count},${group.amount.toFixed(2)},${group.taxAmount.toFixed(2)},${group.taxDeductibleAmount.toFixed(2)}\n`;
          
          if (reportType === 'detailed') {
            csv += 'Date,Description,Category,Vendor,Amount,Tax Amount,Status\n';
            
            group.expenses.forEach(expense => {
              csv += `${moment(expense.transaction_date).format('MM/DD/YYYY')},"${expense.description}","${expense.category_name || ''}","${expense.vendor_name || ''}",${parseFloat(expense.amount).toFixed(2)},${parseFloat(expense.tax_amount).toFixed(2)},${expense.status}\n`;
            });
            
            csv += '\n';
          }
        });
        
        return {
          content: csv,
          filename: `expense_report_${moment(startDate).format('YYYY-MM-DD')}_to_${moment(endDate).format('YYYY-MM-DD')}.csv`,
          contentType: 'text/csv'
        };
      } else if (format === 'pdf') {
        // For PDF generation, we would typically use a library like PDFKit
        // This is a placeholder for the actual implementation
        return {
          message: 'PDF generation would be implemented here',
          report
        };
      } else {
        throw new Error('Unsupported report format');
      }
    } catch (error) {
      console.error('Error generating expense report:', error);
      throw new Error(`Failed to generate expense report: ${error.message}`);
    }
  }

  /**
   * Get expense statistics
   * 
   * @param {Object} filters - Filter parameters
   * @param {number} filters.propertyId - Filter by property ID
   * @param {Date} filters.startDate - Filter by start date
   * @param {Date} filters.endDate - Filter by end date
   * @param {string} filters.period - Period for trend data ('month', 'quarter', 'year')
   * @returns {Promise<Object>} - Expense statistics
   */
  async getExpenseStatistics(filters) {
    try {
      const {
        propertyId,
        startDate = moment().subtract(12, 'months').startOf('month').toDate(),
        endDate = moment().endOf('month').toDate(),
        period = 'month'
      } = filters;
      
      // Validate property ID
      if (!propertyId) {
        throw new Error('Property ID is required');
      }
      
      // Get property details
      const propertyQuery = `
        SELECT id, name FROM properties WHERE id = $1
      `;
      
      const propertyResult = await this.pool.query(propertyQuery, [propertyId]);
      
      if (propertyResult.rows.length === 0) {
        throw new Error('Property not found');
      }
      
      const property = propertyResult.rows[0];
      
      // Get all expenses for the period
      const expensesQuery = `
        SELECT 
          e.*,
          ec.name AS category_name,
          ec.is_tax_deductible
        FROM expenses e
        LEFT JOIN expense_categories ec ON e.expense_category_id = ec.id
        WHERE e.property_id = $1
        AND e.transaction_date >= $2
        AND e.transaction_date <= $3
      `;
      
      const expensesResult = await this.pool.query(expensesQuery, [propertyId, startDate, endDate]);
      const expenses = expensesResult.rows;
      
      // Calculate summary statistics
      const totalExpenses = expenses.length;
      const totalAmount = expenses.reduce((sum, e) => sum + parseFloat(e.amount), 0);
      const totalTaxAmount = expenses.reduce((sum, e) => sum + parseFloat(e.tax_amount), 0);
      const taxDeductibleAmount = expenses
        .filter(e => e.is_tax_deductible)
        .reduce((sum, e) => sum + parseFloat(e.amount), 0);
      
      const pendingExpenses = expenses.filter(e => e.status === 'pending').length;
      const pendingAmount = expenses
        .filter(e => e.status === 'pending')
        .reduce((sum, e) => sum + parseFloat(e.amount), 0);
      
      // Group expenses by category
      const categoryExpenses = {};
      
      expenses.forEach(expense => {
        const categoryId = expense.expense_category_id;
        const categoryName = expense.category_name || 'Uncategorized';
        
        if (!categoryExpenses[categoryId]) {
          categoryExpenses[categoryId] = {
            id: categoryId,
            name: categoryName,
            count: 0,
            amount: 0,
            percentage: 0
          };
        }
        
        categoryExpenses[categoryId].count++;
        categoryExpenses[categoryId].amount += parseFloat(expense.amount);
      });
      
      // Calculate percentages and convert to array
      Object.values(categoryExpenses).forEach(category => {
        category.percentage = totalAmount > 0 ? (category.amount / totalAmount) * 100 : 0;
      });
      
      const topCategories = Object.values(categoryExpenses)
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 5);
      
      // Generate trend data
      const trendData = this.generateExpenseTrendData(expenses, startDate, endDate, period);
      
      // Construct the statistics object
      const statistics = {
        property,
        period: {
          startDate,
          endDate
        },
        summary: {
          totalExpenses,
          totalAmount,
          totalTaxAmount,
          taxDeductibleAmount,
          nonTaxDeductibleAmount: totalAmount - taxDeductibleAmount,
          pendingExpenses,
          pendingAmount,
          averageExpenseAmount: totalExpenses > 0 ? totalAmount / totalExpenses : 0
        },
        topCategories,
        trends: trendData
      };
      
      return statistics;
    } catch (error) {
      console.error('Error getting expense statistics:', error);
      throw new Error(`Failed to get expense statistics: ${error.message}`);
    }
  }

  /**
   * Generate expense trend data
   * 
   * @param {Array} expenses - Array of expenses
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @param {string} period - Period ('month', 'quarter', 'year')
   * @returns {Object} - Trend data
   */
  generateExpenseTrendData(expenses, startDate, endDate, period) {
    // Determine period format
    let periodFormat;
    let periodDuration;
    
    switch (period) {
      case 'month':
        periodFormat = 'YYYY-MM';
        periodDuration = 'month';
        break;
      case 'quarter':
        periodFormat = 'YYYY-[Q]Q';
        periodDuration = 'quarter';
        break;
      case 'year':
        periodFormat = 'YYYY';
        periodDuration = 'year';
        break;
      default:
        periodFormat = 'YYYY-MM';
        periodDuration = 'month';
    }
    
    // Generate all periods between start and end dates
    const periods = [];
    let currentDate = moment(startDate).startOf(periodDuration);
    const endMoment = moment(endDate).endOf(periodDuration);
    
    while (currentDate.isSameOrBefore(endMoment)) {
      periods.push(currentDate.format(periodFormat));
      currentDate.add(1, periodDuration);
    }
    
    // Initialize trend data
    const trendData = {
      periods,
      amounts: Array(periods.length).fill(0),
      counts: Array(periods.length).fill(0)
    };
    
    // Group expenses by period
    expenses.forEach(expense => {
      const expensePeriod = moment(expense.transaction_date).format(periodFormat);
      const periodIndex = periods.indexOf(expensePeriod);
      
      if (periodIndex !== -1) {
        trendData.amounts[periodIndex] += parseFloat(expense.amount);
        trendData.counts[periodIndex]++;
      }
    });
    
    return trendData;
  }

  /**
   * Process recurring expenses
   * 
   * @param {Date} asOfDate - The date to process recurring expenses as of
   * @param {number} userId - The ID of the user processing the recurring expenses
   * @returns {Promise<Object>} - Processing results
   */
  async processRecurringExpenses(asOfDate = new Date(), userId) {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Get all active recurring payments for expenses
      const recurringPaymentsQuery = `
        SELECT 
          rp.*,
          l.property_id,
          l.unit_id,
          e.expense_category_id,
          e.vendor_id,
          e.description,
          e.amount,
          e.tax_amount
        FROM recurring_payments rp
        JOIN leases l ON rp.lease_id = l.id
        LEFT JOIN expenses e ON rp.id = e.recurring_payment_id
        WHERE rp.is_active = true
        AND rp.payment_type = 'expense'
        AND rp.start_date <= $1
        AND (rp.end_date IS NULL OR rp.end_date >= $1)
        GROUP BY rp.id, l.property_id, l.unit_id, e.expense_category_id, e.vendor_id, e.description, e.amount, e.tax_amount
      `;
      
      const recurringPaymentsResult = await client.query(recurringPaymentsQuery, [asOfDate]);
      const recurringPayments = recurringPaymentsResult.rows;
      
      const results = {
        totalRecurringPayments: recurringPayments.length,
        expensesCreated: 0,
        expensesSkipped: 0,
        createdExpenses: [],
        errors: []
      };
      
      // Process each recurring payment
      for (const payment of recurringPayments) {
        try {
          // Calculate due date for current period
          let dueDate;
          
          if (payment.frequency === 'monthly') {
            dueDate = moment(asOfDate).date(payment.due_day);
            if (dueDate.isAfter(asOfDate)) {
              dueDate.subtract(1, 'month');
            }
          } else if (payment.frequency === 'quarterly') {
            const quarterStartMonth = Math.floor((moment(asOfDate).month()) / 3) * 3;
            dueDate = moment(asOfDate).month(quarterStartMonth).date(payment.due_day);
            if (dueDate.isAfter(asOfDate)) {
              dueDate.subtract(3, 'month');
            }
          } else if (payment.frequency === 'annual') {
            dueDate = moment(asOfDate).month(moment(payment.start_date).month()).date(payment.due_day);
            if (dueDate.isAfter(asOfDate)) {
              dueDate.subtract(1, 'year');
            }
          }
          
          // Check if expense already exists for this period
          const existingExpenseQuery = `
            SELECT COUNT(*) AS count
            FROM expenses
            WHERE recurring_payment_id = $1
            AND transaction_date >= $2
            AND transaction_date <= $3
          `;
          
          const periodStart = moment(dueDate).startOf('month').format('YYYY-MM-DD');
          const periodEnd = moment(dueDate).endOf('month').format('YYYY-MM-DD');
          
          const existingExpenseResult = await client.query(existingExpenseQuery, [
            payment.id,
            periodStart,
            periodEnd
          ]);
          
          if (parseInt(existingExpenseResult.rows[0].count) > 0) {
            results.expensesSkipped++;
            continue;
          }
          
          // Create the expense
          const insertQuery = `
            INSERT INTO expenses (
              property_id,
              unit_id,
              expense_category_id,
              vendor_id,
              amount,
              tax_amount,
              transaction_date,
              due_date,
              description,
              is_recurring,
              recurring_payment_id,
              status,
              created_by,
              created_at,
              updated_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true, $10, 'pending', $11, NOW(), NOW())
            RETURNING *
          `;
          
          const insertValues = [
            payment.property_id,
            payment.unit_id,
            payment.expense_category_id,
            payment.vendor_id,
            payment.amount,
            payment.tax_amount,
            dueDate.format('YYYY-MM-DD'),
            dueDate.format('YYYY-MM-DD'),
            payment.description || `Recurring expense for ${moment(dueDate).format('MMMM YYYY')}`,
            payment.id,
            userId
          ];
          
          const insertResult = await client.query(insertQuery, insertValues);
          const expense = insertResult.rows[0];
          
          results.expensesCreated++;
          results.createdExpenses.push(expense);
        } catch (error) {
          console.error(`Error processing recurring payment ${payment.id}:`, error);
          results.errors.push({
            recurringPaymentId: payment.id,
            error: error.message
          });
        }
      }
      
      await client.query('COMMIT');
      
      return results;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error processing recurring expenses:', error);
      throw new Error(`Failed to process recurring expenses: ${error.message}`);
    } finally {
      client.release();
    }
  }
}

module.exports = ExpenseManagementService;
