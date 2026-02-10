import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';
import xlsx from 'xlsx';
import RegisteredEmail from '../../models/MySQL/registerStudentEmailModel.js';


class RegisterStudentEmailController {
  constructor() { 
    this.__controllerName = 'Email Registration';
    this.model = new RegisteredEmail();
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

  /**
   * Register single email (GMAIL ONLY)
   */
  async registerEmailAction(req, res) {
    try {
      let { email } = req.body;

      if (!email) {
        return res.status(400).json({ message: 'Email is required' });
      }

      email = email.trim().toLowerCase();

      const gmailRegex = /^[a-zA-Z0-9._%+-]+@gmail\.com$/;
      if (!gmailRegex.test(email)) {
        return res.status(400).json({
          message: 'Only Gmail addresses are allowed',
        });
      }

      const result = await this.model.one_email(email);

      return res.status(201).json(result);
    } catch (err) {
      return res.status(500).json({
        message: 'Email registration failed',
        error: err.message,
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

            await this.model.bulkRegisterEmails([...emails]);

            return res.json({
              message: 'Bulk email registration completed',
              total: emails.size,
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

        await this.model.bulkRegisterEmails([...emails]);

        return res.json({
          message: 'Bulk email registration completed',
          total: emails.size,
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
      const emails = await this.model.getAllRegisteredEmails(); 
      return res.json({ emails });
    } catch (err) {
      return res.status(500).json({
        message: 'Failed to retrieve emails',
        error: err.message,
      });
    }
  }
}

export default RegisterStudentEmailController;