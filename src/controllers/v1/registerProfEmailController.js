import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';
import xlsx from 'xlsx';
import RegisteredProfEmail from '../../models/MySQL/registerProfEmailModel.js';


class RegisterProfEmailController {
  constructor() {
    this.__controllerName = 'Prof Email Registration';
    this.model = new RegisteredProfEmail();
  }

  /**
   * Health check
   */
  indexAction(req, res) {
    return res.json({
      message: 'Email Registration API is up and running!',
      controller: this.__controllerName,
    });
  }

  async registerEmailAction(req, res) {
  try {
    let { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    let emails = [];

    // if comma separated string
    if (typeof email === "string") {
      emails = email.split(",").map(e => e.trim().toLowerCase());
    }

    // if array
    if (Array.isArray(email)) {
      emails = email.map(e => e.trim().toLowerCase());
    }

    const gmailRegex = /^[a-zA-Z0-9._%+-]+@gmail\.com$/;

    for (const e of emails) {
      if (!gmailRegex.test(e)) {
        return res.status(400).json({
          message: `Invalid Gmail address: ${e}`
        });
      }
    }

    const result = await this.model.registerEmails(emails);

    return res.status(201).json({
      message: 'Email registration completed',
      ...result
    });

  } catch (err) {
    return res.status(500).json({
      message: "Email registration failed",
      error: err.message
    });
  }
}

  /**
   * Bulk register emails (CSV / EXCEL) - GMAIL ONLY
   */
  async bulkRegisterAction(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({
          message: 'CSV or Excel file is required',
        });
      }

      const gmailRegex = /^[a-zA-Z0-9._%+-]+@gmail\.com$/;
      const emails = new Set(); // avoid duplicates
      const ext = path.extname(req.file.originalname).toLowerCase();

      // ===== CSV =====
      if (ext === '.csv') {
        let emailColumn = null;

        fs.createReadStream(req.file.path)
          .pipe(csv())
          .on('headers', headers => {
            emailColumn = headers.find(h =>
              h.toLowerCase().includes('email')
            );

            if (!emailColumn) {
              throw new Error('No email column found in CSV file');
            }
          })
          .on('data', row => {
            const email = row[emailColumn]?.trim().toLowerCase();
            if (gmailRegex.test(email)) {
              emails.add(email);
            }
          })
          .on('end', async () => {
            fs.unlinkSync(req.file.path);

            if (!emails.size) {
              return res.status(400).json({
                message: 'No valid Gmail addresses found',
              });
            }

            const result = await this.model.bulkRegisterEmails([...emails]);

            return res.json({
              message: 'Bulk email registration completed',
              total: emails.size,
              ...result
            });
          });

      // ===== EXCEL =====
      } else if (ext === '.xlsx' || ext === '.xls') {
        const workbook = xlsx.readFile(req.file.path);
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rows = xlsx.utils.sheet_to_json(sheet);

        fs.unlinkSync(req.file.path);

        if (!rows.length) {
          return res.status(400).json({
            message: 'Excel file is empty',
          });
        }

        const emailKey = Object.keys(rows[0]).find(key =>
          key.toLowerCase().includes('email')
        );

        if (!emailKey) {
          return res.status(400).json({
            message: 'No email column found in Excel file',
          });
        }

        for (const row of rows) {
          const email = row[emailKey]?.toString().trim().toLowerCase();
          if (gmailRegex.test(email)) {
            emails.add(email);
          }
        }

        if (!emails.size) {
          return res.status(400).json({
            message: 'No valid Gmail addresses found',
          });
        }

        const result = await this.model.bulkRegisterEmails([...emails]);

        return res.json({
          message: 'Bulk email registration completed',
          total: emails.size,
          ...result
        });

      // ===== INVALID FILE =====
      } else {
        fs.unlinkSync(req.file.path);
        return res.status(400).json({
          message: 'Only CSV or Excel files are allowed',
        });
      }

    } catch (err) {
      return res.status(500).json({
        message: 'Bulk registration failed',
        error: err.message,
      });
    }
  }


  async getAllEmailsAction(req, res) {
    try {
      const emails = await this.model.getAllRegisteredProfessors(); 
      return res.json({ emails });
    } catch (err) {
      return res.status(500).json({
        message: 'Failed to retrieve emails',
        error: err.message,
      });
    }
  }

  async deleteEmailAction(req, res) {
    try {
      const { email } = req.params;
      
      if (!email) {
        return res.status(400).json({
          message: "Email parameter is required",
        });
      }
      
      const result = await this.model.deleteEmail(email);
      
      if (!result.deleted) {
        return res.status(404).json({
          message: "No records found for this email",
          email,
        });
      }
      
      return res.json({
        message: "All associated records deleted successfully",
        email,
        summary: {
          totalDeleted: result.totalDeleted,
          breakdown: result.deletedRecords
        }
      });
    } catch (err) {
      return res.status(500).json({
        message: "Failed to delete email and associated records",
        error: err.message,
      });
    }
  }
}

export default RegisterProfEmailController;