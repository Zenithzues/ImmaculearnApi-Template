// utils/Validator.js
export class Validator {
  // Strict validation for @gmail.com only
  static validateEmail(email) {
    // Must end with @gmail.com exactly
    const gmailRegex = /^[a-zA-Z0-9._%+-]+@gmail\.com$/;
    
    // Optional: Also check for common variations
    // This regex allows: username@gmail.com
    // But not: username+something@gmail.com or username.something@gmail.com 
    // unless you want to allow those
    const strictGmailRegex = /^[a-z0-9](\.?[a-z0-9]){5,}@gmail\.com$/i;
    
    // For more flexibility (allows dots, plus signs):
    const flexibleGmailRegex = /^[a-zA-Z0-9][a-zA-Z0-9._%+-]*@gmail\.com$/;
    
    return gmailRegex.test(email.trim().toLowerCase());
  }

  // If you want to be very strict about Gmail format rules:
  static validateStrictGmail(email) {
    const emailLower = email.trim().toLowerCase();
    
    // Must end with @gmail.com
    if (!emailLower.endsWith('@gmail.com')) {
      return false;
    }
    
    const username = emailLower.split('@')[0];
    
    // Gmail username rules:
    // 1. Length: 6-30 characters
    if (username.length < 6 || username.length > 30) {
      return false;
    }
    
    // 2. Must start with letter or number
    if (!/^[a-z0-9]/.test(username)) {
      return false;
    }
    
    // 3. Can contain letters, numbers, dots (.)
    //    but cannot start or end with dot, cannot have consecutive dots
    if (/^\.|\.$|\.\./.test(username)) {
      return false;
    }
    
    // 4. Can contain plus sign (+) for email aliases
    //    Everything after + is ignored by Gmail
    if (username.includes('+')) {
      const parts = username.split('+');
      if (parts[0].length < 6) {
        return false;
      }
    }
    
    // 5. Valid characters: a-z, 0-9, ., +
    const validChars = /^[a-z0-9.+]+$/;
    return validChars.test(username);
  }

  // Allow multiple Gmail domains (gmail.com, googlemail.com)
  static validateGoogleEmail(email) {
    const googleDomains = ['gmail.com', 'googlemail.com'];
    const emailLower = email.trim().toLowerCase();
    
    // Check if email ends with any Google domain
    return googleDomains.some(domain => emailLower.endsWith(`@${domain}`));
  }

  // For company requirements: @gmail.com or specific company domains
  static validateCompanyEmail(email, allowedDomains = ['gmail.com', 'company.com']) {
    const emailLower = email.trim().toLowerCase();
    
    return allowedDomains.some(domain => 
      emailLower.endsWith(`@${domain}`) && 
      /^[a-zA-Z0-9][a-zA-Z0-9._%+-]*@/.test(emailLower)
    );
  }

  static validatePassword(password) {
    // At least 8 characters, 1 uppercase, 1 lowercase, 1 number, 1 special character
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    return passwordRegex.test(password);
  }

  static validateUsername(username) {
    // Username validation (for display names, not email)
    const usernameRegex = /^[a-zA-Z0-9_-]{3,20}$/;
    return usernameRegex.test(username);
  }

  // Email with custom error messages
  static validateEmailWithFeedback(email) {
    const emailTrimmed = email ? email.trim() : '';
    
    if (!emailTrimmed) {
      return { valid: false, message: 'Email is required' };
    }
    
    // Check basic format
    const basicRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!basicRegex.test(emailTrimmed)) {
      return { valid: false, message: 'Invalid email format' };
    }
    
    // Check for @gmail.com
    const emailLower = emailTrimmed.toLowerCase();
    if (!emailLower.endsWith('@gmail.com')) {
      return { valid: false, message: 'Only @gmail.com addresses are allowed' };
    }
    
    // Check username part
    const username = emailLower.split('@')[0];
    if (username.length < 6) {
      return { valid: false, message: 'Gmail username must be at least 6 characters' };
    }
    
    if (username.length > 30) {
      return { valid: false, message: 'Gmail username cannot exceed 30 characters' };
    }
    
    if (!/^[a-z0-9]/.test(username)) {
      return { valid: false, message: 'Gmail username must start with a letter or number' };
    }
    
    if (/^\.|\.$|\.\./.test(username)) {
      return { valid: false, message: 'Gmail username cannot start, end, or have consecutive dots' };
    }
    
    // Check for invalid characters
    if (!/^[a-z0-9.+]+$/.test(username)) {
      return { valid: false, message: 'Gmail username contains invalid characters' };
    }
    
    return { valid: true, message: 'Valid Gmail address' };
  }
  
  // Batch validate multiple emails
  static validateEmails(emails) {
    const results = {
      valid: [],
      invalid: []
    };
    
    emails.forEach(email => {
      const validation = this.validateEmailWithFeedback(email);
      if (validation.valid) {
        results.valid.push(email);
      } else {
        results.invalid.push({
          email,
          reason: validation.message
        });
      }
    });
    
    return results;
  }

  // Additional validators...
  static validateUUID(uuid) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }

  static validateRoomName(name) {
    return name && name.length >= 1 && name.length <= 100;
  }

  static validateMessageContent(content) {
    return content && content.trim().length > 0 && content.length <= 2000;
  }

  static sanitizeInput(input) {
    if (typeof input !== 'string') return input;
    
    return input
      .trim()
      .replace(/[<>]/g, '')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }

  static validateJSON(jsonString) {
    try {
      JSON.parse(jsonString);
      return true;
    } catch {
      return false;
    }
  }

  static validatePaginationParams(page, limit) {
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 50;
    
    return {
      page: pageNum > 0 ? pageNum : 1,
      limit: limitNum > 0 && limitNum <= 100 ? limitNum : 50,
      offset: (pageNum - 1) * limitNum
    };
  }

  static validateDate(dateString) {
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date);
  }

  static validateWebSocketMessage(message) {
    try {
      const parsed = JSON.parse(message);
      
      if (!parsed.type) {
        return { valid: false, error: 'Message type is required' };
      }
      
      if (!['yjs-update', 'chat-message', 'typing', 'awareness-update', 'ping'].includes(parsed.type)) {
        return { valid: false, error: 'Invalid message type' };
      }
      
      return { valid: true, data: parsed };
    } catch (error) {
      return { valid: false, error: 'Invalid JSON format' };
    }
  }
}