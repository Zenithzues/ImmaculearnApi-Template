// import User from '../../models/user.js';
// import Space from '../../models/MySQL/SpaceModel.js';
import jwt from 'jsonwebtoken'
import Space from '../../models/MySQL/SpaceModel.js';
import { Logger } from '../../utils/Logger.js';
import maskEmail from '../../utils/maskEmail.js';
import maskFullName from '../../utils/maskFullName.js';

class SpaceController {
  constructor() {
    this.space = new Space();
    this.logger = new Logger("SpaceController")
  }

  async create_space(req, res) {
    try {
      const {space_name, space_description=""} = req.body || {};

      console.log(space_name, space_description)

      const result = await this.space.createSpace(res.locals.account_id, space_name, space_description)

      // if (!result) res.json({ success: false, message: "Failed to create Space!"})


      res.json({
        success: true,
        message: "Creating Space Successfully!",
        space_uuid: result.space_uuid,
      })

    } catch(err) {
      res.json({
        success: false,
        message: err.toString(),
      });
      res.end();
    }
  }

  async joinSpace(req, res) {
    try {

      const account_id = res.locals.account_id || 1;
      const { space_uuid } = req.body || {};


      if (!space_uuid) res.json({
        success: false,
        message: "Join space Unsuccessful."
      })

      const space = await this.space.getBySpaceUuid(space_uuid);

      if (account_id === space[0].created_by) return res.json({success: false, message: "Invalid Request Joining in Your own Space"})

      if (!space) return res.json({success: false, message: "Invalid Request"})
      await this.space.joinSpace(account_id, space[0].space_id);

      res.json({
        success: true,
        message: "Successfully Join, Wait for Aprroval of Space Owner",
      })

    } catch(err) {
      res.json({
        success: false,
        message: err.toString(),
      });
      res.end();
    }
  }


  async add_user_in_space_by_reg_email(req, res) {
    try {
      res.json({
        success: true,
        message: "Successfully Add User"
      })

    } catch(err) {
      res.json({
        success: false,
        message: err.toString(),
      });
      res.end();
    }
  }

  async get_space_by_id(req, res) {
    try {

        const token = req.cookies.accessToken || 
                      req.headers.authorization?.replace('Bearer ', '');
        
        // this.logger.debug('Profile request', { hasToken: !!token });
  
        if (!token) {
          return res.status(401).json({ 
            success: false, 
            message: 'Not authenticated' 
          });
        }
  
        let payload;
        try {
          payload = jwt.verify(token, process.env.JWT_SECRET);
        //   this.logger.debug('Token verified', { userId: payload.userId, role: payload.role });
        } catch (err) {
          this.logger.warn('Invalid token', { error: err.message });
          return res.status(401).json({ 
            success: false, 
            message: 'Invalid or expired token' 
          });
        }
      // const {space_name, space_description} = req.body || {};
      const {space_id} = req.params || {}
      // const space_id = req.query.space_id

      const result = await this.space.getBySpaceId(space_id);

      if (result.length === 0) return res.json({success: true, message: "Can't find space"})

      res.json({
        success: true,
        data: {
          space: {
            space_link: `${process.env.NODE_ENV === 'production'
                    ? 'https://immaculearnapi-template-production.up.railway.app' 
                    : 'http://localhost:3000'}/space/j?token=${result.space_uuid}`,
            space_name: result.space_name,
            space_description: result.description
          }
        }
        // space_id: space_id,
        // account_id: account_id
      })
      

    } catch(err) {
      res.json({
        success: false,
        message: err.toString(),
      });
      res.end();
    }
  }

