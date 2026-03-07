import AcademicModel from "../../models/MySQL/AcademicModel.js";

class AcademicController {
  constructor() {
    this.__controllerName = "Academic Controller";
    this.academicModel = new AcademicModel();
  }

  indexAction(req, res) {
    return res.json({
      message: "Academic API is running!",
    });
  }

  async get_latest_academic(req, res) {
    try {
      const result = await this.academicModel.getLatestAcademic();
      return res.json({ success: true, data: result });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  async get_active_academic(req, res) {
    try {
      const result = await this.academicModel.getActiveAcademic();

      if (!result)
        return res.status(404).json({
          success: false,
          message: "No active academic term found",
        });

      return res.json({ success: true, data: result });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  async get_all_academic(req, res) {
    try {
      const result = await this.academicModel.getAllAcademic();
      return res.json({ success: true, data: result });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  async create_academic(req, res) {
    try {
      const account_id = res.locals.account_id;

      const id = await this.academicModel.createAcademicTerm({
        ...req.body,
        created_by: account_id,
      });

      return res.status(201).json({
        success: true,
        message: "Academic term created successfully",
        insertId: id,
      });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  async update_academic(req, res) {
    try {
      const { id } = req.params;

      await this.academicModel.updateAcademicTerm(id, req.body);

      return res.json({
        success: true,
        message: "Academic term updated successfully",
      });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }
}

export default AcademicController;
