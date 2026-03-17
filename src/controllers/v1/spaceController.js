// import User from '../../models/user.js';
// import Space from '../../models/MySQL/SpaceModel.js';
import jwt from "jsonwebtoken";
import Space from "../../models/MySQL/SpaceModel.js";
import { Logger } from "../../utils/Logger.js";
import maskEmail from "../../utils/maskEmail.js";
import maskFullName from "../../utils/maskFullName.js";
import User from "../../models/MySQL/UserModel.js";
import { getIO } from "../../core/socket.io.js";
import AdminModel from "../../models/MySQL/AdminModel.js";

class SpaceController {
  constructor() {
    this.acadTerm = new AdminModel();
    this.space = new Space();
    this.user = new User();
    this.logger = new Logger("SpaceController");
  }

  async create_space(req, res) {
    try {
      const {
        space_name,
        space_description = "",
        space_cover,
        space_settings,
      } = req.body || {};

      // console.log(space_settings)

      const defaultSettings = {
        space_cover: null,
        "max-member": 10,
      };

      const settingsValue = space_settings
        ? JSON.stringify(space_settings)
        : JSON.stringify(defaultSettings);

      console.log("DEBUG create_space:", {
        space_name,
        space_description,
        space_cover,
        space_settings,
      });

      const account_id = res.locals.account_id;

      if (!account_id)
        return res
          .status(401)
          .json({ success: false, message: "UnAuthenticated User!" });

      const result = await this.space.createSpace(
        account_id,
        space_name,
        space_description,
        space_cover,
        settingsValue,
      );

      // if (!result) res.json({ success: false, message: "Failed to create Space!"})

      res.json({
        success: true,
        message: "Creating Space Successfully!",
        space_uuid: result.space_uuid,
      });
    } catch (err) {
      res.json({
        success: false,
        message: err.toString(),
      });
      res.end();
    }
  }

  async create_course_space(req, res) {
    try {
      const account_id = res.locals.account_id;

      if (!account_id)
        return res
          .status(401)
          .json({ success: false, message: "UnAuthenticated User!" });
      const {
        space_name,
        space_description,
        space_section,
        space_cover,
        space_day,
        space_time_start,
        space_time_end,
        space_yr_lvl,
        space_settings,
      } = req.body || {};

      // console.log(space_settings)

      const defaultSettings = {
        space_cover: null,
        "max-member": 50,
      };

      const settingsValue = space_settings
        ? JSON.stringify(space_settings)
        : JSON.stringify(defaultSettings);

      console.log(
        space_name,
        space_day,
        space_time_start,
        space_time_end,
        space_yr_lvl,
      );

      const academic = await this.acadTerm.getLatestAcademicTerm();

      if (!academic)
        return res.status(404).json({
          success: false,
          message:
            "the Academic Period Not Started Yet. Contact the Administrator.",
        });

      const result = await this.space.createCourseSpace(
        account_id,
        academic.acad_term_id,
        space_name,
        space_description,
        space_section,
        space_cover,
        space_day,
        space_time_start,
        space_time_end,
        space_yr_lvl,
        settingsValue,
      );

      // if (!result) res.json({ success: false, message: "Failed to create Space!"})

      res.json({
        success: true,
        message: "Creating Space Successfully!",
        space_uuid: result.space_uuid,
      });
    } catch (err) {
      if (err.code === "ER_DUP_ENTRY") {
        return res.status(409).json({
          success: false,
          message:
            "A classroom with the same time, day, year, and section already exists.”",
        });
      }
      res.json({
        success: false,
        message: err.toString(),
      });
      res.end();
    }
  }

  async joinSpace(req, res) {
    try {
      const account_id = res.locals.account_id;
      const { space_uuid } = req.body || {};

      if (!space_uuid)
        res.json({
          success: false,
          message: "Join space Unsuccessful.",
        });

      const space = await this.space.getBySpaceUuid(space_uuid);

      if (account_id === space[0].created_by)
        return res.json({
          success: false,
          message: "Invalid Request Joining in Your own Space",
        });

      if (!space)
        return res.json({ success: false, message: "Invalid Request" });
      await this.space.joinSpace(account_id, space[0].space_id);

      res.json({
        success: true,
        message: "Successfully Join, Wait for Aprroval of Space Owner",
      });
    } catch (err) {
      res.json({
        success: false,
        message: err.toString(),
      });
      res.end();
    }
  }