  async get_all_friends_space(req, res) {
    try {
        const account_id = res.locals.account_id || 1;

        const result = await this.space.getAllFriendSpaces(account_id);

        console.log(result)

        const spaces = result.map(item => ({
            space_id: item.space_id,
            space_uuid: item.space_uuid,
            space_link: `${process.env.NODE_ENV === 'production'
                    ? 'https://immaculearnapi-template-production.up.railway.app' 
                    : 'http://localhost:3000'}/space/j?t=${item.space_uuid}`,
            space_name: item.space_name,
            space_description: item.description,
            creator: item.created_by,
            members: item.members.map(member => ({
                ...member,
                full_name: maskFullName(member.full_name),
                email: maskEmail(member.email)  // <-- mask email
            }))
        }));

        // console.log(spaces)

        res.json({
            success: true,
            message: "Successfully get all friends Spaces",
            data: spaces
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
        const account_id = res.locals.account_id || 1;

        const result = await this.space.getAllCourseSpaces(account_id);

        const spaces = result.map(item => ({
            space_id: item.space_id,
            space_uuid: item.space_uuid,
            space_link: `${process.env.NODE_ENV === 'production'
                    ? 'https://immaculearnapi-template-production.up.railway.app' 
                    : 'http://localhost:3000'}/space/j?t=${item.space_uuid}`,
            space_name: item.space_name,
            space_description: item.description,
            creator: item.created_by,
            members: item.members.map(member => ({
                ...member,
                full_name: maskFullName(member.full_name),
                email: maskEmail(member.email)  // <-- mask email
            }))
        }));

        // console.log(spaces)

        res.json({
            success: true,
            message: "Successfully get all friends Spaces",
            data: spaces
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
            const account_id = res.locals.account_id || 1;

            const result = await this.space.getAllSpace(account_id);

            const spaces = result.map(item => ({
                space_id: item.space_id,
                space_uuid: item.space_uuid,
                space_link: `${process.env.NODE_ENV === 'production'
                        ? 'https://immaculearnapi-template-production.up.railway.app' 
                        : 'http://localhost:3000'}/space/j?t=${item.space_uuid}`,
                space_name: item.space_name,
                space_description: item.description,
                creator: item.created_by,
                members: item.members.map(member => ({
                    ...member,
                    full_name: maskFullName(member.full_name),
                    email: maskEmail(member.email)  // <-- mask email
                }))
            }));

            // console.log(spaces)

            res.json({
                success: true,
                message: "Successfully get all user Spaces",
                data: spaces
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
            const account_id = res.locals.account_id || 1;


            if (!space_uuid) return res.json({
                success: false,
                message: "Invalid Space ID"
            })

            const result = await this.space.getJoinRequestsBySpaceId(account_id, space_uuid );

            

            res.json({
                success: true,
                message: "Successfully get all pending approvals",
                data: result
            })
            
        } catch(err) {
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
            const account_id = res.locals.account_id || 1;

            if (!space_uuid || !user_id || !status) return res.json({
                success: false,
                message: "Invalid Request"
            })

            if (!account_id) return res.json({
                success: false,
                message: "Unauthenticated user to process Approval Request."
            })

            const result = await this.space.processJoinRequest(account_id, user_id, space_uuid, status)

            if (result.row.affectedRows < 0) res.json({success: false, message: "Failed to Accept Request"})
            if (result.row.affectedRows > 0 ) res.json({
                success: true, 
                message: result.message
            })

            // res.end()

        } catch(err) {
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
      const account_id = res.locals.account_id || 1;

      if (!space_uuid) {
        return res.status(400).json({
          success: false,
          message: "Space UUID is required"
        });
      }

      // Only the owner can delete the space
      const space = await this.space.getBySpaceUuid(space_uuid);
      if (!space) {
        return res.status(404).json({
          success: false,
          message: "Space not found"
        });
      }

      if (space[0].created_by !== account_id) {
        return res.status(403).json({
          success: false,
          message: "Only the owner can delete this space"
        });
      }

      // Delete space and related data
      await this.space.deleteSpace(space_uuid);

      res.json({
        success: true,
        message: `Space "${space[0].space_name}" deleted successfully`
      });

    } catch(err) {
      res.status(500).json({
        success: false,
        message: err.toString()
      });
    }
  }


}

export default SpaceController;
