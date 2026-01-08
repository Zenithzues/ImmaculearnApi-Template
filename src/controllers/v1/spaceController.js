// import User from '../../models/user.js';
// import Space from '../../models/MySQL/SpaceModel.js';
import jwt from 'jsonwebtoken'
import Space from '../../models/MySQL/SpaceModel.js';
import { Logger } from '../../utils/Logger.js';

class SpaceController {
  constructor() {
    this.space = new Space();
    this.logger = new Logger("SpaceController")
  }

  async create_space(req, res) {
    try {
      const {space_name, space_description=""} = req.body || {};

      console.log(space_name, space_description)
    //   const

    //   const account_id = req.params.account_id || null

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
            space_link: `immaculearn.collab.app/space/${result.space_uuid}`,
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

  async get_all_space(req, res) {
    try {
        const account_id = res.locals.account_id || 1;

        const result = await this.space.getAllSpace(account_id);

        const spaces = result.map(item => ({
            space_link: `immaculearn.collab.app/space/${item.space_uuid}`,
            space_name: item.space_name,
            space_description: item.description,
            creator: item.created_by,
            members: item.members
                    ? item.members.split(',').map(Number)
                    : []
        }));

        console.log(spaces)

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

}

export default SpaceController;