  async join_space_directly(req, res) {
    try {
      const account_id = res.locals.account_id || 23;
      const { space_uuid } = req.body || {};

      if (!space_uuid) {
        return res.json({
          success: false,
          message: "Space UUID is required.",
        });
      }

      // Try to get space from regular spaces first
      let space = await this.space.getBySpaceUuid(space_uuid);
      let spaceType = "regular";

      // If not found in regular spaces, try course spaces
      if (!space || !space.length) {
        space = await this.space.getByCourseSpaceUuid(space_uuid);
        spaceType = "course";
      }

      if (!space || !space.length) {
        return res.json({
          success: false,
          message: "Invalid space.",
        });
      }

      // Get the appropriate space_id based on type
      const space_id = space[0].space_id;

      // Check if user is the creator
      if (account_id === space[0].created_by) {
        return res.json({
          success: false,
          message: "You cannot join your own space.",
        });
      }

      // Call joinSpaceDirectly with the space_id and let it handle the type internally
      const result = await this.space.joinSpaceDirectly(account_id, space_id);

      // Only emit socket event if join was successful and result exists
      if (result && result === true) {
        try {
          const io = getIO();
          if (io && typeof io.emit === "function") {
            io.emit("accept_space_invitation", {
              space_id,
              owner_id: space[0].created_by,
            });
          }
        } catch (socketErr) {
          // Log socket error but don't fail the request
          console.error("Socket emission failed:", socketErr);
        }
      }

      return res.json({
        success: true,
        message: "Successfully joined the space.",
      });
    } catch (err) {
      return res.json({
        success: false,
        message: err.message,
      });
    }
  }

