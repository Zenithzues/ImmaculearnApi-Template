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

export default RegisterStudentEmailController;