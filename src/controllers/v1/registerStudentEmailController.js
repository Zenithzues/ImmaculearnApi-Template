import fs from "fs";
import path from "path";
import csv from "csv-parser";
import xlsx from "xlsx";
import RegisteredEmail from "../../models/MySQL/registerStudentEmailModel.js";

class RegisterStudentEmailController {
  constructor() {
    this.__controllerName = "Email Registration";
    this.model = new RegisteredEmail();
  }

  indexAction(req, res) {
    return res.json({
      message: "Email Registration API is running",
    });
  }

  /*
  ========================================
  REGISTER SINGLE EMAIL
  ========================================
  */
  async registerEmailAction(req, res) {
    try {
      let { email } = req.body;

      if (!email) {
        return res.status(400).json({
          message: "Email is required",
        });
      }

      email = email.trim().toLowerCase();

      const gmailRegex = /^[a-zA-Z0-9._%+-]+@gmail\.com$/;

      if (!gmailRegex.test(email)) {
        return res.status(400).json({
          message: "Only Gmail addresses are allowed",
        });
      }

      const result = await this.model.one_email(email);

      return res.status(201).json(result);

    } catch (err) {
      return res.status(500).json({
        message: "Registration failed",
        error: err.message,
      });
    }
  }

  /*
  ========================================
  BULK REGISTER
  ========================================
  */
  async bulkRegisterAction(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({
          message: "CSV or Excel file required",
        });
      }

      const gmailRegex = /^[a-zA-Z0-9._%+-]+@gmail\.com$/;
      const emails = new Set();
      const ext = path.extname(req.file.originalname).toLowerCase();

      // ===== CSV =====
      if (ext === ".csv") {
        await new Promise((resolve, reject) => {
          fs.createReadStream(req.file.path)
            .pipe(csv())
            .on("data", row => {
              const emailKey = Object.keys(row).find(k =>
                k.toLowerCase().includes("email")
              );

              if (emailKey) {
                const email = row[emailKey]?.trim().toLowerCase();
                if (gmailRegex.test(email)) {
                  emails.add(email);
                }
              }
            })
            .on("end", resolve)
            .on("error", reject);
        });
      }

      // ===== EXCEL =====
      else if (ext === ".xlsx" || ext === ".xls") {
        const workbook = xlsx.readFile(req.file.path);
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = xlsx.utils.sheet_to_json(sheet);

        const emailKey = Object.keys(rows[0]).find(k =>
          k.toLowerCase().includes("email")
        );

        if (!emailKey) {
          return res.status(400).json({
            message: "No email column found",
          });
        }

        for (const row of rows) {
          const email = row[emailKey]?.toString().trim().toLowerCase();
          if (gmailRegex.test(email)) {
            emails.add(email);
          }
        }
      }

      else {
        fs.unlinkSync(req.file.path);
        return res.status(400).json({
          message: "Only CSV or Excel allowed",
        });
      }

      fs.unlinkSync(req.file.path);

      const result = await this.model.bulkRegisterEmails([...emails]);

      return res.json({
        message: "Bulk registration completed",
        ...result,
      });

    } catch (err) {
      return res.status(500).json({
        message: "Bulk registration failed",
        error: err.message,
      });
    }
  }

  /*
  ========================================
  GET ALL REGISTERED STUDENTS
  ========================================
  */
  async getAllEmailsAction(req, res) {
    try {
      const students = await this.model.getAllRegisteredStudents();
      return res.json({ students });
    } catch (err) {
      return res.status(500).json({
        message: "Failed to retrieve students",
        error: err.message,
      });
    }
  }
}

export default RegisterStudentEmailController;