  async join_space_by_link(req, res) {
    try {
      const account_id = res.locals.account_id;
      const { space_uuid } = req.body || {};

      if (!space_uuid) {
        return res.status(400).json({
          success: false,
          message: "Space UUID is required.",
        });
      }

      let spaceData = null;
      let isCourseSpace = false;

      // 1️⃣ Check course space first
      const courseSpace = await this.space.getByCourseSpaceUuid(space_uuid);

      if (courseSpace && courseSpace.length > 0) {
        spaceData = courseSpace[0];
        isCourseSpace = true;
      } else {
        // 2️⃣ Check regular space
        const space = await this.space.getBySpaceUuid(space_uuid);
        if (space && space.length > 0) {
          spaceData = space[0];
        }
      }

      // 3️⃣ If not found in both
      if (!spaceData) {
        return res.status(404).json({
          success: false,
          message: "Invalid space UUID.",
        });
      }

      // 4️⃣ Prevent joining own space
      if (account_id === spaceData.created_by) {
        return res.json({
          success: false,
          message: "You cannot join your own space.",
        });
      }

      // 5️⃣ Join request via link (creates pending invitation)
      await this.space.joinSpaceByLink(account_id, spaceData.space_id);

      // 6️⃣ Emit socket event if needed
      const io = getIO();
      if (io) {
        io.emit("join_space_by_link", { space_id: spaceData.space_id });
      }

      return res.json({
        success: true,
        message: isCourseSpace
          ? "Join request sent for course space. Waiting for approval."
          : "Join request sent. Waiting for owner approval.",
      });
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: err.message,
      });
    }
  }

  async get_join_space_by_link(req, res) {
    try {
      const { space_uuid } = req.params;

      if (!space_uuid) {
        return res.status(400).json({
          success: false,
          message: "Space UUID is required.",
        });
      }

      // Check if it's a course space first
      const courseSpace = await this.space.getByCourseSpaceUuid(space_uuid);

      console.log("COURSE", courseSpace);

      if (courseSpace && courseSpace.length > 0) {
        // It's a course space - get pending requests for course space
        const results = await this.space.getPendingCourseLinkRequests(
          courseSpace[0].space_id,
        );

        return res.json({
          success: true,
          message: "Successfully get all pending approvals for course space",
          data: results,
        });
      }

      // Get regular space
      const space = await this.space.getBySpaceUuid(space_uuid);

      if (!space || space.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Invalid space.",
        });
      }

      // Only fetch pending link_request invitations for this regular space
      const results = await this.space.getPendingLinkRequests(
        space[0].space_id,
      );

      return res.json({
        success: true,
        message: "Successfully get all pending approvals",
        data: results,
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({
        success: false,
        message: err.message,
      });
    }
  }

  async get_all_join_space_by_link(req, res) {
    try {
      const account_id = res.locals.account_id;
      if (!account_id)
        return res
          .status(401)
          .json({ success: false, message: "UnAuthenticated User!" });

      const results = await this.space.getAllPendingLinkRequests(account_id);

      return res.json({
        success: true,
        message: "Successfully fetched all pending approvals",
        data: results,
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({
        success: false,
        message: err.message,
      });
    }
  }

  async get_all_space_invitations(req, res) {
    try {
      const account_id = res.locals.account_id;
      if (!account_id)
        return res
          .status(401)
          .json({ success: false, message: "UnAuthenticated User!" });

      const results =
        await this.space.getDirectInvitationsForAccount(account_id);

      return res.json({
        success: true,
        message: "Successfully fetched all pending invitations for spaces",
        data: results,
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({
        success: false,
        message: err.message,
      });
    }
  }

  async accept_user_by_joining_link(req, res) {
    try {
      const owner_id = res.locals.account_id;
      const { space_uuid, invited_account_id } = req.body || {};

      console.log(space_uuid);

      if (!space_uuid || !invited_account_id) {
        return res.json({
          success: false,
          message: "Space UUID and invited account id are required.",
        });
      }

      let space;

      space = await this.space.getBySpaceUuid(space_uuid);

      if (!space || space.length === 0) {
        space = await this.space.getByCourseSpaceUuid(space_uuid);
      }

      if (!space || space.length === 0) {
        return res.json({
          success: false,
          message: "Invalid space.",
        });
      }

      // Only owner can approve
      if (owner_id !== space[0].created_by) {
        return res.json({
          success: false,
          message: "Only space owner can approve requests.",
        });
      }

      await this.space.approveLinkJoinRequest(
        space[0].space_id,
        invited_account_id,
      );

      return res.json({
        success: true,
        message: "User approved successfully.",
      });
    } catch (err) {
      return res.json({
        success: false,
        message: err.message,
      });
    }
  }

  async decline_request(req, res) {
    try {
      const owner_id = res.locals.account_id;
      const { space_uuid, invited_account_id } = req.body || {};

      if (!space_uuid || !invited_account_id) {
        return res.json({
          success: false,
          message: "Space UUID and invited account id are required.",
        });
      }

      let space;

      space = await this.space.getBySpaceUuid(space_uuid);

      if (!space || space.length === 0) {
        space = await this.space.getByCourseSpaceUuid(space_uuid);
      }

      if (!space || space.length === 0) {
        return res.json({
          success: false,
          message: "Invalid space.",
        });
      }

      // Only owner can approve
      if (owner_id !== space[0].created_by) {
        return res.json({
          success: false,
          message: "Only space owner can approve requests.",
        });
      }

      await this.space.declineJoinRequest(
        space[0].space_id,
        invited_account_id,
      );

      return res.json({
        success: true,
        message: "Successfully Decline User.",
      });
    } catch (err) {
      return res.json({
        success: false,
        message: err.message,
      });
    }
  }

  async decline_space_invitation(req, res) {
    try {
      const account_id = res.locals.account_id;
      const { space_uuid } = req.body || {};

      if (!space_uuid) {
        return res.json({
          success: false,
          message: "Space UUID and invited account id are required.",
        });
      }

      let space = await this.space.getBySpaceUuid(space_uuid);

      if (!space || space.length === 0) {
        space = await this.space.getByCourseSpaceUuid(space_uuid);

        if (!space || space.length === 0)
          return res.json({
            success: false,
            message: "Invalid space.",
          });
      }

      // // Only owner can approve
      // if (owner_id !== space[0].created_by) {
      //   return res.json({
      //     success: false,
      //     message: "Only space owner can approve requests.",
      //   });
      // }

      await this.space.declineSpaceInvitation(account_id, space[0].space_id);

      return res.json({
        success: true,
        message: "Declined invitation successfully.",
      });
    } catch (err) {
      return res.json({
        success: false,
        message: err.message,
      });
    }
  }

  async add_user_in_space_by_reg_email(req, res) {
    try {
      const owner_id = res.locals.account_id || 1;
      const { space_uuid, email } = req.body || {};

      if (!space_uuid || !email) {
        return res.json({
          success: false,
          message: "Space UUID and email are required.",
        });
      }

      // Handle both single email and comma-separated multiple emails
      const emails = email.includes(",")
        ? email.split(",").map((e) => e.trim().toLowerCase())
        : [email.trim().toLowerCase()];

      let space;

      space = await this.space.getBySpaceUuid(space_uuid);

      if (!space || space.length === 0) {
        space = await this.space.getByCourseSpaceUuid(space_uuid);
      }

      if (!space || space.length === 0) {
        return res.json({
          success: false,
          message: "Invalid space.",
        });
      }

      // Only owner can invite
      if (space[0].created_by !== owner_id) {
        return res.json({
          success: false,
          message: "Only space owner can invite users.",
        });
      }

      const results = [];
      const io = getIO();

      for (const singleEmail of emails) {
        try {
          const isVerified = await this.user.findByEmail(singleEmail);

          if (!isVerified) {
            results.push({
              email: singleEmail,
              status: "failed",
              message: "Email not Verified",
            });
            continue;
          }

          if (isVerified.role === "professor") {
            results.push({
              email: singleEmail,
              status: "failed",
              message: "You can't invite Professor in Space.",
            });
            continue;
          }

          const response = await this.space.inviteUserByEmail(
            owner_id,
            space[0].space_id,
            singleEmail,
          );

          if (response) {
            results.push({
              email: singleEmail,
              status: "success",
              message: "Invitation sent successfully",
            });

            if (io) {
              io.emit("add-by-owner", {
                space_id: space[0].space_id,
                email: isVerified?.email,
              });
            }
          } else {
            results.push({
              email: singleEmail,
              status: "failed",
              message: "Failed to send invitation",
            });
          }
        } catch (err) {
          results.push({
            email: singleEmail,
            status: "failed",
            message: err.message,
          });
        }
      }

      const successCount = results.filter((r) => r.status === "success").length;
      const failedCount = results.filter((r) => r.status === "failed").length;

      return res.json({
        success: successCount > 0,
        message: `Processed ${emails.length} emails. ${successCount} successful, ${failedCount} failed.`,
        results: results,
      });
    } catch (err) {
      return res.json({
        success: false,
        message: err.message,
      });
    }
  }
  async get_space_by_id(req, res) {
    try {
      const token =
        req.cookies.accessToken ||
        req.headers.authorization?.replace("Bearer ", "");

      // this.logger.debug('Profile request', { hasToken: !!token });

      if (!token) {
        return res.status(401).json({
          success: false,
          message: "Not authenticated",
        });
      }

      let payload;
      try {
        payload = jwt.verify(token, process.env.JWT_SECRET);
        //   this.logger.debug('Token verified', { userId: payload.userId, role: payload.role });
      } catch (err) {
        this.logger.warn("Invalid token", { error: err.message });
        return res.status(401).json({
          success: false,
          message: "Invalid or expired token",
        });
      }
      // const {space_name, space_description} = req.body || {};
      const { space_id } = req.params || {};
      // const space_id = req.query.space_id

      const result = await this.space.getBySpaceId(space_id);

      if (result.length === 0)
        return res.json({ success: true, message: "Can't find space" });

      res.json({
        success: true,
        data: {
          space: {
            space_link: `${
              process.env.NODE_ENV === "production"
                ? "https://immaculearnapi-template-production.up.railway.app"
                : "http://localhost:3000"
            }/space/j?token=${result.space_uuid}`,
            space_name: result.space_name,
            space_description: result.description,
          },
        },
        // space_id: space_id,
        // account_id: account_id
      });
    } catch (err) {
      res.json({
        success: false,
        message: err.toString(),
      });
      res.end();
    }
  }

  async get_all_friends_space(req, res) {
    try {
      const account_id = res.locals.account_id;

      const result = await this.space.getAllFriendSpaces(account_id);

      // console.log(result)

      const spaces = result.map((item) => ({
        space_id: item.space_id,
        space_uuid: item.space_uuid,
        space_link: `${
          process.env.NODE_ENV === "production"
            ? "https://immaculearnapi-template-production.up.railway.app"
            : "http://localhost:3000"
        }/space/j?t=${item.space_uuid}`,
        space_name: item.space_name,
        space_description: item.description,
        creator: item.created_by,
        members: item.members.map((member) => ({
          ...member,
          full_name: maskFullName(member.full_name),
          email: maskEmail(member.email), // <-- mask email
        })),
      }));

      // console.log(spaces)

      res.json({
        success: true,
        message: "Successfully get all friends Spaces",
        data: spaces,
      });
    } catch (err) {
      res.json({
        success: false,
        message: err.toString(),
      });
    }
  }

  async get_all_course_spaces(req, res) {
    try {
      const account_id = res.locals.account_id;

      if (!account_id)
        return res
          .status(401)
          .json({ success: false, message: "UnAuthenticated User!" });

      const result = await this.space.getAllCourseSpaces(account_id);

      const spaces = result.map((item) => ({
        space_id: item.c_space_id,
        space_uuid: item.c_space_uuid,
        space_link: `${
          process.env.NODE_ENV === "production"
            ? "https://immaculearnapi-template-production.up.railway.app"
            : "http://localhost:3000"
        }/space/j?t=${item.c_space_uuid}`,
        space_name: item.c_space_name,
        space_description: item.c_space_description,
        space_cover: item.c_space_cover,
        space_day: item.c_space_day,
        space_time_start: item.c_space_time_start,
        space_time_end: item.c_space_time_end,
        space_yr_lvl: item.c_space_yr_lvl,
        space_section: item.c_space_section,
        academic_term: item.acad_term_name,
        academic_semester: item.semester,
        // space_description: item.description,
        // space_type: item.space_type,
        creator: item.created_by,
        professor: item.professor,
        members: item.members.map((member) => ({
          ...member,
          full_name: maskFullName(member.full_name),
          email: maskEmail(member.email), // <-- mask email
        })),
      }));

      // console.log(spaces)

      res.json({
        success: true,
        message: "Successfully get all course Spaces",
        data: spaces,
      });
    } catch (err) {
      res.json({
        success: false,
        message: err.toString(),
      });
    }
  }

  async get_all_space(req, res) {
    try {
      const account_id = res.locals.account_id;

      const result = await this.space.getAllSpace(account_id);

      const spaces = result.map((item) => ({
        space_id: item.space_id,
        space_uuid: item.space_uuid,
        space_link: `${
          process.env.NODE_ENV === "production"
            ? "https://immaculearnapi-template-production.up.railway.app"
            : "http://localhost:3000"
        }/space/j?t=${item.space_uuid}`,
        space_name: item.space_name,
        space_cover: item.space_cover,
        space_description: item.description,
        creator: item.created_by,
        members: item.members.map((member) => ({
          ...member,
          full_name: maskFullName(member.full_name),
          email: maskEmail(member.email), // <-- mask email
        })),
      }));

      // console.log(spaces)

      res.json({
        success: true,
        message: "Successfully get all user Spaces",
        data: spaces,
      });
    } catch (err) {
      res.json({
        success: false,
        message: err.toString(),
      });
    }
  }

  async get_join_requests_by_space_id(req, res) {
    try {
      const { space_uuid } = req.params || null;
      const account_id = res.locals.account_id;

      if (!space_uuid)
        return res.json({
          success: false,
          message: "Invalid Space ID",
        });

      const result = await this.space.getJoinRequestsBySpaceId(
        account_id,
        space_uuid,
      );

      res.json({
        success: true,
        message: "Successfully get all pending approvals",
        data: result,
      });
    } catch (err) {
      res.json({
        success: false,
        message: err.toString(),
      });
    }
  }

  async process_join_request_by_user_id(req, res) {
    try {
      const { space_uuid, user_id } = req.params || {};
      // const status = "accepted";
      const { status } = req.query || {};
      const account_id = res.locals.account_id;

      if (!space_uuid || !user_id || !status)
        return res.json({
          success: false,
          message: "Invalid Request",
        });

      if (!account_id)
        return res.json({
          success: false,
          message: "Unauthenticated user to process Approval Request.",
        });

      const result = await this.space.processJoinRequest(
        account_id,
        user_id,
        space_uuid,
        status,
      );

      if (result.row.affectedRows < 0)
        res.json({ success: false, message: "Failed to Accept Request" });
      if (result.row.affectedRows > 0)
        res.json({
          success: true,
          message: result.message,
        });

      // res.end()
    } catch (err) {
      res.json({
        success: false,
        message: err.toString(),
      });
    }
  }

  // async decline_join_request_by_user_id(req, res) {
  //     try {
  //         const { space_uuid, user_id } = req.params || {};
  //         const account_id = res.locals.account_id;

  //         if (!space_uuid || !user_id) return res.json({
  //             success: false,
  //             message: "Invalid Request"
  //         })

  //         if (!account_id) return res.json({
  //             success: false,
  //             message: "Unauthenticated user to process Approval Request."
  //         })

  //     } catch(err) {
  //         res.json({
  //             success: false,
  //             message: err.toString(),
  //         });
  //     }
  // }

  async delete_space(req, res) {
    try {
      const { space_uuid } = req.params || {};
      const account_id = res.locals.account_id;

      if (!space_uuid) {
        return res.status(400).json({
          success: false,
          message: "Space UUID is required",
        });
      }

      // Only the owner can delete the space
      const space = await this.space.getBySpaceUuid(space_uuid);
      if (!space) {
        return res.status(404).json({
          success: false,
          message: "Space not found",
        });
      }

      if (space[0].created_by !== account_id) {
        return res.status(403).json({
          success: false,
          message: "Only the owner can delete this space",
        });
      }

      // Delete space and related data
      await this.space.deleteSpace(space_uuid);

      res.json({
        success: true,
        message: `Space "${space[0].space_name}" deleted successfully`,
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        message: err.toString(),
      });
    }
  }

  async remove_user_from_space(req, res) {
    try {
      const account_id = res.locals.account_id;
      const { space_id, user_id } = req.params || {};

      console.log(space_id, user_id);
      if (!account_id)
        return res
          .status(401)
          .json({ success: false, message: "UnAuthenticated User!" });

      if (!space_id || !user_id) {
        return res.status(400).json({
          success: false,
          message: "Invalid Request",
        });
      }

      // Only the owner can delete the space

      // Delete space and related data
      const result = await this.space.removeUserFromSpace(user_id, space_id);

      if (!result || result[0].affectedRows === 0)
        return res.json({ success: true, message: "User not Found in Space!" });

      // if (response) {
      const io = getIO();
      if (io) {
        io.emit("remove_user_from_space", { spaceId: space_id, user_id });
      }
      // }

      res.json({
        success: true,
        message: `Space Remove user with an ID of ${user_id}`,
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        message: err.toString(),
      });
    }
  }

  async leave_space(req, res) {
    try {
      const account_id = res.locals.account_id;
      if (!account_id)
        return res
          .status(401)
          .json({ success: false, message: "UnAuthenticated User." });
      const space_uuid = req.params.space_uuid || "";
      if (!space_uuid)
        return res.status(404).json({
          success: false,
          message: "Invalid Request, Space UUID required.",
        });

      await this.space.leaveSpaceByUserId(account_id, space_uuid);

      res.json({
        success: true,
        message: `Leaved Space Successfully.`,
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        message: err.toString(),
      });
    }
  }

  /****
   * THIS IS FOR GRADING OF THE PROFESSOR TO ITS STUDENTS
   */

  async add_remarks(req, res) {
    try {
      const account_id = res.locals.account_id;
      if (!account_id)
        return res
          .status(401)
          .json({ success: false, message: "UnAuthenticated User." });

      const { student_id, space_uuid, prelim, midterm, prefinals, finals } =
        req.body || {};

      console.log(prelim, midterm, prefinals);

      // const space_uuid = req.params.space_uuid || "";
      // const {}
      if (!space_uuid || !student_id)
        return res.status(404).json({
          success: false,
          message: "Invalid Request, Space UUID and Student ID required.",
        });

      if (!prelim && !midterm && !prefinals && !finals)
        return res.status(404).json({
          success: false,
          message:
            "Invalid Request, Must be one of the Grading Period is not Null",
        });

      const academic = await this.acadTerm.getLatestAcademicTerm();

      await this.space.addRemarksToStudentById(
        academic.acad_term_id,
        student_id,
        account_id,
        space_uuid,
        prelim,
        midterm,
        prefinals,
        finals,
      );

      res.json({
        success: true,
        message: `Added Remarks Successfully.`,
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        message: err.toString(),
      });
    }
  }

  async get_remarks_by_space_uuid(req, res) {
    try {
      const account_id = res.locals.account_id;
      if (!account_id)
        return res
          .status(401)
          .json({ success: false, message: "UnAuthenticated User." });

      const { space_uuid } = req.params || {};

      if (!space_uuid)
        return res.status(404).json({
          success: false,
          message: "Invalid Request, Space UUID required.",
        });

      const remarks = await this.space.getRemarksBySpaceUUID(
        account_id,
        space_uuid,
      );

      res.json({
        success: true,
        message: `Getting Remarks Successfully.`,
        data: remarks,
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        message: err.toString(),
      });
    }
  }
  async get_user_remarks_by_space_uuid(req, res) {
    try {
      const account_id = res.locals.account_id;

      if (!account_id) {
        return res.status(401).json({
          success: false,
          message: "Unauthenticated User.",
        });
      }

      const { space_uuid, user_id } = req.params;

      if (!space_uuid || !user_id) {
        return res.status(400).json({
          success: false,
          message: "Space UUID and User ID are required.",
        });
      }

      // Students should only be able to fetch their own remarks.
      // Allow course space owner (professor) to fetch by user_id as well.
      if (Number(account_id) !== Number(user_id)) {
        const courseSpace = await this.space.getByCourseSpaceUuid(space_uuid);

        if (!courseSpace || courseSpace.length === 0) {
          return res.status(404).json({
            success: false,
            message: "Invalid space.",
          });
        }

        if (Number(courseSpace[0].created_by) !== Number(account_id)) {
          return res.status(403).json({
            success: false,
            message: "Forbidden.",
          });
        }
      }

      const remarks = await this.space.getUserRemarksBySpaceUUID(
        account_id,
        user_id,
        space_uuid,
      );

      return res.json({
        success: true,
        message: "Getting Remarks Successfully.",
        data: remarks,
      });
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: err.message,
      });
    }
  }

  async set_archiving(req, res) {
    try {
      const account_id = res.locals.account_id;
      if (!account_id) {
        return res.status(401).json({
          success: false,
          message: "Unauthenticated user.",
        });
      }

      const { space_uuid } = req.params;
      if (!space_uuid) {
        return res.status(400).json({
          success: false,
          message: "Space UUID is required.",
        });
      }

      const result = await this.space.toggleArchiving(account_id, space_uuid);

      if (!result) {
        return res.status(404).json({
          success: false,
          message: "Space not found or access denied.",
        });
      }

      res.json({
        success: true,
        message: result.is_archived
          ? "Space archived successfully."
          : "Space unarchived successfully.",
        data: result,
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        message: err.message || "Internal server error.",
      });
    }
  }

  async get_all_course_space_archived(req, res) {
    try {
      const account_id = res.locals.account_id;

      if (!account_id)
        return res
          .status(401)
          .json({ success: false, message: "UnAuthenticated User!" });

      const result = await this.space.getAllCourseSpaceArchived(account_id);

      const spaces = result.map((item) => ({
        space_id: item.c_space_id,
        space_uuid: item.c_space_uuid,
        space_link: `${
          process.env.NODE_ENV === "production"
            ? "https://immaculearnapi-template-production.up.railway.app"
            : "http://localhost:3000"
        }/space/j?t=${item.c_space_uuid}`,
        space_name: item.c_space_name,
        space_description: item.c_space_description,
        space_day: item.c_space_day,
        space_time_start: item.c_space_time_start,
        space_time_end: item.c_space_time_end,
        space_yr_lvl: item.c_space_yr_lvl,
        academic_term: item.acad_term_name,
        academic_semester: item.semester,
        // space_description: item.description,
        // space_type: item.space_type,
        creator: item.created_by,
        members: item.members.map((member) => ({
          ...member,
          full_name: maskFullName(member.full_name),
          email: maskEmail(member.email), // <-- mask email
        })),
      }));

      // console.log(spaces)

      res.json({
        success: true,
        message: "Successfully get all course Spaces",
        data: spaces,
      });
    } catch (err) {
      res.json({
        success: false,
        message: err.toString(),
      });
    }
  }

  async update_space(req, res) {
    try {
      const account_id = res.locals.account_id;
      const space_uuid = req.params.space_uuid;
      const {
        space_name,
        space_description,
        space_day,
        space_time_start,
        space_time_end,
        space_yr_lvl,
      } = req.body;

      if (!account_id)
        return res
          .status(401)
          .json({ success: false, message: "UnAuthenticated User!" });

      if (!space_uuid) {
        return res.status(400).json({
          success: false,
          message: "Space UUID is required.",
        });
      }

      const result = await this.space.updateSpace(account_id, space_uuid, {
        space_name,
        space_description,
        space_day,
        space_time_start,
        space_time_end,
        space_yr_lvl,
      });

      if (!result) {
        return res.status(404).json({
          success: false,
          message: "Space not found or access denied.",
        });
      }

      res.json({
        success: true,
        message: "Space updated successfully.",
        data: result,
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        message: err.message || "Internal server error.",
      });
    }
  }
}

export default SpaceController;
